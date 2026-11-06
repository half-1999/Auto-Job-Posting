import { describe, expect, it } from 'vitest'
import { advanceRun, createRun } from '@/features/campaigns/mockRun'
import { describePendingWork, getUpdateAction, isSending } from './updateStore'

function mockRun(id = 'run-1') {
  return createRun({
    id,
    recipients: [
      {
        application: {
          id: 'a1',
          recruiterName: 'Meera',
          companyName: 'Razorpay',
          recruiterEmail: 'm@example.com',
        },
        subject: 'Hi',
      },
    ],
    template: { name: 'Cold Outreach' },
    from: 'me@example.com',
    now: 0,
  })
}

describe('update deferral', () => {
  it('shows nothing until a new version is waiting', () => {
    expect(getUpdateAction({ needRefresh: false, sending: true })).toBeNull()
  })

  it('holds Reload back while a mock campaign is running', () => {
    const runs = { 'run-1': mockRun() }
    expect(isSending(runs)).toBe(true)
    expect(getUpdateAction({ needRefresh: true, sending: isSending(runs) })).toEqual({
      canReload: false,
      message: 'Update ready. Reload after sending finishes.',
    })
  })

  it('allows Reload once the queue is idle', () => {
    const runs = { 'run-1': { ...mockRun(), status: 'done' } }
    expect(isSending(runs)).toBe(false)
    expect(getUpdateAction({ needRefresh: true, sending: false })).toMatchObject({
      canReload: true,
    })
  })
})

describe('pending work after reconnecting', () => {
  it('lists campaigns paused by going offline and links to them without resuming', () => {
    const paused = advanceRun(mockRun(), 0, { online: false })
    const byUser = { ...mockRun('run-2'), status: 'paused', pausedReason: 'user' }
    const work = describePendingWork({ [paused.id]: paused, [byUser.id]: byUser })

    expect(paused.status).toBe('paused')
    expect(work).toEqual([
      { id: 'run-1', label: 'Cold Outreach is paused', path: '/campaigns/run-1' },
    ])
  })
})
