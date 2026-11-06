import { describe, expect, it } from 'vitest'
import { buildPlan, estimateDuration, getReachableSteps, getStepGuard, previewApplication, validateResume } from './composerModel'

const template = { name: 'Referral', subject: 'About {{company_name}}', body: 'Hi {{recruiter_first_name}},' }
const eligible = [
  { application: { id: '1', recruiterName: 'Meera Iyer', companyName: 'Razorpay' }, warning: null },
  { application: { id: '2', recruiterName: '', companyName: 'Zeta' }, warning: null },
  { application: { id: '3', recruiterName: 'Kabir Shah', companyName: 'CRED' }, warning: 'Emailed 3 days ago' },
]

describe('composer guards', () => {
  it("can't continue without recipients", () => {
    expect(getStepGuard('recipients', { selectedCount: 0 })).toBe('Select at least one recipient')
    expect(getStepGuard('recipients', { selectedCount: 2 })).toBeNull()
  })

  it('requires a template with a subject and body', () => {
    expect(getStepGuard('message', { template: null })).toBe('Choose a template')
    expect(getStepGuard('message', { template: { subject: ' ', body: 'x' } })).toBe('Add a subject and a body')
  })

  it('excludes a blocked recipient from the send count', () => {
    const plan = buildPlan({ eligible, selectedIds: new Set(['1', '2']), template, profile: {} })
    expect(plan.recipients).toHaveLength(2)
    expect(plan.blocked.map((item) => item.application.id)).toEqual(['2'])
    expect(plan.sendable.map((item) => item.application.id)).toEqual(['1'])
    expect(getStepGuard('review', { plan, remainingToday: 50 })).toBeNull()
  })

  it('blocks review when nothing is sendable or the daily limit would be exceeded', () => {
    const blockedOnly = buildPlan({ eligible, selectedIds: new Set(['2']), template, profile: {} })
    expect(getStepGuard('review', { plan: blockedOnly, remainingToday: 50 })).toMatch(/Every selected recipient is blocked/)
    const plan = buildPlan({ eligible, selectedIds: new Set(['1', '3']), template, profile: {} })
    expect(getStepGuard('review', { plan, remainingToday: 1 })).toMatch(/Over today's limit by 1/)
  })

  it('only unlocks steps whose predecessors pass', () => {
    const reachable = getReachableSteps({ selectedCount: 1, template: null, plan: { sendable: [] } })
    expect([...reachable]).toEqual(['recipients', 'message'])
  })
})

describe('validateResume', () => {
  it('accepts PDFs up to 5 MB', () => {
    expect(validateResume({ name: 'cv.pdf', type: 'application/pdf', size: 1000 })).toBeNull()
    expect(validateResume({ name: 'cv.docx', type: 'application/msword', size: 1000 })).toMatch(/Use a PDF/)
    expect(validateResume({ name: 'cv.pdf', type: 'application/pdf', size: 6 * 1024 * 1024 })).toMatch(/6.0 MB/)
  })

  it('estimates duration from the pace', () => {
    expect(estimateDuration(11, 20)).toBe('4 min')
  })
})

describe('previewApplication', () => {
  const base = {
    recruiterName: 'Priya Sharma',
    recruiterEmail: 'priya@acme.com',
    companyName: 'Acme Corp',
    jobTitle: 'Frontend Engineer',
    jobLink: 'https://acme.com/jobs/42',
  }

  it('keeps the selected recipient and covers the empty cases', () => {
    expect(previewApplication(base, 'selected')).toMatchObject(base)
    expect(previewApplication(base, 'no-name').recruiterName).toBe('')
    expect(previewApplication(base, 'first-name').recruiterName).toBe('Priya')
    expect(previewApplication(base, 'no-link').jobLink).toBe('')
    expect(previewApplication(base, 'no-company').companyName).toBe('')
  })
})
