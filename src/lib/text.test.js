import { describe, expect, it } from 'vitest'
import { initials } from './text'

describe('initials', () => {
  it('uses the first two words of a name', () => {
    expect(initials('Priya Raman Iyer')).toBe('PR')
  })

  it('falls back to the local part of the email', () => {
    expect(initials('', 'arjun.mehta@gmail.com')).toBe('AM')
    expect(initials(null, 'sam@example.com')).toBe('S')
  })

  it('returns empty text when nothing is known', () => {
    expect(initials('', '')).toBe('')
  })
})
