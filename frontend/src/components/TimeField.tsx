import { parseClock, toTimeInput } from '../lib/weekdays'

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i)
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

export function TimeField({
  value,
  onChange,
  hour12,
}: {
  value: string
  onChange: (next: string) => void
  hour12: boolean
}) {
  const minutes = parseClock(value === '24:00' ? '23:59' : value) ?? 0
  const hours24 = Math.min(23, Math.floor(minutes / 60))
  const mins = minutes % 60
  const pm = hours24 >= 12
  const hour12Value = hours24 % 12 === 0 ? 12 : hours24 % 12

  function write(nextHours24: number, nextMins: number) {
    onChange(toTimeInput(nextHours24 * 60 + nextMins))
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        className="field w-auto py-2"
        value={hour12 ? hour12Value : hours24}
        onChange={(event) => {
          const chosen = Number(event.target.value)
          if (hour12) {
            const base = chosen % 12
            write(pm ? base + 12 : base, mins)
          } else {
            write(chosen, mins)
          }
        }}
      >
        {(hour12 ? HOURS_12 : HOURS_24).map((hour) => (
          <option key={hour} value={hour}>
            {String(hour).padStart(2, '0')}
          </option>
        ))}
      </select>
      <span className="text-[var(--muted)]">:</span>
      <select className="field w-auto py-2" value={mins} onChange={(event) => write(hours24, Number(event.target.value))}>
        {MINUTES.map((minute) => (
          <option key={minute} value={minute}>
            {String(minute).padStart(2, '0')}
          </option>
        ))}
      </select>
      {hour12 && (
        <select
          className="field w-auto py-2"
          value={pm ? 'pm' : 'am'}
          onChange={(event) => {
            const nextPm = event.target.value === 'pm'
            const base = hours24 % 12
            write(nextPm ? base + 12 : base, mins)
          }}
        >
          <option value="am">am</option>
          <option value="pm">pm</option>
        </select>
      )}
    </div>
  )
}
