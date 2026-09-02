import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

type Slice = { name: string; value: number }

const TOOLTIP = {
  background: 'color-mix(in srgb, var(--surface) 94%, transparent)',
  border: '0.5px solid var(--line)',
  borderRadius: 8,
  color: 'var(--fg)',
  fontSize: 12,
}

function shade(index: number, total: number) {
  const t = total <= 1 ? 1 : 1 - index / total
  return `color-mix(in srgb, var(--fg) ${Math.round(28 + t * 72)}%, transparent)`
}

export function MonoDonut({
  data,
  center,
}: {
  data: Slice[]
  center?: string
}) {
  const rows = data.filter((row) => row.value > 0)
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  if (rows.length === 0 || total <= 0) return null
  return (
    <div className="relative h-64">
      <ResponsiveContainer>
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
              <Cell key={row.name} fill={shade(index, rows.length)} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP} formatter={(value, name) => [String(value), String(name)]} />
        </PieChart>
      </ResponsiveContainer>
      {center != null && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-lg font-semibold tabular">{center}</div>
            <div className="text-[11px] text-[var(--muted)]">total</div>
          </div>
        </div>
      )}
    </div>
  )
}
