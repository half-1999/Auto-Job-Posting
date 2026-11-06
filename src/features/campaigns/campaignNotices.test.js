import { describe, expect, it } from 'vitest'
import { campaignNotices } from './campaignNotices'

const paused = {
  id: 'run-1',
  status: 'paused',
  pausedReason: 'cap',
  items: [],
}

describe('campaignNotices', () => {
  it('ignores the first snapshot and pauses that were already paused', () => {
    expect(campaignNotices(null, { 'run-1': paused })).toEqual([])
    expect(campaignNotices({ 'run-1': 'paused' }, { 'run-1': paused })).toEqual([])
  })

  it('notices a finish or a pause that just left running', () => {
    const done = {
      id: 'run-1',
      status: 'done',
      items: [{ status: 'sent' }, { status: 'failed' }],
    }
    expect(campaignNotices({ 'run-1': 'running' }, { 'run-1': done })).toEqual([
      { title: 'Campaign finished', body: '1 sent', href: '/campaigns/run-1' },
    ])
    expect(campaignNotices({ 'run-1': 'running' }, { 'run-1': paused })).toEqual([
      {
        title: 'Campaign paused',
        body: "Paused because today's sending limit is reached.",
        href: '/campaigns/run-1',
      },
    ])
  })
})
