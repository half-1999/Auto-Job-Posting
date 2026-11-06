import { ChevronLeftIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MockBadge } from '@/components/global/MockBadge'
import { NotificationCenter } from '@/components/global/NotificationCenter'
import { Button } from '@/components/ui/button'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

/**
 * Desktop: sticky 52 px bar with title, actions, the mock badge, and the notification bell.
 * Phone: the shell header shows the title, so the h1 is visually hidden and actions wrap below.
 */
export function PageHeader({ title, count, description, actions, className }) {
  const isDesktop = useMediaQuery(MEDIA.md)

  return (
    <header
      className={cn(
        'flex flex-col gap-3 px-4 pt-4 md:sticky md:top-0 md:z-20 md:h-13 md:shrink-0 md:flex-row md:items-center md:gap-3 md:border-b md:bg-background md:px-6 md:pt-0 xl:px-8',
        className,
      )}
    >
      <div className="flex min-w-0 items-baseline gap-2 max-md:sr-only">
        <h1 className="truncate text-xl font-semibold">{title}</h1>
        {count != null && <span className="text-sm text-muted-foreground tabular-nums">{count}</span>}
      </div>
      {description && <p className="text-sm text-pretty text-muted-foreground md:hidden">{description}</p>}
      {(actions || isDesktop) && (
        <div className="flex flex-wrap items-center gap-2 empty:hidden md:ml-auto md:flex-nowrap">
          {actions}
          {isDesktop && <MockBadge />}
          {isDesktop && <NotificationCenter />}
        </div>
      )}
    </header>
  )
}

/**
 * Phone sub-screen header (detail, editor, settings section) with a back link. From `md`
 * it renders nothing unless `desktop` is set, because those screens use panels or the PageHeader.
 */
export function SubHeader({ backTo, backLabel, title, actions, desktop = false, className }) {
  return (
    <div
      className={cn(
        'sticky top-[calc(var(--header-h)+env(safe-area-inset-top))] z-10 flex h-12 items-center gap-1 border-b bg-background px-1',
        !desktop && 'md:hidden',
        desktop && 'md:top-0 md:px-4',
        className,
      )}
    >
      <Button asChild variant="ghost" size="icon">
        <Link to={backTo} aria-label={backLabel}>
          <ChevronLeftIcon aria-hidden="true" />
        </Link>
      </Button>
      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</p>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  )
}

export function PageBody({ className, children }) {
  return (
    <div className={cn('flex flex-col gap-6 px-4 py-4 md:gap-7 md:px-6 md:py-6 xl:gap-8 xl:px-8', className)}>
      {children}
    </div>
  )
}
