import { clsx } from 'clsx'
import type { HeatCell } from '../types'

const HEAT = [
  'var(--heat-0)',
  'var(--heat-1)',
  'var(--heat-2)',
  'var(--heat-3)',
  'var(--heat-4)',
  'var(--heat-5)',
]

function startOfWeek(date: Date) {
  const copy = new Date(date)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function ConsistencyHeatmap({
  cells,
  onSelect,
  selected,
}: {
  cells: HeatCell[]
  onSelect?: (date: string) => void
  selected?: string
}) {
  const byDate = new Map(cells.map((cell) => [cell.date, cell]))
  if (cells.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No days logged yet.</p>
  }
  const first = new Date(cells[0].date + 'T00:00:00')
  const last = new Date(cells[cells.length - 1].date + 'T00:00:00')
  const weeks: Date[] = []
  for (let cursor = startOfWeek(first); cursor <= last; cursor = new Date(cursor.getTime() + 7 * 86400000)) {
    weeks.push(new Date(cursor))
  }

  const monthMarks: { week: number; label: string }[] = []
  weeks.forEach((week, index) => {
    const label = week.toLocaleString(undefined, { month: 'short' })
    if (index === 0 || week.getDate() <= 7) {
      monthMarks.push({ week: index, label })
    }
  })

  return (
    <div className="w-full">
      <div className="relative mb-2 h-4 text-[10px] tracking-wide text-[var(--muted)]">
        {monthMarks.map((mark) => (
          <span
            key={mark.week}
            className="absolute"
            style={{ left: `${(mark.week / weeks.length) * 100}%` }}
          >
            {mark.label}
          </span>
        ))}
      </div>
      <div className="flex gap-px sm:gap-1" role="grid" aria-label="Daily consistency">
        {weeks.map((week) => (
          <div key={week.toISOString()} className="flex min-w-0 flex-1 flex-col gap-px sm:gap-1" role="row">
            {Array.from({ length: 7 }, (_, day) => {
              const date = new Date(week)
              date.setDate(week.getDate() + day)
              const key = iso(date)
              const cell = byDate.get(key)
              if (!cell) {
                return <div key={key} className="aspect-square w-full rounded-[2px] bg-transparent" role="gridcell" />
              }
              const label = new Intl.DateTimeFormat(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              }).format(date)
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  aria-label={`${label}: ${cell.percent}%`}
                  aria-pressed={selected === key}
                  title={`${label}: ${cell.percent}%`}
                  onClick={() => onSelect?.(key)}
                  className={clsx(
                    'aspect-square w-full min-h-0 rounded-[2px] transition-transform duration-150 hover:scale-110',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                    selected === key && 'ring-1 ring-[var(--fg)]',
                  )}
                  style={{ background: HEAT[cell.level] ?? HEAT[0] }}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] tracking-wide text-[var(--muted)]">
        Less
        {HEAT.map((color, i) => (
          <span
            key={color}
            className="size-3.5 rounded-[4px]"
            style={{ background: color, opacity: i === 0 ? 0.7 : 1 }}
            aria-hidden="true"
          />
        ))}
        More
      </div>
    </div>
  )
}
