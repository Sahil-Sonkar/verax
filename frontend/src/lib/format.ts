export function pct(value?: number | null) {
  if (value == null) return '—'
  return `${Math.round(value * 100)}%`
}

export function signedPct(value?: number | null) {
  if (value == null) return '—'
  const n = Math.round(value * 100)
  return `${n > 0 ? '↑' : n < 0 ? '↓' : ''} ${Math.abs(n)}%`.trim()
}

export function formatNumber(value?: number | null, unit?: string) {
  if (value == null) return '—'
  const formatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value)
  return unit ? `${formatted} ${unit}` : formatted
}

export function importanceLabel(value: string) {
  if (value === 'CRITICAL') return 'Critical'
  if (value === 'OPTIONAL') return 'Optional'
  return 'Important'
}
