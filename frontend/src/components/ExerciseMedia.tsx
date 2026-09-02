import { useState } from 'react'
import type { GymExercise } from '../lib/opengym/catalog'
import { gifSrc, imgSrc } from '../lib/opengym/catalog'

export function ExerciseMedia({
  ex,
  compact = false,
  split = false,
}: {
  ex: GymExercise
  compact?: boolean
  split?: boolean
}) {
  const [playing, setPlaying] = useState(true)
  const [mini, setMini] = useState(false)
  if (!ex.gif) return null
  if (split) {
    return (
      <div className="absolute inset-0" onClick={() => setPlaying((on) => !on)}>
        <img
          className="size-full object-contain"
          decoding="async"
          src={playing ? gifSrc(ex) : imgSrc(ex)}
          alt={ex.n}
        />
        <span className="pointer-events-none absolute bottom-2 left-2 text-[11px] text-[var(--muted)]">
          {playing ? 'tap to pause' : 'tap to play'}
        </span>
      </div>
    )
  }
  const box = compact || mini ? 'h-28' : 'aspect-[4/3] max-h-64'
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[var(--surface-2)] ${box}`}
      onClick={() => setPlaying((on) => !on)}
    >
      <img
        className="size-full object-cover"
        decoding="async"
        src={playing ? gifSrc(ex) : imgSrc(ex)}
        alt={ex.n}
      />
      <button
        type="button"
        className="absolute top-2 right-2 rounded-md bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] px-2 py-1 text-[11px]"
        onClick={(event) => {
          event.stopPropagation()
          setMini((on) => !on)
        }}
      >
        {mini ? 'Expand' : 'Minimize'}
      </button>
      {!mini && (
        <span className="pointer-events-none absolute bottom-2 left-2 text-[11px] text-[var(--muted)]">
          {playing ? 'tap to pause' : 'tap to play'}
        </span>
      )}
    </div>
  )
}
