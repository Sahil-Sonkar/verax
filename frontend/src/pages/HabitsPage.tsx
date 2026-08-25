import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { importanceLabel } from '../lib/format'
import { categoryColor } from '../lib/colors'
import { Dialog, PrimaryButton } from '../components/Dialog'
import type { Category, FrequencyType, Habit, HabitSection, Importance, Metric } from '../types'

const IMPORTANCE_COLOR: Record<Importance, string> = {
  CRITICAL: 'var(--danger)',
  IMPORTANT: 'var(--accent)',
  OPTIONAL: 'var(--muted)',
}

export function HabitsPage() {
  const queryClient = useQueryClient()
  const habits = useQuery({ queryKey: ['habits'], queryFn: () => api<Habit[]>('/api/habits') })
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/api/categories') })
  const metrics = useQuery({ queryKey: ['metrics'], queryFn: () => api<Metric[]>('/api/metrics') })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)

  const archive = useMutation({
    mutationFn: (id: string) => api(`/api/habits/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  })

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-4xl tracking-tight">Habits</h1>
        </div>
        <PrimaryButton
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          New Habit
        </PrimaryButton>
      </div>
      <div className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {habits.data?.length === 0 && (
          <p className="py-8 text-sm text-[var(--muted)]">No habits yet. Create the first commitment.</p>
        )}
        {habits.data?.map((habit) => {
          const accent = categoryColor(habit.category?.name, habit.category?.color)
          return (
            <div key={habit.id} className={`flex flex-wrap items-center justify-between gap-3 py-4 ${habit.parentId ? 'pl-8' : ''}`}>
              <div className="min-w-0">
                <div className="truncate">{habit.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span style={{ color: accent }}>{habit.category?.name ?? 'Uncategorized'}</span>
                  <span style={{ color: IMPORTANCE_COLOR[habit.importance] }}>{importanceLabel(habit.importance)}</span>
                  <span className="text-[var(--muted)]">{habit.frequencyType.toLowerCase()}</span>
                </div>
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  className="text-[var(--accent)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  onClick={() => {
                    setEditing(habit)
                    setOpen(true)
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-[var(--muted)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  onClick={() => {
                    if (window.confirm(`Archive “${habit.name}”? Historical logs stay intact.`)) {
                      archive.mutate(habit.id)
                    }
                  }}
                >
                  Archive
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {open && categories.data && (
        <HabitForm
          categories={categories.data}
          metrics={metrics.data ?? []}
          parents={(habits.data ?? []).filter((h) => !h.parentId && h.id !== editing?.id)}
          initial={editing}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            void queryClient.invalidateQueries({ queryKey: ['habits'] })
            void queryClient.invalidateQueries({ queryKey: ['today'] })
          }}
        />
      )}
    </div>
  )
}

function HabitForm({
  categories,
  metrics,
  parents,
  initial,
  onClose,
  onSaved,
}: {
  categories: Category[]
  metrics: Metric[]
  parents: Habit[]
  initial: Habit | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [categoryId, setCategoryId] = useState(initial?.category?.id ?? categories[0]?.id ?? '')
  const [section, setSection] = useState<HabitSection>(initial?.section ?? 'GROWTH')
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(initial?.frequencyType ?? 'DAILY')
  const [times, setTimes] = useState(initial?.frequencyConfig.timesPerPeriod ?? 3)
  const [weekday, setWeekday] = useState(initial?.frequencyConfig.weekdays?.[0] ?? 6)
  const [importance, setImportance] = useState<Importance>(initial?.importance ?? 'IMPORTANT')
  const [targetValue, setTargetValue] = useState(initial?.targetValue?.toString() ?? '')
  const [unit, setUnit] = useState(initial?.unit ?? '')
  const [autoCompleteMetricId, setAutoCompleteMetricId] = useState(initial?.autoCompleteMetricId ?? '')
  const [autoCompleteThreshold, setAutoCompleteThreshold] = useState(initial?.autoCompleteThreshold?.toString() ?? '')
  const [parentId, setParentId] = useState(initial?.parentId ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <Dialog title={initial ? 'Edit Habit' : 'New Habit'} onClose={onClose}>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault()
          const frequencyConfig =
            frequencyType === 'WEEKLY' || frequencyType === 'MONTHLY'
              ? { timesPerPeriod: times }
              : frequencyType === 'WEEKDAYS'
                ? { weekdays: [weekday] }
                : {}
          setBusy(true)
          try {
            await api(initial ? `/api/habits/${initial.id}` : '/api/habits', {
              method: initial ? 'PATCH' : 'POST',
              body: JSON.stringify({
                name,
                description,
                categoryId,
                section,
                frequencyType,
                frequencyConfig,
                importance,
                targetValue: targetValue ? Number(targetValue) : null,
                unit,
                autoCompleteMetricId: autoCompleteMetricId || null,
                autoCompleteThreshold: autoCompleteThreshold ? Number(autoCompleteThreshold) : null,
                parentId: parentId || null,
                startDate: initial?.startDate ?? new Date().toISOString().slice(0, 10),
              }),
            })
            onSaved()
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save. Check the fields and try again.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <Labeled label="Name" htmlFor="habit-name">
          <input id="habit-name" name="name" className="field" placeholder="Sleep 7.5–8 hours…" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="off" />
        </Labeled>
        <Labeled label="Description" htmlFor="habit-desc">
          <textarea id="habit-desc" name="description" className="field" placeholder="Why this commitment exists…" value={description} onChange={(e) => setDescription(e.target.value)} autoComplete="off" />
        </Labeled>
        <Labeled label="Category" htmlFor="habit-cat">
          <select id="habit-cat" name="category" className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} autoComplete="off">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Section" htmlFor="habit-section">
          <select id="habit-section" className="field" value={section} onChange={(e) => setSection(e.target.value as HabitSection)} autoComplete="off">
            <option value="NON_NEGOTIABLE">Non-negotiable</option>
            <option value="GROWTH">Growth</option>
            <option value="OTHER">Other</option>
          </select>
        </Labeled>
        <Labeled label="Nest under" htmlFor="habit-parent">
          <select id="habit-parent" className="field" value={parentId} onChange={(e) => setParentId(e.target.value)} autoComplete="off">
            <option value="">Top level</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>{parent.name}</option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Frequency" htmlFor="habit-freq">
          <select id="habit-freq" className="field" value={frequencyType} onChange={(e) => setFrequencyType(e.target.value as FrequencyType)} autoComplete="off">
            <option value="DAILY">Daily</option>
            <option value="WEEKDAYS">Specific weekday</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </Labeled>
        {(frequencyType === 'WEEKLY' || frequencyType === 'MONTHLY') && (
          <Labeled label="Times per period" htmlFor="habit-times">
            <input id="habit-times" className="field" type="number" inputMode="numeric" min={1} value={times} onChange={(e) => setTimes(Number(e.target.value))} autoComplete="off" />
          </Labeled>
        )}
        {frequencyType === 'WEEKDAYS' && (
          <Labeled label="Weekday" htmlFor="habit-day">
            <select id="habit-day" className="field" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} autoComplete="off">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                <option key={d} value={i + 1}>{d}</option>
              ))}
            </select>
          </Labeled>
        )}
        <Labeled label="Importance" htmlFor="habit-imp">
          <select id="habit-imp" className="field" value={importance} onChange={(e) => setImportance(e.target.value as Importance)} autoComplete="off">
            <option value="CRITICAL">Critical (weight 3)</option>
            <option value="IMPORTANT">Important (weight 2)</option>
            <option value="OPTIONAL">Optional (weight 1)</option>
          </select>
        </Labeled>
        <div className="grid grid-cols-2 gap-3">
          <Labeled label="Target" htmlFor="habit-target">
            <input id="habit-target" className="field" placeholder="8…" inputMode="decimal" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} autoComplete="off" />
          </Labeled>
          <Labeled label="Unit" htmlFor="habit-unit">
            <input id="habit-unit" className="field" placeholder="hours…" value={unit} onChange={(e) => setUnit(e.target.value)} autoComplete="off" />
          </Labeled>
        </div>
        <Labeled label="Auto-complete from metric" htmlFor="habit-metric">
          <select id="habit-metric" className="field" value={autoCompleteMetricId} onChange={(e) => setAutoCompleteMetricId(e.target.value)} autoComplete="off">
            <option value="">Manual check-in</option>
            {metrics.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.name}
                {metric.unit ? ` (${metric.unit})` : ''}
              </option>
            ))}
          </select>
        </Labeled>
        {autoCompleteMetricId && (
          <Labeled label="Done when value reaches" htmlFor="habit-threshold">
            <input
              id="habit-threshold"
              className="field"
              placeholder="8000…"
              inputMode="decimal"
              value={autoCompleteThreshold}
              onChange={(e) => setAutoCompleteThreshold(e.target.value)}
              autoComplete="off"
            />
          </Labeled>
        )}
        {error && <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">
            Cancel
          </button>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save Habit'}
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
