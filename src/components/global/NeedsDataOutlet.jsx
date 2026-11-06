import { lazy } from 'react'
import { Outlet } from 'react-router-dom'
import { useWorkspace } from '@/context/app-contexts'

const OfflineScreen = lazy(() => import('@/components/global/OfflineScreen').then((m) => ({ default: m.OfflineScreen })))

/** Data pages show the Offline screen while offline when this device has nothing saved to display. */
export function NeedsDataOutlet() {
  const { online, connected, status } = useWorkspace()
  return !online && !connected && status !== 'loading' ? <OfflineScreen /> : <Outlet />
}
