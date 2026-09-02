import { EXDB, type GymExercise } from './exercises-data.js'
import type { ExerciseHit } from '../../types'

export type { GymExercise }

const IMG_BASE =
  import.meta.env.VITE_TRAIN_IMG_BASE ||
  'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@master/images/'
const GIF_BASE =
  import.meta.env.VITE_TRAIN_GIF_BASE ||
  'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@master/videos/'

export function imgSrc(ex: GymExercise) {
  return IMG_BASE + ex.img
}

export function gifSrc(ex: GymExercise) {
  return GIF_BASE + ex.gif
}

function mappedMuscle(bp: string, tg: string) {
  if (bp === 'cardio') return 'CARDIO'
  if (bp === 'chest') return 'CHEST'
  if (bp === 'back') return 'BACK'
  if (bp === 'shoulders' || bp === 'neck') return 'SHOULDERS'
  if (bp === 'waist') return 'CORE'
  if (bp === 'lower legs') return 'CALVES'
  if (bp === 'upper legs') {
    if (/hamstring/i.test(tg)) return 'HAMS'
    if (/glute/i.test(tg)) return 'GLUTES'
    return 'QUADS'
  }
  if (bp === 'upper arms') return /tricep/i.test(tg) ? 'TRICEPS' : 'BICEPS'
  return 'OTHER'
}

export function toHit(ex: GymExercise): ExerciseHit {
  return {
    name: ex.n,
    type: ex.eq || '',
    muscle: ex.tg || ex.bp,
    mappedMuscle: mappedMuscle(ex.bp, ex.tg),
    track: ex.bp === 'cardio' ? 'TIME' : 'REPS',
    difficulty: '',
    instructions: (ex.st ?? []).join('\n'),
    safetyInfo: '',
    equipment: ex.eq ? [ex.eq] : [],
    catalogId: ex.id,
    img: imgSrc(ex),
    gif: gifSrc(ex),
  }
}

function key(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function findExercise(name: string): GymExercise | undefined {
  const needle = key(name)
  if (!needle) return undefined
  return (
    EXDB.find((ex) => key(ex.n) === needle) ??
    EXDB.find((ex) => key(ex.n).includes(needle) || needle.includes(key(ex.n)))
  )
}

export function searchCatalog(query: string, limit = 24): ExerciseHit[] {
  const needle = key(query)
  if (!needle) return []
  const scored = EXDB.map((ex) => {
    const name = key(ex.n)
    const hay = `${name} ${key(ex.tg)} ${key(ex.bp)} ${key(ex.eq)}`
    let score = 0
    if (name === needle) score = 100
    else if (name.startsWith(needle)) score = 80
    else if (name.includes(needle)) score = 60
    else if (hay.includes(needle)) score = 30
    return { ex, score }
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.ex.n.localeCompare(b.ex.n))
  return scored.slice(0, limit).map((row) => toHit(row.ex))
}
