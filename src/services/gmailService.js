import { googleFetch } from './http'

/** Gmail API calls (API_INTEGRATION §6). Sends and thread reads only. Nothing is cached. */
const GMAIL = 'https://gmail.googleapis.com'
const THREAD_HEADERS = ['From', 'Subject', 'Date', 'Auto-Submitted', 'X-Autoreply', 'Precedence']

/** Uploads one RFC 822 message. Returns `{ id, threadId }`. */
export function sendMessage(raw, options) {
  return googleFetch(`${GMAIL}/upload/gmail/v1/users/me/messages/send?uploadType=media`, {
    ...options,
    method: 'POST',
    body: raw,
    headers: { 'Content-Type': 'message/rfc822', ...options?.headers },
  })
}

/** Headers and labels of one thread. Message bodies are not requested. */
export function getThread(threadId, options) {
  const params = new URLSearchParams({ format: 'metadata' })
  for (const header of THREAD_HEADERS) params.append('metadataHeaders', header)
  return googleFetch(`${GMAIL}/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?${params}`, options)
}
