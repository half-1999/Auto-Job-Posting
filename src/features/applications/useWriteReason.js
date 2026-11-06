import { useAuth, useWorkspace } from '@/context/app-contexts'

/** Why a change can't be written to the sheet right now, or null. Offline edits are not queued. */
export function useWriteReason() {
  const { online, isMock } = useWorkspace()
  const { live } = useAuth()
  if (!online) return 'Needs a connection'
  if (!isMock && !live) return 'Connect Google first'
  return null
}
