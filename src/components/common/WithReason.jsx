import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Wraps a disabled control so its reason is reachable: the wrapper takes focus and hover
 * (disabled buttons get neither) and exposes the reason as its accessible name and tooltip.
 */
export function WithReason({ reason, label, className, children }) {
  if (!reason) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={label ? `${label}: ${reason}` : reason}
          className={cn('inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  )
}
