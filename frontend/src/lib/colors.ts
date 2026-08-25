export const CATEGORY_COLORS: Record<string, string> = {
  Body: '#3dffb0',
  Fitness: '#3dffb0',
  Career: '#4cc9f0',
  Content: '#ff5fb2',
  Appearance: '#ffd43b',
  Learning: '#c77dff',
  Personal: '#ff8c42',
  Finance: '#2eeac5',
  Health: '#7dfe6a',
  Relationships: '#ff6b8a',
  Other: '#9bb7ff',
}

export function categoryColor(name?: string | null, fallback?: string | null) {
  if (name && CATEGORY_COLORS[name]) return CATEGORY_COLORS[name]
  return fallback || '#818cf8'
}

export function scoreTone(percent: number) {
  if (percent >= 85) return 'var(--mint)'
  if (percent >= 70) return 'var(--sky)'
  if (percent >= 50) return 'var(--brass)'
  return 'var(--pink)'
}
