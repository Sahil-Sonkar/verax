import { useMemo, useState } from 'react'
import { arc as d3arc, curveLinearClosed, lineRadial, scaleRadial } from 'd3'
import { categoryColor } from '../lib/colors'
import type { NamedScore } from '../types'

type Slice = {
  name: string
  percent: number
  color: string
  startAngle: number
  endAngle: number
  midAngle: number
}

const SIZE = 640
const CX = SIZE / 2
const CY = SIZE / 2
const HOLE = 36
const RADAR_INNER = 42
const RADAR_OUTER = 124
const BAR_INNER = 140
const OUTER = 202
const GAP_RATIO = 0.2

function polar(angle: number, radius: number) {
  return { x: Math.sin(angle) * radius, y: -Math.cos(angle) * radius }
}

export function CategoryBloom({
  categories,
  overall,
}: {
  categories: NamedScore[]
  overall: number
}) {
  const [active, setActive] = useState<string | null>(null)

  const slices = useMemo(() => {
    const n = Math.max(categories.length, 1)
    const slot = (Math.PI * 2) / n
    const gap = slot * GAP_RATIO
    return categories.map((category, index) => {
      const startAngle = index * slot + gap / 2
      const endAngle = (index + 1) * slot - gap / 2
      return {
        name: category.name,
        percent: Math.max(0, Math.min(100, category.percent)),
        color: categoryColor(category.name, category.color),
        startAngle,
        endAngle,
        midAngle: (startAngle + endAngle) / 2,
      }
    })
  }, [categories])

  const radarRadius = useMemo(
    () => scaleRadial().domain([0, 100]).range([RADAR_INNER, RADAR_OUTER]).clamp(true),
    [],
  )
  const barRadius = useMemo(
    () => scaleRadial().domain([0, 100]).range([BAR_INNER, OUTER]).clamp(true),
    [],
  )

  const radarLine = useMemo(
    () =>
      lineRadial<Slice>()
        .angle((d) => d.midAngle)
        .radius((d) => radarRadius(d.percent))
        .curve(curveLinearClosed),
    [radarRadius],
  )

  const bar = useMemo(
    () =>
      d3arc<Slice>()
        .innerRadius(BAR_INNER)
        .outerRadius((d) => Math.max(BAR_INNER, barRadius(d.percent)))
        .startAngle((d) => d.startAngle)
        .endAngle((d) => d.endAngle)
        .cornerRadius(0),
    [barRadius],
  )

  const track = useMemo(
    () =>
      d3arc<Slice>()
        .innerRadius(BAR_INNER)
        .outerRadius(OUTER)
        .startAngle((d) => d.startAngle)
        .endAngle((d) => d.endAngle)
        .cornerRadius(0),
    [],
  )

  const focus = slices.find((slice) => slice.name === active)
  const centerValue = focus?.percent ?? overall
  const centerLabel = focus?.name ?? 'overall'
  const ticks = [25, 50, 75, 100]
  const radarPath = slices.length >= 3 ? radarLine(slices) : null

  return (
    <div className="mx-auto max-w-xl">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full"
        role="img"
        aria-label={
          focus
            ? `${focus.name} ${focus.percent} percent`
            : `Category radar and circular bars. Overall ${overall} percent. ${slices
                .map((slice) => `${slice.name} ${slice.percent}%`)
                .join('. ')}`
        }
        onMouseLeave={() => setActive(null)}
      >
        <g transform={`translate(${CX} ${CY})`}>
          {ticks.map((tick) => {
            const web = radarLine(slices.map((slice) => ({ ...slice, percent: tick })))
            return web ? (
              <path
                key={`web-${tick}`}
                d={web}
                fill="none"
                stroke="currentColor"
                strokeOpacity={tick === 100 ? 0.2 : 0.08}
              />
            ) : null
          })}
          {slices.map((slice) => {
            const inner = polar(slice.midAngle, RADAR_INNER)
            const outer = polar(slice.midAngle, RADAR_OUTER)
            return (
              <line
                key={`spoke-${slice.name}`}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="currentColor"
                strokeOpacity={0.1}
              />
            )
          })}
          {ticks
            .filter((tick) => tick === 50 || tick === 100)
            .map((tick) => (
              <text
                key={`tick-${tick}`}
                x={4}
                y={-radarRadius(tick) + 3}
                fill="var(--muted)"
                fontSize="9"
                fontFamily="JetBrains Mono, ui-monospace, monospace"
              >
                {tick}
              </text>
            ))}

          {radarPath && (
            <path
              d={radarPath}
              fill="color-mix(in srgb, var(--sky) 38%, transparent)"
              stroke="var(--sky)"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          )}
          {slices.map((slice) => {
            const point = polar(slice.midAngle, radarRadius(slice.percent))
            const dimmed = Boolean(active) && active !== slice.name
            return (
              <circle
                key={`dot-${slice.name}`}
                cx={point.x}
                cy={point.y}
                r={active === slice.name ? 6 : 4}
                fill={slice.color}
                opacity={dimmed ? 0.28 : 1}
                stroke="color-mix(in srgb, var(--bg) 55%, transparent)"
                strokeWidth={1.5}
                className="cursor-pointer"
                onMouseEnter={() => setActive(slice.name)}
              />
            )
          })}

          {slices.map((slice) => {
            const dimmed = Boolean(active) && active !== slice.name
            const flipped = slice.midAngle > Math.PI / 2 && slice.midAngle < Math.PI * 1.5
            const trackPath = track(slice)
            const barPath = slice.percent > 0 ? bar(slice) : null
            return (
              <g
                key={slice.name}
                opacity={dimmed ? 0.28 : 1}
                style={{ transition: 'opacity 180ms ease' }}
                tabIndex={0}
                onMouseEnter={() => setActive(slice.name)}
                onFocus={() => setActive(slice.name)}
                onBlur={() => setActive((current) => (current === slice.name ? null : current))}
                className="cursor-pointer outline-none"
              >
                {trackPath && <path d={trackPath} fill={slice.color} opacity={0.22} />}
                {barPath && (
                  <path d={barPath} fill={slice.color}>
                    <title>
                      {slice.name}: {slice.percent}%
                    </title>
                  </path>
                )}
                <g transform={`rotate(${(slice.midAngle * 180) / Math.PI - 90}) translate(${OUTER + 18} 0)`}>
                  <text
                    transform={flipped ? 'rotate(180)' : undefined}
                    textAnchor={flipped ? 'end' : 'start'}
                    dominantBaseline="middle"
                    fill="currentColor"
                    fontSize="12"
                  >
                    {slice.name}
                    <tspan fill="var(--muted)" dx="6" fontFamily="JetBrains Mono, ui-monospace, monospace">
                      {slice.percent}
                    </tspan>
                  </text>
                </g>
              </g>
            )
          })}

          <circle
            r={HOLE}
            fill="color-mix(in srgb, var(--bg) 78%, transparent)"
            stroke="color-mix(in srgb, var(--fg) 16%, transparent)"
          />
          <text
            y={-5}
            textAnchor="middle"
            fill="currentColor"
            fontSize="22"
            fontFamily="JetBrains Mono, ui-monospace, monospace"
          >
            {centerValue}%
          </text>
          <text y={14} textAnchor="middle" fill="var(--muted)" fontSize="10">
            {centerLabel}
          </text>
        </g>
      </svg>
    </div>
  )
}
