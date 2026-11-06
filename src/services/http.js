import { getAccessToken } from './tokenStore'

/**
 * The one fetch wrapper for every Google API call (API_INTEGRATION §7, §10).
 * Every request uses `cache: 'no-store'`, so neither the HTTP cache nor the service worker keeps
 * a response, and cookies are never sent.
 */

export class GoogleApiError extends Error {
  constructor({ status, code, reason = null, message, userMessage, retryable = false }) {
    super(message ?? userMessage)
    this.name = 'GoogleApiError'
    this.status = status
    this.code = code
    this.reason = reason
    this.userMessage = userMessage
    this.retryable = retryable
  }
}

const RATE_REASONS = new Set(['rateLimitExceeded', 'userRateLimitExceeded'])
const SCOPE_REASONS = new Set(['insufficientPermissions', 'ACCESS_TOKEN_SCOPE_INSUFFICIENT'])

/** Maps a Google error response to a GoogleApiError with a plain-language message. */
export function toGoogleApiError(status, payload) {
  const error = payload?.error ?? {}
  const reason = error.errors?.[0]?.reason ?? error.details?.find?.((d) => d.reason)?.reason ?? null
  const message = typeof error.message === 'string' ? error.message : `HTTP ${status}`
  const base = { status, code: error.status ?? null, reason, message }

  if (status === 401) {
    return new GoogleApiError({
      ...base,
      code: 'unauthorized',
      userMessage: 'Your Google session expired. Reconnect to continue.',
    })
  }
  if (status === 429 || (status === 403 && RATE_REASONS.has(reason))) {
    return new GoogleApiError({
      ...base,
      code: 'rate_limited',
      userMessage: 'Google is rate-limiting requests. Retrying shortly.',
      retryable: true,
    })
  }
  if (
    status === 403 &&
    (SCOPE_REASONS.has(reason) || /insufficient authentication scopes/i.test(message))
  ) {
    return new GoogleApiError({
      ...base,
      code: 'insufficient_scope',
      userMessage: 'This feature needs an extra permission.',
    })
  }
  if (status === 403) {
    return new GoogleApiError({
      ...base,
      code: 'forbidden',
      userMessage: "You don't have access to this item.",
    })
  }
  if (status === 404) {
    return new GoogleApiError({
      ...base,
      code: 'not_found',
      userMessage: 'Not found. Check the link.',
    })
  }
  if (status >= 500) {
    return new GoogleApiError({
      ...base,
      code: 'server',
      userMessage: 'Google service error. Retrying shortly.',
      retryable: true,
    })
  }
  return new GoogleApiError({ ...base, code: 'bad_request', userMessage: message })
}

let unauthorizedHandler = null

/** Registered by AuthContext: a 401 flips the session to expired and shows Reconnect. */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 2 s, 4 s, 8 s, each with up to 1 s of jitter. */
export function backoffDelay(attempt, random = Math.random) {
  return 2000 * 2 ** attempt + Math.floor(random() * 1000)
}

export async function googleFetch(
  url,
  {
    method = 'GET',
    body,
    headers = {},
    token,
    retries = method === 'GET' ? 3 : 0,
    fetchImpl = globalThis.fetch,
    sleep = wait,
  } = {},
) {
  const accessToken = token ?? getAccessToken()
  if (!accessToken) {
    const error = toGoogleApiError(401, null)
    unauthorizedHandler?.(error)
    throw error
  }

  for (let attempt = 0; ; attempt += 1) {
    let response
    try {
      response = await fetchImpl(url, {
        method,
        body:
          body === undefined || typeof body === 'string' || body instanceof Blob
            ? body
            : JSON.stringify(body),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(body !== undefined && typeof body !== 'string' && !(body instanceof Blob)
            ? { 'Content-Type': 'application/json' }
            : {}),
          ...headers,
        },
        cache: 'no-store',
        credentials: 'omit',
      })
    } catch (cause) {
      throw new GoogleApiError({
        status: 0,
        code: 'network',
        message: cause?.message,
        userMessage: 'You appear to be offline.',
        retryable: true,
      })
    }

    if (response.ok) return response.status === 204 ? null : response.json()

    const payload = await response.json().catch(() => null)
    const error = toGoogleApiError(response.status, payload)
    if (error.code === 'unauthorized') unauthorizedHandler?.(error)
    if (!error.retryable || attempt >= retries) throw error
    await sleep(backoffDelay(attempt))
  }
}
