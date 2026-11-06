import { REPLY_STATUS } from './constants'

/** Thread classification (API_INTEGRATION §6.2). Higher rank wins, so a later human reply upgrades Auto-Reply. */
const RANK = {
  [REPLY_STATUS.noReply]: 0,
  [REPLY_STATUS.autoReply]: 1,
  [REPLY_STATUS.uncertain]: 2,
  [REPLY_STATUS.bounced]: 3,
  [REPLY_STATUS.replied]: 4,
}

const headerMap = (message) =>
  Object.fromEntries((message.payload?.headers ?? []).map((header) => [header.name.toLowerCase(), header.value ?? '']))

const addressOf = (from) => (/<([^>]+)>/.exec(from)?.[1] ?? from).trim().toLowerCase()
const domainOf = (email) => email.split('@')[1] ?? ''

function consider(best, next) {
  return RANK[next.status] >= RANK[best.status] ? next : best
}

/**
 * Classifies messages after the one we sent. A missing thread is Uncertain, never a guess of No Reply.
 */
export function classifyThread(thread, { recipient, sentMessageId } = {}) {
  if (!thread) {
    return { status: REPLY_STATUS.uncertain, replyDate: '', detail: 'Thread not found' }
  }
  let best = { status: REPLY_STATUS.noReply, replyDate: '', detail: '' }
  for (const message of thread.messages ?? []) {
    if (message.id === sentMessageId || message.labelIds?.includes('SENT')) continue
    const headers = headerMap(message)
    const from = headers.from ?? ''
    const subject = headers.subject ?? ''
    const replyDate = message.internalDate ? new Date(Number(message.internalDate)).toISOString() : ''
    const sender = addressOf(from)

    if (/mailer-daemon@|postmaster@/i.test(from) || /^(delivery status notification|undeliverable|mail delivery failed)/i.test(subject)) {
      best = consider(best, { status: REPLY_STATUS.bounced, replyDate, detail: '' })
      continue
    }
    const auto = (headers['auto-submitted'] ?? '').toLowerCase()
    if ((auto && auto !== 'no') || headers['x-autoreply'] || (headers.precedence ?? '').toLowerCase() === 'auto_reply' || /^(automatic reply|out of office|auto:)/i.test(subject)) {
      best = consider(best, { status: REPLY_STATUS.autoReply, replyDate, detail: '' })
      continue
    }
    const recipientAddress = (recipient ?? '').trim().toLowerCase()
    if (sender && (sender === recipientAddress || domainOf(sender) === domainOf(recipientAddress))) {
      best = consider(best, { status: REPLY_STATUS.replied, replyDate, detail: '' })
    } else {
      best = consider(best, { status: REPLY_STATUS.uncertain, replyDate, detail: `Possible reply from ${sender || 'someone else'}` })
    }
  }
  return best
}
