import {
  APPLICATION_STATUS as AS,
  EMAIL_STATUS as ES,
  REPLY_STATUS as RS,
  SHEET_COLUMNS,
} from '@/lib/constants'
import { DEFAULT_TEMPLATES } from '@/lib/defaultTemplates'
import { autoMapColumns } from '@/lib/sheetParser'
import { renderEmail } from '@/lib/templateEngine'
import { COMPANIES, FAILURE_REASONS, NOTES, RECRUITERS, ROLES } from './data'

const MIN = 60_000
const DAY = 24 * 60 * MIN

/** mulberry32: small seeded PRNG so the mock data is identical on every load. */
function createRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hex = (random, length) =>
  Array.from({ length }, () => Math.floor(random() * 16).toString(16)).join('')

const uuid = (random) =>
  `${hex(random, 8)}-${hex(random, 4)}-4${hex(random, 3)}-a${hex(random, 3)}-${hex(random, 12)}`

/** Category counts; the order of rows is shuffled. Total 128. */
const CATEGORIES = [
  ['not-contacted', 50],
  ['do-not-email', 3],
  ['awaiting', 52],
  ['auto-reply', 2],
  ['replied', 15],
  ['failed', 3],
  ['uncertain', 2],
  ['bounced', 1],
]

export const MOCK_PROFILE = {
  name: 'Ananya Rao',
  email: 'ananya.rao@gmail.com',
  phone: '+91 98450 12345',
  linkedin: 'linkedin.com/in/ananya-rao',
  portfolio: 'ananyarao.dev',
}

export function createMockWorkspace(nowInput = Date.now()) {
  const now = typeof nowInput === 'number' ? nowInput : nowInput.getTime()
  const random = createRandom(20261104)
  const pick = (list) => list[Math.floor(random() * list.length)]

  const categories = CATEGORIES.flatMap(([name, count]) => Array(count).fill(name))
  for (let i = categories.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[categories[i], categories[j]] = [categories[j], categories[i]]
  }

  const applications = categories.map((category, index) => {
    const [companyName, domain] = COMPANIES[index % COMPANIES.length]
    const missingName = category === 'not-contacted' && index % 17 === 3
    const recruiterName = missingName ? '' : RECRUITERS[(index * 7) % RECRUITERS.length]
    const local = recruiterName
      ? recruiterName.toLowerCase().replace(/\s+/g, '.')
      : 'careers'
    const jobTitle = ROLES[(index * 5) % ROLES.length]
    return {
      id: uuid(random),
      rowNumber: index + 2,
      category,
      companyName,
      recruiterName,
      recruiterEmail: `${local}@${domain}`,
      jobTitle,
      jobLink: `https://${domain}/careers/${1000 + Math.floor(random() * 9000)}`,
      templateName: '',
      applicationStatus: AS.notApplied,
      emailStatus: ES.notSent,
      sentDate: '',
      gmailMessageId: '',
      threadId: '',
      replyStatus: RS.notChecked,
      replyDate: '',
      lastError: '',
      notes: random() < 0.25 ? pick(NOTES) : '',
    }
  })

  for (const app of applications) {
    if (app.category === 'do-not-email') app.emailStatus = ES.doNotEmail
    if (app.category === 'not-contacted' && random() < 0.2) app.applicationStatus = AS.applied
  }
  applications.find((app) => app.category === 'not-contacted' && app.applicationStatus === AS.notApplied).applicationStatus = AS.withdrawn

  // Campaigns: one roughly every week for 12 weeks, growing in size; the latest is 2 days ago.
  const contacted = applications.filter((app) => !['not-contacted', 'do-not-email'].includes(app.category))
  const sizes = [3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 9]
  sizes.push(contacted.length - sizes.reduce((a, b) => a + b, 0))
  const templateFor = (weekIndex) =>
    weekIndex % 5 === 2 ? DEFAULT_TEMPLATES[1] : weekIndex % 7 === 4 ? DEFAULT_TEMPLATES[2] : DEFAULT_TEMPLATES[0]

  const emailLog = []
  let cursor = 0
  sizes.forEach((size, weekIndex) => {
    const weeksAgo = sizes.length - 1 - weekIndex
    const day = new Date(now - weeksAgo * 7 * DAY - (weeksAgo === 0 ? 2 * DAY : Math.floor(random() * 3) * DAY))
    day.setHours(10, 40 + Math.floor(random() * 15), 0, 0)
    const campaignId = uuid(random)
    const template = templateFor(weekIndex)
    let at = day.getTime()

    for (const app of contacted.slice(cursor, cursor + size)) {
      at += 20_000 + Math.floor(random() * 4000)
      const { subject } = renderEmail(template, app, MOCK_PROFILE)
      const failed = app.category === 'failed'
      const messageId = failed ? '' : hex(random, 16)
      const timestamp = new Date(at).toISOString()

      app.templateName = template.name
      if (failed) {
        app.emailStatus = ES.failed
        app.lastError = FAILURE_REASONS[emailLog.length % FAILURE_REASONS.length]
        app.replyStatus = ''
      } else {
        app.emailStatus = app.category === 'bounced' ? ES.bounced : ES.sent
        app.sentDate = timestamp
        app.gmailMessageId = messageId
        app.threadId = messageId
        if (app.applicationStatus === AS.notApplied) app.applicationStatus = AS.applied
        const replyAt = Math.min(now - 30 * MIN, at + (1 + Math.floor(random() * 5)) * DAY + Math.floor(random() * 8) * 60 * MIN)
        const checked = weeksAgo > 0 || random() < 0.5
        if (app.category === 'replied') {
          app.replyStatus = RS.replied
          app.replyDate = new Date(replyAt).toISOString()
          app.applicationStatus = random() < 0.45 ? AS.interviewing : random() < 0.2 ? AS.rejected : AS.applied
        } else if (app.category === 'auto-reply') {
          app.replyStatus = RS.autoReply
          app.replyDate = new Date(replyAt).toISOString()
        } else if (app.category === 'uncertain') {
          app.replyStatus = RS.uncertain
        } else if (app.category === 'bounced') {
          app.replyStatus = RS.bounced
          app.replyDate = new Date(at + 2 * MIN).toISOString()
        } else {
          app.replyStatus = checked ? RS.noReply : RS.notChecked
          if (random() < 0.08) app.applicationStatus = AS.rejected
          else if (random() < 0.06) app.applicationStatus = AS.onHold
        }
      }

      emailLog.push({
        logId: uuid(random),
        timestamp,
        campaignId,
        applicationId: app.id,
        recipient: app.recruiterEmail,
        recipientName: app.recruiterName,
        companyName: app.companyName,
        jobTitle: app.jobTitle,
        templateName: template.name,
        subject: subject.text,
        attachment: 'Resume_Ananya_Rao.pdf',
        result: failed ? 'Failed' : 'Sent',
        messageId,
        threadId: messageId,
        error: failed ? app.lastError : '',
      })
    }
    cursor += size
  })

  const offer = applications.find((app) => app.applicationStatus === AS.interviewing)
  if (offer) offer.applicationStatus = AS.offer

  // Two test sends to self, as FR-5.6 would produce.
  const latest = emailLog.at(-1)
  for (const offset of [9 * DAY, 2 * DAY + 5 * MIN]) {
    emailLog.push({
      ...latest,
      logId: uuid(random),
      timestamp: new Date(now - offset).toISOString(),
      campaignId: '',
      applicationId: '',
      recipient: MOCK_PROFILE.email,
      recipientName: MOCK_PROFILE.name,
      subject: `[TEST] ${latest.subject}`,
      result: 'Test',
      messageId: hex(random, 16),
      error: '',
    })
  }
  emailLog.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))

  const headers = ['Company', 'Recruiter', 'HR Email', 'Role', 'Job Link', 'Status', 'Notes', SHEET_COLUMNS.id, SHEET_COLUMNS.templateName, SHEET_COLUMNS.emailStatus, SHEET_COLUMNS.sentDate, SHEET_COLUMNS.gmailMessageId, SHEET_COLUMNS.threadId, SHEET_COLUMNS.replyStatus, SHEET_COLUMNS.replyDate, SHEET_COLUMNS.lastError]

  const sheet = {
    spreadsheetId: '1mOcKjAbApPlYsHeEt2026xQ7vR4nT8wZ0kLpB3sD5fG',
    spreadsheetTitle: 'Job Hunt 2026',
    tabName: 'Applications',
    headers,
    columnMap: autoMapColumns(headers),
    worksheets: [
      { title: 'Applications', rows: 133 },
      { title: 'Email_Log', rows: emailLog.length },
      { title: 'Archive 2025', rows: 41 },
    ],
    syncedAt: new Date(now - 4 * MIN).toISOString(),
    summary: { total: 133, imported: applications.length, skipped: 3, invalid: 2 },
    invalidRows: [
      { row: 14, value: 'hr@globex', reason: 'Email has no domain' },
      { row: 37, value: '', reason: 'Recruiter email missing' },
    ],
    skippedRows: [
      { row: 52, reason: 'Duplicate of row 18' },
      { row: 88, reason: 'Duplicate of row 61' },
      { row: 101, reason: 'Duplicate ID. Clear the ID cell to re-assign.' },
    ],
  }

  const resume = { name: 'Resume_Ananya_Rao.pdf', size: 421_888, savedAt: new Date(now - 12 * DAY).toISOString() }

  return {
    applications: applications.map(({ category: _category, ...app }) => app),
    emailLog,
    sheet,
    profile: MOCK_PROFILE,
    resume,
    templates: DEFAULT_TEMPLATES.map((template) => ({
      ...template,
      createdAt: new Date(now - 90 * DAY).toISOString(),
      updatedAt: new Date(now - 20 * DAY).toISOString(),
    })),
    usage: { sentToday: 8 },
  }
}
