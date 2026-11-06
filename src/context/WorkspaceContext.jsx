import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { advanceRun } from '@/features/campaigns/mockRun'
import {
  readSentToday,
  reviveRuns,
  saveRuns,
  saveTemplates,
  writeSentToday,
} from '@/lib/browserData'
import { STORAGE_KEYS } from '@/lib/constants'
import { USE_MOCKS } from '@/lib/mockMode'
import { readStorage } from '@/lib/storage'
import { useOnlineStatus } from '@/pwa/useOnlineStatus'
import { useSheetSource } from './useSheetSource'
import { WorkspaceContext } from './app-contexts'

/**
 * Applications, Email_Log, sheet, and templates for every page.
 * Source "none" (the default) is the real Google Sheet once one is connected (see useSheetSource);
 * until then nothing is connected.
 * Source "mock" (`npm run dev:mock`) loads labeled mock data in memory; nothing is written or sent.
 */
const EMPTY = {
  applications: [],
  emailLog: [],
  sheet: null,
  profile: null,
  resume: null,
  templates: [],
  usage: { sentToday: 0 },
}

const SCENARIO_KEY = 'jaas.mockScenario'

function readScenario() {
  try {
    return sessionStorage.getItem(SCENARIO_KEY) ?? 'populated'
  } catch {
    return 'populated'
  }
}

// The env check is inlined (not USE_MOCKS) so the bundler can drop the mock chunk from normal builds.
const defaultLoader =
  import.meta.env.VITE_USE_MOCKS === 'true' ? () => import('@/mocks/index.js') : null

export function WorkspaceProvider({
  children,
  source = USE_MOCKS ? 'mock' : 'none',
  loadMocks = defaultLoader,
  loadSheetSync,
}) {
  const browserOnline = useOnlineStatus()
  const real = useSheetSource({
    enabled: source === 'none',
    ...(loadSheetSync ? { sync: loadSheetSync } : {}),
  })
  const {
    sync: syncSheet,
    updateApplications: updateSheetRows,
    saveColumnMap: saveSheetColumnMap,
    syncState: sheetSyncState,
    pending: pendingWritebacks,
    connectSheet,
    retryWritebacks,
    discardWritebacks,
    clearSnapshot,
    saveSnapshot,
    patchApplications: patchSheetRows,
    addEmailLog,
    queueSheetWrite,
    config: sheetConfig,
  } = real
  const [scenario, setScenarioState] = useState(() =>
    source === 'mock' ? readScenario() : 'populated',
  )
  const [mockData, setMockData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [runs, setRuns] = useState(() =>
    source === 'none' ? reviveRuns(readStorage(STORAGE_KEYS.campaignQueue)) : {},
  )
  const [storedTemplates, setStoredTemplates] = useState(() =>
    source === 'none' ? (readStorage(STORAGE_KEYS.templates)?.items ?? []) : null,
  )
  const [storedResume, setStoredResume] = useState(null)
  const [sentToday, setSentToday] = useState(() => (source === 'none' ? readSentToday() : 0))
  const loadingRef = useRef(false)

  const load = useCallback(async () => {
    if (source !== 'mock' || !loadMocks || loadingRef.current) return
    loadingRef.current = true
    try {
      const module = await loadMocks()
      setMockData(module.createMockWorkspace(Date.now()))
      setLoadError(null)
    } catch (error) {
      setLoadError(error)
    } finally {
      loadingRef.current = false
    }
  }, [source, loadMocks])

  useEffect(() => {
    if (source === 'mock' && !mockData) load()
  }, [source, mockData, load])

  useEffect(() => {
    if (source !== 'none' || storedTemplates.length) return undefined
    let cancelled = false
    import('@/lib/localData.js').then((mod) => {
      if (!cancelled) setStoredTemplates(mod.loadTemplates())
    })
    return () => {
      cancelled = true
    }
  }, [source, storedTemplates])

  useEffect(() => {
    if (source !== 'none') return undefined
    let cancelled = false
    import('@/lib/fileStore')
      .then((mod) => mod.loadResume())
      .then((saved) => {
        if (!cancelled && saved) setStoredResume(saved)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [source])

  useEffect(() => {
    if (source !== 'none') return
    try {
      saveRuns(runs)
    } catch {
      // The queue stays in memory for this session. The sheet still records sends that finished.
    }
  }, [runs, source])

  const online = browserOnline && scenario !== 'offline'

  let status = 'ready'
  let data = EMPTY
  if (source === 'mock') {
    if (scenario === 'loading' || (!mockData && !loadError)) status = 'loading'
    else if (scenario === 'error' || loadError) status = 'error'
    else if (scenario !== 'empty') data = mockData
  } else if (real.data) {
    status = real.status
    data = { ...EMPTY, ...real.data }
  }

  const update = useCallback((key, fn) => {
    setMockData((current) => (current ? { ...current, [key]: fn(current[key]) } : current))
  }, [])

  const anyMockRunning = Object.values(runs).some(
    (run) => run.mock !== false && run.status === 'running',
  )
  useEffect(() => {
    if (!anyMockRunning) return undefined
    const tick = () =>
      setRuns((current) => {
        let changed = false
        const next = {}
        for (const [id, run] of Object.entries(current)) {
          if (run.mock === false) {
            next[id] = run
            continue
          }
          next[id] = advanceRun(run, Date.now(), { online })
          if (next[id] !== run) changed = true
        }
        return changed ? next : current
      })
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [anyMockRunning, online])

  const actions = useMemo(
    () => ({
      setScenario: (next) => {
        setScenarioState(next)
        try {
          sessionStorage.setItem(SCENARIO_KEY, next)
        } catch {
          // Scenario choice is a dev convenience only.
        }
      },
      reload: () => {
        setMockData(null)
        return load()
      },
      updateApplications: (ids, patch) => {
        const set = new Set(ids)
        update('applications', (apps) =>
          apps.map((app) => (set.has(app.id) ? { ...app, ...patch } : app)),
        )
      },
      saveTemplate: (template) =>
        update('templates', (items) =>
          items.map((item) =>
            item.id === template.id
              ? { ...item, ...template, updatedAt: new Date().toISOString() }
              : item,
          ),
        ),
      createTemplate: (template) => {
        const now = new Date().toISOString()
        const created = {
          id: crypto.randomUUID(),
          isDefault: false,
          createdAt: now,
          updatedAt: now,
          ...template,
        }
        update('templates', (items) => [...items, created])
        return created
      },
      deleteTemplate: (id) =>
        update('templates', (items) => items.filter((item) => item.id !== id)),
      importTemplates: (items) => {
        const now = new Date().toISOString()
        const created = items.map((item) => ({
          id: crypto.randomUUID(),
          isDefault: false,
          createdAt: now,
          updatedAt: now,
          ...item,
        }))
        update('templates', (current) => [...current, ...created])
        return created.length
      },
      patchApplications: (ids, patch) => {
        const set = new Set(ids)
        update('applications', (apps) =>
          apps.map((app) => (set.has(app.id) ? { ...app, ...patch } : app)),
        )
      },
      restoreTemplate: (template, index) =>
        update('templates', (items) => {
          const next = items.filter((item) => item.id !== template.id)
          next.splice(Math.min(index, next.length), 0, template)
          return next
        }),
      saveColumnMap: (columnMap) => update('sheet', (sheet) => ({ ...sheet, columnMap })),
      setResume: (resume) => setMockData((current) => (current ? { ...current, resume } : current)),
      saveRun: (run) => setRuns((current) => ({ ...current, [run.id]: run })),
      updateRun: (id, fn) =>
        setRuns((current) => (current[id] ? { ...current, [id]: fn(current[id]) } : current)),
    }),
    [load, update],
  )

  const changeTemplates = useCallback(
    (fn) => {
      const next = fn(storedTemplates ?? [])
      setStoredTemplates(next)
      try {
        saveTemplates(next)
      } catch (error) {
        toast.error("Couldn't save templates", { description: error.message })
      }
      return next
    },
    [storedTemplates],
  )

  const sheetActions = useMemo(
    () =>
      source === 'mock'
        ? {}
        : {
            reload: () => syncSheet(),
            updateApplications: updateSheetRows,
            saveColumnMap: saveSheetColumnMap,
            patchApplications: patchSheetRows,
            addEmailLog,
            queueSheetWrite,
            saveTemplate: (template) =>
              changeTemplates((items) =>
                items.map((item) =>
                  item.id === template.id
                    ? { ...item, ...template, updatedAt: new Date().toISOString() }
                    : item,
                ),
              ),
            createTemplate: (template) => {
              const now = new Date().toISOString()
              const created = {
                id: crypto.randomUUID(),
                isDefault: false,
                createdAt: now,
                updatedAt: now,
                ...template,
              }
              changeTemplates((items) => [...items, created])
              return created
            },
            deleteTemplate: (id) =>
              changeTemplates((items) => items.filter((item) => item.id !== id)),
            restoreTemplate: (template, index) =>
              changeTemplates((items) => {
                const next = items.filter((item) => item.id !== template.id)
                next.splice(Math.min(index, next.length), 0, template)
                return next
              }),
            importTemplates: (items) => {
              const now = new Date().toISOString()
              changeTemplates((current) => [
                ...current,
                ...items.map((item) => ({
                  id: crypto.randomUUID(),
                  isDefault: false,
                  createdAt: now,
                  updatedAt: now,
                  ...item,
                })),
              ])
              return items.length
            },
            setResume: async (next) => {
              const store = await import('@/lib/fileStore')
              if (!next) {
                await store.clearResume()
                setStoredResume(null)
                return
              }
              await store.saveResume(next)
              setStoredResume(next)
            },
            noteSent: () =>
              setSentToday((count) => {
                const next = count + 1
                try {
                  writeSentToday(next)
                } catch {
                  // The in-memory count still stops the run at the daily cap.
                }
                return next
              }),
          },
    [
      source,
      syncSheet,
      updateSheetRows,
      saveSheetColumnMap,
      patchSheetRows,
      addEmailLog,
      queueSheetWrite,
      changeTemplates,
    ],
  )

  const value = useMemo(
    () => ({
      source,
      isMock: source === 'mock',
      scenario,
      status,
      online,
      error:
        status === 'error'
          ? source === 'mock'
            ? 'We could not read your sheet. Check your connection, then retry.'
            : sheetSyncState.error
          : null,
      connected: Boolean(data.sheet),
      ...data,
      ...(source === 'none'
        ? { templates: storedTemplates ?? [], resume: storedResume, usage: { sentToday } }
        : {}),
      runs,
      sheetConfig: source === 'none' ? sheetConfig : null,
      ...actions,
      ...sheetActions,
      syncState:
        source === 'mock'
          ? { status: status === 'loading' ? 'syncing' : 'idle', error: null }
          : sheetSyncState,
      pendingWritebacks,
      connectSheet,
      retryWritebacks,
      discardWritebacks,
      clearSnapshot,
      saveSnapshot,
    }),
    [
      source,
      scenario,
      status,
      online,
      data,
      runs,
      actions,
      sheetActions,
      sheetSyncState,
      pendingWritebacks,
      connectSheet,
      retryWritebacks,
      discardWritebacks,
      clearSnapshot,
      saveSnapshot,
      storedTemplates,
      storedResume,
      sentToday,
      sheetConfig,
    ],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
