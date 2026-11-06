import { EMAIL_STATUS, REPLY_STATUS } from '@/lib/constants'

/** Saved views on the Applications page (docs/UI_UX_PLAN.md §5.3). */
export const APPLICATION_VIEWS = [
  { id: 'all', label: 'All', test: () => true },
  {
    id: 'not-contacted',
    label: 'Not contacted',
    test: (app) => (app.emailStatus || EMAIL_STATUS.notSent) === EMAIL_STATUS.notSent,
  },
  {
    id: 'awaiting',
    label: 'Awaiting reply',
    test: (app) =>
      app.emailStatus === EMAIL_STATUS.sent &&
      [REPLY_STATUS.notChecked, REPLY_STATUS.noReply, ''].includes(app.replyStatus ?? ''),
  },
  { id: 'replied', label: 'Replied', test: (app) => app.replyStatus === REPLY_STATUS.replied },
  {
    id: 'attention',
    label: 'Needs attention',
    test: (app) =>
      [EMAIL_STATUS.failed, EMAIL_STATUS.bounced].includes(app.emailStatus) ||
      [REPLY_STATUS.uncertain, REPLY_STATUS.bounced].includes(app.replyStatus),
  },
]

export function getView(id) {
  return APPLICATION_VIEWS.find((view) => view.id === id) ?? APPLICATION_VIEWS[0]
}

export function countViews(applications) {
  return Object.fromEntries(
    APPLICATION_VIEWS.map((view) => [view.id, applications.filter(view.test).length]),
  )
}

export function matchesSearch(app, query) {
  if (!query) return true
  const q = query.trim().toLowerCase()
  return [app.companyName, app.jobTitle, app.recruiterName, app.recruiterEmail]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(q))
}
