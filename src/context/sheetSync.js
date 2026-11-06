import { EMAIL_LOG_SHEET, REQUIRED_FIELDS, SHEET_COLUMNS } from '@/lib/constants'
import { parseSpreadsheetInput } from '@/lib/sheetParser'
import { a1, columnLetter, indexColumns, LOG_COLUMNS, parseApplications, parseEmailLog } from '@/lib/sheetRows'
import * as sheetsService from '@/services/sheetsService'

/**
 * Sheet setup, Sync, and cell write-backs. Reads and writes the Sheets API only: nothing here
 * calls Gmail (AC-5). Loaded on demand so the parser and API code stay out of the first load.
 */

export class SheetSyncError extends Error {
  constructor(message, code = 'sheet') {
    super(message)
    this.name = 'SheetSyncError'
    this.code = code
    this.userMessage = message
  }
}

const trimmed = (row) => (row ?? []).map((cell) => String(cell ?? '').trim())

/** Link → spreadsheet title and every tab with its header row (AC-3). Email_Log is left out. */
export async function inspectSpreadsheet(input, { service = sheetsService } = {}) {
  const parsed = parseSpreadsheetInput(input)
  if (!parsed) throw new SheetSyncError('Paste a Google Sheets link, like https://docs.google.com/spreadsheets/d/…', 'link')

  const meta = await service.getSpreadsheet(parsed.id)
  const tabs = meta.sheets.filter((sheet) => sheet.title !== EMAIL_LOG_SHEET)
  if (!tabs.length) throw new SheetSyncError('This spreadsheet has no tabs to read.', 'empty')

  const headerRows = await service.batchGetValues(
    meta.spreadsheetId,
    tabs.map((tab) => a1(tab.title, '1:1')),
  )
  const withHeaders = tabs.map((tab, i) => {
    const row = trimmed(headerRows[i]?.[0])
    return { ...tab, headerWidth: row.length, headers: row.filter(Boolean) }
  })
  const fromGid = withHeaders.find((tab) => String(tab.sheetId) === parsed.gid)

  return {
    spreadsheetId: meta.spreadsheetId,
    title: meta.title,
    tabs: withHeaders,
    suggestedTab: (fromGid ?? withHeaders.find((tab) => tab.headers.length) ?? withHeaders[0]).title,
  }
}

/**
 * Writes missing tracking headers to the right of the existing header row, adding grid columns
 * first when the tab is too narrow. Existing cells are never moved or overwritten.
 */
export async function addHeaderColumns(spreadsheetId, tab, headers, { service = sheetsService } = {}) {
  if (!headers.length) return
  const start = tab.headerWidth
  const end = start + headers.length
  if (end > tab.columnCount) {
    await service.batchUpdate(spreadsheetId, [
      { appendDimension: { sheetId: tab.sheetId, dimension: 'COLUMNS', length: end - tab.columnCount } },
    ])
  }
  await service.batchUpdateValues(spreadsheetId, [
    { range: a1(tab.title, `${columnLetter(start)}1:${columnLetter(end - 1)}1`), values: [headers] },
  ])
}

function checkMapping(headers, columnMap, tabName) {
  for (const field of ['id', ...REQUIRED_FIELDS]) {
    const header = columnMap[field]
    if (!header) {
      throw new SheetSyncError(`No column is mapped to ${SHEET_COLUMNS[field]}. Update the column mapping.`, 'mapping')
    }
    if (!headers.includes(header)) {
      throw new SheetSyncError(`Column "${header}" was not found in ${tabName}. Update the column mapping.`, 'mapping')
    }
  }
}

function findTab(meta, config) {
  const tab =
    meta.sheets.find((sheet) => sheet.sheetId === config.sheetId) ??
    meta.sheets.find((sheet) => sheet.title === config.tabName)
  if (!tab) {
    throw new SheetSyncError(`The tab "${config.tabName}" was not found. Choose a tab again in sheet setup.`, 'tab_missing')
  }
  return tab
}

/**
 * Sync Now (FR-2): reads the tab and Email_Log, validates and dedupes rows, and writes new IDs
 * back in one batch. Rows with an ID already are never rewritten.
 */
export async function syncSheet(config, { service = sheetsService, makeId, now = () => new Date() } = {}) {
  const meta = await service.getSpreadsheet(config.spreadsheetId)
  const tab = findTab(meta, config)
  const log = meta.sheets.find((sheet) => sheet.title === EMAIL_LOG_SHEET)

  const ranges = [a1(tab.title)]
  if (log) ranges.push(a1(log.title))
  const [values, logValues = []] = await service.batchGetValues(config.spreadsheetId, ranges)

  const headers = trimmed(values[0])
  checkMapping(headers, config.columnMap, tab.title)
  const parsed = parseApplications(values, config.columnMap, makeId ? { makeId } : undefined)

  if (parsed.idAssignments.length) {
    const idColumn = columnLetter(headers.indexOf(config.columnMap.id))
    try {
      await service.batchUpdateValues(
        config.spreadsheetId,
        parsed.idAssignments.map(({ row, id }) => ({ range: a1(tab.title, `${idColumn}${row}`), values: [[id]] })),
      )
    } catch (error) {
      if (error?.code === 'unauthorized' || error?.code === 'network') throw error
      throw new SheetSyncError(
        `Your rows were read, but new row IDs could not be saved to the sheet. ${error?.userMessage ?? ''}`.trim(),
        'id_write',
      )
    }
  }

  const names = new Map(parsed.applications.map((app) => [app.id, app.recruiterName]))
  const emailLog = parseEmailLog(logValues).map((row) => ({ ...row, recipientName: names.get(row.applicationId) ?? '' }))

  return {
    spreadsheetTitle: meta.title,
    tabName: tab.title,
    sheetId: tab.sheetId,
    headers: headers.filter(Boolean),
    worksheets: meta.sheets.map((sheet) => ({ title: sheet.title, rows: sheet.rowCount })),
    applications: parsed.applications,
    emailLog,
    summary: parsed.summary,
    invalidRows: parsed.invalidRows,
    skippedRows: parsed.skippedRows,
    assignedIds: parsed.idAssignments.length,
    syncedAt: now().toISOString(),
  }
}

/**
 * Writes field values for rows found by Application ID, never by a cached row number
 * (DATABASE_SCHEMA §2). The header row and ID column are read fresh first.
 * Returns the IDs that are no longer in the sheet.
 */
const LOG_HEADERS = Object.values(LOG_COLUMNS)

/** Creates Email_Log the first time, with its header row, then appends one record. */
export async function appendEmailLog(spreadsheetId, row, { service = sheetsService } = {}) {
  const meta = await service.getSpreadsheet(spreadsheetId)
  const exists = meta.sheets.some((sheet) => sheet.title === EMAIL_LOG_SHEET)
  let header = LOG_HEADERS
  if (!exists) {
    await service.batchUpdate(spreadsheetId, [{ addSheet: { properties: { title: EMAIL_LOG_SHEET } } }])
    await service.batchUpdateValues(spreadsheetId, [{ range: a1(EMAIL_LOG_SHEET, 'A1:N1'), values: [LOG_HEADERS] }])
  } else {
    const [headerRow] = await service.getValues(spreadsheetId, a1(EMAIL_LOG_SHEET, '1:1'))
    const found = (headerRow ?? []).map((cell) => String(cell ?? '').trim()).filter(Boolean)
    if (found.length) header = found
  }
  const byName = Object.fromEntries(Object.entries(LOG_COLUMNS).map(([field, name]) => [name, row[field] ?? '']))
  await service.appendValues(spreadsheetId, a1(EMAIL_LOG_SHEET, 'A1'), [header.map((name) => byName[name] ?? '')])
}

export async function writeFields(config, updates, { service = sheetsService } = {}) {
  const [headerRow] = await service.getValues(config.spreadsheetId, a1(config.tabName, '1:1'))
  const index = indexColumns(trimmed(headerRow), config.columnMap)
  if (index.id == null) {
    throw new SheetSyncError('The Application ID column was not found. Sync to check the column mapping.', 'mapping')
  }
  const idColumn = columnLetter(index.id)
  const idCells = await service.getValues(config.spreadsheetId, a1(config.tabName, `${idColumn}:${idColumn}`))
  const rowById = new Map()
  idCells.forEach((cells, i) => {
    const id = String(cells?.[0] ?? '').trim()
    if (id && i > 0 && !rowById.has(id)) rowById.set(id, i + 1)
  })

  const data = []
  const notFound = []
  for (const { applicationId, values } of updates) {
    const row = rowById.get(applicationId)
    if (!row) {
      notFound.push(applicationId)
      continue
    }
    for (const [field, value] of Object.entries(values)) {
      if (index[field] == null) {
        throw new SheetSyncError(`The ${SHEET_COLUMNS[field]} column was not found. Sync to check the column mapping.`, 'mapping')
      }
      data.push({ range: a1(config.tabName, `${columnLetter(index[field])}${row}`), values: [[value]] })
    }
  }
  if (data.length) await service.batchUpdateValues(config.spreadsheetId, data)
  return { notFound }
}
