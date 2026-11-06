import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage, writeStorage } from '@/lib/storage'
import { addNotificationItem, markItemsRead } from './notificationStore'

const NotificationContext = createContext(null)

function persist(items) {
  try {
    writeStorage(STORAGE_KEYS.notifications, items)
  } catch {
    // Notifications are a convenience; a full or blocked store must not break the action that raised one.
  }
}

export function NotificationProvider({ children }) {
  const [items, setItems] = useState(() => readStorage(STORAGE_KEYS.notifications, []))

  const update = useCallback((fn) => {
    setItems((current) => {
      const next = fn(current)
      persist(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      items,
      unreadCount: items.filter((item) => !item.readAt).length,
      notify: (input) => update((current) => addNotificationItem(current, input)),
      markRead: (id) => update((current) => markItemsRead(current, [id])),
      markAllRead: () => update((current) => markItemsRead(current)),
      clear: () => update(() => []),
    }),
    [items, update],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used inside NotificationProvider')
  return context
}
