import { clsx } from 'clsx'
import { WEEKDAY_LABELS } from '../lib/weekdays'

export function WeekdayChips({
  value,
  onChange,
  emptyMeansAll = false,
}: {
  value: number[]
  onChange: (next: number[]) => void
  emptyMeansAll?: boolean
}) {
  const selected = new Set(value)
  const allOn = emptyMeansAll && value.length === 0

  function toggle(day: number) {
    if (allOn) {
      onChange([1, 2, 3, 4, 5, 6, 7].filter((item) => item !== day))
      return
    }
    if (selected.has(day)) onChange(value.filter((item) => item !== day))
    else onChange([...value, day].sort((a, b) => a - b))
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {WEEKDAY_LABELS.map((label, index) => {
        const day = index + 1
        const on = allOn || selected.has(day)
        return (
          <button
            key={label}
            type="button"
            onClick={() => toggle(day)}
            className={clsx('weekday-chip', on && 'on')}
            aria-pressed={on}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
