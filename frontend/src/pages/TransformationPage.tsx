import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { pct } from '../lib/format'
import { categoryColor, scoreTone } from '../lib/colors'
import { ProgressBar } from '../components/Progress'
import type { Transformation } from '../types'

export function TransformationPage() {
  const list = useQuery({
    queryKey: ['transformations'],
    queryFn: () => api<Transformation[]>('/api/transformations'),
  })
  const active = list.data?.[0]

  if (list.isLoading) return <div className="skeleton h-40 w-full" aria-busy="true" aria-label="Loading transformation" />
  if (!active) {
    return (
      <div>
        <h1 className="text-4xl tracking-tight">Transformation</h1>
        <p className="mt-3 max-w-[65ch] text-[var(--muted)]">
          No mission yet. Create one when you are ready to bound the stretch.
        </p>
      </div>
    )
  }

  const ratio = active.daysTotal === 0 ? 0 : (active.daysElapsed / active.daysTotal) * 100
  const consistencyPct = Math.round((active.consistency ?? 0) * 100)

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-4xl tracking-tight md:text-5xl">8-month transformation</h1>
        <p className="mt-3 max-w-[65ch] text-[var(--muted)]">{active.notes}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(`${active.startDate}T00:00:00`))}
          {' to '}
          {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(`${active.endDate}T00:00:00`))}
        </p>
      </section>

      <section className="grid gap-8 border-t border-[var(--line)] pt-8 md:grid-cols-3">
        <div>
          <div className="text-sm text-[var(--muted)]">Days completed</div>
          <div className="mt-1 text-4xl tracking-tight tabular">
            {active.daysElapsed} / {active.daysTotal}
          </div>
          <ProgressBar value={ratio} className="mt-4" />
        </div>
        <div>
          <div className="text-sm text-[var(--muted)]">Overall consistency</div>
          <div className="mt-1 text-4xl tracking-tight tabular" style={{ color: scoreTone(consistencyPct) }}>
            {pct(active.consistency)}
          </div>
        </div>
        <div>
          <div className="text-sm text-[var(--muted)]">Major goals</div>
          <div className="mt-1 text-4xl tracking-tight tabular">{active.goals.length}</div>
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        {active.goals.map((goal) => {
          const accent = categoryColor(goal.category?.name, goal.category?.color)
          return (
            <article key={goal.id} className="border-t border-[var(--line)] pt-5">
              <div className="text-sm" style={{ color: accent }}>
                {goal.category?.name}
              </div>
              <h2 className="text-2xl tracking-tight">{goal.name}</h2>
              <ProgressBar value={goal.progressPercent} className="mt-4" color={accent} />
              <div className="mt-2 text-sm tabular">{goal.progressPercent ?? 0}%</div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
