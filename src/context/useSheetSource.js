import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage, removeStorage, writeStorage } from '@/lib/storage'

/**
 * The real workspace source: the connected Google Sheet (Phase 6).
 * - `jaas.sheetConfig` remembers which sheet, tab, and mapping. No tokens.
 * - `jaas.snapshot` / `jaas.logSnapshot` keep the last sync for offline browsing, only while
 *   Settings > Keep an offline copy is on. They are read-only and never the basis for a send.
 * - `jaas.pendingWritebacks` holds cell writes that failed. They run again only when the user
 *   chooses Retry; reconnecting never runs them on its own.
 */

const loadSync = () => import('./sheetSync')

const SNAPSHOT_FIELDS = [
  'id', 'rowNumber', 'companyName', 'recruiterName', 'recruiterEmail', 'jobTitle', 'jobLink',
  'templateName', 'applicationStatus', 'emailStatus', 'sentDate', 'threadId', 'replyStatus',
  'replyDate', 'lastError',
]
const LOG_SNAPSHOT_FIELDS = [
  'logId', 'timestamp', 'campaignId', 'applicationId', 'recipient', 'companyName', 'jobTitle',
  'subject', 'templateName', 'attachment', 'result', 'messageId', 'threadId', 'error',
]
const LOG_SNAPSHOT_LIMIT = 500
const WRITABLE_FIELDS = ['applicationStatus', 'emailStatus']
const EMPTY_SUMMARY = { total: 0, imported: 0, skipped: 0, invalid: 0 }

const pick = (object, fields) => Object.fromEntries(fields.map((field) => [field, object[field] ?? '']))

export function keepSnapshotEnabled() {
  return readStorage(STORAGE_KEYS.settings, {})?.offline?.keepSnapshot ?? true
}

function buildSheet(config, result) {
  return {
    spreadsheetId: config.spreadsheetId,
    spreadsheetTitle: config.spreadsheetTitle,
    tabName: config.tabName,
    sheetId: config.sheetId,
    headers: config.headers ?? [],
    columnMap: config.columnMap,
    worksheets: result?.worksheets ?? [],
    syncedAt: result?.syncedAt ?? null,
    summary: result?.summary ?? EMPTY_SUMMARY,
    invalidRows: result?.invalidRows ?? [],
    skippedRows: result?.skippedRows ?? [],
  }
}

function withNames(emailLog, applications) {
  const names = new Map(applications.map((app) => [app.id, app.recruiterName]))
  return emailLog.map((row) => ({ ...row, recipientName: names.get(row.applicationId) ?? '' }))
}

function fromStorage(config) {
  if (!config) return null
  const snapshot = keepSnapshotEnabled() ? readStorage(STORAGE_KEYS.snapshot) : null
  if (!snapshot || snapshot.spreadsheetId !== config.spreadsheetId || snapshot.tabName !== config.tabName) {
    return { applications: [], emailLog: [], sheet: buildSheet(config, null), fromSnapshot: false }
  }
  const applications = (snapshot.rows ?? []).map((row) => ({ ...row, notes: '' }))
  const log = readStorage(STORAGE_KEYS.logSnapshot)
  return {
    applications,
    emailLog: withNames(log?.rows ?? [], applications),
    sheet: buildSheet(config, snapshot),
    fromSnapshot: true,
  }
}

function writeSnapshot(config, data) {
  const { sheet } = data
  writeStorage(STORAGE_KEYS.snapshot, {
    syncedAt: sheet.syncedAt,
    spreadsheetId: config.spreadsheetId,
    tabName: config.tabName,
    summary: sheet.summary,
    invalidRows: sheet.invalidRows,
    skippedRows: sheet.skippedRows,
    worksheets: sheet.worksheets,
    rows: data.applications.map((app) => pick(app, SNAPSHOT_FIELDS)),
  })
  writeStorage(STORAGE_KEYS.logSnapshot, {
    syncedAt: sheet.syncedAt,
    rows: data.emailLog.slice(0, LOG_SNAPSHOT_LIMIT).map((row) => pick(row, LOG_SNAPSHOT_FIELDS)),
  })
}

export function clearSnapshotStorage() {
  removeStorage(STORAGE_KEYS.snapshot)
  removeStorage(STORAGE_KEYS.logSnapshot)
}

/** Merges new values into the queue, one item per application. */
export function mergePending(items, updates) {
  const next = items.map((item) => ({ ...item, values: { ...item.values } }))
  for (const update of updates) {
    const existing = next.find((item) => item.applicationId === update.applicationId)
    if (existing) {
      Object.assign(existing.values, update.values)
      if (update.logRow) existing.logRow = update.logRow
    } else {
      next.push({
        applicationId: update.applicationId,
        values: { ...update.values },
        ...(update.logRow ? { logRow: update.logRow } : {}),
        attempts: 0,
      })
    }
  }
  return next
}

function overlay(applications, pending) {
  if (!pending.length) return applications
  const byId = new Map(pending.map((item) => [item.applicationId, item.values]))
  return applications.map((app) => (byId.has(app.id) ? { ...app, ...byId.get(app.id) } : app))
}

function errorMessage(error) {
  return error?.userMessage ?? 'We could not read your sheet. Check your connection, then retry.'
}

export function useSheetSource({ enabled, sync: syncImpl = loadSync }) {
  const [config, setConfigState] = useState(() => (enabled ? readStorage(STORAGE_KEYS.sheetConfig) : null))
  const [data, setData] = useState(() => (enabled ? fromStorage(config) : null))
  const [syncState, setSyncState] = useState({ status: 'idle', error: null })
  const [pending, setPendingState] = useState(() => (enabled ? (readStorage(STORAGE_KEYS.pendingWritebacks)?.items ?? []) : []))

  const configRef = useRef(config)
  const pendingRef = useRef(pending)
  const inFlight = useRef(null)
  const writeChain = useRef(Promise.resolve())

  const setConfig = useCallback((next) => {
    configRef.current = next
    setConfigState(next)
    if (next) writeStorage(STORAGE_KEYS.sheetConfig, next)
    else removeStorage(STORAGE_KEYS.sheetConfig)
  }, [])

  const setPending = useCallback((items) => {
    pendingRef.current = items
    setPendingState(items)
    try {
      if (items.length) writeStorage(STORAGE_KEYS.pendingWritebacks, { items })
      else removeStorage(STORAGE_KEYS.pendingWritebacks)
    } catch {
      // Still kept in memory for this session; the Sheets page lists it.
    }
  }, [])

  const runSync = useCallback(
    (override) => {
      const current = override ?? configRef.current
      if (!current) return Promise.resolve({ ok: false, error: 'Connect a sheet first' })
      if (inFlight.current) return inFlight.current

      setSyncState({ status: 'syncing', error: null })
      const promise = (async () => {
        try {
          const mod = await syncImpl()
          const result = await mod.syncSheet(current)
          const next = {
            ...current,
            spreadsheetTitle: result.spreadsheetTitle,
            tabName: result.tabName,
            sheetId: result.sheetId,
            headers: result.headers,
          }
          setConfig(next)
          const applications = overlay(result.applications, pendingRef.current)
          const nextData = {
            applications,
            emailLog: result.emailLog,
            sheet: buildSheet(next, result),
            fromSnapshot: false,
          }
          setData(nextData)
          let snapshotError = null
          if (keepSnapshotEnabled()) {
            try {
              writeSnapshot(next, nextData)
            } catch (error) {
              snapshotError = error.message
            }
          }
          setSyncState({ status: 'idle', error: null })
          return { ok: true, result, snapshotError }
        } catch (error) {
          const message = errorMessage(error)
          setSyncState({ status: 'failed', error: message })
          return { ok: false, error: message, code: error?.code }
        } finally {
          inFlight.current = null
        }
      })()
      inFlight.current = promise
      return promise
    },
    [setConfig, syncImpl],
  )

  /** Setup finished: adds missing tracking headers (already confirmed), saves the config, syncs. */
  const connectSheet = useCallback(
    async ({ spreadsheetId, spreadsheetTitle, tab, columnMap, addHeaders = [] }) => {
      const mod = await syncImpl()
      await mod.addHeaderColumns(spreadsheetId, tab, addHeaders)
      const previous = configRef.current
      const next = {
        spreadsheetId,
        spreadsheetTitle,
        tabName: tab.title,
        sheetId: tab.sheetId,
        columnMap,
        headers: [...tab.headers, ...addHeaders],
        connectedAt: new Date().toISOString(),
      }
      if (!previous || previous.spreadsheetId !== spreadsheetId || previous.sheetId !== tab.sheetId) {
        clearSnapshotStorage()
        setPending([])
      }
      setConfig(next)
      setData({ applications: [], emailLog: [], sheet: buildSheet(next, null), fromSnapshot: false })
      return runSync(next)
    },
    [runSync, setConfig, setPending, syncImpl],
  )

  const saveColumnMap = useCallback(
    (columnMap) => {
      const next = { ...configRef.current, columnMap }
      setConfig(next)
      setData((current) => (current ? { ...current, sheet: { ...current.sheet, columnMap } } : current))
    },
    [setConfig],
  )

  const write = useCallback(
    (updates) => {
      const task = writeChain.current.then(async () => {
        try {
          const mod = await syncImpl()
          const { notFound } = await mod.writeFields(configRef.current, updates)
          if (notFound.length) {
            toast.warning(`${notFound.length} ${notFound.length === 1 ? 'row was' : 'rows were'} not found in your sheet`, {
              description: 'The row may have been deleted or its ID changed. Sync to refresh.',
            })
          }
          return true
        } catch (error) {
          setPending(mergePending(pendingRef.current, updates))
          toast.error("Couldn't save to your sheet", {
            id: 'writeback-failed',
            description: `${error?.userMessage ?? 'Something went wrong.'} The change is kept on this device until you retry from Google Sheets.`,
          })
          return false
        }
      })
      writeChain.current = task
      return task
    },
    [setPending, syncImpl],
  )

  const updateApplications = useCallback(
    (ids, patch) => {
      const set = new Set(ids)
      setData((current) =>
        current
          ? { ...current, applications: current.applications.map((app) => (set.has(app.id) ? { ...app, ...patch } : app)) }
          : current,
      )
      const values = Object.fromEntries(Object.entries(patch).filter(([field]) => WRITABLE_FIELDS.includes(field)))
      if (!Object.keys(values).length || !configRef.current) return Promise.resolve(true)
      return write(ids.map((applicationId) => ({ applicationId, values })))
    },
    [write],
  )

  /** Runs only when the user presses Retry. */
  const retryWritebacks = useCallback(async () => {
    const items = pendingRef.current
    if (!items.length) return { ok: true, count: 0 }
    try {
      const mod = await syncImpl()
      const withValues = items.filter((item) => Object.keys(item.values).length)
      const { notFound } = withValues.length
        ? await mod.writeFields(
            configRef.current,
            withValues.map(({ applicationId, values }) => ({ applicationId, values })),
          )
        : { notFound: [] }
      for (const item of items) {
        if (item.logRow) await mod.appendEmailLog(configRef.current.spreadsheetId, item.logRow)
      }
      setPending([])
      return { ok: true, count: items.length - notFound.length, notFound: notFound.length }
    } catch (error) {
      setPending(pendingRef.current.map((item) => ({ ...item, attempts: (item.attempts ?? 0) + 1 })))
      return { ok: false, error: error?.userMessage ?? 'Something went wrong.' }
    }
  }, [setPending, syncImpl])

  const discardWritebacks = useCallback(() => setPending([]), [setPending])

  const clearSnapshot = useCallback(() => {
    clearSnapshotStorage()
    setData((current) =>
      current?.fromSnapshot
        ? { applications: [], emailLog: [], sheet: buildSheet(configRef.current, null), fromSnapshot: false }
        : current,
    )
  }, [])

  /** Saves what is on screen now, when Keep an offline copy is turned back on. */
  const saveSnapshot = useCallback(() => {
    if (configRef.current && data?.sheet?.syncedAt) writeSnapshot(configRef.current, data)
  }, [data])

  const patchApplications = useCallback((ids, patch) => {
    const set = new Set(ids)
    setData((current) =>
      current
        ? { ...current, applications: current.applications.map((app) => (set.has(app.id) ? { ...app, ...patch } : app)) }
        : current,
    )
  }, [])

  const addEmailLog = useCallback((row) => {
    setData((current) =>
      current ? { ...current, emailLog: [row, ...current.emailLog.filter((item) => item.logId !== row.logId)] } : current,
    )
  }, [])

  const queueSheetWrite = useCallback((updates) => setPending(mergePending(pendingRef.current, updates)), [setPending])

  const actions = useMemo(
    () => ({
      sync: runSync,
      connectSheet,
      saveColumnMap,
      updateApplications,
      patchApplications,
      addEmailLog,
      queueSheetWrite,
      retryWritebacks,
      discardWritebacks,
      clearSnapshot,
    }),
    [runSync, connectSheet, saveColumnMap, updateApplications, patchApplications, addEmailLog, queueSheetWrite, retryWritebacks, discardWritebacks, clearSnapshot],
  )

  let status = 'ready'
  if (config && !data?.sheet?.syncedAt) {
    if (syncState.status === 'syncing') status = 'loading'
    else if (syncState.status === 'failed') status = 'error'
  }

  return { config, data, status, syncState, pending, saveSnapshot, ...actions }
}
