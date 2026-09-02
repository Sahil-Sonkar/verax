import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { PrimaryButton } from './Dialog'
import type { JournalEntry } from '../types'

export function JournalThree({ date }: { date: string }) {
  const queryClient = useQueryClient()
  const entry = useQuery({
    queryKey: ['journal-entry', date],
    queryFn: () => api<JournalEntry>(`/api/journal/${date}`),
  })
  const [wins, setWins] = useState('')
  const [problems, setProblems] = useState('')
  const [lessons, setLessons] = useState('')

  useEffect(() => {
    if (!entry.data) return
    setWins(entry.data.wins ?? '')
    setProblems(entry.data.problems ?? '')
    setLessons(entry.data.lessons ?? '')
  }, [entry.data])

  const save = useMutation({
    mutationFn: () =>
      api(`/api/journal/${date}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...entry.data,
          wins,
          problems,
          lessons,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['journal-entry', date] })
      void queryClient.invalidateQueries({ queryKey: ['journal'] })
    },
  })

  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate()
      }}
    >
      <label className="block">
        <span className="mb-1 block text-xs text-[var(--muted)]">What went well?</span>
        <textarea className="field min-h-[4rem]" value={wins} onChange={(e) => setWins(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-[var(--muted)]">What could I improve?</span>
        <textarea className="field min-h-[4rem]" value={problems} onChange={(e) => setProblems(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-[var(--muted)]">Tomorrow’s #1?</span>
        <textarea className="field min-h-[4rem]" value={lessons} onChange={(e) => setLessons(e.target.value)} />
      </label>
      <PrimaryButton type="submit" disabled={save.isPending}>
        Save journal
      </PrimaryButton>
    </form>
  )
}
