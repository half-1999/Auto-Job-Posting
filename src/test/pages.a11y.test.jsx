import { render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/routes'

const loadMocks = () => import('@/mocks/index.js')

const PAGES = [
  ['/', 'Dashboard'],
  ['/applications', 'Applications'],
  ['/campaigns', 'Campaigns'],
  ['/campaigns/new', 'New campaign'],
  ['/templates', 'Templates'],
  ['/history', 'Email History'],
  ['/reports', 'Reports'],
  ['/sheets', 'Google Sheets'],
  ['/sheets/setup', 'Set up a sheet'],
  ['/settings', 'Settings'],
  ['/welcome', 'Email recruiters from your job sheet, carefully.'],
]

// jsdom has no layout or computed colors, so contrast is checked by the token test instead.
const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

async function renderPage(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AppProviders workspace={{ source: 'mock', loadMocks }}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

function formatViolations(violations) {
  return violations.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`).join('\n')
}

afterEach(() => {
  document.documentElement.classList.remove('dark')
  sessionStorage.clear()
})

describe.each(['light', 'dark'])('pages pass axe in the %s theme (mock data)', (theme) => {
  it.each(PAGES)('%s', async (path, heading) => {
    if (theme === 'dark') document.documentElement.classList.add('dark')
    await renderPage(path)
    await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 15000 })
    // Let lazy chunks and mock data settle before scanning.
    await new Promise((resolve) => setTimeout(resolve, 50))

    const results = await axe.run(document.body, AXE_OPTIONS)
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  }, 30000)
})
