import { restOverCue } from './sound'

export type RestState = { left: number; total: number; endsAt: number } | null

type Listener = () => void

let rest: RestState = null
let interval: number | null = null
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener()
}

function tick() {
  if (!rest) return
  const left = Math.max(0, Math.round((rest.endsAt - Date.now()) / 1000))
  if (left === rest.left) return
  if (left <= 0) {
    restOverCue()
    stopRest()
    return
  }
  rest = { ...rest, left }
  emit()
}

export function getRest() {
  return rest
}

export function subscribeRest(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function startRest(sec = 90) {
  stopRest()
  rest = { left: sec, total: sec, endsAt: Date.now() + sec * 1000 }
  interval = window.setInterval(tick, 250)
  document.addEventListener('visibilitychange', tick)
  emit()
}

export function addRest(sec: number) {
  if (!rest) return
  const left = rest.left + sec
  if (left <= 0) {
    stopRest()
    return
  }
  rest = { ...rest, left, total: rest.total + sec, endsAt: rest.endsAt + sec * 1000 }
  emit()
}

export function stopRest() {
  if (interval != null) window.clearInterval(interval)
  interval = null
  document.removeEventListener('visibilitychange', tick)
  if (rest) {
    rest = null
    emit()
  }
}
