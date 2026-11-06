import { APPLICATION_STATUS, REPLY_STATUS } from './constants'

const DAY_MS = 24 * 60 * 60 * 1000
const time = (value) => (value ? new Date(value).getTime() : NaN)
const inRange = (value, from, to) => {
  const t = time(value)
  return t >= from && t < to
}

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Monday 00:00 local time. */
export function startOfWeek(date) {
  const d = startOfDay(date)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

const shortDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
const shortMonth = new Intl.DateTimeFormat('en', { month: 'short' })
const monthYear = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' })

export function weeklyBuckets(now, count) {
  const current = startOfWeek(now)
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(current)
    start.setDate(start.getDate() - (count - 1 - index) * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return { start: start.getTime(), end: end.getTime(), label: shortDate.format(start), fullLabel: `Week of ${shortDate.format(start)}` }
  })
}

export function monthlyBuckets(now, count) {
  const base = new Date(now)
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(base.getFullYear(), base.getMonth() - (count - 1 - index), 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    return { start: start.getTime(), end: end.getTime(), label: shortMonth.format(start), fullLabel: monthYear.format(start) }
  })
}

/** Custom range split into days (≤ 31 days) or weeks. */
export function rangeBuckets(from, to) {
  const days = Math.max(1, Math.round((to - from) / DAY_MS))
  const step = days <= 31 ? 1 : 7
  const buckets = []
  for (let start = startOfDay(from).getTime(); start < to; start += step * DAY_MS) {
    const end = Math.min(start + step * DAY_MS, to)
    buckets.push({ start, end, label: shortDate.format(start), fullLabel: shortDate.format(start) })
  }
  return buckets
}

export function activitySeries(log, applications, buckets) {
  return buckets.map((bucket) => ({
    label: bucket.label,
    fullLabel: bucket.fullLabel,
    sent: log.filter((row) => row.result === 'Sent' && inRange(row.timestamp, bucket.start, bucket.end)).length,
    failed: log.filter((row) => row.result === 'Failed' && inRange(row.timestamp, bucket.start, bucket.end)).length,
    replies: applications.filter(
      (app) => app.replyStatus === REPLY_STATUS.replied && inRange(app.replyDate, bucket.start, bucket.end),
    ).length,
  }))
}

function periodStats(applications, log, from, to) {
  const sent = log.filter((row) => row.result === 'Sent' && inRange(row.timestamp, from, to)).length
  const failed = log.filter((row) => row.result === 'Failed' && inRange(row.timestamp, from, to)).length
  const replies = applications.filter(
    (app) => app.replyStatus === REPLY_STATUS.replied && inRange(app.replyDate, from, to),
  ).length
  const cohort = applications.filter((app) => inRange(app.sentDate, from, to))
  const repliedCohort = cohort.filter((app) => app.replyStatus === REPLY_STATUS.replied).length
  return { sent, failed, replies, replyRate: cohort.length ? repliedCohort / cohort.length : null }
}

/** KPIs for [from, to) with the change against the preceding period of the same length. */
export function computeKpis(applications, log, { from, to }) {
  const current = periodStats(applications, log, from, to)
  const previous = periodStats(applications, log, from - (to - from), from)
  const delta = (key) =>
    current[key] == null || previous[key] == null ? null : current[key] - previous[key]
  return {
    applications: applications.length,
    ...current,
    delta: {
      sent: delta('sent'),
      failed: delta('failed'),
      replies: delta('replies'),
      replyRate: delta('replyRate'),
    },
  }
}

export function formatPercent(ratio, digits = 1) {
  if (ratio == null || Number.isNaN(ratio)) return '-'
  return `${(ratio * 100).toFixed(digits)}%`
}

const STATUS_ORDER = Object.values(APPLICATION_STATUS)

export function statusBreakdown(applications) {
  const total = applications.length
  return STATUS_ORDER.map((status) => {
    const count = applications.filter(
      (app) => (app.applicationStatus || APPLICATION_STATUS.notApplied) === status,
    ).length
    return { status, count, share: total ? count / total : 0 }
  }).filter((item) => item.count > 0)
}

export function replyRateByTemplate(applications) {
  const groups = new Map()
  for (const app of applications) {
    if (!app.sentDate || !app.templateName) continue
    const group = groups.get(app.templateName) ?? { template: app.templateName, sent: 0, replied: 0 }
    group.sent += 1
    if (app.replyStatus === REPLY_STATUS.replied) group.replied += 1
    groups.set(app.templateName, group)
  }
  return [...groups.values()]
    .map((group) => ({ ...group, rate: group.sent ? group.replied / group.sent : 0 }))
    .sort((a, b) => b.sent - a.sent)
}

const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0)

/**
 * One-sentence summary comparing the last `window` buckets with the `window` before them,
 * e.g. "23 emails sent in the last 4 weeks, up from 15 in the 4 weeks before."
 */
export function describeTrend(series, key, { noun, window = 4, unit = 'weeks' }) {
  if (series.length < window * 2) {
    const total = sum(series, key)
    return total ? `${total} ${noun} in this period.` : `No ${noun} in this period.`
  }
  const current = sum(series.slice(-window), key)
  const previous = sum(series.slice(-window * 2, -window), key)
  const span = `the last ${window} ${unit}`
  if (!current && !previous) return `No ${noun} in ${span}.`
  if (current === previous) return `${current} ${noun} in ${span}, the same as the ${window} ${unit} before.`
  const direction = current > previous ? 'up' : 'down'
  return `${current} ${noun} in ${span}, ${direction} from ${previous} in the ${window} ${unit} before.`
}
