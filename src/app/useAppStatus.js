import { useAuth, useWorkspace } from '@/context/app-contexts'

/**
 * Connection, sheet, and sync state for the shell indicators. Google reflects the real session;
 * the sheet and sync reflect the connected Google Sheet. Mock mode is reported as "mock", never
 * as connected.
 */
export function useAppStatus() {
  const workspace = useWorkspace()
  const auth = useAuth()
  const { online, isMock, status, sheet, syncState } = workspace
  const syncedAt = sheet?.syncedAt ?? null

  let sync = { status: online ? 'not-connected' : 'offline', syncedAt: null }
  if (isMock) {
    if (status === 'loading') sync = { status: 'syncing', syncedAt: null }
    else if (status === 'error') sync = { status: 'failed', syncedAt: null }
    else if (sheet) sync = { status: online ? 'mock' : 'offline', syncedAt }
  } else if (sheet) {
    if (!online) sync = { status: 'offline', syncedAt }
    else if (syncState.status === 'syncing') sync = { status: 'syncing', syncedAt }
    else if (syncState.status === 'failed') sync = { status: 'failed', syncedAt, error: syncState.error }
    else if (syncedAt) sync = { status: 'synced', syncedAt }
    else sync = { status: 'never', syncedAt: null }
  }

  return {
    online,
    isMock,
    google: {
      status: auth.status,
      email: auth.user?.email ?? auth.hint,
      name: auth.user?.name ?? null,
    },
    sheet: sheet
      ? { status: isMock ? 'mock' : 'connected', title: sheet.spreadsheetTitle }
      : { status: 'not-set', title: null },
    sync,
  }
}
