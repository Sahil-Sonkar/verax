import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { PrimaryButton } from './Dialog'
import type { Habit, SessionDay, SessionKind } from '../types'

const PRESETS = [5, 10, 15, 20, 30]

function formatClock(total: number) {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function FocusTimer({
  compact = false,
  defaultKind = 'MEDITATION',
  defaultMinutes,
  preferHabit,
}: {
  compact?: boolean
  defaultKind?: SessionKind
  defaultMinutes?: number
  preferHabit?: string
}) {
  const queryClient = useQueryClient()
  const habits = useQuery({ queryKey: ['habits'], queryFn: () => api<Habit[]>('/api/habits') })
  const day = useQuery({ queryKey: ['sessions'], queryFn: () => api<SessionDay>('/api/sessions') })
  const initial = defaultMinutes ?? (defaultKind === 'MEDITATION' ? 10 : 20)
  const [kind, setKind] = useState<SessionKind>(defaultKind)
  const [minutes, setMinutes] = useState(initial)
  const [remaining, setRemaining] = useState(initial * 60)
  const [running, setRunning] = useState(false)
  const [habitId, setHabitId] = useState('')
  const [error, setError] = useState('')
  const remainingRef = useRef(remaining)
  remainingRef.current = remaining
  const minutesRef = useRef(minutes)
  minutesRef.current = minutes
  const kindRef = useRef(kind)
  kindRef.current = kind
  const habitIdRef = useRef(habitId)
  habitIdRef.current = habitId

  useEffect(() => {
    if (!preferHabit || habitId || !habits.data) return
    const match = habits.data.find((habit) => habit.name.toLowerCase().includes(preferHabit.toLowerCase()))
    if (match) setHabitId(match.id)
  }, [preferHabit, habitId, habits.data])

  const save = useMutation({
    mutationFn: (seconds: number) =>
      api('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          kind: kindRef.current,
          seconds,
          habitId: habitIdRef.current || undefined,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
      void queryClient.invalidateQueries({ queryKey: ['today'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['metrics'] })
    },
  })

  async function log(seconds: number) {
    if (seconds < 1) return
    setError('')
    try {
      await save.mutateAsync(seconds)
      setRemaining(minutesRef.current * 60)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the session.')
    }
  }

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const next = remainingRef.current - 1
      if (next <= 0) {
        window.clearInterval(id)
        setRunning(false)
        setRemaining(0)
        void log(minutesRef.current * 60)
        return
      }
      setRemaining(next)
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  const logged =
    kind === 'MEDITATION' ? (day.data?.meditationSeconds ?? 0) : (day.data?.readingSeconds ?? 0)

  return (
    <section className={compact ? 'mt-4' : 'mt-10'}>
      {!compact && (
        <>
          <h2 className="text-sm font-medium">Focus</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Sit the timer. When it ends, minutes land on the matching metric and any linked habit.
          </p>
        </>
      )}
      {!compact && (
      <div className="segmented mt-3">
        {(['MEDITATION', 'READING'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className="chip capitalize"
            aria-pressed={kind === option}
            disabled={running}
            onClick={() => {
              setKind(option)
              const preset = option === 'MEDITATION' ? 10 : 20
              setMinutes(preset)
              setRemaining(preset * 60)
            }}
          >
            {option === 'MEDITATION' ? 'Meditation' : 'Reading'}
          </button>
        ))}
      </div>
      )}
      <div className={`${compact ? 'mt-2' : 'mt-6'} text-5xl tracking-tight tabular`}>{formatClock(remaining)}</div>
      <div className="segmented mt-3">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className="chip"
            aria-pressed={minutes === preset && !running}
            disabled={running}
            onClick={() => {
              setMinutes(preset)
              setRemaining(preset * 60)
            }}
          >
            {preset} min
          </button>
        ))}
      </div>
      <label className="mt-4 block max-w-xs" htmlFor="focus-habit">
        <span className="mb-1 block text-xs text-[var(--muted)]">Mark habit done (optional)</span>
        <select
          id="focus-habit"
          className="field"
          value={habitId}
          disabled={running}
          onChange={(e) => setHabitId(e.target.value)}
        >
          <option value="">Linked metric only</option>
          {habits.data?.map((habit) => (
            <option key={habit.id} value={habit.id}>
              {habit.name}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4 flex flex-wrap gap-3">
        <PrimaryButton
          onClick={() => {
            if (remaining <= 0) setRemaining(minutes * 60)
            setRunning((value) => !value)
          }}
        >
          {running ? 'Pause' : remaining === minutes * 60 ? 'Start' : 'Resume'}
        </PrimaryButton>
        <button
          type="button"
          className="text-sm text-[var(--muted)] hover:text-[var(--fg)]"
          onClick={() => {
            setRunning(false)
            setRemaining(minutes * 60)
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className="text-sm text-[var(--accent)] hover:opacity-80"
          onClick={() => void log(minutes * 60)}
          disabled={save.isPending || running}
        >
          Log {minutes} min now
        </button>
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Today: {Math.round(logged / 60)} min {kind === 'MEDITATION' ? 'meditation' : 'reading'}
      </p>
      {error && (
        <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
