/** Plain-text RFC 822 message for the Gmail upload endpoint (API_INTEGRATION §6.1). */

function bytesToBase64(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function wrap(base64) {
  return base64.replace(/.{1,76}/g, '$&\r\n').replace(/\r\n$/, '')
}

function encodeHeader(value) {
  const text = String(value ?? '')
  if (/^[\t\x20-\x7e]*$/.test(text)) return text
  return `=?UTF-8?B?${bytesToBase64(new TextEncoder().encode(text))}?=`
}

function quoteFilename(name) {
  return `"${String(name).replace(/["\\\r\n]/g, '_')}"`
}

/**
 * Builds one message. `attachment.bytes` is a Uint8Array. The result is a string the
 * Gmail media upload accepts as `message/rfc822`.
 */
export function buildMessage({ fromName, fromEmail, to, subject, text, attachment, boundary = `b1_${crypto.randomUUID().replace(/-/g, '')}` }) {
  const from = fromName ? `${encodeHeader(fromName)} <${fromEmail}>` : fromEmail
  const body = wrap(bytesToBase64(new TextEncoder().encode(text ?? '')))
  const parts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    body,
  ]
  if (attachment?.bytes?.length) {
    parts.push(
      `--${boundary}`,
      `Content-Type: application/pdf; name=${quoteFilename(attachment.filename)}`,
      `Content-Disposition: attachment; filename=${quoteFilename(attachment.filename)}`,
      'Content-Transfer-Encoding: base64',
      '',
      wrap(bytesToBase64(attachment.bytes)),
    )
  }
  parts.push(`--${boundary}--`, '')
  return parts.join('\r\n')
}
