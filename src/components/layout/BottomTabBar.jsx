import { EllipsisIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { findNavItem, MOBILE_TABS } from '@/app/navigation'
import { useShell } from '@/app/ShellContext'
import { cn } from '@/lib/utils'

const tabClass =
  'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-[11px] leading-none font-medium transition-colors duration-(--dur-fast) focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-muted'

export function BottomTabBar() {
  const { pathname } = useLocation()
  const { drawerOpen, setDrawerOpen } = useShell()
  const activeId = findNavItem(pathname)?.id
  const inMenu = !MOBILE_TABS.some((tab) => tab.id === activeId)

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background pb-safe md:hidden"
    >
      <div className="flex h-(--tabbar-h) items-stretch gap-1 px-2 py-1">
        {MOBILE_TABS.map((tab) => {
          const active = tab.id === activeId
          return (
            <NavLink
              key={tab.id}
              to={tab.path}
              aria-current={active ? 'page' : undefined}
              className={cn(tabClass, active ? 'text-foreground' : 'text-muted-foreground')}
            >
              <tab.icon className="size-5" aria-hidden="true" />
              {tab.shortLabel ?? tab.label}
            </NavLink>
          )
        })}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-controls="nav-drawer"
          className={cn(tabClass, inMenu ? 'text-foreground' : 'text-muted-foreground')}
        >
          <EllipsisIcon className="size-5" aria-hidden="true" />
          Menu
        </button>
      </div>
    </nav>
  )
}
