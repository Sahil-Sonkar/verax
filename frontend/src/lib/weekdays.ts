export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function isoWeekday(date = new Date()) {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

export function formatClock(minutes: number, hour12 = false) {
  const wrapped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const hours = Math.floor(wrapped / 60)
  const mins = wrapped % 60
  if (!hour12) {
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }
  const suffix = hours >= 12 ? 'pm' : 'am'
  const hour = hours % 12 === 0 ? 12 : hours % 12
  return `${String(hour).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${suffix}`
}

export function toTimeInput(minutes: number) {
  const wrapped = Math.min(Math.max(minutes, 0), 24 * 60)
  if (wrapped >= 24 * 60) return '23:59'
  const hours = Math.floor(wrapped / 60)
  const mins = wrapped % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function parseClock(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 24 || minutes > 59) return null
  return Math.min(hours * 60 + minutes, 24 * 60)
}

export function minutesNow() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}
