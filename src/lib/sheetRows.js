import { APPLICATION_STATUS, EMAIL_STATUS, REPLY_STATUS, SHEET_COLUMNS } from './constants'
import { dedupeKey } from './dedupe'
import { normalizeHeader } from './sheetParser'
import { isValidEmail } from './validation'

/** 0 → A, 25 → Z, 26 → AA. */
export function columnLetter(index) {
  let n = index + 1
  let letters = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

/** A1 range on a tab. Tab names are always quoted, with inner quotes doubled. */
export function a1(tabName, range) {
  const quoted = `'${String(tabName).replace(/'/g, "''")}'`
  return range ? `${quoted}!${range}` : quoted
}

const cellText = (value) => String(value ?? '').trim()

function canonical(allowed, raw) {
  const key = raw.toLowerCase()
  return Object.values(allowed).find((value) => value.toLowerCase() === key) ?? null
}

/** Header index for each mapped field; fields whose header is missing are left out. */
export function indexColumns(headers, columnMap) {
  const index = {}
  for (const [field, header] of Object.entries(columnMap)) {
    const at = headers.indexOf(header)
    if (at >= 0) index[field] = at
  }
  return index
}

function invalidReason(record) {
  if (!record.recruiterEmail) return 'Recruiter email missing'
  if (/[,;]/.test(record.recruiterEmail)) return 'Use one email address per row'
  if (!isValidEmail(record.recruiterEmail)) return 'Email address is not valid'
  if (!record.companyName) return 'Company name missing'
  if (!record.jobTitle) return 'Job title missing'
  return null
}

/**
 * Turns the Applications tab (header row first) into records (DATABASE_SCHEMA §2, §3.1, §7).
 * Blank rows are ignored. Invalid rows and duplicates are reported, never imported. Valid rows
 * without an ID get a new one in `idAssignments`, which the caller writes back to the sheet.
 */
export function parseApplications(values, columnMap, { makeId = () => crypto.randomUUID() } = {}) {
  const [headerRow = [], ...rows] = values ?? []
  const headers = headerRow.map(cellText)
  const index = indexColumns(headers, columnMap)
  const fields = Object.keys(SHEET_COLUMNS)

  const applications = []
  const invalidRows = []
  const skippedRows = []
  const idAssignments = []
  const seenIds = new Map()
  const seenKeys = new Map()
  let total = 0

  rows.forEach((cells, i) => {
    const row = i + 2
    if (!cells?.some((cell) => cellText(cell))) return
    total += 1

    const record = {}
    for (const field of fields) record[field] = index[field] == null ? '' : cellText(cells[index[field]])

    const reason = invalidReason(record)
    if (reason) {
      invalidRows.push({ row, value: record.recruiterEmail, reason })
      return
    }
    if (record.id) {
      if (seenIds.has(record.id)) {
        skippedRows.push({ row, reason: `Duplicate ID of row ${seenIds.get(record.id)}. Clear the ID cell to re-assign.` })
        return
      }
      seenIds.set(record.id, row)
    }
    const key = dedupeKey(record)
    if (seenKeys.has(key)) {
      skippedRows.push({ row, reason: `Duplicate of row ${seenKeys.get(key)}` })
      return
    }
    seenKeys.set(key, row)

    if (!record.id) {
      record.id = makeId()
      idAssignments.push({ row, id: record.id })
    }
    record.applicationStatus = canonical(APPLICATION_STATUS, record.applicationStatus) ?? APPLICATION_STATUS.notApplied
    record.emailStatus = record.emailStatus
      ? (canonical(EMAIL_STATUS, record.emailStatus) ?? record.emailStatus)
      : EMAIL_STATUS.notSent
    record.replyStatus = record.replyStatus
      ? (canonical(REPLY_STATUS, record.replyStatus) ?? record.replyStatus)
      : ''
    applications.push({ ...record, rowNumber: row })
  })

  return {
    headers,
    applications,
    invalidRows,
    skippedRows,
    idAssignments,
    summary: { total, imported: applications.length, skipped: skippedRows.length, invalid: invalidRows.length },
  }
}

/** Email_Log headers (DATABASE_SCHEMA §4) → log row fields. */
export const LOG_COLUMNS = {
  logId: 'Log ID',
  timestamp: 'Timestamp',
  campaignId: 'Campaign ID',
  applicationId: 'Application ID',
  recipient: 'Recipient Email',
  companyName: 'Company Name',
  jobTitle: 'Job Title',
  templateName: 'Template Name',
  subject: 'Subject',
  attachment: 'Attachment',
  result: 'Result',
  messageId: 'Gmail Message ID',
  threadId: 'Thread ID',
  error: 'Error',
}

/** Email_Log rows, newest first. Columns are found by header name, so their order doesn't matter. */
export function parseEmailLog(values) {
  const [headerRow = [], ...rows] = values ?? []
  const positions = headerRow.map((header) => normalizeHeader(header))
  const index = Object.fromEntries(
    Object.entries(LOG_COLUMNS).map(([field, header]) => [field, positions.indexOf(normalizeHeader(header))]),
  )
  const entries = []
  rows.forEach((cells, i) => {
    if (!cells?.some((cell) => cellText(cell))) return
    const entry = { recipientName: '' }
    for (const [field, at] of Object.entries(index)) entry[field] = at >= 0 ? cellText(cells[at]) : ''
    if (!entry.timestamp) return
    if (!entry.logId) entry.logId = `row-${i + 2}`
    entries.push(entry)
  })
  const time = (entry) => Date.parse(entry.timestamp) || 0
  return entries.sort((a, b) => time(b) - time(a))
}
