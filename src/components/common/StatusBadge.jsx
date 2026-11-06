import { BanIcon, CircleAlertIcon, ClockIcon, Loader2Icon } from 'lucide-react'
import { getStatusTone } from '@/lib/statusTones'
import { cn } from '@/lib/utils'

const TONE_CLASSES = {
  neutral: 'bg-muted text-muted-foreground',
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
}

const ICONS = {
  Queued: ClockIcon,
  Failed: CircleAlertIcon,
  Bounced: CircleAlertIcon,
  'Do Not Email': BanIcon,
  Withdrawn: BanIcon,
}

export function StatusBadge({ status, className }) {
  const label = status || 'Not Set'
  const tone = getStatusTone(status)
  const Icon = ICONS[status]

  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {status === 'Sending' && <Loader2Icon className="size-3 animate-spin" aria-hidden="true" />}
      {Icon && <Icon className="size-3" aria-hidden="true" />}
      {label}
    </span>
  )
}
