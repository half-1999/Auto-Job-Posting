import {
  BriefcaseBusinessIcon,
  ChartColumnIcon,
  FileTextIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  SendIcon,
  SettingsIcon,
  SheetIcon,
} from 'lucide-react'

/**
 * Single source for the sidebar, bottom tab bar, drawer, command palette, and shortcuts sheet.
 * `shortcut` is a two-key sequence: press G, then the key.
 */
export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboardIcon,
    group: 'Workspace',
    shortcut: 'd',
    mobileTab: true,
  },
  {
    id: 'applications',
    label: 'Applications',
    path: '/applications',
    icon: BriefcaseBusinessIcon,
    group: 'Workspace',
    shortcut: 'a',
    mobileTab: true,
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    path: '/campaigns',
    icon: SendIcon,
    group: 'Workspace',
    shortcut: 'c',
    mobileTab: true,
  },
  {
    id: 'templates',
    label: 'Templates',
    path: '/templates',
    icon: FileTextIcon,
    group: 'Workspace',
    shortcut: 't',
    mobileTab: false,
  },
  {
    id: 'history',
    label: 'Email History',
    shortLabel: 'History',
    path: '/history',
    icon: HistoryIcon,
    group: 'Data',
    shortcut: 'h',
    mobileTab: true,
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: ChartColumnIcon,
    group: 'Data',
    shortcut: 'r',
    mobileTab: false,
  },
  {
    id: 'sheets',
    label: 'Google Sheets',
    path: '/sheets',
    icon: SheetIcon,
    group: 'Data',
    shortcut: 's',
    mobileTab: false,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: SettingsIcon,
    group: 'footer',
    shortcut: ',',
    mobileTab: false,
  },
]

export const NAV_GROUPS = ['Workspace', 'Data']

export const MOBILE_TABS = NAV_ITEMS.filter((item) => item.mobileTab)

export function getNavGroup(group) {
  return NAV_ITEMS.filter((item) => item.group === group)
}

/** Longest-prefix match so `/applications/123` resolves to Applications. */
export function findNavItem(pathname) {
  if (pathname === '/') return NAV_ITEMS[0]
  return (
    NAV_ITEMS.filter((item) => item.path !== '/' && pathname.startsWith(item.path)).sort(
      (a, b) => b.path.length - a.path.length,
    )[0] ?? null
  )
}

export function findNavItemByShortcut(key) {
  return NAV_ITEMS.find((item) => item.shortcut === key) ?? null
}
