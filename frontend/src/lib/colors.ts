/** Hexes match :root tokens so pickers, SVG, and CSS stay on one palette. */
export const TONE = {
  sky: '#3b6382',
  mint: '#2f6f63',
  sage: '#557c53',
  brass: '#c08b3e',
  pink: '#a85068',
  violet: '#6b5480',
  warn: '#c07a18',
  danger: '#c04a34',
} as const

export const DEFAULT_SWATCH = TONE.sky

/** One macro mapping for the diary meters, food picker donut, and recipe charts. */
export const MACRO_COLORS = {
  carbs: 'var(--brass)',
  fat: 'var(--sky)',
  protein: 'var(--danger)',
} as const

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

const LIGHT = new Set<string>([TONE.brass, TONE.warn, '#e0a36b', '#7fbfa8'])

export function inkOn(color: string) {
  if (color.startsWith('var(')) return 'var(--bg)'
  return LIGHT.has(color.toLowerCase()) ? '#1c140e' : '#ffffff'
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
