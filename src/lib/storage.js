import { STORAGE_PREFIX, STORAGE_VERSION } from './constants'

export class StorageError extends Error {
  constructor(reason, cause) {
    super(reason === 'quota' ? 'Browser storage is full.' : 'Browser storage is unavailable.')
    this.name = 'StorageError'
    this.reason = reason
    this.cause = cause
  }
}

function getStore() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isQuotaError(error) {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}

/**
 * Returns the stored data for `key`, or `fallback` when the key is missing,
 * unparseable, or written by a different schema version.
 */
export function readStorage(key, fallback = null) {
  const store = getStore()
  if (!store) return fallback

  const raw = store.getItem(key)
  if (raw === null) return fallback

  try {
    const parsed = JSON.parse(raw)
    if (parsed?.version !== STORAGE_VERSION || !('data' in parsed)) return fallback
    return parsed.data
  } catch {
    store.removeItem(key)
    return fallback
  }
}

/** Throws `StorageError` with reason `quota` or `unavailable`. */
export function writeStorage(key, data) {
  const store = getStore()
  if (!store) throw new StorageError('unavailable')

  try {
    store.setItem(key, JSON.stringify({ version: STORAGE_VERSION, data }))
  } catch (error) {
    throw new StorageError(isQuotaError(error) ? 'quota' : 'unavailable', error)
  }
}

export function removeStorage(key) {
  getStore()?.removeItem(key)
}

/** Removes every key owned by this app. Other sites' and libraries' keys are untouched. */
export function clearAppStorage() {
  const store = getStore()
  if (!store) return
  Object.keys(store)
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .forEach((key) => store.removeItem(key))
}
