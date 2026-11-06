import { CircleAlertIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const TONES = {
  info: { icon: InfoIcon, className: 'border-border bg-muted/50', iconClass: 'text-muted-foreground' },
  warning: { icon: TriangleAlertIcon, className: 'border-warning/30 bg-warning/10', iconClass: 'text-warning' },
  destructive: {
    icon: CircleAlertIcon,
    className: 'border-destructive/30 bg-destructive/10',
    iconClass: 'text-destructive',
  },
}

/** Inline message with an optional action. Errors are announced; info and warnings are polite. */
export function InlineAlert({ tone = 'info', title, children, action, className }) {
  const { icon: Icon, className: toneClass, iconClass } = TONES[tone]
  return (
    <div
      role={tone === 'destructive' ? 'alert' : 'status'}
      className={cn('flex flex-wrap items-start gap-x-3 gap-y-2 rounded-lg border px-4 py-3 text-sm', toneClass, className)}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', iconClass)} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-pretty text-muted-foreground">{children}</div>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:pl-7">{action}</div>}
    </div>
  )
}
