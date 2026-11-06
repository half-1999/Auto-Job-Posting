import { ThemeProvider } from 'next-themes'
import { ShellProvider } from '@/app/ShellContext'
import { ThemeColorSync } from '@/components/common/ThemeSwitcher'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import { NotificationProvider } from '@/context/NotificationContext'
import { SettingsProvider } from '@/context/SettingsContext'
import { WorkspaceProvider } from '@/context/WorkspaceContext'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { STORAGE_KEYS } from '@/lib/constants'

function ResponsiveToaster() {
  const isDesktop = useMediaQuery(MEDIA.md)

  return (
    <Toaster
      position={isDesktop ? 'bottom-right' : 'top-center'}
      visibleToasts={3}
      offset={isDesktop ? 16 : { top: 'calc(var(--header-h) + env(safe-area-inset-top) + 8px)' }}
      mobileOffset={{ top: 'calc(var(--header-h) + env(safe-area-inset-top) + 8px)' }}
    />
  )
}

export function AppProviders({ children, workspace, auth }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={STORAGE_KEYS.theme}
    >
      <ThemeColorSync />
      <TooltipProvider delayDuration={400} skipDelayDuration={200}>
        <WorkspaceProvider {...workspace}>
          <AuthProvider {...auth}>
            <SettingsProvider>
              <NotificationProvider>
                <ShellProvider>{children}</ShellProvider>
              </NotificationProvider>
            </SettingsProvider>
          </AuthProvider>
        </WorkspaceProvider>
        <ResponsiveToaster />
      </TooltipProvider>
    </ThemeProvider>
  )
}
