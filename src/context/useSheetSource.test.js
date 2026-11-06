import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSheetSource } from './useSheetSource'

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), warning: vi.fn(), success: vi.fn() }) }))

const store = (key, data) => localStorage.setItem(key, JSON.stringify({ version: 1, data }))
const read = (key) => JSON.parse(localStorage.getItem(key) ?? 'null')?.data ?? null

const CONFIG = {
  spreadsheetId: 'sheet-1',
  spreadsheetTitle: 'Job Hunt',
  tabName: 'Applications',
  sheetId: 0,
  headers: ['Company'],
  columnMap: { companyName: 'Company' },
}
const APP = { id: 'id-1', rowNumber: 2, companyName: 'Acme', recruiterEmail: 'a@acme.com', jobTitle: 'Engineer', notes: 'private note', applicationStatus: 'Not Applied', emailStatus: 'Not Sent' }

function syncResult() {
  return {
    spreadsheetTitle: 'Job Hunt',
    tabName: 'Applications',
    sheetId: 0,
    headers: ['Company'],
    worksheets: [],
    applications: [APP],
    emailLog: [],
    summary: { total: 1, imported: 1, skipped: 0, invalid: 0 },
    invalidRows: [],
    skippedRows: [],
    assignedIds: 0,
    syncedAt: '2026-11-04T09:30:00.000Z',
  }
}

function fakeModule(overrides = {}) {
  return {
    syncSheet: vi.fn(async () => syncResult()),
    writeFields: vi.fn(async () => ({ notFound: [] })),
    addHeaderColumns: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('useSheetSource', () => {
  it('saves an offline copy after sync, without notes, and turning the setting off deletes it', async () => {
    store('jaas.sheetConfig', CONFIG)
    const mod = fakeModule()
    const { result } = renderHook(() => useSheetSource({ enabled: true, sync: async () => mod }))

    await act(() => result.current.sync())
    const snapshot = read('jaas.snapshot')
    expect(snapshot).toMatchObject({ spreadsheetId: 'sheet-1', syncedAt: '2026-11-04T09:30:00.000Z' })
    expect(snapshot.rows[0]).toMatchObject({ id: 'id-1', companyName: 'Acme' })
    expect(snapshot.rows[0]).not.toHaveProperty('notes')
    expect(read('jaas.logSnapshot')).toMatchObject({ rows: [] })

    act(() => result.current.clearSnapshot())
    expect(localStorage.getItem('jaas.snapshot')).toBeNull()
    expect(localStorage.getItem('jaas.logSnapshot')).toBeNull()
    expect(result.current.data.applications).toHaveLength(1)
  })

  it('opens on the saved copy, and ignores it when Keep an offline copy is off', () => {
    store('jaas.sheetConfig', CONFIG)
    store('jaas.snapshot', { ...syncResult(), spreadsheetId: 'sheet-1', rows: [APP] })

    const first = renderHook(() => useSheetSource({ enabled: true, sync: async () => fakeModule() }))
    expect(first.result.current.data).toMatchObject({ fromSnapshot: true, sheet: { syncedAt: '2026-11-04T09:30:00.000Z' } })
    expect(first.result.current.data.applications[0].companyName).toBe('Acme')

    store('jaas.settings', { offline: { keepSnapshot: false } })
    const second = renderHook(() => useSheetSource({ enabled: true, sync: async () => fakeModule() }))
    expect(second.result.current.data.applications).toEqual([])
    expect(second.result.current.data.fromSnapshot).toBe(false)
  })

  it('does not save a copy when the setting is off', async () => {
    store('jaas.sheetConfig', CONFIG)
    store('jaas.settings', { offline: { keepSnapshot: false } })
    const { result } = renderHook(() => useSheetSource({ enabled: true, sync: async () => fakeModule() }))
    await act(() => result.current.sync())
    expect(localStorage.getItem('jaas.snapshot')).toBeNull()
  })

  it('keeps a failed write as pending, and writes it again only on Retry', async () => {
    store('jaas.sheetConfig', CONFIG)
    const writeFields = vi.fn(async () => ({ notFound: [] })).mockRejectedValueOnce(Object.assign(new Error('x'), { userMessage: 'You appear to be offline.' }))
    const mod = fakeModule({ writeFields })
    const { result } = renderHook(() => useSheetSource({ enabled: true, sync: async () => mod }))
    await act(() => result.current.sync())

    let saved
    await act(async () => {
      saved = await result.current.updateApplications(['id-1'], { applicationStatus: 'Applied', notes: 'ignored' })
    })
    expect(saved).toBe(false)
    expect(writeFields).toHaveBeenCalledTimes(1)
    expect(writeFields.mock.calls[0][1]).toEqual([{ applicationId: 'id-1', values: { applicationStatus: 'Applied' } }])
    expect(result.current.pending).toEqual([{ applicationId: 'id-1', values: { applicationStatus: 'Applied' }, attempts: 0 }])
    expect(read('jaas.pendingWritebacks')).toEqual({ items: result.current.pending })
    expect(result.current.data.applications[0].applicationStatus).toBe('Applied')

    await act(() => result.current.sync())
    expect(writeFields).toHaveBeenCalledTimes(1)
    expect(result.current.data.applications[0].applicationStatus).toBe('Applied')

    let outcome
    await act(async () => {
      outcome = await result.current.retryWritebacks()
    })
    expect(outcome).toMatchObject({ ok: true, count: 1 })
    expect(writeFields).toHaveBeenCalledTimes(2)
    expect(result.current.pending).toEqual([])
    expect(localStorage.getItem('jaas.pendingWritebacks')).toBeNull()
  })

  it('stays empty and reads nothing when disabled, as in mock mode', () => {
    store('jaas.sheetConfig', CONFIG)
    const sync = vi.fn()
    const { result } = renderHook(() => useSheetSource({ enabled: false, sync }))
    expect(result.current.data).toBeNull()
    expect(sync).not.toHaveBeenCalled()
  })
})
