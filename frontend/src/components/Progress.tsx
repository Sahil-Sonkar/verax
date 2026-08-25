export function ProgressBar({
  value,
  className = '',
  color = 'var(--accent)',
}: {
  value?: number | null
  className?: string
  color?: string
}) {
  const width = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-[var(--surface-2)] ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
    >
      <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
    </div>
  )
}

export function Ring({
  value,
  size = 64,
  color = 'var(--accent)',
}: {
  value: number
  size?: number
  color?: string
}) {
  const r = 18
  const c = 2 * Math.PI * r
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="shrink-0" aria-hidden="true">
      <g style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
        />
        <text x="24" y="27" textAnchor="middle" fill="var(--fg)" fontSize="9" fontFamily="Outfit" className="tabular">
          {Math.round(value)}
        </text>
      </g>
    </svg>
  )
}
