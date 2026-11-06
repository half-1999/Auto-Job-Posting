import { writeFields } from '@/context/sheetSync'
import { EMAIL_STATUS, REPLY_STATUS } from '@/lib/constants'
import { classifyThread } from '@/lib/replyClassifier'
import { getThread } from '@/services/gmailService'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Checks threads this app started. One request at a time, 200 ms apart.
 * Nothing here runs unless the user pressed Check replies.
 */
export async function checkReplies({ applications, sheetConfig, patchApplications, queueSheetWrite, sleep = wait }) {
  const targets = applications.filter((app) => app.threadId)
  const found = []
  for (const [index, app] of targets.entries()) {
    if (index > 0) await sleep(200)
    let result
    try {
      const thread = await getThread(app.threadId)
      result = classifyThread(thread, { recipient: app.recruiterEmail, sentMessageId: app.gmailMessageId })
    } catch (error) {
      if (error?.code === 'not_found') result = { status: REPLY_STATUS.uncertain, replyDate: '', detail: 'Thread not found' }
      else throw error
    }
    if (result.status === (app.replyStatus || '') && (result.replyDate || '') === (app.replyDate || '')) continue
    const values = { replyStatus: result.status, replyDate: result.replyDate }
    if (result.status === REPLY_STATUS.bounced) values.emailStatus = EMAIL_STATUS.bounced
    patchApplications([app.id], values)
    try {
      await writeFields(sheetConfig, [{ applicationId: app.id, values }])
    } catch {
      queueSheetWrite([{ applicationId: app.id, values }])
    }
    if (result.status !== REPLY_STATUS.noReply && result.status !== REPLY_STATUS.notChecked) found.push({ id: app.id, status: result.status })
  }
  return found
}
