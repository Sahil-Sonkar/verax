import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ChartCard({
  title,
  hint,
  children,
  className,
}: {
  title?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('card min-w-0 p-4 lg:p-5', className)}>
      {title ? <h3 className="text-base font-medium tracking-tight">{title}</h3> : null}
      {hint ? <p className={cn('text-sm text-[var(--muted)]', title && 'mt-0.5')}>{hint}</p> : null}
      <div className={cn('min-w-0', (title || hint) && 'mt-3')}>{children}</div>
    </section>
  )
}
