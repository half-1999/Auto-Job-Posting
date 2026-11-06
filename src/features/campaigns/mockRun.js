/**
 * Mock campaign runner (Phase 3 UI only). It advances a local queue on a timer and never
 * calls any API: nothing is sent. The real queue arrives with Gmail sending in Phase 8.
 */
export const MOCK_PACE_MS = 2000

export function createRun({ id, recipients, template, attachmentName, from, now = Date.now() }) {
  return {
    id,
    mock: true,
    createdAt: new Date(now).toISOString(),
    templateName: template.name,
    attachmentName: attachmentName ?? null,
    from,
    status: 'running',
    pausedReason: null,
    nextAt: now,
    items: recipients.map((recipient) => ({
      applicationId: recipient.application.id,
      name: recipient.application.recruiterName || recipient.application.recruiterEmail,
      company: recipient.application.companyName,
      email: recipient.application.recruiterEmail,
      subject: recipient.subject,
      status: 'pending',
      at: null,
      error: null,
      retried: false,
    })),
  }
}

export function runCounts(run) {
  const counts = { pending: 0, sending: 0, sent: 0, failed: 0, skipped: 0, unknown: 0 }
  for (const item of run.items) counts[item.status] = (counts[item.status] ?? 0) + 1
  return { ...counts, total: run.items.length }
}

/** One step: resolve the item being sent, then start the next. Returns the same object when nothing changes. */
export function advanceRun(run, now, { online = true } = {}) {
  if (run.status !== 'running') return run
  if (!online) return { ...run, status: 'paused', pausedReason: 'offline' }
  if (now < run.nextAt) return run

  const items = run.items.map((item, index) => {
    if (item.status !== 'sending') return item
    const fail = index === 2 && !item.retried
    return {
      ...item,
      status: fail ? 'failed' : 'sent',
      at: new Date(now).toISOString(),
      error: fail ? 'Rejected by Gmail: invalid address (mock)' : null,
    }
  })
  const next = items.findIndex((item) => item.status === 'pending')
  if (next === -1) return { ...run, items, status: 'done', nextAt: null }
  items[next] = { ...items[next], status: 'sending' }
  return { ...run, items, nextAt: now + MOCK_PACE_MS }
}

export function pauseRun(run) {
  return run.status === 'running' ? { ...run, status: 'paused', pausedReason: 'user' } : run
}

/** Resume is always an explicit user action; it is refused while offline. */
export function resumeRun(run, now, { online = true } = {}) {
  if (run.status !== 'paused' || !online) return run
  return { ...run, status: 'running', pausedReason: null, nextAt: now }
}

export function cancelRun(run) {
  if (run.status === 'done' || run.status === 'cancelled') return run
  return {
    ...run,
    status: 'cancelled',
    items: run.items.map((item) =>
      item.status === 'pending' || item.status === 'sending' ? { ...item, status: 'skipped' } : item,
    ),
  }
}

export function retryFailed(run, now) {
  if (!run.items.some((item) => item.status === 'failed')) return run
  return {
    ...run,
    status: 'running',
    pausedReason: null,
    nextAt: now,
    items: run.items.map((item) =>
      item.status === 'failed' ? { ...item, status: 'pending', error: null, retried: true } : item,
    ),
  }
}
