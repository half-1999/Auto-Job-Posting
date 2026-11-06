export const APP_NAME = 'JobApply'

export const STORAGE_PREFIX = 'jaas.'
export const STORAGE_VERSION = 1

export const STORAGE_KEYS = {
  settings: 'jaas.settings',
  sheetConfig: 'jaas.sheetConfig',
  templates: 'jaas.templates',
  snapshot: 'jaas.snapshot',
  campaignQueue: 'jaas.campaignQueue',
  pendingWritebacks: 'jaas.pendingWritebacks',
  dailySendCount: 'jaas.dailySendCount',
  authHint: 'jaas.auth.hint',
  authSession: 'jaas.auth.session',
  theme: 'jaas.theme',
  logSnapshot: 'jaas.logSnapshot',
  notifications: 'jaas.notifications',
  ui: 'jaas.ui',
}

export const NOTIFICATION_LIMIT = 50

/** Mirrors the `z-*` values used in components (docs/UI_UX_PLAN.md §2.8). */
export const Z_INDEX = {
  sticky: 10,
  header: 20,
  bottomBar: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
}

/** `<meta name="theme-color">` values, matching `--canvas` in each theme. */
export const THEME_COLORS = {
  light: '#f6f6f8',
  dark: '#08080a',
}

export const GOOGLE_SCOPES = {
  openid: 'openid',
  email: 'email',
  profile: 'profile',
  sheets: 'https://www.googleapis.com/auth/spreadsheets',
  gmailSend: 'https://www.googleapis.com/auth/gmail.send',
  gmailMetadata: 'https://www.googleapis.com/auth/gmail.metadata',
}

export const BASE_SCOPES = [
  GOOGLE_SCOPES.openid,
  GOOGLE_SCOPES.email,
  GOOGLE_SCOPES.profile,
  GOOGLE_SCOPES.sheets,
  GOOGLE_SCOPES.gmailSend,
]

export const APPLICATION_STATUS = {
  notApplied: 'Not Applied',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  onHold: 'On Hold',
}

export const EMAIL_STATUS = {
  notSent: 'Not Sent',
  queued: 'Queued',
  sent: 'Sent',
  failed: 'Failed',
  bounced: 'Bounced',
  doNotEmail: 'Do Not Email',
}

export const REPLY_STATUS = {
  notChecked: 'Not Checked',
  noReply: 'No Reply',
  replied: 'Replied',
  autoReply: 'Auto-Reply',
  bounced: 'Bounced',
  uncertain: 'Uncertain',
}

/** Campaign queue item states (local only, never written to the sheet). */
export const QUEUE_STATUS = {
  pending: 'pending',
  sending: 'sending',
  sent: 'sent',
  failed: 'failed',
  skipped: 'skipped',
}

/** App field → default sheet header. Order is the order used when the app adds missing columns. */
export const SHEET_COLUMNS = {
  id: 'Application ID',
  companyName: 'Company Name',
  recruiterName: 'Recruiter Name',
  recruiterEmail: 'Recruiter Email',
  jobTitle: 'Job Title',
  jobLink: 'Job Link',
  templateName: 'Template Name',
  applicationStatus: 'Application Status',
  emailStatus: 'Email Status',
  sentDate: 'Sent Date',
  gmailMessageId: 'Gmail Message ID',
  threadId: 'Thread ID',
  replyStatus: 'Reply Status',
  replyDate: 'Reply Date',
  lastError: 'Last Error',
  notes: 'Notes',
}

export const REQUIRED_FIELDS = ['companyName', 'recruiterEmail', 'jobTitle']

export const SYSTEM_FIELDS = [
  'id',
  'emailStatus',
  'sentDate',
  'gmailMessageId',
  'threadId',
  'replyStatus',
  'replyDate',
  'lastError',
]

export const EMAIL_LOG_SHEET = 'Email_Log'

export const SENDING_DEFAULTS = {
  delaySeconds: 20,
  dailyCap: 50,
  maxDailyCap: 400,
  allowResend: false,
  recencyDays: 14,
}

export const RESUME_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  mimeType: 'application/pdf',
}
