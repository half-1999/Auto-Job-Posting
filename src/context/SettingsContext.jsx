import { useCallback, useMemo, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage, writeStorage } from '@/lib/storage'
import { DEFAULT_SETTINGS, SettingsContext } from './app-contexts'

function load() {
  const stored = readStorage(STORAGE_KEYS.settings, {}) ?? {}
  return Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS).map(([section, defaults]) => [
      section,
      { ...defaults, ...(stored[section] ?? {}) },
    ]),
  )
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)

  /** Throws `StorageError` when the browser blocks storage, so forms can show the failure. */
  const saveSection = useCallback(
    (section, values) => {
      const next = { ...settings, [section]: { ...settings[section], ...values } }
      writeStorage(STORAGE_KEYS.settings, next)
      setSettings(next)
    },
    [settings],
  )

  const value = useMemo(() => ({ settings, saveSection }), [settings, saveSection])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
