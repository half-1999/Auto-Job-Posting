/** In-memory resume bytes for a campaign. Lost on reload; IndexedDB is the fallback. */
const held = new Map()

export function holdAttachment(runId, file) {
  if (file) held.set(runId, file)
}

export function heldAttachment(runId) {
  return held.get(runId) ?? null
}

/** A real campaign. It starts only after the confirm dialog calls this. */
export function createRealRun({
  id,
  recipients,
  template,
  attachmentName = null,
  fromName = '',
  fromEmail,
  delayMs,
  now = Date.now(),
}) {
  return {
    id,
    mock: false,
    needsConfirm: false,
    createdAt: new Date(now).toISOString(),
    templateName: template.name,
    template: { id: template.id, name: template.name, subject: template.subject, body: template.body },
    attachmentName,
    fromName,
    fromEmail,
    from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
    delayMs,
    status: 'running',
    pausedReason: null,
    nextAt: now,
    items: recipients.map(({ application, subject }) => ({
      applicationId: application.id,
      name: application.recruiterName || application.recruiterEmail,
      company: application.companyName,
      email: application.recruiterEmail,
      subject,
      jobTitle: application.jobTitle,
      jobLink: application.jobLink ?? '',
      recruiterName: application.recruiterName ?? '',
      status: 'pending',
      at: null,
      error: null,
      messageId: '',
      threadId: '',
      retried: false,
    })),
  }
}

/** Sheet cells written after Gmail accepts a message (AC-10). */
export function sentFields({ messageId, threadId, templateName, sentDate }) {
  return {
    emailStatus: 'Sent',
    sentDate,
    gmailMessageId: messageId,
    threadId,
    templateName,
    lastError: '',
  }
}
