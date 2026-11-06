import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceProvider } from '@/context/WorkspaceContext'
import { BASE_SCOPES, GOOGLE_SCOPES, STORAGE_KEYS } from '@/lib/constants'
import { googleFetch } from '@/services/http'
import { getAccessToken } from '@/services/tokenStore'
import { AuthProvider } from './AuthContext'
import { useAuth } from './app-contexts'

const TOKEN = 'ya29.a0-test-access-token'

/** Minimal stand-in for google.accounts.oauth2 (documented token-model surface only). */
function installFakeGis({ scope = BASE_SCOPES.join(' '), error = null } = {}) {
  const calls = { init: [], request: [], revoke: [] }
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: (config) => {
          calls.init.push(config)
          return {
            requestAccessToken: (overrides) => {
              calls.request.push(overrides)
              if (error) config.error_callback({ type: error })
              else config.callback({ access_token: TOKEN, expires_in: 3599, scope, token_type: 'Bearer' })
            },
          }
        },
        revoke: (token, done) => {
          calls.revoke.push(token)
          done()
        },
      },
    },
  }
  return calls
}

function Probe() {
  const auth = useAuth()
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="email">{auth.user?.email ?? ''}</p>
      <p data-testid="missing">{auth.missing.join(',')}</p>
      <button onClick={() => auth.connect()}>connect</button>
      <button onClick={() => auth.disconnect()}>disconnect</button>
      <button onClick={() => auth.disconnect({ forget: true })}>forget</button>
    </div>
  )
}

function renderAuth(props = {}) {
  return render(
    <WorkspaceProvider source="none">
      <AuthProvider clientId="test-client.apps.googleusercontent.com" {...props}>
        <Probe />
      </AuthProvider>
    </WorkspaceProvider>,
  )
}

function storageDump() {
  return [localStorage, sessionStorage].flatMap((store) => Object.keys(store).map((key) => `${key}=${store.getItem(key)}`)).join('\n')
}

let fetchMock
beforeEach(() => {
  fetchMock = vi.fn((url) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(url.includes('userinfo') ? { sub: '1', email: 'ananya@gmail.com', email_verified: true, name: 'Ananya Rao' } : {}),
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(async () => {
  delete window.google
  vi.unstubAllGlobals()
  const { clearToken } = await import('@/services/tokenStore')
  clearToken()
})

describe('AuthProvider', () => {
  it('connects, shows the Gmail address, and keeps the token for this tab only (AC-1)', async () => {
    const user = userEvent.setup()
    const gis = installFakeGis()
    renderAuth()

    await user.click(screen.getByRole('button', { name: 'connect' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('connected'))
    expect(screen.getByTestId('email')).toHaveTextContent('ananya@gmail.com')

    expect(gis.init[0]).toMatchObject({ client_id: 'test-client.apps.googleusercontent.com', include_granted_scopes: true, scope: BASE_SCOPES.join(' ') })
    expect(gis.request[0].prompt).toBe('consent')
    expect(fetchMock).toHaveBeenCalledWith('https://openidconnect.googleapis.com/v1/userinfo', expect.objectContaining({ cache: 'no-store' }))

    expect(getAccessToken()).toBe(TOKEN)
    expect(localStorage.getItem(STORAGE_KEYS.authHint) ?? '').not.toContain('ya29.')
    expect(sessionStorage.getItem(STORAGE_KEYS.authSession)).toContain(TOKEN)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.authHint))).toMatchObject({ data: { email: 'ananya@gmail.com' } })
  })

  it('stays connected after a refresh while the Google token is still valid', () => {
    sessionStorage.setItem(
      STORAGE_KEYS.authSession,
      JSON.stringify({
        accessToken: TOKEN,
        expiresAt: Date.now() + 3_600_000,
        user: { email: 'ananya@gmail.com', name: 'Ananya Rao' },
        missing: [],
        hasMetadata: false,
      }),
    )
    renderAuth()
    expect(screen.getByTestId('status')).toHaveTextContent('connected')
    expect(screen.getByTestId('email')).toHaveTextContent('ananya@gmail.com')
    expect(getAccessToken()).toBe(TOKEN)
  })

  it('drops an expired saved session instead of restoring it', () => {
    sessionStorage.setItem(
      STORAGE_KEYS.authSession,
      JSON.stringify({
        accessToken: TOKEN,
        expiresAt: Date.now() - 1_000,
        user: { email: 'ananya@gmail.com', name: 'Ananya Rao' },
        missing: [],
        hasMetadata: false,
      }),
    )
    renderAuth()
    expect(screen.getByTestId('status')).toHaveTextContent('disconnected')
    expect(getAccessToken()).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEYS.authSession)).toBeNull()
  })

  it('reconnects with login_hint and no forced consent for a returning user', async () => {
    const user = userEvent.setup()
    localStorage.setItem(STORAGE_KEYS.authHint, JSON.stringify({ version: 1, data: { email: 'ananya@gmail.com' } }))
    const gis = installFakeGis()
    renderAuth()

    await user.click(screen.getByRole('button', { name: 'connect' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('connected'))
    expect(gis.request[0]).toMatchObject({ prompt: '', login_hint: 'ananya@gmail.com' })
  })

  it('turns a 401 from any API call into an expired session without losing the account (AC-2)', async () => {
    const user = userEvent.setup()
    installFakeGis()
    renderAuth()
    await user.click(screen.getByRole('button', { name: 'connect' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('connected'))

    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({ error: { code: 401 } }) })
    await act(() => expect(googleFetch('https://sheets.googleapis.com/v4/spreadsheets/abc')).rejects.toMatchObject({ status: 401 }))

    expect(screen.getByTestId('status')).toHaveTextContent('expired')
    expect(screen.getByTestId('email')).toHaveTextContent('ananya@gmail.com')
    expect(getAccessToken()).toBeNull()
  })

  it('reports unticked permissions as partial', async () => {
    const user = userEvent.setup()
    installFakeGis({ scope: `openid email profile ${GOOGLE_SCOPES.sheets}` })
    renderAuth()
    await user.click(screen.getByRole('button', { name: 'connect' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('partial'))
    expect(screen.getByTestId('missing')).toHaveTextContent(GOOGLE_SCOPES.gmailSend)
  })

  it('returns to disconnected when the popup is closed, with no token kept', async () => {
    const user = userEvent.setup()
    installFakeGis({ error: 'popup_closed' })
    renderAuth()
    await user.click(screen.getByRole('button', { name: 'connect' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('disconnected'))
    expect(getAccessToken()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.authHint)).toBeNull()
  })

  it('revokes on disconnect, and forgets the hint only when asked', async () => {
    const user = userEvent.setup()
    const gis = installFakeGis()
    renderAuth()
    await user.click(screen.getByRole('button', { name: 'connect' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('connected'))

    await user.click(screen.getByRole('button', { name: 'disconnect' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('disconnected'))
    expect(gis.revoke).toEqual([TOKEN])
    expect(getAccessToken()).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEYS.authSession)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.authHint)).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'forget' }))
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEYS.authHint)).toBeNull())
    expect(storageDump()).not.toContain('ya29.')
  })

  it('never contacts Google in mock mode or without a Client ID', async () => {
    const user = userEvent.setup()
    const gis = installFakeGis()
    renderAuth({ clientId: '' })
    await user.click(screen.getByRole('button', { name: 'connect' }))
    expect(gis.init).toHaveLength(0)
    expect(screen.getByTestId('status')).toHaveTextContent('disconnected')
  })
})
