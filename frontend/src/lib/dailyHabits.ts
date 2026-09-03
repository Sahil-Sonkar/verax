import type { DaySnapshot, HabitItem } from '../types'

export const DAILY_HABITS = [
  { key: 'sleep', match: ['sleep'] },
  { key: 'water', match: ['water'] },
  { key: 'steps', match: ['step'] },
  { key: 'reading', match: ['read'] },
  { key: 'supplements', match: ['supplement'] },
  { key: 'workout', match: ['exercise', 'workout'] },
  { key: 'meditation', match: ['meditat'] },
] as const

export function flattenDay(day: DaySnapshot) {
  const rows: HabitItem[] = []
  for (const list of [day.nonNegotiables, day.growth, day.other]) {
    for (const item of list ?? []) {
      rows.push(item)
      for (const child of item.children ?? []) rows.push(child)
    }
  }
  return rows
}

export function pickDaily(rows: HabitItem[]) {
  const used = new Set<string>()
  return DAILY_HABITS.map((spec) => {
    const item = rows.find((row) => {
      if (used.has(row.habit.id)) return false
      const name = row.habit.name.toLowerCase()
      return spec.match.some((needle) => name.includes(needle))
    })
    if (item) used.add(item.habit.id)
    return { spec, item }
  })
}

export function pickTracked(rows: HabitItem[]) {
  const flagged = rows.filter((row) => row.habit.tracked && !row.habit.parentId)
  if (flagged.length) return flagged
  return pickDaily(rows)
    .map((row) => row.item)
    .filter((item): item is HabitItem => Boolean(item))
}

export function isWaterHabit(item: HabitItem) {
  const unit = item.habit.unit?.toLowerCase() ?? ''
  return unit === 'l' || unit === 'liter' || unit === 'liters' || /water/i.test(item.habit.name)
}

export function isStepsHabit(item: HabitItem) {
  return /step/i.test(item.habit.name) || item.habit.unit?.toLowerCase() === 'steps'
}
