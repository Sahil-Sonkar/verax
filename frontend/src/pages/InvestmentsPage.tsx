import { Fragment, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import { formatCompact, formatInr, formatMoney, formatSigned, parseAmount } from '../lib/format'
import { Dialog, PrimaryButton } from '../components/Dialog'
import { AddButton, TrashButton } from '../components/IconButtons'
import { PageHeader } from '../components/PageHeader'
import { SankeyFlow, type FlowChart } from '../components/SankeyFlow'
import { MonoArea } from '../components/mono/MonoArea'
import { MonoDonut } from '../components/mono/MonoDonut'
import { BLOCK_COLORS, TONE } from '../lib/colors'
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
const INVEST_CORE = new Set(['Ticker', 'Avg. Buy', 'Qty.', 'Current Value', 'P&L'])
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
  Stocks: TONE.sky,
  'Mutual funds': TONE.violet,
  Commodity: TONE.brass,
  Crypto: TONE.pink,
  EPF: TONE.mint,
  PPF: TONE.sage,
  FD: TONE.warn,
  Other: TONE.sky,
}
const SLICE_PALETTE = BLOCK_COLORS

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

function prevMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 2, 1)
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

function kindLabel(kind: string) {
  return kind === 'COMMODITY' ? 'commodity' : kind.toLowerCase().replaceAll('_', ' ')
}

export function InvestmentsPage({ section = 'all' }: { section?: 'all' | 'invest' | 'budget' }) {
  const queryClient = useQueryClient()
  const year = new Date().getFullYear()
  const [from, setFrom] = useState(`${year}-01`)
  const [to, setTo] = useState(`${year}-12`)
  const holdings = useQuery({
    queryKey: ['holdings'],
    queryFn: () => api<Holding[]>('/api/money/holdings'),
    refetchInterval: 60_000,
  })
  const workbook = useQuery({
    queryKey: ['workbook', from, to],
    queryFn: () => api<Workbook>(`/api/money/workbook?from=${from}&to=${to}`),
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
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({})
  const [budgetEdit, setBudgetEdit] = useState(false)
  const [investEdit, setInvestEdit] = useState(false)
  const [editLine, setEditLine] = useState<{ item: WorkbookItem; month: string } | null>(null)
  const [editCat, setEditCat] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editHolding, setEditHolding] = useState<Holding | null>(null)
  const [flowGrain, setFlowGrain] = useState<FlowGrain>('month')
  const [flowAnchor, setFlowAnchor] = useState<string | null>(null)
  const [focusMonth, setFocusMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

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
  const activeMonth = months.includes(focusMonth) ? focusMonth : (months.at(-1) ?? focusMonth)
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

  async function refreshWorkbook() {
    await queryClient.invalidateQueries({ queryKey: ['workbook'] })
    void queryClient.invalidateQueries({ queryKey: ['fin-portfolio'] })
  }

  async function saveCategory(from: string, raw: string) {
    const to = raw.trim()
    if (!to || to === from) return
    await api('/api/money/workbook/category', {
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
    await refreshWorkbook()
  }

  function toggleCat(key: string) {
    setOpenCats((current) => ({ ...current, [key]: !current[key] }))
  }

  function openAddLine(category = '', kind = 'EXPENSE') {
    setLineCategory(category)
    setLineKind(kind)
    setLineName('')
    if (category) setOpenCats((current) => ({ ...current, [category]: true }))
    setAddLine(true)
  }

  function openEditLine(item: WorkbookItem, month: string) {
    setFocusMonth(month)
    setEditLine({ item, month })
  }

  function monthMark(month: string) {
    return month === activeMonth ? ' bg-[var(--surface-2)]' : ''
  }

  function renderRow(item: WorkbookItem) {
    const tone = rowTone(item.kind, item.category)
    return (
      <tr key={item.id} className={`border-b border-[var(--line)] ${tone}`}>
        <td
          className={`sticky left-0 z-10 min-w-[13rem] px-3 py-2 pl-9${budgetEdit ? ' cursor-pointer' : ''}`}
          onClick={budgetEdit ? () => openEditLine(item, activeMonth) : undefined}
        >
          <div className="font-medium">{item.name}</div>
          <div className="text-[10px] text-[var(--muted)]">{kindLabel(item.kind)}</div>
        </td>
        {months.map((month) => (
          <td
            key={month}
            className={`cursor-pointer px-3 py-2 text-right tabular${monthMark(month)}`}
            onClick={() => (budgetEdit ? openEditLine(item, month) : setFocusMonth(month))}
          >
            {formatInr(item.amounts[month], '')}
          </td>
        ))}
        {budgetEdit && (
          <td className="px-2 py-1 text-right">
            <button type="button" className="px-2 text-sm font-semibold" onClick={() => openEditLine(item, activeMonth)}>
              Edit
            </button>
          </td>
        )}
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
            <td className="sticky left-0 z-10 min-w-[13rem] px-1 py-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="grid size-10 shrink-0 place-items-center"
                  aria-expanded={open}
                  aria-label={open ? `Collapse ${group.category}` : `Expand ${group.category}`}
                  onClick={() => toggleCat(group.key)}
                >
                  <Chevron size={16} strokeWidth={2} aria-hidden="true" />
                </button>
                <span className="min-w-0 flex-1 truncate px-1 font-medium">{group.category}</span>
                {budgetEdit && (
                  <AddButton
                    label={`Add subcategory to ${group.category}`}
                    onClick={() => openAddLine(group.category, group.items[0]?.kind ?? 'EXPENSE')}
                  />
                )}
              </div>
              {!open && group.items.length > 0 && (
                <p className="truncate pl-10 text-xs text-[var(--muted)]">
                  {group.items.map((item) => item.name).join(' · ')}
                </p>
              )}
            </td>
            {months.map((month) => (
              <td
                key={month}
                className={`px-3 py-2 text-right tabular font-medium cursor-pointer${monthMark(month)}`}
                onClick={() => setFocusMonth(month)}
              >
                {formatInr(groupMonthSum(group.items, month), '')}
              </td>
            ))}
            {budgetEdit && (
              <td className="px-2 py-1 text-right">
                <button
                  type="button"
                  className="px-2 text-sm font-semibold"
                  onClick={() => {
                    setEditCat(group.category)
                    setEditCatName(group.category)
                  }}
                >
                  Edit
                </button>
              </td>
            )}
          </tr>
          {open && group.items.map((item) => renderRow(item))}
        </Fragment>
      )
    })
  }

  function summaryRow(label: string, values: Array<number | null | undefined>, colorizeBalance = false) {
    return (
      <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] font-medium">
        <td className="sticky left-0 z-10 bg-[var(--surface-2)] px-3 py-2">{label}</td>
        {values.map((value, index) => {
          const tone = colorizeBalance
            ? (value ?? 0) >= 0
              ? 'text-[var(--mint)]'
              : 'text-[var(--danger)]'
            : ''
          return (
            <td
              key={months[index] ?? index}
              className={`cursor-pointer px-3 py-2 text-right tabular ${tone}${monthMark(months[index] ?? '')}`}
              onClick={() => months[index] && setFocusMonth(months[index])}
            >
              {formatInr(value ?? null, '')}
            </td>
          )
        })}
        {budgetEdit && <td />}
      </tr>
    )
  }

  function monthListGroups(groups: { key: string; category: string; items: WorkbookItem[] }[]) {
    return groups.map((group) => {
      const open = openCats[group.key] === true
      const kind = group.items[0]?.kind ?? 'EXPENSE'
      const tone = rowTone(kind, group.category)
      const Chevron = open ? ChevronDown : ChevronRight
      return (
        <div key={group.key} className={`border-b border-[var(--line)] ${tone}`}>
          <div className="flex items-center gap-1 px-2 py-1">
            <button
              type="button"
              className="grid size-10 shrink-0 place-items-center"
              aria-expanded={open}
              aria-label={open ? `Collapse ${group.category}` : `Expand ${group.category}`}
              onClick={() => toggleCat(group.key)}
            >
              <Chevron size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            <span className="min-w-0 flex-1 truncate px-1 font-medium">{group.category}</span>
            <span className="shrink-0 px-2 tabular text-sm font-medium">
              {formatInr(groupMonthSum(group.items, activeMonth), '')}
            </span>
            {budgetEdit && (
              <AddButton
                label={`Add subcategory to ${group.category}`}
                onClick={() => openAddLine(group.category, group.items[0]?.kind ?? 'EXPENSE')}
              />
            )}
            {budgetEdit && (
              <button
                type="button"
                className="shrink-0 px-2 text-sm font-semibold"
                onClick={() => {
                  setEditCat(group.category)
                  setEditCatName(group.category)
                }}
              >
                Edit
              </button>
            )}
          </div>
          {!open && group.items.length > 0 && (
            <p className="truncate px-12 pb-2 text-xs text-[var(--muted)]">
              {group.items.map((item) => item.name).join(' · ')}
            </p>
          )}
          {open &&
            group.items.map((item) =>
              budgetEdit ? (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-center gap-2 py-2 pr-3 pl-4 text-left"
                  onClick={() => openEditLine(item, activeMonth)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-[10px] text-[var(--muted)]">{kindLabel(item.kind)}</div>
                  </div>
                  <span className="shrink-0 tabular text-sm">
                    {formatInr(item.amounts[activeMonth], '')}
                  </span>
                  <span className="shrink-0 text-sm font-semibold">Edit</span>
                </button>
              ) : (
                <div key={item.id} className="flex items-center gap-2 py-2 pr-3 pl-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-[10px] text-[var(--muted)]">{kindLabel(item.kind)}</div>
                  </div>
                  <span className="shrink-0 tabular text-sm">
                    {formatInr(item.amounts[activeMonth], '')}
                  </span>
                </div>
              ),
            )}
        </div>
      )
    })
  }

  function monthSummary(label: string, value: number | null | undefined, colorize = false) {
    const tone = colorize ? ((value ?? 0) >= 0 ? 'text-[var(--mint)]' : 'text-[var(--danger)]') : ''
    return (
      <div className="flex items-center justify-between bg-[var(--surface-2)] px-4 py-3 text-sm font-medium">
        <span>{label}</span>
        <span className={`tabular ${tone}`}>{formatInr(value ?? null, '')}</span>
      </div>
    )
  }

  const showInvest = section !== 'budget'
  const showBudget = section !== 'invest'

  return (
    <div className="space-y-10">
      {section === 'all' && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageHeader
            title="Invest"
            lead="Monthly workbook in the same shape as your spreadsheet. Blank stays blank. Zero stays zero."
          />
          <AddButton label="Add holding" variant="primary" onClick={() => setOpen(true)} />
        </div>
      )}
      {section !== 'all' && showInvest && (
        <div className="flex flex-wrap justify-end gap-2">
          <AddButton label="Add holding" variant="primary" onClick={() => setOpen(true)} />
        </div>
      )}

      {showInvest && (
        <div className="panel">
          <section className="card overflow-hidden p-0">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-6">
              <div>
                <div className="kicker">Portfolio</div>
                <div className="mt-2 text-4xl tracking-tight tabular">{formatInr(total)}</div>
                <p className="mt-1 max-w-[58ch] text-xs leading-relaxed text-[var(--muted)]">
                  Live prices stay on the quote columns. Edit a row to change ticker, kind, qty, or avg buy.
                </p>
              </div>
              <button
                type="button"
                className={investEdit ? 'glass-primary px-3 py-1.5 text-sm' : 'glass-btn px-3 py-1.5 text-sm'}
                aria-pressed={investEdit}
                onClick={() => {
                  setInvestEdit((current) => !current)
                  setEditHolding(null)
                }}
              >
                {investEdit ? 'Done' : 'Edit'}
              </button>
            </div>
            {(holdings.isLoading || (holdings.data?.length ?? 0) === 0) && (
              <p className="px-6 py-8 text-sm text-[var(--muted)]">
                {holdings.isLoading ? 'Loading holdings…' : 'No holdings yet. Add a ticker to pull live prices.'}
              </p>
            )}
            <div className="lg:hidden">
              {holdings.data?.map((row) => {
                const currency = row.currency || row.quote?.currency || 'INR'
                const pnlTone = Number(row.pnl ?? 0) > 0 ? 'text-[var(--mint)]' : Number(row.pnl ?? 0) < 0 ? 'text-[var(--danger)]' : ''
                const body = (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{row.ticker || row.name}</div>
                      <div className="text-[10px] text-[var(--muted)]">{kindLabel(row.kind)}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="tabular text-sm">
                        {Number(row.quantity) ? formatMoney(row.currentValue, currency) : '—'}
                      </div>
                      <div className={`tabular text-[10px] ${pnlTone}`}>
                        {Number(row.quantity) ? formatMoney(row.pnl, currency) : ''}
                      </div>
                    </div>
                    {investEdit && <span className="shrink-0 text-sm font-semibold">Edit</span>}
                  </>
                )
                return investEdit ? (
                  <button
                    key={row.id}
                    type="button"
                    className="flex w-full items-center gap-2 border-b border-[var(--line)] py-2 pr-3 pl-4 text-left"
                    onClick={() => setEditHolding(row)}
                  >
                    {body}
                  </button>
                ) : (
                  <div key={row.id} className="flex items-center gap-2 border-b border-[var(--line)] py-2 pr-3 pl-4">
                    {body}
                  </div>
                )
              })}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="data-table invest-table min-w-[88rem] text-xs">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
                {INVEST_COLS.map((label) => (
                  <th
                    key={label}
                    className={`whitespace-nowrap px-3 py-3 font-medium${INVEST_CORE.has(label) ? '' : ' invest-extra'}`}
                  >
                    {label}
                  </th>
                ))}
                {investEdit && <th className="px-3 py-3" />}
              </tr>
            </thead>
            <tbody>
              {holdings.data?.map((row) => {
                const quote = row.quote
                const currency = row.currency || quote?.currency || 'INR'
                const pnlTone = Number(row.pnl ?? 0) > 0 ? 'text-[var(--mint)]' : Number(row.pnl ?? 0) < 0 ? 'text-[var(--danger)]' : ''
                const day = quote?.dayChange
                const dayPct = quote?.dayChangePct
                const dayTone = Number(day ?? 0) > 0 ? 'text-[var(--mint)]' : Number(day ?? 0) < 0 ? 'text-[var(--danger)]' : ''
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-[var(--line)]${investEdit ? ' cursor-pointer' : ''}`}
                    onClick={investEdit ? () => setEditHolding(row) : undefined}
                  >
                    <td className="sticky left-0 z-10 min-w-[8rem] px-3 py-2 whitespace-nowrap">
                      <div className="font-medium">{row.ticker || row.name}</div>
                      <div className="text-[10px] text-[var(--muted)]">{kindLabel(row.kind)}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular whitespace-nowrap invest-extra">{formatMoney(quote?.ltp, currency)}</td>
                    <td className={`invest-extra px-3 py-2 text-right tabular whitespace-nowrap ${dayTone}`}>
                      {day == null ? '—' : `${formatSigned(day)} (${formatSigned(dayPct, 2)}%)`}
                    </td>
                    <td className="px-3 py-2 text-right tabular whitespace-nowrap">
                      {Number(row.avgBuy) ? formatMoney(row.avgBuy, currency) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular whitespace-nowrap">
                      {Number(row.quantity) ? row.quantity : '—'}
                    </td>
                    <td className="invest-extra px-3 py-2 text-right tabular whitespace-nowrap">{formatMoney(quote?.lastClose, currency)}</td>
                    <td className="invest-extra px-3 py-2 text-right tabular whitespace-nowrap">
                      {Number(row.buyValue ?? row.amount) ? formatMoney(row.buyValue ?? row.amount, currency) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular whitespace-nowrap">
                      {Number(row.quantity) ? formatMoney(row.currentValue, currency) : '—'}
                    </td>
                    <td className="invest-extra px-3 py-2 text-right tabular whitespace-nowrap">
                      {Number(row.quantity) && row.weight != null ? `${Number(row.weight).toFixed(2)}%` : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right tabular whitespace-nowrap ${pnlTone}`}>
                      {Number(row.quantity) ? formatMoney(row.pnl, currency) : '—'}
                    </td>
                    <td className={`invest-extra px-3 py-2 text-right tabular whitespace-nowrap ${pnlTone}`}>
                      {Number(row.quantity) && row.pnlPct != null ? `${formatSigned(row.pnlPct)}%` : '—'}
                    </td>
                    <td className="invest-extra px-3 py-2 text-right tabular whitespace-nowrap">
                      {quote?.marketCapLabel || formatCompact(quote?.marketCap)}
                    </td>
                    <td className="invest-extra px-3 py-2 text-right tabular whitespace-nowrap">
                      {quote?.peRatio == null ? '—' : Number(quote.peRatio).toFixed(2)}
                    </td>
                    <td className="invest-extra px-3 py-2 text-right tabular whitespace-nowrap">
                      {quote?.volumeLabel || formatCompact(quote?.volume)}
                    </td>
                    {investEdit && (
                      <td className="px-2 py-2 text-right">
                        <button type="button" className="px-2 text-sm font-semibold" onClick={() => setEditHolding(row)}>
                          Edit
                        </button>
                      </td>
                    )}
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
        <div className="flex items-center gap-2 overflow-x-auto text-sm">
          <label className="flex shrink-0 items-center gap-2 text-[var(--muted)]">
            From
            <input
              className="field w-auto py-1.5"
              type="month"
              value={from}
              onChange={(event) => {
                const next = event.target.value
                setFrom(next)
                if (next > to) setTo(next)
              }}
            />
          </label>
          <label className="flex shrink-0 items-center gap-2 text-[var(--muted)]">
            To
            <input
              className="field w-auto py-1.5"
              type="month"
              value={to}
              onChange={(event) => {
                const next = event.target.value
                setTo(next)
                if (next < from) setFrom(next)
              }}
            />
          </label>
          <button type="button" className="glass-btn shrink-0 px-3 py-1.5 text-sm" onClick={() => setTo(nextMonth(to))}>
            Add month
          </button>
          <AddButton className="shrink-0" label="Add line" onClick={() => openAddLine()} />
        </div>
      )}

      {showBudget && (
        <div className="panel">
          <section className="card overflow-hidden p-0">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-6">
              <h2 className="text-2xl tracking-tight">Budget</h2>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <button
                  type="button"
                  className={budgetEdit ? 'glass-primary px-3 py-1.5 text-sm' : 'glass-btn px-3 py-1.5 text-sm'}
                  aria-pressed={budgetEdit}
                  onClick={() => {
                    setBudgetEdit((current) => !current)
                    setEditLine(null)
                    setEditCat(null)
                  }}
                >
                  {budgetEdit ? 'Done' : 'Edit'}
                </button>
              </div>
            </div>
            {workbook.isLoading && <p className="px-6 py-8 text-sm text-[var(--muted)]">Loading workbook…</p>}
            {workbook.data && (
              <>
                <div className="lg:hidden">
                  <div className="flex items-center justify-between gap-2 px-2 py-1">
                    <button
                      type="button"
                      className="grid size-10 place-items-center disabled:opacity-30"
                      aria-label="Previous month"
                      disabled={!months.includes(prevMonth(activeMonth))}
                      onClick={() => setFocusMonth(prevMonth(activeMonth))}
                    >
                      <ChevronLeft size={20} strokeWidth={2} />
                    </button>
                    <div className="text-base font-semibold">{monthLabel(activeMonth)}</div>
                    <button
                      type="button"
                      className="grid size-10 place-items-center disabled:opacity-30"
                      aria-label="Next month"
                      disabled={!months.includes(nextMonth(activeMonth))}
                      onClick={() => setFocusMonth(nextMonth(activeMonth))}
                    >
                      <ChevronRight size={20} strokeWidth={2} />
                    </button>
                  </div>
                  {monthListGroups(ledgerGroups)}
                  {monthSummary('Total Expenses', totals[activeMonth]?.expenses)}
                  {monthListGroups(incomeGroups)}
                  {monthSummary('Total to Receive', totals[activeMonth]?.income)}
                  {monthSummary('Balance', totals[activeMonth]?.balance, true)}
                  {monthSummary('Running Balance', totals[activeMonth]?.running)}
                </div>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="data-table text-sm">
                    <thead>
                      <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
                        <th className="sticky left-0 z-20 min-w-[13rem] px-3 py-3 font-medium">Line</th>
                        {months.map((month) => (
                          <th
                            key={month}
                            className={`px-3 py-3 text-right font-medium${month === activeMonth ? ' text-[var(--fg)]' : ''}`}
                          >
                            <button type="button" className="w-full text-right" onClick={() => setFocusMonth(month)}>
                              {monthLabel(month)}
                            </button>
                          </th>
                        ))}
                        {budgetEdit && <th className="w-10 px-2 py-3" />}
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
              </>
            )}
            <p className="px-4 py-3 text-xs text-[var(--muted)] sm:px-6">
              Running is 0 in the first month you logged, then adds each later surplus. The range above only changes what
              you see.
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
              await api('/api/money/holdings', {
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
        <Dialog title={lineCategory ? `Add line · ${lineCategory}` : 'Add line'} onClose={() => setAddLine(false)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              await api('/api/money/workbook/items', {
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
              <input className="field" value={lineName} onChange={(e) => setLineName(e.target.value)} required autoFocus />
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

      {editLine && (
        <LineEditDialog
          key={`${editLine.item.id}:${editLine.month}`}
          item={editLine.item}
          month={editLine.month}
          categories={categories}
          onClose={() => setEditLine(null)}
        />
      )}

      {editCat && (
        <Dialog title="Rename category" onClose={() => setEditCat(null)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              await saveCategory(editCat, editCatName)
              setEditCat(null)
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Category</span>
              <input
                className="field"
                value={editCatName}
                onChange={(event) => setEditCatName(event.target.value)}
                required
                autoFocus
              />
            </label>
            <div className="flex justify-end pt-2">
              <PrimaryButton type="submit">Save</PrimaryButton>
            </div>
          </form>
        </Dialog>
      )}

      {editHolding && <HoldingEditDialog key={editHolding.id} row={editHolding} onClose={() => setEditHolding(null)} />}
    </div>
  )
}

function LineEditDialog({
  item,
  month,
  categories,
  onClose,
}: {
  item: WorkbookItem
  month: string
  categories: string[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(item.name)
  const [category, setCategory] = useState(item.category)
  const [kind, setKind] = useState(item.kind)
  const [amount, setAmount] = useState(item.amounts[month] == null ? '' : String(item.amounts[month]))
  const [saving, setSaving] = useState(false)

  return (
    <Dialog title={`${item.name} · ${monthLabel(month)}`} onClose={onClose}>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault()
          const nextName = name.trim()
          const nextCategory = category.trim()
          if (!nextName || !nextCategory) return
          const next = parseAmount(amount)
          if (next == null && amount.trim() !== '') return
          setSaving(true)
          try {
            if (nextName !== item.name || nextCategory !== item.category || kind !== item.kind) {
              await api(`/api/money/workbook/items/${item.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ name: nextName, category: nextCategory, kind }),
              })
            }
            if (!sameAmount(item.amounts[month], next)) {
              await api('/api/money/workbook/cell', {
                method: 'PATCH',
                body: JSON.stringify({ itemId: item.id, month, amount: next }),
              })
            }
            await queryClient.invalidateQueries({ queryKey: ['workbook'] })
            void queryClient.invalidateQueries({ queryKey: ['fin-portfolio'] })
            onClose()
          } finally {
            setSaving(false)
          }
        }}
      >
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--muted)]">Name</span>
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--muted)]">Category</span>
          <input
            className="field"
            list="edit-line-categories"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            required
          />
          <datalist id="edit-line-categories">
            {categories.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--muted)]">Kind</span>
          <select className="field" value={kind} onChange={(event) => setKind(event.target.value)}>
            {LINE_KINDS.includes(kind) ? null : <option value={kind}>{kindLabel(kind)}</option>}
            {LINE_KINDS.map((option) => (
              <option key={option} value={option}>
                {option.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--muted)]">Amount · {monthLabel(month)}</span>
          <input
            className="field text-right tabular"
            inputMode="decimal"
            value={amount}
            aria-label={`${name || item.name} for ${monthLabel(month)}`}
            autoFocus
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <div className="flex items-center justify-between gap-2 pt-2">
          <TrashButton
            label={`Delete ${item.name}`}
            onClick={async () => {
              await api(`/api/money/workbook/items/${item.id}`, { method: 'DELETE' })
              void queryClient.invalidateQueries({ queryKey: ['workbook'] })
              onClose()
            }}
          />
          <PrimaryButton type="submit" disabled={saving}>
            Save
          </PrimaryButton>
        </div>
      </form>
    </Dialog>
  )
}

function HoldingEditDialog({ row, onClose }: { row: Holding; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [ticker, setTicker] = useState(row.ticker || row.name || '')
  const [name, setName] = useState(row.name && row.name !== row.ticker ? row.name : '')
  const [kind, setKind] = useState(row.kind)
  const [qty, setQty] = useState(row.quantity == null ? '' : String(row.quantity))
  const [avgBuy, setAvgBuy] = useState(row.avgBuy == null ? '' : String(row.avgBuy))
  const [saving, setSaving] = useState(false)

  return (
    <Dialog title={row.ticker || row.name} onClose={onClose}>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault()
          const symbol = ticker.trim().toUpperCase()
          if (!symbol) return
          setSaving(true)
          try {
            await api(`/api/money/holdings/${row.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                ticker: symbol,
                name: name.trim() || symbol,
                kind,
                quantity: parseAmount(qty) ?? 0,
                avgBuy: parseAmount(avgBuy) ?? 0,
              }),
            })
            void queryClient.invalidateQueries({ queryKey: ['holdings'] })
            void queryClient.invalidateQueries({ queryKey: ['fin-portfolio'] })
            onClose()
          } finally {
            setSaving(false)
          }
        }}
      >
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--muted)]">Ticker</span>
          <input className="field" value={ticker} onChange={(event) => setTicker(event.target.value)} required autoFocus />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--muted)]">Name</span>
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Optional" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--muted)]">Kind</span>
          <select className="field" value={kind} onChange={(event) => setKind(event.target.value)}>
            {KINDS.includes(kind) ? null : <option value={kind}>{kindLabel(kind)}</option>}
            {KINDS.map((option) => (
              <option key={option} value={option}>
                {kindLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Qty.</span>
            <input className="field" inputMode="decimal" value={qty} onChange={(event) => setQty(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Avg. Buy</span>
            <input className="field" inputMode="decimal" value={avgBuy} onChange={(event) => setAvgBuy(event.target.value)} />
          </label>
        </div>
        <div className="flex items-center justify-between gap-2 pt-2">
          <TrashButton
            label={`Delete ${row.ticker || row.name}`}
            onClick={async () => {
              await api(`/api/money/holdings/${row.id}`, { method: 'DELETE' })
              void queryClient.invalidateQueries({ queryKey: ['holdings'] })
              onClose()
            }}
          />
          <PrimaryButton type="submit" disabled={saving}>
            Save
          </PrimaryButton>
        </div>
      </form>
    </Dialog>
  )
}

function RunningBalanceChart({ months, totals }: { months: string[]; totals: Record<string, MonthTotal> }) {
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

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl tracking-tight">Running</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Zero in the first month you logged. Later months keep adding surplus — the range does not restart it.
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
      <MonoArea className="mt-6 h-72" data={data} valueKey="running" color={stroke} format={formatInr} />
    </>
  )
}

function InvestPie({ title, slices }: { title: string; slices: { name: string; value: number; color: string }[] }) {
  const total = slices.reduce((sum, row) => sum + row.value, 0)
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">{title}</h3>
      <MonoDonut className="h-72" data={slices} center={formatInr(total)} />
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
