import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClockBlock } from '../components/ClockBlock'
import { HabitRow } from '../components/HabitRow'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  blockState,
  blocksForDay,
  energyForIsoWeekday,
  liftWeek,
  parseHm,
  zonedNow,
} from '../lib/clock'
import { scoreTone } from '../lib/colors'
import type { CompletionStatus, DaySnapshot, DoseStatus, HabitItem, MedicationToday } from '../types'

function flatten(day: DaySnapshot) {
  const rows: HabitItem[] = []
  for (const list of [day.nonNegotiables, day.growth, day.other]) {
    for (const item of list) {
      rows.push(item)
      for (const child of item.children ?? []) rows.push(child)
    }
  }
  return rows
}

function matchItem(pool: HabitItem[], used: Set<string>, needles: string[]) {
  const lower = needles.map((n) => n.toLowerCase())
  return pool.find((item) => {
    if (used.has(item.habit.id) || !item.due) return false
    const name = item.habit.name.toLowerCase()
    return lower.some((n) => name.includes(n))
  })
}

function doseMinutes(time?: string) {
  if (!time) return null
  const match = time.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function lastSundayOfMonth(year: number, month: number, day: number, iso: number) {
  if (iso !== 7) return false
  const last = new Date(year, month, 0).getDate()
  return day + 7 > last
}

function loadLocal(dateKey: string): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(`verax.clock.${dateKey}`) ?? '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}

export function TodayPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const tz = user?.timezone || 'Asia/Kolkata'
  const [now, setNow] = useState(() => zonedNow(tz))
  const [localDone, setLocalDone] = useState(() => loadLocal(zonedNow(tz).dateKey))

  useEffect(() => {
    const id = window.setInterval(() => setNow(zonedNow(tz)), 30_000)
    return () => window.clearInterval(id)
  }, [tz])

  const today = useQuery({ queryKey: ['today'], queryFn: () => api<DaySnapshot>('/api/days/today') })
  const meds = useQuery({
    queryKey: ['medications', 'today'],
    queryFn: () => api<MedicationToday>('/api/medications/today'),
  })

  const mutation = useMutation({
    mutationFn: ({ habitId, status, value }: { habitId: string; status: CompletionStatus; value?: number }) =>
      api<DaySnapshot>(`/api/days/${today.data?.date}/habits/${habitId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, value }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['today'], data)
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
  const dose = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DoseStatus }) =>
      api(`/api/medications/doses/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medications'] }),
  })

  const blocks = useMemo(
    () =>
      blocksForDay({
        isoWeekday: now.isoWeekday,
        liftWeek: liftWeek(now.year, now.month, now.day),
        isFirstOfMonth: now.day === 1,
        isLastSunday: lastSundayOfMonth(now.year, now.month, now.day, now.isoWeekday),
      }),
    [now],
  )

  const energy = energyForIsoWeekday(now.isoWeekday)
  const sleepFirst = now.minutes >= parseHm('21:30')
  const pool = today.data ? flatten(today.data) : []
  const water = pool.find((item) => /water/i.test(item.habit.name) && (item.habit.unit ?? '').toLowerCase().includes('l'))
  const used = new Set<string>()
  if (water) used.add(water.habit.id)

  const states = blocks.map((block) => blockState(block, now.minutes, blocks))
  const clockLabel = `${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}`

  if (today.isLoading) return <div className="skeleton h-40" aria-busy="true" aria-label="Loading today" />
  if (!today.data) return <p>Could not load today.</p>
  const day = today.data
  const tone = scoreTone(day.percent)
  const date = new Date(day.date + 'T00:00:00')

  function toggleLocal(id: string) {
    setLocalDone((current) => {
      const next = { ...current, [id]: !current[id] }
      localStorage.setItem(`verax.clock.${now.dateKey}`, JSON.stringify(next))
      return next
    })
  }

  return (
    <div className="pb-28">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[var(--muted)]">
            {energy}
            {sleepFirst ? ' · Sleep first' : ''}
          </p>
          <h1 className="text-4xl tracking-tight">
            {new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(date)}
          </h1>
        </div>
        <div className="text-3xl tabular tracking-tight">{clockLabel}</div>
      </div>
      <p className="mt-2 max-w-[65ch] text-sm text-[var(--muted)]">
        {now.isoWeekday === 4
          ? 'Thursday 06:20 is Voice plan, not training. Deep work still starts at 09:40.'
          : 'Do the Now card. Protocols sit one tap behind.'}
      </p>

      {water && (
        <div className="mt-6 border border-[var(--line)] px-3">
          <HabitRow item={water} onStatus={(id, status, value) => mutation.mutate({ habitId: id, status, value })} />
        </div>
      )}

      <div className="mt-4">
        {blocks.map((block, index) => {
          const items = block.checks.map((check) => {
            const item = matchItem(pool, used, check.match)
            if (item) used.add(item.habit.id)
            return { label: check.label, item }
          })
          const start = parseHm(block.start)
          const end = block.end ? parseHm(block.end) : start + 30
          const doses = (meds.data?.doses ?? []).filter((row) => {
            const minute = doseMinutes(row.scheduledTime)
            if (minute == null) return false
            if (block.id === 'sleep') return false
            return minute >= start && minute < end
          })
          return (
            <ClockBlock
              key={block.id}
              block={block}
              state={states[index] ?? 'later'}
              items={items}
              doses={doses}
              dateKey={day.date}
              sleepFirst={sleepFirst}
              localDone={localDone}
              onLocalDone={toggleLocal}
              onStatus={(id, status, value) => mutation.mutate({ habitId: id, status, value })}
              onDose={(id, status) => dose.mutate({ id, status })}
            />
          )
        })}
      </div>

      <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] mt-8 border-t border-[var(--line)] bg-[var(--bg)] pt-4 lg:bottom-6" aria-live="polite">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-4xl tracking-tight tabular" style={{ color: tone }}>
              {day.completed} / {day.scheduled}
            </div>
            <div className="text-sm text-[var(--muted)]">Consistency {day.percent}%</div>
          </div>
          <p className="max-w-[14rem] text-right text-sm text-[var(--muted)]">{day.message}</p>
        </div>
      </div>
    </div>
  )
}
