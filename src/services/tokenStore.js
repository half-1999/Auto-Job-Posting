/**
 * The OAuth access token stays in this module and in sessionStorage for this tab only.
 * A refresh restores it until Google expires it (about an hour). Closing the tab drops it.
 * It is never written to localStorage, IndexedDB, Cache Storage, React state, or the service worker.
 */
import { STORAGE_KEYS } from '@/lib/constants'

let current = null

function storage() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function readStored() {
  const store = storage()
  if (!store) return null
  const raw = store.getItem(STORAGE_KEYS.authSession)
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    if (typeof data?.accessToken !== 'string' || typeof data?.expiresAt !== 'number') return null
    const email = data.user?.email
    return {
      accessToken: data.accessToken,
      expiresAt: data.expiresAt,
      user: typeof email === 'string' ? { email, name: data.user.name ?? null } : null,
      missing: Array.isArray(data.missing) ? data.missing.filter((scope) => typeof scope === 'string') : [],
      hasMetadata: Boolean(data.hasMetadata),
    }
  } catch {
    store.removeItem(STORAGE_KEYS.authSession)
    return null
  }
}

function writeStored(session) {
  try {
    storage()?.setItem(STORAGE_KEYS.authSession, JSON.stringify(session))
  } catch {
    // Private mode or a full quota: the token still works until this page closes.
  }
}

/** Load a still-valid session saved by this tab. Drops it once Google's expiry has passed. */
export function hydrateSession(now = Date.now()) {
  const stored = readStored()
  if (stored && now < stored.expiresAt) {
    current = stored
    return stored
  }
  if (stored || (current && now >= current.expiresAt)) clearToken()
  return current && now < current.expiresAt ? current : null
}

export function setToken(token) {
  const previous = current?.accessToken === token.accessToken ? current : null
  current = {
    accessToken: token.accessToken,
    expiresAt: token.expiresAt,
    user: token.user ?? previous?.user ?? null,
    missing: token.missing ?? previous?.missing ?? [],
    hasMetadata: token.hasMetadata ?? previous?.hasMetadata ?? false,
  }
  writeStored(current)
}

export function clearToken() {
  current = null
  try {
    storage()?.removeItem(STORAGE_KEYS.authSession)
  } catch {
    // Already unreachable.
  }
}

/** The bearer token, or null when there is none or it has expired. */
export function getAccessToken(now = Date.now()) {
  if (!current || now >= current.expiresAt) {
    const restored = hydrateSession(now)
    return restored?.accessToken ?? null
  }
  return current.accessToken
}
