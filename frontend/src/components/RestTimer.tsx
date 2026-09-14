import { useEffect, useState } from 'react'
import { addRest, getRest, startRest, stopRest, subscribeRest, type RestState } from '../lib/opengym/rest'

function clock(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

export function RestTimer() {
  const [timer, setTimer] = useState<RestState>(getRest())
  useEffect(() => subscribeRest(() => setTimer(getRest())), [])
  if (!timer) return null
  const pct = timer.total > 0 ? (timer.left / timer.total) * 100 : 0
  return (
    <div className="mt-3 min-w-0 w-full max-w-xs">
      <div className="text-xs text-[var(--muted)]">Rest</div>
      <div className="flex items-center gap-3">
        <div className="tabular text-2xl tracking-tight">{clock(timer.left)}</div>
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--fg)_10%,transparent)]">
          <i className="block h-full rounded-full bg-[var(--mint)]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" className="glass-btn px-3 py-1.5 text-sm" onClick={() => addRest(-15)}>
          −15s
        </button>
        <button type="button" className="glass-btn px-3 py-1.5 text-sm" onClick={() => addRest(15)}>
          +15s
        </button>
        <button type="button" className="glass-primary px-3 py-1.5 text-sm" onClick={stopRest}>
          Skip
        </button>
      </div>
    </div>
  )
}

export { startRest, stopRest }
