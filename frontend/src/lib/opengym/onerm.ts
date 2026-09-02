export const REP_CAP = 12
export const DEFAULT_FORMULA = 'epley'

export const FORMULAS = {
  epley: (w: number, r: number) => w * (1 + r / 30),
  brzycki: (w: number, r: number) => (w * 36) / (37 - r),
  lombardi: (w: number, r: number) => w * Math.pow(r, 0.1),
}

export function estimate1RM(w: number, r: number, formula: keyof typeof FORMULAS = DEFAULT_FORMULA) {
  const weight = Number(w)
  const reps = Number(r)
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null
  if (weight <= 0 || reps < 1) return null
  if (reps > REP_CAP) return null
  const fn = FORMULAS[formula] ?? FORMULAS[DEFAULT_FORMULA]
  const est = reps === 1 ? weight : fn(weight, Math.round(reps))
  if (!Number.isFinite(est) || est <= 0) return null
  return Math.round(est * 10) / 10
}

export function best1RM(sets: { kg?: number | null; reps?: number | null }[]) {
  let best: { est: number; w: number; r: number } | null = null
  for (const set of sets) {
    const est = estimate1RM(Number(set.kg), Number(set.reps))
    if (est != null && (!best || est > best.est)) {
      best = { est, w: Number(set.kg), r: Math.round(Number(set.reps)) }
    }
  }
  return best
}
