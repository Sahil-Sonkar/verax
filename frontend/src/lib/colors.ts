/** Hexes match :root tokens so pickers, SVG, and CSS stay on one palette. */
export const TONE = {
  sky: '#3d7ec9',
  mint: '#3d8b5c',
  sage: '#4a8f5c',
  brass: '#c4923a',
  pink: '#c45b72',
  violet: '#7a5ea8',
  warn: '#b8860b',
  danger: '#c94b52',
} as const

export const DEFAULT_SWATCH = TONE.sky

export const CATEGORY_COLORS: Record<string, string> = {
  Body: TONE.mint,
  Mind: TONE.violet,
  Work: TONE.sky,
  Voice: TONE.pink,
  Money: TONE.brass,
  People: TONE.pink,
  Place: TONE.violet,
  Play: TONE.brass,
  Fitness: TONE.mint,
  Career: TONE.sky,
  Content: TONE.pink,
  Appearance: TONE.brass,
  Learning: TONE.violet,
  Personal: TONE.violet,
  Finance: TONE.brass,
  Health: TONE.mint,
  Relationships: TONE.pink,
  Other: TONE.sky,
}

export function categoryColor(name?: string | null, fallback?: string | null) {
  if (name && CATEGORY_COLORS[name]) return CATEGORY_COLORS[name]
  return fallback || TONE.pink
}

export const BLOCK_COLORS = [
  TONE.sky,
  TONE.mint,
  TONE.sage,
  TONE.brass,
  TONE.pink,
  TONE.violet,
  TONE.warn,
  TONE.danger,
]

const LIGHT = new Set<string>([TONE.brass, TONE.warn, '#d4ae6a', '#eeebe4'])

export function inkOn(color: string) {
  if (color.startsWith('var(')) return 'var(--bg)'
  return LIGHT.has(color.toLowerCase()) ? '#1c1c1a' : '#ffffff'
}

export function habitColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return BLOCK_COLORS[hash % BLOCK_COLORS.length]
}

export function habitDayColor(status?: string | null, accent: string = TONE.pink) {
  if (status === 'COMPLETED') return accent
  if (status === 'PARTIAL') return `color-mix(in srgb, ${accent} 40%, var(--surface))`
  if (status === 'MISSED' || status === 'SKIPPED') return 'var(--fg)'
  return 'var(--heat-0)'
}

export function nextHabitStatus(status?: string | null) {
  if (status === 'COMPLETED') return 'PARTIAL' as const
  if (status === 'PARTIAL') return 'MISSED' as const
  return 'COMPLETED' as const
}

export function scoreTone(percent: number) {
  if (percent >= 85) return 'var(--accent)'
  if (percent >= 70) return 'var(--violet)'
  if (percent >= 50) return 'var(--brass)'
  return 'var(--pink)'
}
