import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError, getToken } from '../lib/api'
import { applyTheme } from '../lib/theme'
import { formatNumber } from '../lib/format'
import { useAuth } from '../lib/auth'
import { PrimaryButton } from '../components/Dialog'
import type { GoogleCalendarStatus, Habit, IntegrationCatalog, Metric, NotificationPrefs, Photo } from '../types'

export function SettingsPage() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const metrics = useQuery({ queryKey: ['metrics'], queryFn: () => api<Metric[]>('/api/metrics') })
  const catalog = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api<IntegrationCatalog>('/api/integrations'),
  })
  const habits = useQuery({ queryKey: ['habits'], queryFn: () => api<Habit[]>('/api/habits') })
  const prefs = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<NotificationPrefs>('/api/settings/notifications'),
  })
  const photos = useQuery({
    queryKey: ['photos'],
    queryFn: () => api<Photo[]>('/api/photos'),
  })
  const [metricName, setMetricName] = useState('')
  const [metricUnit, setMetricUnit] = useState('')
  const [metricValue, setMetricValue] = useState('')
  const [selectedMetric, setSelectedMetric] = useState<string>('')
  const [theme, setTheme] = useState(document.documentElement.classList.contains('light') ? 'light' : 'dark')

  const savePrefs = useMutation({
    mutationFn: (body: NotificationPrefs) =>
      api('/api/settings/notifications', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <div className="space-y-10">
      <div>
        <p className="kicker">Account</p>
        <h1 className="mt-2 text-5xl tracking-tight">{user?.name}</h1>
        <p className="mt-2 text-[15px] text-[var(--muted)]">{user?.email}</p>
      </div>

      <section className="border-t border-[var(--line)] pt-6">
        <h2 className="text-2xl tracking-tight">Appearance</h2>
        <div className="segmented mt-3">
          {['dark', 'light'].map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={theme === mode}
              onClick={() => {
                setTheme(mode)
                applyTheme(mode as 'light' | 'dark')
              }}
              className="chip capitalize"
            >
              {mode}
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--line)] pt-6">
        <h2 className="text-2xl tracking-tight">Connected apps</h2>
        <p className="mt-1 max-w-[65ch] text-sm text-[var(--muted)]">
          Verax will not scrape Garmin, banks, Cult Fit, or Lyfta, and will not store those passwords. Live Google Health and Kite Connect need developer credentials. Until then, paste a number you already have. If a habit is linked to that metric, Today marks itself.
        </p>
        <GoogleCalendarCard />
        <div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {catalog.data?.providers.map((provider) => (
            <div key={provider.key} className="py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-medium">{provider.name}</div>
                <div className="text-xs text-[var(--muted)]">{statusLabel(provider.status)}</div>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">{provider.tracks}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{provider.detail}</p>
            </div>
          ))}
        </div>
        <IngestForm habits={habits.data ?? []} />
      </section>

      <section className="border-t border-[var(--line)] pt-6">
        <h2 className="text-2xl tracking-tight">Metrics</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Numbers that are not habits. Log here or from Connected apps.</p>
        <div className="mt-4 space-y-2">
          {metrics.data?.length === 0 && <p className="text-sm text-[var(--muted)]">No metrics yet.</p>}
          {metrics.data?.map((metric) => (
            <div key={metric.id} className="flex justify-between text-sm">
              <span>{metric.name}</span>
              <span className="tabular text-[var(--muted)]">{formatNumber(metric.latestValue, metric.unit)}</span>
            </div>
          ))}
        </div>
        <form
          className="mt-4 grid gap-3 md:grid-cols-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!selectedMetric && metricName) {
              const created = await api<Metric>('/api/metrics', {
                method: 'POST',
                body: JSON.stringify({ name: metricName, unit: metricUnit }),
              })
              setSelectedMetric(created.id)
            }
            const id = selectedMetric
            if (id && metricValue) {
              await api(`/api/metrics/${id}/entries`, {
                method: 'POST',
                body: JSON.stringify({ date: new Intl.DateTimeFormat('en-CA').format(new Date()), value: Number(metricValue) }),
              })
              void queryClient.invalidateQueries({ queryKey: ['metrics'] })
              setMetricValue('')
            }
          }}
        >
          <label className="block" htmlFor="metric-select">
            <span className="mb-1 block text-xs text-[var(--muted)]">Metric</span>
            <select id="metric-select" className="field" value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)} autoComplete="off">
              <option value="">New metric</option>
              {metrics.data?.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          {!selectedMetric && (
            <>
              <label className="block" htmlFor="metric-name">
                <span className="mb-1 block text-xs text-[var(--muted)]">Name</span>
                <input id="metric-name" className="field" placeholder="Weight…" value={metricName} onChange={(e) => setMetricName(e.target.value)} autoComplete="off" />
              </label>
              <label className="block" htmlFor="metric-unit">
                <span className="mb-1 block text-xs text-[var(--muted)]">Unit</span>
                <input id="metric-unit" className="field" placeholder="kg…" value={metricUnit} onChange={(e) => setMetricUnit(e.target.value)} autoComplete="off" />
              </label>
            </>
          )}
          <label className="block" htmlFor="metric-value">
            <span className="mb-1 block text-xs text-[var(--muted)]">Today’s value</span>
            <input id="metric-value" className="field" placeholder="79.4…" inputMode="decimal" value={metricValue} onChange={(e) => setMetricValue(e.target.value)} autoComplete="off" />
          </label>
          <PrimaryButton type="submit" className="self-end">Log Value</PrimaryButton>
        </form>
      </section>

      <section className="border-t border-[var(--line)] pt-6">
        <h2 className="text-2xl tracking-tight">Progress photos</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Body, hair, face. A record, not a diagnosis.</p>
        <form
          className="mt-4 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault()
            const form = event.currentTarget
            const data = new FormData(form)
            await api('/api/photos', { method: 'POST', body: data })
            void queryClient.invalidateQueries({ queryKey: ['photos'] })
            form.reset()
          }}
        >
          <label className="block" htmlFor="photo-file">
            <span className="mb-1 block text-xs text-[var(--muted)]">Photo</span>
            <input id="photo-file" type="file" name="file" accept="image/*" required />
          </label>
          <input type="hidden" name="kind" value="PROGRESS_PHOTO" />
          <label className="block max-w-xs" htmlFor="photo-cat">
            <span className="mb-1 block text-xs text-[var(--muted)]">Category</span>
            <select id="photo-cat" name="category" className="field" autoComplete="off">
              <option value="BODY">Body</option>
              <option value="HAIR">Hair</option>
              <option value="FACE">Face</option>
            </select>
          </label>
          <PrimaryButton type="submit">Upload Photo</PrimaryButton>
        </form>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {photos.data?.map((photo) => (
            <AuthImage key={photo.id} src={photo.url} alt={photo.category ?? 'progress'} />
          ))}
        </div>
      </section>

      {prefs.data && (
        <NotificationSection prefs={prefs.data} onSave={(body) => savePrefs.mutate(body)} />
      )}

      <button
        type="button"
        onClick={logout}
        className="text-sm text-[var(--danger)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        Sign Out
      </button>
    </div>
  )
}

function GoogleCalendarCard() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const status = useQuery({
    queryKey: ['google-calendar'],
    queryFn: () => api<GoogleCalendarStatus>('/api/calendar/google'),
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const consumed = useRef(false)

  useEffect(() => {
    const denied = params.get('error')
    const code = params.get('code')
    const oauthState = params.get('state')
    if (denied) {
      setError('Google Calendar access was not granted.')
      setParams({}, { replace: true })
      return
    }
    if (!code || !oauthState || consumed.current) return
    consumed.current = true
    setBusy(true)
    void api<GoogleCalendarStatus>('/api/calendar/google/callback', {
      method: 'POST',
      body: JSON.stringify({
        code,
        state: oauthState,
        redirectUri: `${window.location.origin}/settings`,
      }),
    })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['google-calendar'] })
        void queryClient.invalidateQueries({ queryKey: ['routine-week'] })
        void queryClient.invalidateQueries({ queryKey: ['google-calendar-events'] })
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not connect Google Calendar.'))
      .finally(() => {
        setBusy(false)
        setParams({}, { replace: true })
      })
  }, [params, queryClient, setParams])

  async function connect() {
    setBusy(true)
    setError('')
    try {
      const redirectUri = `${window.location.origin}/settings`
      const next = await api<{ url: string }>(`/api/calendar/google/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`)
      window.location.assign(next.url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start Google Calendar connect.')
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-[var(--line)] px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-medium">Google Calendar</div>
        <div className="text-xs text-[var(--muted)]">
          {status.data?.connected ? 'Connected' : status.data?.configured ? 'Ready' : 'Needs credentials'}
        </div>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Two-way sync of routine blocks. Edits in Verax or Google move together. Other dated events show on the week grid
        without becoming a repeating block.
      </p>
      {status.data?.connected && (
        <p className="mt-1 text-sm text-[var(--muted)]">
          {status.data.email}
          {status.data.lastSyncedAt ? ` · last sync ${new Date(status.data.lastSyncedAt).toLocaleString()}` : ''}
        </p>
      )}
      {status.data?.lastError && <p className="mt-1 text-sm text-[var(--danger)]">{status.data.lastError}</p>}
      {error && (
        <p className="mt-1 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {status.data?.connected ? (
          <>
            <PrimaryButton
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setError('')
                try {
                  await api('/api/calendar/google/sync', { method: 'POST' })
                  void queryClient.invalidateQueries({ queryKey: ['google-calendar'] })
                  void queryClient.invalidateQueries({ queryKey: ['routine-week'] })
                  void queryClient.invalidateQueries({ queryKey: ['google-calendar-events'] })
                } catch (err) {
                  setError(err instanceof ApiError ? err.message : 'Sync failed.')
                } finally {
                  setBusy(false)
                }
              }}
            >
              {busy ? 'Working…' : 'Sync now'}
            </PrimaryButton>
            <button
              type="button"
              className="text-sm text-[var(--danger)]"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await api('/api/calendar/google', { method: 'DELETE' })
                  void queryClient.invalidateQueries({ queryKey: ['google-calendar'] })
                  void queryClient.invalidateQueries({ queryKey: ['google-calendar-events'] })
                } finally {
                  setBusy(false)
                }
              }}
            >
              Disconnect
            </button>
          </>
        ) : (
          <PrimaryButton type="button" disabled={busy || status.data?.configured === false} onClick={() => void connect()}>
            {busy ? 'Connecting…' : 'Connect Google Calendar'}
          </PrimaryButton>
        )}
      </div>
      {status.data && !status.data.configured && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, enable the Calendar API, and add {typeof window === 'undefined' ? '/settings' : `${window.location.origin}/settings`} as an authorized redirect URI.
        </p>
      )}
    </div>
  )
}

function statusLabel(status: string) {
  switch (status) {
    case 'READY':
      return 'Ready'
    case 'COMING_SOON':
      return 'Coming soon'
    case 'NEEDS_PARTNER':
      return 'Needs partner access'
    case 'NEEDS_CREDENTIALS':
      return 'Needs your API keys'
    case 'MANUAL':
      return 'Paste a reading'
    default:
      return status.toLowerCase().replaceAll('_', ' ')
  }
}

function IngestForm({ habits }: { habits: Habit[] }) {
  const queryClient = useQueryClient()
  const [provider, setProvider] = useState('MANUAL')
  const [metricName, setMetricName] = useState('Steps')
  const [unit, setUnit] = useState('steps')
  const [value, setValue] = useState('')
  const [habitId, setHabitId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <form
      className="mt-6 grid gap-3 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
          await api('/api/integrations/ingest', {
            method: 'POST',
            body: JSON.stringify({
              provider,
              metricName,
              unit,
              date: new Intl.DateTimeFormat('en-CA').format(new Date()),
              value: Number(value),
              habitId: habitId || undefined,
            }),
          })
          setValue('')
          void queryClient.invalidateQueries({ queryKey: ['metrics'] })
          void queryClient.invalidateQueries({ queryKey: ['today'] })
          void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not log that reading.')
        } finally {
          setBusy(false)
        }
      }}
    >
      <label className="block" htmlFor="ingest-provider">
        <span className="mb-1 block text-xs text-[var(--muted)]">Source</span>
        <select id="ingest-provider" className="field" value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="MANUAL">Paste a reading</option>
          <option value="GOOGLE_HEALTH">Google Health / Fitbit</option>
          <option value="GARMIN">Garmin</option>
          <option value="ZERODHA">Zerodha</option>
          <option value="ACCOUNT_AGGREGATOR">Bank / net worth</option>
          <option value="LYFTA">Lyfta</option>
          <option value="CULT_FIT">Cult Fit</option>
        </select>
      </label>
      <label className="block" htmlFor="ingest-metric">
        <span className="mb-1 block text-xs text-[var(--muted)]">Metric name</span>
        <input
          id="ingest-metric"
          className="field"
          list="ingest-metric-names"
          value={metricName}
          onChange={(e) => setMetricName(e.target.value)}
          required
        />
        <datalist id="ingest-metric-names">
          <option value="Steps" />
          <option value="Sleep hours" />
          <option value="Workout minutes" />
          <option value="Invested capital" />
          <option value="Net worth" />
        </datalist>
      </label>
      <label className="block" htmlFor="ingest-unit">
        <span className="mb-1 block text-xs text-[var(--muted)]">Unit</span>
        <input id="ingest-unit" className="field" value={unit} onChange={(e) => setUnit(e.target.value)} />
      </label>
      <label className="block" htmlFor="ingest-value">
        <span className="mb-1 block text-xs text-[var(--muted)]">Today’s value</span>
        <input
          id="ingest-value"
          className="field"
          inputMode="decimal"
          placeholder="8000…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
      </label>
      <label className="block md:col-span-2" htmlFor="ingest-habit">
        <span className="mb-1 block text-xs text-[var(--muted)]">Also mark this habit done (optional)</span>
        <select id="ingest-habit" className="field" value={habitId} onChange={(e) => setHabitId(e.target.value)}>
          <option value="">Linked metric only</option>
          {habits.map((habit) => (
            <option key={habit.id} value={habit.id}>
              {habit.name}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="text-sm text-[var(--danger)] md:col-span-2" role="alert">
          {error}
        </p>
      )}
      <PrimaryButton type="submit" disabled={busy} className="self-end">
        {busy ? 'Saving…' : 'Log Reading'}
      </PrimaryButton>
    </form>
  )
}

function NotificationSection({
  prefs,
  onSave,
}: {
  prefs: NotificationPrefs
  onSave: (prefs: NotificationPrefs) => void
}) {
  const rows = [
    ['morningReminder', 'Morning reminder'],
    ['eveningCheckin', 'Evening check-in'],
    ['weeklyReview', 'Weekly review'],
    ['goalMilestone', 'Goal milestone'],
    ['streakMilestone', 'Streak milestone'],
  ] as const
  return (
    <section className="border-t border-[var(--line)] pt-6">
      <h2 className="text-2xl tracking-tight">Reminders</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Configurable now. Delivery comes later.</p>
      <div className="mt-4 space-y-2 text-sm">
        {rows.map(([key, label]) => (
          <label key={key} className="flex items-center justify-between">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={(e) => onSave({ ...prefs, [key]: e.target.checked })}
            />
          </label>
        ))}
      </div>
    </section>
  )
}

function AuthImage({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const token = getToken()
    let objectUrl: string | undefined
    fetch(src, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((response) => response.blob())
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => undefined)
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])
  if (!url) return <div className="aspect-[3/4] rounded-lg bg-[var(--surface-2)]" />
  return (
    <img
      src={url}
      alt={alt}
      width={300}
      height={400}
      loading="lazy"
      className="aspect-[3/4] rounded-lg object-cover"
    />
  )
}
