import { useState } from 'react'
import { CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Phone list that replaces tables. Outside selection mode a row opens its item; in selection
 * mode the whole row is a 44 px+ checkbox. "Show N more" replaces pagination.
 * `renderRow` must return non-interactive content (it is placed inside a button).
 */
export function ResponsiveList({
  items,
  getKey,
  renderRow,
  label,
  onOpen,
  selectionMode = false,
  isSelected,
  onToggle,
  pageSize = 50,
  className,
}) {
  const [visible, setVisible] = useState(pageSize)
  const shown = items.slice(0, visible)
  const remaining = items.length - shown.length

  return (
    <div className={cn('flex flex-col', className)}>
      <ul aria-label={label} className="divide-y border-y">
        {shown.map((item) => {
          const checked = selectionMode && isSelected(item)
          return (
            <li key={getKey(item)}>
              <button
                type="button"
                role={selectionMode ? 'checkbox' : undefined}
                aria-checked={selectionMode ? checked : undefined}
                onClick={() => (selectionMode ? onToggle(item) : onOpen?.(item))}
                className={cn(
                  'flex min-h-16 w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-(--dur-fast) outline-none focus-visible:bg-muted focus-visible:shadow-[inset_2px_0_0_var(--ring)] active:bg-muted',
                  checked && 'bg-accent',
                )}
              >
                {selectionMode && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-border-strong bg-background',
                      checked && 'border-brand bg-brand text-brand-foreground',
                    )}
                  >
                    {checked && <CheckIcon className="size-3.5" />}
                  </span>
                )}
                <span className="block min-w-0 flex-1">{renderRow(item)}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {remaining > 0 && (
        <Button
          variant="outline"
          className="mx-4 mt-3"
          onClick={() => setVisible((count) => count + pageSize)}
        >
          Show {Math.min(pageSize, remaining)} more
        </Button>
      )}
    </div>
  )
}
