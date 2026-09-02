export function pct(value?: number | null) {
  if (value == null) return '—'
  return `${Math.round(value * 100)}%`
}

export function signedPct(value?: number | null) {
  if (value == null) return '—'
  const n = Math.round(value * 100)
  return `${n > 0 ? '↑' : n < 0 ? '↓' : ''} ${Math.abs(n)}%`.trim()
}

export function formatInr(value?: number | null, empty = '') {
  return formatMoney(value, 'INR', empty)
}

export function formatMoney(value?: number | null, currency = 'INR', empty = '—') {
  if (value == null || Number.isNaN(Number(value))) return empty
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${Number(value).toFixed(2)} ${currency}`
  }
}

export function formatCompact(value?: number | null, empty = '—') {
  if (value == null || Number.isNaN(Number(value))) return empty
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 2 }).format(value)
}

export function formatSigned(value?: number | null, digits = 2, empty = '—') {
  if (value == null || Number.isNaN(Number(value))) return empty
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: 'exceptZero',
  }).format(value)
  return formatted
}

export function parseAmount(raw: string): number | null {
  const trimmed = raw.replace(/[₹\s]/g, '').replace(/,/g, '').trim()
  if (!trimmed) return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
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
