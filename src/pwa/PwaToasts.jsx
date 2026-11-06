import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useWorkspace } from '@/context/app-contexts'
import { onAppInstalled } from './installPrompt'
import { describePendingWork } from './updateStore'

/**
 * "Back online" and "installed" toasts. Reconnecting only reports pending work and links to it;
 * nothing resumes until the user acts on that page (PWA_STRATEGY §5.4).
 */
export function PwaToasts() {
  const { online, runs, pendingWritebacks } = useWorkspace()
  const navigate = useNavigate()
  const wasOnline = useRef(online)

  useEffect(() => onAppInstalled(() => toast.success('JobApply is installed')), [])

  useEffect(() => {
    const reconnected = online && !wasOnline.current
    wasOnline.current = online
    if (!reconnected) return

    const pending = describePendingWork(runs)
    const writes = pendingWritebacks.length
    if (pending.length === 0 && writes) {
      toast.success('Back online', {
        id: 'back-online',
        duration: Infinity,
        description: `${writes} ${writes === 1 ? 'change is' : 'changes are'} waiting to be saved to your sheet. Nothing is written until you retry.`,
        action: { label: 'Review', onClick: () => navigate('/sheets') },
        cancel: { label: 'Later', onClick: () => {} },
      })
      return
    }
    if (pending.length === 0) {
      toast.success('Back online')
      return
    }
    const [first] = pending
    toast.success('Back online', {
      id: 'back-online',
      duration: Infinity,
      description:
        pending.length === 1
          ? `${first.label}. Nothing restarts until you resume it.`
          : `${pending.length} campaigns are paused. Nothing restarts until you resume them.`,
      action: {
        label: 'Review',
        onClick: () => navigate(pending.length === 1 ? first.path : '/campaigns'),
      },
      cancel: { label: 'Later', onClick: () => {} },
    })
  }, [online, runs, pendingWritebacks, navigate])

  return null
}
