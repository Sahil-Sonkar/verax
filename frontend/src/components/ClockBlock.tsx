import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { HabitRow } from './HabitRow'
import { FocusTimer } from './FocusTimer'
import { JournalThree } from './JournalThree'
import { ASPECT_COLORS, type BlockDef, type BlockState } from '../lib/clock'
import { PROTOCOLS } from '../lib/protocols'
import type { CompletionStatus, HabitItem, MedicationDose } from '../types'

export function ClockBlock({
  block,
  state,
  items,
  doses,
  dateKey,
  sleepFirst,
  localDone,
  onLocalDone,
  onStatus,
  onDose,
}: {
  block: BlockDef
  state: BlockState
  items: Array<{ label: string; item?: HabitItem }>
  doses: MedicationDose[]
  dateKey: string
  sleepFirst: boolean
  localDone: Record<string, boolean>
  onLocalDone: (id: string) => void
  onStatus: (habitId: string, status: CompletionStatus, value?: number) => void
  onDose: (id: string, status: 'TAKEN' | 'SKIPPED' | 'PENDING') => void
}) {
  const [open, setOpen] = useState(state === 'now' || state === 'next')
  useEffect(() => {
    if (state === 'now' || state === 'next') setOpen(true)
  }, [state])
  const expanded = state === 'now' || open
  const protocol = block.protocol ? PROTOCOLS[block.protocol] : undefined
  const accent = ASPECT_COLORS[block.aspect]
  const muted = sleepFirst && state !== 'now'

  return (
    <article
      className={clsx(
        'border-b border-[var(--line)]',
        state === 'now' && 'bg-[var(--surface-2)]',
        muted && 'opacity-50',
      )}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-1 py-4 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={expanded}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <span className="tabular">
              {block.start}
              {block.end ? `–${block.end}` : ''}
            </span>
            <span style={{ color: accent }}>{block.aspect}</span>
            {state === 'now' && <span className="font-semibold text-[var(--fg)]">Now</span>}
            {state === 'next' && <span>Up next</span>}
            {state === 'past' && <span>Past</span>}
          </div>
          <h2 className={clsx('mt-1 tracking-tight', state === 'now' ? 'text-2xl' : 'text-base')}>{block.title}</h2>
          {block.subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{block.subtitle}</p>}
        </div>
      </button>
      {expanded && (
        <div className="px-1 pb-4">
          {items.map(({ label, item }) =>
            item ? (
              <HabitRow key={item.habit.id} item={item} onStatus={onStatus} />
            ) : (
              <div key={label} className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-3 last:border-b-0">
                <span>{label}</span>
                <button
                  type="button"
                  className="text-sm"
                  style={{ color: localDone[`${block.id}:${label}`] ? 'var(--mint)' : 'var(--accent)' }}
                  onClick={() => onLocalDone(`${block.id}:${label}`)}
                >
                  {localDone[`${block.id}:${label}`] ? 'Done' : 'Mark done'}
                </button>
              </div>
            ),
          )}
          {doses.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-3">
              <div>
                <div>
                  {row.name}
                  {row.dosage ? ` · ${row.dosage}` : ''}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {row.scheduledTime} · {row.status.toLowerCase()}
                </div>
              </div>
              {row.status === 'PENDING' || row.status === 'MISSED' ? (
                <div className="flex gap-2 text-sm">
                  <button type="button" className="text-[var(--accent)]" onClick={() => onDose(row.id, 'TAKEN')}>
                    Taken
                  </button>
                  <button type="button" className="text-[var(--muted)]" onClick={() => onDose(row.id, 'SKIPPED')}>
                    Skip
                  </button>
                </div>
              ) : (
                <button type="button" className="text-sm text-[var(--muted)]" onClick={() => onDose(row.id, 'PENDING')}>
                  Undo
                </button>
              )}
            </div>
          ))}
          {block.protocol === 'sit' && (
            <FocusTimer compact defaultKind="MEDITATION" defaultMinutes={15} preferHabit="Meditation" />
          )}
          {block.protocol === 'shutdown' && <JournalThree date={dateKey} />}
          {protocol && block.protocol !== 'sit' && block.protocol !== 'journal3' && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-[var(--accent)]">Open {protocol.title.toLowerCase()}</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
                {protocol.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
          )}
          {sleepFirst && state !== 'now' && (
            <p className="mt-2 text-xs text-[var(--muted)]">Sleep first. Still tappable.</p>
          )}
        </div>
      )}
    </article>
  )
}
