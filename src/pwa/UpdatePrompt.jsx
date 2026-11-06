import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useNotifications } from '@/context/NotificationContext'
import { useWorkspace } from '@/context/app-contexts'
import { getUpdateAction, isSending, setUpdateState } from './updateStore'

const UPDATE_CHECK_MS = 60 * 60 * 1000
const TOAST_ID = 'app-update'

/** Checks on registration, when the tab becomes visible again, and hourly while open. */
function scheduleUpdateChecks(registration) {
  const check = () => {
    if (navigator.onLine && !registration.installing) registration.update().catch(() => {})
  }
  const onVisible = () => document.visibilityState === 'visible' && check()
  document.addEventListener('visibilitychange', onVisible)
  setInterval(check, UPDATE_CHECK_MS)
}

/**
 * Service worker registration with `registerType: 'prompt'`: a new version waits until the user
 * clicks Reload, and Reload is held back while a campaign is sending.
 */
export default function UpdatePrompt() {
  const { runs } = useWorkspace()
  const { notify } = useNotifications()
  const sending = isSending(runs)
  const deferred = useRef(false)

  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) scheduleUpdateChecks(registration)
    },
  })

  useEffect(() => {
    if (!offlineReady) return
    toast('JobApply can now open offline.')
    setOfflineReady(false)
  }, [offlineReady, setOfflineReady])

  useEffect(() => {
    setUpdateState({ needRefresh, apply: () => updateServiceWorker(true) })
  }, [needRefresh, updateServiceWorker])

  useEffect(() => {
    const action = getUpdateAction({ needRefresh, sending })
    if (!action || deferred.current) return undefined
    toast(action.message, {
      id: TOAST_ID,
      duration: Infinity,
      action: action.canReload
        ? { label: 'Reload', onClick: () => updateServiceWorker(true) }
        : undefined,
      cancel: {
        label: 'Later',
        onClick: () => {
          deferred.current = true
          notify({
            type: 'info',
            title: 'Update ready',
            body: 'Reload from Settings, About when convenient.',
            href: '/settings/about',
          })
        },
      },
    })
    return undefined
  }, [needRefresh, sending, updateServiceWorker, notify])

  return null
}
