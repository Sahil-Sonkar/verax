import { useMemo, useState } from 'react'
import { formatCompact } from '../lib/format'

const AXES = ['CHEST', 'SHOULDERS', 'BICEPS', 'BACK', 'TRICEPS', 'CORE', 'QUADS', 'HAMS', 'CALVES', 'GLUTES'] as const
const HIGHLIGHT = '#e23d3d'
const STROKE = '#3d9bff'
const FILL = 'rgba(61, 155, 255, 0.28)'
const RINGS = 4

type Axis = (typeof AXES)[number]
type Point = { muscle: string; volume: number; sessions?: number }

function angleAt(index: number) {
  return -Math.PI / 2 + (index * 2 * Math.PI) / AXES.length
}

function polar(cx: number, cy: number, radius: number, index: number) {
  const angle = angleAt(index)
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
}

function niceMax(value: number) {
  if (value <= 0) return 4
  const padded = value
  const pow = 10 ** Math.floor(Math.log10(padded))
  const n = padded / pow
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 8 ? 8 : 10
  return nice * pow
}

function polygon(cx: number, cy: number, radius: number) {
  return AXES.map((_, index) => {
    const point = polar(cx, cy, radius, index)
    return `${point.x},${point.y}`
  }).join(' ')
}

function tickLabel(value: number) {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`
  return String(Math.round(value))
}

function labelOf(muscle: Axis) {
  if (muscle === 'HAMS') return 'Hamstrings'
  if (muscle === 'CORE') return 'Abs'
  return muscle[0] + muscle.slice(1).toLowerCase()
}

export function MuscleSplit({
  points,
  title = 'Muscle split',
  subtitle = 'Sets and volume across muscle groups',
  compact = false,
}: {
  points: Point[]
  title?: string
  subtitle?: string
  compact?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const values = useMemo(() => {
    const byMuscle = new Map(points.map((row) => [row.muscle.toUpperCase(), Number(row.volume) || 0]))
    return AXES.map((muscle) => byMuscle.get(muscle) ?? 0)
  }, [points])
  const max = niceMax(Math.max(...values, 0))
  const ticks = Array.from({ length: RINGS }, (_, index) => ((index + 1) * max) / RINGS)
  const size = 400
  const cx = size / 2
  const cy = size / 2
  const icon = 40
  const radius = 118
  const data = AXES.map((_, index) => {
    const r = max === 0 ? 0 : (values[index] / max) * radius
    const point = polar(cx, cy, r, index)
    return `${point.x},${point.y}`
  }).join(' ')
  const scaleAxis = 3
  const hovered = hover != null ? AXES[hover] : null

  return (
    <div>
      {!compact && (
        <>
          <h3 className="text-lg tracking-tight">{title}</h3>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>
        </>
      )}
      <div className="relative mx-auto mt-2 w-full max-w-[380px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full overflow-visible" role="img" aria-label={title}>
          {ticks.map((tick) => (
            <polygon
              key={tick}
              points={polygon(cx, cy, (tick / max) * radius)}
              fill="none"
              stroke="var(--line)"
              strokeWidth="1"
            />
          ))}
          {AXES.map((_, index) => {
            const end = polar(cx, cy, radius, index)
            return (
              <line
                key={index}
                x1={cx}
                y1={cy}
                x2={end.x}
                y2={end.y}
                stroke="var(--line)"
                strokeWidth="1"
              />
            )
          })}
          {ticks.map((tick) => {
            const point = polar(cx, cy, (tick / max) * radius, scaleAxis)
            const outer = polar(cx, cy, radius + 10, scaleAxis)
            const dx = Math.sign(outer.x - cx) || 1
            return (
              <text
                key={`t-${tick}`}
                x={point.x + dx * 8}
                y={point.y + 4}
                fill="var(--muted)"
                fontSize="10"
                className="tabular"
              >
                {tickLabel(tick)}
              </text>
            )
          })}
          <polygon points={data} fill={FILL} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
          {AXES.map((muscle, index) => {
            const spot = polar(cx, cy, radius + 34, index)
            const active = hover === index
            return (
              <g
                key={muscle}
                transform={`translate(${spot.x - icon / 2} ${spot.y - 28})`}
                className="cursor-pointer"
                onPointerEnter={() => setHover(index)}
                onPointerLeave={() => setHover(null)}
              >
                <title>{`${labelOf(muscle)} · ${formatCompact(values[index])} kg`}</title>
                <MuscleGlyph muscle={muscle} active={active} />
              </g>
            )
          })}
        </svg>
        {hovered != null && (
          <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-xs text-[var(--muted)]">
            <span className="font-medium text-[var(--fg)]">{labelOf(hovered)}</span>
            {' · '}
            {formatCompact(values[hover ?? 0])} kg volume
          </p>
        )}
      </div>
    </div>
  )
}

function MuscleGlyph({ muscle, active }: { muscle: Axis; active: boolean }) {
  const back = ['BACK', 'TRICEPS', 'HAMS', 'CALVES', 'GLUTES'].includes(muscle)
  return (
    <svg width="40" height="56" viewBox="0 0 48 88" aria-hidden className={active ? 'opacity-100' : 'opacity-95'}>
      <Body wide={back} />
      {muscle === 'CHEST' && (
        <g fill={HIGHLIGHT}>
          <ellipse cx="19.2" cy="28.5" rx="5.2" ry="6.2" />
          <ellipse cx="28.8" cy="28.5" rx="5.2" ry="6.2" />
        </g>
      )}
      {muscle === 'SHOULDERS' && (
        <g fill={HIGHLIGHT}>
          <ellipse cx="13.2" cy="23.5" rx="5" ry="4.4" />
          <ellipse cx="34.8" cy="23.5" rx="5" ry="4.4" />
        </g>
      )}
      {muscle === 'BICEPS' && (
        <g fill={HIGHLIGHT}>
          <ellipse cx="11.4" cy="36" rx="3.4" ry="7.2" />
          <ellipse cx="36.6" cy="36" rx="3.4" ry="7.2" />
        </g>
      )}
      {muscle === 'CORE' && <ellipse cx="24" cy="39" rx="5.4" ry="8.2" fill={HIGHLIGHT} />}
      {muscle === 'QUADS' && (
        <g fill={HIGHLIGHT}>
          <ellipse cx="19.2" cy="62" rx="4.2" ry="10" />
          <ellipse cx="28.8" cy="62" rx="4.2" ry="10" />
        </g>
      )}
      {muscle === 'BACK' && <ellipse cx="24" cy="32" rx="9.4" ry="10.5" fill={HIGHLIGHT} />}
      {muscle === 'TRICEPS' && (
        <g fill={HIGHLIGHT}>
          <ellipse cx="11.2" cy="37" rx="3.2" ry="7.6" />
          <ellipse cx="36.8" cy="37" rx="3.2" ry="7.6" />
        </g>
      )}
      {muscle === 'HAMS' && (
        <g fill={HIGHLIGHT}>
          <ellipse cx="19.2" cy="63" rx="4" ry="9.4" />
          <ellipse cx="28.8" cy="63" rx="4" ry="9.4" />
        </g>
      )}
      {muscle === 'GLUTES' && (
        <g fill={HIGHLIGHT}>
          <ellipse cx="19.6" cy="51.5" rx="5" ry="4.6" />
          <ellipse cx="28.4" cy="51.5" rx="5" ry="4.6" />
        </g>
      )}
      {muscle === 'CALVES' && (
        <g fill={HIGHLIGHT}>
          <ellipse cx="18.8" cy="77" rx="3.4" ry="6.4" />
          <ellipse cx="29.2" cy="77" rx="3.4" ry="6.4" />
        </g>
      )}
    </svg>
  )
}

function Body({ wide = false }: { wide?: boolean }) {
  const torso = wide
    ? 'M14.8 20.6h18.4l-2.6 28.6H17.4z'
    : 'M16.2 20.6h15.6l-2.4 28.6H18.6z'
  return (
    <g fill="currentColor">
      <ellipse cx="24" cy="8.4" rx="6.6" ry="7.4" />
      <rect x="21.2" y="15" width="5.6" height="5.2" rx="1.6" />
      <path d={torso} />
      <path d="M16.4 22.2c-4.6 2.8-7 9.6-7.4 16.8-.2 4.2.8 8.4 2.2 10.6l3.2-1.4c-.8-2.4-1.4-6.2-1.2-10.2.4-5.6 2.2-11 5.2-13.6z" />
      <path d="M31.6 22.2c4.6 2.8 7 9.6 7.4 16.8.2 4.2-.8 8.4-2.2 10.6l-3.2-1.4c.8-2.4 1.4-6.2 1.2-10.2-.4-5.6-2.2-11-5.2-13.6z" />
      <path d="M18.8 49.2 16.6 82.4c.4 1.4 2.2 1.8 3.4.6l3-30.2z" />
      <path d="M29.2 49.2 31.4 82.4c-.4 1.4-2.2 1.8-3.4.6l-3-30.2z" />
    </g>
  )
}
