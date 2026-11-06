/**
 * Install state machine (PWA_STRATEGY §4). Pure functions plus a tiny store that holds the
 * deferred `beforeinstallprompt` event. `captureInstallEvents` runs in main.jsx before React
 * renders so an early event is never missed.
 *
 * States: available, pending, installed, ios-instructions, manual, unsupported.
 */

const IN_APP_BROWSER = /FBAN|FBAV|Instagram|LinkedInApp|Line\/|GSA\/|; wv\)/

/** Which install path this browser offers. Never promises a prompt where none exists. */
export function detectPlatform({ userAgent = '', maxTouchPoints = 0 } = {}) {
  const ua = userAgent
  const isIpadDesktopUa = /Macintosh/.test(ua) && maxTouchPoints > 1
  if (IN_APP_BROWSER.test(ua)) return 'in-app'
  if (/iPhone|iPad|iPod/.test(ua) || isIpadDesktopUa) return 'ios'
  if (/Android/.test(ua) && /Firefox/.test(ua)) return 'firefox-android'
  if (/Firefox/.test(ua)) return 'firefox-desktop'
  if (/Chrome|Chromium|CriOS|Edg\/|OPR\/|SamsungBrowser/.test(ua)) return 'chromium'
  if (/Macintosh/.test(ua) && /Safari/.test(ua)) {
    const version = Number(/Version\/(\d+)/.exec(ua)?.[1] ?? 0)
    return version >= 17 ? 'macos-safari' : 'unsupported'
  }
  return 'unsupported'
}

/** State with no deferred event: the fallback for each platform. */
export function baseState(platform, standalone) {
  if (standalone) return 'installed'
  switch (platform) {
    case 'ios':
      return 'ios-instructions'
    case 'macos-safari':
    case 'firefox-android':
    case 'chromium':
      return 'manual'
    default:
      return 'unsupported'
  }
}

/**
 * `prompt()` can be used once per event. After a dismissal Chromium may not fire a new event for a
 * while, so the state falls back to the browser-menu instructions instead of a dead button.
 */
export function reduceInstall(state, action) {
  switch (action.type) {
    case 'event':
      return state.status === 'installed' ? state : { ...state, status: 'available' }
    case 'accepted':
      return { ...state, status: 'pending' }
    case 'dismissed':
      return { ...state, status: baseState(state.platform, false), dismissed: true }
    case 'installed':
      return { ...state, status: 'installed' }
    default:
      return state
  }
}

/** States where the profile menu, drawer, and palette offer "Install app". */
export function canOfferInstall(status) {
  return status === 'available' || status === 'ios-instructions' || status === 'manual'
}

let state = { status: 'unsupported', platform: 'unsupported', dismissed: false }
let deferredEvent = null
const listeners = new Set()
const installedListeners = new Set()

function set(next) {
  if (next === state) return
  state = next
  listeners.forEach((listener) => listener())
}

function isStandalone(win) {
  return Boolean(
    win.matchMedia?.('(display-mode: standalone)').matches || win.navigator.standalone === true,
  )
}

export function captureInstallEvents(win = window) {
  const platform = detectPlatform({
    userAgent: win.navigator.userAgent,
    maxTouchPoints: win.navigator.maxTouchPoints,
  })
  set({ status: baseState(platform, isStandalone(win)), platform, dismissed: false })

  win.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredEvent = event
    set(reduceInstall(state, { type: 'event' }))
  })
  win.addEventListener('appinstalled', () => {
    deferredEvent = null
    set(reduceInstall(state, { type: 'installed' }))
    installedListeners.forEach((listener) => listener())
  })
  win.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', (event) => {
    if (event.matches) set(reduceInstall(state, { type: 'installed' }))
  })
}

export async function promptInstall() {
  const event = deferredEvent
  if (!event) return 'unavailable'
  deferredEvent = null
  await event.prompt()
  const { outcome } = await event.userChoice
  set(reduceInstall(state, { type: outcome === 'accepted' ? 'accepted' : 'dismissed' }))
  return outcome
}

export function subscribeInstall(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function onAppInstalled(listener) {
  installedListeners.add(listener)
  return () => installedListeners.delete(listener)
}

export function getInstallState() {
  return state
}
