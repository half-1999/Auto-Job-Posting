import { beforeEach, describe, expect, it, vi } from 'vitest'

const UA = {
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  ipadDesktop:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  macSafari16:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  firefoxAndroid: 'Mozilla/5.0 (Android 15; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0',
  firefoxDesktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  androidWebView:
    'Mozilla/5.0 (Linux; Android 15; Pixel 9; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36',
}

function fakeWindow({ userAgent = UA.chromeWindows, maxTouchPoints = 0, standalone = false } = {}) {
  const target = new EventTarget()
  const media = new EventTarget()
  media.matches = standalone
  target.navigator = { userAgent, maxTouchPoints }
  target.matchMedia = () => media
  return { win: target, media }
}

function promptEvent(outcome) {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  event.prompt = vi.fn(() => Promise.resolve())
  event.userChoice = Promise.resolve({ outcome })
  return event
}

let mod
beforeEach(async () => {
  vi.resetModules()
  mod = await import('./installPrompt')
})

describe('detectPlatform and baseState', () => {
  it.each([
    ['chromeWindows', 0, 'chromium', 'manual'],
    ['chromeAndroid', 5, 'chromium', 'manual'],
    ['iphone', 5, 'ios', 'ios-instructions'],
    ['ipadDesktop', 5, 'ios', 'ios-instructions'],
    ['macSafari', 0, 'macos-safari', 'manual'],
    ['macSafari16', 0, 'unsupported', 'unsupported'],
    ['firefoxAndroid', 5, 'firefox-android', 'manual'],
    ['firefoxDesktop', 0, 'firefox-desktop', 'unsupported'],
    ['androidWebView', 5, 'in-app', 'unsupported'],
  ])('%s', (key, maxTouchPoints, platform, status) => {
    expect(mod.detectPlatform({ userAgent: UA[key], maxTouchPoints })).toBe(platform)
    expect(mod.baseState(platform, false)).toBe(status)
  })

  it('reports installed when already running standalone', () => {
    expect(mod.baseState('chromium', true)).toBe('installed')
    expect(mod.baseState('ios', true)).toBe('installed')
  })
})

describe('install store', () => {
  it('captures beforeinstallprompt, then accept leads to pending and appinstalled', async () => {
    const { win } = fakeWindow()
    mod.captureInstallEvents(win)
    expect(mod.getInstallState().status).toBe('manual')

    const event = promptEvent('accepted')
    win.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(mod.getInstallState().status).toBe('available')
    expect(mod.canOfferInstall('available')).toBe(true)

    await expect(mod.promptInstall()).resolves.toBe('accepted')
    expect(event.prompt).toHaveBeenCalledOnce()
    expect(mod.getInstallState().status).toBe('pending')

    const installed = vi.fn()
    mod.onAppInstalled(installed)
    win.dispatchEvent(new Event('appinstalled'))
    expect(mod.getInstallState().status).toBe('installed')
    expect(installed).toHaveBeenCalledOnce()
    expect(mod.canOfferInstall('installed')).toBe(false)
  })

  it('falls back to browser-menu steps after a dismissal, and the spent event is not reused', async () => {
    const { win } = fakeWindow()
    mod.captureInstallEvents(win)
    win.dispatchEvent(promptEvent('dismissed'))

    await expect(mod.promptInstall()).resolves.toBe('dismissed')
    expect(mod.getInstallState()).toMatchObject({ status: 'manual', dismissed: true })
    await expect(mod.promptInstall()).resolves.toBe('unavailable')
  })

  it('starts installed in standalone mode and ignores later prompt events', () => {
    const { win } = fakeWindow({ standalone: true })
    mod.captureInstallEvents(win)
    win.dispatchEvent(promptEvent('accepted'))
    expect(mod.getInstallState().status).toBe('installed')
  })

  it('switches to installed when the display mode changes to standalone', () => {
    const { win, media } = fakeWindow()
    mod.captureInstallEvents(win)
    const change = new Event('change')
    change.matches = true
    media.dispatchEvent(change)
    expect(mod.getInstallState().status).toBe('installed')
  })

  it('gives iOS and iPadOS instructions, never a prompt', async () => {
    const { win } = fakeWindow({ userAgent: UA.ipadDesktop, maxTouchPoints: 5 })
    mod.captureInstallEvents(win)
    expect(mod.getInstallState()).toMatchObject({ status: 'ios-instructions', platform: 'ios' })
    await expect(mod.promptInstall()).resolves.toBe('unavailable')
  })

  it('hides install where the browser cannot install', () => {
    const { win } = fakeWindow({ userAgent: UA.firefoxDesktop })
    mod.captureInstallEvents(win)
    expect(mod.getInstallState().status).toBe('unsupported')
    expect(mod.canOfferInstall('unsupported')).toBe(false)
  })
})
