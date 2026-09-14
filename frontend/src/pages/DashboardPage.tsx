import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { pct, signedPct } from '../lib/format'
import { scoreTone } from '../lib/colors'
import { ConsistencyHeatmap } from '../components/Heatmap'
import { CategoryBloom } from '../components/CategoryBloom'
import { CategorySnacks } from '../components/CategorySnacks'
import { PageHeader } from '../components/PageHeader'
import { ChartCard } from '../components/mono/ChartCard'
import type { Dashboard, DayDetail, HabitItem, InsightPreview, Quote, WeeklyReview } from '../types'

export function DashboardPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const selected = params.get('day')
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: () => api<Dashboard>('/api/analytics/dashboard') })
  const insights = useQuery({ queryKey: ['insights'], queryFn: () => api<InsightPreview>('/api/insights/preview') })
  const quote = useQuery({ queryKey: ['quote'], queryFn: () => api<Quote>('/api/quote') })
  const review = useQuery({ queryKey: ['weekly-review'], queryFn: () => api<WeeklyReview>('/api/analytics/weekly-review') })
  const day = useQuery({
    queryKey: ['day', selected],
    queryFn: () => api<DayDetail>(`/api/days/${selected}`),
    enabled: Boolean(selected),
  })

  if (dash.isLoading) {
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Loading dashboard">
        <div className="skeleton h-40 w-full" />
        <div className="skeleton h-56 w-full" />
      </div>
    )
  }
  if (dash.error || !dash.data) {
    return <p role="alert">Could not load the dashboard. Refresh the page and try again.</p>
  }
  const data = dash.data
  const delta = data.vsPreviousMonth
  const hero = scoreTone(data.overallPercent)
  const selectedLabel = selected
    ? new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(
        new Date(`${selected}T00:00:00`),
      )
    : null

  return (
    <div className="page">
      {quote.data && (
        <section className="border-b border-[var(--line)] px-0 py-4">
          <div className="text-sm font-semibold">Quote</div>
          <p className="mt-2 text-[15px] leading-snug">“{quote.data.text}”</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{quote.data.author}</p>
        </section>
      )}

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <PageHeader title="Consistency" lead="Last 30 days. One quiet day does not erase the stretch." />
          <div className="mt-8 flex flex-wrap items-end gap-6">
            <div className="text-7xl leading-none tracking-tight tabular md:text-8xl" style={{ color: hero }}>
              {data.overallPercent}%
            </div>
            <div className="pb-2 text-sm font-medium" style={{ color: delta != null && delta >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
              {signedPct(delta)} {data.previousMonthName ? `vs ${data.previousMonthName}` : ''}
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-[var(--line)] pt-6">
          <Stat label="Current streak" value={`${data.currentStreak} days`} />
          <Stat label="Best streak" value={`${data.bestStreak} days`} />
          <Stat label="This week" value={pct(data.thisWeek)} />
          <Stat label="This month" value={pct(data.thisMonth)} />
        </dl>
      </section>

      {data.categories.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No category scores yet.</p>
      ) : (
        <section>
          <CategorySnacks categories={data.categories} />
          <h2 className="mt-6 text-base font-semibold">Where the stretch lives</h2>
          <CategoryBloom categories={data.categories} overall={data.overallPercent} />
        </section>
      )}

      <section className="min-w-0">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-base font-semibold">How the days went</h2>
          <Link
            to="/today"
            className="glass-primary shrink-0 px-4 py-1.5 text-sm"
          >
            Log today
          </Link>
        </div>
        <ChartCard>
        <ConsistencyHeatmap
          cells={data.heatmap}
          selected={selected ?? undefined}
          onSelect={(date) => {
            setParams({ day: date })
            void queryClient.invalidateQueries({ queryKey: ['day', date] })
          }}
        />
        {selected && day.data && (
          <div className="mt-6 border-t border-[var(--line)] pt-5" aria-live="polite">
            <div className="text-sm text-[var(--muted)]">{selectedLabel}</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-4">
              <span className="text-4xl tracking-tight tabular" style={{ color: scoreTone(day.data.day.percent) }}>
                {day.data.day.percent}%
              </span>
              <span className="text-[var(--muted)]">
                {day.data.day.completed}/{day.data.day.scheduled} completed
              </span>
            </div>
            <p className="mt-2 max-w-[65ch] text-sm text-[var(--muted)]">{day.data.day.message}</p>
            <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
              {flattenHabits([...day.data.day.nonNegotiables, ...day.data.day.growth, ...day.data.day.other]).map((item) => (
                <div key={item.habit.id} className="flex justify-between gap-3 text-[var(--muted)]">
                  <span className="min-w-0 truncate">{item.habit.name}</span>
                  <span className="shrink-0" style={{ color: statusColor(item.status) }}>
                    {item.status?.toLowerCase() ?? 'pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </ChartCard>
      </section>

      {insights.data && (
        <section className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl tracking-tight">Focus</h2>
            <p className="mt-3 max-w-[65ch] text-lg leading-snug">{insights.data.focus}</p>
          </div>
          <div>
            <h2 className="text-2xl tracking-tight">From the record</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--muted)]">
              {insights.data.insights.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {review.data && (
        <section className="border-t border-[var(--line)] pt-8">
          <h2 className="text-2xl tracking-tight">Weekly review</h2>
          <div className="mt-3 text-4xl tracking-tight tabular" style={{ color: scoreTone(Math.round((review.data.consistency ?? 0) * 100)) }}>
            {pct(review.data.consistency)}
          </div>
          <dl className="mt-6 grid gap-6 md:grid-cols-3">
            <Stat label="vs last week" value={signedPct(review.data.vsPreviousWeek)} />
            <Stat
              label="Best area"
              value={review.data.bestArea ? `${review.data.bestArea.name} ${review.data.bestArea.percent}%` : '-'}
            />
            <Stat
              label="Needs attention"
              value={
                review.data.needsAttention
                  ? `${review.data.needsAttention.name} ${review.data.needsAttention.percent}%`
                  : '-'
              }
            />
          </dl>
        </section>
      )}
    </div>
  )
}

function flattenHabits(items: HabitItem[]): HabitItem[] {
  return items.flatMap((item) => [item, ...flattenHabits(item.children ?? [])])
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-lg tabular">{value}</dd>
    </div>
  )
}

function statusColor(status?: string) {
  if (status === 'COMPLETED') return 'var(--accent)'
  if (status === 'PARTIAL') return 'var(--warn)'
  if (status === 'SKIPPED') return 'var(--muted)'
  if (status === 'MISSED') return 'var(--danger)'
  return 'var(--muted)'
}
