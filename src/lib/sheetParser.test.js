import { describe, expect, it } from 'vitest'
import { SYSTEM_FIELDS } from './constants'
import {
  autoMapColumns,
  getMissingRequired,
  getMissingSystemColumns,
  parseSpreadsheetInput,
} from './sheetParser'

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-xy'

describe('parseSpreadsheetInput', () => {
  it('extracts the ID and gid from a full URL', () => {
    expect(
      parseSpreadsheetInput(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=1234`),
    ).toEqual({ id: ID, gid: '1234' })
  })

  it('accepts a bare ID and rejects other input', () => {
    expect(parseSpreadsheetInput(`  ${ID} `)).toEqual({ id: ID, gid: null })
    expect(parseSpreadsheetInput('https://example.com/sheet')).toBeNull()
    expect(parseSpreadsheetInput('')).toBeNull()
  })
})

describe('autoMapColumns', () => {
  it('matches default headers ignoring case, spaces, and underscores', () => {
    const map = autoMapColumns(['company_name', 'RecruiterEmail', 'Job Title', 'Application ID'])
    expect(map).toMatchObject({
      companyName: 'company_name',
      recruiterEmail: 'RecruiterEmail',
      jobTitle: 'Job Title',
      id: 'Application ID',
    })
  })

  it('falls back to aliases and uses each header once', () => {
    const map = autoMapColumns(['Company', 'HR Email', 'Role', 'Status'])
    expect(map).toEqual({
      companyName: 'Company',
      recruiterEmail: 'HR Email',
      jobTitle: 'Role',
      applicationStatus: 'Status',
    })
    expect(getMissingRequired(map)).toEqual([])
  })

  it('lists missing required and system columns', () => {
    const map = autoMapColumns(['Company'])
    expect(getMissingRequired(map)).toEqual(['recruiterEmail', 'jobTitle'])
    expect(getMissingSystemColumns(map, SYSTEM_FIELDS)).toContain('Application ID')
  })
})
