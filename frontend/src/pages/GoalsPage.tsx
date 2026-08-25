import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { formatNumber } from '../lib/format'
import { categoryColor } from '../lib/colors'
import { ProgressBar } from '../components/Progress'
import { Dialog, PrimaryButton } from '../components/Dialog'
import type { Category, Goal } from '../types'

export function GoalsPage() {
  const queryClient = useQueryClient()
  const goals = useQuery({ queryKey: ['goals'], queryFn: () => api<Goal[]>('/api/goals') })
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/api/categories') })
  const [open, setOpen] = useState(false)

  const archive = useMutation({
    mutationFn: (id: string) => api(`/api/goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  })

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-4xl tracking-tight">Goals</h1>
          <p className="mt-2 max-w-lg text-sm text-[var(--muted)]">
            Goals are destinations. Habits are the road. Keep them separate.
          </p>
        </div>
        <PrimaryButton onClick={() => setOpen(true)}>New Goal</PrimaryButton>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {goals.data?.length === 0 && <p className="text-sm text-[var(--muted)]">No goals yet. Name an outcome.</p>}
        {goals.data?.map((goal) => {
          const accent = categoryColor(goal.category?.name, goal.category?.color)
          return (
            <article key={goal.id} className="border-t border-[var(--line)] pt-5">
              <div className="text-sm" style={{ color: accent }}>
                {goal.category?.name ?? 'Other'}
              </div>
              <h2 className="mt-1 text-2xl tracking-tight">{goal.name}</h2>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-[var(--muted)]">Current</span>
                <span className="tabular">{formatNumber(goal.currentValue, goal.unit)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-[var(--muted)]">Target</span>
                <span className="tabular">{formatNumber(goal.targetValue, goal.unit)}</span>
              </div>
              <ProgressBar value={goal.progressPercent} className="mt-4" color={accent} />
              <div className="mt-2 text-xs text-[var(--muted)]">
                {goal.progressPercent ?? 0}% · {goal.targetDate ?? 'No date'}
              </div>
              <button
                type="button"
                className="mt-4 text-xs text-[var(--muted)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                onClick={() => {
                  if (window.confirm(`Archive “${goal.name}”? History stays.`)) archive.mutate(goal.id)
                }}
              >
                Archive
              </button>
            </article>
          )
        })}
      </div>
      {open && categories.data && (
        <GoalForm
          categories={categories.data}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            void queryClient.invalidateQueries({ queryKey: ['goals'] })
          }}
        />
      )}
    </div>
  )
}

function GoalForm({
  categories,
  onClose,
  onSaved,
}: {
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [currentValue, setCurrentValue] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [baselineValue, setBaselineValue] = useState('')
  const [unit, setUnit] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  return (
    <Dialog title="New Goal" onClose={onClose}>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          try {
            await api('/api/goals', {
              method: 'POST',
              body: JSON.stringify({
                name,
                categoryId,
                currentValue: currentValue ? Number(currentValue) : 0,
                targetValue: targetValue ? Number(targetValue) : null,
                baselineValue: baselineValue ? Number(baselineValue) : null,
                unit,
                targetDate: targetDate || null,
                startDate: new Date().toISOString().slice(0, 10),
                notes,
              }),
            })
            onSaved()
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save the goal. Check the numbers and try again.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <Labeled label="Name" htmlFor="goal-name">
          <input id="goal-name" className="field" placeholder="Reach 12% body fat…" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="off" />
        </Labeled>
        <Labeled label="Category" htmlFor="goal-cat">
          <select id="goal-cat" className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} autoComplete="off">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Labeled>
        <div className="grid grid-cols-3 gap-3">
          <Labeled label="Current" htmlFor="goal-current">
            <input id="goal-current" className="field" placeholder="19.5…" inputMode="decimal" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} autoComplete="off" />
          </Labeled>
          <Labeled label="Target" htmlFor="goal-target">
            <input id="goal-target" className="field" placeholder="12…" inputMode="decimal" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} autoComplete="off" />
          </Labeled>
          <Labeled label="Baseline" htmlFor="goal-base">
            <input id="goal-base" className="field" placeholder="21…" inputMode="decimal" value={baselineValue} onChange={(e) => setBaselineValue(e.target.value)} autoComplete="off" />
          </Labeled>
        </div>
        <Labeled label="Unit" htmlFor="goal-unit">
          <input id="goal-unit" className="field" placeholder="%…" value={unit} onChange={(e) => setUnit(e.target.value)} autoComplete="off" />
        </Labeled>
        <Labeled label="Target date" htmlFor="goal-date">
          <input id="goal-date" className="field" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} autoComplete="off" />
        </Labeled>
        <Labeled label="Notes" htmlFor="goal-notes">
          <textarea id="goal-notes" className="field" placeholder="What this outcome means…" value={notes} onChange={(e) => setNotes(e.target.value)} autoComplete="off" />
        </Labeled>
        {error && <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">
            Cancel
          </button>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save Goal'}
          </PrimaryButton>
        </div>
      </form>
    </Dialog>
  )
}

function Labeled({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1 block text-xs text-[var(--muted)]">{label}</span>
      {children}
    </label>
  )
}
