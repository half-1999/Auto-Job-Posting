import { useEffect, useState } from 'react'
import { CircleAlertIcon, ClockAlertIcon, LogInIcon } from 'lucide-react'
import { WithReason } from '@/components/common/WithReason'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/app-contexts'
import { minutesLeft } from '@/context/authModel'
import { cn } from '@/lib/utils'

function useMinutesLeft(expiresAt, active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const id = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(id)
  }, [active])
  return minutesLeft(expiresAt, now)
}

/**
 * Session prompts under the header (AC-2). Expiry never clears data: pages keep what they show,
 * and anything that needs Google waits for Reconnect.
 */
export function AuthBanner() {
  const { status, hint, expiresAt, disabledReason, connect, grantMissing, configured } = useAuth()
  const minutes = useMinutesLeft(expiresAt, status === 'expiring')

  let tone = 'warning'
  let Icon = CircleAlertIcon
  let message
  let action = { label: 'Reconnect', run: () => connect() }

  if (status === 'expired') {
    message = 'Your Google session expired. Reconnect to continue. Nothing was lost.'
  } else if (status === 'expiring') {
    Icon = ClockAlertIcon
    message = `Your Google session ends in ${minutes} min. Reconnect now to keep syncing and sending.`
  } else if (status === 'partial') {
    message =
      'Some permissions were not granted. Syncing and sending need access to Sheets and Gmail send.'
    action = { label: 'Grant permissions', run: grantMissing }
  } else if (status === 'disconnected' && hint && configured) {
    tone = 'info'
    Icon = LogInIcon
    message = `Reconnect ${hint} to sync and send.`
  } else {
    return null
  }

  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2 text-sm md:px-6 xl:px-8',
        tone === 'warning' ? 'bg-warning/10' : 'bg-muted/50',
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0',
          tone === 'warning' ? 'text-warning' : 'text-muted-foreground',
        )}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 basis-56 text-pretty">{message}</p>
      <WithReason reason={disabledReason} label={action.label}>
        <Button
          size="sm"
          variant={tone === 'warning' ? 'default' : 'outline'}
          onClick={action.run}
          disabled={Boolean(disabledReason)}
        >
          {action.label}
        </Button>
      </WithReason>
    </div>
  )
}
