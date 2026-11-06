import { describe, expect, it } from 'vitest'
import {
  activitySeries,
  computeKpis,
  describeTrend,
  formatPercent,
  replyRateByTemplate,
  startOfWeek,
  statusBreakdown,
  weeklyBuckets,
} from './reportMetrics'

const NOW = new Date(2026, 10, 4, 12) // Wed Nov 4 2026, local time
const daysAgo = (n) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

const applications = [
  { applicationStatus: 'Applied', sentDate: daysAgo(2), replyStatus: 'Replied', replyDate: daysAgo(1), templateName: 'Cold Outreach' },
  { applicationStatus: 'Applied', sentDate: daysAgo(3), replyStatus: 'No Reply', templateName: 'Cold Outreach' },
  { applicationStatus: 'Interviewing', sentDate: daysAgo(40), replyStatus: 'Replied', replyDate: daysAgo(38), templateName: 'Follow-up' },
  { applicationStatus: '' },
]
const log = [
  { result: 'Sent', timestamp: daysAgo(2) },
  { result: 'Sent', timestamp: daysAgo(3) },
  { result: 'Failed', timestamp: daysAgo(3) },
  { result: 'Sent', timestamp: daysAgo(40) },
]

describe('reportMetrics', () => {
  it('starts weeks on Monday', () => {
    expect(startOfWeek(NOW).getDay()).toBe(1)
    expect(startOfWeek(NOW).getDate()).toBe(2)
  })

  it('computes KPIs and deltas against the previous period', () => {
    const kpis = computeKpis(applications, log, { from: NOW.getTime() - 30 * 86_400_000, to: NOW.getTime() })
    expect(kpis).toMatchObject({ applications: 4, sent: 2, failed: 1, replies: 1, replyRate: 0.5 })
    expect(kpis.delta).toMatchObject({ sent: 1, failed: 1, replies: 0, replyRate: -0.5 })
  })

  it('buckets activity by week', () => {
    const series = activitySeries(log, applications, weeklyBuckets(NOW, 12))
    expect(series).toHaveLength(12)
    // Nov 2 (Mon) is in the current week; Nov 1 (Sun) belongs to the week before.
    expect(series.at(-1)).toMatchObject({ sent: 1, failed: 0, replies: 1 })
    expect(series.at(-2)).toMatchObject({ sent: 1, failed: 1, replies: 0 })
  })

  it('breaks down status, treating empty as Not Applied', () => {
    expect(statusBreakdown(applications).map((item) => [item.status, item.count])).toEqual([
      ['Not Applied', 1],
      ['Applied', 2],
      ['Interviewing', 1],
    ])
  })

  it('computes reply rate by template', () => {
    expect(replyRateByTemplate(applications)[0]).toMatchObject({ template: 'Cold Outreach', sent: 2, replied: 1, rate: 0.5 })
  })

  it('describes trends in one sentence', () => {
    const series = [1, 1, 1, 1, 2, 3, 4, 5].map((sent) => ({ sent }))
    expect(describeTrend(series, 'sent', { noun: 'emails sent' })).toBe(
      '14 emails sent in the last 4 weeks, up from 4 in the 4 weeks before.',
    )
    expect(formatPercent(0.1724)).toBe('17.2%')
    expect(formatPercent(null)).toBe('-')
  })
})
