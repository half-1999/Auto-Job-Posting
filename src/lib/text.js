/** Up to two uppercase initials from a name, falling back to the email's local part. */
export function initials(name, email) {
  const source = (name || email?.split('@')[0] || '').trim()
  if (!source) return ''
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}
