import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { ColorSwatches } from '../components/ColorSwatches'
import { Dialog, PrimaryButton } from '../components/Dialog'
import { AddButton, TrashButton } from '../components/IconButtons'
import { RoutineCalendar } from '../components/RoutineCalendar'
import { Sectograph } from '../components/Sectograph'
import { TimeField } from '../components/TimeField'
import { WeekdayChips } from '../components/WeekdayChips'
import { api } from '../lib/api'
import { formatClock, isoWeekday, parseClock, toTimeInput, WEEKDAY_LABELS } from '../lib/weekdays'
import type { GoogleCalendarEvent, GoogleCalendarStatus, RoutineBlock, RoutineDay, RoutineTask, RoutineWeek } from '../types'

export function RoutinePage() {
  const queryClient = useQueryClient()
  const [weekday, setWeekday] = useState(isoWeekday())
  const week = useQuery({ queryKey: ['routine-week'], queryFn: () => api<RoutineWeek>('/api/routine/week') })
  const googleCal = useQuery({ queryKey: ['google-calendar'], queryFn: () => api<GoogleCalendarStatus>('/api/calendar/google') })
  const [open, setOpen] = useState<RoutineBlock | null>(null)
  const [create, setCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('06:00')
  const [end, setEnd] = useState('06:20')
  const [days, setDays] = useState<number[]>([weekday])
  const [allWeek, setAllWeek] = useState(false)
  const [color, setColor] = useState('#0095f6')
  const [editTitle, setEditTitle] = useState('')
  const [editStart, setEditStart] = useState('06:00')
  const [editEnd, setEditEnd] = useState('06:20')
  const [editDays, setEditDays] = useState<number[]>([])
  const [editAllWeek, setEditAllWeek] = useState(false)
  const [editColor, setEditColor] = useState('#0095f6')
  const [taskName, setTaskName] = useState('')
  const [taskDays, setTaskDays] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [hour12, setHour12] = useState(() => localStorage.getItem('verax.routine.hour12') === '1')
  const [view, setView] = useState<'day' | 'week' | 'month'>(() => {
    const stored = localStorage.getItem('verax.routine.view')
    return stored === 'week' || stored === 'month' ? stored : 'day'
  })
  const [cursor, setCursor] = useState(() => new Date())
  const overlayRange = useMemo(() => {
    if (view === 'month') {
      return {
        from: format(startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: format(endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      }
    }
    return {
      from: format(startOfWeek(cursor, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      to: format(endOfWeek(cursor, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    }
  }, [cursor, view])
  const googleEvents = useQuery({
    queryKey: ['google-calendar-events', overlayRange.from, overlayRange.to],
    queryFn: () => api<{ events: GoogleCalendarEvent[] }>(`/api/calendar/google/events?from=${overlayRange.from}&to=${overlayRange.to}`),
    enabled: !!googleCal.data?.connected && view !== 'day',
  })

  useEffect(() => {
    if (!googleCal.data?.connected) return
    const last = googleCal.data.lastSyncedAt ? Date.parse(googleCal.data.lastSyncedAt) : 0
    if (Date.now() - last < 5 * 60 * 1000) return
    void api<GoogleCalendarStatus>('/api/calendar/google/sync', { method: 'POST' })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['routine-week'] })
        void queryClient.invalidateQueries({ queryKey: ['google-calendar'] })
        void queryClient.invalidateQueries({ queryKey: ['google-calendar-events'] })
      })
      .catch(() => undefined)
  }, [googleCal.data?.connected, googleCal.data?.lastSyncedAt, queryClient])

  function setClock(next: boolean) {
    setHour12(next)
    localStorage.setItem('verax.routine.hour12', next ? '1' : '0')
  }

  function setCalView(next: 'day' | 'week' | 'month') {
    if (view === 'day' && next !== 'day') {
      setCursor(addDays(startOfWeek(cursor, { weekStartsOn: 1 }), weekday - 1))
    }
    setView(next)
    localStorage.setItem('verax.routine.view', next)
  }

  function pickDate(next: Date) {
    setCursor(next)
    setWeekday(isoWeekday(next))
  }

  const day: RoutineDay | undefined = useMemo(
    () => week.data?.days.find((row) => row.weekday === weekday),
    [week.data, weekday],
  )
  const blocks = day?.blocks ?? []

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['routine-week'] })
    await queryClient.invalidateQueries({ queryKey: ['google-calendar-events'] })
  }

  async function syncGoogle() {
    await api('/api/calendar/google/sync', { method: 'POST' })
    await queryClient.invalidateQueries({ queryKey: ['google-calendar'] })
    await refresh()
  }

  async function moveBlock(block: RoutineBlock, next: { startMin: number; endMin: number }) {
    queryClient.setQueryData<RoutineWeek>(['routine-week'], (prev) => {
      if (!prev) return prev
      return {
        days: prev.days.map((day) => ({
          ...day,
          blocks: day.blocks.map((row) => (row.id === block.id ? { ...row, ...next } : row)),
        })),
      }
    })
    if (open?.id === block.id) {
      setOpen({ ...open, startMin: next.startMin, endMin: next.endMin })
      setEditStart(toTimeInput(next.startMin))
      setEditEnd(toTimeInput(next.endMin))
    }
    try {
      await api(`/api/routine/blocks/${block.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ startMin: next.startMin, endMin: next.endMin }),
      })
    } finally {
      await refresh()
    }
  }

  function openCreate(slot?: { weekday: number; startMin: number; endMin: number }) {
    setOpen(null)
    if (slot) {
      setStart(toTimeInput(slot.startMin))
      setEnd(toTimeInput(slot.endMin))
      setDays([slot.weekday])
      setAllWeek(false)
    } else {
      setDays([weekday])
    }
    setCreate(true)
  }

  function selectBlock(block: RoutineBlock) {
    setCreate(false)
    setOpen(block)
    setEditTitle(block.title)
    setEditStart(toTimeInput(block.startMin))
    setEditEnd(toTimeInput(block.endMin))
    setEditDays(block.weekdays)
    setEditAllWeek(block.weekdays.length === 7)
    setEditColor(block.color || '#0095f6')
    setTaskName('')
    setTaskDays([])
  }

  async function saveBlock() {
    if (!open) return
    const startMin = parseClock(editStart)
    const endMin = parseClock(editEnd)
    if (startMin == null || endMin == null || !editTitle.trim()) return
    setSaving(true)
    try {
      const updated = await api<RoutineBlock>(`/api/routine/blocks/${open.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle.trim(),
          startMin,
          endMin,
          weekdays: editAllWeek ? [1, 2, 3, 4, 5, 6, 7] : editDays,
          allWeek: editAllWeek,
          color: editColor,
        }),
      })
      setOpen(updated)
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  async function saveTask(task: RoutineTask, patch: { name?: string; weekdays?: number[] }) {
    if (!open) return
    const updated = await api<RoutineTask>(`/api/routine/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: patch.name ?? task.name,
        weekdays: patch.weekdays ?? task.weekdays,
      }),
    })
    setOpen({
      ...open,
      tasks: open.tasks
        .map((row) => (row.id === task.id ? updated : row))
        .filter((row) => row.weekdays.length === 0 || row.weekdays.includes(weekday)),
    })
    await refresh()
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Week</p>
          <h1 className="mt-2 text-5xl tracking-tight">Routine</h1>
          <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-[var(--muted)]">
            One line per block. Day is the clock. Week and month are a calendar of the same repeating week
            {googleCal.data?.connected ? ` · two-way with ${googleCal.data.email ?? 'Google Calendar'}` : ''}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[var(--line)] p-0.5">
            {(['day', 'week', 'month'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={view === option ? 'glass-primary px-3 py-1.5 text-sm capitalize' : 'px-3 py-1.5 text-sm capitalize text-[var(--muted)]'}
                onClick={() => setCalView(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-[var(--line)] p-0.5">
            <button
              type="button"
              className={!hour12 ? 'glass-primary px-3 py-1.5 text-sm' : 'px-3 py-1.5 text-sm text-[var(--muted)]'}
              onClick={() => setClock(false)}
            >
              24h
            </button>
            <button
              type="button"
              className={hour12 ? 'glass-primary px-3 py-1.5 text-sm' : 'px-3 py-1.5 text-sm text-[var(--muted)]'}
              onClick={() => setClock(true)}
            >
              12h
            </button>
          </div>
          <AddButton label="Add block" variant="primary" onClick={() => openCreate()} />
          {googleCal.data?.connected && (
            <button type="button" className="glass-btn px-3 py-1.5 text-sm" onClick={() => void syncGoogle()}>
              Sync Google
            </button>
          )}
        </div>
      </div>

      {view === 'day' && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_LABELS.map((label, index) => {
              const dayNumber = index + 1
              return (
                <button
                  key={label}
                  type="button"
                  className={dayNumber === weekday ? 'glass-primary px-3 py-1.5 text-sm' : 'glass-btn px-3 py-1.5 text-sm'}
                  onClick={() => setWeekday(dayNumber)}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="grid gap-10 xl:grid-cols-[minmax(0,420px)_1fr] xl:items-start">
            <Sectograph hour12={hour12} blocks={blocks} activeId={open?.id} onSelect={(id) => {
              const block = blocks.find((row) => row.id === id)
              if (block) selectBlock(block)
            }} />
            <ol className="divide-y divide-[var(--line)]">
              {blocks.length === 0 && <li className="py-6 text-sm text-[var(--muted)]">No blocks this day.</li>}
              {blocks.map((block) => (
                <li key={block.id}>
                  <button type="button" className="flex w-full items-center justify-between gap-4 py-3 text-left" onClick={() => selectBlock(block)}>
                    <span className="color-swatch shrink-0" style={{ background: block.color || '#0095f6' }} />
                    <span className="tabular text-sm text-[var(--muted)]">{formatClock(block.startMin, hour12)}</span>
                    <span className="flex-1 text-base">{block.title}</span>
                    {block.tasks.length > 0 && <span className="text-xs text-[var(--muted)]">{block.tasks.length}</span>}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {view !== 'day' && (
        <RoutineCalendar
          mode={view}
          cursor={cursor}
          weekday={weekday}
          days={week.data?.days ?? []}
          hour12={hour12}
          activeId={open?.id}
          onCursor={pickDate}
          onWeekday={setWeekday}
          onSelect={selectBlock}
          onCreateSlot={openCreate}
          onMove={moveBlock}
          externals={googleEvents.data?.events ?? []}
        />
      )}

      {open && (
        <Dialog title="Edit block" onClose={() => setOpen(null)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              await saveBlock()
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Name</span>
              <input className="field" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--muted)]">Start</span>
                <TimeField hour12={hour12} value={editStart} onChange={setEditStart} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--muted)]">End</span>
                <TimeField hour12={hour12} value={editEnd} onChange={setEditEnd} />
              </label>
            </div>
            <ColorSwatches value={editColor} onChange={setEditColor} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editAllWeek} onChange={(event) => setEditAllWeek(event.target.checked)} />
              Whole week
            </label>
            {!editAllWeek && (
              <div>
                <div className="mb-1 text-xs text-[var(--muted)]">Days</div>
                <WeekdayChips value={editDays} onChange={setEditDays} />
              </div>
            )}
            <div className="flex justify-end">
              <PrimaryButton type="submit" disabled={saving}>
                Save block
              </PrimaryButton>
            </div>
          </form>

          <div className="mt-6 space-y-2">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Subtasks</div>
            {open.tasks.length === 0 && <p className="text-sm text-[var(--muted)]">No subtasks on this day.</p>}
            {open.tasks.map((task) => (
              <TaskEditor
                key={task.id}
                task={task}
                onSave={(patch) => void saveTask(task, patch)}
                onRemove={async () => {
                  await api(`/api/routine/tasks/${task.id}`, { method: 'DELETE' })
                  setOpen({ ...open, tasks: open.tasks.filter((row) => row.id !== task.id) })
                  await refresh()
                }}
              />
            ))}
          </div>

          <form
            className="mt-5 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              const task = await api<RoutineTask>(`/api/routine/blocks/${open.id}/tasks`, {
                method: 'POST',
                body: JSON.stringify({ name: taskName, weekdays: taskDays }),
              })
              setTaskName('')
              setOpen({ ...open, tasks: [...open.tasks, task] })
              await refresh()
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">New subtask</span>
              <input className="field" value={taskName} onChange={(event) => setTaskName(event.target.value)} required placeholder="e.g. trim beard" />
            </label>
            <div>
              <div className="mb-1 text-xs text-[var(--muted)]">Show only on</div>
              <WeekdayChips value={taskDays} onChange={setTaskDays} emptyMeansAll />
              <p className="mt-1 text-xs text-[var(--muted)]">Leave all on to show every day this block exists.</p>
            </div>
            <div className="flex justify-between gap-2 pt-1">
              <TrashButton
                label="Delete block"
                onClick={async () => {
                  await api(`/api/routine/blocks/${open.id}`, { method: 'DELETE' })
                  setOpen(null)
                  await refresh()
                }}
              />
              <AddButton label="Add subtask" variant="primary" type="submit" />
            </div>
          </form>
        </Dialog>
      )}

      {create && (
        <Dialog title="Add block" onClose={() => setCreate(false)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              const startMin = parseClock(start)
              const endMin = parseClock(end)
              if (startMin == null || endMin == null) return
              await api('/api/routine/blocks', {
                method: 'POST',
                body: JSON.stringify({
                  title,
                  startMin,
                  endMin,
                  weekdays: allWeek ? [1, 2, 3, 4, 5, 6, 7] : days,
                  allWeek,
                  color,
                }),
              })
              setCreate(false)
              setTitle('')
              setColor('#0095f6')
              await refresh()
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Name</span>
              <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Shower" autoFocus />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--muted)]">Start</span>
                <TimeField hour12={hour12} value={start} onChange={setStart} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--muted)]">End</span>
                <TimeField hour12={hour12} value={end === '24:00' ? '23:59' : end} onChange={setEnd} />
              </label>
            </div>
            <ColorSwatches value={color} onChange={setColor} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allWeek} onChange={(event) => setAllWeek(event.target.checked)} />
              Whole week
            </label>
            {!allWeek && (
              <div>
                <div className="mb-1 text-xs text-[var(--muted)]">Days</div>
                <WeekdayChips value={days} onChange={setDays} />
              </div>
            )}
            <div className="flex justify-end pt-2">
              <PrimaryButton type="submit">Save block</PrimaryButton>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}

function TaskEditor({
  task,
  onSave,
  onRemove,
}: {
  task: RoutineTask
  onSave: (patch: { name?: string; weekdays?: number[] }) => void
  onRemove: () => void
}) {
  const [name, setName] = useState(task.name)

  return (
    <div className="space-y-2 rounded-md bg-[var(--surface-2)] px-3 py-3">
      <div className="flex items-center gap-2">
        <input
          className="field py-1.5"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            const next = name.trim()
            if (!next || next === task.name) return
            onSave({ name: next })
          }}
        />
        <TrashButton label="Delete subtask" onClick={onRemove} />
      </div>
      <WeekdayChips
        value={task.weekdays}
        emptyMeansAll
        onChange={(weekdays) => onSave({ name, weekdays })}
      />
    </div>
  )
}
