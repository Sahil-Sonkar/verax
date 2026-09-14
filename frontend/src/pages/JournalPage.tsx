import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useState } from 'react'
import { api } from '../lib/api'
import { PrimaryButton } from '../components/Dialog'
import { PageHeader } from '../components/PageHeader'
import type { JournalEntry } from '../types'

function isoDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA').format(date)
}

export function JournalPage() {
  const queryClient = useQueryClient()
  const today = isoDate(new Date())
  const [date, setDate] = useState(today)
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - 40)
  const from = isoDate(fromDate)
  const list = useQuery({
    queryKey: ['journal', from, today],
    queryFn: () => api<JournalEntry[]>(`/api/journal?from=${from}&to=${today}`),
  })
  const entry = useQuery({
    queryKey: ['journal-entry', date],
    queryFn: () => api<JournalEntry>(`/api/journal/${date}`),
  })
  const [draft, setDraft] = useState<Partial<JournalEntry>>({})
  const dirty = Object.keys(draft).length > 0
  const current = { ...entry.data, ...draft }

  useEffect(() => {
    function onLeave(event: BeforeUnloadEvent) {
      if (!dirty) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirty])

  const save = useMutation({
    mutationFn: () =>
      api(`/api/journal/${date}`, {
        method: 'PUT',
        body: JSON.stringify(current),
      }),
    onSuccess: () => {
      setDraft({})
      void queryClient.invalidateQueries({ queryKey: ['journal'] })
      void queryClient.invalidateQueries({ queryKey: ['journal-entry', date] })
    },
  })

  function changeDate(next: string) {
    if (dirty && !window.confirm('Leave without saving this entry?')) return
    setDate(next)
    setDraft({})
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div>
        <PageHeader
          title="Journal"
          lead="How were you thinking during this period of your life? This is for the future video, and for you."
        />
        <label className="mt-6 block max-w-xs" htmlFor="journal-date">
          <span className="mb-1 block text-xs text-[var(--muted)]">Date</span>
          <input
            id="journal-date"
            type="date"
            className="field"
            value={date}
            onChange={(e) => changeDate(e.target.value)}
          />
        </label>
        <div className="mt-6 space-y-4">
          <Field label="Mood" value={current.mood ?? ''} onChange={(v) => setDraft((d) => ({ ...d, mood: v }))} />
          <Area label="Note" value={current.content ?? ''} onChange={(v) => setDraft((d) => ({ ...d, content: v }))} />
          <Area label="Wins" value={current.wins ?? ''} onChange={(v) => setDraft((d) => ({ ...d, wins: v }))} />
          <Area label="Problems" value={current.problems ?? ''} onChange={(v) => setDraft((d) => ({ ...d, problems: v }))} />
          <Area label="Lessons" value={current.lessons ?? ''} onChange={(v) => setDraft((d) => ({ ...d, lessons: v }))} />
          <Area label="Reflection" value={current.reflection ?? ''} onChange={(v) => setDraft((d) => ({ ...d, reflection: v }))} />
        </div>
        <PrimaryButton className="mt-6" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save Entry'}
        </PrimaryButton>
      </div>
      <aside className="space-y-3">
        <div className="text-sm font-medium">Recent</div>
        {(!list.data || list.data.length === 0) && <p className="text-sm text-[var(--muted)]">No entries yet.</p>}
        {list.data?.map((item) => (
          <button
            key={item.date}
            type="button"
            onClick={() => changeDate(item.date)}
            className="block w-full border-t border-[var(--line)] py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            style={date === item.date ? { color: 'var(--accent)' } : undefined}
          >
            <div className="text-sm">
              {new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(`${item.date}T00:00:00`))}
            </div>
            <div className="truncate text-xs text-[var(--muted)]">{item.mood ?? item.content ?? 'Entry'}</div>
          </button>
        ))}
      </aside>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-xs text-[var(--muted)]">{label}</span>
      <input id={id} className="field" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-xs text-[var(--muted)]">{label}</span>
      <textarea id={id} className="field min-h-24" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
