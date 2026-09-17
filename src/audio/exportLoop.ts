import { getAudioContext } from '@strudel/web'
import { getSuperdoughAudioController } from 'superdough'

export type RecordLoopResult = {
  blob: Blob
  mimeType: string
  extension: string
  seconds: number
}

let tapDest: MediaStreamAudioDestinationNode | null = null
let tapGain: GainNode | null = null

function pickMimeType(): { mimeType: string; extension: string } {
  const candidates = [
    { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
    { mimeType: 'audio/webm', extension: 'webm' },
    { mimeType: 'audio/mp4', extension: 'm4a' },
  ]
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c
    }
  }
  return { mimeType: '', extension: 'webm' }
}

/**
 * Tap Strudel's master gain into a MediaStream for recording.
 * Re-binds after superdough resets its destination graph.
 */
function ensureRecordTap(ac: AudioContext): MediaStreamAudioDestinationNode {
  const controller = getSuperdoughAudioController()
  const master = controller.output.destinationGain
  if (!master) {
    throw new Error('Audio output is not ready yet. Press Play once, then try again.')
  }

  if (tapDest && tapGain === master && tapDest.context === ac) {
    return tapDest
  }

  try {
    tapDest?.disconnect()
  } catch {
    // ignore
  }

  tapDest = ac.createMediaStreamDestination()
  master.connect(tapDest)
  tapGain = master
  return tapDest
}

function waitAudioSeconds(ac: AudioContext, seconds: number): Promise<void> {
  const end = ac.currentTime + seconds
  return new Promise((resolve) => {
    const tick = () => {
      if (ac.currentTime >= end) {
        resolve()
        return
      }
      requestAnimationFrame(tick)
    }
    tick()
  })
}

/**
 * Record the live Strudel mix for an exact duration (pass a snapped cycle
 * length so the file loops without a seam).
 */
export async function recordLoopAudio(seconds: number): Promise<RecordLoopResult> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Recording is not supported in this browser.')
  }
  if (seconds <= 0) {
    throw new Error('Recording duration must be positive.')
  }

  const ac = getAudioContext()
  if (ac.state === 'suspended') await ac.resume()

  const dest = ensureRecordTap(ac)
  const { mimeType, extension } = pickMimeType()
  const recorder = mimeType
    ? new MediaRecorder(dest.stream, { mimeType })
    : new MediaRecorder(dest.stream)

  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(recorder.error ?? new Error('Recording failed'))
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || 'audio/webm'
      resolve(new Blob(chunks, { type }))
    }
  })

  recorder.start(100)
  await waitAudioSeconds(ac, seconds)

  if (recorder.state !== 'inactive') recorder.stop()
  const blob = await stopped

  return {
    blob,
    mimeType: blob.type || mimeType || 'audio/webm',
    extension,
    seconds,
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'beat'
}
