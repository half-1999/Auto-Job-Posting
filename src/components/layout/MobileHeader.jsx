import { MenuIcon, SearchIcon } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { findNavItem } from '@/app/navigation'
import { useShell } from '@/app/ShellContext'
import { MockBadge } from '@/components/global/MockBadge'
import { SyncStatusGlyph } from '@/components/global/SyncStatus'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'

/** Phone header. The visible title is decorative; each page renders its own h1 for assistive tech. */
export function MobileHeader({ status }) {
  const { pathname } = useLocation()
  const { drawerOpen, setDrawerOpen, setPaletteOpen } = useShell()
  const title = findNavItem(pathname)?.label ?? APP_NAME

  return (
    <header className="sticky top-0 z-20 border-b bg-background pt-safe md:hidden">
      <div className="flex h-(--header-h) items-center gap-1 px-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          aria-controls="nav-drawer"
        >
          <MenuIcon aria-hidden="true" />
        </Button>
        <span aria-hidden="true" className="min-w-0 flex-1 truncate px-1 text-md font-semibold">
          {title}
        </span>
        <MockBadge compact className="border-0" />
        <Button variant="ghost" size="icon" onClick={() => setPaletteOpen(true)} aria-label="Search">
          <SearchIcon aria-hidden="true" />
        </Button>
        <SyncStatusGlyph sync={status.sync} />
      </div>
    </header>
  )
}
