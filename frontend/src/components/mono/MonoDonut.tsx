import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { CHART_TOOLTIP } from './theme'

type Slice = { name: string; value: number; color?: string }

function shade(index: number) {
  return `var(--chart-${(index % 5) + 1})`
}

export function MonoDonut({
  data,
  center,
  className,
}: {
  data: Slice[]
  center?: string
  className?: string
}) {
  const rows = data.filter((row) => row.value > 0)
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  if (rows.length === 0 || total <= 0) return null
  const config = Object.fromEntries(
    rows.map((row, index) => [row.name, { label: row.name, color: row.color ?? shade(index) }]),
  ) satisfies ChartConfig

  return (
    <div className={cn('relative h-64', className)}>
      <ChartContainer config={config} className="aspect-auto h-full w-full">
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            innerRadius={52}
            outerRadius={74}
            paddingAngle={3}
            stroke="none"
            cornerRadius={8}
          >
            {rows.map((row, index) => (
              <Cell key={row.name} fill={row.color ?? shade(index)} />
            ))}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP} />
        </PieChart>
      </ChartContainer>
      {center != null && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-lg font-semibold tabular">{center}</div>
            <div className="text-[11px] text-muted-foreground">total</div>
          </div>
        </div>
      )}
    </div>
  )
}
