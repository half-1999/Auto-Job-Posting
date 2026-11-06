const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const UNITS = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

/** "just now", "4 minutes ago", "yesterday". Returns '' for missing or invalid dates. */
export function formatRelativeTime(value, now = new Date()) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const seconds = Math.round((date.getTime() - now.getTime()) / 1000)
  if (Math.abs(seconds) < 45) return 'just now'

  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(Math.round(seconds / 60), 'minute')
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const dayMonthFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const headingFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

function dayDiff(date, now) {
  const a = new Date(date)
  const b = new Date(now)
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  return Math.round((b - a) / 86_400_000)
}

/** Compact stamp for feeds: "10:42" today, "Yesterday", "Mon" this week, otherwise "Nov 2". */
export function formatShortStamp(value, now = new Date()) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diff = dayDiff(date, now)
  if (diff === 0) return timeFormat.format(date)
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) return weekdayFormat.format(date)
  return dayMonthFormat.format(date)
}

export function formatTime(value) {
  if (!value) return ''
  return timeFormat.format(new Date(value))
}

/** Group heading for day-grouped lists: "Today", "Yesterday", or "Mon, Nov 2". */
export function formatDayHeading(value, now = new Date()) {
  const diff = dayDiff(value, now)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return headingFormat.format(new Date(value))
}

export function dayKey(value) {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function formatDateTime(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
