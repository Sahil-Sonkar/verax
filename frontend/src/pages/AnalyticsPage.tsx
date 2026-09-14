import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MonoBars } from '../components/mono/MonoBars'
import { MonoLine } from '../components/mono/MonoLine'
import { api } from '../lib/api'
import { pct, signedPct } from '../lib/format'
import { categoryColor, scoreTone } from '../lib/colors'
import { PageHeader } from '../components/PageHeader'
import { ChartCard } from '../components/mono/ChartCard'
import type { Compare, NamedScore, TrendPoint, WeeklyReview } from '../types'

export function AnalyticsPage() {
  const [params, setParams] = useSearchParams()
  const granularity = params.get('g') ?? 'weekly'
  const period = params.get('p') ?? 'month'
  const to = new Intl.DateTimeFormat('en-CA').format(new Date())
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - (granularity === 'yearly' ? 365 * 2 : 90))
  const from = new Intl.DateTimeFormat('en-CA').format(fromDate)

  const trends = useQuery({
    queryKey: ['trends', granularity, from, to],
    queryFn: () => api<{ points: TrendPoint[] }>(`/api/analytics/trends?granularity=${granularity}&from=${from}&to=${to}`),
  })
  const categories = useQuery({
    queryKey: ['cat-perf', from, to],
    queryFn: () => api<NamedScore[]>(`/api/analytics/categories?from=${from}&to=${to}`),
  })
  const habits = useQuery({
    queryKey: ['habit-perf', from, to],
    queryFn: () => api<NamedScore[]>(`/api/analytics/habits?from=${from}&to=${to}`),
  })
  const compare = useQuery({
    queryKey: ['compare', period],
    queryFn: () => api<Compare>(`/api/analytics/compare?period=${period}`),
  })
  const review = useQuery({
    queryKey: ['weekly-review'],
    queryFn: () => api<WeeklyReview>('/api/analytics/weekly-review'),
  })

  const lineData = useMemo(
    () => (trends.data?.points ?? []).map((p) => ({ ...p, percent: p.percent })),
    [trends.data],
  )

  return (
    <div className="page">
      <PageHeader title="Analytics" />

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl tracking-tight">Consistency trend</h2>
          <div className="segmented">
            {['daily', 'weekly', 'monthly', 'yearly'].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setParams({ g, p: period })}
                aria-pressed={g === granularity}
                className="chip capitalize"
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <ChartCard>
        <MonoLine
          className="h-72"
          data={lineData}
          valueKey="percent"
          domain={[0, 100]}
          format={(value) => `${Math.round(value)}%`}
        />
        </ChartCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Category Performance">
          <MonoBars
            className="h-[280px]"
            layout="vertical"
            categoryKey="name"
            data={categories.data ?? []}
            bars={[{ key: 'percent', name: 'Score' }]}
            colorOf={(row) => categoryColor(String(row.name), String(row.color ?? ''))}
            format={(value) => `${Math.round(value)}%`}
          />
        </ChartCard>
        <ChartCard title="Habit Performance">
          <div className="space-y-3">
            {(habits.data ?? []).length === 0 && (
              <p className="text-sm text-[var(--muted)]">No habit scores in this range yet.</p>
            )}
            {(habits.data ?? []).slice(0, 10).map((habit) => (
              <div key={habit.id ?? habit.name}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{habit.name}</span>
                  <span className="shrink-0 tabular text-[var(--muted)]">{habit.percent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${habit.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </section>

      <section className="border-t border-[var(--line)] pt-6">
        <div className="segmented mb-4">
          {['week', 'month', 'year'].map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setParams({ g: granularity, p })}
              className="chip capitalize"
            >
              {p}
            </button>
          ))}
        </div>
        {compare.data && (
          <div className="grid gap-4 md:grid-cols-3">
            <CompareStat label={compare.data.currentLabel} value={pct(compare.data.current)} />
            <CompareStat label={compare.data.previousLabel} value={pct(compare.data.previous)} />
            <CompareStat
              label="Change"
              value={signedPct(compare.data.delta)}
              alert={(compare.data.delta ?? 0) < 0}
            />
          </div>
        )}
      </section>

      {review.data && (
        <section className="border-t border-[var(--line)] pt-8">
          <h2 className="text-2xl tracking-tight">Weekly review</h2>
          <p
            className="mt-2 text-3xl tracking-tight tabular"
            style={{ color: scoreTone(Math.round((review.data.consistency ?? 0) * 100)) }}
          >
            {pct(review.data.consistency)}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {review.data.habitsCompleted} / {review.data.habitsScheduled} commitments, streak {review.data.streak}
          </p>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium">What went well</h3>
              <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                {review.data.wentWell.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium">What needs attention</h3>
              <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                {review.data.needsWork.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function CompareStat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="text-3xl tracking-tight tabular" style={{ color: alert ? 'var(--danger)' : 'var(--fg)' }}>
        {value}
      </div>
    </div>
  )
}
