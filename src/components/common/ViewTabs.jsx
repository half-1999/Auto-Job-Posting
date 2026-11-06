import { cn } from '@/lib/utils'

/** Saved views. Underlined tabs from `md`, horizontally scrolling chips on phones. */
export function ViewTabs({ views, value, onChange, counts, label = 'Views', className }) {
  return (
    <nav aria-label={label} className={cn('-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0', className)}>
      <ul className="flex w-max gap-2 md:w-auto md:gap-5 md:border-b">
        {views.map((view) => {
          const active = view.id === value
          return (
            <li key={view.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(view.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 text-sm whitespace-nowrap transition-colors duration-(--dur-fast) outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'h-9 rounded-full border px-3.5 pointer-coarse:h-11 md:h-10 md:rounded-none md:border-0 md:border-b-2 md:px-0 md:pointer-coarse:h-11',
                  active
                    ? 'border-foreground bg-foreground text-background md:border-foreground md:bg-transparent md:font-medium md:text-foreground'
                    : 'bg-background text-muted-foreground hover:text-foreground md:border-transparent',
                )}
              >
                {view.label}
                {counts && (
                  <span className={cn('tabular-nums', active ? 'opacity-80' : 'text-muted-foreground')}>
                    {counts[view.id] ?? 0}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
