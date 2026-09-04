import { clsx } from 'clsx'
import { BLOCK_COLORS, DEFAULT_SWATCH } from '../lib/colors'

export function ColorSwatches({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const current = value || DEFAULT_SWATCH
  return (
    <div>
      <div className="mb-1 text-xs text-[var(--muted)]">Color</div>
      <div className="flex flex-wrap items-center gap-2">
        {BLOCK_COLORS.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={`Use ${hex}`}
            aria-pressed={current.toLowerCase() === hex}
            className={clsx('color-swatch', current.toLowerCase() === hex && 'on')}
            style={{ background: hex }}
            onClick={() => onChange(hex)}
          />
        ))}
        <label className="color-swatch custom" title="Custom color">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(current) ? current : DEFAULT_SWATCH}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      </div>
    </div>
  )
}
