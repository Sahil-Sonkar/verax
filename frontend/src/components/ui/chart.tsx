import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'

import { cn } from '@/lib/utils'

export type ChartConfig = Record<string, { label?: ReactNode; color?: string }>

export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig
  className?: string
  children: ReactNode
}) {
  const style = Object.fromEntries(
    Object.entries(config)
      .filter(([, item]) => item.color)
      .map(([key, item]) => [`--color-${key}`, item.color]),
  ) as CSSProperties

  return (
    <div
      data-slot="chart"
      className={cn(
        'flex justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-[var(--muted)] [&_.recharts-cartesian-grid_line]:stroke-[var(--line)] [&_.recharts-surface]:outline-none',
        className,
      )}
      style={style}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children as ReactElement}
      </ResponsiveContainer>
    </div>
  )
}
