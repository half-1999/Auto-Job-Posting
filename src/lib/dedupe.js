/** Record dedupe at sync time (docs/DATABASE_SCHEMA.md §3.1). */

const TRACKING_PARAM = /^(utm_.*|ref|trk)$/i

/** Trim, lower-case, collapse whitespace, strip trailing punctuation. */
export function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\s.,;:!?]+$/, '')
}

/** Host lower-cased; protocol, `www.`, trailing slash, tracking params, and hash dropped. */
export function normalizeUrl(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  let url
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return normalizeText(raw)
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const params = [...url.searchParams.entries()].filter(([key]) => !TRACKING_PARAM.test(key))
  const query = params.length ? `?${new URLSearchParams(params).toString()}` : ''
  const path = url.pathname.replace(/\/+$/, '')
  return `${host}${url.port ? `:${url.port}` : ''}${path}${query}`
}

export function dedupeKey({ recruiterEmail, companyName, jobLink, jobTitle }) {
  return [
    normalizeText(recruiterEmail),
    normalizeText(companyName),
    normalizeUrl(jobLink) || normalizeText(jobTitle),
  ].join('|')
}
