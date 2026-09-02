export type GymExercise = {
  id: string
  n: string
  bp: string
  eq: string
  tg: string
  mg?: string
  sm?: string[]
  st?: string[]
  img: string
  gif: string
}

export const EXDB: GymExercise[]
