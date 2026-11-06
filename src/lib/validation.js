const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Syntax only (docs/DATABASE_SCHEMA.md §7). A single address; lists are rejected. */
export function isValidEmail(value) {
  if (typeof value !== 'string') return false
  const email = value.trim()
  if (!email || /[,;]/.test(email)) return false
  return EMAIL_PATTERN.test(email)
}

export function isValidUrl(value) {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
