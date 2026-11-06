import { useKeyboardOpen } from '@/hooks/useKeyboardOpen'
import { cn } from '@/lib/utils'

/**
 * Commit-flow bar. Phones: fixed above the tab bar, hidden while the keyboard is open.
 * From `md`: "floating" sits centered over the bottom of the content panel (parent must be
 * `relative`); "footer" is a sticky bar at the bottom of the scroll area.
 */
export function ActionBar({ label, variant = 'floating', className, children }) {
  const keyboardOpen = useKeyboardOpen()

  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        'z-30 flex items-center gap-2 bg-background',
        'max-md:fixed max-md:inset-x-0 max-md:bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] max-md:border-t max-md:px-4 max-md:py-2',
        keyboardOpen && 'max-md:hidden',
        variant === 'floating' &&
          'md:absolute md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:rounded-lg md:border md:bg-popover md:px-3 md:py-2 md:shadow-pop md:animate-in md:fade-in-0 md:slide-in-from-bottom-2',
        variant === 'footer' && 'md:sticky md:bottom-0 md:border-t md:px-6 md:py-3 xl:px-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Reserves space at the end of a phone page so content isn't hidden behind the bar. */
export function ActionBarSpacer() {
  return <div aria-hidden="true" className="h-16 md:hidden" />
}
