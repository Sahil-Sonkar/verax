import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { CHART_MARGIN, CHART_TICK, CHART_TOOLTIP } from './theme'

export function MonoBars({
  data,
  bars,
  format,
  layout = 'horizontal',
  colorOf,
  categoryKey = 'label',
  className,
}: {
  data: Record<string, unknown>[]
  bars: { key: string; name: string; fill?: string }[]
  format?: (value: number) => string
  layout?: 'horizontal' | 'vertical'
  colorOf?: (row: Record<string, unknown>) => string
  categoryKey?: string
  className?: string
}) {
  const label = format ?? ((value: number) => String(Math.round(value)))
  const config = Object.fromEntries(
    bars.map((bar, index) => [bar.key, { label: bar.name, color: bar.fill ?? `var(--chart-${(index % 5) + 1})` }]),
  ) satisfies ChartConfig
  const vertical = layout === 'vertical'

  return (
    <ChartContainer config={config} className={cn('aspect-auto h-64 w-full', className)}>
      <BarChart
        accessibilityLayer
        data={data}
        layout={vertical ? 'vertical' : 'horizontal'}
        margin={vertical ? { ...CHART_MARGIN, left: 24 } : CHART_MARGIN}
      >
        <CartesianGrid stroke="var(--line)" vertical={!vertical} horizontal={vertical} />
        {vertical ? (
          <>
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis
              type="category"
              dataKey={categoryKey}
              width={90}
              tick={CHART_TICK}
              axisLine={false}
              tickLine={false}
            />
          </>
        ) : (
          <>
            <XAxis dataKey={categoryKey} tick={CHART_TICK} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} width={44} tickFormatter={(value) => label(Number(value))} />
          </>
        )}
        <Tooltip contentStyle={CHART_TOOLTIP} formatter={(value) => [label(Number(value)), '']} />
        {bars.map((bar, index) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.name}
            stackId="m"
            fill={`var(--color-${bar.key})`}
            radius={index === bars.length - 1 ? (vertical ? [0, 6, 6, 0] : [6, 6, 0, 0]) : 0}
            maxBarSize={28}
          >
            {colorOf
              ? data.map((row, i) => <Cell key={`${bar.key}-${i}`} fill={colorOf(row)} />)
              : null}
          </Bar>
        ))}
      </BarChart>
    </ChartContainer>
  )
}
