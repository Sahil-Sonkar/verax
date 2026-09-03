import { Check, Pencil } from 'lucide'
import { Link } from 'react-router-dom'
import { Glyph } from './Glyph'
import { categoryColor } from '../lib/colors'
import { habitIcon } from '../lib/habitIcons'
import { isWaterHabit } from '../lib/dailyHabits'
import type { CompletionStatus, HabitItem } from '../types'

const STATUSES: { value: CompletionStatus; label: string }[] = [
  { value: 'COMPLETED', label: 'Done' },
  { value: 'PARTIAL', label: 'Half' },
  { value: 'SKIPPED', label: 'Skip' },
  { value: 'MISSED', label: 'Miss' },
]

export function TrackerHabitRow({
  item,
  trail,
  waterLiters,
  onStatus,
  onEdit,
}: {
  item: HabitItem
  trail: { date: string; status?: string }[]
  waterLiters?: number
  onStatus: (habitId: string, status: CompletionStatus, value?: number) => void
  onEdit?: () => void
}) {
  const accent = categoryColor(item.habit.category?.name, item.habit.category?.color)
  const done = item.status === 'COMPLETED'
  const half = item.status === 'PARTIAL'
  const Icon = habitIcon(item.habit.icon)
  const water = isWaterHabit(item)
  const target = item.habit.targetValue
  const unit = item.habit.unit ?? ''
  const detail = water
    ? `${(waterLiters ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} / ${target ?? 3} L`
    : item.value != null && target != null
      ? `${item.value} / ${target} ${unit}`.trim()
      : target
        ? `${target} ${unit}`.trim()
        : item.periodProgress

  return (
    <div className="border-b border-[var(--line)] py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onStatus(item.habit.id, done ? 'MISSED' : 'COMPLETED')}
          aria-pressed={done}
          aria-label={`Mark ${item.habit.name} ${done ? 'missed' : 'done'}`}
          className="grid size-10 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <span
            className="grid size-7 place-items-center rounded-full text-white"
            style={{
              background: done ? accent : half ? `color-mix(in srgb, ${accent} 55%, var(--surface))` : 'transparent',
              boxShadow: done || half ? undefined : `inset 0 0 0 2px ${accent}`,
              color: done || half ? '#fff' : accent,
            }}
          >
            {done ? <Glyph icon={Check} size={16} strokeWidth={2.5} /> : <Glyph icon={Icon} size={15} />}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1 truncate text-[15px]">{item.habit.name}</div>
            {onEdit ? (
              <button
                type="button"
                className="grid size-10 shrink-0 place-items-center rounded-[8px] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                aria-label={`Edit ${item.habit.name}`}
                onClick={onEdit}
              >
                <Glyph icon={Pencil} size={15} />
              </button>
            ) : null}
          </div>
          {detail ? (
            water ? (
              <Link to="/body" className="truncate text-xs text-[var(--muted)] underline-offset-4 hover:underline">
                {detail}
              </Link>
            ) : (
              <div className="truncate text-xs text-[var(--muted)]">{detail}</div>
            )
          ) : null}
        </div>
        <div className="ml-auto flex shrink-0 items-end gap-1" aria-hidden="true">
          {trail.slice(-7).map((day) => (
            <span key={day.date} className="flex w-4 flex-col items-center gap-1">
              <span className="text-[9px] leading-none text-[var(--muted)]">
                {new Date(day.date + 'T00:00:00').toLocaleString(undefined, { weekday: 'narrow' })}
              </span>
              <span
                className="size-2.5 rounded-[2px]"
                style={{
                  background:
                    day.status === 'COMPLETED'
                      ? accent
                      : day.status === 'PARTIAL'
                        ? `color-mix(in srgb, ${accent} 45%, var(--surface-2))`
                        : 'var(--surface-2)',
                }}
              />
            </span>
          ))}
        </div>
      </div>
      <div className="control-cluster mt-2 pl-11" role="group" aria-label={`${item.habit.name} status`}>
        {STATUSES.map((status) => (
          <button
            key={status.value}
            type="button"
            aria-pressed={item.status === status.value}
            onClick={() => onStatus(item.habit.id, status.value)}
            className="px-2.5 py-1 text-[11px] tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            style={
              item.status === status.value
                ? { background: `color-mix(in srgb, ${accent} 22%, transparent)`, color: accent }
                : { color: 'var(--muted)' }
            }
          >
            {status.label}
          </button>
        ))}
      </div>
    </div>
  )
}
