import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleAlertIcon,
  ClockAlertIcon,
  CloudOffIcon,
  LoaderCircleIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const GOOGLE_STATES = {
  connected: { icon: CircleCheckIcon, tone: 'text-success', label: 'Connected' },
  requesting: { icon: LoaderCircleIcon, tone: 'text-muted-foreground motion-safe:animate-spin', label: 'Connecting' },
  partial: { icon: CircleAlertIcon, tone: 'text-warning', label: 'Permissions missing' },
  expiring: { icon: ClockAlertIcon, tone: 'text-warning', label: 'Session expiring' },
  expired: { icon: CircleAlertIcon, tone: 'text-warning', label: 'Session expired' },
  disconnected: { icon: CircleDashedIcon, tone: 'text-muted-foreground', label: 'Not connected' },
}

const SHEET_STATES = {
  connected: { icon: CircleCheckIcon, tone: 'text-success', label: 'Sheet connected' },
  'no-access': { icon: CircleAlertIcon, tone: 'text-destructive', label: 'No access to sheet' },
  'not-set': { icon: CircleDashedIcon, tone: 'text-muted-foreground', label: 'No sheet connected' },
}

function getGoogleState(status) {
  return GOOGLE_STATES[status] ?? GOOGLE_STATES.disconnected
}

/** Icon and text together, so state never depends on color alone. */
export function ConnectionStatus({ kind = 'google', status, detail, online = true, className }) {
  const state = !online
    ? { icon: CloudOffIcon, tone: 'text-warning', label: 'Offline' }
    : kind === 'sheet'
      ? (SHEET_STATES[status] ?? SHEET_STATES['not-set'])
      : getGoogleState(status)
  const Icon = state.icon

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-xs', className)}>
      <Icon className={cn('size-3.5 shrink-0', state.tone)} aria-hidden="true" />
      <span className="truncate text-muted-foreground">
        {kind === 'google' && <span className="sr-only">Google: </span>}
        {detail ?? state.label}
      </span>
    </span>
  )
}
