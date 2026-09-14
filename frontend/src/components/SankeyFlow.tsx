import { useEffect, useId, useMemo, useRef, useState, type MouseEvent } from 'react'
import { sankey, sankeyJustify, sankeyLinkHorizontal } from 'd3-sankey'
import type { SankeyLink, SankeyNode } from 'd3-sankey'
import type { Portfolio } from '../types'
import { formatCompact, formatInr } from '../lib/format'

export type FlowChart = {
  month: string
  monthIncome: number
  nodes: { id: number; name: string; side: string }[]
  links: { source: number; target: number; value: number }[]
}

type ExtraNode = { id: number; name: string; side: string }
type ExtraLink = { value: number }
type Node = SankeyNode<ExtraNode, ExtraLink>
type Link = SankeyLink<ExtraNode, ExtraLink>

const OUT_PALETTE = ['--accent', '--brass', '--violet', '--pink', '--sage', '--sky', '--warn']

function cssVar(el: Element | null, name: string, fallback: string) {
  if (!el) return fallback
  const value = getComputedStyle(el).getPropertyValue(name).trim()
  return value || fallback
}

function nodeFill(node: ExtraNode, outIndex: number, el: Element | null) {
  if (node.side === 'IN') return cssVar(el, '--mint', '#2f6f63')
  if (node.side === 'MID') return cssVar(el, '--fg', '#1c140e')
  if (/loan/i.test(node.name)) return cssVar(el, '--danger', '#c04a34')
  if (/left|cash/i.test(node.name)) return cssVar(el, '--mint', '#2f6f63')
  const token = OUT_PALETTE[outIndex % OUT_PALETTE.length]
  return cssVar(el, token, '#3b6382')
}

function nodeIdOf(end: Link['source'] | Link['target']) {
  return typeof end === 'object' ? end.id : Number(end)
}

function shortName(name: string, max = 22) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

export function SankeyFlow({ data }: { data: FlowChart | Portfolio }) {
  const wrap = useRef<HTMLDivElement>(null)
  const uid = useId().replace(/:/g, '')
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<{
    x: number
    y: number
    title: string
    value: string
    nodeId?: number
    linkIndex?: number
  } | null>(null)
  const [themeTick, setThemeTick] = useState(0)

  const empty = data.nodes.length === 0 || data.links.length === 0

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => {
      const next = el.clientWidth
      if (next > 0) setWidth(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    const mutation = new MutationObserver(() => setThemeTick((n) => n + 1))
    mutation.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => {
      observer.disconnect()
      mutation.disconnect()
    }
  }, [empty])

  const nodeCount = Math.max(data.nodes.length, 3)
  const compact = width > 0 && width < 640
  const height = Math.max(compact ? 280 : 360, Math.min(720, 72 + nodeCount * (compact ? 28 : 38)))
  const pad = compact ? Math.round(Math.min(88, Math.max(48, width * 0.2))) : 156
  const padL = pad
  const padR = pad

  const graph = useMemo(() => {
    if (!width || empty) return null
    const links = data.links
      .filter((link) => Number.isFinite(Number(link.value)) && Number(link.value) > 0)
      .map((link) => ({ source: link.source, target: link.target, value: Number(link.value) }))
    if (links.length === 0) return null
    const used = new Set(links.flatMap((link) => [link.source, link.target]))
    const nodes = data.nodes.filter((node) => used.has(node.id)).map((node) => ({ ...node }))
    if (nodes.length === 0) return null
    const innerH = Math.max(120, height - 40)
    const perColumn = Math.max(
      1,
      nodes.filter((node) => node.side === 'OUT').length,
      nodes.filter((node) => node.side === 'IN').length,
    )
    const paddings = [18, 12, 8, 4, 2]
    for (const padding of paddings) {
      if (padding * (perColumn - 1) >= innerH - perColumn * 4) continue
      try {
        const layout = sankey<ExtraNode, ExtraLink>()
          .nodeId((node) => node.id)
          .nodeWidth(compact ? 12 : 16)
          .nodePadding(padding)
          .nodeAlign(sankeyJustify)
          .nodeSort((a, b) => (b.value ?? 0) - (a.value ?? 0))
          .linkSort((a, b) => (b.value ?? 0) - (a.value ?? 0))
          .iterations(32)
          .extent([
            [padL, 20],
            [Math.max(padL + 96, width - padR), height - 20],
          ])
        return layout({ nodes: nodes.map((node) => ({ ...node })), links: links.map((link) => ({ ...link })) })
      } catch {
        /* try a tighter padding */
      }
    }
    return null
  }, [data, width, height, empty, compact, padL, padR])

  const path = useMemo(() => sankeyLinkHorizontal<ExtraNode, ExtraLink>(), [])
  const host = wrap.current
  void themeTick

  const outIndex = useMemo(() => {
    const map = new Map<number, number>()
    let i = 0
    for (const node of data.nodes) {
      if (node.side === 'OUT') map.set(node.id, i++)
    }
    return map
  }, [data.nodes])

  function pointer(event: MouseEvent) {
    const box = wrap.current?.getBoundingClientRect()
    return { x: event.clientX - (box?.left ?? 0), y: event.clientY - (box?.top ?? 0) }
  }

  function linkActive(index: number, source: Node, target: Node) {
    if (!hover) return false
    if (hover.linkIndex === index) return true
    return hover.nodeId === source.id || hover.nodeId === target.id
  }

  function nodeActive(id: number) {
    if (!hover) return false
    if (hover.nodeId === id) return true
    if (hover.linkIndex == null || !graph) return false
    const link = graph.links[hover.linkIndex]
    return nodeIdOf(link.source) === id || nodeIdOf(link.target) === id
  }

  return (
    <div ref={wrap} className="relative w-full" style={{ minHeight: empty ? undefined : height }}>
      {empty && (
        <p className="text-sm text-[var(--muted)]">Add this month’s income and expenses in Budget to see the flow.</p>
      )}
      {graph && width > 0 && (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          role="img"
          aria-label={`Money flow, ${formatInr(data.monthIncome)} in`}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            {graph.links.map((link, index) => {
              const source = link.source as Node
              const target = link.target as Node
              return (
                <linearGradient
                  key={`${uid}-g-${index}`}
                  id={`${uid}-g-${index}`}
                  gradientUnits="userSpaceOnUse"
                  x1={source.x1 ?? 0}
                  x2={target.x0 ?? width}
                  y1="0"
                  y2="0"
                >
                  <stop offset="0%" stopColor={nodeFill(source, outIndex.get(source.id) ?? 0, host)} />
                  <stop offset="100%" stopColor={nodeFill(target, outIndex.get(target.id) ?? 0, host)} />
                </linearGradient>
              )
            })}
          </defs>
          {graph.links.map((link, index) => {
            const source = link.source as Node
            const target = link.target as Node
            const d = path(link)
            if (!d) return null
            const active = linkActive(index, source, target)
            return (
              <path
                key={`${uid}-l-${index}`}
                d={d}
                fill="none"
                stroke={`url(#${uid}-g-${index})`}
                strokeWidth={Math.max(2, link.width ?? 2)}
                strokeOpacity={!hover ? 0.45 : active ? 0.92 : 0.1}
                strokeLinecap="butt"
                className="cursor-pointer"
                style={{ transition: 'stroke-opacity 160ms ease' }}
                onMouseMove={(event) => {
                  setHover({
                    ...pointer(event),
                    title: `${source.name} → ${target.name}`,
                    value: formatInr(link.value),
                    linkIndex: index,
                  })
                }}
              />
            )
          })}
          {graph.nodes.map((node) => {
            const x0 = node.x0 ?? 0
            const x1 = node.x1 ?? 0
            const y0 = node.y0 ?? 0
            const y1 = node.y1 ?? 0
            const left = node.side === 'IN' || x0 < width / 3
            const mid = node.side === 'MID'
            const fill = nodeFill(node, outIndex.get(node.id) ?? 0, host)
            const tall = y1 - y0 >= 22
            const active = nodeActive(node.id)
            return (
              <g
                key={`${uid}-n-${node.id}`}
                opacity={!hover ? 1 : active ? 1 : 0.28}
                style={{ transition: 'opacity 160ms ease' }}
              >
                <rect
                  x={x0}
                  y={y0}
                  width={Math.max(2, x1 - x0)}
                  height={Math.max(2, y1 - y0)}
                  rx={4}
                  fill={fill}
                  className="cursor-pointer"
                  onMouseMove={(event) => {
                    setHover({
                      ...pointer(event),
                      title: node.name,
                      value: formatInr(node.value ?? 0),
                      nodeId: node.id,
                    })
                  }}
                />
                <text
                  x={mid ? (x0 + x1) / 2 : left ? x0 - 10 : x1 + 10}
                  y={(y0 + y1) / 2 - (mid && tall ? 8 : 0)}
                  textAnchor={mid ? 'middle' : left ? 'end' : 'start'}
                  dominantBaseline="middle"
                  fill="var(--fg)"
                  stroke="var(--bg)"
                  strokeWidth={mid ? 5 : 3}
                  paintOrder="stroke"
                  fontSize={compact ? 10 : 12}
                  fontWeight={500}
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {shortName(node.name, compact ? 10 : 22)}
                </text>
                {tall && (
                  <text
                    x={mid ? (x0 + x1) / 2 : left ? x0 - 10 : x1 + 10}
                    y={(y0 + y1) / 2 + (mid ? 10 : 14)}
                    textAnchor={mid ? 'middle' : left ? 'end' : 'start'}
                    fill="var(--muted)"
                    stroke="var(--bg)"
                    strokeWidth={mid ? 5 : 3}
                    paintOrder="stroke"
                    fontSize={compact ? 9 : 10}
                    className="tabular"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {formatCompact(node.value ?? 0)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      {data.links.length > 0 && !graph && width > 0 && (
        <p className="text-sm text-[var(--muted)]">Nothing to plot for this range yet.</p>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs shadow-[0_8px_24px_var(--shadow-tint)]"
          style={{ left: Math.min(hover.x + 12, Math.max(8, width - 200)), top: hover.y + 12 }}
        >
          <div className="font-medium">{hover.title}</div>
          <div className="tabular text-[var(--muted)]">{hover.value}</div>
        </div>
      )}
    </div>
  )
}
