import {
  initStrudel,
  evaluate,
  hush,
  samples,
  getAudioContext,
  getLoadedBuffer,
  getSound,
  loadBuffer,
  resetGlobalEffects,
} from '@strudel/web'
import { installStrudelLoggerFilter } from './strudelLogger'
import { loadDirtSampleIndex, registerStrudelSounds } from './strudelPrebake'

installStrudelLoggerFilter()

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
let loadedDrumBank: string | null = null
/** Kit id whose buffers were fully decoded into Strudel's sampler cache. */
let preloadedDrumId: string | null = null
let preloadInFlight: Promise<boolean> | null = null
/** Resolves after optional Dirt index load + drum alias restore. */
let dirtSettle: Promise<void> | null = null

/** Voices our patterns may trigger — preload these so the first hit isn't late. */
const DRUM_VOICES = ['bd', 'sd', 'hh', 'ch', 'cp', 'oh', 'rim', 'sh'] as const

const DIRT_HH = ['hh/000_hh3closedhh.wav', 'hh27/000_hh27closedhh.wav']
const DIRT_SD = ['sd/rytm-00-hard.wav', 'sd/rytm-01-classic.wav']
/** Voices that must be decoded before Play — otherwise Strudel skips the first hits. */
const REQUIRED_DRUM_VOICES = ['bd', 'sd', 'hh'] as const

export function getDrumPlayback(): DrumPlayback | null {
  return drumPlayback
}

const DOUGH_MAP =
  'https://cdn.jsdelivr.net/gh/felixroos/dough-samples@main'
const DOUGH_RAW = 'https://raw.githubusercontent.com/felixroos/dough-samples/main'

const TIDE_DRUM_MACHINES_JSON = `${DOUGH_RAW}/tidal-drum-machines.json`
const EMU_SP12_JSON = `${DOUGH_RAW}/EmuSP12.json`

function drumMapUrls(primary: string): string[] {
  const urls = [primary]
  if (primary.startsWith(DOUGH_RAW)) {
    urls.push(primary.replace(DOUGH_RAW, DOUGH_MAP))
  } else if (primary.startsWith(DOUGH_MAP)) {
    urls.push(primary.replace(DOUGH_MAP, DOUGH_RAW))
  }
  return urls
}

const DIRT_BASE =
  'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/'

/** Ordered fallbacks — first kit that actually serves audio wins. */
type DrumKitCandidate = {
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
}

function machineKitCandidate(bank: string): DrumKitCandidate {
  return {
    id: bank,
    kind: 'map',
    mapUrl: bank === 'EmuSP12' ? EMU_SP12_JSON : TIDE_DRUM_MACHINES_JSON,
    bank,
    aliasFrom:
      bank === 'EmuSP12'
        ? { bd: 'bd', sd: 'sd', hh: 'hh' }
        : {
            bd: `${bank}_bd`,
            sd: `${bank}_sd`,
            hh: `${bank}_hh`,
          },
  }
}

const DRUM_KIT_CANDIDATES: DrumKitCandidate[] = [
  {
    id: 'dirt-mini',
    kind: 'inline',
    inline: {
      base: DIRT_BASE,
      map: {
        bd: ['bd/BT0A0A7.wav', 'bd/BT0A0D0.wav'],
        sd: ['sd/rytm-00-hard.wav', 'sd/rytm-01-classic.wav'],
        hh: DIRT_HH,
        ch: DIRT_HH,
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
        hh: DIRT_HH,
        ch: DIRT_HH,
        cp: ['cp/HANDCLP0.wav'],
      },
    },
  },
  {
    id: 'dirt-github',
    kind: 'map',
    mapUrl: 'github:tidalcycles/dirt-samples',
  },
  // Classic kits preferred as explicit fallbacks when bank load fails mid-list
  machineKitCandidate('RolandTR909'),
  machineKitCandidate('RolandTR808'),
  machineKitCandidate('AkaiLinn'),
  machineKitCandidate('AkaiMPC60'),
  machineKitCandidate('EmuSP12'),
]

export function isPlaying() {
  return playing
}

export function getSession() {
  return session
}

/** Flatten a Strudel sample bank (array or note→urls map) into absolute URLs. */
function collectSampleUrls(samples: unknown): string[] {
  if (typeof samples === 'string') return [samples]
  if (Array.isArray(samples)) {
    return samples.flatMap((entry) => collectSampleUrls(entry))
  }
  if (samples && typeof samples === 'object') {
    return Object.entries(samples as Record<string, unknown>)
      .filter(([key]) => !key.startsWith('_'))
      .flatMap(([, value]) => collectSampleUrls(value))
  }
  return []
}

/**
 * Decode registered drum sample URLs into Strudel's buffer cache before play.
 * Maps alone are not enough — lazy fetch on the first hit is skipped when it
 * exceeds Strudel's ~100ms schedule window (drums "start late").
 */
export async function preloadDrumBuffers(force = false): Promise<boolean> {
  const kit = drumPlayback
  if (!kit) return false
  if (!force && preloadedDrumId === kit.id && criticalDrumBuffersReady()) {
    return true
  }
  if (preloadInFlight) {
    const ok = await preloadInFlight
    if (!force && preloadedDrumId === kit.id && ok) return true
  }

  const run = (async (): Promise<boolean> => {
    let ac: AudioContext
    try {
      ac = getAudioContext()
    } catch {
      return false
    }

    const urls = new Set<string>()
    for (const name of DRUM_VOICES) {
      for (const url of sampleUrlsForVoice(name)) urls.add(url)
    }

    if (urls.size === 0) {
      console.warn('[beat-studio] no drum sample URLs to preload')
      return false
    }

    await Promise.all(
      [...urls].map(async (url) => {
        if (getLoadedBuffer(url)) return
        try {
          await loadBuffer(url, ac, 'drum')
        } catch (err) {
          console.warn(`[beat-studio] drum preload failed (${url})`, err)
        }
      }),
    )

    const readyNow = criticalDrumBuffersReady()
    if (drumPlayback?.id === kit.id && readyNow) {
      preloadedDrumId = kit.id
      console.info(`[beat-studio] preloaded ${urls.size} drum buffers for "${kit.id}"`)
    } else if (!readyNow) {
      preloadedDrumId = null
      const missing = REQUIRED_DRUM_VOICES.filter(
        (v) => !sampleUrlsForVoice(v).some((u) => getLoadedBuffer(u)),
      )
      console.warn(`[beat-studio] drum preload incomplete for "${kit.id}" — missing ${missing.join(', ')}`)
    }
    return readyNow
  })()

  const tracked = run.finally(() => {
    if (preloadInFlight === tracked) preloadInFlight = null
  })
  preloadInFlight = tracked
  return tracked
}

function sampleUrlsForVoice(name: string): string[] {
  try {
    const sound = getSound(name)
    if (sound?.data?.type !== 'sample') return []
    return collectSampleUrls(sound.data.samples).filter(
      (url) => url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:'),
    )
  } catch {
    return []
  }
}

function criticalDrumBuffersReady(): boolean {
  return REQUIRED_DRUM_VOICES.every((name) => {
    const urls = sampleUrlsForVoice(name)
    return urls.length > 0 && urls.some((url) => Boolean(getLoadedBuffer(url)))
  })
}

/**
 * Dirt's full sample index re-registers `bd`/`sd`/`hh` and undoes our kit.
 * Call after that index loads (or any bulk `samples()` map) to restore aliases.
 */
export async function reassertDrumKit(): Promise<DrumPlayback | null> {
  const bank = loadedDrumBank
  drumPlayback = null
  loadedDrumBank = null
  preloadedDrumId = null
  if (bank) return ensureDrumBank(bank)
  return loadDrumKitsUntilReady()
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

async function loadInlineKit(candidate: DrumKitCandidate): Promise<boolean> {
  const inline = candidate.inline
  if (!inline) return false
  const kick = inline.map.bd?.[0]
  if (!kick) return false
  const ok = await probeAudioUrl(joinUrl(inline.base, kick))
  if (!ok) {
    console.warn(`[beat-studio] drum kit "${candidate.id}" probe failed`)
    return false
  }

  const filtered: Record<string, string[]> = {}
  for (const [key, paths] of Object.entries(inline.map)) {
    const good: string[] = []
    for (const path of paths) {
      if (await probeAudioUrl(joinUrl(inline.base, path))) good.push(path)
    }
    if (good.length) filtered[key] = good
  }
  if (!filtered.bd?.length) {
    console.warn(`[beat-studio] drum kit "${candidate.id}" has no usable bd`)
    return false
  }

  await samples(filtered, inline.base, { prebake: true })
  drumPlayback = { id: candidate.id, mode: 'alias' }
  preloadedDrumId = null
  console.info(`[beat-studio] drums ready via "${candidate.id}" (alias bd/sd/hh)`)
  return true
}

async function fetchJsonFromUrls(urls: string[]): Promise<Record<string, unknown> | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      return (await res.json()) as Record<string, unknown>
    } catch {
      // try next mirror
    }
  }
  return null
}

async function registerMapUrls(urls: string[]): Promise<boolean> {
  for (const mapUrl of urls) {
    try {
      await samples(mapUrl, '', { prebake: false })
      return true
    } catch (err) {
      console.warn(`[beat-studio] drum map register failed (${mapUrl})`, err)
    }
  }
  return false
}

async function loadMapKit(candidate: DrumKitCandidate): Promise<boolean> {
  if (!candidate.mapUrl) return false

  const mapUrls =
    candidate.mapUrl.startsWith('github:')
      ? [candidate.mapUrl]
      : drumMapUrls(candidate.mapUrl)

  // Maps that already expose bd/sd/hh (Dirt github index, etc.)
  if (!candidate.aliasFrom) {
    const registered = await registerMapUrls(mapUrls)
    if (!registered && !candidate.mapUrl.startsWith('github:')) return false
    return loadDirtAliasKit(candidate.id)
  }

  const jsonUrls =
    candidate.mapUrl.startsWith('github:')
      ? ['https://raw.githubusercontent.com/tidalcycles/dirt-samples/main/strudel.json']
      : mapUrls

  const json = await fetchJsonFromUrls(jsonUrls)
  if (!json) return false

  // Optional: register full map for extra sounds (cp, etc.)
  void registerMapUrls(mapUrls)

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

  const hhOk =
    hhPaths.length > 0 && (await probeAudioUrl(joinUrl(base, hhPaths[0])))
  const sdOk = sdPaths.length > 0 && (await probeAudioUrl(joinUrl(base, sdPaths[0])))

  await samples({ bd: bdPaths }, base, { prebake: true })
  if (sdOk) {
    await samples({ sd: sdPaths }, base, { prebake: true })
  } else {
    await samples({ sd: DIRT_SD }, DIRT_BASE, { prebake: true })
  }
  if (hhOk) {
    await samples({ hh: hhPaths, ch: hhPaths }, base, { prebake: true })
  } else {
    await samples({ hh: DIRT_HH, ch: DIRT_HH }, DIRT_BASE, { prebake: true })
  }
  const cpKey = candidate.bank ? `${candidate.bank}_cp` : 'cp'
  const ohKey = candidate.bank ? `${candidate.bank}_oh` : 'oh'
  const rimKey = candidate.bank ? `${candidate.bank}_rim` : 'rim'
  const shKey = candidate.bank ? `${candidate.bank}_sh` : 'sh'
  const cpPaths = pick(cpKey).length
    ? pick(cpKey)
    : pick('RolandTR909_cp').length
      ? pick('RolandTR909_cp')
      : pick('cp')
  if (cpPaths.length) {
    await samples({ cp: cpPaths }, base, { prebake: true })
  } else {
    await samples({ cp: ['cp/HANDCLP0.wav'] }, DIRT_BASE, { prebake: true })
  }

  const ohPaths = pick(ohKey).length ? pick(ohKey) : pick('oh')
  if (ohPaths.length) {
    await samples({ oh: ohPaths }, base, { prebake: true })
  } else {
    await samples({ oh: ['808oh/OH00.WAV'] }, DIRT_BASE, { prebake: true })
  }

  const rimPaths = pick(rimKey).length ? pick(rimKey) : pick('rim')
  if (rimPaths.length) {
    await samples({ rim: rimPaths }, base, { prebake: true })
  } else {
    // Dirt has no `rim` — cowbell is a clear clicky spice substitute
    await samples({ rim: ['cb/rytm-cb.wav'] }, DIRT_BASE, { prebake: true })
  }

  const shPaths = pick(shKey).length ? pick(shKey) : pick('sh')
  if (shPaths.length) {
    await samples({ sh: shPaths }, base, { prebake: true })
  } else {
    await samples({ sh: ['perc/000_perc0.wav'] }, DIRT_BASE, { prebake: true })
  }

  drumPlayback = {
    id: candidate.id,
    mode: 'alias',
    bank: candidate.bank,
  }
  preloadedDrumId = null
  console.info(
    `[beat-studio] drums ready via "${candidate.id}" → aliased bd/sd/hh`,
  )
  return true
}

async function loadDirtAliasKit(id: string): Promise<boolean> {
  const map: Record<string, string[]> = {
    bd: ['bd/BT0A0A7.wav', 'bd/BT0A0D0.wav'],
    sd: DIRT_SD,
    hh: DIRT_HH,
    ch: DIRT_HH,
    cp: ['cp/HANDCLP0.wav'],
    oh: ['808oh/OH00.WAV'],
    rim: ['cb/rytm-cb.wav'],
    sh: ['perc/000_perc0.wav'],
  }
  const filtered: Record<string, string[]> = {}
  for (const [key, paths] of Object.entries(map)) {
    const good: string[] = []
    for (const path of paths) {
      if (await probeAudioUrl(joinUrl(DIRT_BASE, path))) good.push(path)
    }
    if (good.length) filtered[key] = good
  }
  if (!filtered.bd?.length) {
    console.warn(`[beat-studio] drum kit "${id}" audio probe failed`)
    return false
  }
  await samples(filtered, DIRT_BASE, { prebake: true })
  drumPlayback = { id, mode: 'alias' }
  preloadedDrumId = null
  console.info(`[beat-studio] drums ready via "${id}" (dirt alias)`)
  return true
}

function candidatesForBank(bank: string | undefined): DrumKitCandidate[] {
  const inline = DRUM_KIT_CANDIDATES.filter((c) => c.kind === 'inline')
  if (!bank) return [...DRUM_KIT_CANDIDATES]
  const preferred = machineKitCandidate(bank)
  const rest = DRUM_KIT_CANDIDATES.filter((c) => c.bank !== bank && c.kind !== 'inline')
  return [preferred, ...inline, ...rest]
}

/**
 * Load drum aliases for the kit selected on the drum layer (808 for trap, etc.).
 * Re-loads when the bank changes.
 */
export async function ensureDrumBank(bank: string): Promise<DrumPlayback | null> {
  if (drumPlayback && loadedDrumBank === bank) {
    const ok = await preloadDrumBuffers()
    if (ok) return drumPlayback
    // Aliases may have been clobbered (e.g. Dirt index) — reload.
    drumPlayback = null
    loadedDrumBank = null
    preloadedDrumId = null
  }
  const previous = drumPlayback
  const previousBank = loadedDrumBank
  drumPlayback = null
  loadedDrumBank = null
  preloadedDrumId = null

  for (const candidate of candidatesForBank(bank)) {
    try {
      const ok =
        candidate.kind === 'inline'
          ? await loadInlineKit(candidate)
          : await loadMapKit(candidate)
      if (ok) {
        loadedDrumBank = bank
        const preloaded = await preloadDrumBuffers(true)
        if (preloaded) return drumPlayback
        console.warn(`[beat-studio] kit "${candidate.id}" registered but buffers not ready`)
      }
    } catch (err) {
      console.warn(`[beat-studio] drum kit "${candidate.id}" error`, err)
    }
  }

  drumPlayback = previous
  loadedDrumBank = previousBank
  if (drumPlayback) {
    console.warn(
      `[beat-studio] could not load kit for bank "${bank}" — keeping "${drumPlayback.id}"`,
    )
    await preloadDrumBuffers(true)
    return drumPlayback
  }

  console.error('[beat-studio] no drum kit could be loaded')
  return null
}

/** Try each drum kit until audio actually loads. */
export async function loadDrumKitsUntilReady(): Promise<DrumPlayback | null> {
  if (drumPlayback) {
    const ok = await preloadDrumBuffers()
    if (ok) return drumPlayback
    drumPlayback = null
    loadedDrumBank = null
    preloadedDrumId = null
  }

  for (const candidate of DRUM_KIT_CANDIDATES) {
    try {
      const ok =
        candidate.kind === 'inline'
          ? await loadInlineKit(candidate)
          : await loadMapKit(candidate)
      if (ok) {
        const preloaded = await preloadDrumBuffers(true)
        if (preloaded) return drumPlayback
        console.warn(`[beat-studio] kit "${candidate.id}" registered but buffers not ready`)
      }
    } catch (err) {
      console.warn(`[beat-studio] drum kit "${candidate.id}" error`, err)
    }
  }

  console.error('[beat-studio] no drum kit could be loaded')
  return null
}

async function loadSampleBank(
  label: string,
  file: string,
  opts: { prebake?: boolean } = {},
): Promise<void> {
  const urls = [`${DOUGH_RAW}/${file}`, `${DOUGH_MAP}/${file}`]
  for (const url of urls) {
    try {
      await samples(url, '', opts)
      return
    } catch (err) {
      console.warn(`[beat-studio] sample bank "${label}" failed (${url})`, err)
    }
  }
}

export async function ensureStrudel(): Promise<void> {
  if (ready) return ready

  ready = (async () => {
    await initStrudel({
      prebake: async () => {
        await registerStrudelSounds()
        // Drums first so bd/sd/hh point at a known-good kit.
        await loadDrumKitsUntilReady()
        await Promise.all([
          loadSampleBank('piano', 'piano.json', { prebake: true }),
          loadSampleBank('vcsl', 'vcsl.json', { prebake: false }),
        ])
        // Dirt index overwrites drum names — restore + re-decode when it finishes.
        dirtSettle = loadDirtSampleIndex()
          .then(async (loaded) => {
            if (!loaded) return
            await reassertDrumKit()
          })
          .catch((err) => {
            console.warn('[beat-studio] Dirt settle failed', err)
          })
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
export async function playCode(code: string, drumBank?: string): Promise<void> {
  await ensureStrudel()
  // Wait briefly for Dirt index (it clobbers bd/sd/hh) so we restore before Play.
  if (dirtSettle) {
    await Promise.race([
      dirtSettle,
      new Promise<void>((resolve) => setTimeout(resolve, 4000)),
    ])
  }
  if (drumBank) {
    await ensureDrumBank(drumBank)
  } else if (!getDrumPlayback()) {
    await loadDrumKitsUntilReady()
  }
  // Decode buffers before starting the clock so the first kick isn't skipped.
  const readyDrums = await preloadDrumBuffers(true)
  if (!readyDrums) {
    await reassertDrumKit()
    const retry = await preloadDrumBuffers(true)
    if (!retry) {
      throw new Error('Drum samples failed to decode. Check your network, then press Play again.')
    }
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
