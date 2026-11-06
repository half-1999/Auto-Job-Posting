import { RESUME_LIMITS } from '@/lib/constants'
import { renderEmail } from '@/lib/templateEngine'
import { formatBytes } from '@/lib/validation'
import { formatDuration } from './campaignsModel'

export const COMPOSER_STEPS = [
  { id: 'recipients', label: 'Recipients' },
  { id: 'message', label: 'Message' },
  { id: 'attachment', label: 'Attachment' },
  { id: 'review', label: 'Review' },
]

/** Renders every selected recipient. A recipient with unresolved placeholders is blocked (FR-4.5). */
export function buildPlan({ eligible, selectedIds, template, profile }) {
  const recipients = eligible
    .filter(({ application }) => selectedIds.has(application.id))
    .map(({ application, warning }) => {
      const email = renderEmail(template, application, profile)
      return {
        application,
        warning,
        email,
        subject: email.subject.text,
        issues: email.issues,
        blocked: email.issues.length > 0,
      }
    })
  return {
    recipients,
    sendable: recipients.filter((recipient) => !recipient.blocked),
    blocked: recipients.filter((recipient) => recipient.blocked),
  }
}

/** Why the user can't continue past `stepId`, or null. */
export function getStepGuard(stepId, { selectedCount, template, attachmentError, plan, remainingToday }) {
  switch (stepId) {
    case 'recipients':
      return selectedCount === 0 ? 'Select at least one recipient' : null
    case 'message':
      if (!template) return 'Choose a template'
      if (!template.subject?.trim() || !template.body?.trim()) return 'Add a subject and a body'
      return null
    case 'attachment':
      return attachmentError ?? null
    case 'review':
      if (!plan.sendable.length) return 'Every selected recipient is blocked. Fix the template first.'
      if (plan.sendable.length > remainingToday) {
        return `Over today's limit by ${plan.sendable.length - remainingToday}. Remove recipients or raise the limit in Settings.`
      }
      return null
    default:
      return null
  }
}

/** A step is reachable when every step before it passes its guard. */
export function getReachableSteps(context) {
  const reachable = new Set()
  for (const step of COMPOSER_STEPS) {
    reachable.add(step.id)
    if (getStepGuard(step.id, context)) break
  }
  return reachable
}

export function validateResume(file) {
  if (!file) return 'Choose a PDF file'
  const isPdf = file.type === RESUME_LIMITS.mimeType || /\.pdf$/i.test(file.name)
  if (!isPdf) return 'Use a PDF file. Other formats are not attached.'
  if (file.size > RESUME_LIMITS.maxBytes) {
    return `This file is ${formatBytes(file.size)}. Use a PDF of ${formatBytes(RESUME_LIMITS.maxBytes)} or less.`
  }
  return null
}

export function estimateDuration(count, delaySeconds) {
  return formatDuration(Math.max(0, count - 1) * delaySeconds * 1000 + count * 2000)
}

/** Sample rows for the message preview, based on a real selected recipient. */
export const PREVIEW_CASES = [
  { id: 'selected', label: 'Selected recipient' },
  { id: 'no-name', label: 'No recruiter name' },
  { id: 'first-name', label: 'First name only' },
  { id: 'no-link', label: 'No job link' },
  { id: 'no-company', label: 'No company' },
]

export function previewApplication(base, caseId) {
  const application = {
    recruiterName: base?.recruiterName ?? '',
    recruiterEmail: base?.recruiterEmail || 'recruiter@company.com',
    companyName: base?.companyName ?? '',
    jobTitle: base?.jobTitle ?? '',
    jobLink: base?.jobLink ?? '',
  }
  if (caseId === 'no-name') return { ...application, recruiterName: '' }
  if (caseId === 'first-name') {
    const first = application.recruiterName.trim().split(/\s+/)[0]
    return { ...application, recruiterName: first || 'Priya' }
  }
  if (caseId === 'no-link') return { ...application, jobLink: '' }
  if (caseId === 'no-company') return { ...application, companyName: '' }
  return application
}
