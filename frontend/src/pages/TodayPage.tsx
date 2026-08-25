import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FocusTimer } from '../components/FocusTimer'
import { HabitRow } from '../components/HabitRow'
import { api } from '../lib/api'
import { scoreTone } from '../lib/colors'
import type { CompletionStatus, DaySnapshot, DoseStatus, FrequencyType, HabitItem, MedicationToday } from '../types'

type Cadence = 'daily' | 'weekly' | 'monthly'

function cadenceOf(freq: FrequencyType): Cadence {
  if (freq === 'WEEKLY' || freq === 'WEEKDAYS') return 'weekly'
  if (freq === 'MONTHLY') return 'monthly'
  return 'daily'
}

function filterCadence(items: HabitItem[], cadence: Cadence) {
  return items.filter((item) => cadenceOf(item.habit.frequencyType) === cadence)
}

export function TodayPage() {
  const queryClient = useQueryClient()
  const [cadence, setCadence] = useState<Cadence>('daily')
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

  if (today.isLoading) return <div className="skeleton mx-auto h-40 max-w-2xl" aria-busy="true" aria-label="Loading today" />
  if (!today.data) return <p>Could not load today.</p>
  const day = today.data
  const date = new Date(day.date + 'T00:00:00')
  const tone = scoreTone(day.percent)

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <h1 className="text-4xl tracking-tight">
        {new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(date)}
      </h1>
      <p className="mt-2 max-w-[65ch] text-[var(--muted)]">Check in under a minute. Leave the rest of the day to the work.</p>

      <div className="segmented mt-6" role="tablist" aria-label="Cadence">
        {(['daily', 'weekly', 'monthly'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            className="chip capitalize"
            aria-selected={cadence === option}
            aria-pressed={cadence === option}
            onClick={() => setCadence(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {cadence === 'daily' && (
        <>
          <section className="mt-10">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-sm font-medium">Medicines</h2>
              <Link
                to="/meds"
                className="text-sm text-[var(--accent)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Manage
              </Link>
            </div>
            {meds.data?.doses.length === 0 && (
              <p className="mt-2 text-sm text-[var(--muted)]">Nothing scheduled. Add a course from Medicines if you take any.</p>
            )}
            <div className="mt-2 divide-y divide-[var(--line)]">
              {meds.data?.doses.map((row) => (
                <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div>
                      {row.name}
                      {row.dosage ? ` · ${row.dosage}` : ''}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {row.scheduledTime} · {row.status.toLowerCase()}
                    </div>
                  </div>
                  {row.status === 'PENDING' || row.status === 'MISSED' ? (
                    <div className="flex gap-2 text-sm">
                      <button type="button" className="text-[var(--accent)] hover:opacity-80" onClick={() => dose.mutate({ id: row.id, status: 'TAKEN' })}>
                        Taken
                      </button>
                      <button type="button" className="text-[var(--muted)] hover:text-[var(--fg)]" onClick={() => dose.mutate({ id: row.id, status: 'SKIPPED' })}>
                        Skip
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="text-sm text-[var(--muted)] hover:text-[var(--fg)]" onClick={() => dose.mutate({ id: row.id, status: 'PENDING' })}>
                      Undo
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
          <FocusTimer />
        </>
      )}

      <Section
        title="Non-negotiables"
        items={filterCadence(day.nonNegotiables, cadence)}
        onStatus={(id, status, value) => mutation.mutate({ habitId: id, status, value })}
      />
      <Section title="Growth" items={filterCadence(day.growth, cadence)} onStatus={(id, status, value) => mutation.mutate({ habitId: id, status, value })} />
      <Section title="Other" items={filterCadence(day.other, cadence)} onStatus={(id, status, value) => mutation.mutate({ habitId: id, status, value })} />

      <div className="sticky bottom-20 mt-8 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] pt-5 backdrop-blur-xl lg:bottom-6" aria-live="polite">
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

function Section({
  title,
  items,
  onStatus,
}: {
  title: string
  items: HabitItem[]
  onStatus: (habitId: string, status: CompletionStatus, value?: number) => void
}) {
  if (items.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="mt-1">
        {items.map((item) => (
          <HabitRow key={item.habit.id} item={item} onStatus={onStatus} />
        ))}
      </div>
    </section>
  )
}
