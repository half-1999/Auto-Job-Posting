import { describe, expect, it } from 'vitest'
import { sampleSheetCsv, sampleSheetTable } from './sampleSheet'

describe('sample sheet', () => {
  it('has the sheet headers and one sample row', () => {
    const { headers, row } = sampleSheetTable()
    expect(headers).toEqual(expect.arrayContaining(['Company Name', 'Recruiter Email', 'Job Title']))
    expect(row).toHaveLength(headers.length)
    expect(row[headers.indexOf('Application ID')]).toBe('')
    expect(row[headers.indexOf('Recruiter Email')]).toBe('priya@acme.com')
    expect(sampleSheetCsv()).toContain('Acme Corp')
    expect(sampleSheetCsv()).toContain('priya@acme.com')
  })
})
