import { describe, expect, it } from 'vitest'
import { getEligibility, indexLastSent, partitionRecipients } from './eligibility'

const NOW = new Date('2026-11-04T10:00:00Z').getTime()
const app = (overrides) => ({
  id: overrides.id ?? 'a',
  companyName: 'Razorpay',
  recruiterEmail: 'meera@razorpay.com',
  emailStatus: 'Not Sent',
  ...overrides,
})

describe('getEligibility', () => {
  it('excludes Do Not Email, already sent, and invalid addresses with a reason', () => {
    expect(getEligibility(app({ emailStatus: 'Do Not Email' }))).toEqual({ eligible: false, reason: 'Do Not Email' })
    expect(getEligibility(app({ emailStatus: 'Sent' }))).toEqual({ eligible: false, reason: 'Already sent' })
    expect(getEligibility(app({ recruiterEmail: 'hr@globex' }))).toEqual({ eligible: false, reason: 'Invalid email' })
  })

  it('allows re-sending only when the setting is on', () => {
    expect(getEligibility(app({ emailStatus: 'Sent' }), { settings: { allowResend: true } }).eligible).toBe(true)
  })

  it('warns about recent contact inside the recency window', () => {
    const lastSentByEmail = indexLastSent([
      { recipient: 'Meera@Razorpay.com', result: 'Sent', timestamp: '2026-11-01T09:00:00Z' },
      { recipient: 'meera@razorpay.com', result: 'Failed', timestamp: '2026-11-03T09:00:00Z' },
    ])
    expect(getEligibility(app({}), { lastSentByEmail, now: NOW })).toEqual({
      eligible: true,
      warning: 'Emailed 3 days ago',
    })
  })
})

describe('partitionRecipients', () => {
  it('keeps one application per address and explains the rest', () => {
    const { eligible, excluded } = partitionRecipients([
      app({ id: '1' }),
      app({ id: '2', companyName: 'Razorpay X' }),
      app({ id: '3', emailStatus: 'Do Not Email', recruiterEmail: 'x@y.com' }),
    ])
    expect(eligible.map((item) => item.application.id)).toEqual(['1'])
    expect(excluded.map((item) => item.reason)).toEqual(['Same recruiter as Razorpay', 'Do Not Email'])
  })
})
