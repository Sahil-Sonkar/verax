let audioCtx: AudioContext | null = null

export function beep(enabled: boolean, freq = 880, dur = 0.18, when = 0) {
  if (!enabled) return
  try {
    const Audio = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Audio) return
    audioCtx = audioCtx || new Audio()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    const t0 = audioCtx.currentTime + when
    gain.gain.setValueAtTime(0.001, t0)
    gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  } catch {
    /* ignore */
  }
}

export function vibrate(pattern: number | number[] = 200) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* ignore */
  }
}

export function restOverCue() {
  beep(true, 880, 0.15)
  beep(true, 880, 0.15, 0.25)
  beep(true, 1320, 0.4, 0.5)
  vibrate([200, 100, 200])
}
