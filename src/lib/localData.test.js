import { describe, expect, it } from 'vitest'
import { reviveRuns } from './browserData'
import { loadTemplates } from './localData'

describe('loadTemplates', () => {
  it('AC-6: seeds defaults only when nothing is saved, and reloads what was saved', () => {
    const first = loadTemplates()
    expect(first.map((template) => template.name)).toEqual([
      'Cold Outreach',
      'Application Follow-up',
      'Referral / Networking Request',
    ])
    const second = loadTemplates()
    expect(second.map((template) => template.id)).toEqual(first.map((template) => template.id))

    localStorage.setItem(
      'jaas.templates',
      JSON.stringify({ version: 1, data: { items: [{ id: 'mine', name: 'Mine', subject: 'Hi', body: 'Hello' }] } }),
    )
    expect(loadTemplates().map((template) => template.id)).toEqual(['mine'])
  })
})

describe('reviveRuns', () => {
  it('AC-12 and AC-19: a reloaded campaign stays paused and does not retry an in-flight send', () => {
    const runs = reviveRuns({
      campaigns: {
        c1: {
          id: 'c1',
          status: 'running',
          mock: false,
          items: [
            { applicationId: 'a', status: 'sent' },
            { applicationId: 'b', status: 'sending' },
            { applicationId: 'c', status: 'pending' },
          ],
        },
      },
    })
    expect(runs.c1).toMatchObject({ status: 'paused', pausedReason: 'reload', needsConfirm: true })
    expect(runs.c1.items.map((item) => item.status)).toEqual(['sent', 'unknown', 'pending'])
  })
})
