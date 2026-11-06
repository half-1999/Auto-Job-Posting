import { googleFetch } from './http'

/** Google Sheets API v4 calls (API_INTEGRATION §5). Every request goes through `googleFetch`. */
export const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

const META_FIELDS =
  'spreadsheetId,properties.title,sheets.properties(sheetId,title,index,gridProperties(rowCount,columnCount))'

const url = (spreadsheetId, path = '', params) => {
  const query = params ? `?${params.toString()}` : ''
  return `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}${path}${query}`
}

/** Validates access and lists the tabs. */
export async function getSpreadsheet(spreadsheetId, options) {
  const data = await googleFetch(url(spreadsheetId, '', new URLSearchParams({ fields: META_FIELDS })), options)
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title ?? '',
    sheets: (data.sheets ?? [])
      .map(({ properties: p }) => ({
        sheetId: p.sheetId,
        title: p.title,
        index: p.index ?? 0,
        rowCount: p.gridProperties?.rowCount ?? 0,
        columnCount: p.gridProperties?.columnCount ?? 0,
      }))
      .sort((a, b) => a.index - b.index),
  }
}

/** Reads several ranges in one request. Returns one `values` array per range, in order. */
export async function batchGetValues(spreadsheetId, ranges, options) {
  const params = new URLSearchParams({ majorDimension: 'ROWS', valueRenderOption: 'FORMATTED_VALUE' })
  for (const range of ranges) params.append('ranges', range)
  const data = await googleFetch(url(spreadsheetId, '/values:batchGet', params), options)
  return ranges.map((_, i) => data.valueRanges?.[i]?.values ?? [])
}

export async function getValues(spreadsheetId, range, options) {
  const [values] = await batchGetValues(spreadsheetId, [range], options)
  return values
}

/** Writes cells exactly as given (RAW), so text is never parsed as formulas. */
export function batchUpdateValues(spreadsheetId, data, options) {
  return googleFetch(url(spreadsheetId, '/values:batchUpdate'), {
    ...options,
    method: 'POST',
    body: { valueInputOption: 'RAW', data },
  })
}

/** Appends rows. Used for Email_Log, which is never rewritten. */
export function appendValues(spreadsheetId, range, values, options) {
  const params = new URLSearchParams({ valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' })
  return googleFetch(
    `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?${params}`,
    { ...options, method: 'POST', body: { values } },
  )
}

/** Structural changes, such as adding columns to a tab. */
export function batchUpdate(spreadsheetId, requests, options) {
  return googleFetch(url(spreadsheetId, ':batchUpdate'), {
    ...options,
    method: 'POST',
    body: { requests },
  })
}

/** Creates a spreadsheet in the signed-in user's Drive and returns its open URL. */
export async function createSpreadsheet({ title, sheets }) {
  const data = await googleFetch(SHEETS_BASE, {
    method: 'POST',
    body: {
      properties: { title },
      sheets: sheets.map((sheet) => ({
        properties: { title: sheet.title },
        data: [
          {
            rowData: sheet.rows.map((row) => ({
              values: row.map((cell) => ({ userEnteredValue: { stringValue: String(cell ?? '') } })),
            })),
          },
        ],
      })),
    },
  })
  return { spreadsheetId: data.spreadsheetId, url: data.spreadsheetUrl }
}

export function spreadsheetUrl(spreadsheetId, sheetId) {
  const base = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/edit`
  return sheetId == null ? base : `${base}#gid=${sheetId}`
}
