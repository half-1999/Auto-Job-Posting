import { describe, expect, it } from 'vitest'
import { findNavItem, findNavItemByShortcut, MOBILE_TABS, NAV_ITEMS } from './navigation'

describe('navigation config', () => {
  it('has unique ids, paths, and shortcuts', () => {
    for (const key of ['id', 'path', 'shortcut']) {
      const values = NAV_ITEMS.map((item) => item[key])
      expect(new Set(values).size).toBe(values.length)
    }
  })

  it('puts exactly four pages in the mobile tab bar, leaving the fifth slot for Menu', () => {
    expect(MOBILE_TABS.map((tab) => tab.id)).toEqual([
      'dashboard',
      'applications',
      'campaigns',
      'history',
    ])
  })

  it('resolves nested paths to their section and unknown paths to null', () => {
    expect(findNavItem('/').id).toBe('dashboard')
    expect(findNavItem('/applications/abc-123').id).toBe('applications')
    expect(findNavItem('/nope')).toBeNull()
  })

  it('finds items by their G-sequence key', () => {
    expect(findNavItemByShortcut('t').id).toBe('templates')
    expect(findNavItemByShortcut('x')).toBeNull()
  })
})
