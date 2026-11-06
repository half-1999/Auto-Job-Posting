import { describe, expect, it, vi } from 'vitest'
import { createRealRun, sentFields } from './realRun'
import { sendNext } from './sendOne'

vi.mock('@/services/gmailService', () => ({ sendMessage: vi.fn(), getThread: vi.fn() }))
vi.mock('@/context/sheetSync', () => ({ writeFields: vi.fn(), appendEmailLog: vi.fn() }))
vi.mock('@/lib/fileStore', () => ({ loadResume: vi.fn(async () => null) }))

const application = {
  id: 'app-1',
  recruiterName: 'Priya',
  recruiterEmail: 'priya@acme.com',
  companyName: 'Acme',
  jobTitle: 'Engineer',
  jobLink: 'https://acme.example/jobs/1',
  emailStatus: 'Not Sent',
}

function setup(send) {
  let current = createRealRun({
    id: 'run-1',
    recipients: [{ application, subject: 'Engineer at Acme' }],
    template: { id: 't1', name: 'Cold', subject: 'Hi', body: 'Hello {{recruiter_first_name}}' },
    fromName: 'Ada',
    fromEmail: 'ada@gmail.com',
    delayMs: 1000,
    now: Date.parse('2026-11-05T10:00:00Z'),
  })
  const writes = []
  const deps = {
    dailyCap: 50,
    sentToday: 0,
    delayMs: 1000,
    profile: { name: 'Ada' },
    now: () => new Date('2026-11-05T10:00:00Z'),
    updateRun: (_id, fn) => {
      current = fn(current)
    },
    writeFields: async (updates) => writes.push(updates),
    appendLog: async () => {},
    send,
    patchApplication: () => {},
    queueWrite: () => {},
    addLog: () => {},
    notify: () => {},
    onSent: () => {},
  }
  return { deps, writes, get run() { return current } }
}

describe('sendNext', () => {
  it('AC-10: records Sent, the date, and both Gmail ids, and does not send twice', async () => {
    const send = vi.fn(async () => ({ id: 'msg-1', threadId: 'thread-1' }))
    const harness = setup(send)
    await sendNext(harness.run, harness.deps)
    expect(send).toHaveBeenCalledTimes(1)
    expect(harness.run.items[0]).toMatchObject({ status: 'sent', messageId: 'msg-1', threadId: 'thread-1' })
    expect(harness.writes.at(-1)).toEqual([
      {
        applicationId: 'app-1',
        values: sentFields({
          messageId: 'msg-1',
          threadId: 'thread-1',
          templateName: 'Cold',
          sentDate: '2026-11-05T10:00:00.000Z',
        }),
      },
    ])
    await sendNext(harness.run, harness.deps)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('AC-19: a dropped connection pauses and does not retry', async () => {
    const send = vi.fn(async () => {
      throw Object.assign(new Error('offline'), { code: 'network' })
    })
    const harness = setup(send)
    await sendNext(harness.run, harness.deps)
    expect(harness.run).toMatchObject({ status: 'paused', pausedReason: 'offline' })
    expect(harness.run.items[0].status).toBe('unknown')
    await sendNext(harness.run, harness.deps)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('does not send when the daily cap is reached', async () => {
    const send = vi.fn()
    const harness = setup(send)
    await sendNext(harness.run, { ...harness.deps, sentToday: 50, dailyCap: 50 })
    expect(send).not.toHaveBeenCalled()
    expect(harness.run.pausedReason).toBe('cap')
  })
})
