/** Placeholders from PRD FR-4.3. `{{name|fallback}}` uses the fallback when the value is empty. */
export const TEMPLATE_VARIABLES = [
  { key: 'recruiter_name', label: 'Recruiter name', group: 'Application' },
  { key: 'recruiter_first_name', label: 'Recruiter first name', group: 'Application' },
  { key: 'company_name', label: 'Company name', group: 'Application' },
  { key: 'job_title', label: 'Job title', group: 'Application' },
  { key: 'job_link', label: 'Job link', group: 'Application' },
  { key: 'my_name', label: 'Your name', group: 'Profile' },
  { key: 'my_phone', label: 'Your phone', group: 'Profile' },
  { key: 'my_linkedin', label: 'Your LinkedIn', group: 'Profile' },
  { key: 'my_portfolio', label: 'Your portfolio', group: 'Profile' },
]

const KNOWN_KEYS = new Set(TEMPLATE_VARIABLES.map((variable) => variable.key))
const PLACEHOLDER = /\{\{\s*([^}|]*?)\s*(?:\|([^}]*))?\}\}/g

export const SAMPLE_APPLICATION = {
  recruiterName: 'Priya Sharma',
  companyName: 'Acme Corp',
  jobTitle: 'Frontend Engineer',
  jobLink: 'https://acme.example/jobs/42',
}

export function buildTemplateValues(application = {}, profile = {}) {
  const recruiterName = (application.recruiterName ?? '').trim()
  return {
    recruiter_name: recruiterName,
    recruiter_first_name: recruiterName.split(/\s+/)[0] ?? '',
    company_name: (application.companyName ?? '').trim(),
    job_title: (application.jobTitle ?? '').trim(),
    job_link: (application.jobLink ?? '').trim(),
    my_name: (profile.name ?? '').trim(),
    my_phone: (profile.phone ?? '').trim(),
    my_linkedin: (profile.linkedin ?? '').trim(),
    my_portfolio: (profile.portfolio ?? '').trim(),
  }
}

/**
 * Renders `text` and returns the result plus segments for highlighted previews.
 * Issues: `unknown` (not a supported placeholder) and `empty` (no value and no fallback).
 */
export function renderTemplate(text = '', values = {}) {
  const segments = []
  const issues = []
  const seen = new Set()
  let output = ''
  let last = 0

  const addIssue = (key, kind) => {
    const id = `${kind}:${key}`
    if (seen.has(id)) return
    seen.add(id)
    issues.push({ key, kind })
  }

  for (const match of text.matchAll(PLACEHOLDER)) {
    const [raw, rawKey, fallback] = match
    const key = rawKey.trim()
    if (match.index > last) {
      const chunk = text.slice(last, match.index)
      segments.push({ type: 'text', value: chunk })
      output += chunk
    }
    last = match.index + raw.length

    if (!KNOWN_KEYS.has(key)) {
      addIssue(key || raw, 'unknown')
      segments.push({ type: 'variable', key, raw, value: raw, status: 'unknown' })
      output += raw
      continue
    }

    const value = values[key] ?? ''
    if (value) {
      segments.push({ type: 'variable', key, raw, value, status: 'ok' })
      output += value
    } else if (fallback !== undefined && fallback.trim()) {
      segments.push({ type: 'variable', key, raw, value: fallback.trim(), status: 'fallback' })
      output += fallback.trim()
    } else {
      addIssue(key, 'empty')
      segments.push({ type: 'variable', key, raw, value: raw, status: 'empty' })
      output += raw
    }
  }

  if (last < text.length) {
    segments.push({ type: 'text', value: text.slice(last) })
    output += text.slice(last)
  }

  return { text: output, segments, issues }
}

export function renderEmail(template, application, profile) {
  const values = buildTemplateValues(application, profile)
  const subject = renderTemplate(template?.subject ?? '', values)
  const body = renderTemplate(template?.body ?? '', values)
  const issues = [...subject.issues]
  for (const issue of body.issues) {
    if (!issues.some((item) => item.key === issue.key && item.kind === issue.kind)) issues.push(issue)
  }
  return { subject, body, issues }
}

export function describeIssue(issue) {
  return issue.kind === 'unknown'
    ? `{{${issue.key}}} is not a supported placeholder`
    : `${issue.key} is empty`
}

/**
 * When the text just before the caret is an unfinished `{{query`, returns where it starts and the query.
 * Used to open the variable list as the user types.
 */
export function findPlaceholderTrigger(value, caret) {
  const before = value.slice(0, caret)
  const match = /\{\{\s*([a-z_]*)$/i.exec(before)
  if (!match) return null
  return { start: match.index, query: match[1].toLowerCase() }
}

/**
 * Inserts `{{key}}` at the selection. If `replaceFrom` is given (an open `{{query` trigger),
 * the text from there to the caret is replaced instead. Returns the new value and caret.
 */
export function insertPlaceholder(value, selectionStart, selectionEnd, key, replaceFrom = null) {
  const token = `{{${key}}}`
  const start = replaceFrom ?? selectionStart
  const next = value.slice(0, start) + token + value.slice(selectionEnd)
  return { value: next, caret: start + token.length }
}

export function filterVariables(query = '') {
  const q = query.toLowerCase()
  if (!q) return TEMPLATE_VARIABLES
  return TEMPLATE_VARIABLES.filter(
    (variable) => variable.key.includes(q) || variable.label.toLowerCase().includes(q),
  )
}
