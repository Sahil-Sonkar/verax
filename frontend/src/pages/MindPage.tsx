import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AmbientPlayer } from '../components/AmbientPlayer'
import { MonoBars } from '../components/mono/MonoBars'
import { MonoLine } from '../components/mono/MonoLine'
import { Dialog, PrimaryButton } from '../components/Dialog'
import { FocusTimer } from '../components/FocusTimer'
import { MindJournal } from '../components/MindJournal'
import { TrashButton } from '../components/IconButtons'
import { PageHeader, PageTabs } from '../components/PageHeader'
import { ChartCard } from '../components/mono/ChartCard'
import { api } from '../lib/api'
import type { SleepSummary } from '../types'

const TABS = [
  { id: 'journal', label: 'Journal' },
  { id: 'meditation', label: 'Meditation' },
  { id: 'sleep', label: 'Sleep' },
] as const

type Tab = (typeof TABS)[number]['id']

function today() {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

function nightLabel(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(year, (month ?? 1) - 1, day ?? 1),
  )
}

function rangeFor(period: 'day' | 'month' | 'quarter' | 'year') {
  const end = new Date()
  const start = new Date()
  if (period === 'year') start.setFullYear(end.getFullYear() - 1)
  else if (period === 'quarter') start.setMonth(end.getMonth() - 3)
  else if (period === 'month') start.setDate(end.getDate() - 31)
  else start.setDate(end.getDate() - 13)
  return {
    from: new Intl.DateTimeFormat('en-CA').format(start),
    to: new Intl.DateTimeFormat('en-CA').format(end),
  }
}

export function MindPage() {
  const [tab, setTab] = useState<Tab>('journal')

  return (
    <div className="page">
      <PageHeader
        kicker="Quiet"
        title="Mind"
        lead="Notes, a sit, and sleep. Each stays on its own tab."
      />
      <PageTabs label="Mind" value={tab} items={TABS} onChange={setTab} />

      {tab === 'journal' && <MindJournal />}
      {tab === 'meditation' && <MeditationPanel />}
      {tab === 'sleep' && <SleepPanel />}
    </div>
  )
}

function MeditationPanel() {
  return (
    <section className="grid gap-3 lg:grid-cols-2">
      <div className="panel">
        <div className="card h-full p-6">
          <h2 className="text-2xl tracking-tight">Sit</h2>
          <div className="mt-4">
            <FocusTimer compact defaultKind="MEDITATION" defaultMinutes={15} preferHabit="meditat" />
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="card h-full p-6">
          <h2 className="text-2xl tracking-tight">Sound</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Wind, rain, sea, static, fire. Generated here — no YouTube tab.</p>
          <div className="mt-4">
            <AmbientPlayer />
          </div>
        </div>
      </div>
    </section>
  )
}

function SleepPanel() {
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState<'day' | 'month' | 'quarter' | 'year'>('day')
  const { from, to } = rangeFor(period)
  const sleep = useQuery({
    queryKey: ['sleep', from, to, period],
    queryFn: () => api<SleepSummary>(`/api/mind/sleep?from=${from}&to=${to}&period=${period}`),
  })
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today())
  const [start, setStart] = useState('23:00')
  const [end, setEnd] = useState('06:30')
  const [score, setScore] = useState('80')
  const [awake, setAwake] = useState('20')
  const [rem, setRem] = useState('90')
  const [core, setCore] = useState('220')
  const [deep, setDeep] = useState('70')
  const latest = sleep.data?.nights.at(-1)

  const chart = useMemo(
    () =>
      (sleep.data?.points ?? []).map((point) => ({
        ...point,
        rem: point.avgRem,
        core: point.avgCore,
        deep: point.avgDeep,
        awake: point.avgAwake,
        score: point.avgScore,
      })),
    [sleep.data],
  )

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {latest ? (
            <p className="text-sm text-[var(--muted)]">
              Last night {latest.startTime}–{latest.endTime} · score {latest.score ?? '—'}
            </p>
          ) : (
            <p className="text-sm text-[var(--muted)]">Garmin-shaped: timing, awake, REM, core, deep, and a score.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['day', 'month', 'quarter', 'year'] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={period === item ? 'glass-primary px-3 py-1.5 text-sm' : 'glass-btn px-3 py-1.5 text-sm'}
              onClick={() => setPeriod(item)}
            >
              {item}
            </button>
          ))}
          <PrimaryButton onClick={() => setOpen(true)}>Log night</PrimaryButton>
        </div>
      </div>
      {latest && (
        <div className="grid gap-3 sm:grid-cols-5">
          <SleepStat label="Score" value={latest.score ?? 0} />
          <SleepStat label="Awake" value={latest.awakeMin} />
          <SleepStat label="REM" value={latest.remMin} />
          <SleepStat label="Core" value={latest.coreMin} />
          <SleepStat label="Deep" value={latest.deepMin} />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Stages">
        <MonoBars
          className="h-64"
          data={chart}
          categoryKey="period"
          bars={[
            { key: 'awake', name: 'Awake', fill: 'var(--muted)' },
            { key: 'rem', name: 'REM', fill: 'var(--violet)' },
            { key: 'core', name: 'Core', fill: 'var(--sky)' },
            { key: 'deep', name: 'Deep', fill: 'var(--mint)' },
          ]}
        />
        </ChartCard>
        <ChartCard title="Score">
        <MonoLine className="h-64" data={chart} xKey="period" valueKey="score" domain={[0, 100]} />
        </ChartCard>
      </div>
      {sleep.data && sleep.data.nights.length === 0 && (
        <p className="text-sm text-[var(--muted)]">No nights in this range.</p>
      )}
      {sleep.data && sleep.data.nights.length > 0 && (
        <ul className="divide-y divide-[var(--line)]">
          {[...sleep.data.nights].reverse().map((night) => (
            <li key={night.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{nightLabel(night.date)}</div>
                <p className="text-sm text-[var(--muted)]">
                  {night.startTime}–{night.endTime}
                  {night.score != null ? ` · score ${night.score}` : ''}
                </p>
              </div>
              <TrashButton
                label={`Delete sleep on ${night.date}`}
                onClick={async () => {
                  await api(`/api/mind/sleep/${night.id}`, { method: 'DELETE' })
                  void queryClient.invalidateQueries({ queryKey: ['sleep'] })
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {open && (
        <Dialog title="Log sleep" onClose={() => setOpen(false)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              await api('/api/mind/sleep', {
                method: 'PUT',
                body: JSON.stringify({
                  date,
                  startTime: start,
                  endTime: end,
                  score: Number(score) || null,
                  awakeMin: Number(awake) || 0,
                  remMin: Number(rem) || 0,
                  coreMin: Number(core) || 0,
                  deepMin: Number(deep) || 0,
                  source: 'GARMIN',
                }),
              })
              setOpen(false)
              void queryClient.invalidateQueries({ queryKey: ['sleep'] })
              void queryClient.invalidateQueries({ queryKey: ['today'] })
              void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
            }}
          >
            <input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="field" type="time" value={start} onChange={(event) => setStart(event.target.value)} />
              <input className="field" type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
            </div>
            <input className="field" inputMode="numeric" value={score} onChange={(event) => setScore(event.target.value)} placeholder="Sleep score" />
            <div className="grid grid-cols-2 gap-2">
              <input className="field" inputMode="numeric" value={awake} onChange={(event) => setAwake(event.target.value)} placeholder="Awake min" />
              <input className="field" inputMode="numeric" value={rem} onChange={(event) => setRem(event.target.value)} placeholder="REM min" />
              <input className="field" inputMode="numeric" value={core} onChange={(event) => setCore(event.target.value)} placeholder="Core min" />
              <input className="field" inputMode="numeric" value={deep} onChange={(event) => setDeep(event.target.value)} placeholder="Deep min" />
            </div>
            <div className="flex justify-end">
              <PrimaryButton type="submit">Save night</PrimaryButton>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  )
}

function SleepStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl tabular">{value}</div>
    </div>
  )
}
