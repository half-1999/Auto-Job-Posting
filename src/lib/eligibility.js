import { EMAIL_STATUS, SENDING_DEFAULTS } from './constants'
import { isValidEmail } from './validation'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Send gates from docs/DATABASE_SCHEMA.md §3.2.
 * Returns `{ eligible, reason }` for hard exclusions and `{ eligible: true, warning }`
 * for recent contact (shown, but unticked by default).
 */
export function getEligibility(application, { lastSentByEmail = new Map(), now = Date.now(), settings = {} } = {}) {
  const recencyDays = settings.recencyDays ?? SENDING_DEFAULTS.recencyDays
  const allowResend = settings.allowResend ?? SENDING_DEFAULTS.allowResend
  const status = application.emailStatus || EMAIL_STATUS.notSent

  if (status === EMAIL_STATUS.doNotEmail) return { eligible: false, reason: 'Do Not Email' }
  if (status === EMAIL_STATUS.queued) return { eligible: false, reason: 'Already queued' }
  if (!allowResend && status === EMAIL_STATUS.sent) return { eligible: false, reason: 'Already sent' }
  if (!isValidEmail(application.recruiterEmail)) return { eligible: false, reason: 'Invalid email' }

  const last = lastSentByEmail.get(normalizeEmail(application.recruiterEmail))
  if (last) {
    const days = Math.floor((now - new Date(last).getTime()) / DAY_MS)
    if (days < recencyDays) {
      return {
        eligible: true,
        warning: days === 0 ? 'Emailed today' : `Emailed ${days} ${days === 1 ? 'day' : 'days'} ago`,
      }
    }
  }
  return { eligible: true }
}

export function normalizeEmail(email) {
  return (email ?? '').trim().toLowerCase()
}

/** Latest successful send per recipient address, from Email_Log rows. */
export function indexLastSent(logRows) {
  const map = new Map()
  for (const row of logRows) {
    if (row.result !== 'Sent') continue
    const key = normalizeEmail(row.recipient)
    if (!map.has(key) || map.get(key) < row.timestamp) map.set(key, row.timestamp)
  }
  return map
}

/**
 * Splits applications into eligible recipients and exclusions with reasons. Within one
 * campaign each address appears once (recipient gate); later rows for the same address are excluded.
 */
export function partitionRecipients(applications, options) {
  const eligible = []
  const excluded = []
  const seen = new Map()

  for (const application of applications) {
    const result = getEligibility(application, options)
    if (!result.eligible) {
      excluded.push({ application, reason: result.reason })
      continue
    }
    const key = normalizeEmail(application.recruiterEmail)
    if (seen.has(key)) {
      excluded.push({
        application,
        reason: `Same recruiter as ${seen.get(key).companyName}`,
      })
      continue
    }
    seen.set(key, application)
    eligible.push({ application, warning: result.warning ?? null })
  }
  return { eligible, excluded }
}
