import { describe, expect, it } from 'vitest'
import { selectRange } from './selection'

const ids = ['a', 'b', 'c', 'd', 'e']

describe('selectRange', () => {
  it('selects every row between the anchor and the target, in either direction', () => {
    expect(selectRange(ids, 'b', 'd', true, {})).toEqual({ b: true, c: true, d: true })
    expect(selectRange(ids, 'd', 'b', true, { a: true })).toEqual({ a: true, b: true, c: true, d: true })
  })

  it('clears the range when the target is being unselected', () => {
    expect(selectRange(ids, 'a', 'c', false, { a: true, b: true, c: true, e: true })).toEqual({ e: true })
  })

  it('changes only the target when the anchor is not in view', () => {
    expect(selectRange(ids, 'zz', 'c', true, {})).toEqual({ c: true })
  })
})
