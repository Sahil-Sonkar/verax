import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, PrimaryButton } from '../components/Dialog'
import { AddButton, TrashButton } from '../components/IconButtons'
import { MonoLine } from '../components/mono/MonoLine'
import { PageHeader, PageTabs } from '../components/PageHeader'
import { api } from '../lib/api'
import type { ContentIdea, ContentPhase, ContentPlatform, PlatformStats } from '../types'

const TABS = [
  { id: 'social', label: 'Social' },
  { id: 'content', label: 'Content' },
] as const

const TRACKS: { id: ContentPlatform; label: string }[] = [
  { id: 'YOUTUBE', label: 'YouTube' },
  { id: 'INSTAGRAM', label: 'Instagram' },
  { id: 'LINKEDIN', label: 'LinkedIn' },
]

const PHASES: { id: ContentPhase; label: string }[] = [
  { id: 'IDEA', label: 'IDEA' },
  { id: 'HAPPENED', label: 'What happened' },
  { id: 'LEARNED', label: 'What I learned' },
  { id: 'PLATFORM', label: 'Potential platform' },
  { id: 'HOOK', label: 'Potential hook' },
]

type Tab = (typeof TABS)[number]['id']

function iso(date: Date) {
  return new Intl.DateTimeFormat('en-CA').format(date)
}

function monthsBack(months: number) {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return iso(date)
}

function formatNum(value?: number) {
  if (value == null) return '—'
  return value.toLocaleString('en-IN', { maximumFractionDigits: 1 })
}

export function VoicePage() {
  const [tab, setTab] = useState<Tab>('social')
  return (
    <div className="page">
      <PageHeader
        kicker="Public"
        title="Voice"
        lead="Life is the raw material. Stats from YouTube, Instagram, and LinkedIn. Ideas move through a track until they have a hook."
      />
      <PageTabs label="Voice" value={tab} items={TABS} onChange={setTab} />
      {tab === 'social' ? <SocialStats /> : <ContentBoard />}
    </div>
  )
}

function SocialStats() {
  const queryClient = useQueryClient()
  const from = monthsBack(6)
  const to = iso(new Date())
  const stats = useQuery({
    queryKey: ['voice-stats', from, to],
    queryFn: () => api<PlatformStats[]>(`/api/voice/stats?from=${from}&to=${to}`),
  })
  const [importing, setImporting] = useState<PlatformStats | null>(null)

  if (stats.isLoading) return <div className="skeleton h-64" aria-busy="true" aria-label="Loading social stats" />
  if (stats.isError) return <p role="alert">Could not load social stats.</p>

  return (
    <div className="space-y-10">
      {(stats.data ?? []).map((platform) => {
        const headline = platform.metrics[0]
        const points = (headline?.series ?? []).map((row) => ({
          label: new Date(row.date + 'T00:00:00').toLocaleString(undefined, { month: 'short', day: 'numeric' }),
          value: row.value,
        }))
        return (
          <section key={platform.platform} className="card p-4 lg:p-5">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-2xl tracking-tight">{platform.label}</h2>
              <button
                type="button"
                className="text-sm text-[var(--accent)] hover:opacity-80"
                onClick={() => setImporting(platform)}
              >
                Import
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {platform.metrics.map((metric) => (
                <div key={metric.key} className="border-t border-[var(--line)] pt-3">
                  <div className="text-xs text-[var(--muted)]">{metric.name.replace(platform.label + ' ', '')}</div>
                  <div className="mt-1 text-2xl tabular tracking-tight">{formatNum(metric.latest)}</div>
                  <div className="text-[11px] text-[var(--muted)]">{metric.unit}</div>
                </div>
              ))}
            </div>
            {points.length > 1 && (
              <div className="mt-4">
                <MonoLine data={points} format={(value) => formatNum(value)} />
              </div>
            )}
          </section>
        )
      })}
      {importing && (
        <ImportDialog
          platform={importing}
          onClose={() => setImporting(null)}
          onSaved={() => {
            setImporting(null)
            void queryClient.invalidateQueries({ queryKey: ['voice-stats'] })
          }}
        />
      )}
    </div>
  )
}

function ImportDialog({
  platform,
  onClose,
  onSaved,
}: {
  platform: PlatformStats
  onClose: () => void
  onSaved: () => void
}) {
  const [date, setDate] = useState(iso(new Date()))
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <Dialog title={`Import ${platform.label}`} onClose={onClose}>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault()
          const parsed: Record<string, number> = {}
          for (const metric of platform.metrics) {
            const raw = values[metric.key]
            if (!raw) continue
            const num = Number(raw)
            if (!Number.isFinite(num)) {
              setError(`Check ${metric.name}`)
              return
            }
            parsed[metric.key] = num
          }
          if (Object.keys(parsed).length === 0) {
            setError('Add at least one number from Insights.')
            return
          }
          setBusy(true)
          try {
            await api('/api/voice/stats', {
              method: 'POST',
              body: JSON.stringify({ platform: platform.platform, date, values: parsed }),
            })
            onSaved()
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not import.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="text-sm text-[var(--muted)]">
          Paste numbers from {platform.label} Insights. OAuth is not wired; this is the import.
        </p>
        <label className="block" htmlFor="voice-date">
          <span className="mb-1 block text-xs text-[var(--muted)]">Date</span>
          <input id="voice-date" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {platform.metrics.map((metric) => (
          <label key={metric.key} className="block" htmlFor={`voice-${metric.key}`}>
            <span className="mb-1 block text-xs text-[var(--muted)]">
              {metric.name}
              {metric.unit ? ` (${metric.unit})` : ''}
            </span>
            <input
              id={`voice-${metric.key}`}
              className="field"
              inputMode="decimal"
              value={values[metric.key] ?? ''}
              onChange={(e) => setValues((current) => ({ ...current, [metric.key]: e.target.value }))}
              autoComplete="off"
            />
          </label>
        ))}
        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end pt-2">
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save snapshot'}
          </PrimaryButton>
        </div>
      </form>
    </Dialog>
  )
}

function ContentBoard() {
  const queryClient = useQueryClient()
  const [track, setTrack] = useState<ContentPlatform>('YOUTUBE')
  const [editing, setEditing] = useState<ContentIdea | 'new' | null>(null)
  const ideas = useQuery({
    queryKey: ['voice-ideas', track],
    queryFn: () => api<ContentIdea[]>(`/api/voice/ideas?platform=${track}`),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/voice/ideas/${id}`, { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['voice-ideas'] }),
  })

  const grouped = useMemo(() => {
    const map = new Map<ContentPhase, ContentIdea[]>()
    for (const phase of PHASES) map.set(phase.id, [])
    for (const idea of ideas.data ?? []) {
      map.get(idea.phase)?.push(idea)
    }
    return map
  }, [ideas.data])

  return (
    <div>
      <div className="mt-3 flex flex-col gap-4 min-[720px]:flex-row min-[720px]:items-end min-[720px]:justify-between">
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Platform track">
          {TRACKS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={track === item.id}
              className={`shrink-0 px-3 py-2 text-[13px] ${
                track === item.id ? 'text-[var(--fg)] shadow-[inset_0_-2px_0_var(--fg)]' : 'text-[var(--muted)]'
              }`}
              onClick={() => setTrack(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <AddButton label="Add idea" variant="primary" onClick={() => setEditing('new')} />
      </div>
      {ideas.isLoading ? (
        <div className="mt-6 skeleton h-48" />
      ) : (
        <div className="mt-6 grid gap-8 min-[720px]:flex min-[720px]:gap-4 min-[720px]:overflow-x-auto min-[720px]:pb-4">
          {PHASES.map((phase) => {
            const rows = grouped.get(phase.id) ?? []
            return (
              <section key={phase.id} className="min-w-0 min-[720px]:w-[220px] min-[720px]:shrink-0">
                <h3 className="text-xs tracking-wide text-[var(--muted)]">{phase.label}</h3>
                <div className="mt-3 space-y-3">
                  {rows.length === 0 && <p className="text-xs text-[var(--muted)]">Empty</p>}
                  {rows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      className="block w-full border-t border-[var(--line)] pt-3 text-left"
                      onClick={() => setEditing(row)}
                    >
                      <div className="text-[15px] leading-snug">{row.idea}</div>
                      {row.hook ? <div className="mt-1 truncate text-xs text-[var(--muted)]">{row.hook}</div> : null}
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
      {editing && (
        <IdeaForm
          track={track}
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void queryClient.invalidateQueries({ queryKey: ['voice-ideas'] })
          }}
          onDelete={
            editing === 'new'
              ? undefined
              : () => {
                  if (window.confirm('Delete this idea?')) {
                    remove.mutate(editing.id)
                    setEditing(null)
                  }
                }
          }
        />
      )}
    </div>
  )
}

function IdeaForm({
  track,
  initial,
  onClose,
  onSaved,
  onDelete,
}: {
  track: ContentPlatform
  initial: ContentIdea | null
  onClose: () => void
  onSaved: () => void
  onDelete?: () => void
}) {
  const [idea, setIdea] = useState(initial?.idea ?? '')
  const [happened, setHappened] = useState(initial?.happened ?? '')
  const [learned, setLearned] = useState(initial?.learned ?? '')
  const [potentialPlatform, setPotentialPlatform] = useState(initial?.potentialPlatform ?? '')
  const [hook, setHook] = useState(initial?.hook ?? '')
  const [phase, setPhase] = useState<ContentPhase>(initial?.phase ?? 'IDEA')
  const [platform, setPlatform] = useState<ContentPlatform>(initial?.platform ?? track)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <Dialog
      title={initial ? 'Edit idea' : 'New idea'}
      onClose={onClose}
      action={onDelete ? <TrashButton label="Delete idea" onClick={onDelete} /> : undefined}
    >
      <form
        className="mt-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          try {
            await api(initial ? `/api/voice/ideas/${initial.id}` : '/api/voice/ideas', {
              method: initial ? 'PATCH' : 'POST',
              body: JSON.stringify({ platform, phase, idea, happened, learned, potentialPlatform, hook }),
            })
            onSaved()
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <label className="block" htmlFor="idea-track">
          <span className="mb-1 block text-xs text-[var(--muted)]">Track</span>
          <select
            id="idea-track"
            className="field"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as ContentPlatform)}
          >
            {TRACKS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block" htmlFor="idea-phase">
          <span className="mb-1 block text-xs text-[var(--muted)]">Phase</span>
          <select id="idea-phase" className="field" value={phase} onChange={(e) => setPhase(e.target.value as ContentPhase)}>
            {PHASES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block" htmlFor="idea-idea">
          <span className="mb-1 block text-xs text-[var(--muted)]">IDEA</span>
          <textarea id="idea-idea" className="field min-h-20" value={idea} onChange={(e) => setIdea(e.target.value)} required />
        </label>
        <label className="block" htmlFor="idea-happened">
          <span className="mb-1 block text-xs text-[var(--muted)]">What happened</span>
          <textarea id="idea-happened" className="field min-h-16" value={happened} onChange={(e) => setHappened(e.target.value)} />
        </label>
        <label className="block" htmlFor="idea-learned">
          <span className="mb-1 block text-xs text-[var(--muted)]">What I learned</span>
          <textarea id="idea-learned" className="field min-h-16" value={learned} onChange={(e) => setLearned(e.target.value)} />
        </label>
        <label className="block" htmlFor="idea-platform">
          <span className="mb-1 block text-xs text-[var(--muted)]">Potential platform</span>
          <input
            id="idea-platform"
            className="field"
            value={potentialPlatform}
            onChange={(e) => setPotentialPlatform(e.target.value)}
            placeholder="YouTube + Instagram"
            autoComplete="off"
          />
        </label>
        <label className="block" htmlFor="idea-hook">
          <span className="mb-1 block text-xs text-[var(--muted)]">Potential hook</span>
          <textarea id="idea-hook" className="field min-h-16" value={hook} onChange={(e) => setHook(e.target.value)} />
        </label>
        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end pt-2">
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </PrimaryButton>
        </div>
      </form>
    </Dialog>
  )
}
