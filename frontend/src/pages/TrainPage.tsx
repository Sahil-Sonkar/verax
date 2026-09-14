import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MuscleSplit } from '../components/MuscleSplit'
import { MonoLine } from '../components/mono/MonoLine'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { Dialog, PrimaryButton } from '../components/Dialog'
import { AddButton, TrashButton } from '../components/IconButtons'
import { GuidedWorkout } from '../components/GuidedWorkout'
import { ExerciseMedia } from '../components/ExerciseMedia'
import { PageHeader, PageTabs } from '../components/PageHeader'
import { ChartCard } from '../components/mono/ChartCard'
import { api, getToken } from '../lib/api'
import { findExercise, searchCatalog } from '../lib/opengym/catalog'
import { readImageText } from '../lib/ocr'
import type {
  BodyLog,
  BodyProfile,
  TrainActivity,
  TrainSession,
  TrainSessionReport,
  TrainSummary,
  TrainTemplate,
  TrainExercise,
  PlannedSet,
  ExerciseHit,
} from '../types'

function today() {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

function shift(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return new Intl.DateTimeFormat('en-CA').format(date)
}

type HistoryGrain = 'day' | 'week' | 'month'

function historyFrom(grain: HistoryGrain) {
  if (grain === 'month') return shift(-365)
  if (grain === 'week') return shift(-84)
  return shift(-21)
}

function formatPeriodLabel(period: string, grain: HistoryGrain) {
  if (grain === 'week') {
    const match = period.match(/^(\d{4})-W(\d+)$/)
    return match ? `W${Number(match[2])}` : period
  }
  if (grain === 'month') {
    const [year, month] = period.split('-')
    if (!year || !month) return period
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-IN', {
      month: 'short',
      year: '2-digit',
    })
  }
  const date = new Date(`${period}T00:00:00`)
  if (Number.isNaN(date.getTime())) return period
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function clock(total: number) {
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const TABS = [
  { id: 'workouts', label: 'Workouts' },
  { id: 'history', label: 'History' },
  { id: 'body', label: 'Body' },
] as const

type Tab = (typeof TABS)[number]['id']

const COMPOSITION: { key: keyof BodyLog; label: string }[] = [
  { key: 'weightKg', label: 'Weight (kg)' },
  { key: 'bmi', label: 'BMI' },
  { key: 'bodyFatPct', label: 'Body fat %' },
  { key: 'fatFreeKg', label: 'Fat-free weight (kg)' },
  { key: 'subcutaneousFatPct', label: 'Subcutaneous fat %' },
  { key: 'visceralFat', label: 'Visceral fat' },
  { key: 'bodyWaterPct', label: 'Body water %' },
  { key: 'skeletalMusclePct', label: 'Skeletal muscle %' },
  { key: 'muscleMassKg', label: 'Muscle mass (kg)' },
  { key: 'muscleStorage', label: 'Muscle storage' },
  { key: 'boneMassKg', label: 'Bone mass (kg)' },
  { key: 'proteinPct', label: 'Protein %' },
  { key: 'bmrKcal', label: 'BMR (kcal)' },
  { key: 'metabolicAge', label: 'Metabolic age' },
]

const TAPE: { key: keyof BodyLog; label: string }[] = [
  { key: 'waistCm', label: 'Waist' },
  { key: 'chestCm', label: 'Chest' },
  { key: 'leftBicepCm', label: 'Left bicep' },
  { key: 'rightBicepCm', label: 'Right bicep' },
  { key: 'hipsCm', label: 'Hips' },
  { key: 'leftThighCm', label: 'Left thigh' },
  { key: 'rightThighCm', label: 'Right thigh' },
  { key: 'neckCm', label: 'Neck' },
  { key: 'shouldersCm', label: 'Shoulders' },
  { key: 'leftCalfCm', label: 'Left calf' },
  { key: 'rightCalfCm', label: 'Right calf' },
  { key: 'leftForearmCm', label: 'Left forearm' },
  { key: 'rightForearmCm', label: 'Right forearm' },
]

const TAPE_UNIT_KEY = 'verax.train.tapeUnit'
const CM_PER_INCH = 2.54
type TapeUnit = 'cm' | 'in'

function readTapeUnit(): TapeUnit {
  return localStorage.getItem(TAPE_UNIT_KEY) === 'in' ? 'in' : 'cm'
}

function useTapeUnit() {
  const [unit, setUnit] = useState<TapeUnit>(readTapeUnit)
  function setTapeUnit(next: TapeUnit) {
    setUnit(next)
    localStorage.setItem(TAPE_UNIT_KEY, next)
  }
  return [unit, setTapeUnit] as const
}

function TapeUnitToggle({ unit, onChange }: { unit: TapeUnit; onChange: (unit: TapeUnit) => void }) {
  return (
    <div className="flex rounded-lg border border-[var(--line)] p-0.5" role="group" aria-label="Length unit">
      {(['cm', 'in'] as const).map((item) => (
        <button
          key={item}
          type="button"
          className={unit === item ? 'glass-primary px-3 py-1.5 text-sm' : 'px-3 py-1.5 text-sm text-[var(--muted)]'}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

function roundTape(value: number, unit: TapeUnit) {
  const places = unit === 'in' ? 2 : 1
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

function cmToUnit(cm: number, unit: TapeUnit) {
  return unit === 'in' ? cm / CM_PER_INCH : cm
}

function unitToCm(value: number, unit: TapeUnit) {
  return unit === 'in' ? value * CM_PER_INCH : value
}

function convertTapeDraft(draft: Record<string, string>, from: TapeUnit, to: TapeUnit) {
  if (from === to) return draft
  const next = { ...draft }
  for (const row of TAPE) {
    const raw = draft[row.key]
    if (!raw?.trim()) continue
    const numeric = Number(raw)
    if (!Number.isFinite(numeric)) continue
    next[row.key] = String(roundTape(cmToUnit(unitToCm(numeric, from), to), to))
  }
  return next
}

export function TrainPage() {
  const queryClient = useQueryClient()
  const from = shift(-56)
  const to = today()
  const [tab, setTab] = useState<Tab>(() => {
    const stored = localStorage.getItem('verax.train.tab')
    return stored === 'history' || stored === 'body' ? stored : 'workouts'
  })
  const [grain, setGrain] = useState<HistoryGrain>('week')
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const chartFrom = historyFrom(grain)
  const templates = useQuery({ queryKey: ['train-templates'], queryFn: () => api<TrainTemplate[]>('/api/play/templates') })
  const sessions = useQuery({
    queryKey: ['train-sessions', from, to],
    queryFn: () => api<TrainSession[]>(`/api/play/sessions?from=${from}&to=${to}`),
  })
  const summary = useQuery({
    queryKey: ['train-summary', chartFrom, to, grain],
    queryFn: () => api<TrainSummary>(`/api/play/summary?from=${chartFrom}&to=${to}&granularity=${grain}`),
  })
  const activities = useQuery({
    queryKey: ['train-activities', from, to],
    queryFn: () => api<TrainActivity[]>(`/api/play/activities?from=${from}&to=${to}`),
  })
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem('verax.train.session'))
  const active = useQuery({
    queryKey: ['train-session', activeId],
    queryFn: () => api<TrainSession>(`/api/play/sessions/${activeId}`),
    enabled: Boolean(activeId),
    refetchInterval: activeId ? 15_000 : false,
  })
  const [reportId, setReportId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [garminOpen, setGarminOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [activityName, setActivityName] = useState('Run')
  const [activityType, setActivityType] = useState('RUNNING')
  const [activityDate, setActivityDate] = useState(today())
  const [durationMin, setDurationMin] = useState('40')
  const [distance, setDistance] = useState('')
  const [calories, setCalories] = useState('')
  const [hr, setHr] = useState('')
  const [customName, setCustomName] = useState('')

  useEffect(() => {
    if (!active.data || active.data.endedAt) return
    const started = new Date(active.data.startedAt).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [active.data])

  const trends = useMemo(
    () =>
      (summary.data?.trends ?? []).map((row) => ({
        ...row,
        volume: Number(row.volume),
        label: formatPeriodLabel(row.period, grain),
        radar: (row.radar ?? []).map((point) => ({ ...point, volume: Number(point.volume) })),
      })),
    [summary.data, grain],
  )
  const activePeriod =
    selectedPeriod && trends.some((row) => row.period === selectedPeriod)
      ? selectedPeriod
      : ([...trends].reverse().find((row) => row.volume > 0) ?? trends.at(-1))?.period ?? null
  const radar = useMemo(() => {
    const point = trends.find((row) => row.period === activePeriod)
    const source = point?.radar?.length ? point.radar : (summary.data?.radar ?? [])
    return source.map((row) => ({ ...row, volume: Number(row.volume) }))
  }, [trends, activePeriod, summary.data])
  const periodChips = trends.filter((row) => row.volume > 0)
  const activeLabel = trends.find((row) => row.period === activePeriod)?.label

  function setTrainTab(next: Tab) {
    setTab(next)
    localStorage.setItem('verax.train.tab', next)
  }

  async function start(templateId: string) {
    if (active.data && !active.data.endedAt) return
    const session = await api<TrainSession>('/api/play/sessions', { method: 'POST', body: JSON.stringify({ templateId }) })
    localStorage.setItem('verax.train.session', session.id)
    setActiveId(session.id)
    setEditingId(null)
    setTrainTab('workouts')
    void queryClient.invalidateQueries({ queryKey: ['train-sessions'] })
  }

  async function removeWorkout(id: string) {
    await api(`/api/play/templates/${id}`, { method: 'DELETE' })
    if (editingId === id) setEditingId(null)
    void queryClient.invalidateQueries({ queryKey: ['train-templates'] })
  }

  const editing = templates.data?.find((row) => row.id === editingId)
  const live = Boolean(active.data && !active.data.endedAt)

  if (live && active.data) {
    return (
      <div className="page">
        <GuidedWorkout
          session={active.data}
          elapsed={elapsed}
          history={sessions.data ?? []}
          onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['train-session'] })}
          onEnd={async () => {
            const ended = await api<TrainSession>(`/api/play/sessions/${active.data!.id}/end`, { method: 'POST' })
            localStorage.removeItem('verax.train.session')
            setActiveId(null)
            setReportId(ended.id)
            setTrainTab('history')
            void queryClient.invalidateQueries({ queryKey: ['train-sessions'] })
            void queryClient.invalidateQueries({ queryKey: ['train-summary'] })
            void queryClient.invalidateQueries({ queryKey: ['today'] })
            void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          }}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        kicker="Sessions"
        title="Play"
        lead="Favourite workouts on the clock. Guided sets, rest timer, and the 1,324-exercise library with demos. End a session for volume and what moved since last time."
        actions={
          <>
            <button type="button" className="glass-btn px-4 text-sm" onClick={() => setCustomOpen(true)}>
              New activity
            </button>
            <PrimaryButton onClick={() => setGarminOpen(true)}>Log Garmin</PrimaryButton>
          </>
        }
      />

      <PageTabs label="Play" value={tab} items={TABS} onChange={setTrainTab} />

      {tab === 'workouts' && (
        <section>
          {editing ? (
            <WorkoutEditor
              template={editing}
              sessionLive={Boolean(active.data && !active.data.endedAt)}
              onBack={() => setEditingId(null)}
              onSave={async (next) => {
                await api(`/api/play/templates/${editing.id}`, {
                  method: 'PUT',
                  body: JSON.stringify({
                    name: next.name,
                    kind: next.kind,
                    exercises: next.exercises.map((row) => ({
                      name: row.name,
                      muscle: row.muscle,
                      track: row.track,
                      sets: row.sets,
                    })),
                  }),
                })
                void queryClient.invalidateQueries({ queryKey: ['train-templates'] })
              }}
              onStart={() => start(editing.id)}
              onDelete={() => removeWorkout(editing.id)}
            />
          ) : (
            <>
              <h2 className="text-2xl tracking-tight">Favourites</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {templates.data?.map((template) => (
                  <div key={template.id} className="card relative p-4">
                    <button type="button" className="w-full pr-10 text-left" onClick={() => setEditingId(template.id)}>
                      <div className="text-lg">{template.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">{template.kind.toLowerCase()}</div>
                      <div className="mt-3 text-sm text-[var(--muted)]">{template.exercises.map((row) => row.name).join(' · ')}</div>
                    </button>
                    <TrashButton
                      label="Delete workout"
                      className="absolute right-3 top-3"
                      onClick={() => void removeWorkout(template.id)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'history' && (
        <>
          <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl tracking-tight">Training load</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {activeLabel ? `${activeLabel} · muscle split for this ${grain}` : `Volume and muscle split by ${grain}`}
                </p>
              </div>
              <div className="control-cluster" role="group" aria-label="History range">
                {(['day', 'week', 'month'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={grain === option}
                    onClick={() => {
                      setGrain(option)
                      setSelectedPeriod(null)
                    }}
                  >
                    {option[0].toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {periodChips.length > 1 && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Select period">
                {periodChips.map((row) => (
                  <button
                    key={row.period}
                    type="button"
                    className={
                      row.period === activePeriod ? 'glass-primary px-3 py-1.5 text-sm' : 'glass-btn px-3 py-1.5 text-sm'
                    }
                    aria-pressed={row.period === activePeriod}
                    onClick={() => setSelectedPeriod(row.period)}
                  >
                    {row.label}
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard>
                <MuscleSplit points={radar} />
              </ChartCard>
              <ChartCard
                title="Volume"
                hint={activeLabel ? `${activeLabel} · load for this ${grain}` : `Load by ${grain}`}
              >
                <MonoLine
                  className="h-72"
                  data={trends}
                  valueKey="volume"
                  format={(value) => `${Math.round(value)} kg`}
                  onPoint={(row) => {
                    if (typeof row.period === 'string') setSelectedPeriod(row.period)
                  }}
                />
              </ChartCard>
            </div>
          </section>
          <section>
            <h2 className="text-2xl tracking-tight">Sessions</h2>
            <div className="mt-3 divide-y divide-[var(--line)]">
              {sessions.data?.filter((row) => row.endedAt).map((session) => (
                <div key={session.id} className="flex items-center gap-2 py-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setReportId(session.id)}
                  >
                    <div>{session.name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {clock(session.durationSec)} · {Math.round(Number(session.volume))} kg volume
                    </div>
                  </button>
                  <div className="shrink-0 text-xs text-[var(--muted)]">{session.startedAt.slice(0, 10)}</div>
                  <TrashButton
                    label={`Delete ${session.name}`}
                    onClick={async () => {
                      await api(`/api/play/sessions/${session.id}`, { method: 'DELETE' })
                      if (reportId === session.id) setReportId(null)
                      void queryClient.invalidateQueries({ queryKey: ['train-sessions'] })
                      void queryClient.invalidateQueries({ queryKey: ['train-summary'] })
                    }}
                  />
                </div>
              ))}
              {activities.data?.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-3">
                  <div>
                    <div>{activity.name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {activity.activityType.toLowerCase()} · {activity.source.toLowerCase()}
                      {activity.durationSec ? ` · ${clock(activity.durationSec)}` : ''}
                      {activity.distanceM ? ` · ${(activity.distanceM / 1000).toFixed(2)} km` : ''}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--muted)]">{activity.date}</div>
                </div>
              ))}
            </div>
          </section>
          <MeasurementHistory />
        </>
      )}

      {tab === 'body' && <BodyPanel />}

      {reportId && <SessionReportDialog id={reportId} onClose={() => setReportId(null)} />}

      {garminOpen && (
        <Dialog title="Log Garmin activity" onClose={() => setGarminOpen(false)}>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Same fields Garmin shows: type, time, distance, calories, heart rate. Add more types any time.
          </p>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              await api('/api/play/activities', {
                method: 'POST',
                body: JSON.stringify({
                  name: activityName,
                  activityType,
                  date: activityDate,
                  durationSec: Math.round(Number(durationMin || 0) * 60),
                  distanceM: distance ? Math.round(Number(distance) * 1000) : null,
                  calories: calories ? Number(calories) : null,
                  avgHr: hr ? Number(hr) : null,
                  source: 'GARMIN',
                }),
              })
              setGarminOpen(false)
              void queryClient.invalidateQueries({ queryKey: ['train-activities'] })
              void queryClient.invalidateQueries({ queryKey: ['today'] })
              void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
            }}
          >
            <input className="field" value={activityName} onChange={(event) => setActivityName(event.target.value)} required />
            <input className="field" value={activityType} onChange={(event) => setActivityType(event.target.value)} placeholder="SWIMMING / RUNNING / BADMINTON / BOXING" />
            <input className="field" type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} />
            <input className="field" inputMode="decimal" value={durationMin} onChange={(event) => setDurationMin(event.target.value)} placeholder="Minutes" />
            <input className="field" inputMode="decimal" value={distance} onChange={(event) => setDistance(event.target.value)} placeholder="Distance km" />
            <input className="field" inputMode="numeric" value={calories} onChange={(event) => setCalories(event.target.value)} placeholder="Calories" />
            <input className="field" inputMode="numeric" value={hr} onChange={(event) => setHr(event.target.value)} placeholder="Avg HR" />
            <div className="flex justify-end">
              <PrimaryButton type="submit">Save</PrimaryButton>
            </div>
          </form>
        </Dialog>
      )}

      {customOpen && (
        <Dialog title="New activity type" onClose={() => setCustomOpen(false)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              await api('/api/play/templates', {
                method: 'POST',
                body: JSON.stringify({
                  name: customName,
                  kind: 'CARDIO',
                  exercises: [{ name: customName, muscle: 'CARDIO', track: 'TIME', sets: [{}] }],
                }),
              })
              setCustomOpen(false)
              setCustomName('')
              void queryClient.invalidateQueries({ queryKey: ['train-templates'] })
            }}
          >
            <input className="field" value={customName} onChange={(event) => setCustomName(event.target.value)} required placeholder="Hyrox, climb, cycle…" />
            <div className="flex justify-end">
              <AddButton label="Add activity" variant="primary" type="submit" />
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}

function SessionReportDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const report = useQuery({
    queryKey: ['train-report', id],
    queryFn: () => api<TrainSessionReport>(`/api/play/sessions/${id}/report`),
  })
  const data = report.data
  const radar = (data?.radar ?? []).map((row) => ({ ...row, volume: Number(row.volume) }))

  return (
    <Dialog title={data?.session.name ?? 'Session'} onClose={onClose}>
      {!data && <p className="mt-4 text-sm text-[var(--muted)]">Loading report…</p>}
      {data && (
        <div className="mt-4 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Volume" value={`${Math.round(Number(data.volume))} kg`} hint={deltaKg(data.volumeDelta)} />
            <Stat label="Time" value={clock(data.durationSec)} hint={deltaTime(data.durationDelta)} />
          </div>
          {data.previous && (
            <p className="text-sm text-[var(--muted)]">
              Compared with {data.previous.name} on {data.previous.startedAt.slice(0, 10)}.
            </p>
          )}
          <MuscleSplit points={radar} compact />
          <div className="divide-y divide-[var(--line)]">
            {data.exercises.map((row) => (
              <div key={row.name} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {row.name}
                  {row.improved && <span className="ml-2 text-xs text-[var(--accent)]">improved</span>}
                </span>
                <span className="tabular text-[var(--muted)]">
                  {Math.round(Number(row.volume))} kg
                  {row.previousVolume != null ? ` · was ${Math.round(Number(row.previousVolume))}` : ''}
                </span>
              </div>
            ))}
          </div>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Progress selfie</span>
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                const body = new FormData()
                body.append('file', file)
                await api(`/api/play/sessions/${id}/photo`, { method: 'POST', body })
                void queryClient.invalidateQueries({ queryKey: ['train-report', id] })
                void queryClient.invalidateQueries({ queryKey: ['train-sessions'] })
              }}
            />
          </label>
          {data.photoUrl && <AuthImage src={data.photoUrl} alt="Session selfie" />}
          <TrashButton
            label="Delete session"
            onClick={async () => {
              await api(`/api/play/sessions/${id}`, { method: 'DELETE' })
              void queryClient.invalidateQueries({ queryKey: ['train-sessions'] })
              void queryClient.invalidateQueries({ queryKey: ['train-summary'] })
              onClose()
            }}
          />
        </div>
      )}
    </Dialog>
  )
}

function cloneExercises(rows: TrainExercise[]): TrainExercise[] {
  return rows.map((row) => ({
    ...row,
    id: row.id ?? crypto.randomUUID(),
    sets: (row.sets && row.sets.length > 0 ? row.sets : defaultPlanned(row.track)).map((set) => ({ ...set })),
  }))
}

function defaultPlanned(track: string): PlannedSet[] {
  if (track === 'TIME') return [{}]
  return [{ reps: 8 }, { reps: 8 }, { reps: 8 }]
}

function ExerciseSearchDialog({
  onClose,
  onPick,
  onCustom,
}: {
  onClose: () => void
  onPick: (hit: ExerciseHit) => void
  onCustom: (name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<ExerciseHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<ExerciseHit | null>(null)
  const [custom, setCustom] = useState('')

  async function runSearch() {
    const q = query.trim()
    if (!q) {
      setError('Enter an exercise name')
      setHits([])
      setSearched(true)
      setSelected(null)
      return
    }
    setSearching(true)
    setError('')
    setSelected(null)
    try {
      const local = searchCatalog(q)
      const results = local.length > 0 ? local : await api<ExerciseHit[]>(`/api/play/exercises?q=${encodeURIComponent(q)}`)
      setHits(results)
      setSearched(true)
      if (results.length === 0) setError('No exercises found')
    } catch (err) {
      setHits([])
      setSearched(true)
      setError(err instanceof Error ? err.message : 'Could not search exercises.')
    } finally {
      setSearching(false)
    }
  }

  if (selected) {
    return (
      <Dialog title={selected.name} onClose={onClose}>
        <div className="mt-3 space-y-4 text-sm">
          <button type="button" className="text-xs text-[var(--muted)]" onClick={() => setSelected(null)}>
            ← Search results
          </button>
          {selected.gif && findExercise(selected.name) && (
            <ExerciseMedia ex={findExercise(selected.name)!} compact />
          )}
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-[var(--muted)]">
            {selected.type && <span className="rounded-full border border-[var(--line)] px-2 py-1">{selected.type}</span>}
            {selected.difficulty && (
              <span className="rounded-full border border-[var(--line)] px-2 py-1">{selected.difficulty}</span>
            )}
            {selected.muscle && <span className="rounded-full border border-[var(--line)] px-2 py-1">{selected.muscle}</span>}
          </div>
          {selected.equipment.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Equipment</h3>
              <p className="mt-1">{selected.equipment.join(', ')}</p>
            </div>
          )}
          {selected.instructions && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Instructions</h3>
              <p className="mt-1 whitespace-pre-wrap leading-6">{selected.instructions}</p>
            </div>
          )}
          {selected.safetyInfo && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Safety</h3>
              <p className="mt-1 whitespace-pre-wrap leading-6">{selected.safetyInfo}</p>
            </div>
          )}
          <div className="flex justify-end">
            <PrimaryButton onClick={() => onPick(selected)}>Add to workout</PrimaryButton>
          </div>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog title="Add exercise" onClose={onClose}>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void runSearch()
        }}
      >
        <div className="relative min-w-0 flex-1">
          <input
            className="field pr-11"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setError('')
            }}
            placeholder="Bench press, squat, biceps…"
            autoFocus
          />
          <button
            type="submit"
            className="icon-btn icon-btn-add absolute top-1/2 right-1.5 -translate-y-1/2"
            aria-label="Search"
            disabled={searching}
          >
            <Search size={16} />
          </button>
        </div>
      </form>
      <div className="mt-3 max-h-[45vh] overflow-y-auto">
        {searching && <p className="py-6 text-sm text-[var(--muted)]">Searching…</p>}
        {!searching && !searched && (
          <p className="py-6 text-sm text-[var(--muted)]">Search the exercise library, then open one for equipment, instructions, and safety.</p>
        )}
        {!searching && searched && hits.length === 0 && (
          <p className="py-6 text-sm text-[var(--danger)]" role="alert">
            {error || 'No exercises found'}
          </p>
        )}
        {!searching &&
          hits.map((hit) => (
            <button
              key={`${hit.name}-${hit.muscle}-${hit.type}`}
              type="button"
              className="flex w-full items-start justify-between gap-3 border-b border-[var(--line)] py-3 text-left"
              onClick={() => setSelected(hit)}
            >
              <span className="flex min-w-0 items-center gap-3">
                {hit.img && <img src={hit.img} alt="" className="size-10 shrink-0 rounded-md object-cover" />}
                <span className="min-w-0">
                  <span className="block truncate text-[15px]">{hit.name}</span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    {[hit.type, hit.difficulty, hit.muscle, hit.equipment.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </span>
            </button>
          ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const name = custom.trim() || query.trim()
          if (name) onCustom(name)
        }}
      >
        <input
          className="field flex-1"
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Or add a custom name"
        />
        <PrimaryButton type="submit">Add custom</PrimaryButton>
      </form>
    </Dialog>
  )
}

function WorkoutEditor({
  template,
  sessionLive,
  onBack,
  onSave,
  onStart,
  onDelete,
}: {
  template: TrainTemplate
  sessionLive: boolean
  onBack: () => void
  onSave: (next: TrainTemplate) => Promise<void>
  onStart: () => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [name, setName] = useState(template.name)
  const [kind, setKind] = useState(template.kind)
  const [exercises, setExercises] = useState(() => cloneExercises(template.exercises))
  const [saving, setSaving] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    setName(template.name)
    setKind(template.kind)
    setExercises(cloneExercises(template.exercises))
  }, [template])

  function patchExercise(id: string, patch: Partial<TrainExercise>) {
    setExercises((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function patchSet(exerciseId: string, index: number, patch: PlannedSet) {
    setExercises((current) =>
      current.map((row) => {
        if (row.id !== exerciseId) return row
        return { ...row, sets: row.sets.map((set, setIndex) => (setIndex === index ? { ...set, ...patch } : set)) }
      }),
    )
  }

  function moveExercise(id: string, direction: -1 | 1) {
    setExercises((current) => {
      const index = current.findIndex((row) => row.id === id)
      const next = index + direction
      if (index < 0 || next < 0 || next >= current.length) return current
      const copy = [...current]
      const [row] = copy.splice(index, 1)
      copy.splice(next, 0, row)
      return copy
    })
  }

  async function persist() {
    setSaving(true)
    try {
      await onSave({
        ...template,
        name,
        kind,
        exercises: exercises.filter((row) => row.name.trim()).map((row) => ({
          ...row,
          name: row.name.trim(),
          sets: row.sets,
        })),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="text-sm text-[var(--muted)]" onClick={onBack}>
          ← Favourites
        </button>
        <TrashButton label="Delete workout" onClick={() => void onDelete()} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--muted)]">Workout</span>
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--muted)]">Kind</span>
          <select className="field" value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="STRENGTH">Strength</option>
            <option value="CARDIO">Cardio</option>
          </select>
        </label>
      </div>
      <div className="space-y-4">
        {exercises.map((exercise, index) => (
          <div key={exercise.id} className="card p-4">
            <div className="flex flex-wrap items-start gap-2">
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  className="grid size-8 place-items-center text-[var(--muted)] disabled:opacity-30"
                  aria-label="Move exercise up"
                  disabled={index === 0}
                  onClick={() => moveExercise(exercise.id!, -1)}
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  type="button"
                  className="grid size-8 place-items-center text-[var(--muted)] disabled:opacity-30"
                  aria-label="Move exercise down"
                  disabled={index === exercises.length - 1}
                  onClick={() => moveExercise(exercise.id!, 1)}
                >
                  <ChevronDown size={18} />
                </button>
              </div>
              <input
                className="field min-w-[10rem] flex-1"
                value={exercise.name}
                onChange={(event) => patchExercise(exercise.id!, { name: event.target.value })}
                placeholder="Exercise"
              />
              <span className="field w-32 truncate text-xs uppercase tracking-wide text-[var(--muted)]">
                {exercise.muscle.toLowerCase()}
              </span>
              <span className="self-center text-xs uppercase tracking-wide text-[var(--muted)]">
                {exercise.track === 'TIME' ? 'time' : 'reps'}
              </span>
              <TrashButton
                label="Remove exercise"
                onClick={() => setExercises((current) => current.filter((row) => row.id !== exercise.id))}
              />
            </div>
            <div className="mt-3 space-y-2">
              {exercise.sets.map((set, index) => (
                <div key={`${exercise.id}-${index}`} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
                  <span className="text-xs text-[var(--muted)]">{index + 1}</span>
                  {exercise.track === 'TIME' ? (
                    <input
                      className="field col-span-2 py-1.5"
                      placeholder="seconds"
                      inputMode="numeric"
                      value={set.seconds ?? ''}
                      onChange={(event) => patchSet(exercise.id!, index, { seconds: n(event.target.value) })}
                    />
                  ) : (
                    <>
                      <input
                        className="field py-1.5"
                        placeholder="reps"
                        inputMode="numeric"
                        value={set.reps ?? ''}
                        onChange={(event) => patchSet(exercise.id!, index, { reps: n(event.target.value) })}
                      />
                      <input
                        className="field py-1.5"
                        placeholder="kg"
                        inputMode="decimal"
                        value={set.kg ?? ''}
                        onChange={(event) => patchSet(exercise.id!, index, { kg: n(event.target.value) })}
                      />
                    </>
                  )}
                  <TrashButton
                    label="Remove set"
                    onClick={() =>
                      setExercises((current) =>
                        current.map((row) =>
                          row.id === exercise.id ? { ...row, sets: row.sets.filter((_, setIndex) => setIndex !== index) } : row,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <AddButton
              label="Add set"
              className="mt-3"
              onClick={() =>
                setExercises((current) =>
                  current.map((row) => {
                    if (row.id !== exercise.id) return row
                    const last = row.sets[row.sets.length - 1]
                    const next: PlannedSet = row.track === 'TIME' ? { seconds: last?.seconds } : { reps: last?.reps ?? 8, kg: last?.kg }
                    return { ...row, sets: [...row.sets, next] }
                  }),
                )
              }
            />
          </div>
        ))}
      </div>
      <AddButton label="Add exercise" onClick={() => setSearchOpen(true)} />
      {searchOpen && (
        <ExerciseSearchDialog
          onClose={() => setSearchOpen(false)}
          onPick={(hit) => {
            setExercises((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                name: hit.name,
                muscle: hit.mappedMuscle || 'OTHER',
                track: hit.track || 'REPS',
                sets: defaultPlanned(hit.track || 'REPS'),
              },
            ])
            setSearchOpen(false)
          }}
          onCustom={async (customName) => {
            let muscle = 'OTHER'
            let track = 'REPS'
            const local = searchCatalog(customName)[0]
            if (local) {
              muscle = local.mappedMuscle || 'OTHER'
              track = local.track || 'REPS'
            } else {
              try {
                const results = await api<ExerciseHit[]>(`/api/play/exercises?q=${encodeURIComponent(customName)}`)
                const hit =
                  results.find((row) => row.name.toLowerCase() === customName.toLowerCase()) ?? results[0]
                if (hit) {
                  muscle = hit.mappedMuscle || 'OTHER'
                  track = hit.track || 'REPS'
                }
              } catch {
                // keep OTHER / REPS if the catalog is unavailable
              }
            }
            setExercises((current) => [
              ...current,
              { id: crypto.randomUUID(), name: customName, muscle, track, sets: defaultPlanned(track) },
            ])
            setSearchOpen(false)
          }}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <PrimaryButton disabled={saving} onClick={() => void persist()}>
          {saving ? 'Saving…' : 'Save workout'}
        </PrimaryButton>
        <PrimaryButton
          disabled={saving || sessionLive || !name.trim() || exercises.every((row) => !row.name.trim())}
          onClick={async () => {
            await persist()
            await onStart()
          }}
        >
          Start session
        </PrimaryButton>
      </div>
      {sessionLive && <p className="text-sm text-[var(--muted)]">End the live session before starting another.</p>}
    </div>
  )
}

function BodyPanel() {
  const queryClient = useQueryClient()
  const profile = useQuery({ queryKey: ['body-profile'], queryFn: () => api<BodyProfile>('/api/play/body/profile') })
  const [height, setHeight] = useState('')
  const [sex, setSex] = useState('MALE')
  const [birthYear, setBirthYear] = useState('')
  const [activity, setActivity] = useState('MODERATE')
  const [compositionDate, setCompositionDate] = useState(today())
  const [tapeDate, setTapeDate] = useState(today())
  const [compositionDraft, setCompositionDraft] = useState<Record<string, string>>({})
  const [tapeDraft, setTapeDraft] = useState<Record<string, string>>({})
  const [importOpen, setImportOpen] = useState(false)
  const [tapeUnit, setTapeUnit] = useTapeUnit()

  useEffect(() => {
    if (!profile.data) return
    setHeight(profile.data.heightCm != null ? String(profile.data.heightCm) : '')
    setSex(profile.data.sex || 'MALE')
    setBirthYear(profile.data.birthYear != null ? String(profile.data.birthYear) : '')
    setActivity(profile.data.activity || 'MODERATE')
  }, [profile.data])

  async function saveKind(
    kind: 'COMPOSITION' | 'TAPE',
    nextDate: string,
    nextDraft: Record<string, string>,
    source: string,
    fields: { key: keyof BodyLog }[],
  ) {
    const body: Record<string, unknown> = { date: nextDate, source, kind }
    for (const row of fields) {
      const value = n(nextDraft[row.key] ?? '')
      if (value != null) body[row.key] = kind === 'TAPE' ? unitToCm(value, tapeUnit) : value
    }
    await api('/api/play/body/logs', { method: 'POST', body: JSON.stringify(body) })
    void queryClient.invalidateQueries({ queryKey: ['body-logs'] })
    void queryClient.invalidateQueries({ queryKey: ['body-profile'] })
  }

  function filled(draft: Record<string, string>, fields: { key: keyof BodyLog }[]) {
    return fields.some((row) => n(draft[row.key] ?? '') != null)
  }

  return (
    <div className="space-y-8">
      <section className="card p-6">
        <h2 className="text-2xl tracking-tight">Size</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          BMR is ICMR-NIN 2020 (FAO equations −10% men / −9% women). TDEE is BMR × Indian PAL. Weight comes from the latest composition log.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Height (cm)</span>
            <input className="field" inputMode="decimal" value={height} onChange={(event) => setHeight(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Sex</span>
            <select className="field" value={sex} onChange={(event) => setSex(event.target.value)}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Birth year</span>
            <input className="field" inputMode="numeric" value={birthYear} onChange={(event) => setBirthYear(event.target.value)} placeholder="1996" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Activity</span>
            <select className="field" value={activity} onChange={(event) => setActivity(event.target.value)}>
              <option value="SEDENTARY">Sedentary — desk, little exercise</option>
              <option value="LIGHT">Light — desk plus walking</option>
              <option value="MODERATE">Moderate — regular training or standing work</option>
              <option value="ACTIVE">Active — hard training most days</option>
              <option value="VERY_ACTIVE">Very active — physical job plus training</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <span>BMI <strong className="tabular">{fmt(profile.data?.bmi)}</strong></span>
          <span>BMR <strong className="tabular">{fmt(profile.data?.bmr)}</strong> kcal</span>
          <span>TDEE <strong className="tabular">{fmt(profile.data?.tdee)}</strong> kcal</span>
          <span>Weight <strong className="tabular">{fmt(profile.data?.weightKg)}</strong> kg</span>
        </div>
        <div className="mt-4">
          <PrimaryButton
            onClick={async () => {
              await api('/api/play/body/profile', {
                method: 'PUT',
                body: JSON.stringify({
                  heightCm: n(height),
                  sex,
                  birthYear: n(birthYear),
                  activity,
                }),
              })
              void queryClient.invalidateQueries({ queryKey: ['body-profile'] })
              void queryClient.invalidateQueries({ queryKey: ['body-logs'] })
            }}
          >
            Save profile
          </PrimaryButton>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl tracking-tight">Composition</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Scale report: weight, fat, muscle, water. Import a screenshot or type it. Trends live on History.</p>
          </div>
          <button type="button" className="glass-btn px-4 py-2.5 text-sm" onClick={() => setImportOpen(true)}>
            Import image
          </button>
        </div>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            await saveKind('COMPOSITION', compositionDate, compositionDraft, 'MANUAL', COMPOSITION)
            setCompositionDraft({})
          }}
        >
          <label className="block max-w-xs">
            <span className="mb-1 block text-xs text-[var(--muted)]">Date</span>
            <input className="field" type="date" value={compositionDate} onChange={(event) => setCompositionDate(event.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMPOSITION.map((row) => (
              <label key={row.key} className="block">
                <span className="mb-1 block text-xs text-[var(--muted)]">{row.label}</span>
                <input
                  className="field"
                  inputMode="decimal"
                  value={compositionDraft[row.key] ?? ''}
                  onChange={(event) => setCompositionDraft((prev) => ({ ...prev, [row.key]: event.target.value }))}
                />
              </label>
            ))}
          </div>
          <PrimaryButton type="submit" disabled={!filled(compositionDraft, COMPOSITION)}>
            Save composition
          </PrimaryButton>
        </form>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl tracking-tight">Tape</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Circumference in {tapeUnit}. Saved separately from the scale.</p>
          </div>
          <TapeUnitToggle
            unit={tapeUnit}
            onChange={(next) => {
              setTapeDraft((current) => convertTapeDraft(current, tapeUnit, next))
              setTapeUnit(next)
            }}
          />
        </div>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            await saveKind('TAPE', tapeDate, tapeDraft, 'MANUAL', TAPE)
            setTapeDraft({})
          }}
        >
          <label className="block max-w-xs">
            <span className="mb-1 block text-xs text-[var(--muted)]">Date</span>
            <input className="field" type="date" value={tapeDate} onChange={(event) => setTapeDate(event.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TAPE.map((row) => (
              <label key={row.key} className="block">
                <span className="mb-1 block text-xs text-[var(--muted)]">{row.label}</span>
                <input
                  className="field"
                  inputMode="decimal"
                  value={tapeDraft[row.key] ?? ''}
                  onChange={(event) => setTapeDraft((prev) => ({ ...prev, [row.key]: event.target.value }))}
                />
              </label>
            ))}
          </div>
          <PrimaryButton type="submit" disabled={!filled(tapeDraft, TAPE)}>
            Save tape
          </PrimaryButton>
        </form>
      </section>

      {importOpen && (
        <ImportCompositionDialog
          onClose={() => setImportOpen(false)}
          onSaved={async (nextDate, nextDraft) => {
            await saveKind('COMPOSITION', nextDate, nextDraft, 'SCAN', COMPOSITION)
            setImportOpen(false)
          }}
        />
      )}
    </div>
  )
}

function ImportCompositionDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (date: string, draft: Record<string, string>) => Promise<void>
}) {
  const [importDate, setImportDate] = useState(today())
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  async function readFile(next: File) {
    setFile(next)
    setError('')
    setScanning(true)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(next))
    try {
      const text = await readImageText(next)
      const parsed = await api<BodyLog>('/api/play/body/scan', { method: 'POST', body: JSON.stringify({ text }) })
      if (parsed.date) {
        setImportDate((current) => (current === today() ? parsed.date! : current))
      }
      const nextDraft: Record<string, string> = {}
      for (const row of [...COMPOSITION, ...TAPE]) {
        const value = parsed[row.key]
        if (value != null && value !== '') nextDraft[row.key] = String(value)
      }
      setDraft(nextDraft)
    } catch (err) {
      setDraft({})
      setError(err instanceof Error ? err.message : 'Could not read that image.')
    } finally {
      setScanning(false)
    }
  }

  const filled = Object.keys(draft).length

  return (
    <Dialog title="Import composition" onClose={onClose}>
      <form
        className="mt-4 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!filled) return
          setSaving(true)
          setError('')
          try {
            await onSaved(importDate, draft)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save that report.')
          } finally {
            setSaving(false)
          }
        }}
      >
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--muted)]">Date of this composition</span>
          <input className="field" type="date" value={importDate} onChange={(event) => setImportDate(event.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--muted)]">Scale screenshot</span>
          <input
            className="field"
            type="file"
            accept="image/*"
            required={!file}
            onChange={(event) => {
              const next = event.target.files?.[0]
              if (next) void readFile(next)
            }}
          />
        </label>
        {preview && <img src={preview} alt="Selected scale report" className="max-h-48 rounded-lg object-contain" />}
        {scanning && <p className="text-sm text-[var(--muted)]">Reading image…</p>}
        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
        {filled > 0 && (
          <div>
            <h3 className="text-sm font-medium">Read from image</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {COMPOSITION.map((row) =>
                draft[row.key] ? (
                  <div key={row.key} className="flex justify-between gap-2">
                    <dt className="text-[var(--muted)]">{row.label}</dt>
                    <dd className="tabular">{draft[row.key]}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="glass-btn px-4 py-2.5 text-sm" onClick={onClose}>
            Cancel
          </button>
          <PrimaryButton type="submit" disabled={scanning || saving || !filled}>
            {saving ? 'Saving…' : 'Save composition'}
          </PrimaryButton>
        </div>
      </form>
    </Dialog>
  )
}

function MeasurementHistory() {
  const queryClient = useQueryClient()
  const logs = useQuery({ queryKey: ['body-logs'], queryFn: () => api<BodyLog[]>('/api/play/body/logs') })
  const [tapeUnit, setTapeUnit] = useTapeUnit()
  const rows = logs.data ?? []

  async function remove(id: string) {
    await api(`/api/play/body/logs/${id}`, { method: 'DELETE' })
    void queryClient.invalidateQueries({ queryKey: ['body-logs'] })
    void queryClient.invalidateQueries({ queryKey: ['body-profile'] })
  }
  const compositionSeries = COMPOSITION
    .map((field) => ({ field, points: seriesFor(rows, field.key) }))
    .filter((row) => row.points.length > 0)
  const tapeSeries = TAPE
    .map((field) => ({
      field,
      points: seriesFor(rows, field.key).map((point) => ({
        ...point,
        value: roundTape(cmToUnit(point.value, tapeUnit), tapeUnit),
      })),
    }))
    .filter((row) => row.points.length > 0)

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl tracking-tight">Measurement history</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Every composition and tape log, with a line per parameter that has values.</p>
        </div>
        <TapeUnitToggle unit={tapeUnit} onChange={setTapeUnit} />
      </div>
      {rows.length === 0 && <p className="text-sm text-[var(--muted)]">No measurements yet. Save one on Body.</p>}
      {compositionSeries.length > 0 && (
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">Composition</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {compositionSeries.map(({ field, points }) => (
              <ParameterChart key={field.key} label={field.label} points={points} />
            ))}
          </div>
          <div className="mt-4 space-y-4">
            {rows.filter((log) => (log.kind ?? 'COMPOSITION').toUpperCase() !== 'TAPE').map((log) => (
              <CompositionCard
                key={log.id ?? `${log.date}-${log.source}-c`}
                log={log}
                tapeUnit={tapeUnit}
                onDelete={log.id ? () => void remove(log.id!) : undefined}
              />
            ))}
          </div>
        </div>
      )}
      {tapeSeries.length > 0 && (
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">Tape ({tapeUnit})</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tapeSeries.map(({ field, points }) => (
              <ParameterChart key={field.key} label={field.label} points={points} unit={tapeUnit} />
            ))}
          </div>
          <div className="mt-4 space-y-4">
            {rows.filter((log) => (log.kind ?? '').toUpperCase() === 'TAPE').map((log) => (
              <CompositionCard
                key={log.id ?? `${log.date}-${log.source}-t`}
                log={log}
                tapeUnit={tapeUnit}
                onDelete={log.id ? () => void remove(log.id!) : undefined}
              />
            ))}
          </div>
        </div>
      )}
      {rows.length > 0 && compositionSeries.length === 0 && tapeSeries.length === 0 && (
        <div className="space-y-4">
          {rows.map((log) => (
            <CompositionCard
              key={log.id ?? `${log.date}-${log.source}`}
              log={log}
              tapeUnit={tapeUnit}
              onDelete={log.id ? () => void remove(log.id!) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ParameterChart({
  label,
  points,
  unit,
}: {
  label: string
  points: { date: string; label: string; value: number }[]
  unit?: string
}) {
  const latest = points[points.length - 1]
  const previous = points.length > 1 ? points[points.length - 2] : undefined
  const delta = previous ? latest.value - previous.value : null
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = min === max ? Math.max(Math.abs(min) * 0.08, 0.5) : (max - min) * 0.12
  return (
    <article className="card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm">{label}</h4>
        <div className="text-right text-xs text-[var(--muted)]">
          <span className="tabular text-sm text-[var(--text)]">
            {fmt(latest.value)}
            {unit ? ` ${unit}` : ''}
          </span>
          {delta != null && (
            <div className="tabular">
              {delta > 0 ? '+' : ''}
              {fmt(Number(delta.toFixed(2)))} vs last
            </div>
          )}
        </div>
      </div>
      <MonoLine
        className="mt-2 h-36"
        data={points}
        domain={[min - pad, max + pad]}
        format={(value) => `${fmt(value)}${unit ? ` ${unit}` : ''}`}
      />
    </article>
  )
}

function seriesFor(logs: BodyLog[], key: keyof BodyLog) {
  return [...logs]
    .slice()
    .reverse()
    .flatMap((log) => {
      const value = valueOf(log, key)
      if (value == null) return []
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) return []
      return [{ date: log.date, label: formatChartDate(log.date), value: numeric }]
    })
}

function CompositionCard({
  log,
  tapeUnit,
  onDelete,
}: {
  log: BodyLog
  tapeUnit: TapeUnit
  onDelete?: () => void
}) {
  const composition = COMPOSITION.filter((row) => valueOf(log, row.key) != null)
  const tape = TAPE.filter((row) => valueOf(log, row.key) != null)
  return (
    <article className="card relative p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 pr-10">
        <div>
          <h3 className="text-lg tracking-tight">{formatLogDate(log.date)}</h3>
          <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
            {(log.kind ?? 'composition').toLowerCase()} · {log.source.toLowerCase()}
          </span>
        </div>
        {onDelete && <TrashButton label="Delete measurement" className="absolute right-3 top-3" onClick={onDelete} />}
      </div>
      {composition.length === 0 && tape.length === 0 && (
        <p className="mt-2 text-sm text-[var(--muted)]">No fields stored.</p>
      )}
      {composition.length > 0 && (
        <dl className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {COMPOSITION.map((row) => {
            const value = valueOf(log, row.key)
            if (value == null) return null
            return (
              <div key={row.key} className="flex justify-between gap-3 text-sm">
                <dt className="text-[var(--muted)]">{row.label}</dt>
                <dd className="tabular">{value}</dd>
              </div>
            )
          })}
        </dl>
      )}
      {tape.length > 0 && (
        <dl className="mt-4 grid gap-x-4 gap-y-2 border-t border-[var(--line)] pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {TAPE.map((row) => {
            const value = valueOf(log, row.key)
            if (value == null) return null
            const numeric = Number(value)
            const shown = Number.isFinite(numeric) ? roundTape(cmToUnit(numeric, tapeUnit), tapeUnit) : value
            return (
              <div key={row.key} className="flex justify-between gap-3 text-sm">
                <dt className="text-[var(--muted)]">{row.label}</dt>
                <dd className="tabular">
                  {shown} {tapeUnit}
                </dd>
              </div>
            )
          })}
        </dl>
      )}
    </article>
  )
}

function valueOf(log: BodyLog, key: keyof BodyLog) {
  const value = log[key]
  if (value == null || value === '') return null
  return value
}

function formatLogDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatChartDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-2)] px-3 py-3">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="tabular text-xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>}
    </div>
  )
}

function deltaKg(value?: number | null) {
  if (value == null) return 'First time on this workout'
  const rounded = Math.round(Number(value))
  if (rounded === 0) return 'Same volume as last time'
  return `${rounded > 0 ? '+' : ''}${rounded} kg vs last session`
}

function deltaTime(value?: number | null) {
  if (value == null) return undefined
  if (value === 0) return 'Same duration'
  const sign = value > 0 ? '+' : '−'
  return `${sign}${clock(Math.abs(value))} vs last session`
}

function n(value: string) {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function fmt(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return String(value)
}

function AuthImage({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const token = getToken()
    let objectUrl: string | undefined
    fetch(src, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((response) => response.blob())
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => undefined)
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])
  if (!url) return <div className="mt-2 aspect-[3/4] max-w-xs rounded-lg bg-[var(--surface-2)]" />
  return <img src={url} alt={alt} className="mt-2 max-w-xs rounded-lg object-cover" />
}
