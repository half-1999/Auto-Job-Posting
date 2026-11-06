import { Loader2Icon, RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'
import { WithReason } from '@/components/common/WithReason'
import { Button } from '@/components/ui/button'
import { useAuth, useWorkspace } from '@/context/app-contexts'
import { syncSummary } from './syncSummary'

/**
 * Sync now. Reads the sheet only; it never sends email. Disabled with the reason until a sheet is
 * connected, while offline, or without a Google session. In mock mode it reloads the mock data.
 */
export function SyncNowButton({ variant = 'outline', size, className }) {
  const { connected, online, isMock, reload, syncState } = useWorkspace()
  const { live } = useAuth()
  const busy = syncState.status === 'syncing'
  const reason = !online
    ? 'Needs a connection'
    : !connected
      ? 'Connect a sheet first'
      : !isMock && !live
        ? 'Connect Google first'
        : null

  const run = async () => {
    const outcome = await reload()
    if (isMock) {
      toast('Mock data reloaded', { description: 'Nothing was read from Google.' })
      return
    }
    if (outcome?.ok) {
      toast.success('Synced', { description: syncSummary(outcome.result) })
      if (outcome.snapshotError) toast.warning("Couldn't save the offline copy", { description: outcome.snapshotError })
    } else if (outcome) {
      toast.error('Sync failed', { description: outcome.error })
    }
  }

  return (
    <WithReason reason={reason} label="Sync now">
      <Button variant={variant} size={size} className={className} onClick={run} disabled={Boolean(reason) || busy}>
        {busy ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : <RefreshCwIcon aria-hidden="true" />}
        Sync now
      </Button>
    </WithReason>
  )
}
