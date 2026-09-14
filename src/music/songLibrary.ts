import type { Song } from './types'
import { cloneSong, songPresets } from './presets'

const STORAGE_KEY = 'beat-studio:library'
const STORAGE_VERSION = 1

export type SongLibraryBlob = {
  version: number
  activeSongId: string
  songs: Song[]
}

function seedLibrary(): SongLibraryBlob {
  const songs = songPresets.map((p) => cloneSong(p))
  return {
    version: STORAGE_VERSION,
    activeSongId: songs[0]?.id ?? '',
    songs,
  }
}

export function loadLibrary(): SongLibraryBlob {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedLibrary()
    const parsed = JSON.parse(raw) as SongLibraryBlob
    if (
      !parsed ||
      parsed.version !== STORAGE_VERSION ||
      !Array.isArray(parsed.songs) ||
      parsed.songs.length === 0
    ) {
      return seedLibrary()
    }
    const activeSongId =
      parsed.songs.some((s) => s.id === parsed.activeSongId)
        ? parsed.activeSongId
        : parsed.songs[0].id
    return { version: STORAGE_VERSION, activeSongId, songs: parsed.songs }
  } catch {
    return seedLibrary()
  }
}

export function saveLibrary(songs: Song[], activeSongId: string): void {
  try {
    const blob: SongLibraryBlob = {
      version: STORAGE_VERSION,
      activeSongId,
      songs,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blob))
  } catch (err) {
    console.warn('[beat-studio] failed to save library', err)
  }
}

export function uniqueSongTitle(base: string, songs: Song[], exceptId?: string): string {
  const names = new Set(
    songs.filter((s) => s.id !== exceptId).map((s) => s.title),
  )
  if (!names.has(base)) return base
  let n = 2
  while (names.has(`${base} ${n}`)) n += 1
  return `${base} ${n}`
}
