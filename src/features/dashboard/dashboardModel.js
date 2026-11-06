import { EMAIL_STATUS, REPLY_STATUS } from '@/lib/constants'

const plural = (count, one, many = `${one}s`) => (count === 1 ? one : many)

const listNames = (apps) => {
  const names = apps.slice(0, 3).map((app) => app.companyName)
  return apps.length > 3 ? `${names.join(', ')} and ${apps.length - 3} more` : names.join(', ')
}

/** Items for "Needs attention", each with one inline action (docs/UI_UX_PLAN.md §5.1). */
export function getAttentionItems({ applications, sheet, pendingWritebacks = [] }) {
  const items = []
  if (pendingWritebacks.length) {
    const count = pendingWritebacks.length
    items.push({
      id: 'writebacks',
      tone: 'warning',
      title: `${count} ${plural(count, 'change')} not saved to your sheet`,
      detail: 'Kept on this device. Nothing is written until you retry.',
      action: { label: 'Review', to: '/sheets' },
    })
  }
  const failed = applications.filter((app) => app.emailStatus === EMAIL_STATUS.failed)
  if (failed.length) {
    items.push({
      id: 'failed',
      tone: 'destructive',
      title: `${failed.length} ${plural(failed.length, 'email')} failed`,
      detail: listNames(failed),
      action: { label: 'Retry', to: '/campaigns/new', state: { ids: failed.map((app) => app.id) } },
    })
  }
  const bounced = applications.filter((app) => app.emailStatus === EMAIL_STATUS.bounced)
  if (bounced.length) {
    items.push({
      id: 'bounced',
      tone: 'destructive',
      title: `${bounced.length} ${plural(bounced.length, 'email')} bounced`,
      detail: listNames(bounced),
      action: { label: 'Review', to: '/applications?view=attention' },
    })
  }
  const uncertain = applications.filter((app) => app.replyStatus === REPLY_STATUS.uncertain)
  if (uncertain.length) {
    items.push({
      id: 'uncertain',
      tone: 'warning',
      title: `${uncertain.length} possible ${plural(uncertain.length, 'reply', 'replies')} to verify`,
      detail: listNames(uncertain),
      action: { label: 'Verify', to: '/history?reply=Uncertain' },
    })
  }
  const invalid = sheet?.summary?.invalid ?? 0
  if (invalid) {
    items.push({
      id: 'invalid',
      tone: 'warning',
      title: `${invalid} invalid ${plural(invalid, 'row')} in the last sync`,
      detail: 'These rows were not imported.',
      action: { label: 'Review', to: '/sheets' },
    })
  }
  return items
}

/** Latest Email_Log events, detected replies, and the last sync, newest first. */
export function getRecentActivity({ emailLog, applications, sheet }, limit = 8) {
  const events = emailLog.map((row) => ({
    id: row.logId,
    at: row.timestamp,
    kind: row.result === 'Failed' ? 'failed' : row.result === 'Test' ? 'test' : 'sent',
    text:
      row.result === 'Failed'
        ? `Failed to ${row.recipientName || row.recipient}`
        : row.result === 'Test'
          ? 'Test email to you'
          : `Sent to ${row.recipientName || row.recipient}`,
    meta: row.result === 'Test' ? row.templateName : row.companyName,
  }))
  for (const app of applications) {
    if (app.replyStatus === REPLY_STATUS.replied && app.replyDate) {
      events.push({
        id: `reply-${app.id}`,
        at: app.replyDate,
        kind: 'reply',
        text: `Reply from ${app.recruiterName || app.recruiterEmail}`,
        meta: app.companyName,
      })
    }
  }
  if (sheet?.syncedAt) {
    events.push({
      id: 'sync',
      at: sheet.syncedAt,
      kind: 'sync',
      text: `Sync: ${sheet.summary.imported} rows`,
      meta: sheet.spreadsheetTitle,
    })
  }
  return events.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit)
}
