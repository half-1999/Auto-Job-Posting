import {
  ChevronsUpDownIcon,
  KeyboardIcon,
  LogInIcon,
  LogOutIcon,
  MonitorDownIcon,
  SettingsIcon,
  UserRoundIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useShell } from '@/app/ShellContext'
import { ThemeRadioItems } from '@/components/common/ThemeSwitcher'
import { ConnectionStatus } from '@/components/global/ConnectionStatus'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { initials } from '@/lib/text'
import { useAuth } from '@/context/app-contexts'
import { cn } from '@/lib/utils'
import { useInstallPrompt } from '@/pwa/useInstallPrompt'

export function ProfileAvatar({ google, className }) {
  const letters = initials(google.name, google.email)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-semibold text-muted-foreground',
        className,
      )}
    >
      {letters || <UserRoundIcon className="size-4" />}
    </span>
  )
}

export function ProfileMenu({ status }) {
  const navigate = useNavigate()
  const { setShortcutsOpen, setInstallOpen } = useShell()
  const { canOffer } = useInstallPrompt()
  const auth = useAuth()
  const { google, online } = status

  return (
    <DropdownMenu onOpenChange={(open) => open && !auth.live && auth.prepare()}>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
          <ProfileAvatar google={google} />
          <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
            <span className="truncate text-sm font-medium">
              {google.name || google.email || 'Google account'}
            </span>
            <ConnectionStatus status={google.status} online={online} />
          </span>
          <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-60"
      >
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            {google.email || 'No Google account connected'}
          </span>
          <ConnectionStatus status={google.status} online={online} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {canOffer && (
            <DropdownMenuItem onSelect={() => setInstallOpen(true)}>
              <MonitorDownIcon aria-hidden="true" />
              Install app
            </DropdownMenuItem>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <ThemeRadioItems />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={() => setShortcutsOpen(true)}>
            <KeyboardIcon aria-hidden="true" />
            Keyboard shortcuts
            <DropdownMenuShortcut>?</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/settings')}>
            <SettingsIcon aria-hidden="true" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {auth.live ? (
          <DropdownMenuItem variant="destructive" onSelect={() => auth.disconnect()}>
            <LogOutIcon aria-hidden="true" />
            Disconnect Google
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={Boolean(auth.disabledReason) || auth.status === 'requesting'}
            onSelect={() => auth.connect()}
          >
            <LogInIcon aria-hidden="true" />
            {auth.hint ? 'Reconnect Google' : 'Connect Google'}
            {auth.disabledReason && (
              <span className="ml-auto pl-2 text-xs text-muted-foreground">
                {auth.disabledReason}
              </span>
            )}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
