import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useWorkspace } from '@/context/app-contexts'
import { EMAIL_STATUS } from '@/lib/constants'
import { useWriteReason } from './useWriteReason'

export function useApplicationActions() {
  const navigate = useNavigate()
  const { applications, updateApplications, isMock } = useWorkspace()
  const writeReason = useWriteReason()

  const emailApplications = useCallback(
    (ids) => navigate('/campaigns/new', { state: { ids } }),
    [navigate],
  )

  /** Mark or unmark Do Not Email, with Undo (docs/UI_UX_PLAN.md §4, toasts). */
  const setDoNotEmail = useCallback(
    (ids, block) => {
      if (writeReason) {
        toast.error("Can't change Email Status right now", { description: writeReason })
        return
      }
      const previous = new Map(applications.filter((app) => ids.includes(app.id)).map((app) => [app.id, app.emailStatus]))
      if (block) {
        updateApplications(ids, { emailStatus: EMAIL_STATUS.doNotEmail })
      } else {
        for (const app of applications.filter((item) => ids.includes(item.id))) {
          updateApplications([app.id], { emailStatus: app.sentDate ? EMAIL_STATUS.sent : EMAIL_STATUS.notSent })
        }
      }
      const count = ids.length
      toast(block ? `Marked ${count} as Do Not Email` : `Email allowed again for ${count}`, {
        description: isMock ? 'Mock data only. Your sheet was not changed.' : undefined,
        action: {
          label: 'Undo',
          onClick: () => {
            for (const [id, status] of previous) updateApplications([id], { emailStatus: status })
          },
        },
      })
    },
    [applications, updateApplications, isMock, writeReason],
  )

  return { emailApplications, setDoNotEmail }
}
