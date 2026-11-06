import { describe, expect, it, vi } from 'vitest'
import { STORAGE_VERSION } from './constants'
import { StorageError, clearAppStorage, readStorage, removeStorage, writeStorage } from './storage'

describe('storage', () => {
  it('round-trips data inside a versioned envelope', () => {
    writeStorage('jaas.settings', { theme: 'dark' })

    expect(JSON.parse(localStorage.getItem('jaas.settings'))).toEqual({
      version: STORAGE_VERSION,
      data: { theme: 'dark' },
    })
    expect(readStorage('jaas.settings')).toEqual({ theme: 'dark' })
  })

  it('returns the fallback for a missing key', () => {
    expect(readStorage('jaas.missing', { a: 1 })).toEqual({ a: 1 })
  })

  it('returns the fallback and removes the key when JSON is corrupt', () => {
    localStorage.setItem('jaas.templates', '{not json')

    expect(readStorage('jaas.templates', [])).toEqual([])
    expect(localStorage.getItem('jaas.templates')).toBeNull()
  })

  it('returns the fallback for a different schema version', () => {
    localStorage.setItem('jaas.settings', JSON.stringify({ version: 999, data: { theme: 'dark' } }))

    expect(readStorage('jaas.settings', 'fallback')).toBe('fallback')
  })

  it('returns the fallback for values not written by writeStorage', () => {
    localStorage.setItem('jaas.settings', JSON.stringify({ theme: 'dark' }))

    expect(readStorage('jaas.settings', null)).toBeNull()
  })

  it('throws a quota StorageError when storage is full', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })

    expect(() => writeStorage('jaas.snapshot', { rows: [] })).toThrow(StorageError)
    try {
      writeStorage('jaas.snapshot', { rows: [] })
    } catch (error) {
      expect(error.reason).toBe('quota')
    }
    spy.mockRestore()
  })

  it('removes a single key', () => {
    writeStorage('jaas.settings', {})
    removeStorage('jaas.settings')

    expect(localStorage.getItem('jaas.settings')).toBeNull()
  })

  it('clears only app-owned keys', () => {
    writeStorage('jaas.settings', {})
    writeStorage('jaas.templates', [])
    localStorage.setItem('other-app', 'keep')

    clearAppStorage()

    expect(localStorage.getItem('jaas.settings')).toBeNull()
    expect(localStorage.getItem('jaas.templates')).toBeNull()
    expect(localStorage.getItem('other-app')).toBe('keep')
  })
})
