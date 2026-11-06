import { BASE_SCOPES, GOOGLE_SCOPES } from '@/lib/constants'
import { googleFetch } from './http'
import { clearToken, getAccessToken, setToken } from './tokenStore'

export { onUnauthorized } from './http'

/**
 * Google Identity Services token model (API_INTEGRATION §3). The GIS script is loaded from Google
 * on demand and is never precached. Only this module and tokenStore ever see the access token.
 * The token is also kept in sessionStorage so a refresh of this tab stays signed in.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

/** Sending and syncing need both of these; the identity scopes are never refused separately. */
export const REQUIRED_GRANTS = [GOOGLE_SCOPES.sheets, GOOGLE_SCOPES.gmailSend]

const ERROR_MESSAGES = {
  popup_closed: 'Sign-in was cancelled.',
  popup_failed_to_open:
    'Your browser blocked the Google popup. Allow popups for this site, then try again.',
  access_denied: 'Permission was not granted.',
  gis_load_failed: "Couldn't reach Google. Check your connection, then try again.",
  not_configured: 'Google sign-in is not configured for this build.',
}

export class AuthError extends Error {
  constructor(code, detail) {
    super(detail ?? code)
    this.name = 'AuthError'
    this.code = code
    this.userMessage = ERROR_MESSAGES[code] ?? 'Google sign-in failed. Try again.'
  }
}

export function missingGrants(scopeString) {
  const granted = new Set(
    String(scopeString ?? '')
      .split(/\s+/)
      .filter(Boolean),
  )
  return REQUIRED_GRANTS.filter((scope) => !granted.has(scope))
}

let gisPromise = null

export function loadGis(doc = document, win = window) {
  if (win.google?.accounts?.oauth2) return Promise.resolve(win.google)
  gisPromise ??= new Promise((resolve, reject) => {
    const script = doc.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () =>
      win.google?.accounts?.oauth2 ? resolve(win.google) : reject(new AuthError('gis_load_failed'))
    script.onerror = () => {
      gisPromise = null
      script.remove()
      reject(new AuthError('gis_load_failed'))
    }
    doc.head.append(script)
  })
  return gisPromise
}

function requestToken(google, { clientId, scopes, prompt, hint }) {
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes.join(' '),
      include_granted_scopes: true,
      login_hint: hint || undefined,
      callback: (response) =>
        response.error
          ? reject(new AuthError(response.error, response.error_description))
          : resolve(response),
      error_callback: (error) => reject(new AuthError(error?.type ?? 'unknown')),
    })
    client.requestAccessToken({ prompt, login_hint: hint || undefined })
  })
}

/**
 * Opens the Google popup. Must start from a click: GIS needs the user gesture to open it.
 * Resolves with the profile, expiry, and any required permission the user left unticked.
 */
export async function signIn({
  clientId,
  prompt = '',
  hint,
  scopes = BASE_SCOPES,
  now = () => Date.now(),
}) {
  if (!clientId) throw new AuthError('not_configured')
  const google = await loadGis()
  const response = await requestToken(google, { clientId, scopes, prompt, hint })
  const expiresAt = now() + Number(response.expires_in) * 1000
  const profile = await googleFetch(USERINFO_URL, { token: response.access_token })
  const scope = String(response.scope ?? '')
  const session = {
    accessToken: response.access_token,
    expiresAt,
    user: { email: profile.email, name: profile.name ?? null },
    missing: missingGrants(scope),
    hasMetadata: scope.includes(GOOGLE_SCOPES.gmailMetadata),
  }
  setToken(session)
  return {
    user: session.user,
    expiresAt,
    missing: session.missing,
    hasMetadata: session.hasMetadata,
  }
}

/** Revokes the grant at Google (when reachable) and always drops the saved session. */
export async function signOut() {
  const token = getAccessToken()
  clearToken()
  if (!token || !window.google?.accounts?.oauth2) return
  await new Promise((resolve) => window.google.accounts.oauth2.revoke(token, () => resolve()))
}

export function expireSession() {
  clearToken()
}
