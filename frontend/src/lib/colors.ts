export const CATEGORY_COLORS: Record<string, string> = {
  Body: '#f77737',
  Mind: '#833ab4',
  Work: '#0095f6',
  Voice: '#e1306c',
  Money: '#405de6',
  People: '#c13584',
  Place: '#5b51d8',
  Play: '#fcaf45',
  Fitness: '#f77737',
  Career: '#0095f6',
  Content: '#e1306c',
  Appearance: '#fcaf45',
  Learning: '#833ab4',
  Personal: '#833ab4',
  Finance: '#405de6',
  Health: '#f77737',
  Relationships: '#c13584',
  Other: '#5b51d8',
}

export function categoryColor(name?: string | null, fallback?: string | null) {
  if (name && CATEGORY_COLORS[name]) return CATEGORY_COLORS[name]
  return fallback || '#e1306c'
}

export const BLOCK_COLORS = [
  '#0095f6',
  '#4fc3f7',
  '#00bcd4',
  '#26a69a',
  '#00c853',
  '#66bb6a',
  '#9ccc65',
  '#cddc39',
  '#fcaf45',
  '#ffb74d',
  '#f77737',
  '#ff7043',
  '#e1306c',
  '#ed4956',
  '#ec407a',
  '#c13584',
  '#ab47bc',
  '#833ab4',
  '#7e57c2',
  '#5b51d8',
  '#405de6',
  '#5c6bc0',
  '#78909c',
  '#8d6e63',
  '#a1887f',
  '#00695c',
  '#00376b',
  '#bf360c',
  '#880e4f',
  '#262626',
  '#546e7a',
  '#737373',
]

export function scoreTone(percent: number) {
  if (percent >= 85) return 'var(--accent)'
  if (percent >= 70) return 'var(--violet)'
  if (percent >= 50) return 'var(--brass)'
  return 'var(--pink)'
}
