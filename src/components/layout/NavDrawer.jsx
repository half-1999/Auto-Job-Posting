import { MonitorDownIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { findNavItem, getNavGroup, NAV_GROUPS } from '@/app/navigation'
import { useShell } from '@/app/ShellContext'
import { ThemeSegmented } from '@/components/common/ThemeSwitcher'
import { ConnectionStatus } from '@/components/global/ConnectionStatus'
import { NotificationCenter } from '@/components/global/NotificationCenter'
import { ProfileAvatar } from '@/components/global/ProfileMenu'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useInstallPrompt } from '@/pwa/useInstallPrompt'

function DrawerLink({ item, active, onNavigate }) {
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-11 items-center gap-3 rounded-md px-3 text-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-muted',
        active ? 'bg-accent font-medium text-foreground' : 'text-foreground',
      )}
    >
      <item.icon className="size-5 text-muted-foreground" aria-hidden="true" />
      {item.label}
    </NavLink>
  )
}

/** Phone navigation. Closing returns focus to whichever control opened it (Radix default). */
export function NavDrawer({ status }) {
  const { drawerOpen, setDrawerOpen, setInstallOpen } = useShell()
  const { canOffer } = useInstallPrompt()
  const { pathname } = useLocation()
  const activeId = findNavItem(pathname)?.id
  const close = () => setDrawerOpen(false)
  const { google, online } = status
  const [settings] = getNavGroup('footer')

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent id="nav-drawer" side="left" className="gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex-row items-center gap-3 border-b px-4 py-3">
          <ProfileAvatar google={google} className="size-10" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <SheetTitle className="truncate text-sm">
              {google.email || 'Google account'}
            </SheetTitle>
            <SheetDescription asChild>
              <div>
                <ConnectionStatus status={google.status} online={online} />
              </div>
            </SheetDescription>
          </div>
          <NotificationCenter />
        </SheetHeader>

        <nav aria-label="All pages" className="flex-1 overflow-y-auto px-2 py-2">
          {NAV_GROUPS.map((group) => (
            <div key={group} className="flex flex-col gap-0.5 py-1">
              <span className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                {group}
              </span>
              {getNavGroup(group).map((item) => (
                <DrawerLink
                  key={item.id}
                  item={item}
                  active={item.id === activeId}
                  onNavigate={close}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-3 border-t px-4 pt-3 pb-4">
          {canOffer && (
            <button
              type="button"
              onClick={() => {
                close()
                setInstallOpen(true)
              }}
              className="flex h-11 items-center gap-3 rounded-md px-3 text-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-muted"
            >
              <MonitorDownIcon className="size-5 text-muted-foreground" aria-hidden="true" />
              Install app
            </button>
          )}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Theme</span>
            <ThemeSegmented />
          </div>
          <Separator />
          <DrawerLink item={settings} active={settings.id === activeId} onNavigate={close} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
