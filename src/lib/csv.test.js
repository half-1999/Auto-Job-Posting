import { describe, expect, it } from 'vitest'
import { toCsv, withCsvBom } from './csv'

describe('toCsv', () => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'note', label: 'Note' },
  ]

  it('quotes commas, quotes, and newlines', () => {
    expect(toCsv([{ name: 'Acme, Inc', note: 'said "hi"\nthen left' }], columns)).toBe(
      'Name,Note\r\n"Acme, Inc","said ""hi""\nthen left"',
    )
  })

  it('neutralizes formula-like cells and writes empty values', () => {
    expect(toCsv([{ name: '=HYPERLINK("x")', note: null }], columns)).toBe(
      'Name,Note\r\n"\'=HYPERLINK(""x"")",',
    )
  })

  it('AC-14: prefixes a UTF-8 BOM once', () => {
    expect(withCsvBom('Name\r\nAcme')).toBe('\uFEFFName\r\nAcme')
    expect(withCsvBom('\uFEFFName')).toBe('\uFEFFName')
  })

  it('supports computed columns', () => {
    expect(toCsv([{ a: 2 }], [{ label: 'Double', value: (row) => row.a * 2 }])).toBe('Double\r\n4')
  })
})
