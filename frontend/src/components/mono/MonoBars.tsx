import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const TICK = { fill: 'var(--muted)', fontSize: 11 }
const TOOLTIP = {
  background: 'color-mix(in srgb, var(--surface) 94%, transparent)',
  border: '0.5px solid var(--line)',
  borderRadius: 8,
  color: 'var(--fg)',
  fontSize: 12,
}

export function MonoBars({
  data,
  bars,
  format,
}: {
  data: Record<string, string | number>[]
  bars: { key: string; name: string; fill?: string }[]
  format?: (value: number) => string
}) {
  const label = format ?? ((value: number) => String(Math.round(value)))
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} width={44} tickFormatter={(value) => label(Number(value))} />
          <Tooltip contentStyle={TOOLTIP} formatter={(value, name) => [label(Number(value)), String(name)]} />
          {bars.map((bar, index) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              name={bar.name}
              stackId="m"
              fill={bar.fill ?? `color-mix(in srgb, var(--fg) ${Math.round(100 - index * 28)}%, transparent)`}
              radius={index === bars.length - 1 ? [8, 8, 0, 0] : 0}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
