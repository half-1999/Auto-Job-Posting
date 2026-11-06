import { useCallback, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage, writeStorage } from '@/lib/storage'

const DEFAULT_PREFS = {
  sidebarCollapsed: false,
  density: 'comfortable',
}

/** UI preferences in `jaas.ui`. Writes are best effort; a blocked store keeps the in-memory value. */
export function useUiPrefs() {
  const [prefs, setPrefs] = useState(() => ({
    ...DEFAULT_PREFS,
    ...readStorage(STORAGE_KEYS.ui, {}),
  }))

  const updatePrefs = useCallback((patch) => {
    setPrefs((current) => {
      const next = { ...current, ...patch }
      try {
        writeStorage(STORAGE_KEYS.ui, next)
      } catch {
        // Preferences are not critical; the session keeps working with the in-memory value.
      }
      return next
    })
  }, [])

  return [prefs, updatePrefs]
}
