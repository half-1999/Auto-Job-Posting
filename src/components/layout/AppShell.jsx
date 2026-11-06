import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { findNavItem } from '@/app/navigation'
import { useShell } from '@/app/ShellContext'
import { useGlobalShortcuts } from '@/app/shortcuts'
import { useAppStatus } from '@/app/useAppStatus'
import { useUiPrefs } from '@/app/useUiPrefs'
import { CampaignEngine } from '@/features/campaigns/CampaignEngine'
import { AuthBanner } from '@/components/global/AuthBanner'
import { OfflineBanner } from '@/components/global/OfflineBanner'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { NavDrawer } from '@/components/layout/NavDrawer'
import { RouteFallback } from '@/components/layout/RouteFallback'
import { SkipLink } from '@/components/layout/SkipLink'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { APP_NAME } from '@/lib/constants'
const CommandPalette = lazy(() =>
  import('@/components/global/CommandPalette').then((m) => ({ default: m.CommandPalette })),
)
const ShortcutsDialog = lazy(() =>
  import('@/components/global/ShortcutsDialog').then((m) => ({ default: m.ShortcutsDialog })),
)
const PwaToasts = lazy(() => import('@/pwa/PwaToasts').then((m) => ({ default: m.PwaToasts })))
const InstallDialog = lazy(() => import('@/pwa/InstallDialog').then((m) => ({ default: m.InstallDialog })))
// The service worker is only registered in production builds (devOptions disabled).
const UpdatePrompt = import.meta.env.PROD ? lazy(() => import('@/pwa/UpdatePrompt')) : null

/** True from the first time `open` becomes true, so a lazy overlay loads once and then stays mounted. */
function useOpenedOnce(open) {
  const [opened, setOpened] = useState(open)
  if (open && !opened) setOpened(true)
  return opened
}

/** Desktop keeps the saved sidebar preference; tablets start on the icon rail each visit. */
function useSidebarState() {
  const isLarge = useMediaQuery(MEDIA.lg)
  const [prefs, updatePrefs] = useUiPrefs()
  const [tabletOpen, setTabletOpen] = useState(false)

  const open = isLarge ? !prefs.sidebarCollapsed : tabletOpen
  const setOpen = (next) =>
    isLarge ? updatePrefs({ sidebarCollapsed: !next }) : setTabletOpen(next)

  return [open, setOpen]
}

/** On navigation: update the title, reset scroll, and move focus to the content. */
function useRouteChangeEffects(mainRef) {
  const { pathname } = useLocation()
  const first = useRef(true)

  useEffect(() => {
    const item = findNavItem(pathname)
    document.title = item ? `${item.label} · ${APP_NAME}` : APP_NAME

    if (first.current) {
      first.current = false
      return
    }
    mainRef.current?.scrollTo?.({ top: 0 })
    window.scrollTo({ top: 0 })
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname, mainRef])
}

export function AppShell() {
  const status = useAppStatus()
  const navigate = useNavigate()
  const mainRef = useRef(null)
  const [sidebarOpen, setSidebarOpen] = useSidebarState()
  const { paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen, installOpen } = useShell()
  const paletteLoaded = useOpenedOnce(paletteOpen)
  const shortcutsLoaded = useOpenedOnce(shortcutsOpen)
  const installLoaded = useOpenedOnce(installOpen)

  useRouteChangeEffects(mainRef)
  useGlobalShortcuts({
    onPalette: () => setPaletteOpen((open) => !open),
    onHelp: () => setShortcutsOpen(true),
    onToggleSidebar: () => setSidebarOpen(!sidebarOpen),
    onNavigate: (path) => navigate(path),
  })

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      className="bg-canvas md:h-svh md:overflow-hidden"
    >
      <SkipLink />
      <AppSidebar status={status} />
      <SidebarInset className="max-md:min-h-svh">
        <MobileHeader status={status} />
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="flex min-h-0 flex-1 flex-col outline-none max-md:pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] md:overflow-y-auto"
        >
          <OfflineBanner online={status.online} syncedAt={status.sync.syncedAt} />
          <AuthBanner />
          <CampaignEngine />
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
        <BottomTabBar />
      </SidebarInset>
      <NavDrawer status={status} />
      <Suspense fallback={null}>
        {paletteLoaded && <CommandPalette status={status} />}
        {shortcutsLoaded && <ShortcutsDialog />}
        {installLoaded && <InstallDialog />}
        {UpdatePrompt && <UpdatePrompt />}
        <PwaToasts />
      </Suspense>
    </SidebarProvider>
  )
}
