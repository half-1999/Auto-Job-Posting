import { describe, expect, it } from 'vitest'
import { advanceRun, cancelRun, createRun, MOCK_PACE_MS, pauseRun, resumeRun, retryFailed, runCounts } from './mockRun'

const recipients = ['a', 'b', 'c', 'd'].map((id) => ({
  application: { id, recruiterName: id.toUpperCase(), companyName: 'Co', recruiterEmail: `${id}@co.com` },
  subject: 'Hi',
}))
const start = () => createRun({ id: 'r1', recipients, template: { name: 'T' }, from: 'me@x.com', now: 0 })

function runToEnd(run) {
  let now = 0
  let current = run
  for (let i = 0; i < 20 && current.status === 'running'; i += 1) {
    current = advanceRun(current, now)
    now += MOCK_PACE_MS
  }
  return current
}

describe('mock run', () => {
  it('moves items through sending to sent, with one deterministic failure', () => {
    const done = runToEnd(start())
    expect(done.status).toBe('done')
    expect(runCounts(done)).toMatchObject({ sent: 3, failed: 1, total: 4 })
  })

  it('pauses when offline and only resumes on request while online', () => {
    const paused = advanceRun(start(), 0, { online: false })
    expect(paused).toMatchObject({ status: 'paused', pausedReason: 'offline' })
    expect(advanceRun(paused, 10_000)).toBe(paused)
    expect(resumeRun(paused, 0, { online: false })).toBe(paused)
    expect(resumeRun(paused, 0).status).toBe('running')
  })

  it('cancels remaining items and retries failed ones', () => {
    const cancelled = cancelRun(advanceRun(start(), 0))
    expect(runCounts(cancelled)).toMatchObject({ skipped: 4 })
    const retried = retryFailed(runToEnd(start()), 0)
    expect(runCounts(runToEnd(retried))).toMatchObject({ sent: 4, failed: 0 })
    expect(pauseRun(cancelled)).toBe(cancelled)
  })
})
