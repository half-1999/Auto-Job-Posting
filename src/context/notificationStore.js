import { NOTIFICATION_LIMIT } from '@/lib/constants'

export function addNotificationItem(items, input, now = new Date()) {
  const item = {
    id: input.id ?? crypto.randomUUID(),
    type: input.type ?? 'info',
    title: input.title,
    body: input.body ?? '',
    href: input.href ?? null,
    createdAt: now.toISOString(),
    readAt: null,
  }
  return [item, ...items].slice(0, NOTIFICATION_LIMIT)
}

/** Marks the given ids as read, or every item when `ids` is omitted. */
export function markItemsRead(items, ids, now = new Date()) {
  const stamp = now.toISOString()
  return items.map((item) =>
    item.readAt || (ids && !ids.includes(item.id)) ? item : { ...item, readAt: stamp },
  )
}
