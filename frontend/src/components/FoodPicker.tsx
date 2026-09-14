import { useEffect, useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import { Dialog } from './Dialog'
import { api } from '../lib/api'
import { MACRO_COLORS } from '../lib/colors'
import type { FoodHit, FoodServing } from '../types'

export const FOOD_MICROS = [
  { key: 'saturated_fat', label: 'Saturated fat', unit: 'g' },
  { key: 'polyunsaturated_fat', label: 'Polyunsaturated fat', unit: 'g' },
  { key: 'monounsaturated_fat', label: 'Monounsaturated fat', unit: 'g' },
  { key: 'trans_fat', label: 'Trans fat', unit: 'g' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'potassium', label: 'Potassium', unit: 'mg' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'vitamin_a', label: 'Vitamin A', unit: '% DV' },
  { key: 'vitamin_c', label: 'Vitamin C', unit: '% DV' },
  { key: 'calcium', label: 'Calcium', unit: '% DV' },
  { key: 'iron', label: 'Iron', unit: '% DV' },
] as const

export type PickedFood = {
  name: string
  grams: number
  unit: 'g' | 'ml'
  brand?: string
  externalId?: string
  source?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  micros?: Record<string, number>
}

const DEFAULT_SERVINGS: FoodServing[] = [
  { label: '1 gram', amount: 1, unit: 'g' },
  { label: '100 gram', amount: 100, unit: 'g' },
  { label: '1 ml', amount: 1, unit: 'ml' },
  { label: '100 ml', amount: 100, unit: 'ml' },
  { label: '250 ml', amount: 250, unit: 'ml' },
]

export function scaleFood(hit: FoodHit, grams: number, unit: 'g' | 'ml' = 'g'): PickedFood {
  const g = grams > 0 ? grams : 100
  const factor = g / 100
  return {
    name: hit.name,
    brand: hit.brand,
    externalId: hit.id,
    source: hit.source,
    grams: g,
    unit,
    kcal: Number(hit.kcal) * factor,
    protein: Number(hit.protein) * factor,
    carbs: Number(hit.carbs) * factor,
    fat: Number(hit.fat) * factor,
    micros: scaleMicros(hit.micros, factor),
  }
}

export function servingsOf(hit: FoodHit) {
  const rows = (hit.servings ?? []).filter((row) => Number(row.amount) > 0)
  const extras = rows.map((row) => ({
    ...row,
    unit: row.unit === 'ml' ? 'ml' : 'g',
    label: row.label || `${row.amount} ${row.unit === 'ml' ? 'ml' : 'gram'}`,
  }))
  const unique = new Map<string, FoodServing>()
  for (const row of [...extras, ...DEFAULT_SERVINGS]) {
    unique.set(`${row.amount}-${row.unit}`, row)
  }
  return [...unique.values()]
}

export function hitFromMacros(line: {
  name: string
  grams: number
  unit?: string
  kcal?: number
  protein?: number
  carbs?: number
  fat?: number
  externalId?: string
  source?: string
  brand?: string
  micros?: Record<string, number>
}): FoodHit {
  const grams = line.grams > 0 ? line.grams : 100
  const factor = 100 / grams
  const unit = line.unit === 'ml' ? 'ml' : 'g'
  return {
    id: line.externalId ?? 'custom',
    source: line.source ?? 'CUSTOM',
    name: line.name,
    brand: line.brand,
    kcal: (line.kcal ?? 0) * factor,
    protein: (line.protein ?? 0) * factor,
    carbs: (line.carbs ?? 0) * factor,
    fat: (line.fat ?? 0) * factor,
    per: '100g',
    servings: [
      { label: unit === 'ml' ? '1 ml' : '1 gram', amount: 1, unit },
      { label: unit === 'ml' ? '100 ml' : '100 gram', amount: 100, unit },
    ],
    micros: scaleMicros(line.micros, factor),
  }
}

export function FoodPicker({
  onPick,
  confirmLabel = 'Add',
}: {
  onPick: (food: PickedFood) => void | Promise<void>
  confirmLabel?: string
}) {
  const [selected, setSelected] = useState<FoodHit | null>(null)

  return (
    <>
      <FoodSearch onSelect={setSelected} />
      {selected && (
        <FoodEntryDialog
          hit={selected}
          confirmLabel={confirmLabel}
          onBack={() => setSelected(null)}
          onClose={() => setSelected(null)}
          onConfirm={async (food) => {
            await onPick(food)
            setSelected(null)
          }}
        />
      )}
    </>
  )
}

export function FoodSearch({ onSelect }: { onSelect: (hit: FoodHit) => void }) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<FoodHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setSearched(false)
      setError(null)
      return
    }
    const handle = window.setTimeout(() => {
      void runSearch(q)
    }, 320)
    return () => window.clearTimeout(handle)
  }, [query])

  async function runSearch(q: string) {
    setSearching(true)
    setError(null)
    try {
      const results = await api<FoodHit[]>(`/api/foods/search?q=${encodeURIComponent(q)}`)
      setHits(results)
      setSearched(true)
      if (results.length === 0) setError('No foods found')
    } catch {
      setHits([])
      setSearched(true)
      setError('Could not search foods')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div>
      <div className="relative">
        <input
          className={`field ${query ? 'pr-20' : 'pr-11'}`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              const q = query.trim()
              if (q) void runSearch(q)
            }
          }}
          placeholder="Search foods, brands…"
          autoFocus
        />
        {query && (
          <button
            type="button"
            className="absolute top-1/2 right-10 -translate-y-1/2 px-1 text-sm text-[var(--muted)]"
            aria-label="Clear search"
            onClick={() => setQuery('')}
          >
            ×
          </button>
        )}
        <button
          type="button"
          className="icon-btn icon-btn-add absolute top-1/2 right-1.5 -translate-y-1/2"
          aria-label="Search"
          onClick={() => {
            const q = query.trim()
            if (q) void runSearch(q)
          }}
        >
          <Search size={16} />
        </button>
      </div>
      <div className="mt-2 max-h-[50vh] overflow-y-auto">
        {searching && <p className="py-8 text-center text-sm text-[var(--muted)]">Searching…</p>}
        {!searching && query.trim().length > 0 && query.trim().length < 2 && (
          <p className="py-8 text-center text-sm text-[var(--muted)]">Type at least 2 letters.</p>
        )}
        {!searching && searched && hits.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--danger)]">{error ?? 'No foods found'}</p>
        )}
        {!searching &&
          hits.map((hit) => (
            <div key={`${hit.source}-${hit.id}`} className="diary-row flex items-center gap-3 py-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(hit)}>
                <span className="block truncate text-[15px] font-medium">{hit.name}</span>
                <span className="block text-xs text-[var(--muted)]">
                  {hit.source === 'CUSTOM' ? 'Yours · ' : hit.brand ? `${hit.brand} · ` : ''}
                  {Math.round(Number(hit.kcal))} cal / 100g
                </span>
              </button>
              <button
                type="button"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--diary-blue)] text-[var(--accent-fg)]"
                aria-label={`Add ${hit.name}`}
                onClick={() => onSelect(hit)}
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}

export function FoodEntryDialog({
  hit,
  amount,
  unit,
  title = 'Add Food',
  confirmLabel = 'Add',
  layer = 2,
  onBack,
  onClose,
  onConfirm,
}: {
  hit: FoodHit
  amount?: number
  unit?: 'g' | 'ml'
  title?: string
  confirmLabel?: string
  layer?: number
  onBack: () => void
  onClose: () => void
  onConfirm: (food: PickedFood) => void | Promise<void>
}) {
  const options = servingsOf(hit)
  const own = hit.source === 'CUSTOM' ? hit.servings?.[0] : undefined
  const initial = initialServing(
    options,
    amount,
    unit,
    own ? Number(own.amount) : undefined,
    own?.unit === 'ml' ? 'ml' : own ? 'g' : undefined,
    hit.defaultServings,
  )
  const [optionKey, setOptionKey] = useState(initial.key)
  const [servings, setServings] = useState(initial.servings)
  const [saving, setSaving] = useState(false)

  const option = options.find((row) => keyOf(row) === optionKey) ?? options[0]
  const count = Number(servings) > 0 ? Number(servings) : 1
  const portion = Number(option?.amount) > 0 ? Number(option.amount) : 1
  const measure = option?.unit === 'ml' ? 'ml' : 'g'
  const grams = count * portion
  const preview = scaleFood(hit, grams, measure)

  async function save() {
    setSaving(true)
    try {
      await onConfirm(preview)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      title={title}
      layer={layer}
      onClose={onClose}
      onBack={onBack}
      action={
        <button type="button" className="grid size-10 place-items-center text-[var(--fg)]" aria-label={confirmLabel} disabled={saving} onClick={() => void save()}>
          <Check size={22} strokeWidth={2.25} />
        </button>
      }
    >
      <div className="-mx-6">
        <div className="px-6 pb-2">
          <h3 className="text-[22px] leading-tight font-semibold">{hit.name}</h3>
          {hit.brand && <p className="mt-1 text-sm text-[var(--muted)]">{hit.brand}</p>}
        </div>
        <div className="food-field-row">
          <span>Serving Size</span>
          <select
            className="food-value"
            value={optionKey}
            onChange={(event) => {
              setOptionKey(event.target.value)
              const next = options.find((row) => keyOf(row) === event.target.value)
              if (next && Number(next.amount) === 1) setServings('100')
              else setServings('1')
            }}
          >
            {options.map((row) => (
              <option key={keyOf(row)} value={keyOf(row)}>
                {row.label}
              </option>
            ))}
          </select>
        </div>
        <div className="food-field-row">
          <span>Number of Servings</span>
          <input
            className="food-value"
            inputMode="decimal"
            value={servings}
            onChange={(event) => {
              setServings(event.target.value.replace(/[^\d.]/g, ''))
            }}
          />
        </div>
        <div className="px-6 pt-5">
          <MacroBoard food={preview} />
          <MicroList micros={hit.micros} grams={grams} />
        </div>
      </div>
    </Dialog>
  )
}

export function MicroList({
  micros,
  grams = 100,
}: {
  micros?: Record<string, number>
  grams?: number
}) {
  const factor = (grams > 0 ? grams : 100) / 100
  return (
    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {FOOD_MICROS.map((row) => {
        const raw = micros?.[row.key]
        const missing = raw == null || Number.isNaN(Number(raw))
        return (
          <div key={row.key} className="flex justify-between gap-3 border-b border-[var(--line)] py-1.5">
            <dt className="text-[var(--muted)]">{row.label}</dt>
            <dd className="tabular">
              {missing ? '—' : `${fmt(Number(raw) * factor)} ${row.unit}`}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export function MacroBoard({ food }: { food: { kcal: number; protein: number; carbs: number; fat: number } }) {
  const carbsCal = Math.max(0, food.carbs) * 4
  const fatCal = Math.max(0, food.fat) * 9
  const proteinCal = Math.max(0, food.protein) * 4
  const energy = carbsCal + fatCal + proteinCal
  const pct = (value: number) => (energy <= 0 ? 0 : Math.round((value / energy) * 100))
  const items = [
    { key: 'carbs', label: 'Carbs', grams: food.carbs, cal: carbsCal, color: MACRO_COLORS.carbs, pct: pct(carbsCal) },
    { key: 'fat', label: 'Fat', grams: food.fat, cal: fatCal, color: MACRO_COLORS.fat, pct: pct(fatCal) },
    { key: 'protein', label: 'Protein', grams: food.protein, cal: proteinCal, color: MACRO_COLORS.protein, pct: pct(proteinCal) },
  ]
  return (
    <div className="flex flex-col items-center gap-5 min-[480px]:flex-row min-[480px]:items-center">
      <MacroDonut kcal={food.kcal} slices={items} />
      <div className="grid min-w-0 flex-1 grid-cols-3 gap-2 text-center">
        {items.map((item) => (
          <div key={item.key}>
            <div className="text-sm font-semibold tabular" style={{ color: item.color }}>
              {item.pct}%
            </div>
            <div className="text-[15px] font-semibold tabular">{fmt(item.grams)} g</div>
            <div className="text-xs text-[var(--muted)]">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MacroDonut({
  kcal,
  slices,
}: {
  kcal: number
  slices: { key: string; cal: number; color: string }[]
}) {
  const radius = 34
  const circ = 2 * Math.PI * radius
  const energy = slices.reduce((sum, slice) => sum + slice.cal, 0)
  let offset = 0
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true" className="shrink-0 text-[var(--fg)]">
      <circle cx="44" cy="44" r={radius} fill="none" stroke="var(--diary-track)" strokeWidth="8" />
      {energy > 0 &&
        slices.map((slice) => {
          const len = (slice.cal / energy) * circ
          const dash = offset
          offset += len
          return (
            <circle
              key={slice.key}
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="8"
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-dash}
              transform="rotate(-90 44 44)"
            />
          )
        })}
      <text x="44" y="42" textAnchor="middle" fill="currentColor" fontSize="16" fontWeight="700">
        {Math.round(kcal)}
      </text>
      <text x="44" y="58" textAnchor="middle" fill="currentColor" opacity="0.55" fontSize="9">
        cal
      </text>
    </svg>
  )
}

function keyOf(row: FoodServing) {
  return `${row.amount}-${row.unit}`
}

function initialServing(
  options: FoodServing[],
  amount?: number,
  unit?: 'g' | 'ml',
  preferredAmount?: number,
  preferredUnit?: 'g' | 'ml',
  defaultCount?: number,
) {
  if (amount != null && amount > 0) {
    const matchUnit = unit === 'ml' ? 'ml' : 'g'
    const one = options.find((row) => Number(row.amount) === 1 && row.unit === matchUnit)
    if (one) {
      return { key: keyOf(one), servings: String(Math.max(1, Math.round(amount))) }
    }
  }
  if (preferredAmount != null && preferredAmount > 0) {
    const matchUnit = preferredUnit === 'ml' ? 'ml' : 'g'
    const match = options.find((row) => Number(row.amount) === preferredAmount && row.unit === matchUnit)
    if (match) {
      return { key: keyOf(match), servings: String(defaultCount != null && defaultCount > 0 ? defaultCount : 1) }
    }
  }
  const oneGram = options.find((row) => Number(row.amount) === 1 && row.unit === 'g')
  if (oneGram) return { key: keyOf(oneGram), servings: '100' }
  const first = options[0]
  return { key: first ? keyOf(first) : '1-g', servings: '1' }
}

function fmt(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function scaleMicros(micros: Record<string, number> | undefined, factor: number) {
  if (!micros) return undefined
  return Object.fromEntries(Object.entries(micros).map(([key, value]) => [key, Number(value) * factor]))
}
