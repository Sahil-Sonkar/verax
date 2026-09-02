import { Fragment, useId, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../lib/api'
import { formatCompact, formatInr, formatMoney, formatSigned, parseAmount } from '../lib/format'
import { Dialog, PrimaryButton } from '../components/Dialog'
import { AddButton, TrashButton } from '../components/IconButtons'
import { SankeyFlow, type FlowChart } from '../components/SankeyFlow'
import type { Holding, MonthTotal, Workbook, WorkbookItem } from '../types'

const KINDS = [
  'IN_STOCK',
  'US_STOCK',
  'MUTUAL_FUND',
  'EPF',
  'PPF',
  'COMMODITY',
  'CRYPTO',
  'FD',
  'OTHER',
]
const LINE_KINDS = ['EXPENSE', 'INCOME', 'BUFFER', 'GOAL']
const INVEST_COLS = [
  'Ticker',
  'LTP',
  'Day Change',
  'Avg. Buy',
  'Qty.',
  'Last Close',
  'Buy Value',
  'Current Value',
  'Portfolio Weight',
  'P&L',
  'P&L (%)',
  'Market Cap',
  'P/E Ratio',
  'Volume',
] as const
const KIND_CATEGORY: Record<string, string> = {
  IN_STOCK: 'Stocks',
  US_STOCK: 'Stocks',
  EQUITY: 'Stocks',
  MUTUAL_FUND: 'Mutual funds',
  COMMODITY: 'Commodity',
  GOLD: 'Commodity',
  SILVER: 'Commodity',
  CRYPTO: 'Crypto',
  EPF: 'EPF',
  PPF: 'PPF',
  FD: 'FD',
}
const CATEGORY_COLORS: Record<string, string> = {
  Stocks: '#3d7ec9',
  'Mutual funds': '#7a5ea8',
  Commodity: '#c4923a',
  Crypto: '#c45b72',
  EPF: '#3d8b5c',
  PPF: '#5b9bd6',
  FD: '#6f6e6a',
  Other: '#9c9a94',
}
const SLICE_PALETTE = ['#3d7ec9', '#c94b52', '#c4923a', '#5b9bd6', '#7a5ea8', '#3d8b5c', '#c45b72', '#4a8f5c', '#6f6e6a', '#d4ae6a']
const CHART_TOOLTIP = {
  background: 'color-mix(in srgb, var(--surface) 94%, transparent)',
  border: '0.5px solid var(--line)',
  borderRadius: 8,
  color: 'var(--fg)',
  fontSize: 12,
}
const CHART_TICK = { fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }

function monthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, 1)
  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(date).replace(' ', '-')
}

function sameAmount(left: number | null | undefined, right: number | null) {
  if (left == null && right == null) return true
  if (left == null || right == null) return false
  return Number(left) === right
}

function isLoanCategory(name: string) {
  return /loan/i.test(name)
}

function rowTone(kind: string, category: string) {
  if (kind === 'INCOME' || /^income$/i.test(category)) return 'budget-income'
  if (isLoanCategory(category)) return 'budget-loan'
  return ''
}

function groupItems(rows: WorkbookItem[]) {
  const groups: { key: string; category: string; items: WorkbookItem[] }[] = []
  const seen = new Map<string, number>()
  for (const item of rows) {
    const key = item.category || item.name
    const index = seen.get(key)
    if (index == null) {
      seen.set(key, groups.length)
      groups.push({ key, category: item.category || item.name, items: [item] })
    } else {
      groups[index].items.push(item)
    }
  }
  return groups
}

function groupMonthSum(items: WorkbookItem[], month: string) {
  let sum = 0
  let any = false
  for (const item of items) {
    const value = item.amounts[month]
    if (value == null) continue
    any = true
    sum += Number(value)
  }
  return any ? sum : null
}

function nextMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, month, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

type FlowGrain = 'month' | 'quarter' | 'year'

const FLOW_GRAINS: { id: FlowGrain; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
]

function periodKey(yearMonth: string, grain: FlowGrain) {
  const [, month] = yearMonth.split('-').map(Number)
  const year = yearMonth.slice(0, 4)
  if (grain === 'year') return year
  if (grain === 'quarter') return `${year}-Q${Math.ceil((month ?? 1) / 3)}`
  return yearMonth
}

function periodLabel(key: string, grain: FlowGrain) {
  if (grain === 'year') return key
  if (grain === 'quarter') {
    const [year, quarter] = key.split('-Q')
    return `Q${quarter} ${year}`
  }
  return monthLabel(key)
}

function flowPeriods(months: string[], grain: FlowGrain) {
  const groups = new Map<string, string[]>()
  for (const month of months) {
    const key = periodKey(month, grain)
    const list = groups.get(key)
    if (list) list.push(month)
    else groups.set(key, [month])
  }
  return [...groups.entries()].map(([key, bucket]) => ({
    key,
    label: periodLabel(key, grain),
    months: bucket,
  }))
}

function workbookFlow(items: WorkbookItem[], months: string[], label?: string): FlowChart {
  const sources = new Map<string, number>()
  const sinks = new Map<string, number>()
  let income = 0
  let expenses = 0
  for (const item of items) {
    let sum = 0
    for (const month of months) {
      const value = item.amounts[month]
      if (value != null) sum += Number(value)
    }
    if (sum <= 0) continue
    if (item.kind === 'INCOME') {
      income += sum
      sources.set(item.name, (sources.get(item.name) ?? 0) + sum)
    } else {
      expenses += sum
      const label = item.category || item.name
      sinks.set(label, (sinks.get(label) ?? 0) + sum)
    }
  }
  const leftover = income - expenses
  if (leftover > 0) sinks.set('Left in range', leftover)
  else if (leftover < 0) sources.set('Drawn from cash', -leftover)

  const nodes: FlowChart['nodes'] = []
  const links: FlowChart['links'] = []
  let index = 0
  const sourceIndex = new Map<string, number>()
  for (const name of sources.keys()) {
    sourceIndex.set(name, index)
    nodes.push({ id: index++, name, side: 'IN' })
  }
  const mid = index
  const range =
    label ||
    (months.length === 0
      ? 'Range'
      : months.length === 1
        ? monthLabel(months[0])
        : `${monthLabel(months[0])} – ${monthLabel(months[months.length - 1])}`)
  nodes.push({ id: mid, name: range, side: 'MID' })
  index++
  const sinkIndex = new Map<string, number>()
  for (const name of sinks.keys()) {
    sinkIndex.set(name, index)
    nodes.push({ id: index++, name, side: 'OUT' })
  }
  for (const [name, value] of sources) {
    links.push({ source: sourceIndex.get(name)!, target: mid, value })
  }
  for (const [name, value] of sinks) {
    links.push({ source: mid, target: sinkIndex.get(name)!, value })
  }
  return { month: range, monthIncome: income, nodes, links }
}

function cellClass(extra = '') {
  return `h-9 w-full min-w-[8.5rem] border-0 bg-transparent px-2 text-right tabular text-sm outline-none focus:bg-[var(--surface-2)] ${extra}`
}

function labelCell(extra = '') {
  return `h-8 w-full min-w-0 border-0 bg-transparent px-1 text-left text-sm outline-none focus:bg-[var(--surface-2)] ${extra}`
}

function investCell(extra = '') {
  return `h-8 w-full min-w-[5.75rem] border-0 bg-transparent px-2 text-right tabular text-xs outline-none focus:bg-[var(--surface-2)] ${extra}`
}

export function InvestmentsPage({ section = 'all' }: { section?: 'all' | 'invest' | 'budget' }) {
  const queryClient = useQueryClient()
  const year = new Date().getFullYear()
  const [from, setFrom] = useState(`${year}-01`)
  const [to, setTo] = useState(`${year}-12`)
  const holdings = useQuery({
    queryKey: ['holdings'],
    queryFn: () => api<Holding[]>('/api/finance/holdings'),
    refetchInterval: 60_000,
  })
  const workbook = useQuery({
    queryKey: ['workbook', from, to],
    queryFn: () => api<Workbook>(`/api/finance/workbook?from=${from}&to=${to}`),
  })
  const [open, setOpen] = useState(false)
  const [addLine, setAddLine] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState('IN_STOCK')
  const [ticker, setTicker] = useState('')
  const [qty, setQty] = useState('')
  const [avgBuy, setAvgBuy] = useState('')
  const [lineCategory, setLineCategory] = useState('')
  const [lineName, setLineName] = useState('')
  const [lineKind, setLineKind] = useState('EXPENSE')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [holdingDrafts, setHoldingDrafts] = useState<Record<string, string>>({})
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({})
  const [flowGrain, setFlowGrain] = useState<FlowGrain>('month')
  const [flowAnchor, setFlowAnchor] = useState<string | null>(null)

  const total = holdings.data?.reduce((sum, row) => sum + Number(row.currentValueInr ?? row.currentValue ?? row.amount), 0) ?? 0
  const holdingSlices = useMemo(() => {
    const rows = (holdings.data ?? [])
      .map((row, index) => {
        const value = Number(row.sliceValueInr ?? row.currentValueInr ?? row.currentValue ?? row.amount ?? 0)
        return {
          name: row.ticker || row.name,
          value,
          color: SLICE_PALETTE[index % SLICE_PALETTE.length],
        }
      })
      .filter((row) => row.value > 0)
    return rows
  }, [holdings.data])
  const categorySlices = useMemo(() => {
    const grouped = new Map<string, number>()
    for (const row of holdings.data ?? []) {
      const value = Number(row.sliceValueInr ?? row.currentValueInr ?? row.currentValue ?? row.amount ?? 0)
      if (value <= 0) continue
      const label = KIND_CATEGORY[row.kind] ?? 'Other'
      grouped.set(label, (grouped.get(label) ?? 0) + value)
    }
    return [...grouped.entries()].map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] ?? CATEGORY_COLORS.Other,
    }))
  }, [holdings.data])
  const months = workbook.data?.months ?? []
  const items = workbook.data?.items ?? []
  const totals = workbook.data?.totals ?? {}
  const categories = useMemo(() => [...new Set(items.map((item) => item.category).filter(Boolean))], [items])
  const ledger = items.filter((item) => item.kind !== 'INCOME')
  const income = items.filter((item) => item.kind === 'INCOME')
  const ledgerGroups = useMemo(() => groupItems(ledger), [ledger])
  const incomeGroups = useMemo(() => groupItems(income), [income])
  const flowBuckets = useMemo(() => flowPeriods(months, flowGrain), [months, flowGrain])
  const flowMonth = months.includes(flowAnchor ?? '') ? flowAnchor! : (months.at(-1) ?? '')
  const activeFlow = flowBuckets.find((bucket) => bucket.months.includes(flowMonth)) ?? flowBuckets.at(-1)
  const budgetFlow = useMemo(
    () => workbookFlow(items, activeFlow?.months ?? [], activeFlow?.label),
    [items, activeFlow],
  )

  async function saveCell(item: WorkbookItem, month: string, raw: string) {
    const next = parseAmount(raw)
    if (next == null && raw.trim() !== '') return
    if (sameAmount(item.amounts[month], next)) {
      setDrafts((current) => {
        const copy = { ...current }
        delete copy[`${item.id}:${month}`]
        return copy
      })
      return
    }
    await api('/api/finance/workbook/cell', {
      method: 'PATCH',
      body: JSON.stringify({ itemId: item.id, month, amount: next }),
    })
    setDrafts((current) => {
      const copy = { ...current }
      delete copy[`${item.id}:${month}`]
      return copy
    })
    await queryClient.invalidateQueries({ queryKey: ['workbook'] })
  }

  function cellValue(item: WorkbookItem, month: string) {
    const key = `${item.id}:${month}`
    if (key in drafts) return drafts[key]
    const value = item.amounts[month]
    return value == null ? '' : String(value)
  }

  function draftOr(key: string, fallback: string) {
    return key in drafts ? drafts[key] : fallback
  }

  async function refreshWorkbook() {
    await queryClient.invalidateQueries({ queryKey: ['workbook'] })
    void queryClient.invalidateQueries({ queryKey: ['fin-portfolio'] })
  }

  async function saveItem(item: WorkbookItem, body: { name?: string; category?: string; kind?: string }) {
    await api(`/api/finance/workbook/items/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    await refreshWorkbook()
  }

  async function saveName(item: WorkbookItem, raw: string) {
    const name = raw.trim()
    if (!name || name === item.name) {
      setDrafts((current) => {
        const copy = { ...current }
        delete copy[`name:${item.id}`]
        return copy
      })
      return
    }
    await saveItem(item, { name })
    setDrafts((current) => {
      const copy = { ...current }
      delete copy[`name:${item.id}`]
      return copy
    })
  }

  async function saveKind(item: WorkbookItem, kind: string) {
    if (kind === item.kind) return
    await saveItem(item, { kind })
  }

  async function saveCategory(from: string, raw: string) {
    const to = raw.trim()
    if (!to || to === from) {
      setDrafts((current) => {
        const copy = { ...current }
        delete copy[`cat:${from}`]
        return copy
      })
      return
    }
    await api('/api/finance/workbook/category', {
      method: 'PATCH',
      body: JSON.stringify({ from, to }),
    })
    setOpenCats((current) => {
      const next = { ...current }
      if (from in next) {
        next[to] = next[from]
        delete next[from]
      }
      return next
    })
    setDrafts((current) => {
      const copy = { ...current }
      delete copy[`cat:${from}`]
      return copy
    })
    await refreshWorkbook()
  }

  function holdingValue(row: Holding, field: 'ticker' | 'qty' | 'avgBuy') {
    const key = `${row.id}:${field}`
    if (key in holdingDrafts) return holdingDrafts[key]
    if (field === 'ticker') return row.ticker || row.name || ''
    if (field === 'qty') return Number(row.quantity) ? String(row.quantity) : ''
    return Number(row.avgBuy) ? String(row.avgBuy) : ''
  }

  function setHoldingDraft(id: string, field: string, value: string) {
    setHoldingDrafts((current) => ({ ...current, [`${id}:${field}`]: value }))
  }

  function clearHoldingDraft(id: string, field: string) {
    setHoldingDrafts((current) => {
      const copy = { ...current }
      delete copy[`${id}:${field}`]
      return copy
    })
  }

  async function patchHolding(row: Holding, body: Record<string, unknown>) {
    await api(`/api/finance/holdings/${row.id}`, { method: 'PATCH', body: JSON.stringify(body) })
    void queryClient.invalidateQueries({ queryKey: ['holdings'] })
    void queryClient.invalidateQueries({ queryKey: ['fin-portfolio'] })
  }

  async function saveHoldingTicker(row: Holding, raw: string) {
    const symbol = raw.trim().toUpperCase()
    if (!symbol || symbol === (row.ticker || row.name)) {
      clearHoldingDraft(row.id, 'ticker')
      return
    }
    await patchHolding(row, {
      ticker: symbol,
      name: !row.name || row.name === row.ticker ? symbol : row.name,
    })
    clearHoldingDraft(row.id, 'ticker')
  }

  async function saveHoldingNumber(row: Holding, field: 'quantity' | 'avgBuy', raw: string) {
    const draftKey = field === 'quantity' ? 'qty' : 'avgBuy'
    const next = parseAmount(raw)
    if (next == null && raw.trim() !== '') return
    const current = field === 'quantity' ? Number(row.quantity ?? 0) : Number(row.avgBuy ?? 0)
    if ((next ?? 0) === current) {
      clearHoldingDraft(row.id, draftKey)
      return
    }
    await patchHolding(row, { [field]: next ?? 0 })
    clearHoldingDraft(row.id, draftKey)
  }

  function toggleCat(key: string) {
    setOpenCats((current) => ({ ...current, [key]: !current[key] }))
  }

  function renderRow(item: WorkbookItem, indent = false) {
    const tone = rowTone(item.kind, item.category)
    return (
      <tr key={item.id} className={`group border-b border-[var(--line)] ${tone}`}>
        <td className="sticky left-0 z-10 w-40 min-w-40 px-2 py-1 text-[var(--muted)]">
          {indent ? (
            ''
          ) : (
            <input
              className={labelCell('text-[var(--muted)]')}
              value={draftOr(`cat:${item.category}`, item.category)}
              aria-label="Category"
              onChange={(event) => setDrafts((current) => ({ ...current, [`cat:${item.category}`]: event.target.value }))}
              onBlur={(event) => void saveCategory(item.category, event.target.value)}
            />
          )}
        </td>
        <td className="sticky left-40 z-10 w-52 min-w-52 px-1 py-0.5">
          <input
            className={labelCell('font-medium')}
            value={draftOr(`name:${item.id}`, item.name)}
            aria-label="Name"
            onChange={(event) => setDrafts((current) => ({ ...current, [`name:${item.id}`]: event.target.value }))}
            onBlur={(event) => void saveName(item, event.target.value)}
          />
          <select
            className={labelCell('h-6 text-[10px] text-[var(--muted)]')}
            value={item.kind}
            aria-label={`Kind for ${item.name}`}
            onChange={(event) => void saveKind(item, event.target.value)}
          >
            {LINE_KINDS.map((option) => (
              <option key={option} value={option}>
                {option.toLowerCase()}
              </option>
            ))}
          </select>
        </td>
        {months.map((month) => (
          <td key={month} className="px-1 py-0.5">
            <input
              className={cellClass()}
              inputMode="decimal"
              value={cellValue(item, month)}
              onChange={(event) => setDrafts((current) => ({ ...current, [`${item.id}:${month}`]: event.target.value }))}
              onBlur={(event) => void saveCell(item, month, event.target.value)}
            />
          </td>
        ))}
        <td className="px-1 py-1 text-right">
          <TrashButton
            label={`Delete ${item.name}`}
            onClick={async () => {
              await api(`/api/finance/workbook/items/${item.id}`, { method: 'DELETE' })
              void queryClient.invalidateQueries({ queryKey: ['workbook'] })
            }}
          />
        </td>
      </tr>
    )
  }

  function renderGroups(groups: { key: string; category: string; items: WorkbookItem[] }[]) {
    return groups.map((group) => {
      const open = openCats[group.key] === true
      const kind = group.items[0]?.kind ?? 'EXPENSE'
      const tone = rowTone(kind, group.category)
      const Chevron = open ? ChevronDown : ChevronRight
      return (
        <Fragment key={group.key}>
          <tr className={`border-b border-[var(--line)] ${tone}`}>
            <td className="sticky left-0 z-10 w-40 min-w-40 px-1 py-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="grid size-6 shrink-0 place-items-center"
                  aria-expanded={open}
                  aria-label={open ? `Collapse ${group.category}` : `Expand ${group.category}`}
                  onClick={() => toggleCat(group.key)}
                >
                  <Chevron size={14} strokeWidth={2} aria-hidden="true" />
                </button>
                <input
                  className={labelCell('font-medium')}
                  value={draftOr(`cat:${group.key}`, group.category)}
                  aria-label="Category"
                  onChange={(event) => setDrafts((current) => ({ ...current, [`cat:${group.key}`]: event.target.value }))}
                  onBlur={(event) => void saveCategory(group.category, event.target.value)}
                />
              </div>
            </td>
            <td className="sticky left-40 z-10 w-52 min-w-52 px-3 py-1 text-[11px] text-[var(--muted)]">
              {group.items.length} {group.items.length === 1 ? 'line' : 'lines'}
            </td>
            {months.map((month) => (
              <td key={month} className="px-3 py-2 text-right tabular font-medium">
                {formatInr(groupMonthSum(group.items, month), '')}
              </td>
            ))}
            <td />
          </tr>
          {open && group.items.map((item) => renderRow(item, true))}
        </Fragment>
      )
    })
  }

  function summaryRow(label: string, values: Array<number | null | undefined>, colorizeBalance = false) {
    return (
      <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] font-medium">
        <td className="sticky left-0 z-10 bg-[var(--surface-2)] px-3 py-2" colSpan={2}>
          {label}
        </td>
        {values.map((value, index) => {
          const tone = colorizeBalance
            ? (value ?? 0) >= 0
              ? 'text-[var(--mint)]'
              : 'text-[var(--danger)]'
            : ''
          return (
            <td key={months[index] ?? index} className={`px-3 py-2 text-right tabular ${tone}`}>
              {formatInr(value ?? null, '')}
            </td>
          )
        })}
        <td />
      </tr>
    )
  }

  const showInvest = section !== 'budget'
  const showBudget = section !== 'invest'

  return (
    <div className="space-y-10">
      {section === 'all' && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl tracking-tight">Invest</h1>
            <p className="mt-2 max-w-[65ch] text-sm text-[var(--muted)]">
              Monthly workbook in the same shape as your spreadsheet. Blank stays blank. Zero stays zero.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AddButton label="Add line" onClick={() => setAddLine(true)} />
            <AddButton label="Add holding" variant="primary" onClick={() => setOpen(true)} />
          </div>
        </div>
      )}
      {section !== 'all' && (
        <div className="flex flex-wrap justify-end gap-2">
          {showBudget && (
            <AddButton label="Add line" onClick={() => setAddLine(true)} />
          )}
          {showInvest && <AddButton label="Add holding" variant="primary" onClick={() => setOpen(true)} />}
        </div>
      )}

      {showInvest && (
        <div className="panel">
          <section className="card overflow-hidden p-0">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] px-6 py-4">
              <div>
                <div className="kicker">Portfolio</div>
                <div className="mt-2 text-4xl tracking-tight tabular">{formatInr(total)}</div>
                <p className="mt-1 max-w-[58ch] text-xs leading-relaxed text-[var(--muted)]">
                  Edit ticker, kind, qty, and avg buy on the row. Live prices stay on the quote columns.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[88rem] text-xs">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
                {INVEST_COLS.map((label) => (
                  <th key={label} className="whitespace-nowrap px-3 py-3 font-medium">
                    {label}
                  </th>
                ))}
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {holdings.data?.length === 0 && (
                <tr>
                  <td colSpan={INVEST_COLS.length + 1} className="px-3 py-6 text-sm text-[var(--muted)]">
                    No holdings yet. Add a ticker to pull live prices.
                  </td>
                </tr>
              )}
              {holdings.data?.map((row) => {
                const quote = row.quote
                const currency = row.currency || quote?.currency || 'INR'
                const pnlTone = Number(row.pnl ?? 0) > 0 ? 'text-[var(--mint)]' : Number(row.pnl ?? 0) < 0 ? 'text-[var(--danger)]' : ''
                const day = quote?.dayChange
                const dayPct = quote?.dayChangePct
                const dayTone = Number(day ?? 0) > 0 ? 'text-[var(--mint)]' : Number(day ?? 0) < 0 ? 'text-[var(--danger)]' : ''
                return (
                  <tr key={row.id} className="border-b border-[var(--line)]">
                    <td className="sticky left-0 z-10 bg-[var(--surface)] px-1 py-1 whitespace-nowrap">
                      <input
                        className={investCell('min-w-[7rem] text-left font-medium')}
                        value={holdingValue(row, 'ticker')}
                        aria-label={`Ticker for ${row.ticker || row.name}`}
                        onChange={(event) => setHoldingDraft(row.id, 'ticker', event.target.value)}
                        onBlur={(event) => void saveHoldingTicker(row, event.target.value)}
                      />
                      <select
                        className={investCell('min-w-[7rem] text-left text-[10px] text-[var(--muted)]')}
                        value={row.kind}
                        aria-label={`Kind for ${row.ticker || row.name}`}
                        onChange={(event) => void patchHolding(row, { kind: event.target.value })}
                      >
                        {KINDS.includes(row.kind) ? null : (
                          <option value={row.kind}>{row.kind.toLowerCase().replaceAll('_', ' ')}</option>
                        )}
                        {KINDS.map((option) => (
                          <option key={option} value={option}>
                            {option === 'COMMODITY' ? 'commodity' : option.toLowerCase().replaceAll('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right tabular whitespace-nowrap">{formatMoney(quote?.ltp, currency)}</td>
                    <td className={`px-3 py-2 text-right tabular whitespace-nowrap ${dayTone}`}>
                      {day == null ? '—' : `${formatSigned(day)} (${formatSigned(dayPct, 2)}%)`}
                    </td>
                    <td className="px-1 py-0.5">
                      <input
                        className={investCell()}
                        inputMode="decimal"
                        value={holdingValue(row, 'avgBuy')}
                        placeholder="—"
                        aria-label={`Avg buy for ${row.ticker || row.name}`}
                        onChange={(event) => setHoldingDraft(row.id, 'avgBuy', event.target.value)}
                        onBlur={(event) => void saveHoldingNumber(row, 'avgBuy', event.target.value)}
                      />
                    </td>
                    <td className="px-1 py-0.5">
                      <input
                        className={investCell()}
                        inputMode="decimal"
                        value={holdingValue(row, 'qty')}
                        placeholder="—"
                        aria-label={`Quantity for ${row.ticker || row.name}`}
                        onChange={(event) => setHoldingDraft(row.id, 'qty', event.target.value)}
                        onBlur={(event) => void saveHoldingNumber(row, 'quantity', event.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 text-right tabular whitespace-nowrap">{formatMoney(quote?.lastClose, currency)}</td>
                    <td className="px-3 py-2 text-right tabular whitespace-nowrap">
                      {Number(row.buyValue ?? row.amount) ? formatMoney(row.buyValue ?? row.amount, currency) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular whitespace-nowrap">
                      {Number(row.quantity) ? formatMoney(row.currentValue, currency) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular whitespace-nowrap">
                      {Number(row.quantity) && row.weight != null ? `${Number(row.weight).toFixed(2)}%` : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right tabular whitespace-nowrap ${pnlTone}`}>
                      {Number(row.quantity) ? formatMoney(row.pnl, currency) : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right tabular whitespace-nowrap ${pnlTone}`}>
                      {Number(row.quantity) && row.pnlPct != null ? `${formatSigned(row.pnlPct)}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular whitespace-nowrap">
                      {quote?.marketCapLabel || formatCompact(quote?.marketCap)}
                    </td>
                    <td className="px-3 py-2 text-right tabular whitespace-nowrap">
                      {quote?.peRatio == null ? '—' : Number(quote.peRatio).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular whitespace-nowrap">
                      {quote?.volumeLabel || formatCompact(quote?.volume)}
                    </td>
                    <td className="px-2 py-2">
                      <TrashButton
                        label={`Delete ${row.ticker || row.name}`}
                        onClick={async () => {
                          await api(`/api/finance/holdings/${row.id}`, { method: 'DELETE' })
                          void queryClient.invalidateQueries({ queryKey: ['holdings'] })
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
            </div>
          </section>
        </div>
      )}

      {showInvest && (
        <div className="panel">
          <section className="card p-6">
            <h2 className="text-2xl tracking-tight">Distribution</h2>
            <p className="mt-1 max-w-[58ch] text-sm leading-relaxed text-[var(--muted)]">
              Watchlist names use a one-share mark so the pies have shape before you add qty.
            </p>
            {holdingSlices.length === 0 ? (
              <p className="mt-6 text-sm text-[var(--muted)]">Add a holding to see the split.</p>
            ) : (
              <div className="mt-4 grid gap-8 lg:grid-cols-2">
                <InvestPie title="By holding" slices={holdingSlices} />
                <InvestPie title="By category" slices={categorySlices} />
              </div>
            )}
          </section>
        </div>
      )}

      {showBudget && (
        <div className="panel">
          <section className="card overflow-hidden p-0">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] px-6 py-4">
              <h2 className="text-2xl tracking-tight">Budget</h2>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-2 text-[var(--muted)]">
                  From
                  <input className="field w-auto py-1.5" type="month" value={from} onChange={(event) => setFrom(event.target.value)} />
                </label>
                <label className="flex items-center gap-2 text-[var(--muted)]">
                  To
                  <input className="field w-auto py-1.5" type="month" value={to} onChange={(event) => setTo(event.target.value)} />
                </label>
                <button type="button" className="glass-btn px-3 py-1.5 text-sm" onClick={() => setTo(nextMonth(to))}>
                  Add month
                </button>
              </div>
            </div>
            {workbook.isLoading && <p className="px-6 py-8 text-sm text-[var(--muted)]">Loading workbook…</p>}
            {workbook.data && (
              <div className="overflow-x-auto">
                <table className="data-table min-w-[52rem] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
                      <th className="sticky left-0 z-20 w-40 bg-[var(--surface)] px-3 py-3 font-medium">Category</th>
                      <th className="sticky left-40 z-20 w-52 bg-[var(--surface)] px-3 py-3 font-medium">Name</th>
                      {months.map((month) => (
                        <th key={month} className="px-3 py-3 text-right font-medium">
                          {monthLabel(month)}
                        </th>
                      ))}
                      <th className="w-10 px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {renderGroups(ledgerGroups)}
                    {summaryRow(
                      'Total Expenses',
                      months.map((month) => totals[month]?.expenses),
                    )}
                    {renderGroups(incomeGroups)}
                    {summaryRow(
                      'Total to Receive',
                      months.map((month) => totals[month]?.income),
                    )}
                    {summaryRow(
                      'Balance',
                      months.map((month) => totals[month]?.balance),
                      true,
                    )}
                    {summaryRow(
                      'Running Balance',
                      months.map((month) => totals[month]?.running),
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <p className="px-6 py-3 text-xs text-[var(--muted)]">
              Running balance is 0 in the first month, then adds each later month surplus, same as your sheet. Add month
              to keep going past this year.
            </p>
          </section>
        </div>
      )}

      {showBudget && (
        <div className="panel">
          <section className="card p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl tracking-tight">Flow</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {activeFlow?.label ?? budgetFlow.month} · income in, out by category.
                </p>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Flow period">
                {FLOW_GRAINS.map((grain) => (
                  <button
                    key={grain.id}
                    type="button"
                    className={flowGrain === grain.id ? 'glass-primary px-3 py-1.5 text-sm' : 'glass-btn px-3 py-1.5 text-sm'}
                    aria-pressed={flowGrain === grain.id}
                    onClick={() => setFlowGrain(grain.id)}
                  >
                    {grain.label}
                  </button>
                ))}
              </div>
            </div>
            {flowBuckets.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Flow range">
                {flowBuckets.map((bucket) => (
                  <button
                    key={bucket.key}
                    type="button"
                    className={
                      activeFlow?.key === bucket.key ? 'glass-primary px-3 py-1.5 text-sm' : 'glass-btn px-3 py-1.5 text-sm'
                    }
                    aria-pressed={activeFlow?.key === bucket.key}
                    onClick={() => setFlowAnchor(bucket.months.at(-1) ?? null)}
                  >
                    {bucket.label}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-6">
              <SankeyFlow data={budgetFlow} />
            </div>
          </section>
        </div>
      )}

      {showBudget && months.length > 0 && (
        <div className="panel">
          <section className="card p-6">
            <RunningBalanceChart months={months} totals={totals} />
          </section>
        </div>
      )}

      {open && (
        <Dialog title="Add Holding" onClose={() => setOpen(false)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              const symbol = (ticker || name).trim().toUpperCase()
              await api('/api/finance/holdings', {
                method: 'POST',
                body: JSON.stringify({
                  name: name.trim() || symbol,
                  ticker: symbol,
                  kind,
                  quantity: Number(qty) || 0,
                  avgBuy: Number(avgBuy) || 0,
                  currency: kind === 'IN_STOCK' || kind === 'MUTUAL_FUND' || kind === 'EPF' || kind === 'PPF' || kind === 'FD' ? 'INR' : 'USD',
                }),
              })
              setOpen(false)
              setName('')
              setTicker('')
              setQty('')
              setAvgBuy('')
              void queryClient.invalidateQueries({ queryKey: ['holdings'] })
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Ticker</span>
              <input
                className="field"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder={kind === 'COMMODITY' ? 'GOLD, SILVER' : 'RELIANCE, AAPL, BTC'}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Name</span>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Kind</span>
              <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
                {KINDS.map((option) => (
                  <option key={option} value={option}>
                    {option === 'COMMODITY' ? 'Commodity' : option.toLowerCase().replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--muted)]">Qty.</span>
                <input className="field" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} required />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--muted)]">Avg. Buy</span>
                <input className="field" inputMode="decimal" value={avgBuy} onChange={(e) => setAvgBuy(e.target.value)} required />
              </label>
            </div>
            <div className="flex justify-end pt-2">
              <PrimaryButton type="submit">Save Holding</PrimaryButton>
            </div>
          </form>
        </Dialog>
      )}

      {addLine && (
        <Dialog title="Add line" onClose={() => setAddLine(false)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              await api('/api/finance/workbook/items', {
                method: 'POST',
                body: JSON.stringify({ category: lineCategory, name: lineName, kind: lineKind }),
              })
              setAddLine(false)
              setLineName('')
              void queryClient.invalidateQueries({ queryKey: ['workbook'] })
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Category</span>
              <input
                className="field"
                list="budget-categories"
                value={lineCategory}
                onChange={(e) => setLineCategory(e.target.value)}
                placeholder="🏠 Housing"
              />
              <datalist id="budget-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Name</span>
              <input className="field" value={lineName} onChange={(e) => setLineName(e.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Kind</span>
              <select className="field" value={lineKind} onChange={(e) => setLineKind(e.target.value)}>
                {LINE_KINDS.map((option) => (
                  <option key={option} value={option}>
                    {option.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end pt-2">
              <AddButton label="Add line" variant="primary" type="submit" />
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}

function RunningBalanceChart({ months, totals }: { months: string[]; totals: Record<string, MonthTotal> }) {
  const fillId = useId().replace(/:/g, '')
  const data = months.map((month) => ({
    month,
    label: monthLabel(month),
    running: Number(totals[month]?.running ?? 0),
    balance: Number(totals[month]?.balance ?? 0),
  }))
  const latest = data.at(-1)?.running ?? 0
  const previous = data.length > 1 ? data[data.length - 2].running : 0
  const delta = latest - previous
  const down = latest < 0
  const stroke = down ? 'var(--danger)' : 'var(--mint)'
  const fill = down ? 'var(--danger)' : 'var(--mint)'

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl tracking-tight">Running</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Accumulated surplus after the first month, same as the sheet.
          </p>
        </div>
        <div className="text-right">
          <div className="tabular text-xl tracking-tight">{formatInr(latest)}</div>
          {data.length > 1 && (
            <div className={`tabular text-xs ${delta < 0 ? 'text-[var(--danger)]' : 'text-[var(--mint)]'}`}>
              {`${delta > 0 ? '+' : ''}${formatInr(delta)} vs ${data[data.length - 2].label}`}
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 h-72">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fill} stopOpacity={0.35} />
                <stop offset="100%" stopColor={fill} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={CHART_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis
              tick={CHART_TICK}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(value) => formatCompact(Number(value))}
            />
            <ReferenceLine y={0} stroke="var(--line)" />
            <Tooltip
              contentStyle={CHART_TOOLTIP}
              formatter={(value, name) => [
                formatInr(Number(value)),
                name === 'running' ? 'Running' : 'This month',
              ]}
              labelFormatter={(label, payload) => {
                const row = payload?.[0]?.payload as { label?: string; balance?: number } | undefined
                if (!row) return String(label)
                return `${row.label} · surplus ${formatInr(row.balance ?? 0)}`
              }}
            />
            <Area
              type="monotone"
              dataKey="running"
              name="running"
              stroke={stroke}
              strokeWidth={2.25}
              fill={`url(#${fillId})`}
              dot={{ r: data.length < 14 ? 3.5 : 0, fill: stroke, stroke: 'var(--surface)', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: stroke, stroke: 'var(--surface)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

function InvestPie({ title, slices }: { title: string; slices: { name: string; value: number; color: string }[] }) {
  const total = slices.reduce((sum, row) => sum + row.value, 0)
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer>
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={1.5}>
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={CHART_TOOLTIP}
              formatter={(value, name) => {
                const amount = Number(value ?? 0)
                const share = total > 0 ? (amount / total) * 100 : 0
                return [`${formatInr(amount)} · ${share.toFixed(1)}%`, String(name)]
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-1 flex max-h-40 flex-wrap gap-x-4 gap-y-1.5 overflow-y-auto text-xs">
        {slices.map((slice) => (
          <li key={slice.name} className="flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: slice.color }} aria-hidden />
            <span className="font-medium">{slice.name}</span>
            <span className="tabular text-[var(--muted)]">
              {total > 0 ? `${((slice.value / total) * 100).toFixed(1)}%` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
