import { describe, expect, it } from 'vitest'
import { authReducer, EXPIRING_MS, INITIAL_AUTH, minutesLeft, sessionStatus } from './authModel'

const HOUR = 3600 * 1000
const user = { email: 'ananya@gmail.com', name: 'Ananya' }

function connectedAt(now) {
  return authReducer(authReducer(INITIAL_AUTH, { type: 'request' }), { type: 'granted', user, expiresAt: now + HOUR, missing: [], now })
}

describe('session lifecycle', () => {
  it('goes from requesting to connected, then expiring at T minus 5 minutes, then expired', () => {
    const start = 1_000_000
    let state = connectedAt(start)
    expect(state).toMatchObject({ status: 'connected', user, error: null })
    expect(state.previous).toBeUndefined()

    state = authReducer(state, { type: 'tick', now: start + HOUR - EXPIRING_MS - 1 })
    expect(state.status).toBe('connected')
    state = authReducer(state, { type: 'tick', now: start + HOUR - EXPIRING_MS })
    expect(state.status).toBe('expiring')
    expect(minutesLeft(state.expiresAt, start + HOUR - EXPIRING_MS)).toBe(5)
    state = authReducer(state, { type: 'tick', now: start + HOUR })
    expect(state).toMatchObject({ status: 'expired', user })
  })

  it('marks a live session expired on a 401 and keeps the user for Reconnect', () => {
    const state = authReducer(connectedAt(0), { type: 'unauthorized' })
    expect(state).toMatchObject({ status: 'expired', user })
    expect(authReducer(INITIAL_AUTH, { type: 'unauthorized' })).toBe(INITIAL_AUTH)
  })

  it('flags unticked permissions as partial until they are granted', () => {
    const partial = authReducer(INITIAL_AUTH, { type: 'granted', user, expiresAt: HOUR, missing: ['https://www.googleapis.com/auth/gmail.send'], now: 0 })
    expect(partial.status).toBe('partial')
    expect(authReducer(partial, { type: 'tick', now: 1000 }).status).toBe('partial')
    expect(authReducer(partial, { type: 'tick', now: HOUR }).status).toBe('expired')
  })

  it('keeps an existing session when a reconnect popup is cancelled', () => {
    const live = connectedAt(0)
    const retry = authReducer(live, { type: 'request' })
    expect(authReducer(retry, { type: 'failed', error: 'Sign-in was cancelled.', now: 1000 })).toMatchObject({ status: 'connected', error: 'Sign-in was cancelled.' })
    expect(authReducer(authReducer(INITIAL_AUTH, { type: 'request' }), { type: 'failed', error: 'x', now: 0 }).status).toBe('disconnected')
    // A 401 before the clock runs out still needs Reconnect after a cancelled popup.
    const expired = authReducer(live, { type: 'unauthorized' })
    expect(authReducer(authReducer(expired, { type: 'request' }), { type: 'failed', error: 'x', now: 1000 }).status).toBe('expired')
  })

  it('signs out to the initial state', () => {
    expect(authReducer(connectedAt(0), { type: 'signed-out' })).toBe(INITIAL_AUTH)
  })

  it('computes status from expiry alone', () => {
    expect(sessionStatus(null, 0)).toBe('expired')
    expect(sessionStatus(HOUR, 0)).toBe('connected')
    expect(sessionStatus(HOUR, HOUR - 1000)).toBe('expiring')
  })
})
