import { useEffect, useRef, useState } from 'react'

type Sound = 'rain' | 'wind' | 'sea' | 'static' | 'fire'

const LABELS: Record<Sound, string> = {
  rain: 'Rain',
  wind: 'Wind',
  sea: 'Sea',
  static: 'Static',
  fire: 'Fire',
}

export function AmbientPlayer() {
  const [sound, setSound] = useState<Sound | null>(null)
  const [volume, setVolume] = useState(0.35)
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const nodesRef = useRef<AudioNode[]>([])
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => stop()
  }, [])

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume
  }, [volume])

  function context() {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    return ctxRef.current
  }

  function noise(ctx: AudioContext) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    return source
  }

  function stop() {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    for (const node of nodesRef.current) {
      if ('stop' in node && typeof node.stop === 'function') {
        try {
          node.stop()
        } catch {
          // already stopped
        }
      }
      node.disconnect()
    }
    nodesRef.current = []
    gainRef.current?.disconnect()
    gainRef.current = null
    setSound(null)
  }

  async function play(next: Sound) {
    if (sound === next) {
      stop()
      return
    }
    stop()
    const ctx = context()
    await ctx.resume()
    const gain = ctx.createGain()
    gain.gain.value = volume
    gain.connect(ctx.destination)
    gainRef.current = gain
    const source = noise(ctx)
    const filter = ctx.createBiquadFilter()
    if (next === 'rain') {
      filter.type = 'lowpass'
      filter.frequency.value = 1400
    } else if (next === 'wind') {
      filter.type = 'bandpass'
      filter.frequency.value = 400
      filter.Q.value = 0.6
    } else if (next === 'sea') {
      filter.type = 'lowpass'
      filter.frequency.value = 700
    } else if (next === 'fire') {
      filter.type = 'highpass'
      filter.frequency.value = 800
    } else {
      filter.type = 'highpass'
      filter.frequency.value = 200
    }
    source.connect(filter)
    filter.connect(gain)
    source.start()
    nodesRef.current = [source, filter]
    if (next === 'sea' || next === 'fire') {
      timerRef.current = window.setInterval(() => {
        filter.frequency.value = next === 'sea' ? 500 + Math.random() * 400 : 600 + Math.random() * 900
      }, 320)
    }
    setSound(next)
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(LABELS) as Sound[]).map((key) => (
          <button
            key={key}
            type="button"
            className={sound === key ? 'glass-primary px-4 py-2 text-sm' : 'glass-btn px-4 py-2 text-sm'}
            onClick={() => void play(key)}
          >
            {LABELS[key]}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
        />
      </label>
    </section>
  )
}
