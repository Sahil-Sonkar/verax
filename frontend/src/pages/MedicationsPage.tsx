import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Dialog, PrimaryButton } from '../components/Dialog'
import { AddButton, TrashButton } from '../components/IconButtons'
import { PageHeader } from '../components/PageHeader'
import { api } from '../lib/api'
import type { Medication } from '../types'

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
]

export function MedicationsPage() {
  const queryClient = useQueryClient()
  const meds = useQuery({ queryKey: ['medications'], queryFn: () => api<Medication[]>('/api/medications') })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Medication | null>(null)

  const archive = useMutation({
    mutationFn: (id: string) => api(`/api/medications/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['medications'] })
    },
  })

  return (
    <div className="page">
      <PageHeader
        title="Medicines"
        lead="List what you take. Today shows the doses. History is never hard-deleted."
        actions={
          <PrimaryButton
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            New Medicine
          </PrimaryButton>
        }
      />
      <div className="card divide-y divide-[var(--line)] overflow-hidden px-4">
        {meds.data?.length === 0 && (
          <p className="py-8 text-sm text-[var(--muted)]">No medicines yet. Add the first course.</p>
        )}
        {meds.data?.map((medication) => (
          <div key={medication.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <div className="truncate">{medication.name}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">
                {[medication.dosage, medication.times.join(', ')].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                className="text-[var(--accent)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                onClick={() => {
                  setEditing(medication)
                  setOpen(true)
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="text-[var(--muted)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                onClick={() => {
                  if (window.confirm(`Archive “${medication.name}”? Past doses stay.`)) {
                    archive.mutate(medication.id)
                  }
                }}
              >
                Archive
              </button>
            </div>
          </div>
        ))}
      </div>
      {open && (
        <MedicationForm
          initial={editing}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            void queryClient.invalidateQueries({ queryKey: ['medications'] })
          }}
        />
      )}
    </div>
  )
}

function MedicationForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Medication | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [dosage, setDosage] = useState(initial?.dosage ?? '')
  const [instructions, setInstructions] = useState(initial?.instructions ?? '')
  const [times, setTimes] = useState(initial?.times?.length ? initial.times : ['08:00'])
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [1, 2, 3, 4, 5, 6, 7])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <Dialog title={initial ? 'Edit Medicine' : 'New Medicine'} onClose={onClose}>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          try {
            await api(initial ? `/api/medications/${initial.id}` : '/api/medications', {
              method: initial ? 'PATCH' : 'POST',
              body: JSON.stringify({ name, dosage, instructions, times, weekdays }),
            })
            onSaved()
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save. Check the fields and try again.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <Labeled label="Name" htmlFor="med-name">
          <input id="med-name" className="field" placeholder="Vitamin D…" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="off" />
        </Labeled>
        <Labeled label="Dosage" htmlFor="med-dose">
          <input id="med-dose" className="field" placeholder="5000 IU…" value={dosage} onChange={(e) => setDosage(e.target.value)} autoComplete="off" />
        </Labeled>
        <Labeled label="Instructions" htmlFor="med-note">
          <textarea id="med-note" className="field" placeholder="With food…" value={instructions} onChange={(e) => setInstructions(e.target.value)} autoComplete="off" />
        </Labeled>
        <div>
          <span className="mb-1 block text-xs text-[var(--muted)]">Times</span>
          <div className="space-y-2">
            {times.map((time, index) => (
              <div key={`${index}-${time}`} className="flex gap-2">
                <input
                  className="field"
                  type="time"
                  value={time}
                  onChange={(e) => {
                    const next = [...times]
                    next[index] = e.target.value
                    setTimes(next)
                  }}
                />
                {times.length > 1 && (
                  <TrashButton
                    label="Delete time"
                    onClick={() => setTimes(times.filter((_, i) => i !== index))}
                  />
                )}
              </div>
            ))}
            <AddButton label="Add time" onClick={() => setTimes([...times, '21:00'])} />
          </div>
        </div>
        <div>
          <span className="mb-1 block text-xs text-[var(--muted)]">Days</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                className="chip"
                aria-pressed={weekdays.includes(day.value)}
                onClick={() => {
                  setWeekdays(
                    weekdays.includes(day.value)
                      ? weekdays.filter((value) => value !== day.value)
                      : [...weekdays, day.value].sort((a, b) => a - b),
                  )
                }}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">
            Cancel
          </button>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save Medicine'}
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
