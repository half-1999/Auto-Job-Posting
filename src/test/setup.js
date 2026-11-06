import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom has no layout engine. Tests run as a 1280 px wide, mouse-driven desktop unless they override this.
if (!window.matchMedia) {
  window.matchMedia = (query) => {
    const minWidth = /min-width:\s*(\d+)px/.exec(query)
    const maxWidth = /max-width:\s*(\d+)px/.exec(query)
    const width = window.__TEST_VIEWPORT_WIDTH__ ?? 1280
    let matches = false
    if (minWidth) matches = width >= Number(minWidth[1])
    else if (maxWidth) matches = width <= Number(maxWidth[1])
    else if (query.includes('pointer: fine')) matches = true
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }
  }
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
if (!window.scrollTo || window.scrollTo.toString().includes('notImplemented')) window.scrollTo = () => {}

afterEach(async () => {
  cleanup()
  window.localStorage.clear()
  const { clearToken } = await import('@/services/tokenStore')
  clearToken()
})
