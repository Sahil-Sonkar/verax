import { useMemo, useState } from 'react'
import { formatCompact } from '../lib/format'
import back from '../assets/muscles/back.webp'
import biceps from '../assets/muscles/biceps.webp'
import calves from '../assets/muscles/calves.webp'
import chest from '../assets/muscles/chest.webp'
import core from '../assets/muscles/core.webp'
import glutes from '../assets/muscles/glutes.webp'
import hams from '../assets/muscles/hams.webp'
import quads from '../assets/muscles/quads.webp'
import shoulders from '../assets/muscles/shoulders.webp'
import triceps from '../assets/muscles/triceps.webp'

const AXES = ['CHEST', 'SHOULDERS', 'BICEPS', 'BACK', 'TRICEPS', 'CORE', 'QUADS', 'HAMS', 'CALVES', 'GLUTES'] as const
const STROKE = 'var(--accent)'
const FILL = 'color-mix(in srgb, var(--accent) 28%, transparent)'
const RINGS = 4

type Axis = (typeof AXES)[number]
type Point = { muscle: string; volume: number; sessions?: number }

const MUSCLE_IMG: Record<Axis, string> = {
  CHEST: chest,
  SHOULDERS: shoulders,
  BICEPS: biceps,
  BACK: back,
  TRICEPS: triceps,
  CORE: core,
  QUADS: quads,
  HAMS: hams,
  CALVES: calves,
  GLUTES: glutes,
}

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
  const size = compact ? 400 : 520
  const cx = size / 2
  const cy = size / 2
  const radius = compact ? 96 : 118
  const icon = compact ? 52 : 68
  const orbit = radius + (compact ? 44 : 58)
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
      <div className="relative mx-auto mt-2 w-full max-w-[20rem] lg:max-w-[440px]">
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
            const spot = polar(cx, cy, orbit, index)
            const active = hover === index
            const imgH = icon * 1.7
            return (
              <g
                key={muscle}
                className="cursor-pointer"
                onPointerEnter={() => setHover(index)}
                onPointerLeave={() => setHover(null)}
              >
                <title>{`${labelOf(muscle)} · ${formatCompact(values[index])} kg`}</title>
                <rect
                  x={spot.x - 22}
                  y={spot.y - imgH / 2 - 8}
                  width="44"
                  height={imgH + 22}
                  fill="transparent"
                />
                <image
                  href={MUSCLE_IMG[muscle]}
                  x={spot.x - icon / 2}
                  y={spot.y - imgH / 2 - 6}
                  width={icon}
                  height={imgH}
                  opacity={active ? 1 : 0.92}
                />
                <text
                  x={spot.x}
                  y={spot.y + imgH / 2 + 6}
                  textAnchor="middle"
                  fill={active ? 'var(--fg)' : 'var(--muted)'}
                  fontSize="10"
                  fontWeight={active ? 600 : 400}
                >
                  {labelOf(muscle)}
                </text>
              </g>
            )
          })}
        </svg>
        <p className="mt-1 min-h-4 text-center text-xs text-[var(--muted)]">
          {hovered != null ? (
            <>
              <span className="font-medium text-[var(--fg)]">{labelOf(hovered)}</span>
              {' · '}
              {formatCompact(values[hover ?? 0])} kg volume
            </>
          ) : (
            '\u00a0'
          )}
        </p>
      </div>
    </div>
  )
}
