import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearToken, setToken } from '@/services/tokenStore'
import { addHeaderColumns, inspectSpreadsheet, syncSheet, writeFields } from './sheetSync'

const ID = '1tsZEGDTA7QXBNVZYSooc2-0E3Ky9SRezqhElfL7oMCc'
const LINK = `https://docs.google.com/spreadsheets/d/${ID}/edit?gid=0#gid=0`

/** A tiny in-memory Sheets backend that records every request. */
function fakeGoogle(tabs) {
  const calls = []
  const fetchImpl = vi.fn(async (url, init) => {
    const parsed = new URL(url)
    calls.push({ method: init.method, url: parsed, body: init.body ? JSON.parse(init.body) : null, init })
    const json = (data) => ({ ok: true, status: 200, json: async () => data })
    const path = decodeURIComponent(parsed.pathname)

    if (init.method === 'GET' && path === `/v4/spreadsheets/${ID}`) {
      return json({
        spreadsheetId: ID,
        properties: { title: 'Job Hunt' },
        sheets: Object.entries(tabs).map(([title, tab], index) => ({
          properties: { sheetId: tab.sheetId, title, index, gridProperties: { rowCount: 1000, columnCount: tab.columnCount ?? 26 } },
        })),
      })
    }
    if (init.method === 'GET' && path.endsWith('/values:batchGet')) {
      const valueRanges = parsed.searchParams.getAll('ranges').map((range) => {
        const [, title, area] = /^'(.*)'(?:!(.*))?$/.exec(range)
        const rows = tabs[title.replace(/''/g, "'")].values
        if (area === '1:1') return { range, values: rows.slice(0, 1) }
        const column = /^([A-Z]+):\1$/.exec(area ?? '')
        if (column) {
          const at = column[1].charCodeAt(0) - 65
          return { range, values: rows.map((row) => [row[at] ?? '']) }
        }
        return { range, values: rows }
      })
      return json({ valueRanges })
    }
    if (init.method === 'POST') return json({})
    return { ok: false, status: 404, json: async () => ({ error: { message: 'nope' } }) }
  })
  return { calls, fetchImpl }
}

function useFakeGoogle(tabs) {
  const fake = fakeGoogle(tabs)
  vi.stubGlobal('fetch', fake.fetchImpl)
  return fake
}

const APPLICATIONS = {
  sheetId: 0,
  values: [
    ['Company', 'HR Email', 'Role', 'Application ID', 'Email Status'],
    ['Acme', 'priya@acme.com', 'Engineer', 'id-1', 'Sent'],
    ['Globex', 'sam@globex.com', 'Designer', '', ''],
    ['Initech', 'bad-email', 'PM', '', ''],
  ],
}
const CONFIG = {
  spreadsheetId: ID,
  spreadsheetTitle: 'Job Hunt',
  tabName: 'Applications',
  sheetId: 0,
  columnMap: { companyName: 'Company', recruiterEmail: 'HR Email', jobTitle: 'Role', id: 'Application ID', emailStatus: 'Email Status' },
}

beforeEach(() => setToken({ accessToken: 'test-token', expiresAt: Date.now() + 3_600_000 }))
afterEach(() => {
  clearToken()
  vi.unstubAllGlobals()
})

describe('inspectSpreadsheet (AC-3)', () => {
  it('extracts the ID, lists every tab but Email_Log, and reads each header row', async () => {
    const fake = useFakeGoogle({
      Applications: APPLICATIONS,
      "Bob's Archive": { sheetId: 7, values: [['Company', 'Email']] },
      Email_Log: { sheetId: 9, values: [['Log ID']] },
    })
    const result = await inspectSpreadsheet(LINK)

    expect(result.spreadsheetId).toBe(ID)
    expect(result.title).toBe('Job Hunt')
    expect(result.tabs.map((tab) => tab.title)).toEqual(['Applications', "Bob's Archive"])
    expect(result.tabs[0].headers).toEqual(APPLICATIONS.values[0])
    expect(result.tabs[1].headers).toEqual(['Company', 'Email'])
    expect(result.suggestedTab).toBe('Applications')
    expect(fake.calls[1].url.searchParams.getAll('ranges')).toEqual(["'Applications'!1:1", "'Bob''s Archive'!1:1"])
    for (const call of fake.calls) {
      expect(call.init).toMatchObject({ cache: 'no-store', credentials: 'omit' })
      expect(call.init.headers.Authorization).toBe('Bearer test-token')
    }
  })

  it('rejects text that is not a Sheets link without calling Google', async () => {
    const fake = useFakeGoogle({})
    await expect(inspectSpreadsheet('hello')).rejects.toMatchObject({ code: 'link' })
    expect(fake.calls).toHaveLength(0)
  })
})

describe('syncSheet', () => {
  it('AC-5: reads the sheet, writes new IDs in one RAW batch, and never calls Gmail', async () => {
    const fake = useFakeGoogle({ Applications: APPLICATIONS })
    const result = await syncSheet(CONFIG, { makeId: () => 'new-id' })

    expect(result.summary).toEqual({ total: 3, imported: 2, skipped: 0, invalid: 1 })
    expect(result.applications.map((app) => app.id)).toEqual(['id-1', 'new-id'])
    expect(result.assignedIds).toBe(1)

    const writes = fake.calls.filter((call) => call.method === 'POST')
    expect(writes).toHaveLength(1)
    expect(writes[0].url.pathname).toBe(`/v4/spreadsheets/${ID}/values:batchUpdate`)
    expect(writes[0].body).toEqual({
      valueInputOption: 'RAW',
      data: [{ range: "'Applications'!D3", values: [['new-id']] }],
    })
    for (const call of fake.calls) {
      expect(call.url.hostname).toBe('sheets.googleapis.com')
      expect(call.url.href).not.toMatch(/gmail/i)
    }
  })

  it('reads Email_Log when the tab exists', async () => {
    useFakeGoogle({
      Applications: APPLICATIONS,
      Email_Log: {
        sheetId: 9,
        values: [
          ['Log ID', 'Timestamp', 'Application ID', 'Recipient Email', 'Result'],
          ['l1', '2026-11-01T10:00:00Z', 'id-1', 'priya@acme.com', 'Sent'],
        ],
      },
    })
    const result = await syncSheet(CONFIG, { makeId: () => 'new-id' })
    expect(result.emailLog).toEqual([expect.objectContaining({ logId: 'l1', result: 'Sent', recipient: 'priya@acme.com' })])
  })

  it('fails with a clear message when a mapped column is gone', async () => {
    useFakeGoogle({ Applications: APPLICATIONS })
    await expect(syncSheet({ ...CONFIG, columnMap: { ...CONFIG.columnMap, jobTitle: 'Position' } })).rejects.toMatchObject({
      code: 'mapping',
      message: 'Column "Position" was not found in Applications. Update the column mapping.',
    })
  })

  it('finds a renamed tab by its sheet ID', async () => {
    useFakeGoogle({ 'Renamed tab': APPLICATIONS })
    const result = await syncSheet(CONFIG, { makeId: () => 'new-id' })
    expect(result.tabName).toBe('Renamed tab')
  })
})

describe('writeFields', () => {
  it('locates rows by Application ID, not by a cached row number', async () => {
    const fake = useFakeGoogle({
      Applications: {
        sheetId: 0,
        values: [APPLICATIONS.values[0], ['Globex', 'sam@globex.com', 'Designer', 'id-2', ''], APPLICATIONS.values[1]],
      },
    })
    const { notFound } = await writeFields(CONFIG, [
      { applicationId: 'id-1', values: { emailStatus: 'Do Not Email' } },
      { applicationId: 'gone', values: { emailStatus: 'Do Not Email' } },
    ])
    expect(notFound).toEqual(['gone'])
    const write = fake.calls.find((call) => call.method === 'POST')
    expect(write.body.data).toEqual([{ range: "'Applications'!E3", values: [['Do Not Email']] }])
  })
})

describe('addHeaderColumns', () => {
  it('widens a narrow tab first, then writes headers to the right of the existing ones', async () => {
    const fake = useFakeGoogle({})
    const tab = { sheetId: 4, title: 'Applications', headerWidth: 5, columnCount: 6 }
    await addHeaderColumns(ID, tab, ['Sent Date', 'Thread ID', 'Last Error'])
    const [grow, write] = fake.calls
    expect(grow.body).toEqual({ requests: [{ appendDimension: { sheetId: 4, dimension: 'COLUMNS', length: 2 } }] })
    expect(write.body.data).toEqual([{ range: "'Applications'!F1:H1", values: [['Sent Date', 'Thread ID', 'Last Error']] }])
  })
})
