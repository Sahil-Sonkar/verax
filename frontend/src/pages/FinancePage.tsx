import { useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Dialog, PrimaryButton } from '../components/Dialog'
import { AddButton, TrashButton } from '../components/IconButtons'
import { SankeyFlow } from '../components/SankeyFlow'
import { api } from '../lib/api'
import { formatCompact, formatInr } from '../lib/format'
import { InvestmentsPage } from './InvestmentsPage'
import type { FinanceAccount, FinanceLoan, FinanceLoanPayment, Portfolio, PriceQuote, TaxCompare, TaxItem } from '../types'

const LOAN_LINE_COLORS = ['#0095f6', '#e1306c', '#fcaf45', '#00c853', '#833ab4', '#405de6', '#f77737', '#00bcd4']

const TABS = [
  { id: 'invest', label: 'Invest' },
  { id: 'budget', label: 'Budget' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'loans', label: 'Loans' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'tax', label: 'Tax' },
] as const
const ACCOUNT_KINDS = ['BANK', 'DEMAT', 'CRYPTO']
const LOAN_KINDS = ['PERSONAL', 'HOME', 'EDUCATION', 'AUTO', 'GOLD', 'SLICE', 'OTHER']
const REPAYMENT_MODES = ['NACH', 'ECS', 'STANDING_INSTRUCTION', 'CHEQUE', 'CASH', 'OTHER']
const TAX_KINDS = ['LIC', 'ELSS', 'PPF', 'EPF', 'CHARITY', 'POLITICAL', 'LOAN_INTEREST', 'NPS', 'OTHER']

type ScheduleRow = { date: string; amount: string }

type LoanDraft = {
  name: string
  kind: string
  plan: 'EMI' | 'STATEMENT'
  remaining: string
  rate: string
  tenureMonths: string
  emi: string
  nextDueDate: string
  principal: string
  termMonths: string
  disbursed: string
  currentRoi: string
  repaymentMode: string
  principalBalance: string
  accruedInterest: string
  interestAsOf: string
  feeRefund: string
  feeRefundUntil: string
  earlyPayoffSavings: string
  schedule: ScheduleRow[]
  schedulePaste: string
}

const EMPTY_LOAN: LoanDraft = {
  name: '',
  kind: 'PERSONAL',
  plan: 'EMI',
  remaining: '',
  rate: '',
  tenureMonths: '',
  emi: '',
  nextDueDate: '',
  principal: '',
  termMonths: '',
  disbursed: '',
  currentRoi: '',
  repaymentMode: 'NACH',
  principalBalance: '',
  accruedInterest: '',
  interestAsOf: '',
  feeRefund: '',
  feeRefundUntil: '',
  earlyPayoffSavings: '',
  schedule: [],
  schedulePaste: '',
}

export function FinancePage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('invest')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState('BANK')
  const [amount, setAmount] = useState('')
  const [income, setIncome] = useState('')
  const [quoteKind, setQuoteKind] = useState('IN_STOCK')
  const [quoteQ, setQuoteQ] = useState('')
  const [quote, setQuote] = useState<PriceQuote | null>(null)
  const [loanOpen, setLoanOpen] = useState(false)
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null)
  const [loanDraft, setLoanDraft] = useState<LoanDraft>(EMPTY_LOAN)
  const [paymentForm, setPaymentForm] = useState<{
    loanId: string
    payment?: FinanceLoanPayment
    date: string
    amount: string
  } | null>(null)
  const [installmentForm, setInstallmentForm] = useState<{
    loanId: string
    installment?: { id: string; dueDate: string; amount: number }
    date: string
    amount: string
  } | null>(null)
  const year = new Date().getFullYear()

  function refreshLoans() {
    void queryClient.invalidateQueries({ queryKey: ['fin-loans'] })
    void queryClient.invalidateQueries({ queryKey: ['fin-portfolio'] })
  }

  const accounts = useQuery({ queryKey: ['fin-accounts'], queryFn: () => api<FinanceAccount[]>('/api/money/accounts') })
  const loans = useQuery({ queryKey: ['fin-loans'], queryFn: () => api<FinanceLoan[]>('/api/money/loans') })
  const tax = useQuery({ queryKey: ['fin-tax', year], queryFn: () => api<TaxItem[]>(`/api/money/tax?year=${year}`) })
  const portfolio = useQuery({ queryKey: ['fin-portfolio'], queryFn: () => api<Portfolio>('/api/money/portfolio') })
  const compare = useQuery({
    queryKey: ['fin-tax-compare', year, income],
    queryFn: () => api<TaxCompare>(`/api/money/tax/compare?year=${year}&income=${Number(income) || 0}`),
    enabled: tab === 'tax' && Number(income) > 0,
  })

  return (
    <div className="space-y-8">
      <div>
        <p className="kicker">Ledgers</p>
        <h1 className="mt-2 text-5xl tracking-tight">Money</h1>
        <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-[var(--muted)]">
          Live prices from Google Finance. Budget stays a workbook.
        </p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--line)]" role="tablist" aria-label="Money">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`shrink-0 px-3.5 py-3 text-[13px] font-medium tracking-wide ${
              tab === item.id ? 'text-[var(--fg)] shadow-[inset_0_-2px_0_var(--fg)]' : 'text-[var(--muted)]'
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'invest' && (
        <div className="space-y-6">
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={async (event) => {
              event.preventDefault()
              setQuote(await api<PriceQuote>(`/api/money/quote?kind=${quoteKind}&q=${encodeURIComponent(quoteQ)}`))
            }}
          >
            <select className="field w-auto" value={quoteKind} onChange={(event) => setQuoteKind(event.target.value)}>
              <option value="IN_STOCK">Indian stock</option>
              <option value="US_STOCK">US stock</option>
              <option value="CRYPTO">Crypto</option>
              <option value="COMMODITY">Commodity</option>
            </select>
            <input className="field max-w-xs" value={quoteQ} onChange={(event) => setQuoteQ(event.target.value)} placeholder="RELIANCE, AAPL, GOLD, BTC" />
            <PrimaryButton type="submit">Quote</PrimaryButton>
            {quote && (
              <span className="text-sm text-[var(--muted)]">
                {quote.symbol} · {quote.price} {quote.currency} ({quote.source})
              </span>
            )}
          </form>
          <InvestmentsPage section="invest" />
        </div>
      )}
      {tab === 'budget' && <InvestmentsPage section="budget" />}

      {tab === 'accounts' && (
        <Ledger
          title="Accounts"
          empty="Bank, demat, and wallets."
          rows={accounts.data ?? []}
          onAdd={() => {
            setKind('BANK')
            setOpen(true)
          }}
          onRemove={async (id) => {
            await api(`/api/money/accounts/${id}`, { method: 'DELETE' })
            void queryClient.invalidateQueries({ queryKey: ['fin-accounts'] })
            void queryClient.invalidateQueries({ queryKey: ['fin-portfolio'] })
          }}
        />
      )}

      {tab === 'loans' && (
        <LoansPanel
          rows={loans.data ?? []}
          onAdd={() => {
            setEditingLoanId(null)
            setLoanDraft(EMPTY_LOAN)
            setLoanOpen(true)
          }}
          onEdit={(loan) => {
            setEditingLoanId(loan.id)
            setLoanDraft(draftFromLoan(loan))
            setLoanOpen(true)
          }}
          onRemove={async (id) => {
            await api(`/api/money/loans/${id}`, { method: 'DELETE' })
            refreshLoans()
          }}
          onPay={async (id) => {
            await api(`/api/money/loans/${id}/pay`, { method: 'POST' })
            refreshLoans()
          }}
          onSkip={async (id) => {
            await api(`/api/money/loans/${id}/skip`, { method: 'POST' })
            refreshLoans()
          }}
          onAddPayment={(loan) =>
            setPaymentForm({
              loanId: loan.id,
              date: loan.nextDueDate || todayStamp(),
              amount: loan.emi != null ? String(loan.emi) : '',
            })
          }
          onEditPayment={(loan, payment) =>
            setPaymentForm({
              loanId: loan.id,
              payment,
              date: payment.dueDate,
              amount: payment.kind === 'SKIPPED' ? '' : String(payment.emi),
            })
          }
          onDeletePayment={async (loanId, paymentId) => {
            await api(`/api/money/loans/${loanId}/payments/${paymentId}`, { method: 'DELETE' })
            refreshLoans()
          }}
          onAddInstallment={(loan) =>
            setInstallmentForm({
              loanId: loan.id,
              date: loan.nextDueDate || todayStamp(),
              amount: '',
            })
          }
          onEditInstallment={(loan, row) =>
            setInstallmentForm({
              loanId: loan.id,
              installment: row,
              date: row.dueDate,
              amount: String(row.amount),
            })
          }
          onDeleteInstallment={async (loanId, installmentId) => {
            await api(`/api/money/loans/${loanId}/installments/${installmentId}`, { method: 'DELETE' })
            refreshLoans()
          }}
        />
      )}

      {tab === 'portfolio' && portfolio.data && (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Accounts" value={portfolio.data.accountsTotal} />
            <Stat label="Holdings" value={portfolio.data.holdingsTotal} />
            <Stat label="Loans" value={portfolio.data.loansTotal} />
            <Stat label="Net worth" value={portfolio.data.netWorth} />
          </div>
          <section className="panel">
            <div className="card p-6">
              <h2 className="text-2xl tracking-tight">This month</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{portfolio.data.month} · where it came from, where it went</p>
              <div className="mt-6">
                <SankeyFlow data={portfolio.data} />
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === 'tax' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Gross income</span>
              <input className="field w-56" inputMode="decimal" value={income} onChange={(event) => setIncome(event.target.value)} />
            </label>
            <AddButton
              label="Add deduction"
              variant="primary"
              onClick={() => {
                setKind('LIC')
                setOpen(true)
              }}
            />
          </div>
          <div className="divide-y divide-[var(--line)]">
            {tax.data?.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div>
                  <div>{item.name}</div>
                  <div className="text-xs text-[var(--muted)]">{item.kind.toLowerCase().replaceAll('_', ' ')}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular">{formatInr(item.amount)}</span>
                  <TrashButton
                    label="Delete deduction"
                    onClick={async () => {
                      await api(`/api/money/tax/${item.id}`, { method: 'DELETE' })
                      void queryClient.invalidateQueries({ queryKey: ['fin-tax'] })
                      void queryClient.invalidateQueries({ queryKey: ['fin-tax-compare'] })
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {compare.data && (
            <div className="grid gap-4 md:grid-cols-2">
              <Regime title="Old" taxable={compare.data.oldTaxable} tax={compare.data.oldTotal} win={compare.data.cheaper === 'OLD'} />
              <Regime title="New" taxable={compare.data.newTaxable} tax={compare.data.newTotal} win={compare.data.cheaper === 'NEW'} />
            </div>
          )}
          <p className="text-xs text-[var(--muted)]">
            FY 2025-26 style slabs. 80C (LIC, ELSS, PPF, EPF) capped at 1.5L. New regime rebate to 12L. Not advice.
          </p>
        </div>
      )}

      {open && (
        <Dialog title={tab === 'accounts' ? 'Account' : 'Tax item'} onClose={() => setOpen(false)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              if (tab === 'accounts') {
                await api('/api/money/accounts', {
                  method: 'POST',
                  body: JSON.stringify({ name, kind, balance: Number(amount) || 0, currency: 'INR' }),
                })
                void queryClient.invalidateQueries({ queryKey: ['fin-accounts'] })
              } else {
                await api('/api/money/tax', {
                  method: 'POST',
                  body: JSON.stringify({ taxYear: year, name, kind, amount: Number(amount) || 0 }),
                })
                void queryClient.invalidateQueries({ queryKey: ['fin-tax'] })
                void queryClient.invalidateQueries({ queryKey: ['fin-tax-compare'] })
              }
              void queryClient.invalidateQueries({ queryKey: ['fin-portfolio'] })
              setOpen(false)
              setName('')
              setAmount('')
            }}
          >
            <input className="field" value={name} onChange={(event) => setName(event.target.value)} required placeholder="Name" />
            <select className="field" value={kind} onChange={(event) => setKind(event.target.value)}>
              {(tab === 'accounts' ? ACCOUNT_KINDS : TAX_KINDS).map((option) => (
                <option key={option} value={option}>
                  {option.toLowerCase().replaceAll('_', ' ')}
                </option>
              ))}
            </select>
            <input
              className="field"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Amount"
            />
            <div className="flex justify-end">
              <PrimaryButton type="submit">Save</PrimaryButton>
            </div>
          </form>
        </Dialog>
      )}

      {paymentForm && (
        <Dialog title={paymentForm.payment ? 'Edit payment' : 'Add payment'} onClose={() => setPaymentForm(null)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              const body = { dueDate: paymentForm.date || null, emi: numOrNull(paymentForm.amount) }
              if (paymentForm.payment) {
                await api(`/api/money/loans/${paymentForm.loanId}/payments/${paymentForm.payment.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify(body),
                })
              } else {
                await api(`/api/money/loans/${paymentForm.loanId}/payments`, {
                  method: 'POST',
                  body: JSON.stringify(body),
                })
              }
              setPaymentForm(null)
              refreshLoans()
            }}
          >
            <Field label="Date">
              <input
                className="field"
                type="date"
                value={paymentForm.date}
                onChange={(event) => setPaymentForm({ ...paymentForm, date: event.target.value })}
                required
              />
            </Field>
            <Field label="Payment amount">
              <input
                className="field"
                inputMode="decimal"
                value={paymentForm.amount}
                onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })}
                placeholder="Leave empty to skip"
              />
            </Field>
            <div className="flex justify-end">
              <PrimaryButton type="submit">Save</PrimaryButton>
            </div>
          </form>
        </Dialog>
      )}

      {installmentForm && (
        <Dialog title={installmentForm.installment ? 'Edit installment' : 'Add installment'} onClose={() => setInstallmentForm(null)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              const body = { dueDate: installmentForm.date, amount: numOrNull(installmentForm.amount) }
              if (installmentForm.installment) {
                await api(`/api/money/loans/${installmentForm.loanId}/installments/${installmentForm.installment.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify(body),
                })
              } else {
                await api(`/api/money/loans/${installmentForm.loanId}/installments`, {
                  method: 'POST',
                  body: JSON.stringify(body),
                })
              }
              setInstallmentForm(null)
              refreshLoans()
            }}
          >
            <Field label="Due date">
              <input
                className="field"
                type="date"
                value={installmentForm.date}
                required
                onChange={(event) => setInstallmentForm({ ...installmentForm, date: event.target.value })}
              />
            </Field>
            <Field label="Amount">
              <input
                className="field"
                inputMode="decimal"
                value={installmentForm.amount}
                required
                onChange={(event) => setInstallmentForm({ ...installmentForm, amount: event.target.value })}
              />
            </Field>
            <div className="flex justify-end">
              <PrimaryButton type="submit">Save</PrimaryButton>
            </div>
          </form>
        </Dialog>
      )}

      {loanOpen && (
        <Dialog title={editingLoanId ? 'Edit loan' : 'Loan'} onClose={() => setLoanOpen(false)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              const body = loanPayload(loanDraft)
              await api(editingLoanId ? `/api/money/loans/${editingLoanId}` : '/api/money/loans', {
                method: editingLoanId ? 'PATCH' : 'POST',
                body: JSON.stringify(body),
              })
              void queryClient.invalidateQueries({ queryKey: ['fin-loans'] })
              void queryClient.invalidateQueries({ queryKey: ['fin-portfolio'] })
              setLoanOpen(false)
              setEditingLoanId(null)
              setLoanDraft(EMPTY_LOAN)
            }}
          >
            <Field label="Name">
              <input className="field" value={loanDraft.name} required onChange={(event) => setLoanDraft({ ...loanDraft, name: event.target.value })} />
            </Field>
            <Field label="Loan type">
              <select
                className="field"
                value={loanDraft.kind}
                onChange={(event) => setLoanDraft({ ...loanDraft, kind: event.target.value })}
              >
                {LOAN_KINDS.map((option) => (
                  <option key={option} value={option}>
                    {labelKind(option)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="control-cluster" role="group" aria-label="Loan plan">
              <button
                type="button"
                aria-pressed={loanDraft.plan === 'EMI'}
                onClick={() => setLoanDraft({ ...loanDraft, plan: 'EMI' })}
              >
                Fixed EMI
              </button>
              <button
                type="button"
                aria-pressed={loanDraft.plan === 'STATEMENT'}
                onClick={() => setLoanDraft({ ...loanDraft, plan: 'STATEMENT' })}
              >
                Statement schedule
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Total outstanding balance">
                <input className="field" inputMode="decimal" value={loanDraft.remaining} onChange={(event) => setLoanDraft({ ...loanDraft, remaining: event.target.value })} />
              </Field>
              {loanDraft.plan === 'STATEMENT' ? (
                <>
                  <Field label="Principal">
                    <input className="field" inputMode="decimal" value={loanDraft.principalBalance} onChange={(event) => setLoanDraft({ ...loanDraft, principalBalance: event.target.value })} />
                  </Field>
                  <Field label="Interest">
                    <input className="field" inputMode="decimal" value={loanDraft.accruedInterest} onChange={(event) => setLoanDraft({ ...loanDraft, accruedInterest: event.target.value })} />
                  </Field>
                  <Field label="Interest as on">
                    <input className="field" type="date" value={loanDraft.interestAsOf} onChange={(event) => setLoanDraft({ ...loanDraft, interestAsOf: event.target.value })} />
                  </Field>
                  <Field label="Fee refund">
                    <input className="field" inputMode="decimal" value={loanDraft.feeRefund} onChange={(event) => setLoanDraft({ ...loanDraft, feeRefund: event.target.value })} />
                  </Field>
                  <Field label="Fee refund till">
                    <input className="field" type="date" value={loanDraft.feeRefundUntil} onChange={(event) => setLoanDraft({ ...loanDraft, feeRefundUntil: event.target.value })} />
                  </Field>
                  <Field label="Total savings if paid today">
                    <input className="field" inputMode="decimal" value={loanDraft.earlyPayoffSavings} onChange={(event) => setLoanDraft({ ...loanDraft, earlyPayoffSavings: event.target.value })} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Current EMI">
                    <input className="field" inputMode="decimal" value={loanDraft.emi} onChange={(event) => setLoanDraft({ ...loanDraft, emi: event.target.value })} />
                  </Field>
                  <Field label="Interest rate (%)">
                    <input className="field" inputMode="decimal" value={loanDraft.rate} onChange={(event) => setLoanDraft({ ...loanDraft, rate: event.target.value })} />
                  </Field>
                  <Field label="Current ROI (%)">
                    <input className="field" inputMode="decimal" value={loanDraft.currentRoi} onChange={(event) => setLoanDraft({ ...loanDraft, currentRoi: event.target.value })} />
                  </Field>
                  <Field label="Balance tenure (months)">
                    <input className="field" inputMode="numeric" value={loanDraft.tenureMonths} onChange={(event) => setLoanDraft({ ...loanDraft, tenureMonths: event.target.value })} />
                  </Field>
                  <Field label="Loan term original (months)">
                    <input className="field" inputMode="numeric" value={loanDraft.termMonths} onChange={(event) => setLoanDraft({ ...loanDraft, termMonths: event.target.value })} />
                  </Field>
                  <Field label="Loan sanctioned amount">
                    <input className="field" inputMode="decimal" value={loanDraft.principal} onChange={(event) => setLoanDraft({ ...loanDraft, principal: event.target.value })} />
                  </Field>
                  <Field label="Disbursed amount">
                    <input className="field" inputMode="decimal" value={loanDraft.disbursed} onChange={(event) => setLoanDraft({ ...loanDraft, disbursed: event.target.value })} />
                  </Field>
                  <Field label="Next installment due date">
                    <input className="field" type="date" value={loanDraft.nextDueDate} onChange={(event) => setLoanDraft({ ...loanDraft, nextDueDate: event.target.value })} />
                  </Field>
                  <Field label="Repayment mode">
                    <select className="field" value={loanDraft.repaymentMode} onChange={(event) => setLoanDraft({ ...loanDraft, repaymentMode: event.target.value })}>
                      {REPAYMENT_MODES.map((option) => (
                        <option key={option} value={option}>
                          {labelKind(option)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
            </div>
            {loanDraft.plan === 'STATEMENT' && (
              <div className="space-y-3">
                <Field label="Paste repayment schedule">
                  <textarea
                    className="field min-h-28"
                    value={loanDraft.schedulePaste}
                    placeholder={"Due on 05 Oct '26: ₹56,608.52"}
                    onChange={(event) => setLoanDraft({ ...loanDraft, schedulePaste: event.target.value })}
                  />
                </Field>
                <button
                  type="button"
                  className="glass-btn px-3 py-1.5 text-sm"
                  onClick={() => {
                    const parsed = parseSchedule(loanDraft.schedulePaste)
                    if (parsed.length === 0) return
                    setLoanDraft({
                      ...loanDraft,
                      schedule: mergeSchedule(loanDraft.schedule, parsed),
                      nextDueDate: loanDraft.nextDueDate || parsed[0].date,
                    })
                  }}
                >
                  Add pasted rows
                </button>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Installments</h3>
                  <button
                    type="button"
                    className="glass-btn px-2.5 py-1 text-xs"
                    onClick={() => setLoanDraft({ ...loanDraft, schedule: [...loanDraft.schedule, { date: '', amount: '' }] })}
                  >
                    Add row
                  </button>
                </div>
                <div className="space-y-2">
                  {loanDraft.schedule.map((row, index) => (
                    <div key={`${row.date}-${index}`} className="flex gap-2">
                      <input
                        className="field"
                        type="date"
                        value={row.date}
                        onChange={(event) => {
                          const schedule = [...loanDraft.schedule]
                          schedule[index] = { ...row, date: event.target.value }
                          setLoanDraft({ ...loanDraft, schedule })
                        }}
                      />
                      <input
                        className="field"
                        inputMode="decimal"
                        placeholder="Amount"
                        value={row.amount}
                        onChange={(event) => {
                          const schedule = [...loanDraft.schedule]
                          schedule[index] = { ...row, amount: event.target.value }
                          setLoanDraft({ ...loanDraft, schedule })
                        }}
                      />
                      <TrashButton
                        label="Remove installment"
                        onClick={() =>
                          setLoanDraft({ ...loanDraft, schedule: loanDraft.schedule.filter((_, i) => i !== index) })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <PrimaryButton type="submit">Save</PrimaryButton>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel">
      <div className="card p-4">
        <div className="text-xs text-[var(--muted)]">{label}</div>
        <div className="mt-1 text-xl tabular">{formatInr(value)}</div>
      </div>
    </div>
  )
}

function Regime({ title, taxable, tax, win }: { title: string; taxable: number; tax: number; win: boolean }) {
  return (
    <div className="panel">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl">{title} regime</h3>
          {win && <span className="text-xs text-[var(--mint)]">lower</span>}
        </div>
        <div className="mt-3 text-sm text-[var(--muted)]">Taxable {formatInr(taxable)}</div>
        <div className="mt-1 text-2xl tabular">{formatInr(tax)}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--muted)]">{label}</span>
      {children}
    </label>
  )
}

function labelKind(value: string) {
  return value.toLowerCase().replaceAll('_', ' ')
}

function numOrNull(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function intOrNull(value: string) {
  const n = numOrNull(value)
  return n == null ? null : Math.round(n)
}

function draftFromLoan(loan: FinanceLoan): LoanDraft {
  return {
    name: loan.name,
    kind: loan.kind,
    plan: loan.plan === 'STATEMENT' || (loan.schedule ?? []).length > 0 ? 'STATEMENT' : 'EMI',
    remaining: loan.remaining != null ? String(loan.remaining) : '',
    rate: loan.rate != null ? String(loan.rate) : '',
    tenureMonths: loan.tenureMonths != null ? String(loan.tenureMonths) : '',
    emi: loan.emi != null ? String(loan.emi) : '',
    nextDueDate: loan.nextDueDate ?? '',
    principal: loan.principal != null ? String(loan.principal) : '',
    termMonths: loan.termMonths != null ? String(loan.termMonths) : '',
    disbursed: loan.disbursed != null ? String(loan.disbursed) : '',
    currentRoi: loan.currentRoi != null ? String(loan.currentRoi) : '',
    repaymentMode: loan.repaymentMode || 'NACH',
    principalBalance: loan.principalBalance != null ? String(loan.principalBalance) : '',
    accruedInterest: loan.accruedInterest != null ? String(loan.accruedInterest) : '',
    interestAsOf: loan.interestAsOf ?? '',
    feeRefund: loan.feeRefund != null ? String(loan.feeRefund) : '',
    feeRefundUntil: loan.feeRefundUntil ?? '',
    earlyPayoffSavings: loan.earlyPayoffSavings != null ? String(loan.earlyPayoffSavings) : '',
    schedule: (loan.schedule ?? []).map((row) => ({ date: row.dueDate, amount: String(row.amount) })),
    schedulePaste: '',
  }
}

function loanPayload(draft: LoanDraft) {
  return {
    name: draft.name,
    kind: draft.kind,
    plan: draft.plan,
    remaining: numOrNull(draft.remaining) ?? 0,
    rate: numOrNull(draft.rate),
    tenureMonths: intOrNull(draft.tenureMonths),
    emi: numOrNull(draft.emi) ?? 0,
    nextDueDate: draft.nextDueDate || null,
    principal: numOrNull(draft.principal) ?? 0,
    termMonths: intOrNull(draft.termMonths),
    disbursed: numOrNull(draft.disbursed),
    currentRoi: numOrNull(draft.currentRoi),
    repaymentMode: draft.repaymentMode || null,
    principalBalance: numOrNull(draft.principalBalance),
    accruedInterest: numOrNull(draft.accruedInterest),
    interestAsOf: draft.interestAsOf || null,
    feeRefund: numOrNull(draft.feeRefund),
    feeRefundUntil: draft.feeRefundUntil || null,
    earlyPayoffSavings: numOrNull(draft.earlyPayoffSavings),
    schedule: draft.schedule
      .filter((row) => row.date && row.amount)
      .map((row) => ({ dueDate: row.date, amount: Number(row.amount) })),
  }
}

const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
}

function parseSchedule(text: string): ScheduleRow[] {
  const rows: ScheduleRow[] = []
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim()
    if (!line) continue
    const amountMatch = line.match(/₹\s*([\d,]+(?:\.\d+)?)|(\d[\d,]*\.\d{2})/)
    const amount = (amountMatch?.[1] || amountMatch?.[2] || '').replace(/,/g, '')
    let date = ''
    const iso = line.match(/(\d{4}-\d{2}-\d{2})/)
    const named = line.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+'?(\d{2,4})/)
    if (iso) {
      date = iso[1]
    } else if (named) {
      const month = MONTH_INDEX[named[2].slice(0, 3).toLowerCase()]
      if (month) {
        let year = Number(named[3])
        if (year < 100) year += 2000
        date = `${year}-${String(month).padStart(2, '0')}-${named[1].padStart(2, '0')}`
      }
    }
    if (date && amount) rows.push({ date, amount })
  }
  return rows
}

function mergeSchedule(current: ScheduleRow[], incoming: ScheduleRow[]) {
  const map = new Map<string, ScheduleRow>()
  for (const row of [...current, ...incoming]) {
    if (row.date) map.set(row.date, row)
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function formatMonths(value?: number | null) {
  if (value == null) return '—'
  return `${value} mo`
}

function formatPct(value?: number | null) {
  if (value == null) return '—'
  return `${value}%`
}

function formatDue(value?: string | null) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function todayStamp() {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

function LoansPanel({
  rows,
  onAdd,
  onEdit,
  onRemove,
  onPay,
  onSkip,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
  onAddInstallment,
  onEditInstallment,
  onDeleteInstallment,
}: {
  rows: FinanceLoan[]
  onAdd: () => void
  onEdit: (loan: FinanceLoan) => void
  onRemove: (id: string) => void
  onPay: (id: string) => void
  onSkip: (id: string) => void
  onAddPayment: (loan: FinanceLoan) => void
  onEditPayment: (loan: FinanceLoan, payment: FinanceLoanPayment) => void
  onDeletePayment: (loanId: string, paymentId: string) => void
  onAddInstallment: (loan: FinanceLoan) => void
  onEditInstallment: (loan: FinanceLoan, row: { id: string; dueDate: string; amount: number }) => void
  onDeleteInstallment: (loanId: string, installmentId: string) => void
}) {
  const today = todayStamp()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          Past due dates apply a reducing-balance EMI. Mark paid or skip today if NACH bounced.
        </p>
        <AddButton label="Add loan" variant="primary" onClick={onAdd} />
      </div>
      {rows.length === 0 && <p className="text-sm text-[var(--muted)]">Nothing here yet.</p>}
      {rows.map((loan) => {
        const open = Number(loan.remaining) > 0
        const due = open && !!loan.nextDueDate && loan.nextDueDate <= today
        const statement = loan.plan === 'STATEMENT' || (loan.schedule ?? []).length > 0
        const details = statement
          ? [
              { label: 'Total outstanding', value: formatInr(loan.remaining) },
              { label: 'Principal', value: formatInr(loan.principalBalance, '—') },
              {
                label: loan.interestAsOf ? `Interest (as on ${formatDue(loan.interestAsOf)})` : 'Interest',
                value: formatInr(loan.accruedInterest ?? 0),
              },
              {
                label: loan.feeRefundUntil ? `Fee refund (till ${formatDue(loan.feeRefundUntil)})` : 'Fee refund',
                value: formatInr(loan.feeRefund, '—'),
              },
              { label: 'Total savings if paid today', value: formatInr(loan.earlyPayoffSavings, '—') },
              { label: 'Next installment', value: formatDue(loan.nextDueDate) },
              { label: 'Remaining installments', value: formatMonths(loan.tenureMonths) },
            ]
          : [
              { label: 'Total outstanding balance', value: formatInr(loan.remaining) },
              { label: 'Interest rate', value: formatPct(loan.rate) },
              { label: 'Balance tenure', value: formatMonths(loan.tenureMonths) },
              { label: 'Current EMI', value: formatInr(loan.emi) },
              { label: 'Next installment due date', value: formatDue(loan.nextDueDate) },
              { label: 'Loan sanctioned amount', value: formatInr(loan.principal) },
              { label: 'Loan type', value: labelKind(loan.kind) },
              { label: 'Loan term original', value: formatMonths(loan.termMonths) },
              { label: 'Disbursed amount', value: formatInr(loan.disbursed, '—') },
              { label: 'Current ROI', value: formatPct(loan.currentRoi) },
              { label: 'Repayment mode', value: loan.repaymentMode ? labelKind(loan.repaymentMode) : '—' },
            ]
        return (
          <article key={loan.id} className="card relative p-5">
            <div className="flex items-start justify-between gap-3 pr-10">
              <button type="button" className="min-w-0 text-left" onClick={() => onEdit(loan)}>
                <h3 className="text-lg tracking-tight">{loan.name}</h3>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-[var(--muted)]">{labelKind(loan.kind)}</p>
              </button>
              <TrashButton label={`Delete ${loan.name}`} className="absolute right-3 top-3" onClick={() => onRemove(loan.id)} />
            </div>
            {due && (
              <p className="mt-3 text-sm text-[var(--muted)]">
                EMI due {formatDue(loan.nextDueDate)}. Mark paid if it went out, or skip this month.
              </p>
            )}
            <dl className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-2">
              {details.map((row) => (
                <div key={row.label} className="flex justify-between gap-3 text-sm">
                  <dt className="text-[var(--muted)]">{row.label}</dt>
                  <dd className="tabular text-right">{row.value}</dd>
                </div>
              ))}
            </dl>
            {open && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="glass-primary px-3 py-1.5 text-sm" onClick={() => onPay(loan.id)}>
                  {statement ? 'Mark installment paid' : 'Mark EMI paid'}
                </button>
                <button type="button" className="glass-btn px-3 py-1.5 text-sm" onClick={() => onSkip(loan.id)}>
                  Skip this month
                </button>
              </div>
            )}
            {(statement || (loan.schedule ?? []).length > 0) && (
              <div className="mt-4 border-t border-[var(--line)] pt-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Repayment schedule</h4>
                  <button type="button" className="glass-btn px-2.5 py-1 text-xs" onClick={() => onAddInstallment(loan)}>
                    Add row
                  </button>
                </div>
                {(loan.schedule ?? []).length === 0 && (
                  <p className="mt-2 text-sm text-[var(--muted)]">No installments yet.</p>
                )}
                <ul className="mt-2 divide-y divide-[var(--line)]">
                  {(loan.schedule ?? []).map((row) => (
                    <li key={row.id} className="flex items-center gap-2 py-2">
                      <button type="button" className="min-w-0 flex-1 text-left text-sm" onClick={() => onEditInstallment(loan, row)}>
                        <span className="text-[var(--muted)]">Due on {formatDue(row.dueDate)}</span>
                        <span className="mt-0.5 block tabular">{formatInr(row.amount)}</span>
                      </button>
                      <TrashButton label="Delete installment" onClick={() => onDeleteInstallment(loan.id, row.id)} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4 border-t border-[var(--line)] pt-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Payments</h4>
                <button type="button" className="glass-btn px-2.5 py-1 text-xs" onClick={() => onAddPayment(loan)}>
                  Add payment
                </button>
              </div>
              {(loan.payments ?? []).length === 0 && (
                <p className="mt-2 text-sm text-[var(--muted)]">No payments yet. Add one in between EMIs if you prepaid.</p>
              )}
              <ul className="mt-2 divide-y divide-[var(--line)]">
                {(loan.payments ?? []).map((row) => (
                  <li key={row.id} className="flex items-center gap-2 py-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left text-sm"
                      onClick={() => onEditPayment(loan, row)}
                    >
                      <span className="text-[var(--muted)]">
                        {formatDue(row.dueDate)}
                        {row.source === 'AUTO' ? ' · auto' : ''}
                      </span>
                      <span className="mt-0.5 block tabular">
                        {row.kind === 'SKIPPED'
                          ? 'Skipped'
                          : `${formatInr(row.emi)} · interest ${formatInr(row.interest)}`}
                      </span>
                    </button>
                    <TrashButton
                      label="Delete payment"
                      onClick={() => onDeletePayment(loan.id, row.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </article>
        )
      })}
      <TenureChart loans={rows} />
    </div>
  )
}

function formatMonthTick(period: string) {
  const [year, month] = period.split('-')
  if (!year || !month) return period
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: '2-digit',
  })
}

function monthRange(from: string, to: string) {
  const periods: string[] = []
  const start = from.split('-').map(Number)
  const end = to.split('-').map(Number)
  if (start.length < 2 || end.length < 2) return periods
  let year = start[0]
  let month = start[1]
  while (year < end[0] || (year === end[0] && month <= end[1])) {
    periods.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return periods
}

function carriedValue(points: { period: string; remaining: number }[], period: string) {
  if (points.length === 0) return null
  const sorted = [...points].sort((a, b) => a.period.localeCompare(b.period))
  const exact = sorted.find((point) => point.period === period)
  if (exact) return Number(exact.remaining)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (period < first.period) return Number(first.remaining)
  if (period > last.period) return Number(last.remaining)
  let value = Number(first.remaining)
  for (const point of sorted) {
    if (point.period > period) break
    value = Number(point.remaining)
  }
  return value
}

function TenureChart({ loans }: { loans: FinanceLoan[] }) {
  const series = useMemo(() => loans.filter((loan) => (loan.forecast ?? []).length > 0), [loans])
  const data = useMemo(() => {
    const all = series.flatMap((loan) => (loan.forecast ?? []).map((point) => point.period)).sort()
    if (all.length === 0) return []
    const periods = monthRange(all[0], all[all.length - 1])
    return periods.map((period) => {
      const row: Record<string, string | number | null> = { period, label: formatMonthTick(period) }
      for (const loan of series) {
        row[loan.id] = carriedValue(loan.forecast ?? [], period)
      }
      return row
    })
  }, [series])
  if (series.length === 0) return null
  return (
    <section className="card p-5">
      <h3 className="text-lg tracking-tight">Outstanding over tenure</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Each loan is a line. Extra payments pull the balance down faster, so that line ends sooner.
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {series.map((loan, index) => (
          <li key={loan.id} className="flex items-center gap-1.5">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: LOAN_LINE_COLORS[index % LOAN_LINE_COLORS.length] }}
              aria-hidden
            />
            <span className="font-medium">{loan.name}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 h-80">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval={Math.max(0, Math.floor(data.length / 8) - 1)}
            />
            <YAxis tick={{ fontSize: 10 }} width={52} tickFormatter={(value) => formatCompact(Number(value))} />
            <Tooltip
              formatter={(value, name) => [formatInr(Number(value)), String(name)]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
            />
            {series.map((loan, index) => (
              <Line
                key={loan.id}
                type="monotone"
                dataKey={loan.id}
                name={loan.name}
                stroke={LOAN_LINE_COLORS[index % LOAN_LINE_COLORS.length]}
                strokeWidth={2}
                connectNulls
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function Ledger({
  title,
  empty,
  rows,
  onAdd,
  onRemove,
}: {
  title: string
  empty: string
  rows: Array<{ id: string; name: string; kind: string; balance: number; currency: string }>
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="panel">
      <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{empty}</p>
        <AddButton label={`Add ${title.slice(0, -1).toLowerCase()}`} variant="primary" onClick={onAdd} />
      </div>
      <div className="mt-4 divide-y divide-[var(--line)]">
        {rows.length === 0 && <p className="py-4 text-sm text-[var(--muted)]">Nothing here yet.</p>}
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between py-3">
            <div>
              <div>{row.name}</div>
              <div className="text-xs text-[var(--muted)]">{row.kind.toLowerCase()}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="tabular">{formatInr(row.balance)}</span>
              <TrashButton label={`Delete ${row.name}`} onClick={() => onRemove(row.id)} />
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  )
}
