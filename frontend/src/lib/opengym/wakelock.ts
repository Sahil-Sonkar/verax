import { useEffect } from 'react'

export const wakeLockSupported = () => 'wakeLock' in navigator

let sentinel: WakeLockSentinel | null = null
let wanted = false
let pending = false

async function acquire() {
  if (!wanted || sentinel || pending || !wakeLockSupported()) return
  if (document.visibilityState !== 'visible') return
  pending = true
  try {
    const next = await navigator.wakeLock.request('screen')
    if (!wanted) {
      void next.release()
      return
    }
    sentinel = next
    next.addEventListener('release', () => {
      if (sentinel === next) sentinel = null
    })
  } catch {
    sentinel = null
  } finally {
    pending = false
  }
}

function onVisible() {
  if (document.visibilityState === 'visible') void acquire()
}

export function requestWakeLock() {
  if (wanted) return
  wanted = true
  document.addEventListener('visibilitychange', onVisible)
  void acquire()
}

export function releaseWakeLock() {
  wanted = false
  document.removeEventListener('visibilitychange', onVisible)
  const current = sentinel
  sentinel = null
  if (current) void current.release()
}

export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    requestWakeLock()
    return releaseWakeLock
  }, [enabled])
}
