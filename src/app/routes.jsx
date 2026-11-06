import { lazy, Suspense } from 'react'
import { NeedsDataOutlet } from '@/components/global/NeedsDataOutlet'
import { AppShell } from '@/components/layout/AppShell'
import { RouteFallback } from '@/components/layout/RouteFallback'

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const ApplicationsPage = lazy(() => import('@/features/applications/ApplicationsPage'))
const CampaignsPage = lazy(() => import('@/features/campaigns/CampaignsPage'))
const ComposerPage = lazy(() => import('@/features/campaigns/ComposerPage'))
const CampaignDetailPage = lazy(() => import('@/features/campaigns/CampaignDetailPage'))
const TemplatesPage = lazy(() => import('@/features/templates/TemplatesPage'))
const HistoryPage = lazy(() => import('@/features/history/HistoryPage'))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'))
const SheetsPage = lazy(() => import('@/features/sheets/SheetsPage'))
const SheetSetupPage = lazy(() => import('@/features/sheets/SheetSetupPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const WelcomePage = lazy(() => import('@/features/welcome/WelcomePage'))
const NotFoundPage = lazy(() => import('@/features/not-found/NotFoundPage'))
const RouteErrorPage = lazy(() =>
  import('@/features/error/RouteErrorPage').then((m) => ({ default: m.RouteErrorPage })),
)
const DesignSystemPage = import.meta.env.DEV
  ? lazy(() => import('@/features/design-system/DesignSystemPage'))
  : null

const standalone = (path, Page) => ({
  path,
  element: (
    <Suspense fallback={<RouteFallback />}>
      <Page />
    </Suspense>
  ),
})

function RouteError() {
  return (
    <Suspense fallback={<p className="p-6 text-center text-sm">Something went wrong.</p>}>
      <RouteErrorPage />
    </Suspense>
  )
}

const shellPages = [
  {
    element: <NeedsDataOutlet />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'applications', element: <ApplicationsPage /> },
      { path: 'applications/:id', element: <ApplicationsPage /> },
      { path: 'campaigns', element: <CampaignsPage /> },
      { path: 'campaigns/new', element: <ComposerPage /> },
      { path: 'campaigns/:id', element: <CampaignDetailPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'sheets', element: <SheetsPage /> },
      { path: 'sheets/setup', element: <SheetSetupPage /> },
    ],
  },
  { path: 'templates', element: <TemplatesPage /> },
  { path: 'templates/:id', element: <TemplatesPage /> },
  { path: 'settings', element: <SettingsPage /> },
  { path: 'settings/:section', element: <SettingsPage /> },
  { path: '*', element: <NotFoundPage /> },
]

export const routes = [
  {
    errorElement: <RouteError />,
    children: [
      ...(DesignSystemPage ? [standalone('/_design', DesignSystemPage)] : []),
      standalone('/welcome', WelcomePage),
      {
        element: <AppShell />,
        children: [{ errorElement: <RouteError />, children: shellPages }],
      },
    ],
  },
]
