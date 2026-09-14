import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { CompletionStatus, HabitItem } from '../types'
import { importanceLabel } from '../lib/format'
import { categoryColor, inkOn } from '../lib/colors'
import { clsx } from 'clsx'

const STATUSES: { value: CompletionStatus; label: string; color: string }[] = [
  { value: 'COMPLETED', label: 'Done', color: 'var(--mint)' },
  { value: 'PARTIAL', label: 'Half', color: 'var(--brass)' },
  { value: 'SKIPPED', label: 'Skip', color: 'var(--muted)' },
  { value: 'MISSED', label: 'Miss', color: 'var(--pink)' },
]

function isWater(item: HabitItem) {
  const unit = item.habit.unit?.toLowerCase() ?? ''
  return unit === 'l' || unit === 'liter' || unit === 'liters' || /water/i.test(item.habit.name)
}

export function HabitRow({
  item,
  onStatus,
  nested = false,
  plain = false,
}: {
  item: HabitItem
  onStatus: (habitId: string, status: CompletionStatus, value?: number) => void
  nested?: boolean
  plain?: boolean
}) {
  const children = item.children ?? []
  const isGroup = !plain && children.length > 0
  const accent = categoryColor(item.habit.category?.name, item.habit.category?.color)
  const target = item.habit.targetValue ?? 3
  const current = item.value ?? 0

  return (
    <div className={clsx('border-b border-[var(--line)] py-4 last:border-b-0', nested && 'ml-6 border-l border-[var(--line)] pl-4')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {isGroup ? (
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold"
                style={{ background: accent, color: inkOn(accent) }}
                aria-hidden="true"
              >
                {item.habit.name.slice(0, 1)}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onStatus(item.habit.id, item.status === 'COMPLETED' ? 'MISSED' : 'COMPLETED')}
                aria-pressed={item.status === 'COMPLETED'}
                aria-label={`Mark ${item.habit.name} ${item.status === 'COMPLETED' ? 'missed' : 'done'}`}
                className="grid size-11 shrink-0 place-items-center rounded-full text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{
                  background: item.status === 'COMPLETED' ? 'var(--mint)' : accent,
                  color: inkOn(item.status === 'COMPLETED' ? 'var(--mint)' : accent),
                  opacity: item.status === 'COMPLETED' ? 1 : 0.85,
                }}
              >
                {item.habit.name.slice(0, 1)}
              </button>
            )}
            <div className="min-w-0">
              <div className="truncate text-[15px]">{item.habit.name}</div>
              <div className="truncate text-xs" style={{ color: plain ? 'var(--muted)' : accent }}>
                {plain
                  ? [
                      item.value != null && item.habit.targetValue != null
                        ? `${item.value} / ${item.habit.targetValue} ${item.habit.unit ?? ''}`.trim()
                        : item.habit.targetValue
                          ? `${item.habit.targetValue} ${item.habit.unit ?? ''}`.trim()
                          : null,
                      item.periodProgress,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Daily'
                  : [
                      item.habit.category?.name ?? 'Other',
                      importanceLabel(item.habit.importance),
                      item.habit.targetValue ? `${item.habit.targetValue} ${item.habit.unit ?? ''}`.trim() : null,
                      item.periodProgress,
                      isGroup ? `${children.filter((c) => c.status === 'COMPLETED').length}/${children.length}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
              </div>
            </div>
          </div>
        </div>
        {!isGroup && !isWater(item) && (
          <ToggleGroup
            type="single"
            value={item.status}
            onValueChange={(value) => {
              if (value) onStatus(item.habit.id, value as CompletionStatus)
            }}
            aria-label={`${item.habit.name} status`}
            className="pl-11 sm:pl-0"
          >
            {STATUSES.map((status) => (
              <ToggleGroupItem
                key={status.value}
                value={status.value}
                style={
                  item.status === status.value
                    ? { background: `color-mix(in srgb, ${status.color} 32%, transparent)`, color: status.color }
                    : undefined
                }
              >
                {status.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>
      {!isGroup && isWater(item) && (
        <div className="mt-3 pl-8">
          <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
            <span>Drunk today</span>
            <span className="tabular">
              {current} / {target} {item.habit.unit ?? 'L'}
            </span>
          </div>
          <input
            className="slider"
            type="range"
            min={0}
            max={target}
            step={0.1}
            value={current}
            aria-label={`${item.habit.name} amount`}
            onChange={(event) => {
              const value = Number(event.target.value)
              const status: CompletionStatus =
                value >= target ? 'COMPLETED' : value > 0 ? 'PARTIAL' : 'MISSED'
              onStatus(item.habit.id, status, value)
            }}
          />
        </div>
      )}
      {!plain &&
        children.map((child) => (
          <HabitRow key={child.habit.id} item={child} onStatus={onStatus} nested />
        ))}
    </div>
  )
}
