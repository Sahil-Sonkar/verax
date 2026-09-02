import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AmbientPlayer } from '../components/AmbientPlayer'
import { Dialog, PrimaryButton } from '../components/Dialog'
import { FocusTimer } from '../components/FocusTimer'
import { MindJournal } from '../components/MindJournal'
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
    <div className="space-y-8">
      <div>
        <p className="kicker">Quiet</p>
        <h1 className="mt-2 text-5xl tracking-tight">Mind</h1>
        <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-[var(--muted)]">
          Notes, a sit, and sleep. Each stays on its own tab.
        </p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--line)]" role="tablist" aria-label="Mind">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`flex-1 px-3.5 py-3 text-[13px] font-medium tracking-wide ${
              tab === item.id ? 'text-[var(--fg)] shadow-[inset_0_-2px_0_var(--fg)]' : 'text-[var(--muted)]'
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

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
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="awake" stackId="s" fill="#737373" />
              <Bar dataKey="rem" stackId="s" fill="#833ab4" />
              <Bar dataKey="core" stackId="s" fill="#0095f6" />
              <Bar dataKey="deep" stackId="s" fill="#00376b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={chart}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#0095f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

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
