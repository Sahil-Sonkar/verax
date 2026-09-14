import { useMemo, useState } from 'react'
import { AddButton } from './IconButtons'
import { PrimaryButton } from './Dialog'
import { ExerciseMedia } from './ExerciseMedia'
import { RestTimer, startRest } from './RestTimer'
import { api } from '../lib/api'
import { findExercise } from '../lib/opengym/catalog'
import { best1RM, estimate1RM } from '../lib/opengym/onerm'
import { useWakeLock } from '../lib/opengym/wakelock'
import type { TrainSession, TrainSet } from '../types'

function groupSets(sets: TrainSession['sets']) {
  const map = new Map<string, TrainSession['sets']>()
  for (const set of sets) {
    const list = map.get(set.exerciseName) ?? []
    list.push(set)
    map.set(set.exerciseName, list)
  }
  return [...map.entries()]
}

function lastFor(history: TrainSession[], name: string, skipId: string) {
  for (const session of [...history].sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt))) {
    if (session.id === skipId || !session.endedAt) continue
    const rows = session.sets.filter((set) => set.exerciseName === name && (set.reps || set.kg || set.seconds))
    if (rows.length) return { date: session.startedAt, rows }
  }
  return null
}

function clock(total: number) {
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function Stepper({
  value,
  onChange,
  step,
  decimal,
}: {
  value: string
  onChange: (next: string) => void
  step: number
  decimal?: boolean
}) {
  const n = Number(value) || 0
  return (
    <div className="flex min-w-0 items-center rounded-lg border border-[var(--line)]">
      <button
        type="button"
        className="grid size-11 shrink-0 place-items-center text-lg leading-none text-[var(--muted)]"
        aria-label="Decrease"
        onClick={() => onChange(String(Math.max(0, Math.round((n - step) * 100) / 100)))}
      >
        −
      </button>
      <input
        className="h-11 w-full min-w-0 border-0 bg-transparent text-center text-base tabular outline-none"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="grid size-11 shrink-0 place-items-center text-lg leading-none text-[var(--muted)]"
        aria-label="Increase"
        onClick={() => onChange(String(Math.round((n + step) * 100) / 100))}
      >
        +
      </button>
    </div>
  )
}

export function GuidedWorkout({
  session,
  elapsed,
  history,
  onRefresh,
  onEnd,
}: {
  session: TrainSession
  elapsed: number
  history: TrainSession[]
  onRefresh: () => void
  onEnd: () => void | Promise<void>
}) {
  useWakeLock(true)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, { reps?: string; kg?: string; seconds?: string }>>({})
  const groups = useMemo(() => groupSets(session.sets), [session.sets])

  function lastSet(name: string, setIndex: number) {
    const last = lastFor(history, name, session.id)
    return last?.rows.find((row) => row.setIndex === setIndex) ?? last?.rows[setIndex - 1] ?? null
  }

  function draft(set: TrainSet) {
    const current = drafts[set.id] ?? {}
    const previous = lastSet(set.exerciseName, set.setIndex)
    return {
      reps: current.reps ?? (set.reps != null ? String(set.reps) : previous?.reps != null ? String(previous.reps) : ''),
      kg: current.kg ?? (set.kg != null ? String(set.kg) : previous?.kg != null ? String(previous.kg) : ''),
      seconds:
        current.seconds ??
        (set.seconds != null ? String(set.seconds) : previous?.seconds != null ? String(previous.seconds) : ''),
    }
  }

  function patchDraft(id: string, field: 'reps' | 'kg' | 'seconds', value: string) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }))
  }

  async function saveSet(set: TrainSet, extra?: { reps?: string; kg?: string; seconds?: string }) {
    const values = { ...draft(set), ...extra }
    const body =
      set.track === 'TIME'
        ? { seconds: Number(values.seconds) || 0 }
        : { reps: Number(values.reps) || 0, kg: Number(values.kg) || 0 }
    await api(`/api/play/sets/${set.id}`, { method: 'PATCH', body: JSON.stringify(body) })
  }

  async function checkSet(set: TrainSet) {
    await saveSet(set)
    setDone((current) => ({ ...current, [set.id]: true }))
    startRest(90)
    onRefresh()
  }

  return (
    <section className="card p-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="kicker">Live session</p>
          <h2 className="mt-1 truncate text-lg font-medium tracking-tight">{session.name}</h2>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-[var(--muted)]">Workout</div>
          <div className="tabular text-2xl tracking-tight lg:text-3xl">{clock(elapsed)}</div>
          <RestTimer />
        </div>
      </div>
      <div className="mt-4 space-y-5">
        {groups.map(([name, rows]) => {
            const ex = findExercise(name)
            const last = lastFor(history, name, session.id)
            const est = best1RM(
              history.flatMap((row) => row.sets.filter((set) => set.exerciseName === name)),
            )
            return (
              <div key={name} className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
                <div className="relative h-36 overflow-hidden rounded-xl bg-[var(--surface-2)] lg:h-52">
                    {ex ? (
                      <ExerciseMedia ex={ex} split />
                    ) : (
                      <div className="grid h-full place-items-center px-3 text-center text-xs text-[var(--muted)]">
                        No demo for this movement
                      </div>
                    )}
                </div>
                <div className="flex min-h-0 flex-col rounded-xl bg-[var(--surface-2)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium capitalize">{name}</div>
                    {ex && (
                      <div className="mt-0.5 text-xs text-[var(--muted)]">
                        {[ex.tg || ex.bp, ex.eq].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <AddButton
                    label="Add set"
                    onClick={async () => {
                      const first = rows[0]
                      const previous = lastSet(name, rows.length + 1)
                      await api(`/api/play/sessions/${session.id}/sets`, {
                        method: 'POST',
                        body: JSON.stringify({
                          exerciseName: name,
                          muscle: first?.muscle,
                          track: first?.track,
                          reps: previous?.reps,
                          kg: previous?.kg,
                          seconds: previous?.seconds,
                        }),
                      })
                      onRefresh()
                    }}
                  />
                </div>
                {last && (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Last time:{' '}
                    {last.rows
                      .map((set) =>
                        set.track === 'TIME' ? `${set.seconds ?? 0}s` : `${set.kg ?? 0}×${set.reps ?? 0}`,
                      )
                      .join(', ')}
                  </p>
                )}
                {est && (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Est. 1RM {est.est} kg from {est.w}×{est.r}
                  </p>
                )}
                <div className="mt-3 grid flex-1 content-start gap-2">
                  {rows.map((set) => {
                    const values = draft(set)
                    const checked = done[set.id]
                    const liveEst = estimate1RM(Number(values.kg), Number(values.reps))
                    return (
                      <div
                        key={set.id}
                        className={`grid min-w-0 items-center gap-2 rounded-lg border border-[var(--line)] px-2 py-2 ${checked ? 'bg-[var(--surface-2)]' : ''} ${set.track === 'TIME' ? 'grid-cols-[2rem_minmax(0,1fr)_auto]' : 'grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_auto]'}`}
                      >
                        <span className="text-center text-xs text-[var(--muted)]">{set.setIndex}</span>
                        {set.track === 'TIME' ? (
                          <Stepper
                            value={values.seconds}
                            step={5}
                            onChange={(next) => patchDraft(set.id, 'seconds', next)}
                          />
                        ) : (
                          <>
                            <Stepper
                              value={values.kg}
                              step={2.5}
                              decimal
                              onChange={(next) => patchDraft(set.id, 'kg', next)}
                            />
                            <Stepper
                              value={values.reps}
                              step={1}
                              onChange={(next) => patchDraft(set.id, 'reps', next)}
                            />
                          </>
                        )}
                        <button
                          type="button"
                          className={`grid size-11 place-items-center rounded-full border ${checked ? 'border-[var(--mint)] bg-[var(--mint)] text-[var(--bg)]' : 'border-[var(--line)]'}`}
                          aria-pressed={checked}
                          aria-label={checked ? 'Set logged' : 'Log set'}
                          onClick={() => void checkSet(set)}
                        >
                          ✓
                        </button>
                        {liveEst != null && !checked && (
                          <span className="col-span-full text-[10px] text-[var(--muted)]">est. 1RM {liveEst} kg</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-5">
          <PrimaryButton
            onClick={async () => {
              for (const set of session.sets) {
                if (drafts[set.id]) await saveSet(set)
              }
              await onEnd()
            }}
          >
            End session
          </PrimaryButton>
        </div>
    </section>
  )
}
