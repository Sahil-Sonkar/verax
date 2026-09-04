import { Check } from 'lucide'
import { Link } from 'react-router-dom'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Glyph } from './Glyph'
import { habitColor } from '../lib/colors'
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
  onOpen,
}: {
  item: HabitItem
  trail: { date: string; status?: string }[]
  waterLiters?: number
  onStatus: (habitId: string, status: CompletionStatus, value?: number) => void
  onOpen?: () => void
}) {
  const accent = habitColor(item.habit.id)
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
  const days = trail.slice(-7)

  return (
    <div className="border-b border-[var(--line)] py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onStatus(item.habit.id, done ? 'MISSED' : 'COMPLETED')}
          aria-pressed={done}
          aria-label={`Mark ${item.habit.name} ${done ? 'missed' : 'done'}`}
          className="grid size-11 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
        {onOpen ? (
          <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
            <HabitLabel name={item.habit.name} detail={detail} water={water} />
          </button>
        ) : (
          <div className="min-w-0 flex-1">
            <HabitLabel name={item.habit.name} detail={detail} water={water} />
          </div>
        )}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {days.length > 0 && (
            <div className="flex gap-1" aria-hidden="true">
              {days.map((day) => (
                <span key={day.date} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] leading-none text-[var(--muted)]">
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
                            : day.status === 'MISSED' || day.status === 'SKIPPED'
                              ? 'var(--fg)'
                              : 'var(--surface-2)',
                    }}
                  />
                </span>
              ))}
            </div>
          )}
          <ToggleGroup
            type="single"
            value={item.status}
            onValueChange={(value) => {
              if (value) onStatus(item.habit.id, value as CompletionStatus)
            }}
            aria-label={`${item.habit.name} status`}
            className="shrink-0"
          >
            {STATUSES.map((status) => (
              <ToggleGroupItem
                key={status.value}
                value={status.value}
                style={
                  item.status === status.value
                    ? { background: `color-mix(in srgb, ${accent} 22%, transparent)`, color: accent }
                    : undefined
                }
              >
                {status.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </div>
  )
}

function HabitLabel({ name, detail, water }: { name: string; detail?: string; water: boolean }) {
  return (
    <>
      <div className="truncate text-[15px]">{name}</div>
      {detail ? (
        water ? (
          <Link
            to="/body"
            className="truncate text-xs text-[var(--muted)] underline-offset-4 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {detail}
          </Link>
        ) : (
          <div className="truncate text-xs text-[var(--muted)]">{detail}</div>
        )
      ) : null}
    </>
  )
}
