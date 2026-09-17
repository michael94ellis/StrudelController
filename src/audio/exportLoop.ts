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

type LiveRecording = {
  recorder: MediaRecorder
  chunks: BlobPart[]
  mimeType: string
  extension: string
  startedAt: number
  ac: AudioContext
  stopPromise: Promise<Blob>
  aborted: boolean
}

let live: LiveRecording | null = null

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
  if (master.context !== ac) {
    throw new Error('Audio context mismatch. Press Play once, then try Record again.')
  }

  if (tapDest && tapGain === master && tapDest.context === ac) {
    return tapDest
  }

  try {
    if (tapGain && tapDest) tapGain.disconnect(tapDest)
  } catch {
    // ignore — node may already be disconnected after a graph reset
  }

  tapDest = ac.createMediaStreamDestination()
  master.connect(tapDest)
  tapGain = master
  return tapDest
}

function waitAudioSeconds(ac: AudioContext, seconds: number): Promise<void> {
  const end = ac.currentTime + seconds
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (live?.aborted) {
        reject(new Error('Recording cancelled.'))
        return
      }
      if (ac.currentTime >= end) {
        resolve()
        return
      }
      requestAnimationFrame(tick)
    }
    tick()
  })
}

function createRecorder(ac: AudioContext): LiveRecording {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Recording is not supported in this browser.')
  }
  const dest = ensureRecordTap(ac)
  const { mimeType, extension } = pickMimeType()
  const recorder = mimeType
    ? new MediaRecorder(dest.stream, { mimeType })
    : new MediaRecorder(dest.stream)

  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const session: LiveRecording = {
    recorder,
    chunks,
    mimeType: mimeType || 'audio/webm',
    extension,
    startedAt: ac.currentTime,
    ac,
    stopPromise: undefined as unknown as Promise<Blob>,
    aborted: false,
  }

  session.stopPromise = new Promise<Blob>((resolve, reject) => {
    let settled = false
    const fail = (err: Error) => {
      if (settled) return
      settled = true
      reject(err)
    }
    const succeed = (blob: Blob) => {
      if (settled) return
      settled = true
      resolve(blob)
    }

    recorder.onerror = (ev) => {
      const err =
        ev.error instanceof Error
          ? ev.error
          : new Error(ev.message || 'Recording failed')
      fail(err)
    }
    recorder.onstop = () => {
      if (session.aborted) {
        fail(new Error('Recording cancelled.'))
        return
      }
      const type = recorder.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(chunks, { type })
      if (blob.size < 256) {
        fail(new Error('Recording was empty. Press Play once, then try Record again.'))
        return
      }
      succeed(blob)
    }
  })

  return session
}
/**
 * Record the live Strudel mix for an exact duration (pass a cycle-multiple
 * length so the file loops without a seam).
 */
export async function recordLoopAudio(seconds: number): Promise<RecordLoopResult> {
  if (seconds <= 0) {
    throw new Error('Recording duration must be positive.')
  }
  if (live) {
    throw new Error('Already recording.')
  }

  const ac = getAudioContext()
  if (ac.state === 'suspended') await ac.resume()

  const session = createRecorder(ac)
  live = session

  try {
    session.recorder.start(100)
    // Let the pattern speak before we count duration from silence.
    await waitAudioSeconds(ac, 0.12)
    session.startedAt = ac.currentTime
    await waitAudioSeconds(ac, seconds)

    if (session.recorder.state !== 'inactive') session.recorder.stop()
    if (live === session) live = null
    const blob = await session.stopPromise
    return {
      blob,
      mimeType: blob.type || session.mimeType,
      extension: session.extension,
      seconds,
    }
  } catch (err) {
    session.aborted = true
    if (live === session) live = null
    try {
      if (session.recorder.state !== 'inactive') session.recorder.stop()
    } catch {
      // ignore
    }
    void session.stopPromise.catch(() => {})
    throw err
  }
}

/** Start an open-ended take; call `stopLiveRecording` to finish and download. */
export async function startLiveRecording(): Promise<void> {
  if (live) {
    throw new Error('Already recording.')
  }
  const ac = getAudioContext()
  if (ac.state === 'suspended') await ac.resume()
  const session = createRecorder(ac)
  live = session
  try {
    session.recorder.start(250)
    await waitAudioSeconds(ac, 0.12)
    session.startedAt = ac.currentTime
  } catch (err) {
    live = null
    try {
      if (session.recorder.state !== 'inactive') session.recorder.stop()
    } catch {
      // ignore
    }
    throw err
  }
}

export function isLiveRecording(): boolean {
  return live !== null && live.recorder.state !== 'inactive'
}

export function liveRecordingElapsed(): number {
  if (!live) return 0
  return Math.max(0, live.ac.currentTime - live.startedAt)
}

/**
 * Stop an open-ended take, extending to the next full cycle boundary so the
 * file still loops seamlessly.
 */
export async function stopLiveRecordingAligned(cycleSeconds: number): Promise<RecordLoopResult> {
  const session = live
  if (!session) {
    throw new Error('Not recording.')
  }
  const elapsed = Math.max(0, session.ac.currentTime - session.startedAt)
  const unit = cycleSeconds > 0 ? cycleSeconds : elapsed
  const loops = Math.max(1, Math.ceil(elapsed / unit - 1e-9))
  const targetSec = loops * unit
  const remaining = targetSec - elapsed
  if (remaining > 0.02) {
    await waitAudioSeconds(session.ac, remaining)
  }
  const finalElapsed = Math.max(0, session.ac.currentTime - session.startedAt)
  if (live === session) live = null
  if (session.recorder.state !== 'inactive') session.recorder.stop()
  const blob = await session.stopPromise
  const finalLoops = Math.max(1, Math.round(finalElapsed / unit))
  return {
    blob,
    mimeType: blob.type || session.mimeType,
    extension: session.extension,
    seconds: finalLoops * unit,
  }
}

/** Stop immediately without cycle alignment. */
export async function stopLiveRecording(): Promise<RecordLoopResult> {
  const session = live
  if (!session) {
    throw new Error('Not recording.')
  }
  const elapsed = Math.max(0, session.ac.currentTime - session.startedAt)
  if (live === session) live = null
  if (session.recorder.state !== 'inactive') session.recorder.stop()
  const blob = await session.stopPromise
  return {
    blob,
    mimeType: blob.type || session.mimeType,
    extension: session.extension,
    seconds: elapsed,
  }
}

/** Safety: abort without downloading. */
export function cancelLiveRecording(): void {
  const session = live
  if (!session) return
  session.aborted = true
  live = null
  try {
    if (session.recorder.state !== 'inactive') session.recorder.stop()
  } catch {
    // ignore
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
