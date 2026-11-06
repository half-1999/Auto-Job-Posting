import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const DELTA_ICONS = { up: ArrowUpRightIcon, down: ArrowDownRightIcon, flat: MinusIcon }

/**
 * One bordered strip divided by hairlines instead of a row of cards.
 * Each cell draws its right and bottom hairline; the strip clips the outer ones.
 * On phones an odd last cell spans the full width (2 × 2 plus one).
 * Item: `{ label, value, hint, href, delta: { direction: 'up'|'down'|'flat', text } }`.
 */
export function KpiStrip({ items, loading = false, className }) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 overflow-hidden rounded-lg border bg-background sm:grid-cols-3 lg:grid-cols-5',
        className,
      )}
    >
      {items.map((item, index) => {
        const lastOdd = index === items.length - 1 && items.length % 2 === 1
        const DeltaIcon = item.delta ? DELTA_ICONS[item.delta.direction] : null
        const linked = item.href && !loading
        const value = <span className="text-2xl font-semibold tabular-nums">{item.value ?? '-'}</span>
        return (
          <div
            key={item.label}
            className={cn(
              'relative -mr-px -mb-px flex min-w-0 flex-col gap-1 border-r border-b px-4 py-3',
              linked && 'transition-colors duration-(--dur-fast) has-[a:hover]:bg-muted/60 has-[a:focus-visible]:bg-muted',
              lastOdd && 'max-sm:col-span-2',
            )}
          >
            <dt className="truncate text-xs font-medium text-muted-foreground">{item.label}</dt>
            <dd className="flex min-w-0 flex-col gap-0.5">
              {loading ? (
                <Skeleton className="my-1 h-6 w-14" />
              ) : (
                <span className="flex items-baseline gap-2">
                  {linked ? (
                    <Link
                      to={item.href}
                      aria-label={`${item.label}: ${item.value ?? 'none'}. Open details`}
                      className="outline-none after:absolute after:inset-0 focus-visible:after:shadow-[inset_0_0_0_2px_var(--ring)]"
                    >
                      {value}
                    </Link>
                  ) : (
                    value
                  )}
                  {item.hint && <span className="truncate text-xs text-muted-foreground">{item.hint}</span>}
                </span>
              )}
              {!loading && item.delta && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DeltaIcon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.delta.text}</span>
                </span>
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
