import { useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, PrimaryButton } from './Dialog'
import { AddButton, TrashButton } from './IconButtons'
import { api } from '../lib/api'
import { inkOn } from '../lib/colors'
import type { MindJournal as Board, MindNote, MindTag } from '../types'

function noteDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(value))
}

function TagSnack({
  tag,
  on = true,
  count,
  onClick,
  onRemove,
}: {
  tag: Pick<MindTag, 'name' | 'color'>
  on?: boolean
  count?: ReactNode
  onClick?: () => void
  onRemove?: () => void
}) {
  return (
    <span
      className="snack"
      style={{
        background: tag.color,
        color: inkOn(tag.color),
        opacity: on ? 1 : 0.38,
      }}
    >
      <button type="button" className="inline-flex items-center gap-1.5 p-0" onClick={onClick}>
        {tag.name}
        {count != null && <span className="tabular opacity-90">{count}</span>}
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label={`Delete ${tag.name}`}
          className="grid size-4 place-items-center p-0 text-[13px] leading-none opacity-80 hover:opacity-100"
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </span>
  )
}

export function MindJournal() {
  const queryClient = useQueryClient()
  const board = useQuery({
    queryKey: ['mind-journal'],
    queryFn: () => api<Board>('/api/mind/journal'),
  })
  const [filter, setFilter] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [editing, setEditing] = useState<MindNote | null>(null)
  const [editBody, setEditBody] = useState('')
  const [editPicked, setEditPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const tags = board.data?.tags ?? []
  const notes = board.data?.notes ?? []
  const visible = useMemo(
    () => (filter ? notes.filter((note) => note.tags.some((tag) => tag.id === filter)) : notes),
    [filter, notes],
  )

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['mind-journal'] })
  }

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
  }

  async function addTag(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const tag = await api<MindTag>('/api/mind/journal/tags', {
      method: 'POST',
      body: JSON.stringify({ name: trimmed }),
    })
    setNewTag('')
    setPicked((current) => (current.includes(tag.id) ? current : [...current, tag.id]))
    refresh()
  }

  async function saveNote() {
    if (!body.trim()) return
    setBusy(true)
    try {
      await api('/api/mind/journal/notes', {
        method: 'POST',
        body: JSON.stringify({ body, tagIds: picked }),
      })
      setBody('')
      setPicked([])
      refresh()
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit() {
    if (!editing || !editBody.trim()) return
    setBusy(true)
    try {
      await api(`/api/mind/journal/notes/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ body: editBody, tagIds: editPicked }),
      })
      setEditing(null)
      refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4">
      <p className="max-w-[58ch] text-sm text-[var(--muted)]">
        Notes with tags you invent. Filter the stack by one tag.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <TagSnack
          tag={{ name: 'All', color: 'var(--fg)' }}
          on={filter == null}
          count={notes.length}
          onClick={() => setFilter(null)}
        />
        {tags.map((tag) => (
          <TagSnack
            key={tag.id}
            tag={tag}
            on={filter == null || filter === tag.id}
            count={tag.noteCount}
            onClick={() => setFilter(filter === tag.id ? null : tag.id)}
            onRemove={async () => {
              await api(`/api/mind/journal/tags/${tag.id}`, { method: 'DELETE' })
              if (filter === tag.id) setFilter(null)
              setPicked((current) => current.filter((id) => id !== tag.id))
              refresh()
            }}
          />
        ))}
      </div>

      <div className="panel">
        <div className="card p-5">
          <textarea
            className="field min-h-28 resize-y"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write a note"
            aria-label="New journal note"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <TagSnack
                key={tag.id}
                tag={tag}
                on={picked.includes(tag.id)}
                onClick={() => setPicked((current) => toggle(current, tag.id))}
              />
            ))}
            <form
              className="flex min-w-[10rem] flex-1 items-center gap-2"
              onSubmit={async (event) => {
                event.preventDefault()
                await addTag(newTag)
              }}
            >
              <input
                className="field py-1.5"
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                placeholder="New tag"
                aria-label="New tag name"
              />
              <AddButton label="Create tag" type="submit" />
            </form>
            <PrimaryButton disabled={busy || !body.trim()} onClick={() => void saveNote()}>
              Write
            </PrimaryButton>
          </div>
        </div>
      </div>

      {board.isLoading && <p className="text-sm text-[var(--muted)]">Loading notes…</p>}
      {visible.length === 0 && !board.isLoading && (
        <p className="text-sm text-[var(--muted)]">
          {filter ? 'Nothing with that tag yet.' : 'No notes yet. Write one, or wait for the examples to land.'}
        </p>
      )}
      <div className="grid gap-3">
        {visible.map((note) => (
          <article key={note.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs text-[var(--muted)]">{noteDate(note.createdAt)}</div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--muted)]"
                  onClick={() => {
                    setEditing(note)
                    setEditBody(note.body)
                    setEditPicked(note.tags.map((tag) => tag.id))
                  }}
                >
                  Edit
                </button>
                <TrashButton
                  label="Delete note"
                  onClick={async () => {
                    await api(`/api/mind/journal/notes/${note.id}`, { method: 'DELETE' })
                    refresh()
                  }}
                />
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{note.body}</p>
            {note.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <TagSnack key={tag.id} tag={tag} onClick={() => setFilter(tag.id)} />
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {editing && (
        <Dialog title="Edit note" onClose={() => setEditing(null)}>
          <div className="mt-4 space-y-3">
            <textarea
              className="field min-h-32 resize-y"
              value={editBody}
              onChange={(event) => setEditBody(event.target.value)}
              aria-label="Note"
            />
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <TagSnack
                  key={tag.id}
                  tag={tag}
                  on={editPicked.includes(tag.id)}
                  onClick={() => setEditPicked((current) => toggle(current, tag.id))}
                />
              ))}
            </div>
            <div className="flex justify-end">
              <PrimaryButton disabled={busy || !editBody.trim()} onClick={() => void saveEdit()}>
                Save note
              </PrimaryButton>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  )
}
