import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { CHART_MARGIN, CHART_STROKE, CHART_TICK, CHART_TOOLTIP } from './theme'

export function MonoArea({
  data,
  valueKey = 'value',
  color = CHART_STROKE,
  format,
  className,
}: {
  data: Record<string, string | number>[]
  valueKey?: string
  color?: string
  format?: (value: number) => string
  className?: string
}) {
  const label = format ?? ((value: number) => String(Math.round(value)))
  const config = { [valueKey]: { label: valueKey, color } } satisfies ChartConfig
  const fillId = `fill-${valueKey}`

  return (
    <ChartContainer config={config} className={cn('aspect-auto h-64 w-full', className)}>
      <AreaChart data={data} margin={CHART_MARGIN}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey="label" tick={CHART_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} width={56} tickFormatter={(value) => label(Number(value))} />
        <ReferenceLine y={0} stroke="var(--line)" />
        <Tooltip contentStyle={CHART_TOOLTIP} formatter={(value) => [label(Number(value)), '']} />
        <Area
          type="monotone"
          dataKey={valueKey}
          stroke={`var(--color-${valueKey})`}
          strokeWidth={2.25}
          fill={`url(#${fillId})`}
          dot={data.length < 14 ? { r: 3, fill: color, strokeWidth: 0 } : false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
