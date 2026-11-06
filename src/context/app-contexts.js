import { createContext, useContext, useMemo } from 'react'
import { SENDING_DEFAULTS } from '@/lib/constants'

/**
 * Context objects live here, not in the provider files.
 * A hot reload of a provider then keeps the same context the hooks already use.
 */

export const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export const WorkspaceContext = createContext(null)

export const MOCK_SCENARIOS = [
  { id: 'populated', label: 'Populated' },
  { id: 'loading', label: 'Loading' },
  { id: 'error', label: 'Sync error' },
  { id: 'empty', label: 'Not connected' },
  { id: 'offline', label: 'Offline' },
]

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return context
}

/** `jaas.settings` (docs/DATABASE_SCHEMA.md §6). Preferences only: no tokens or credentials. */
export const DEFAULT_SETTINGS = {
  profile: { name: '', phone: '', linkedin: '', portfolio: '' },
  sending: {
    delaySeconds: SENDING_DEFAULTS.delaySeconds,
    dailyCap: SENDING_DEFAULTS.dailyCap,
    allowResend: SENDING_DEFAULTS.allowResend,
    recencyDays: SENDING_DEFAULTS.recencyDays,
  },
  replyTracking: { enabled: false },
  browserNotifications: { enabled: false },
  offline: { keepSnapshot: true },
}

export const SettingsContext = createContext(null)

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside SettingsProvider')
  return context
}

/** Profile values for `my_*` placeholders. In mock mode, empty fields fall back to the mock profile. */
export function useProfile() {
  const { settings } = useSettings()
  const { profile: workspaceProfile } = useWorkspace()
  return useMemo(() => {
    const base = workspaceProfile ?? {}
    const merged = { ...base }
    for (const [key, value] of Object.entries(settings.profile)) {
      if (value) merged[key] = value
    }
    return merged
  }, [settings.profile, workspaceProfile])
}
