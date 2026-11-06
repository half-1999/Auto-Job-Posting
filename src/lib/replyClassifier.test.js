import { describe, expect, it } from 'vitest'
import { REPLY_STATUS } from './constants'
import { classifyThread } from './replyClassifier'

const message = ({ id, labels = [], headers, internalDate = '1700000000000' }) => ({
  id,
  labelIds: labels,
  internalDate,
  payload: { headers: Object.entries(headers).map(([name, value]) => ({ name, value })) },
})

const sent = message({ id: 'sent-1', labels: ['SENT'], headers: { From: 'me@gmail.com', Subject: 'Hello' } })

describe('classifyThread', () => {
  it('AC-13: a recruiter reply, an out-of-office reply, and a bounce', () => {
    const replied = classifyThread(
      { messages: [sent, message({ id: 'r1', headers: { From: 'Priya <priya@acme.com>', Subject: 'Re: Hello' }, internalDate: '1700001000000' })] },
      { recipient: 'priya@acme.com', sentMessageId: 'sent-1' },
    )
    expect(replied.status).toBe(REPLY_STATUS.replied)
    expect(replied.replyDate).toBe(new Date(1700001000000).toISOString())

    const auto = classifyThread(
      { messages: [sent, message({ id: 'a1', headers: { From: 'priya@acme.com', Subject: 'Out of Office', 'Auto-Submitted': 'auto-replied' } })] },
      { recipient: 'priya@acme.com', sentMessageId: 'sent-1' },
    )
    expect(auto.status).toBe(REPLY_STATUS.autoReply)

    const bounced = classifyThread(
      { messages: [sent, message({ id: 'b1', headers: { From: 'Mail Delivery <mailer-daemon@googlemail.com>', Subject: 'Delivery Status Notification (Failure)' } })] },
      { recipient: 'priya@acme.com', sentMessageId: 'sent-1' },
    )
    expect(bounced.status).toBe(REPLY_STATUS.bounced)
  })

  it('upgrades an auto-reply when a person replies later, and treats another domain as uncertain', () => {
    const thread = classifyThread(
      {
        messages: [
          sent,
          message({ id: 'a1', headers: { From: 'priya@acme.com', Subject: 'Automatic reply' }, internalDate: '1700001000000' }),
          message({ id: 'r1', headers: { From: 'priya@acme.com', Subject: 'Re: Hello' }, internalDate: '1700002000000' }),
        ],
      },
      { recipient: 'priya@acme.com', sentMessageId: 'sent-1' },
    )
    expect(thread.status).toBe(REPLY_STATUS.replied)

    const other = classifyThread(
      { messages: [sent, message({ id: 'u1', headers: { From: 'no-reply@greenhouse.io', Subject: 'Application received' } })] },
      { recipient: 'priya@acme.com', sentMessageId: 'sent-1' },
    )
    expect(other.status).toBe(REPLY_STATUS.uncertain)
  })

  it('is No Reply when the thread holds only the sent message, and Uncertain when the thread is gone', () => {
    expect(classifyThread({ messages: [sent] }, { recipient: 'priya@acme.com', sentMessageId: 'sent-1' }).status).toBe(REPLY_STATUS.noReply)
    expect(classifyThread(null).status).toBe(REPLY_STATUS.uncertain)
  })
})
