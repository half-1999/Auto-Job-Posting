import { REPLY_STATUS } from '@/lib/constants'

/** Past campaigns grouped from Email_Log rows (test sends are not part of a campaign). */
export function groupCampaigns(emailLog, applications) {
  const replied = new Set(applications.filter((app) => app.replyStatus === REPLY_STATUS.replied).map((app) => app.id))
  const groups = new Map()
  for (const row of emailLog) {
    if (!row.campaignId) continue
    const group = groups.get(row.campaignId) ?? {
      id: row.campaignId,
      templateName: row.templateName,
      attachment: row.attachment,
      startedAt: row.timestamp,
      endedAt: row.timestamp,
      total: 0,
      sent: 0,
      failed: 0,
      replied: 0,
      rows: [],
    }
    group.total += 1
    if (row.result === 'Sent') group.sent += 1
    if (row.result === 'Failed') group.failed += 1
    if (replied.has(row.applicationId)) group.replied += 1
    if (row.timestamp < group.startedAt) group.startedAt = row.timestamp
    if (row.timestamp > group.endedAt) group.endedAt = row.timestamp
    group.rows.push(row)
    groups.set(row.campaignId, group)
  }
  return [...groups.values()]
    .map((group) => ({ ...group, rows: group.rows.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1)) }))
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
}

export function formatDuration(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes % 60} min`
}
