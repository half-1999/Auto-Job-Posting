import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BASE_SCOPES, GOOGLE_SCOPES, STORAGE_KEYS } from '@/lib/constants'
import { readStorage, removeStorage, writeStorage } from '@/lib/storage'
import { clearToken, hydrateSession } from '@/services/tokenStore'
import { AuthContext, useWorkspace } from './app-contexts'
import { authReducer, hasLiveSession, INITIAL_AUTH, sessionStatus } from './authModel'

/**
 * Google connection status for the UI. The access token never enters React state. It stays in
 * services/tokenStore.js and in sessionStorage for this tab, so a refresh stays signed in until
 * Google expires the token. The last connected email is also saved in localStorage as `login_hint`.
 */
const loadService = () => import('@/services/googleAuth')
const TICK_MS = 15000

function readHint() {
  const hint = readStorage(STORAGE_KEYS.authHint, null)
  return typeof hint?.email === 'string' ? hint.email : null
}

function restoredAuth(now = Date.now()) {
  const session = hydrateSession(now)
  if (!session?.user?.email) return { auth: INITIAL_AUTH, hasMetadata: false }
  const missing = session.missing
  return {
    auth: {
      status: missing.length ? 'partial' : sessionStatus(session.expiresAt, now),
      user: session.user,
      expiresAt: session.expiresAt,
      missing,
      error: null,
    },
    hasMetadata: session.hasMetadata,
  }
}

export function AuthProvider({
  children,
  clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  loadAuthService = loadService,
}) {
  const { isMock, online } = useWorkspace()
  const [boot] = useState(restoredAuth)
  const [state, dispatch] = useReducer(authReducer, boot.auth)
  const [hint, setHint] = useState(readHint)
  const [hasMetadata, setHasMetadata] = useState(boot.hasMetadata)
  const busy = useRef(false)
  const live = hasLiveSession(state)

  const disabledReason = isMock
    ? 'Mock mode never contacts Google'
    : !clientId
      ? 'Google sign-in is not configured for this build'
      : !online
        ? 'Needs a connection'
        : null

  const service = useCallback(async () => {
    const mod = await loadAuthService()
    mod.onUnauthorized?.(() => {
      mod.expireSession()
      dispatch({ type: 'unauthorized' })
    })
    return mod
  }, [loadAuthService])

  const prepare = useCallback(() => {
    if (disabledReason) return
    service()
      .then((mod) => mod.loadGis())
      .catch(() => {})
  }, [disabledReason, service])

  // Returning users get the GIS script early, so Reconnect opens the popup within the click.
  useEffect(() => {
    if (hint) prepare()
  }, [hint, prepare])

  useEffect(() => {
    if (!live) return undefined
    const tick = () => dispatch({ type: 'tick', now: Date.now() })
    const onVisible = () => document.visibilityState === 'visible' && tick()
    const id = setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [live])

  const connect = useCallback(
    async ({ grant = false, metadata = false } = {}) => {
      if (disabledReason || busy.current) return false
      busy.current = true
      dispatch({ type: 'request' })
      try {
        const mod = await service()
        const result = await mod.signIn({
          clientId,
          hint,
          prompt: grant || metadata || !hint ? 'consent' : '',
          scopes: metadata ? [...BASE_SCOPES, GOOGLE_SCOPES.gmailMetadata] : undefined,
        })
        writeStorage(STORAGE_KEYS.authHint, { email: result.user.email })
        setHint(result.user.email)
        setHasMetadata(Boolean(result.hasMetadata))
        dispatch({ type: 'granted', ...result, now: Date.now() })
        return true
      } catch (error) {
        const message = error?.userMessage ?? 'Google sign-in failed. Try again.'
        dispatch({ type: 'failed', error: message, now: Date.now() })
        if (error?.code !== 'popup_closed') toast.error(message)
        return false
      } finally {
        busy.current = false
      }
    },
    [disabledReason, service, clientId, hint],
  )

  const disconnect = useCallback(
    async ({ forget = false } = {}) => {
      try {
        const mod = await service()
        await mod.signOut()
      } catch {
        // Revocation is best effort. The saved session is dropped either way.
        clearToken()
      }
      dispatch({ type: 'signed-out' })
      setHasMetadata(false)
      if (forget) {
        removeStorage(STORAGE_KEYS.authHint)
        setHint(null)
      }
    },
    [service],
  )

  const value = useMemo(
    () => ({
      ...state,
      hint,
      hasMetadata,
      live,
      configured: Boolean(clientId),
      disabledReason,
      prepare,
      connect,
      grantMissing: () => connect({ grant: true }),
      disconnect,
    }),
    [state, hint, hasMetadata, live, clientId, disabledReason, prepare, connect, disconnect],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
