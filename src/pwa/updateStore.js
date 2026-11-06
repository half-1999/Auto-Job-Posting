/**
 * Update state shared between the lazily loaded service worker hook and the rest of the UI
 * (Settings → About, the notification center). Nothing here reloads on its own.
 */

let state = { needRefresh: false, apply: null }
const listeners = new Set()

export function setUpdateState(patch) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

export function subscribeUpdate(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getUpdateState() {
  return state
}

/** The app never reloads mid-send: Reload waits until no campaign is running. */
export function getUpdateAction({ needRefresh, sending }) {
  if (!needRefresh) return null
  return sending
    ? { canReload: false, message: 'Update ready. Reload after sending finishes.' }
    : { canReload: true, message: 'A new version is available.' }
}

export function isSending(runs) {
  return Object.values(runs ?? {}).some((run) => run.status === 'running')
}

/** Work waiting after reconnection. Each item is resumed only from its own page, never automatically. */
export function describePendingWork(runs) {
  return Object.values(runs ?? {})
    .filter((run) => run.status === 'paused' && run.pausedReason === 'offline')
    .map((run) => ({
      id: run.id,
      label: `${run.templateName ?? 'A campaign'} is paused`,
      path: `/campaigns/${run.id}`,
    }))
}
