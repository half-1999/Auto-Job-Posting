import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './time'

const NOW = new Date('2026-11-04T10:00:00Z')
const ago = (seconds) => new Date(NOW.getTime() - seconds * 1000)

describe('formatRelativeTime', () => {
  it('formats recent, minute, hour, and day offsets', () => {
    expect(formatRelativeTime(ago(10), NOW)).toBe('just now')
    expect(formatRelativeTime(ago(4 * 60), NOW)).toBe('4 minutes ago')
    expect(formatRelativeTime(ago(3 * 3600), NOW)).toBe('3 hours ago')
    expect(formatRelativeTime(ago(26 * 3600), NOW)).toBe('yesterday')
  })

  it('accepts ISO strings and returns empty text for bad input', () => {
    expect(formatRelativeTime(ago(120).toISOString(), NOW)).toBe('2 minutes ago')
    expect(formatRelativeTime('not a date', NOW)).toBe('')
    expect(formatRelativeTime(null, NOW)).toBe('')
  })
})
