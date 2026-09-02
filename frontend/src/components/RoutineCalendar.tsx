import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { isoWeekday, minutesNow } from '../lib/weekdays'
import type { GoogleCalendarEvent, RoutineBlock, RoutineDay } from '../types'

const WEEK_OPTS = { weekStartsOn: 1 as const }
const PX_PER_HOUR = 52
const DAY_MS = 24 * 60
const SNAP_MIN = 15
const DRAG_PX = 5

type TimeSlot = { date: Date; weekday: number; startMin: number; endMin: number }

export function RoutineCalendar({
  mode,
  cursor,
  weekday,
  days,
  hour12,
  activeId,
  onCursor,
  onWeekday,
  onSelect,
  onCreateSlot,
  onMove,
  externals = [],
}: {
  mode: 'week' | 'month'
  cursor: Date
  weekday: number
  days: RoutineDay[]
  hour12: boolean
  activeId?: string | null
  onCursor: (next: Date) => void
  onWeekday: (next: number) => void
  onSelect: (block: RoutineBlock) => void
  onCreateSlot: (slot: TimeSlot) => void
  onMove: (block: RoutineBlock, next: { startMin: number; endMin: number }) => void
  externals?: GoogleCalendarEvent[]
}) {
  const byWeekday = useMemo(() => {
    const map = new Map<number, RoutineBlock[]>()
    for (const day of days) map.set(day.weekday, day.blocks)
    return map
  }, [days])

  if (mode === 'month') {
    return (
      <MonthGrid
        cursor={cursor}
        byWeekday={byWeekday}
        activeId={activeId}
        onCursor={onCursor}
        onWeekday={onWeekday}
        onSelect={onSelect}
        externals={externals}
      />
    )
  }

  return (
    <WeekGrid
      cursor={cursor}
      weekday={weekday}
      byWeekday={byWeekday}
      hour12={hour12}
      activeId={activeId}
      onCursor={onCursor}
      onWeekday={onWeekday}
      onSelect={onSelect}
      onCreateSlot={onCreateSlot}
      onMove={onMove}
      externals={externals}
    />
  )
}

function WeekGrid({
  cursor,
  weekday,
  byWeekday,
  hour12,
  activeId,
  onCursor,
  onWeekday,
  onSelect,
  onCreateSlot,
  onMove,
  externals,
}: {
  cursor: Date
  weekday: number
  byWeekday: Map<number, RoutineBlock[]>
  hour12: boolean
  activeId?: string | null
  onCursor: (next: Date) => void
  onWeekday: (next: number) => void
  onSelect: (block: RoutineBlock) => void
  onCreateSlot: (slot: TimeSlot) => void
  onMove: (block: RoutineBlock, next: { startMin: number; endMin: number }) => void
  externals: GoogleCalendarEvent[]
}) {
  const [now, setNow] = useState(minutesNow)
  const weekDays = eachDayOfInterval({
    start: startOfWeek(cursor, WEEK_OPTS),
    end: endOfWeek(cursor, WEEK_OPTS),
  })
  const range = hourRange([...byWeekday.values()].flat())
  const hours: number[] = []
  for (let hour = range.start / 60; hour < range.end / 60; hour += 1) hours.push(hour)
  const height = hours.length * PX_PER_HOUR
  const today = new Date()
  const dragRef = useRef<DragMove | null>(null)
  const ignoreClick = useRef(false)
  const [drag, setDrag] = useState<DragMove | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(minutesNow()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  function updateDrag(next: DragMove | null) {
    dragRef.current = next
    setDrag(next)
  }

  function onEventPointerDown(block: RoutineBlock, event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    ignoreClick.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    updateDrag({
      block,
      originY: event.clientY,
      startMin: block.startMin,
      endMin: block.endMin,
      grabbing: false,
    })
  }

  function onEventPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current
    if (!current) return
    const deltaPx = event.clientY - current.originY
    const grabbing = current.grabbing || Math.abs(deltaPx) >= DRAG_PX
    const next = grabbing
      ? shiftTimes(current.block, (deltaPx / PX_PER_HOUR) * 60, range)
      : { startMin: current.block.startMin, endMin: current.block.endMin }
    if (grabbing) {
      ignoreClick.current = true
      event.preventDefault()
    }
    if (grabbing === current.grabbing && next.startMin === current.startMin && next.endMin === current.endMin) return
    updateDrag({ ...current, grabbing, startMin: next.startMin, endMin: next.endMin })
  }

  function onEventPointerUp() {
    const current = dragRef.current
    updateDrag(null)
    if (!current?.grabbing) return
    if (current.startMin === current.block.startMin && current.endMin === current.block.endMin) return
    onMove(current.block, { startMin: current.startMin, endMin: current.endMin })
  }

  return (
    <div>
      <CalNav
        label={weekLabel(weekDays[0], weekDays[6])}
        onPrev={() => onCursor(addWeeks(cursor, -1))}
        onNext={() => onCursor(addWeeks(cursor, 1))}
        onToday={() => onCursor(new Date())}
      />
      <div className="routine-cal mt-3">
        <div className="routine-cal-week">
          <div className="routine-cal-head routine-cal-time routine-cal-corner border-b border-[var(--line)]" />
          {weekDays.map((date) => {
            const dayNumber = isoWeekday(date)
            const selected = dayNumber === weekday
            const isToday = isSameDay(date, today)
            return (
              <button
                key={date.toISOString()}
                type="button"
                className={`routine-cal-head border-b border-l border-[var(--line)] px-2 py-2 text-left ${
                  selected ? 'bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]' : ''
                }`}
                onClick={() => {
                  onCursor(date)
                  onWeekday(dayNumber)
                }}
              >
                <div className="text-[11px] font-semibold text-[var(--muted)]">{format(date, 'EEE')}</div>
                <div
                  className={`mt-0.5 inline-grid size-7 place-items-center rounded-full text-sm font-semibold ${
                    isToday ? 'bg-[var(--accent)] text-white' : ''
                  }`}
                >
                  {format(date, 'd')}
                </div>
              </button>
            )
          })}
          <div className="routine-cal-time relative border-[var(--line)]" style={{ height }}>
            {hours.map((hour, index) => (
              <div
                key={hour}
                className="absolute right-1 -translate-y-1/2 text-[10px] tabular text-[var(--muted)]"
                style={{ top: index * PX_PER_HOUR }}
              >
                {hourTick(hour, hour12)}
              </div>
            ))}
          </div>
          {weekDays.map((date) => {
            const dayNumber = isoWeekday(date)
            const blocks = byWeekday.get(dayNumber) ?? []
            const selected = dayNumber === weekday
            const isToday = isSameDay(date, today)
            return (
              <div
                key={`col-${date.toISOString()}`}
                className={`relative border-l border-[var(--line)] ${
                  selected ? 'bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]' : ''
                }`}
                style={{ height }}
              >
                {hours.map((hour, index) => {
                  const startMin = hour * 60
                  const endMin = Math.min(startMin + 60, DAY_MS)
                  const empty = !hourOccupied(blocks, startMin, endMin)
                  return (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-[var(--line)]"
                      style={{ top: index * PX_PER_HOUR, height: PX_PER_HOUR }}
                    >
                      {empty && !drag && (
                        <button
                          type="button"
                          className="routine-slot"
                          aria-label={`Add block at ${clockLabel(startMin, hour12)}`}
                          onClick={() => {
                            onCursor(date)
                            onWeekday(dayNumber)
                            onCreateSlot({ date, weekday: dayNumber, startMin, endMin })
                          }}
                        >
                          <span className="routine-slot-mark">
                            <Plus size={14} strokeWidth={2} />
                            Add
                          </span>
                        </button>
                      )}
                    </div>
                  )
                })}
                {isToday && now >= range.start && now <= range.end && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-[1] h-px bg-[var(--danger)]"
                    style={{ top: ((now - range.start) / 60) * PX_PER_HOUR }}
                  />
                )}
                {blocks.flatMap((block) => {
                  const live = drag?.block.id === block.id ? { ...block, startMin: drag.startMin, endMin: drag.endMin } : block
                  const moving = drag?.grabbing && drag.block.id === block.id
                  return timedPieces(live, range.start, range.end).map((piece, index) => {
                    const top = ((piece.start - range.start) / 60) * PX_PER_HOUR
                    const h = Math.max(((piece.end - piece.start) / 60) * PX_PER_HOUR, 18)
                    return (
                      <button
                        key={`${block.id}-${index}`}
                        type="button"
                        draggable={false}
                        aria-grabbed={moving}
                        className={`routine-event absolute right-1 left-1 px-1.5 py-0.5 ${moving ? 'is-dragging z-[4]' : 'z-[1]'}`}
                        style={{
                          top,
                          height: h,
                          background: block.color || '#0095f6',
                          outline: activeId === block.id ? '2px solid var(--fg)' : undefined,
                        }}
                        onPointerDown={(event) => onEventPointerDown(block, event)}
                        onPointerMove={onEventPointerMove}
                        onPointerUp={onEventPointerUp}
                        onLostPointerCapture={onEventPointerUp}
                        onPointerCancel={onEventPointerUp}
                        onClick={() => {
                          if (ignoreClick.current) {
                            ignoreClick.current = false
                            return
                          }
                          onSelect(block)
                        }}
                      >
                        <div className="truncate text-[11px] font-semibold leading-tight">{block.title}</div>
                        {h > 28 && (
                          <div className="truncate text-[10px] leading-tight opacity-90">
                            {clockLabel(piece.start, hour12)}
                            {piece.end - piece.start >= 45 ? `–${clockLabel(piece.end, hour12)}` : ''}
                          </div>
                        )}
                      </button>
                    )
                  })
                })}
                {externals
                  .filter((item) => item.weekday === dayNumber && item.date === format(date, 'yyyy-MM-dd'))
                  .flatMap((item) =>
                    timedPieces({ startMin: item.startMin, endMin: item.endMin } as RoutineBlock, range.start, range.end).map((piece, index) => {
                      const top = ((piece.start - range.start) / 60) * PX_PER_HOUR
                      const h = Math.max(((piece.end - piece.start) / 60) * PX_PER_HOUR, 18)
                      return (
                        <div
                          key={`${item.id}-${index}`}
                          className="routine-event routine-event-google absolute right-1 left-1 z-[1] px-1.5 py-0.5"
                          style={{ top, height: h }}
                          title={item.title}
                        >
                          <div className="truncate text-[11px] font-semibold leading-tight">{item.title}</div>
                          {h > 28 && (
                            <div className="truncate text-[10px] leading-tight opacity-80">
                              {clockLabel(piece.start, hour12)}
                              {piece.end - piece.start >= 45 ? `–${clockLabel(piece.end, hour12)}` : ''}
                            </div>
                          )}
                        </div>
                      )
                    }),
                  )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MonthGrid({
  cursor,
  byWeekday,
  activeId,
  onCursor,
  onWeekday,
  onSelect,
  externals,
}: {
  cursor: Date
  byWeekday: Map<number, RoutineBlock[]>
  activeId?: string | null
  onCursor: (next: Date) => void
  onWeekday: (next: number) => void
  onSelect: (block: RoutineBlock) => void
  externals: GoogleCalendarEvent[]
}) {
  const monthStart = startOfMonth(cursor)
  const cells = eachDayOfInterval({
    start: startOfWeek(monthStart, WEEK_OPTS),
    end: endOfWeek(endOfMonth(monthStart), WEEK_OPTS),
  })
  const today = new Date()

  return (
    <div>
      <CalNav
        label={format(cursor, 'MMMM yyyy')}
        onPrev={() => onCursor(addMonths(cursor, -1))}
        onNext={() => onCursor(addMonths(cursor, 1))}
        onToday={() => onCursor(new Date())}
      />
      <div className="routine-cal mt-3">
        <div className="routine-cal-month border-b border-[var(--line)]">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
            <div key={label} className="px-2 py-2 text-center text-[11px] font-semibold text-[var(--muted)]">
              {label}
            </div>
          ))}
        </div>
        <div className="routine-cal-month">
          {cells.map((date) => {
            const dayNumber = isoWeekday(date)
            const blocks = byWeekday.get(dayNumber) ?? []
            const inMonth = isSameMonth(date, cursor)
            const isToday = isSameDay(date, today)
            const selected = isSameDay(date, cursor)
            const googleDay = externals.filter((item) => item.date === format(date, 'yyyy-MM-dd'))
            const extra = Math.max(0, blocks.length + googleDay.length - 3)
            return (
              <div
                key={date.toISOString()}
                className={`min-h-[6.5rem] border-t border-l border-[var(--line)] p-1.5 sm:min-h-[7.5rem] ${
                  inMonth ? '' : 'bg-[var(--surface-2)]'
                } ${selected ? 'bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]' : ''}`}
              >
                <button
                  type="button"
                  className="mb-1 flex w-full justify-end"
                  onClick={() => {
                    onCursor(date)
                    onWeekday(dayNumber)
                  }}
                >
                  <span
                    className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${
                      isToday ? 'bg-[var(--accent)] text-white' : inMonth ? '' : 'text-[var(--muted)]'
                    }`}
                  >
                    {format(date, 'd')}
                  </span>
                </button>
                <div className="space-y-0.5">
                  {blocks.slice(0, 3).map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      className="routine-event flex w-full items-center gap-1 px-1 py-0.5"
                      style={{
                        background: block.color || '#0095f6',
                        outline: activeId === block.id ? '2px solid var(--fg)' : undefined,
                      }}
                      onClick={() => {
                        onCursor(date)
                        onWeekday(dayNumber)
                        onSelect(block)
                      }}
                    >
                      <span className="truncate text-[10px] font-medium leading-tight">{block.title}</span>
                    </button>
                  ))}
                  {blocks.length < 3 &&
                    googleDay.slice(0, 3 - blocks.length).map((item) => (
                      <div key={item.id} className="routine-event routine-event-google px-1 py-0.5">
                        <span className="truncate text-[10px] font-medium leading-tight">{item.title}</span>
                      </div>
                    ))}
                  {extra > 0 && (
                    <div className="px-1 text-[10px] text-[var(--muted)]">+{extra}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CalNav({
  label,
  onPrev,
  onNext,
  onToday,
}: {
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="text-lg font-semibold tracking-tight">{label}</div>
      <div className="flex items-center gap-1">
        <button type="button" className="glass-btn grid size-8 place-items-center" onClick={onPrev} aria-label="Previous">
          <ChevronLeft size={18} />
        </button>
        <button type="button" className="glass-btn px-3 py-1.5 text-sm" onClick={onToday}>
          Today
        </button>
        <button type="button" className="glass-btn grid size-8 place-items-center" onClick={onNext} aria-label="Next">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

function hourRange(blocks: RoutineBlock[]) {
  let start = 6 * 60
  let end = 22 * 60
  for (const block of blocks) {
    const stop = block.endMin === 0 ? DAY_MS : block.endMin
    if (stop > block.startMin) {
      start = Math.min(start, block.startMin)
      end = Math.max(end, stop)
    } else {
      return { start: 0, end: DAY_MS }
    }
  }
  start = Math.max(0, Math.floor(start / 60) * 60)
  end = Math.min(DAY_MS, Math.ceil(end / 60) * 60)
  if (end <= start) return { start: 0, end: DAY_MS }
  return { start, end }
}

function hourOccupied(blocks: RoutineBlock[], hourStart: number, hourEnd: number) {
  return blocks.some((block) => timedPieces(block, hourStart, hourEnd).length > 0)
}

type DragMove = {
  block: RoutineBlock
  originY: number
  startMin: number
  endMin: number
  grabbing: boolean
}

function blockDuration(block: RoutineBlock) {
  const stop = block.endMin === 0 ? DAY_MS : block.endMin
  if (stop > block.startMin) return stop - block.startMin
  return DAY_MS - block.startMin + stop
}

function snapMin(value: number) {
  return Math.round(value / SNAP_MIN) * SNAP_MIN
}

function shiftTimes(block: RoutineBlock, deltaMin: number, range: { start: number; end: number }) {
  const duration = Math.max(1, blockDuration(block))
  const stop = block.endMin === 0 ? DAY_MS : block.endMin
  const wraps = stop <= block.startMin && duration < DAY_MS
  if (wraps) {
    let start = snapMin(block.startMin + deltaMin)
    start = ((start % DAY_MS) + DAY_MS) % DAY_MS
    let end = start + duration
    if (end > DAY_MS) end %= DAY_MS
    if (end === 0) end = DAY_MS
    return { startMin: start, endMin: end }
  }
  const lo = range.start
  const hi = Math.max(lo, range.end - duration)
  const start = Math.min(Math.max(snapMin(block.startMin + deltaMin), lo), hi)
  return { startMin: start, endMin: start + duration }
}

function timedPieces(block: RoutineBlock, rangeStart: number, rangeEnd: number) {
  const stop = block.endMin === 0 ? DAY_MS : block.endMin
  const raw = stop > block.startMin ? [{ start: block.startMin, end: stop }] : [
    { start: block.startMin, end: DAY_MS },
    { start: 0, end: stop },
  ]
  return raw
    .map((piece) => ({
      start: Math.max(piece.start, rangeStart),
      end: Math.min(piece.end, rangeEnd),
    }))
    .filter((piece) => piece.end > piece.start)
}

function hourTick(hour: number, hour12: boolean) {
  if (!hour12) return String(hour).padStart(2, '0')
  if (hour === 0 || hour === 24) return '12a'
  if (hour === 12) return '12p'
  if (hour < 12) return `${hour}a`
  return `${hour - 12}p`
}

function clockLabel(minutes: number, hour12: boolean) {
  const wrapped = minutes === DAY_MS ? DAY_MS : minutes
  const hours = Math.floor((wrapped % DAY_MS) / 60)
  const mins = wrapped % 60
  if (!hour12) return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  const suffix = hours >= 12 && hours < 24 ? 'p' : 'a'
  const hour = hours % 12 === 0 ? 12 : hours % 12
  return mins === 0 ? `${hour}${suffix}` : `${hour}:${String(mins).padStart(2, '0')}${suffix}`
}

function weekLabel(start: Date, end: Date) {
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'd')}-${format(end, 'd MMM yyyy')}`
  }
  return `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy')}`
}
