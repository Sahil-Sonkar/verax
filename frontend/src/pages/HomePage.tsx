import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AddButton, TrashButton } from '../components/IconButtons'
import { Dialog, PrimaryButton } from '../components/Dialog'
import { ConsistencyHeatmap } from '../components/Heatmap'
import { Glyph } from '../components/Glyph'
import { MonoLine } from '../components/mono/MonoLine'
import { TrackerHabitRow } from '../components/TrackerHabitRow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '../lib/api'
import { flattenDay, isStepsHabit, isWaterHabit, pickTracked } from '../lib/dailyHabits'
import { HABIT_ICON_PICKER, habitIcon } from '../lib/habitIcons'
import type { CompletionStatus, DayMeals, DaySnapshot, Habit, Tracker } from '../types'

function iso(date: Date) {
  return new Intl.DateTimeFormat('en-CA').format(date)
}

function monthsBack(day: string, months: number) {
  const date = new Date(day + 'T00:00:00')
  date.setMonth(date.getMonth() - months, 1)
  return iso(date)
}

function weekKey(day: string) {
  const date = new Date(day + 'T00:00:00')
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return iso(date)
}

function weeklyPoints(cells: Tracker['heatmap']) {
  const buckets = new Map<string, number[]>()
  for (const cell of cells) {
    if (cell.score == null) continue
    const key = weekKey(cell.date)
    const list = buckets.get(key) ?? []
    list.push(cell.percent)
    buckets.set(key, list)
  }
  return [...buckets.entries()].slice(-16).map(([start, values]) => ({
    label: new Date(start + 'T00:00:00').toLocaleString(undefined, { month: 'short', day: 'numeric' }),
    value: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
  }))
}

function daysBack(day: string, days: number) {
  const date = new Date(day + 'T00:00:00')
  date.setDate(date.getDate() - days)
  return iso(date)
}

function graphPoints(cells: Tracker['heatmap']) {
  const scored = cells.filter((cell) => cell.score != null)
  if (scored.length <= 60) {
    return scored.map((cell) => ({
      label: new Date(cell.date + 'T00:00:00').toLocaleString(undefined, { month: 'short', day: 'numeric' }),
      value: cell.percent,
    }))
  }
  return weeklyPoints(cells)
}

const RANGE_PRESETS = [
  { label: '7d', days: 6 },
  { label: '30d', days: 29 },
  { label: '90d', days: 89 },
  { label: 'Year', days: 364 },
] as const

export function HomePage() {
  const queryClient = useQueryClient()
  const [steps, setSteps] = useState('')
  const [editing, setEditing] = useState<Habit | null | 'new'>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const today = useQuery({ queryKey: ['today'], queryFn: () => api<DaySnapshot>('/api/days/today') })
  const meals = useQuery({
    queryKey: ['meals', today.data?.date],
    queryFn: () => api<DayMeals>(`/api/meals/day?date=${today.data?.date}`),
    enabled: Boolean(today.data?.date),
  })
  const todayIso = today.data?.date ?? ''
  const rangeTo = to || todayIso
  const rangeFrom = from || (todayIso ? monthsBack(todayIso, 11) : '')
  const tracker = useQuery({
    queryKey: ['tracker', rangeFrom, rangeTo],
    queryFn: () => api<Tracker>(`/api/analytics/tracker?from=${rangeFrom}&to=${rangeTo}`),
    enabled: Boolean(rangeFrom && rangeTo),
  })

  const tracked = today.data ? pickTracked(flattenDay(today.data)) : []
  const trails = new Map((tracker.data?.trails ?? []).map((row) => [row.habitId, row.days]))
  const waterLiters = (meals.data?.waterMl ?? 0) / 1000
  const points = graphPoints(tracker.data?.heatmap ?? [])

  const mark = useMutation({
    mutationFn: ({ habitId, status, value }: { habitId: string; status: CompletionStatus; value?: number }) =>
      api<DaySnapshot>(`/api/days/${today.data?.date}/habits/${habitId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, value }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['today'], data)
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['tracker'] })
    },
  })
  const logSteps = useMutation({
    mutationFn: (value: number) =>
      api('/api/integrations/ingest', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'GOOGLE_HEALTH',
          metricName: 'Steps',
          unit: 'steps',
          date: today.data?.date,
          value,
        }),
      }),
    onSuccess: () => {
      setSteps('')
      void queryClient.invalidateQueries({ queryKey: ['today'] })
      void queryClient.invalidateQueries({ queryKey: ['tracker'] })
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/habits/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setEditing(null)
      void queryClient.invalidateQueries({ queryKey: ['today'] })
      void queryClient.invalidateQueries({ queryKey: ['tracker'] })
    },
  })

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker">Today</p>
          <h1 className="mt-2 text-5xl tracking-tight">Habits</h1>
        </div>
        <AddButton label="Add habit" variant="primary" onClick={() => setEditing('new')} />
      </div>

      <section>
        {today.isError ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            Could not load today’s habits. Refresh and try again.
          </p>
        ) : today.isLoading ? (
          <div className="skeleton h-64" />
        ) : tracked.length === 0 ? (
          <p className="py-8 text-sm text-[var(--muted)]">No habits on this list yet. Add one to start tracking.</p>
        ) : (
          <div className="border-y border-[var(--line)]">
            {tracked.map((item) => (
              <div key={item.habit.id}>
                <TrackerHabitRow
                  item={item}
                  trail={trails.get(item.habit.id) ?? []}
                  waterLiters={isWaterHabit(item) ? waterLiters : undefined}
                  onStatus={(habitId, status, value) => mark.mutate({ habitId, status, value })}
                  onEdit={() => setEditing(item.habit)}
                />
                {isStepsHabit(item) && item.status !== 'COMPLETED' && (
                  <form
                    className="flex gap-2 px-1 pb-4 pl-11"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const value = Number(steps)
                      if (!Number.isFinite(value) || value <= 0) return
                      logSteps.mutate(value)
                    }}
                  >
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      placeholder="Steps today"
                      value={steps}
                      onChange={(event) => setSteps(event.target.value)}
                      aria-label="Today's steps"
                    />
                    <Button type="submit" size="sm" disabled={logSteps.isPending}>
                      Log
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl tracking-tight">History</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Darkest green is a perfect day. Hover a square for the count.</p>
          </div>
          {todayIso && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="control-cluster">
                {RANGE_PRESETS.map((preset) => {
                  const start = daysBack(todayIso, preset.days)
                  const active = rangeFrom === start && rangeTo === todayIso
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setFrom(start)
                        setTo(todayIso)
                      }}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
              <label className="block" htmlFor="home-from">
                <span className="mb-1 block text-[11px] text-[var(--muted)]">From</span>
                <input
                  id="home-from"
                  type="date"
                  className="field min-w-[9.5rem] py-2"
                  max={rangeTo}
                  value={rangeFrom}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </label>
              <label className="block" htmlFor="home-to">
                <span className="mb-1 block text-[11px] text-[var(--muted)]">To</span>
                <input
                  id="home-to"
                  type="date"
                  className="field min-w-[9.5rem] py-2"
                  min={rangeFrom}
                  max={todayIso}
                  value={rangeTo}
                  onChange={(event) => setTo(event.target.value)}
                />
              </label>
            </div>
          )}
        </div>
        <div className="mt-4">
          {tracker.isLoading ? (
            <div className="skeleton h-32" />
          ) : (
            <ConsistencyHeatmap cells={tracker.data?.heatmap ?? []} tone="green" />
          )}
        </div>
      </section>

      {points.length > 1 && (
        <section>
          <h2 className="text-2xl tracking-tight">Score</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Consistency for the range above.</p>
          <div className="mt-4">
            <MonoLine data={points} format={(value) => `${Math.round(value)}%`} />
          </div>
        </section>
      )}

      {editing && (
        <TrackerForm
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void queryClient.invalidateQueries({ queryKey: ['today'] })
            void queryClient.invalidateQueries({ queryKey: ['tracker'] })
          }}
          onDelete={
            editing === 'new'
              ? undefined
              : () => {
                  if (window.confirm(`Remove “${editing.name}” from this list?`)) remove.mutate(editing.id)
                }
          }
        />
      )}
    </div>
  )
}

function TrackerForm({
  initial,
  onClose,
  onSaved,
  onDelete,
}: {
  initial: Habit | null
  onClose: () => void
  onSaved: () => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? 'sparkles')
  const [targetValue, setTargetValue] = useState(initial?.targetValue?.toString() ?? '')
  const [unit, setUnit] = useState(initial?.unit ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <Dialog
      title={initial ? 'Edit habit' : 'New habit'}
      onClose={onClose}
      action={
        onDelete ? <TrashButton label={`Delete ${initial?.name ?? 'habit'}`} onClick={onDelete} /> : undefined
      }
    >
      <form
        className="mt-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          try {
            await api(initial ? `/api/habits/${initial.id}` : '/api/habits', {
              method: initial ? 'PATCH' : 'POST',
              body: JSON.stringify({
                name,
                icon,
                tracked: true,
                targetValue: targetValue ? Number(targetValue) : null,
                unit,
                ...(initial
                  ? {}
                  : { frequencyType: 'DAILY', frequencyConfig: {}, startDate: iso(new Date()) }),
              }),
            })
            onSaved()
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <label className="block" htmlFor="tracker-name">
          <span className="mb-1 block text-xs text-[var(--muted)]">Name</span>
          <input
            id="tracker-name"
            className="field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <fieldset>
          <legend className="mb-1 text-xs text-[var(--muted)]">Icon</legend>
          <div className="grid grid-cols-6 gap-1">
            {HABIT_ICON_PICKER.map((key) => (
              <button
                key={key}
                type="button"
                aria-label={key}
                aria-pressed={icon === key}
                onClick={() => setIcon(key)}
                className="grid size-10 place-items-center rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={
                  icon === key
                    ? { background: 'color-mix(in srgb, var(--accent) 18%, transparent)', color: 'var(--accent)' }
                    : { color: 'var(--muted)' }
                }
              >
                <Glyph icon={habitIcon(key)} size={18} />
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="block" htmlFor="tracker-target">
            <span className="mb-1 block text-xs text-[var(--muted)]">Target</span>
            <input
              id="tracker-target"
              className="field"
              inputMode="decimal"
              value={targetValue}
              onChange={(event) => setTargetValue(event.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="block" htmlFor="tracker-unit">
            <span className="mb-1 block text-xs text-[var(--muted)]">Unit</span>
            <input
              id="tracker-unit"
              className="field"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              autoComplete="off"
            />
          </label>
        </div>
        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end pt-2">
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </PrimaryButton>
        </div>
      </form>
    </Dialog>
  )
}
