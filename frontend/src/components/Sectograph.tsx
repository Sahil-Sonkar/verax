import { useEffect, useMemo, useState } from 'react'
import { arc as d3arc } from 'd3'
import { formatClock, minutesNow } from '../lib/weekdays'
import type { RoutineBlock } from '../types'

const SIZE = 420
const CX = SIZE / 2
const CY = SIZE / 2
const INNER = 92
const OUTER = 168
const FALLBACK = '#0095f6'

type Slice = {
  id: string
  title: string
  startMin: number
  endMin: number
  startAngle: number
  endAngle: number
  color: string
}

function toAngle(minutes: number) {
  return (minutes / (24 * 60)) * Math.PI * 2
}

function point(angle: number, radius: number) {
  return {
    x: CX + Math.sin(angle) * radius,
    y: CY - Math.cos(angle) * radius,
  }
}

function segments(block: RoutineBlock, color: string): Slice[] {
  const start = block.startMin
  const end = block.endMin === 0 ? 24 * 60 : block.endMin
  const base = {
    title: block.title,
    startMin: block.startMin,
    endMin: block.endMin,
    color,
  }
  if (end > start) {
    return [{ ...base, id: block.id, startAngle: toAngle(start), endAngle: toAngle(end) }]
  }
  return [
    { ...base, id: `${block.id}-a`, startAngle: toAngle(start), endAngle: toAngle(24 * 60) },
    { ...base, id: `${block.id}-b`, startAngle: 0, endAngle: toAngle(end) },
  ]
}

export function Sectograph({
  blocks,
  activeId,
  onSelect,
  hour12 = false,
}: {
  blocks: RoutineBlock[]
  activeId?: string | null
  onSelect?: (id: string) => void
  hour12?: boolean
}) {
  const [now, setNow] = useState(minutesNow)
  const [hover, setHover] = useState<Slice | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(minutesNow()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const slices = useMemo(
    () => blocks.flatMap((block) => segments(block, block.color || FALLBACK)),
    [blocks],
  )
  const ring = useMemo(
    () =>
      d3arc<Slice>()
        .innerRadius(INNER)
        .outerRadius(OUTER)
        .startAngle((d) => d.startAngle)
        .endAngle((d) => d.endAngle)
        .padAngle(0.008)
        .cornerRadius(2),
    [],
  )
  const hand = toAngle(now)
  const handStart = point(hand, INNER)
  const handEnd = point(hand, OUTER + 6)

  return (
    <div className="sectograph">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Day as a 24-hour clock">
        <circle cx={CX} cy={CY} r={OUTER + 6} fill="none" stroke="var(--line)" />
        <circle cx={CX} cy={CY} r={INNER - 8} fill="var(--surface-2)" />
        {slices.map((slice) => {
          const dimmed = Boolean(activeId && !slice.id.startsWith(activeId))
          const lit = hover?.id === slice.id || (activeId != null && slice.id.startsWith(activeId))
          return (
            <path
              key={slice.id}
              transform={`translate(${CX} ${CY})`}
              d={ring(slice) ?? undefined}
              fill={slice.color}
              opacity={dimmed ? 0.28 : lit ? 1 : 0.88}
              className="sectograph-slice"
              onClick={() => onSelect?.(slice.id.replace(/-[ab]$/, ''))}
              onMouseEnter={() => setHover(slice)}
              onMouseLeave={() => setHover((current) => (current?.id === slice.id ? null : current))}
            >
              <title>{slice.title}</title>
            </path>
          )
        })}
        <line
          x1={handStart.x}
          y1={handStart.y}
          x2={handEnd.x}
          y2={handEnd.y}
          stroke="var(--fg)"
          strokeWidth="0.7"
          strokeLinecap="round"
          opacity="0.18"
          pointerEvents="none"
        />
        {!hover && (
          <text x={CX} y={CY - 14} textAnchor="middle" fill="var(--muted)" fontSize="11">
            now
          </text>
        )}
        <text
          x={CX}
          y={hover ? CY - 2 : CY + 8}
          textAnchor="middle"
          fill="var(--fg)"
          fontSize={hover && hover.title.length > 16 ? 13 : 15}
          fontWeight="600"
        >
          {hover ? hover.title : formatClock(now, hour12)}
        </text>
        {hover && (
          <text x={CX} y={CY + 18} textAnchor="middle" fill="var(--muted)" fontSize="11">
            {formatClock(hover.startMin, hour12)} – {formatClock(hover.endMin, hour12)}
          </text>
        )}
        <text x={CX} y={22} textAnchor="middle" fill="var(--muted)" fontSize="11">
          {hour12 ? '12' : '00'}
        </text>
        <text x={SIZE - 16} y={CY + 4} textAnchor="end" fill="var(--muted)" fontSize="11">
          {hour12 ? '6' : '06'}
        </text>
        <text x={CX} y={SIZE - 10} textAnchor="middle" fill="var(--muted)" fontSize="11">
          {hour12 ? '12' : '12'}
        </text>
        <text x={16} y={CY + 4} textAnchor="start" fill="var(--muted)" fontSize="11">
          {hour12 ? '6' : '18'}
        </text>
      </svg>
    </div>
  )
}
