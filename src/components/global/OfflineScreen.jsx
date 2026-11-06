import { CloudOffIcon } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { findNavItem } from '@/app/navigation'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/context/app-contexts'

/**
 * Shown for data pages while offline when this device has no saved data to display
 * (PWA_STRATEGY §5.2). Pages with data, Templates, and Settings keep working offline.
 */
export function OfflineScreen() {
  const { pathname } = useLocation()
  const { reload } = useWorkspace()
  const title = findNavItem(pathname)?.label ?? 'Offline'

  const retry = () => {
    if (navigator.onLine) reload()
    else toast('Still offline. Check your connection, then try again.')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={title} />
      <EmptyState
        icon={CloudOffIcon}
        title="You're offline"
        description="This page needs data that isn't saved on this device yet. Connect to the internet, then try again."
        action={
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        }
      />
    </div>
  )
}