import { SHEET_COLUMNS } from './constants'
import { toCsv } from './csv'

/** One example application. Application ID is blank so the app assigns it on sync. */
const SAMPLE_VALUES = {
  id: '',
  companyName: 'Acme Corp',
  recruiterName: 'Priya Sharma',
  recruiterEmail: 'priya@acme.com',
  jobTitle: 'Frontend Engineer',
  jobLink: 'https://acme.com/jobs/42',
  templateName: '',
  applicationStatus: 'Not Applied',
  emailStatus: 'Not Sent',
  sentDate: '',
  gmailMessageId: '',
  threadId: '',
  replyStatus: '',
  replyDate: '',
  lastError: '',
  notes: 'Sample row. Replace this with a real application.',
}

export const SAMPLE_SHEET_TITLE = 'JobApply sample'
export const SAMPLE_TAB_TITLE = 'Applications'

export function sampleSheetTable() {
  const headers = Object.values(SHEET_COLUMNS)
  const row = Object.keys(SHEET_COLUMNS).map((field) => SAMPLE_VALUES[field])
  return { headers, row }
}

export function sampleSheetCsv() {
  const { headers, row } = sampleSheetTable()
  const columns = headers.map((label, index) => ({ label, value: (record) => record[index] }))
  return toCsv([row], columns)
}
