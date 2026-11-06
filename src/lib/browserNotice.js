/** A short bell, generated here so the app does not ship a recorded audio file. */

let audioContext = null
let bellBuffer = null

function wavBytes() {
  const sampleRate = 22050
  const samples = Math.floor(sampleRate * 0.7)
  const pcm = new Int16Array(samples)
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate
    const envelope = Math.exp(-t * 6)
    const tone =
      envelope *
      (0.55 * Math.sin(2 * Math.PI * 880 * t) +
        0.28 * Math.sin(2 * Math.PI * 1320 * t) +
        0.12 * Math.sin(2 * Math.PI * 1760 * t))
    pcm[i] = Math.max(-1, Math.min(1, tone)) * 32767
  }
  const data = pcm.length * 2
  const buffer = new ArrayBuffer(44 + data)
  const view = new DataView(buffer)
  const text = (offset, value) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i))
  }
  text(0, 'RIFF')
  view.setUint32(4, 36 + data, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, data, true)
  new Int16Array(buffer, 44).set(pcm)
  return new Uint8Array(buffer)
}

export function bellWavBytes() {
  return wavBytes()
}

async function bellAudioBuffer() {
  const Context = window.AudioContext || window.webkitAudioContext
  if (!Context) return null
  audioContext ??= new Context()
  if (audioContext.state === 'suspended') await audioContext.resume()
  bellBuffer ??= await audioContext.decodeAudioData(wavBytes().buffer.slice(0))
  return bellBuffer
}

/** Plays the bell. Returns false when the browser blocks audio. */
export async function playBell() {
  try {
    const buffer = await bellAudioBuffer()
    if (!buffer || !audioContext) return false
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(audioContext.destination)
    source.start()
    return true
  } catch {
    return false
  }
}

export function downloadBell() {
  const blob = new Blob([wavBytes()], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'jobapply-bell.wav'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Shows a system notification. `silent` is set when our bell already played,
 * so the browser does not add a second sound.
 */
export function showBrowserNotice({ title, body, silent, onClick }) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    const notice = new Notification(title, { body, silent })
    notice.onclick = () => {
      window.focus()
      notice.close()
      onClick?.()
    }
  } catch {
    // A blocked or unsupported notification must not stop the in-app bell item.
  }
}
