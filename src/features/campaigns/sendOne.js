import { appendEmailLog, writeFields } from '@/context/sheetSync'
import { loadResume } from '@/lib/fileStore'
import { buildMessage } from '@/lib/mime'
import { renderEmail } from '@/lib/templateEngine'
import { sendMessage } from '@/services/gmailService'
import { heldAttachment, sentFields } from './realRun'

const pause = (current, reason, index, status, error = null) => {
  const items = current.items.slice()
  if (index >= 0) items[index] = { ...items[index], status, error }
  return { ...current, items, status: 'paused', pausedReason: reason }
}

async function attachmentBytes(run) {
  if (!run.attachmentName) return null
  const file = heldAttachment(run.id) ?? (await loadResume())?.file
  if (!file || file.name !== run.attachmentName) return null
  return { filename: file.name, bytes: new Uint8Array(await file.arrayBuffer()) }
}

/**
 * Sends the next pending recipient of a running campaign, then records it.
 * A dropped connection or a reload never causes a retry from here (AC-19).
 */
export async function sendNext(run, deps) {
  const cap = deps.dailyCap
  let job = null
  deps.updateRun(run.id, (current) => {
    if (current.status !== 'running') return current
    if (deps.sentToday >= cap) {
      job = { pause: 'cap' }
      return { ...current, status: 'paused', pausedReason: 'cap' }
    }
    const index = current.items.findIndex((item) => item.status === 'pending')
    if (index < 0) {
      job = { done: true, sent: current.items.filter((item) => item.status === 'sent').length }
      return { ...current, status: 'done', nextAt: null }
    }
    job = { index, item: current.items[index] }
    const items = current.items.slice()
    items[index] = { ...current.items[index], status: 'sending' }
    return { ...current, items }
  })
  if (!job || job.pause || job.done) return

  const { index, item } = job
  const rendered = renderEmail(
    run.template,
    {
      recruiterName: item.recruiterName,
      recruiterEmail: item.email,
      companyName: item.company,
      jobTitle: item.jobTitle,
      jobLink: item.jobLink,
    },
    deps.profile,
  )
  if (rendered.issues.length) {
    deps.updateRun(run.id, (current) => fail(current, index, 'A placeholder is empty, so this one was not sent.', deps.now()))
    return
  }

  let attachment = null
  if (run.attachmentName) {
    attachment = await attachmentBytes(run)
    if (!attachment) {
      deps.updateRun(run.id, (current) => pause(current, 'attachment', index, 'pending'))
      return
    }
  }

  try {
    await deps.writeFields([{ applicationId: item.applicationId, values: { emailStatus: 'Queued' } }])
    deps.patchApplication(item.applicationId, { emailStatus: 'Queued' })
  } catch (error) {
    deps.updateRun(run.id, (current) => pause(current, 'write', index, 'pending', error?.userMessage ?? 'The sheet could not be updated.'))
    return
  }

  let response
  try {
    response = await deps.send(
      buildMessage({
        fromName: run.fromName,
        fromEmail: run.fromEmail,
        to: item.email,
        subject: item.subject,
        text: rendered.body.text,
        attachment,
      }),
    )
  } catch (error) {
    const revert = async () => {
      const values = { emailStatus: 'Not Sent' }
      deps.patchApplication(item.applicationId, values)
      try {
        await deps.writeFields([{ applicationId: item.applicationId, values }])
      } catch {
        deps.queueWrite([{ applicationId: item.applicationId, values }])
      }
    }
    if (error?.code === 'unauthorized') {
      await revert()
      deps.updateRun(run.id, (current) => pause(current, 'session', index, 'pending'))
      return
    }
    if (error?.code === 'network') {
      await revert()
      deps.updateRun(run.id, (current) =>
        pause(current, 'offline', index, 'unknown', 'The connection dropped. This one was not retried.'),
      )
      return
    }
    const message = error?.userMessage ?? 'Gmail rejected this email.'
    const at = deps.now().toISOString()
    await record(deps, run, item, { result: 'Failed', messageId: '', threadId: '', error: message, at })
    deps.updateRun(run.id, (current) => fail(current, index, message, deps.now()))
    deps.patchApplication(item.applicationId, { emailStatus: 'Failed', lastError: message })
    return
  }

  const at = deps.now().toISOString()
  const values = sentFields({
    messageId: response.id,
    threadId: response.threadId,
    templateName: run.templateName,
    sentDate: at,
  })
  deps.patchApplication(item.applicationId, values)
  deps.onSent?.()
  await record(deps, run, item, { result: 'Sent', messageId: response.id, threadId: response.threadId, error: '', at, values })
  deps.updateRun(run.id, (current) => ({
    ...current,
    nextAt: deps.now().getTime() + (deps.delayMs ?? current.delayMs),
    items: current.items.map((entry, entryIndex) =>
      entryIndex === index
        ? { ...entry, status: 'sent', at, error: null, messageId: response.id, threadId: response.threadId }
        : entry,
    ),
  }))
}

function fail(current, index, message, now) {
  const items = current.items.slice()
  items[index] = { ...items[index], status: 'failed', error: message, at: now.toISOString() }
  const pending = items.some((item) => item.status === 'pending')
  return {
    ...current,
    items,
    status: pending ? 'running' : 'done',
    nextAt: pending ? now.getTime() + current.delayMs : null,
  }
}

/** Writes the sheet and the log. A failed write is queued; the send is not repeated. */
async function record(deps, run, item, { result, messageId, threadId, error, at, values }) {
  const logRow = {
    logId: crypto.randomUUID(),
    timestamp: at,
    campaignId: run.id,
    applicationId: item.applicationId,
    recipient: item.email,
    recipientName: item.name,
    companyName: item.company,
    jobTitle: item.jobTitle,
    templateName: run.templateName,
    subject: result === 'Sent' ? item.subject : item.subject,
    attachment: run.attachmentName ?? '',
    result,
    messageId,
    threadId,
    error,
  }
  deps.addLog(logRow)
  try {
    if (values) await deps.writeFields([{ applicationId: item.applicationId, values }])
    else {
      await deps.writeFields([{ applicationId: item.applicationId, values: { emailStatus: 'Failed', lastError: error } }])
    }
    await deps.appendLog(logRow)
  } catch {
    // shortcut: a retried log append can add a second Email_Log row, when the first append actually landed
    deps.queueWrite([{ applicationId: item.applicationId, values: values ?? { emailStatus: 'Failed', lastError: error }, logRow }])
  }
}

export async function sendTestEmail({ fromName, fromEmail, template, application, profile, attachment, appendLog, addLog }) {
  const rendered = renderEmail(template, application, profile)
  const subject = `[TEST] ${rendered.subject.text}`
  const response = await sendMessage(
    buildMessage({
      fromName,
      fromEmail,
      to: fromEmail,
      subject,
      text: rendered.body.text,
      attachment,
    }),
  )
  const logRow = {
    logId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    campaignId: '',
    applicationId: '',
    recipient: fromEmail,
    recipientName: fromName,
    companyName: application?.companyName ?? '',
    jobTitle: application?.jobTitle ?? '',
    templateName: template.name,
    subject,
    attachment: attachment?.filename ?? '',
    result: 'Test',
    messageId: response.id,
    threadId: response.threadId,
    error: '',
  }
  addLog?.(logRow)
  if (appendLog) await appendLog(logRow)
  return response
}

/** Live deps used by the campaign engine. Tests pass their own. */
export function liveDeps(extras) {
  return {
    writeFields: (updates) => writeFields(extras.sheetConfig, updates),
    appendLog: (row) => appendEmailLog(extras.sheetConfig.spreadsheetId, row),
    send: sendMessage,
    ...extras,
  }
}
