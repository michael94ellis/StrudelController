import type { Instrument, Part, Progression, Section, Song } from './types'
import { newId } from './types'
import { anthemProgression, cafeProgression, popProgression } from './theory'
import { instrumentDefs } from './instruments/registry'
import { generatorDefs } from './generators/registry'

function inst(
  kind: Instrument['kind'],
  name: string,
  params?: Record<string, number | string | boolean>,
): Instrument {
  return {
    id: newId('inst'),
    name,
    kind,
    params: { ...instrumentDefs[kind].defaultParams, ...params },
  }
}

function part(
  name: string,
  instrumentId: string,
  generator: Part['generator'],
  params: Record<string, number | string | boolean> = {},
  enabled = true,
): Part {
  return {
    id: newId('part'),
    name,
    instrumentId,
    generator,
    params: { ...generatorDefs[generator].defaultParams, ...params },
    enabled,
  }
}

function section(
  name: Section['name'],
  bars: number,
  progressionId: string,
  partIds: string[],
  mods?: Section['mods'],
): Section {
  return {
    id: newId('sec'),
    name,
    bars,
    progressionId,
    parts: partIds.map((partId) => ({ partId })),
    mods,
  }
}

function songOf(
  title: string,
  globals: Song['globals'],
  instruments: Instrument[],
  progressions: Progression[],
  parts: Part[],
  sections: Section[],
  arrangement: Song['arrangement'],
): Song {
  return {
    id: newId('song'),
    title,
    globals,
    instruments,
    progressions,
    parts,
    sections,
    arrangement,
  }
}

/** Cozy village morning → soft intro, verse, brighter chorus, gentle outro */
export function cozyVillageSong(): Song {
  const drums = inst('drumkit', 'Soft kit', { bank: 'RolandTR909', gain: 0.55, crunch: 0 })
  const bass = inst('subBass', 'Warm bass', { wave: 'triangle', cutoff: 420, gain: 0.38 })
  const guitar = inst('pluck', 'Muted pluck', { gain: 0.34, room: 0.4, delay: 0.2 })
  const bells = inst('bell', 'Soft chimes', { gain: 0.18, room: 0.6, delay: 0.3 })
  const wind = inst('texture', 'Morning air', { mode: 'wind', gain: 0.12, room: 0.85, cutoff: 500 })

  const pop = { ...popProgression('prog-pop', 'I–vi–IV–V'), id: 'prog-pop' }
  const soft = {
    ...popProgression('prog-soft', 'I–IV–vi–V'),
    id: 'prog-soft',
    chords: [
      { degree: 'I' as const, quality: 'maj7' as const },
      { degree: 'IV' as const, quality: 'maj7' as const },
      { degree: 'vi' as const, quality: 'm7' as const },
      { degree: 'V' as const, quality: '7' as const },
    ],
  }

  const pDrums = part('Pulse', drums.id, 'sparsePulse', { density: 0.4 })
  const pDrumsUp = part('Groove', drums.id, 'fourOnFloor', { density: 0.7, openHats: false })
  const pBass = part('Bass roots', bass.id, 'rootBass', { octave: 2, rhythm: 'half' })
  const pChords = part('Pluck chords', guitar.id, 'chordStabs', {
    voicing: 'seventh',
    rhythm: 'half',
  })
  const pChimes = part('Chimes', bells.id, 'chimeHits', { density: 0.35, octave: 5 })
  const pAir = part('Air', wind.id, 'ambientGrain', {})

  const intro = section('intro', 4, soft.id, [pAir.id, pChords.id, pChimes.id], [
    { type: 'fadeIn' },
  ])
  const verse = section('verse', 8, soft.id, [
    pDrums.id,
    pBass.id,
    pChords.id,
    pAir.id,
  ])
  const chorus = section('chorus', 8, pop.id, [
    pDrumsUp.id,
    pBass.id,
    pChords.id,
    pChimes.id,
  ])
  const outro = section('outro', 4, soft.id, [pChords.id, pChimes.id, pAir.id], [
    { type: 'fadeOut' },
  ])

  return songOf(
    'Cozy Village Morning',
    { bpm: 88, key: 'F', scale: 'major', swing: 0.08 },
    [drums, bass, guitar, bells, wind],
    [pop, soft],
    [pDrums, pDrumsUp, pBass, pChords, pChimes, pAir],
    [intro, verse, chorus, outro],
    [
      { sectionId: intro.id },
      { sectionId: verse.id },
      { sectionId: chorus.id },
      { sectionId: verse.id },
      { sectionId: chorus.id, repeat: 1 },
      { sectionId: outro.id },
    ],
  )
}

/** Town plaza — brighter, more syncopated */
export function townPlazaSong(): Song {
  const drums = inst('drumkit', 'Plaza kit', { bank: 'RolandTR909', gain: 0.7, crunch: 0.05 })
  const bass = inst('subBass', 'Punchy bass', { wave: 'sawtooth', cutoff: 520, gain: 0.45 })
  const keys = inst('pluck', 'Bright pluck', { gain: 0.4, room: 0.3, cutoff: 3200 })
  const lead = inst('lead', 'Town lead', { wave: 'triangle', gain: 0.3, cutoff: 2400 })
  const bells = inst('bell', 'Plaza bells', { gain: 0.2, room: 0.5, crunch: 0.05 })

  const anthem = { ...anthemProgression('prog-anthem'), id: 'prog-anthem' }

  const pKick = part('Four', drums.id, 'fourOnFloor', { density: 0.9, openHats: false })
  const pBreak = part('Break', drums.id, 'breakbeat', { density: 0.8 })
  const pBass = part('Bass', bass.id, 'rootBass', { octave: 2, rhythm: 'syncopated' })
  const pChords = part('Chords', keys.id, 'chordStabs', { voicing: 'triad', rhythm: 'syncopated' })
  const pMelody = part('Hook', lead.id, 'melodyPhrase', { density: 0.7, octave: 5 })
  const pBells = part('Bells', bells.id, 'chimeHits', { density: 0.5, octave: 6 })
  const pArp = part('Arp', keys.id, 'arpUp', { speed: 8, octave: 4 })

  const intro = section('intro', 4, anthem.id, [pArp.id, pBass.id])
  const verse = section('verse', 8, anthem.id, [pKick.id, pBass.id, pChords.id])
  const chorus = section('chorus', 8, anthem.id, [
    pKick.id,
    pBass.id,
    pChords.id,
    pMelody.id,
    pBells.id,
  ])
  const bridge = section('bridge', 4, anthem.id, [pBreak.id, pArp.id, pBass.id], [
    { type: 'filterSweep', from: 800, to: 2800 },
  ])
  const outro = section('outro', 4, anthem.id, [pArp.id, pBells.id], [{ type: 'fadeOut' }])

  return songOf(
    'Town Plaza',
    { bpm: 96, key: 'F', scale: 'major', swing: 0.12 },
    [drums, bass, keys, lead, bells],
    [anthem],
    [pKick, pBreak, pBass, pChords, pMelody, pBells, pArp],
    [intro, verse, chorus, bridge, outro],
    [
      { sectionId: intro.id },
      { sectionId: verse.id },
      { sectionId: chorus.id },
      { sectionId: verse.id },
      { sectionId: bridge.id },
      { sectionId: chorus.id },
      { sectionId: outro.id },
    ],
  )
}

/** Warm restaurant tutorial bed */
export function restaurantSong(): Song {
  const drums = inst('drumkit', 'Brushes', { bank: 'AkaiLinn', gain: 0.45 })
  const bass = inst('subBass', 'Upright-ish', { wave: 'triangle', cutoff: 380, gain: 0.35 })
  const piano = inst('piano', 'Cafe piano', { gain: 0.4, room: 0.5, delay: 0.15 })
  const pad = inst('pad', 'Warm pad', { gain: 0.22, room: 0.75, cutoff: 1400 })
  const lead = inst('lead', 'Soft lead', { wave: 'triangle', gain: 0.22, room: 0.4 })

  const cafe = { ...cafeProgression('prog-cafe'), id: 'prog-cafe' }

  const pDrums = part('Soft pulse', drums.id, 'sparsePulse', { density: 0.35 })
  const pBass = part('Walking', bass.id, 'walkingBass', { octave: 2 })
  const pPiano = part('Piano comps', piano.id, 'chordStabs', {
    voicing: 'seventh',
    rhythm: 'half',
  })
  const pPad = part('Pad', pad.id, 'chordStabs', { voicing: 'seventh', rhythm: 'whole' })
  const pMelody = part('Melody', lead.id, 'melodyPhrase', { density: 0.45, octave: 5 })
  const pImprov = part('Improv', lead.id, 'improv', { density: 0.4, octave: 5 })

  const intro = section('intro', 4, cafe.id, [pPad.id, pPiano.id], [{ type: 'fadeIn' }])
  const verse = section('verse', 8, cafe.id, [pDrums.id, pBass.id, pPiano.id, pPad.id])
  const chorus = section('chorus', 8, cafe.id, [
    pDrums.id,
    pBass.id,
    pPiano.id,
    pPad.id,
    pMelody.id,
  ])
  const solo = section('solo', 8, cafe.id, [pDrums.id, pBass.id, pPiano.id, pImprov.id])
  const outro = section('outro', 4, cafe.id, [pPad.id, pPiano.id], [{ type: 'fadeOut' }])

  return songOf(
    'Cozy Restaurant',
    { bpm: 90, key: 'G', scale: 'major', swing: 0.15 },
    [drums, bass, piano, pad, lead],
    [cafe],
    [pDrums, pBass, pPiano, pPad, pMelody, pImprov],
    [intro, verse, chorus, solo, outro],
    [
      { sectionId: intro.id },
      { sectionId: verse.id },
      { sectionId: chorus.id },
      { sectionId: verse.id },
      { sectionId: solo.id },
      { sectionId: chorus.id },
      { sectionId: outro.id },
    ],
  )
}

export const songPresets: Song[] = [cozyVillageSong(), townPlazaSong(), restaurantSong()]

export function cloneSong(song: Song): Song {
  return structuredClone(song)
}
