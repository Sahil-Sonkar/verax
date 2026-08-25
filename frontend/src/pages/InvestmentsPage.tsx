import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { formatNumber } from '../lib/format'
import { Dialog, PrimaryButton } from '../components/Dialog'
import type { Budget, BudgetLine, Holding } from '../types'

const KINDS = ['EQUITY', 'MUTUAL_FUND', 'FD', 'GOLD', 'CRYPTO', 'OTHER']

function monthNow() {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7)
}

export function InvestmentsPage() {
  const queryClient = useQueryClient()
  const month = monthNow()
  const holdings = useQuery({ queryKey: ['holdings'], queryFn: () => api<Holding[]>('/api/finance/holdings') })
  const budget = useQuery({
    queryKey: ['budget', month],
    queryFn: () => api<Budget>(`/api/finance/budget?month=${month}`),
  })
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState('EQUITY')
  const [amount, setAmount] = useState('')
  const [income, setIncome] = useState('')
  const [plannedInvest, setPlannedInvest] = useState('')
  const [lines, setLines] = useState<BudgetLine[]>([{ name: 'Rent', planned: 0, spent: 0 }])

  useEffect(() => {
    if (!budget.data) return
    setIncome(String(budget.data.income ?? 0))
    setPlannedInvest(String(budget.data.plannedInvest ?? 0))
    setLines(budget.data.lines.length ? budget.data.lines : [{ name: 'Rent', planned: 0, spent: 0 }])
  }, [budget.data])

  const total = holdings.data?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl tracking-tight">Invest</h1>
          <p className="mt-2 max-w-[65ch] text-sm text-[var(--muted)]">
            Holdings and this month’s budget. The Invest habit is monthly; this page is the ledger.
          </p>
        </div>
        <PrimaryButton onClick={() => setOpen(true)}>Add Holding</PrimaryButton>
      </div>

      <section className="card p-6">
        <div className="text-sm text-[var(--muted)]">Portfolio</div>
        <div className="mt-1 text-4xl tracking-tight tabular">{formatNumber(total, 'INR')}</div>
        <div className="mt-6 divide-y divide-[var(--line)]">
          {holdings.data?.length === 0 && <p className="py-4 text-sm text-[var(--muted)]">No holdings yet.</p>}
          {holdings.data?.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div>{row.name}</div>
                <div className="text-xs text-[var(--muted)]">{row.kind.toLowerCase().replaceAll('_', ' ')}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular">{formatNumber(row.amount, row.currency)}</span>
                <button
                  type="button"
                  className="text-xs text-[var(--muted)] hover:text-[var(--danger)]"
                  onClick={async () => {
                    await api(`/api/finance/holdings/${row.id}`, { method: 'DELETE' })
                    void queryClient.invalidateQueries({ queryKey: ['holdings'] })
                    void queryClient.invalidateQueries({ queryKey: ['budget'] })
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-2xl tracking-tight">Budget · {month}</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            await api(`/api/finance/budget?month=${month}`, {
              method: 'PUT',
              body: JSON.stringify({
                income: Number(income),
                plannedInvest: Number(plannedInvest),
                lines: lines.filter((line) => line.name.trim()),
              }),
            })
            void queryClient.invalidateQueries({ queryKey: ['budget'] })
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Income</span>
              <input className="field" inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Planned to invest</span>
              <input className="field" inputMode="decimal" value={plannedInvest} onChange={(e) => setPlannedInvest(e.target.value)} />
            </label>
          </div>
          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={`${line.name}-${index}`} className="grid gap-2 md:grid-cols-[1fr_8rem_8rem]">
                <input
                  className="field"
                  placeholder="Category…"
                  value={line.name}
                  onChange={(e) => {
                    const next = [...lines]
                    next[index] = { ...line, name: e.target.value }
                    setLines(next)
                  }}
                />
                <input
                  className="field"
                  placeholder="Plan"
                  inputMode="decimal"
                  value={line.planned}
                  onChange={(e) => {
                    const next = [...lines]
                    next[index] = { ...line, planned: Number(e.target.value) }
                    setLines(next)
                  }}
                />
                <input
                  className="field"
                  placeholder="Spent"
                  inputMode="decimal"
                  value={line.spent}
                  onChange={(e) => {
                    const next = [...lines]
                    next[index] = { ...line, spent: Number(e.target.value) }
                    setLines(next)
                  }}
                />
              </div>
            ))}
            <button type="button" className="text-sm text-[var(--accent)]" onClick={() => setLines([...lines, { name: '', planned: 0, spent: 0 }])}>
              Add line
            </button>
          </div>
          <PrimaryButton type="submit">Save Budget</PrimaryButton>
        </form>
      </section>

      {open && (
        <Dialog title="Add Holding" onClose={() => setOpen(false)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              await api('/api/finance/holdings', {
                method: 'POST',
                body: JSON.stringify({ name, kind, amount: Number(amount), currency: 'INR' }),
              })
              setOpen(false)
              setName('')
              setAmount('')
              void queryClient.invalidateQueries({ queryKey: ['holdings'] })
              void queryClient.invalidateQueries({ queryKey: ['budget'] })
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Name</span>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Kind</span>
              <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
                {KINDS.map((option) => (
                  <option key={option} value={option}>
                    {option.toLowerCase().replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Amount</span>
              <input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </label>
            <div className="flex justify-end pt-2">
              <PrimaryButton type="submit">Save Holding</PrimaryButton>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
