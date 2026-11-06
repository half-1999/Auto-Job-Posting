import { STORAGE_KEYS } from './constants'
import { readStorage, removeStorage, writeStorage } from './storage'

export function saveTemplates(items) {
  writeStorage(STORAGE_KEYS.templates, { items })
}

/**
 * A campaign that was running when the page closed comes back paused and asks before it
 * continues (AC-12, AC-19). A send that was in flight is not retried: the result is unknown.
 */
export function reviveRuns(stored) {
  const runs = {}
  for (const [id, run] of Object.entries(stored?.campaigns ?? {})) {
    if (!run || run.status === 'done' || run.status === 'cancelled') continue
    runs[id] = {
      ...run,
      mock: false,
      status: 'paused',
      pausedReason: 'reload',
      needsConfirm: true,
      items: (run.items ?? []).map((item) =>
        item.status === 'sending'
          ? { ...item, status: 'unknown', error: 'The page reloaded during this send, so it was not retried.' }
          : item,
      ),
    }
  }
  return runs
}

export function saveRuns(runs) {
  const campaigns = Object.fromEntries(
    Object.entries(runs).filter(([, run]) => run.mock === false && run.status !== 'done' && run.status !== 'cancelled'),
  )
  if (!Object.keys(campaigns).length) removeStorage(STORAGE_KEYS.campaignQueue)
  else writeStorage(STORAGE_KEYS.campaignQueue, { campaigns })
}

const dayKey = (now) => now.toISOString().slice(0, 10)

export function readSentToday(now = new Date()) {
  const data = readStorage(STORAGE_KEYS.dailySendCount)
  return data?.date === dayKey(now) ? data.count : 0
}

export function writeSentToday(count, now = new Date()) {
  writeStorage(STORAGE_KEYS.dailySendCount, { date: dayKey(now), count })
}
