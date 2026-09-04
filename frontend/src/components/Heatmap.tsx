import { clsx } from 'clsx'
import { useLayoutEffect, useRef, useState } from 'react'
import type { HeatCell } from '../types'

const CELL = 11
const GAP = 3

const HEAT = [
  'var(--heat-0)',
  'var(--heat-1)',
  'var(--heat-2)',
  'var(--heat-3)',
  'var(--heat-4)',
  'var(--heat-5)',
]

const HEAT_GREEN = [
  'var(--heat-green-0)',
  'var(--heat-green-1)',
  'var(--heat-green-2)',
  'var(--heat-green-3)',
  'var(--heat-green-4)',
  'var(--heat-green-5)',
]

function startOfWeek(date: Date) {
  const copy = new Date(date)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function iso(date: Date) {
  return new Intl.DateTimeFormat('en-CA').format(date)
}

function weekStarts(first: Date, last: Date) {
  const weeks: Date[] = []
  for (let cursor = startOfWeek(first); cursor <= last; ) {
    weeks.push(new Date(cursor))
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() + 7)
  }
  return weeks
}

export function ConsistencyHeatmap({
  cells,
  onSelect,
  selected,
  tone = 'blue',
  colorOf,
  legend,
}: {
  cells: HeatCell[]
  onSelect?: (date: string) => void
  selected?: string
  tone?: 'blue' | 'green'
  colorOf?: (cell: HeatCell) => string
  legend?: { color: string; label: string }[]
}) {
  const palette = tone === 'green' ? HEAT_GREEN : HEAT
  const byDate = new Map(cells.map((cell) => [cell.date, cell]))
  const [hint, setHint] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const showCount = cells.some((cell) => cell.completed != null)
  const first = cells[0] ? new Date(cells[0].date + 'T00:00:00') : null
  const last = cells.length ? new Date(cells[cells.length - 1].date + 'T00:00:00') : null
  const weeks = first && last ? weekStarts(first, last) : []
  const minInner = weeks.length * CELL + Math.max(0, weeks.length - 1) * GAP

  useLayoutEffect(() => {
    const el = scroller.current
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth
  }, [minInner])

  if (cells.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No days logged yet.</p>
  }

  const monthMarks: { week: number; label: string }[] = []
  weeks.forEach((week, index) => {
    const label = week.toLocaleString(undefined, { month: 'short' })
    if (index === 0 || week.getDate() <= 7) {
      monthMarks.push({ week: index, label })
    }
  })

  return (
    <div className="min-w-0">
    <div ref={scroller} className="min-w-0 w-full overflow-x-auto">
      <div className="w-full" style={{ minWidth: minInner }}>
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
      <div className="flex w-full" style={{ gap: GAP }} role="grid" aria-label="Daily consistency">
        {weeks.map((week) => (
          <div
            key={week.toISOString()}
            className="flex min-w-0 flex-1 flex-col"
            style={{ minWidth: CELL, gap: GAP }}
            role="row"
          >
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
              const count = cell.completed
              const detail = cell.status
                ? cell.status === 'COMPLETED'
                  ? 'Done'
                  : cell.status === 'PARTIAL'
                    ? 'Half'
                    : 'Miss'
                : count != null
                  ? `${count % 1 === 0 ? count : count.toFixed(1)}`
                  : `${cell.percent}%`
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  aria-label={`${label}: ${detail}`}
                  aria-pressed={selected === key}
                  title={`${label}: ${detail}`}
                  onClick={() => {
                    setHint(`${label} · ${detail}`)
                    onSelect?.(key)
                  }}
                  onMouseEnter={() => setHint(`${label} · ${detail}`)}
                  onMouseLeave={() => setHint(null)}
                  onFocus={() => setHint(`${label} · ${detail}`)}
                  onBlur={() => setHint(null)}
                  className={clsx(
                    'aspect-square w-full rounded-[2px] transition-transform duration-150 hover:scale-110',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                    selected === key && 'ring-1 ring-[var(--fg)]',
                  )}
                  style={{ background: colorOf ? colorOf(cell) : palette[cell.level] ?? palette[0] }}
                />
              )
            })}
          </div>
        ))}
      </div>
      </div>
    </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] tracking-wide text-[var(--muted)]">
        {tone === 'green' || colorOf ? (
          <span className="min-h-[1.25rem] tabular text-xs text-[var(--fg)]">
            {hint ?? (showCount || colorOf ? 'Tap a day' : '')}
          </span>
        ) : (
          <span />
        )}
        <span className="flex flex-wrap items-center gap-2">
          {legend ? (
            legend.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1">
                <span className="size-3.5 rounded-[4px]" style={{ background: item.color }} aria-hidden="true" />
                {item.label}
              </span>
            ))
          ) : (
            <>
              Less
              {palette.map((color, i) => (
                <span
                  key={color}
                  className="size-3.5 rounded-[4px]"
                  style={{ background: color, opacity: i === 0 ? 0.7 : 1 }}
                  aria-hidden="true"
                />
              ))}
              More
            </>
          )}
        </span>
      </div>
    </div>
  )
}
