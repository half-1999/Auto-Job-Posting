import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/routes'

function renderApp(path = '/', providerProps = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AppProviders {...providerProps}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

describe('AppShell', () => {
  it('renders the page heading, title, and marks the active nav item', async () => {
    renderApp('/applications')

    expect(await screen.findByRole('heading', { level: 1, name: 'Applications' }, { timeout: 5000 })).toBeInTheDocument()
    expect(document.title).toBe('Applications · JobApply')
    // The sidebar and the phone tab bar both render; CSS hides one per breakpoint.
    const links = screen.getAllByRole('link', { name: 'Applications', current: 'page' })
    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => expect(link).toHaveAttribute('href', '/applications'))
  })

  it('shows honest connection state instead of a simulated connection', async () => {
    renderApp('/')
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })

    expect(screen.getAllByText('Not connected').length).toBeGreaterThan(0)
    expect(screen.getByText('No sheet connected')).toBeInTheDocument()
  })

  it('opens the command palette with Ctrl+K and navigates from it', async () => {
    const user = userEvent.setup()
    const router = renderApp('/')
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })

    await user.keyboard('{Control>}k{/Control}')
    const input = await screen.findByPlaceholderText('Search pages, applications, templates')
    await user.type(input, 'templates')
    await user.keyboard('{Enter}')

    await waitFor(() => expect(router.state.location.pathname).toBe('/templates'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Templates' }, { timeout: 5000 })).toBeInTheDocument()
  })

  it('navigates with the G then key sequence', async () => {
    const user = userEvent.setup()
    const router = renderApp('/')
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })

    await user.keyboard('gh')
    await waitFor(() => expect(router.state.location.pathname).toBe('/history'))
  })

  it('shows the Offline screen for data pages with nothing saved, and keeps Templates usable', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    try {
      const router = renderApp('/history')
      expect(await screen.findByRole('heading', { level: 1, name: 'Email History' }, { timeout: 5000 })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: "You're offline" })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()

      await act(() => router.navigate('/templates'))
      expect(await screen.findByRole('heading', { level: 1, name: 'Templates' }, { timeout: 5000 })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: "You're offline" })).not.toBeInTheDocument()
    } finally {
      onLine.mockRestore()
    }
  })

  it('AC-18: after a sync, opens offline on the saved copy and disables Google actions with a reason', async () => {
    const store = (key, data) => localStorage.setItem(key, JSON.stringify({ version: 1, data }))
    const syncedAt = '2026-11-04T09:30:00.000Z'
    store('jaas.sheetConfig', {
      spreadsheetId: 'sheet-1',
      spreadsheetTitle: 'Job Hunt',
      tabName: 'Applications',
      sheetId: 0,
      headers: ['Company', 'HR Email', 'Role', 'Application ID'],
      columnMap: { companyName: 'Company', recruiterEmail: 'HR Email', jobTitle: 'Role', id: 'Application ID' },
    })
    store('jaas.snapshot', {
      syncedAt,
      spreadsheetId: 'sheet-1',
      tabName: 'Applications',
      summary: { total: 1, imported: 1, skipped: 0, invalid: 0 },
      rows: [{ id: 'id-1', rowNumber: 2, companyName: 'Acme Robotics', recruiterEmail: 'priya@acme.com', jobTitle: 'Engineer', emailStatus: 'Not Sent', applicationStatus: 'Not Applied' }],
    })
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    try {
      const router = renderApp('/sheets')
      expect(await screen.findByRole('heading', { level: 1, name: 'Google Sheets' }, { timeout: 5000 })).toBeInTheDocument()
      expect(screen.getAllByText(/Offline · last synced/).length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: /Sync now/ })).toBeDisabled()

      await act(() => router.navigate('/applications'))
      expect((await screen.findAllByText('Acme Robotics', {}, { timeout: 5000 })).length).toBeGreaterThan(0)
      expect(screen.queryByRole('heading', { name: "You're offline" })).not.toBeInTheDocument()
    } finally {
      onLine.mockRestore()
    }
  })

  it('offers one-click Reconnect when the tab has no live Google session', async () => {
    localStorage.setItem('jaas.auth.hint', JSON.stringify({ version: 1, data: { email: 'ananya@gmail.com' } }))
    const loadAuthService = vi.fn(() => Promise.resolve({ loadGis: () => Promise.resolve(), onUnauthorized: () => {}, expireSession: () => {} }))
    renderApp('/', { auth: { clientId: 'test-client', loadAuthService } })
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })

    expect(screen.getByText('Reconnect ananya@gmail.com to sync and send.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeEnabled()
    await waitFor(() => expect(loadAuthService).toHaveBeenCalled())
  })

  it('shows the not-found page for unknown paths', async () => {
    renderApp('/does-not-exist')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })
})
