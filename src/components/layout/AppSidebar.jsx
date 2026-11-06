import { PanelLeftIcon, SearchIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { findNavItem, getNavGroup, NAV_GROUPS } from '@/app/navigation'
import { useShell } from '@/app/ShellContext'
import { ProfileMenu } from '@/components/global/ProfileMenu'
import { SyncStatusRow } from '@/components/global/SyncStatus'
import { AppMark } from '@/components/layout/AppMark'
import { Kbd } from '@/components/ui/kbd'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { APP_NAME } from '@/lib/constants'
import { modKeyLabel } from '@/lib/platform'

function NavItem({ item, active }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <NavLink to={item.path} aria-current={active ? 'page' : undefined}>
          <item.icon aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar({ status }) {
  const { pathname } = useLocation()
  const activeId = findNavItem(pathname)?.id
  const { setPaletteOpen } = useShell()
  const { state, toggleSidebar } = useSidebar()
  const collapsed = state === 'collapsed'
  const [settings] = getNavGroup('footer')

  return (
    <Sidebar variant="inset" collapsible="icon" aria-label="Main navigation">
      <SidebarHeader className="gap-3 px-2 pt-3">
        <div className="flex h-8 items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Expand sidebar"
                  className="flex items-center rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <AppMark />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Expand sidebar <Kbd>[</Kbd>
              </TooltipContent>
            </Tooltip>
          ) : (
            <AppMark />
          )}
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            {APP_NAME}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Collapse sidebar"
                className="ml-auto flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none group-data-[collapsible=icon]:hidden pointer-coarse:size-11"
              >
                <PanelLeftIcon className="size-4" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Collapse sidebar <Kbd>[</Kbd>
            </TooltipContent>
          </Tooltip>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              variant="outline"
              onClick={() => setPaletteOpen(true)}
              tooltip="Search"
              className="text-muted-foreground"
            >
              <SearchIcon aria-hidden="true" />
              <span>Search</span>
              <Kbd className="ml-auto group-data-[collapsible=icon]:hidden">
                {modKeyLabel()} K
              </Kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group} className="py-1">
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarMenu>
              {getNavGroup(group).map((item) => (
                <NavItem key={item.id} item={item} active={item.id === activeId} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-1 pb-3">
        <SidebarMenu>
          <NavItem item={settings} active={settings.id === activeId} />
          <SidebarMenuItem>
            <SyncStatusRow sync={status.sync} />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <ProfileMenu status={status} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
