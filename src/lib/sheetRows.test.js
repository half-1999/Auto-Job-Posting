import { describe, expect, it } from 'vitest'
import { dedupeKey, normalizeText, normalizeUrl } from './dedupe'
import { a1, columnLetter, parseApplications, parseEmailLog } from './sheetRows'

const HEADERS = ['Company', 'HR Email', 'Role', 'Job Link', 'Application ID', 'Email Status', 'Status']
const MAP = {
  companyName: 'Company',
  recruiterEmail: 'HR Email',
  jobTitle: 'Role',
  jobLink: 'Job Link',
  id: 'Application ID',
  emailStatus: 'Email Status',
  applicationStatus: 'Status',
}

let counter = 0
const makeId = () => `new-${(counter += 1)}`

describe('columnLetter and a1', () => {
  it('converts indexes to letters', () => {
    expect(columnLetter(0)).toBe('A')
    expect(columnLetter(25)).toBe('Z')
    expect(columnLetter(26)).toBe('AA')
    expect(columnLetter(701)).toBe('ZZ')
    expect(columnLetter(702)).toBe('AAA')
  })

  it('always quotes tab names and doubles inner quotes', () => {
    expect(a1('Applications', '1:1')).toBe("'Applications'!1:1")
    expect(a1("Bob's Jobs", 'A2')).toBe("'Bob''s Jobs'!A2")
    expect(a1('Job Hunt')).toBe("'Job Hunt'")
  })
})

describe('dedupe', () => {
  it('normalizes text and URLs per the schema', () => {
    expect(normalizeText('  Acme   Corp. ')).toBe('acme corp')
    expect(normalizeUrl('https://www.Acme.com/jobs/1/?utm_source=x&ref=y#apply')).toBe('acme.com/jobs/1')
    expect(normalizeUrl('acme.com/jobs/1?id=4&trk=z')).toBe('acme.com/jobs/1?id=4')
  })

  it('falls back to the job title when there is no link', () => {
    const a = dedupeKey({ recruiterEmail: 'A@x.com', companyName: 'Acme', jobTitle: 'Engineer', jobLink: '' })
    const b = dedupeKey({ recruiterEmail: 'a@x.com ', companyName: 'acme', jobTitle: 'engineer.', jobLink: '' })
    expect(a).toBe(b)
  })
})

describe('parseApplications', () => {
  it('AC-4: 100 rows with 5 invalid emails and 3 duplicates import 92', () => {
    const rows = []
    for (let i = 0; i < 100; i += 1) {
      rows.push([`Company ${i}`, `hr${i}@company${i}.com`, 'Engineer', `https://company${i}.com/jobs/${i}`, '', '', ''])
    }
    for (const i of [3, 17, 40, 66, 90]) rows[i][1] = i % 2 ? 'hr@nodomain' : 'not an email'
    rows[10] = [...rows[5]]
    rows[20] = [...rows[6]]
    rows[30] = [...rows[7]]
    rows[30][3] = 'https://www.company7.com/jobs/7/?utm_campaign=z'

    const result = parseApplications([HEADERS, ...rows], MAP, { makeId })
    expect(result.summary).toEqual({ total: 100, imported: 92, skipped: 3, invalid: 5 })
    expect(result.skippedRows.map((row) => row.reason)).toEqual([
      'Duplicate of row 7',
      'Duplicate of row 8',
      'Duplicate of row 9',
    ])
    expect(result.invalidRows.every((row) => row.reason === 'Email address is not valid')).toBe(true)
    expect(result.idAssignments).toHaveLength(92)
  })

  it('keeps existing IDs, assigns new ones, and skips duplicated IDs', () => {
    const result = parseApplications(
      [
        HEADERS,
        ['Acme', 'a@acme.com', 'Engineer', '', 'id-1', 'sent', 'interviewing'],
        ['Globex', 'b@globex.com', 'Designer', '', '', '', 'weird'],
        ['Initech', 'c@initech.com', 'PM', '', 'id-1', '', ''],
        ['', '', '', '', '', '', ''],
        ['Hooli', '', 'Engineer', '', '', '', ''],
      ],
      MAP,
      { makeId: () => 'fresh' },
    )
    expect(result.applications.map((app) => app.id)).toEqual(['id-1', 'fresh'])
    expect(result.applications[0]).toMatchObject({ emailStatus: 'Sent', applicationStatus: 'Interviewing', rowNumber: 2 })
    expect(result.applications[1]).toMatchObject({ emailStatus: 'Not Sent', applicationStatus: 'Not Applied' })
    expect(result.idAssignments).toEqual([{ row: 3, id: 'fresh' }])
    expect(result.skippedRows).toEqual([{ row: 4, reason: 'Duplicate ID of row 2. Clear the ID cell to re-assign.' }])
    expect(result.invalidRows).toEqual([{ row: 6, value: '', reason: 'Recruiter email missing' }])
    expect(result.summary.total).toBe(4)
  })

  it('rejects lists of addresses', () => {
    const result = parseApplications([HEADERS, ['Acme', 'a@acme.com; b@acme.com', 'Engineer']], MAP)
    expect(result.invalidRows[0].reason).toBe('Use one email address per row')
  })
})

describe('parseEmailLog', () => {
  it('finds columns by header and sorts newest first', () => {
    const rows = parseEmailLog([
      ['Timestamp', 'Log ID', 'Recipient Email', 'Result', 'Application ID'],
      ['2026-11-01T10:00:00Z', 'l1', 'a@x.com', 'Sent', 'id-1'],
      ['2026-11-03T10:00:00+05:30', 'l2', 'b@x.com', 'Failed', 'id-2'],
      ['', '', '', '', ''],
    ])
    expect(rows.map((row) => row.logId)).toEqual(['l2', 'l1'])
    expect(rows[1]).toMatchObject({ recipient: 'a@x.com', result: 'Sent', applicationId: 'id-1', subject: '' })
  })
})
