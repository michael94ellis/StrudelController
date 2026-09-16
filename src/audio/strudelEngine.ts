import {
  initStrudel,
  evaluate,
  hush,
  samples,
  getAudioContext,
  resetGlobalEffects,
} from '@strudel/web'

let ready: Promise<void> | null = null
let playing = false
/** Bumps on every stop so in-flight play/refresh calls can bail out. */
let session = 0

/**
 * After a drum kit boots, patterns use plain `bd`/`sd`/`hh` (no `.bank()`),
 * so house/trap/metal all hit the same working samples.
 */
export type DrumPlayback = {
  id: string
  /** Prefer bare Dirt-style names once aliases are registered */
  mode: 'alias' | 'bank'
  bank?: string
}

let drumPlayback: DrumPlayback | null = null

export function getDrumPlayback(): DrumPlayback | null {
  return drumPlayback
}

const DOUGH_MAP =
  'https://cdn.jsdelivr.net/gh/felixroos/dough-samples@main'

const DIRT_BASE =
  'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/'

/** Ordered fallbacks — first kit that actually serves audio wins. */
const DRUM_KIT_CANDIDATES: Array<{
  id: string
  kind: 'inline' | 'map'
  /** Inline mini-map (relative paths + base) */
  inline?: { base: string; map: Record<string, string[]> }
  /** Remote JSON map URL */
  mapUrl?: string
  /** Prefix used with `.bank("…")` if we keep bank mode */
  bank?: string
  /** Keys inside a machine map to promote to bd/sd/hh aliases */
  aliasFrom?: { bd: string; sd: string; hh: string }
}> = [
  {
    id: 'dirt-mini',
    kind: 'inline',
    inline: {
      base: DIRT_BASE,
      map: {
        bd: ['bd/BT0A0A7.wav', 'bd/BT0A0D0.wav'],
        sd: ['sd/rytm-00-hard.wav', 'sd/rytm-01-classic.wav'],
        hh: ['hh/000_hh3closedhh.wav', 'hh/002_hh3openhh.wav'],
        cp: ['cp/HANDCLP0.wav'],
      },
    },
  },
  {
    id: 'dirt-jsdelivr',
    kind: 'inline',
    inline: {
      base: 'https://cdn.jsdelivr.net/gh/tidalcycles/Dirt-Samples@master/',
      map: {
        bd: ['bd/BT0A0A7.wav'],
        sd: ['sd/rytm-00-hard.wav'],
        hh: ['hh/000_hh3closedhh.wav'],
        cp: ['cp/HANDCLP0.wav'],
      },
    },
  },
  {
    id: 'dirt-github',
    kind: 'map',
    mapUrl: 'github:tidalcycles/dirt-samples',
  },
  {
    id: '909',
    kind: 'map',
    mapUrl: `${DOUGH_MAP}/tidal-drum-machines.json`,
    bank: 'RolandTR909',
    aliasFrom: {
      bd: 'RolandTR909_bd',
      sd: 'RolandTR909_sd',
      hh: 'RolandTR909_hh',
    },
  },
  {
    id: '808',
    kind: 'map',
    mapUrl: `${DOUGH_MAP}/tidal-drum-machines.json`,
    bank: 'RolandTR808',
    aliasFrom: {
      bd: 'RolandTR808_bd',
      sd: 'RolandTR808_sd',
      hh: 'RolandTR808_hh',
    },
  },
  {
    id: 'linn',
    kind: 'map',
    mapUrl: `${DOUGH_MAP}/tidal-drum-machines.json`,
    bank: 'AkaiLinn',
    aliasFrom: {
      bd: 'AkaiLinn_bd',
      sd: 'AkaiLinn_sd',
      hh: 'AkaiLinn_hh',
    },
  },
]

export function isPlaying() {
  return playing
}

export function getSession() {
  return session
}

async function probeAudioUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET', cache: 'force-cache' })
    if (!res.ok) return false
    // Confirm we got bytes (some CDNs 200 HTML error pages)
    const buf = await res.arrayBuffer()
    return buf.byteLength > 1000
  } catch {
    return false
  }
}

function joinUrl(base: string, path: string): string {
  if (path.startsWith('http')) return path
  return `${base.replace(/\/?$/, '/')}${path.replace(/^\//, '')}`
}

async function loadInlineKit(candidate: (typeof DRUM_KIT_CANDIDATES)[number]): Promise<boolean> {
  const inline = candidate.inline
  if (!inline) return false
  const kick = inline.map.bd?.[0]
  if (!kick) return false
  const ok = await probeAudioUrl(joinUrl(inline.base, kick))
  if (!ok) {
    console.warn(`[beat-studio] drum kit "${candidate.id}" probe failed`)
    return false
  }
  await samples(inline.map, inline.base, { prebake: true })
  drumPlayback = { id: candidate.id, mode: 'alias' }
  console.info(`[beat-studio] drums ready via "${candidate.id}" (alias bd/sd/hh)`)
  return true
}

async function loadMapKit(candidate: (typeof DRUM_KIT_CANDIDATES)[number]): Promise<boolean> {
  if (!candidate.mapUrl) return false
  try {
    // Register map ('' keeps JSON `_base`)
    await samples(candidate.mapUrl, '', {
      // Don't prebake entire machine packs — huge and flaky
      prebake: false,
    })
  } catch (err) {
    console.warn(`[beat-studio] drum map "${candidate.id}" failed`, err)
    return false
  }

  // Dirt-style map already exposes bd/sd/hh
  if (!candidate.aliasFrom) {
    const probe = joinUrl(DIRT_BASE, 'bd/BT0A0A7.wav')
    if (!(await probeAudioUrl(probe))) {
      console.warn(`[beat-studio] drum kit "${candidate.id}" audio probe failed`)
      return false
    }
    // Prebake the few hits we need
    await samples(
      {
        bd: ['bd/BT0A0A7.wav', 'bd/BT0A0D0.wav'],
        sd: ['sd/rytm-00-hard.wav'],
        hh: ['hh/000_hh3closedhh.wav'],
        cp: ['cp/HANDCLP0.wav'],
      },
      DIRT_BASE,
      { prebake: true },
    )
    drumPlayback = { id: candidate.id, mode: 'alias' }
    console.info(`[beat-studio] drums ready via "${candidate.id}" (alias)`)
    return true
  }

  // Machine bank: fetch JSON again to resolve alias URLs and probe
  const mapRes = await fetch(
    candidate.mapUrl.startsWith('github:')
      ? `https://raw.githubusercontent.com/tidalcycles/dirt-samples/main/strudel.json`
      : candidate.mapUrl,
  ).catch(() => null)

  // For dough drum machines map:
  let json: Record<string, unknown> | null = null
  if (candidate.mapUrl.includes('tidal-drum-machines')) {
    try {
      json = (await (await fetch(candidate.mapUrl)).json()) as Record<string, unknown>
    } catch {
      return false
    }
  } else if (mapRes?.ok) {
    try {
      json = (await mapRes.json()) as Record<string, unknown>
    } catch {
      return false
    }
  }
  if (!json) return false

  const base = String(json._base ?? '')
  const alias = candidate.aliasFrom
  const pick = (key: string): string[] => {
    const v = json![key]
    if (Array.isArray(v)) return v.map(String)
    return []
  }
  const bdPaths = pick(alias.bd)
  const sdPaths = pick(alias.sd)
  const hhPaths = pick(alias.hh)
  if (!bdPaths.length) {
    console.warn(`[beat-studio] kit "${candidate.id}" missing ${alias.bd}`)
    return false
  }
  const probe = joinUrl(base, bdPaths[0])
  if (!(await probeAudioUrl(probe))) {
    console.warn(`[beat-studio] kit "${candidate.id}" probe failed`, probe)
    return false
  }

  // Promote to plain bd/sd/hh so every style hears drums without .bank()
  await samples(
    {
      bd: bdPaths,
      sd: sdPaths.length ? sdPaths : bdPaths,
      hh: hhPaths.length ? hhPaths : bdPaths,
      cp: pick('RolandTR909_cp').length ? pick('RolandTR909_cp') : bdPaths,
    },
    base,
    { prebake: true },
  )

  drumPlayback = {
    id: candidate.id,
    mode: 'alias',
    bank: candidate.bank,
  }
  console.info(
    `[beat-studio] drums ready via "${candidate.id}" → aliased bd/sd/hh`,
  )
  return true
}

/** Try each drum kit until audio actually loads. */
export async function loadDrumKitsUntilReady(): Promise<DrumPlayback | null> {
  if (drumPlayback) return drumPlayback

  for (const candidate of DRUM_KIT_CANDIDATES) {
    try {
      const ok =
        candidate.kind === 'inline'
          ? await loadInlineKit(candidate)
          : await loadMapKit(candidate)
      if (ok) return drumPlayback
    } catch (err) {
      console.warn(`[beat-studio] drum kit "${candidate.id}" error`, err)
    }
  }

  console.error('[beat-studio] no drum kit could be loaded')
  return null
}

async function loadSampleBank(
  label: string,
  url: string,
  opts: { prebake?: boolean } = {},
): Promise<void> {
  try {
    await samples(url, '', opts)
  } catch (err) {
    console.warn(`[beat-studio] sample bank "${label}" failed to load`, err)
  }
}

export async function ensureStrudel(): Promise<void> {
  if (ready) return ready

  ready = (async () => {
    await initStrudel({
      prebake: async () => {
        // Piano in parallel; drums tried sequentially until one works
        await Promise.all([
          loadSampleBank('piano', `${DOUGH_MAP}/piano.json`, { prebake: true }),
          loadDrumKitsUntilReady(),
        ])
      },
    })
  })()

  try {
    await ready
  } catch (err) {
    ready = null
    throw err
  }

  return ready
}

/**
 * Soft-halt the scheduler without wiping delay/reverb buses.
 * Used before a restart so tails can bridge into the next pattern.
 */
function haltScheduler(): void {
  session += 1
  playing = false
  try {
    hush()
  } catch {
    // not initialized yet
  }
}

/**
 * Hard stop: halt the scheduler and clear delay/reverb buses.
 */
export function stopCode(): void {
  haltScheduler()
  try {
    resetGlobalEffects()
  } catch {
    // audio stack may not be ready
  }
}

/**
 * Start (or hard-restart) playback from cycle 0.
 * Keeps FX buses so restarts don't click dry.
 */
export async function playCode(code: string): Promise<void> {
  await ensureStrudel()
  // Retry drums on play if prebake lost the race / failed
  if (!getDrumPlayback()) {
    await loadDrumKitsUntilReady()
  }
  try {
    const ac = getAudioContext()
    if (ac.state === 'suspended') await ac.resume()
  } catch {
    // ignore
  }

  haltScheduler()
  const runId = session

  await evaluate(code, true)

  if (session !== runId) {
    try {
      hush()
    } catch {
      // ignore
    }
    playing = false
    return
  }

  playing = true
}

/**
 * Hot-swap pattern without resetting the clock (live param / section tweaks).
 * Keeps delay/reverb buses alive so transitions don't click.
 */
export async function updateCode(code: string): Promise<void> {
  if (!playing) return
  await ensureStrudel()
  const runId = session
  await evaluate(code, true)
  if (session !== runId) return
  playing = true
}
