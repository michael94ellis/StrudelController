import { useRef, useState } from 'react'
import { GripVertical, Plus, X } from 'lucide-react'
import { useSongStore } from '../store/songStore'
import { cn } from '../lib/cn'

const NEW_SECTION_TYPES = [
  'intro',
  'verse',
  'prechorus',
  'chorus',
  'bridge',
  'solo',
  'outro',
] as const

export function ArrangementTimeline() {
  const song = useSongStore((s) => s.song)
  const playMode = useSongStore((s) => s.playMode)
  const loopSectionId = useSongStore((s) => s.loopSectionId)
  const setPlayMode = useSongStore((s) => s.setPlayMode)
  const playSection = useSongStore((s) => s.playSection)
  const reorderArrangement = useSongStore((s) => s.reorderArrangement)
  const addArrangementSlot = useSongStore((s) => s.addArrangementSlot)
  const removeArrangementSlot = useSongStore((s) => s.removeArrangementSlot)
  const addSection = useSongStore((s) => s.addSection)

  const dragFrom = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const didDrag = useRef(false)

  const totalBars = song.arrangement.reduce((sum, slot) => {
    const sec = song.sections.find((s) => s.id === slot.sectionId)
    if (!sec) return sum
    return sum + sec.bars * (slot.repeat ?? 1)
  }, 0)

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">Arrangement</h2>
          <p className="text-sm text-muted">
            Drag to reorder · click to play · {totalBars} bars
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPlayMode('song')}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium border transition',
            playMode === 'song'
              ? 'bg-amber text-cream border-amber'
              : 'border-wood/20 text-ink-soft hover:border-wood/40',
          )}
        >
          Play full song
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {song.arrangement.map((slot, i) => {
          const sec = song.sections.find((s) => s.id === slot.sectionId)
          if (!sec) return null
          const bars = sec.bars * (slot.repeat ?? 1)
          const isActive = playMode === 'loop' && loopSectionId === sec.id
          const isOver = overIndex === i && dragging

          return (
            <div
              key={`${slot.sectionId}-${i}`}
              className={cn(
                'group relative rounded-xl border min-w-[4.5rem] transition',
                isActive
                  ? 'bg-ink text-cream border-ink'
                  : 'bg-cream/70 text-ink border-wood/15',
                isOver && 'ring-2 ring-amber/70 border-amber',
              )}
              style={{ flexGrow: bars }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (overIndex !== i) setOverIndex(i)
              }}
              onDragLeave={() => {
                if (overIndex === i) setOverIndex(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                const from = dragFrom.current
                dragFrom.current = null
                setOverIndex(null)
                setDragging(false)
                if (from === null || from === i) return
                didDrag.current = true
                reorderArrangement(from, i)
              }}
            >
              <button
                type="button"
                draggable
                onDragStart={(e) => {
                  dragFrom.current = i
                  didDrag.current = false
                  setDragging(true)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', String(i))
                }}
                onDragEnd={() => {
                  dragFrom.current = null
                  setOverIndex(null)
                  setDragging(false)
                }}
                onClick={() => {
                  if (didDrag.current) {
                    didDrag.current = false
                    return
                  }
                  playSection(sec.id)
                }}
                className="w-full cursor-grab active:cursor-grabbing px-3 py-2 text-left"
                title="Click to play · drag to reorder"
              >
                <span className="absolute left-1 top-1/2 -translate-y-1/2 opacity-40 group-hover:opacity-70">
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
                <p className="pl-3 pr-4 text-xs font-semibold capitalize">{sec.name}</p>
                <p
                  className={cn(
                    'pl-3 text-[10px]',
                    isActive ? 'text-cream/70' : 'text-muted',
                  )}
                >
                  {bars} bars
                </p>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeArrangementSlot(i)
                }}
                className={cn(
                  'absolute right-1 top-1 rounded-full p-0.5 opacity-0 transition group-hover:opacity-100',
                  isActive
                    ? 'text-cream/70 hover:bg-cream/20'
                    : 'text-muted hover:bg-wood/10 hover:text-ink',
                )}
                title="Remove from arrangement"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )
        })}

        <div className="relative">
          <select
            className="h-full appearance-none rounded-xl border border-dashed border-wood/25 bg-transparent px-3 py-2 pr-8 text-xs font-medium text-ink-soft hover:border-wood/50"
            defaultValue=""
            onChange={(e) => {
              const value = e.target.value
              if (value.startsWith('new:')) {
                addSection(value.slice(4))
              } else if (value) {
                addArrangementSlot(value)
              }
              e.target.value = ''
            }}
            title="Add section to arrangement"
          >
            <option value="" disabled>
              Add…
            </option>
            <optgroup label="New type">
              {NEW_SECTION_TYPES.map((type) => (
                <option key={type} value={`new:${type}`}>
                  New {type}
                </option>
              ))}
            </optgroup>
            <optgroup label="Existing">
              {song.sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </optgroup>
          </select>
          <Plus className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        </div>
      </div>
    </section>
  )
}
