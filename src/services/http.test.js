import { afterEach, describe, expect, it, vi } from 'vitest'
import { backoffDelay, googleFetch, onUnauthorized, toGoogleApiError } from './http'
import { clearToken, setToken } from './tokenStore'

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) }
}

afterEach(() => clearToken())

describe('googleFetch', () => {
  it('sends every request with no-store, no cookies, and the bearer token', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(200, { ok: true })))
    setToken({ accessToken: 'ya29.memory-only', expiresAt: Date.now() + 60_000 })

    await googleFetch('https://sheets.googleapis.com/v4/spreadsheets/x', { fetchImpl })
    await googleFetch('https://gmail.googleapis.com/x', {
      method: 'POST',
      body: { raw: 'abc' },
      fetchImpl,
    })
    await googleFetch('https://openidconnect.googleapis.com/v1/userinfo', {
      token: 'ya29.explicit',
      fetchImpl,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(3)
    for (const [, init] of fetchImpl.mock.calls) {
      expect(init.cache).toBe('no-store')
      expect(init.credentials).toBe('omit')
      expect(init.headers.Authorization).toMatch(/^Bearer ya29\./)
    }
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({
      body: '{"raw":"abc"}',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(fetchImpl.mock.calls[2][1].headers.Authorization).toBe('Bearer ya29.explicit')
  })

  it('refuses to call Google without a live token and reports it as an expired session', async () => {
    const handler = vi.fn()
    const off = onUnauthorized(handler)
    const fetchImpl = vi.fn()
    setToken({ accessToken: 'ya29.old', expiresAt: Date.now() - 1 })

    await expect(
      googleFetch('https://sheets.googleapis.com/x', { fetchImpl }),
    ).rejects.toMatchObject({ code: 'unauthorized' })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(handler).toHaveBeenCalledOnce()
    off()
  })

  it('calls the unauthorized handler on a 401 and does not retry', async () => {
    const handler = vi.fn()
    const off = onUnauthorized(handler)
    const fetchImpl = vi.fn(() =>
      Promise.resolve(jsonResponse(401, { error: { code: 401, message: 'Invalid Credentials' } })),
    )

    await expect(
      googleFetch('https://sheets.googleapis.com/x', { token: 't', fetchImpl }),
    ).rejects.toMatchObject({
      status: 401,
      userMessage: 'Your Google session expired. Reconnect to continue.',
    })
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledOnce()
    off()
  })

  it('retries rate limits and server errors on reads with backoff, then succeeds', async () => {
    const sleep = vi.fn(() => Promise.resolve())
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, { error: { message: 'Too many' } }))
      .mockResolvedValueOnce(jsonResponse(503, { error: { message: 'Unavailable' } }))
      .mockResolvedValueOnce(jsonResponse(200, { values: [] }))

    await expect(
      googleFetch('https://sheets.googleapis.com/x', { token: 't', fetchImpl, sleep }),
    ).resolves.toEqual({ values: [] })
    expect(sleep).toHaveBeenCalledTimes(2)
  })

  it('never retries a write on its own', async () => {
    const sleep = vi.fn()
    const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(503, {})))
    await expect(
      googleFetch('https://gmail.googleapis.com/x', {
        method: 'POST',
        body: {},
        token: 't',
        fetchImpl,
        sleep,
      }),
    ).rejects.toMatchObject({
      code: 'server',
      retryable: true,
    })
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(sleep).not.toHaveBeenCalled()
  })

  it('reports a network failure as offline', async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    await expect(
      googleFetch('https://sheets.googleapis.com/x', { token: 't', fetchImpl, retries: 0 }),
    ).rejects.toMatchObject({
      status: 0,
      code: 'network',
      userMessage: 'You appear to be offline.',
    })
  })
})

describe('toGoogleApiError', () => {
  it.each([
    [
      403,
      { error: { errors: [{ reason: 'insufficientPermissions' }] } },
      'insufficient_scope',
      false,
    ],
    [
      403,
      {
        error: {
          message: 'Request had insufficient authentication scopes.',
          status: 'PERMISSION_DENIED',
        },
      },
      'insufficient_scope',
      false,
    ],
    [403, { error: { errors: [{ reason: 'userRateLimitExceeded' }] } }, 'rate_limited', true],
    [
      403,
      { error: { status: 'PERMISSION_DENIED', message: 'The caller does not have permission' } },
      'forbidden',
      false,
    ],
    [404, null, 'not_found', false],
    [400, { error: { message: 'Unable to parse range' } }, 'bad_request', false],
    [500, null, 'server', true],
  ])('%i maps to %s', (status, payload, code, retryable) => {
    expect(toGoogleApiError(status, payload)).toMatchObject({ code, retryable })
  })

  it('backs off 2, 4, then 8 seconds plus jitter', () => {
    expect([0, 1, 2].map((attempt) => backoffDelay(attempt, () => 0))).toEqual([2000, 4000, 8000])
    expect(backoffDelay(0, () => 0.999)).toBe(2999)
  })
})
