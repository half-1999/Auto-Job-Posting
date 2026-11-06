/**
 * Google session state (API_INTEGRATION §4). Pure, so the lifecycle is testable without GIS.
 * Status: disconnected, requesting, connected, partial, expiring, expired.
 */

export const EXPIRING_MS = 5 * 60 * 1000
/** A campaign needs at least this much session left before it starts (TECHNICAL_ARCHITECTURE §7.1). */
export const PREFLIGHT_MS = 10 * 60 * 1000

export const INITIAL_AUTH = {
  status: 'disconnected',
  user: null,
  expiresAt: null,
  missing: [],
  error: null,
}

/** Status for a live session at `now`, from its expiry time alone. */
export function sessionStatus(expiresAt, now) {
  if (!expiresAt || now >= expiresAt) return 'expired'
  return expiresAt - now <= EXPIRING_MS ? 'expiring' : 'connected'
}

export function hasLiveSession(state) {
  return ['connected', 'partial', 'expiring'].includes(state.status)
}

export function authReducer(state, action) {
  switch (action.type) {
    case 'request':
      return { ...state, status: 'requesting', previous: state.status, error: null }
    case 'granted': {
      const status = action.missing.length ? 'partial' : sessionStatus(action.expiresAt, action.now)
      return {
        status,
        user: action.user,
        expiresAt: action.expiresAt,
        missing: action.missing,
        error: null,
      }
    }
    case 'failed': {
      // A cancelled or blocked popup leaves the session as it was before the request.
      const previous = state.previous ?? 'disconnected'
      const status =
        previous === 'connected' || previous === 'expiring'
          ? sessionStatus(state.expiresAt, action.now)
          : previous
      return { ...state, status, previous: undefined, error: action.error }
    }
    case 'tick': {
      if (!['connected', 'expiring', 'partial'].includes(state.status)) return state
      const next = sessionStatus(state.expiresAt, action.now)
      if (state.status === 'partial' && next !== 'expired') return state
      return next === state.status ? state : { ...state, status: next }
    }
    case 'unauthorized':
      return hasLiveSession(state) ? { ...state, status: 'expired' } : state
    case 'signed-out':
      return INITIAL_AUTH
    default:
      return state
  }
}

export function minutesLeft(expiresAt, now) {
  return expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 60000)) : 0
}
