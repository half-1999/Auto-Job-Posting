import { describe, expect, it } from 'vitest'
import { NOTIFICATION_LIMIT } from '@/lib/constants'
import { addNotificationItem, markItemsRead } from './notificationStore'

const NOW = new Date('2026-11-04T10:00:00Z')

describe('notification store helpers', () => {
  it('adds newest first with an unread state', () => {
    const items = addNotificationItem([], { title: 'Sync finished', type: 'sync' }, NOW)
    const next = addNotificationItem(items, { title: 'Campaign finished' }, NOW)

    expect(next.map((item) => item.title)).toEqual(['Campaign finished', 'Sync finished'])
    expect(next[0]).toMatchObject({ readAt: null, type: 'info', href: null })
  })

  it(`keeps only the latest ${NOTIFICATION_LIMIT}`, () => {
    let items = []
    for (let i = 0; i < NOTIFICATION_LIMIT + 5; i++) {
      items = addNotificationItem(items, { title: `Event ${i}` }, NOW)
    }
    expect(items).toHaveLength(NOTIFICATION_LIMIT)
    expect(items[0].title).toBe(`Event ${NOTIFICATION_LIMIT + 4}`)
  })

  it('marks one or all as read without touching already-read items', () => {
    const base = [
      { id: 'a', readAt: null },
      { id: 'b', readAt: '2026-11-01T00:00:00.000Z' },
      { id: 'c', readAt: null },
    ]

    expect(markItemsRead(base, ['a'], NOW).map((item) => item.readAt)).toEqual([
      NOW.toISOString(),
      '2026-11-01T00:00:00.000Z',
      null,
    ])
    expect(markItemsRead(base, undefined, NOW).every((item) => item.readAt)).toBe(true)
  })
})
