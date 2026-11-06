import { describe, expect, it } from 'vitest'
import { bellWavBytes } from './browserNotice'

describe('bellWavBytes', () => {
  it('builds a wav file', () => {
    const bytes = bellWavBytes()
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF')
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe('WAVE')
    expect(bytes.length).toBeGreaterThan(44)
  })
})
