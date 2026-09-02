import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const TICK = { fill: 'var(--muted)', fontSize: 11 }
const TOOLTIP = {
  background: 'color-mix(in srgb, var(--surface) 94%, transparent)',
  border: '0.5px solid var(--line)',
  borderRadius: 8,
  color: 'var(--fg)',
  fontSize: 12,
}

export function MonoLine({
  data,
  valueKey = 'value',
  format,
}: {
  data: Record<string, string | number>[]
  valueKey?: string
  format?: (value: number) => string
}) {
  const label = format ?? ((value: number) => String(Math.round(value)))
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} width={48} tickFormatter={(value) => label(Number(value))} />
          <Tooltip contentStyle={TOOLTIP} formatter={(value) => [label(Number(value)), '']} />
          <Line
            type="monotone"
            dataKey={valueKey}
            stroke="var(--fg)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={data.length < 10 ? { r: 3, fill: 'var(--fg)', strokeWidth: 0 } : false}
            activeDot={{ r: 4, fill: 'var(--fg)', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
