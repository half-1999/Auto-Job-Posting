import { REQUIRED_FIELDS, SHEET_COLUMNS } from './constants'

/** Accepts a Google Sheets URL or a bare spreadsheet ID. Returns `{ id, gid }` or null. */
export function parseSpreadsheetInput(input) {
  const value = (input ?? '').trim()
  if (!value) return null

  const urlMatch = /\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/.exec(value)
  if (urlMatch) {
    const gid = /[#&?]gid=(\d+)/.exec(value)?.[1] ?? null
    return { id: urlMatch[1], gid }
  }
  if (/^[a-zA-Z0-9-_]{25,}$/.test(value)) return { id: value, gid: null }
  return null
}

export function normalizeHeader(header) {
  return String(header ?? '')
    .toLowerCase()
    .replace(/[\s_\-./]+/g, '')
}

/** Common header names people use, beyond the defaults in SHEET_COLUMNS. */
const HEADER_ALIASES = {
  companyName: ['company', 'organization', 'employer'],
  recruiterName: ['recruiter', 'hrname', 'contactname', 'contact'],
  recruiterEmail: ['hremail', 'email', 'contactemail', 'recruiteremailaddress'],
  jobTitle: ['role', 'position', 'title', 'jobrole'],
  jobLink: ['link', 'url', 'joburl', 'posting'],
  templateName: ['template'],
  applicationStatus: ['status', 'stage'],
  notes: ['note', 'comments'],
}

/**
 * Maps app fields to sheet headers: exact default names first (case, spaces, and
 * underscores ignored), then aliases. Each header is used at most once.
 */
export function autoMapColumns(headers) {
  const normalized = headers.map((header) => ({ header, key: normalizeHeader(header) }))
  const used = new Set()
  const map = {}

  const take = (field, candidates) => {
    const hit = normalized.find((item) => !used.has(item.header) && candidates.includes(item.key))
    if (!hit) return false
    used.add(hit.header)
    map[field] = hit.header
    return true
  }

  for (const [field, header] of Object.entries(SHEET_COLUMNS)) {
    take(field, [normalizeHeader(header)])
  }
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (!map[field]) take(field, aliases)
  }
  return map
}

export function getMissingRequired(columnMap) {
  return REQUIRED_FIELDS.filter((field) => !columnMap[field])
}

/** System columns the app needs that are not mapped yet, in the order they would be appended. */
export function getMissingSystemColumns(columnMap, systemFields) {
  return systemFields.filter((field) => !columnMap[field]).map((field) => SHEET_COLUMNS[field])
}
