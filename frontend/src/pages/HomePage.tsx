import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AddButton, TrashButton } from '../components/IconButtons'
import { Dialog, PrimaryButton } from '../components/Dialog'
import { ConsistencyHeatmap } from '../components/Heatmap'
import { Glyph } from '../components/Glyph'
import { MonoLine } from '../components/mono/MonoLine'
import { TrackerHabitRow } from '../components/TrackerHabitRow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '../lib/api'
import { flattenDay, isStepsHabit, isWaterHabit, pickTracked } from '../lib/dailyHabits'
import { HABIT_ICON_PICKER, habitIcon } from '../lib/habitIcons'
import { habitColor, habitDayColor, nextHabitStatus } from '../lib/colors'
import type { CompletionStatus, DayMeals, DaySnapshot, Habit, HabitPoint, HabitSeries, HeatCell, Tracker } from '../types'

function iso(date: Date) {
  return new Intl.DateTimeFormat('en-CA').format(date)
}

function daysBack(day: string, days: number) {
  const date = new Date(day + 'T00:00:00')
  date.setDate(date.getDate() - days)
  return iso(date)
}

function linePoints(rows: { date: string; percent: number }[]) {
  return rows.map((row) => ({
    label: new Date(row.date + 'T00:00:00').toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    }),
    value: row.percent,
  }))
}

function seriesCells(points: HabitPoint[]): HeatCell[] {
  return points.map((point) => ({
    date: point.date,
    percent: point.percent,
    level: point.status === 'COMPLETED' ? 5 : point.status === 'PARTIAL' ? 2 : point.status ? 1 : 0,
    score: point.status ? point.percent / 100 : undefined,
    status: point.status,
  }))
}

export function HomePage() {
  const queryClient = useQueryClient()
  const [steps, setSteps] = useState('')
  const [sheet, setSheet] = useState<Habit | 'new' | null>(null)
  const today = useQuery({ queryKey: ['today'], queryFn: () => api<DaySnapshot>('/api/days/today') })
  const meals = useQuery({
    queryKey: ['meals', today.data?.date],
    queryFn: () => api<DayMeals>(`/api/meals/day?date=${today.data?.date}`),
    enabled: Boolean(today.data?.date),
  })
  const todayIso = today.data?.date ?? ''
  const rangeTo = todayIso
  const rangeFrom = todayIso ? daysBack(todayIso, 364) : ''
  const tracker = useQuery({
    queryKey: ['tracker', rangeFrom, rangeTo],
    queryFn: () => api<Tracker>(`/api/analytics/tracker?from=${rangeFrom}&to=${rangeTo}`),
    enabled: Boolean(rangeFrom && rangeTo),
  })

  const tracked = today.data ? pickTracked(flattenDay(today.data)) : []
  const trails = new Map((tracker.data?.trails ?? []).map((row) => [row.habitId, row.days]))
  const waterLiters = (meals.data?.waterMl ?? 0) / 1000
  const points = linePoints(tracker.data?.heatmap ?? [])

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
      void queryClient.invalidateQueries({ queryKey: ['habit-series'] })
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
      setSheet(null)
      void queryClient.invalidateQueries({ queryKey: ['today'] })
      void queryClient.invalidateQueries({ queryKey: ['tracker'] })
      void queryClient.invalidateQueries({ queryKey: ['habit-series'] })
    },
  })

  return (
    <div className="flex min-w-0 flex-col gap-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker">Today</p>
          <h1 className="mt-2 text-4xl tracking-tight min-[720px]:text-5xl">Habits</h1>
        </div>
        <AddButton label="Add habit" variant="primary" onClick={() => setSheet('new')} />
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
                  onOpen={() => setSheet(item.habit)}
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

      <Card className="min-w-0 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-2xl font-normal tracking-tight">History</CardTitle>
          <CardDescription>Last year. Darkest green is a perfect day. Tap a square for the count.</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 px-5">
          {tracker.isLoading ? (
            <div className="skeleton h-32" />
          ) : (
            <ConsistencyHeatmap cells={tracker.data?.heatmap ?? []} tone="green" />
          )}
        </CardContent>
      </Card>

      {points.length > 1 && (
        <Card className="py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-2xl font-normal tracking-tight">Score</CardTitle>
            <CardDescription>Last year of consistency.</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <MonoLine data={points} domain={[0, 100]} format={(value) => `${Math.round(value)}%`} />
          </CardContent>
        </Card>
      )}

      {sheet === 'new' && (
        <TrackerForm
          initial={null}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null)
            void queryClient.invalidateQueries({ queryKey: ['today'] })
            void queryClient.invalidateQueries({ queryKey: ['tracker'] })
          }}
        />
      )}
      {sheet && sheet !== 'new' && todayIso && (
        <HabitDialog
          habit={tracked.find((row) => row.habit.id === sheet.id)?.habit ?? sheet}
          today={todayIso}
          onClose={() => setSheet(null)}
          onDelete={() => {
            if (window.confirm(`Remove “${sheet.name}” from this list?`)) remove.mutate(sheet.id)
          }}
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

function HabitDialog({
  habit,
  today,
  onClose,
  onDelete,
}: {
  habit: Habit
  today: string
  onClose: () => void
  onDelete: () => void
}) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [name, setName] = useState(habit.name)
  const [icon, setIcon] = useState(habit.icon ?? 'sparkles')
  const [targetValue, setTargetValue] = useState(habit.targetValue?.toString() ?? '')
  const [unit, setUnit] = useState(habit.unit ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const from = daysBack(today, 364)
  const accent = habitColor(habit.id)
  const Icon = habitIcon(icon)
  const series = useQuery({
    queryKey: ['habit-series', habit.id, from, today],
    queryFn: () => api<HabitSeries>(`/api/analytics/habits/${habit.id}/series?from=${from}&to=${today}`),
  })
  const cells = seriesCells(series.data?.points ?? [])
  const line = linePoints(series.data?.points ?? [])
  const legend = [
    { color: habitDayColor('MISSED'), label: 'Miss' },
    { color: habitDayColor('PARTIAL', accent), label: 'Half' },
    { color: accent, label: 'Done' },
  ]
  const heat = (
    <ConsistencyHeatmap
      cells={cells}
      colorOf={(cell) => habitDayColor(cell.status, accent)}
      legend={legend}
      onSelect={
        mode === 'edit'
          ? async (date) => {
              const current = series.data?.points.find((point) => point.date === date)?.status
              try {
                await api(`/api/days/${date}/habits/${habit.id}`, {
                  method: 'PUT',
                  body: JSON.stringify({ status: nextHabitStatus(current) }),
                })
                void queryClient.invalidateQueries({ queryKey: ['habit-series', habit.id] })
                void queryClient.invalidateQueries({ queryKey: ['today'] })
                void queryClient.invalidateQueries({ queryKey: ['tracker'] })
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not update that day.')
              }
            }
          : undefined
      }
    />
  )

  return (
    <Dialog
      title={mode === 'edit' ? 'Edit habit' : name}
      onClose={onClose}
      onBack={mode === 'edit' ? () => setMode('view') : undefined}
      action={
        mode === 'view' ? (
          <button
            type="button"
            className="px-3 text-sm font-semibold"
            onClick={() => setMode('edit')}
          >
            Edit
          </button>
        ) : (
          <TrashButton label={`Delete ${name}`} onClick={onDelete} />
        )
      }
    >
      {mode === 'view' ? (
        <div className="mt-2 space-y-6">
          <div className="flex items-center gap-3">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-full"
              style={{ background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent }}
            >
              <Glyph icon={Icon} size={22} />
            </span>
            <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <dt className="text-[11px] text-[var(--muted)]">Target</dt>
                <dd className="tabular">{targetValue || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--muted)]">Unit</dt>
                <dd>{unit || '—'}</dd>
              </div>
            </dl>
          </div>
          <section>
            <h3 className="text-sm font-medium">History</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">Dark is done. Light is half. Black is miss or skip.</p>
            <div className="mt-3 min-w-0">{series.isLoading ? <div className="skeleton h-32" /> : heat}</div>
          </section>
          {line.length > 1 && (
            <section>
              <h3 className="text-sm font-medium">All</h3>
              <div className="mt-3">
                <MonoLine data={line} color={accent} domain={[0, 100]} format={(value) => `${Math.round(value)}%`} />
              </div>
            </section>
          )}
        </div>
      ) : (
        <form
          className="mt-4 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            try {
              const saved = await api<Habit>(`/api/habits/${habit.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  name,
                  icon,
                  tracked: true,
                  targetValue: targetValue ? Number(targetValue) : null,
                  unit,
                }),
              })
              setName(saved.name)
              setIcon(saved.icon ?? 'sparkles')
              setTargetValue(saved.targetValue?.toString() ?? '')
              setUnit(saved.unit ?? '')
              void queryClient.invalidateQueries({ queryKey: ['today'] })
              void queryClient.invalidateQueries({ queryKey: ['tracker'] })
              setMode('view')
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not save.')
            } finally {
              setBusy(false)
            }
          }}
        >
          <label className="block" htmlFor="habit-name">
            <span className="mb-1 block text-xs text-[var(--muted)]">Name</span>
            <input
              id="habit-name"
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
                      ? { background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent }
                      : { color: 'var(--muted)' }
                  }
                >
                  <Glyph icon={habitIcon(key)} size={18} />
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <label className="block" htmlFor="habit-target">
              <span className="mb-1 block text-xs text-[var(--muted)]">Target</span>
              <input
                id="habit-target"
                className="field"
                inputMode="decimal"
                value={targetValue}
                onChange={(event) => setTargetValue(event.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="block" htmlFor="habit-unit">
              <span className="mb-1 block text-xs text-[var(--muted)]">Unit</span>
              <input
                id="habit-unit"
                className="field"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                autoComplete="off"
              />
            </label>
          </div>
          <section>
            <h3 className="text-sm font-medium">History</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">Tap a day: miss, half, done.</p>
            <div className="mt-3 min-w-0">{series.isLoading ? <div className="skeleton h-32" /> : heat}</div>
          </section>
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
      )}
    </Dialog>
  )
}
