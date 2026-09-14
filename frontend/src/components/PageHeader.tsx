import type { ReactNode } from 'react'

export function PageHeader({
  kicker,
  title,
  lead,
  actions,
}: {
  kicker?: string
  title: ReactNode
  lead?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <h1 className="page-title">{title}</h1>
        {lead ? <p className="page-lead">{lead}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function PageTabs<T extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string
  value: T
  items: readonly { id: T; label: string }[]
  onChange: (id: T) => void
}) {
  return (
    <div className="page-tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
