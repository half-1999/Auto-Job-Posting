const PAUSE_BODY = {
  offline: 'Paused because you went offline.',
  session: 'Paused because Google needs you to reconnect.',
  cap: "Paused because today's sending limit is reached.",
  attachment: 'Paused because the resume file is missing on this device.',
  write: 'Paused because the sheet could not be updated.',
  reload: 'Paused because the page was closed.',
  user: 'Paused. Nothing sends until you resume.',
}

/** Notices for runs that just left "running". The first snapshot is ignored by the caller. */
export function campaignNotices(previous, runs) {
  if (!previous) return []
  const notices = []
  for (const run of Object.values(runs)) {
    if (previous[run.id] !== 'running') continue
    const href = `/campaigns/${run.id}`
    if (run.status === 'done') {
      const sent = run.items.filter((item) => item.status === 'sent').length
      notices.push({ title: 'Campaign finished', body: `${sent} sent`, href })
    } else if (run.status === 'paused') {
      notices.push({
        title: 'Campaign paused',
        body: PAUSE_BODY[run.pausedReason] ?? PAUSE_BODY.user,
        href,
      })
    }
  }
  return notices
}
