import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { CHART_MARGIN, CHART_STROKE, CHART_TICK, CHART_TOOLTIP } from './theme'

export function MonoLine({
  data,
  valueKey = 'value',
  xKey = 'label',
  lines,
  format,
  color = CHART_STROKE,
  domain,
  className,
  onPoint,
}: {
  data: Record<string, unknown>[]
  valueKey?: string
  xKey?: string
  lines?: { key: string; name?: string; color?: string }[]
  format?: (value: number) => string
  color?: string
  domain?: [number, number]
  className?: string
  onPoint?: (row: Record<string, unknown>) => void
}) {
  const series = lines ?? [{ key: valueKey, color }]
  const label = format ?? ((value: number) => String(Math.round(value)))
  const config = Object.fromEntries(
    series.map((line, index) => [
      line.key,
      { label: line.name ?? line.key, color: line.color ?? `var(--chart-${(index % 5) + 1})` },
    ]),
  ) satisfies ChartConfig

  return (
    <ChartContainer config={config} className={cn('aspect-auto h-64 w-full', className)}>
      <LineChart
        accessibilityLayer
        data={data}
        margin={CHART_MARGIN}
        onClick={(state) => {
          const row = (state as { activePayload?: { payload?: Record<string, unknown> }[] }).activePayload?.[0]
            ?.payload
          if (row) onPoint?.(row)
        }}
      >
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey={xKey} tick={CHART_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
        <YAxis
          tick={CHART_TICK}
          axisLine={false}
          tickLine={false}
          width={48}
          domain={domain}
          tickFormatter={(value) => label(Number(value))}
        />
        <Tooltip contentStyle={CHART_TOOLTIP} formatter={(value) => [label(Number(value)), '']} />
        {series.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name ?? line.key}
            stroke={`var(--color-${line.key})`}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            connectNulls
            dot={data.length < 10 ? { r: 3, fill: `var(--color-${line.key})`, strokeWidth: 0 } : false}
            activeDot={{ r: 4, fill: `var(--color-${line.key})`, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
