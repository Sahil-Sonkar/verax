import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check as CheckMark, ChevronLeft, ChevronRight, Circle, Plus } from 'lucide'
import { Glyph } from '../components/Glyph'
import { MonoBars } from '../components/mono/MonoBars'
import { MonoDonut } from '../components/mono/MonoDonut'
import { MonoLine } from '../components/mono/MonoLine'
import { Link } from 'react-router-dom'
import { Dialog, PrimaryButton } from '../components/Dialog'
import { AddButton, TrashButton } from '../components/IconButtons'
import { FOOD_MICROS, FoodEntryDialog, FoodPicker, FoodSearch, MacroBoard, MicroList, hitFromMacros, type PickedFood } from '../components/FoodPicker'
import { PageTabs } from '../components/PageHeader'
import { api } from '../lib/api'
import { MACRO_COLORS } from '../lib/colors'
import type { DayMeals, FoodHit, FoodLine, FuelSupplement, Meal, MealSummary, Recipe, UserFood } from '../types'

const MEAL_SLOTS = [
  { id: 'BREAKFAST', label: 'Breakfast' },
  { id: 'LUNCH', label: 'Lunch' },
  { id: 'DINNER', label: 'Dinner' },
  { id: 'SNACK', label: 'Snacks' },
] as const

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const GOAL_KEY = 'verax.recipe.kcalGoal'
const WATER_GOAL_ML = 3000
const WATER_MAX_ML = 4000
const WATER_POURS = [
  { ml: 250, label: '250 ml' },
  { ml: 700, label: '700 ml' },
  { ml: 1000, label: '1 L' },
] as const
const MACRO_SPLIT = { carbs: 0.5, protein: 0.2, fat: 0.3 }
const MACRO_SERIES = [
  { key: 'protein' as const, label: 'Protein', color: MACRO_COLORS.protein },
  { key: 'carbs' as const, label: 'Carbs', color: MACRO_COLORS.carbs },
  { key: 'fat' as const, label: 'Fat', color: MACRO_COLORS.fat },
]
const MEAL_COLORS: Record<string, string> = {
  Breakfast: 'var(--sky)',
  Lunch: 'var(--brass)',
  Dinner: 'var(--danger)',
  Snacks: 'var(--mint)',
  Other: 'var(--muted)',
}
type DiaryTab = 'diary' | 'recipes' | 'supplements' | 'nutrition'
const DIARY_TABS = [
  { id: 'diary', label: 'Diary' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'supplements', label: 'Supplements' },
  { id: 'nutrition', label: 'Nutrition' },
] as const
type SupplementDraft = { name: string; dose: string; timing: string; notes: string }
type UserFoodDraft = {
  name: string
  brand: string
  servingAmount: string
  servingUnit: 'g' | 'ml'
  servings: string
  kcal: string
  protein: string
  carbs: string
  fat: string
  micros: Record<string, string>
}

const EMPTY_USER_FOOD: UserFoodDraft = {
  name: '',
  brand: '',
  servingAmount: '100',
  servingUnit: 'g',
  servings: '1',
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
  micros: {},
}

function foodPortionGrams(amount?: number | string, servings?: number | string) {
  const size = Number(amount) > 0 ? Number(amount) : 100
  const count = Number(servings) > 0 ? Number(servings) : 1
  return size * count
}

function per100ToPortion(value: number | undefined, grams: number) {
  return ((value ?? 0) * grams) / 100
}

const SUPPLEMENT_TIMES = ['Morning', 'With meals', 'Night', 'Pre-workout'] as const
const EMPTY_SUPPLEMENT: SupplementDraft = { name: '', dose: '', timing: '', notes: '' }
type MacroMode = 'eaten' | 'left' | 'pct'

function slotLabel(slot: string) {
  return MEAL_SLOTS.find((item) => item.id === slot)?.label ?? 'Other'
}

function today() {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

function shift(date: string, days: number) {
  const next = new Date(`${date}T00:00:00`)
  next.setDate(next.getDate() + days)
  return new Intl.DateTimeFormat('en-CA').format(next)
}

function startOfWeek(date: string) {
  const next = new Date(`${date}T00:00:00`)
  const day = next.getDay()
  next.setDate(next.getDate() - (day === 0 ? 6 : day - 1))
  return new Intl.DateTimeFormat('en-CA').format(next)
}

function weekOf(date: string) {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, index) => shift(start, index))
}

function formatDiaryDate(date: string) {
  if (date === today()) return 'Today'
  if (date === shift(today(), -1)) return 'Yesterday'
  if (date === shift(today(), 1)) return 'Tomorrow'
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function macro(value?: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value ?? 0)
}

function loadGoal() {
  const stored = Number(localStorage.getItem(GOAL_KEY))
  return stored > 500 ? stored : 2000
}

function macroGoals(kcal: number) {
  return {
    carbs: (kcal * MACRO_SPLIT.carbs) / 4,
    protein: (kcal * MACRO_SPLIT.protein) / 4,
    fat: (kcal * MACRO_SPLIT.fat) / 9,
  }
}

function mealSubtitle(meal: Meal) {
  if (meal.items.length === 1) {
    const item = meal.items[0]
    return servingLabel(item.grams, item.unit)
  }
  if (meal.items.length > 1) return `${meal.items.length} foods`
  return 'Logged'
}

function formatLiters(ml: number) {
  return `${(Math.max(0, ml) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`
}

function servingLabel(grams: number | string, unit?: string) {
  const amount = typeof grams === 'string' ? Number(grams) : grams
  const measure = unit === 'ml' ? 'ml' : 'g'
  const rounded = Math.round((Number(amount) || 0) * 10) / 10
  return `${rounded} ${measure}`
}

function formatPeriodLabel(period: string, grain: 'day' | 'week' | 'month') {
  if (grain === 'week') {
    const match = period.match(/^(\d{4})-W(\d+)$/)
    return match ? `W${Number(match[2])}` : period
  }
  if (grain === 'month') {
    const [year, month] = period.split('-')
    if (!year || !month) return period
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-IN', {
      month: 'short',
      year: '2-digit',
    })
  }
  const date = new Date(`${period}T00:00:00`)
  if (Number.isNaN(date.getTime())) return period
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function ChartKey({ items }: { items: { label: string; color: string; detail?: string }[] }) {
  if (items.length === 0) return null
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: item.color }} aria-hidden />
          <span className="font-medium">{item.label}</span>
          {item.detail != null && <span className="tabular text-[var(--muted)]">{item.detail}</span>}
        </li>
      ))}
    </ul>
  )
}

export function FuelPage() {
  const queryClient = useQueryClient()
  const [date, setDate] = useState(today())
  const [tab, setTab] = useState<DiaryTab>('diary')
  const [grain, setGrain] = useState<'day' | 'week' | 'month'>('day')
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [foodOpen, setFoodOpen] = useState(false)
  const [editingFood, setEditingFood] = useState<UserFood | null>(null)
  const [foodDraft, setFoodDraft] = useState<UserFoodDraft>(EMPTY_USER_FOOD)
  const [foodError, setFoodError] = useState('')
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [supplementOpen, setSupplementOpen] = useState(false)
  const [editingSupplement, setEditingSupplement] = useState<FuelSupplement | null>(null)
  const [supplementDraft, setSupplementDraft] = useState<SupplementDraft>(EMPTY_SUPPLEMENT)
  const [addingSlot, setAddingSlot] = useState<(typeof MEAL_SLOTS)[number]['id'] | 'OTHER' | null>(null)
  const [searchTab, setSearchTab] = useState<'all' | 'recipes'>('all')
  const [storedGoal, setStoredGoal] = useState(loadGoal)
  const [goalOpen, setGoalOpen] = useState(false)
  const [goalDraft, setGoalDraft] = useState(String(loadGoal()))
  const [macroMode, setMacroMode] = useState<MacroMode>('eaten')
  const from = shift(date, grain === 'month' ? -31 : grain === 'week' ? -27 : -6)
  const days = weekOf(date)

  const day = useQuery({
    queryKey: ['meals-day', date],
    queryFn: () => api<DayMeals>(`/api/meals/day?date=${date}`),
  })
  const recipes = useQuery({ queryKey: ['recipes'], queryFn: () => api<Recipe[]>('/api/recipes') })
  const userFoods = useQuery({ queryKey: ['user-foods'], queryFn: () => api<UserFood[]>('/api/foods') })
  const fuelSupplements = useQuery({
    queryKey: ['supplements', date],
    queryFn: () => api<FuelSupplement[]>(`/api/supplements?date=${date}`),
  })
  const summary = useQuery({
    queryKey: ['meals-summary', from, date, grain],
    queryFn: () => api<MealSummary>(`/api/meals/summary?from=${from}&to=${date}&granularity=${grain}`),
  })

  const food = Number(day.data?.totals.kcal ?? 0)
  const burned = Number(day.data?.energy?.burned ?? 0)
  const tdee = day.data?.energy?.tdee != null ? Number(day.data.energy.tdee) : null
  const kcalGoal = tdee != null && tdee > 0 ? tdee : storedGoal
  const remaining = tdee != null && day.data?.energy?.remaining != null
    ? Number(day.data.energy.remaining)
    : kcalGoal - food + burned
  const burns = day.data?.energy?.burns ?? []
  const goals = macroGoals(kcalGoal)
  const eaten = {
    carbs: Number(day.data?.totals.carbs ?? 0),
    fat: Number(day.data?.totals.fat ?? 0),
    protein: Number(day.data?.totals.protein ?? 0),
  }

  const chart = useMemo(
    () =>
      (summary.data?.points ?? []).map((point) => ({
        period: point.period,
        label: formatPeriodLabel(point.period, grain),
        kcal: Number(point.totals.kcal),
        protein: Number(point.totals.protein),
        carbs: Number(point.totals.carbs),
        fat: Number(point.totals.fat),
      })),
    [summary.data, grain],
  )

  const pie = [...MEAL_SLOTS, { id: 'OTHER' as const, label: 'Other' }]
    .map((slot) => {
      const kcal = (day.data?.meals ?? [])
        .filter((meal) => meal.slot === slot.id)
        .reduce((sum, meal) => sum + Number(meal.totals.kcal), 0)
      return { name: slot.label, value: kcal, color: MEAL_COLORS[slot.label] ?? 'var(--muted)' }
    })
    .filter((row) => row.value > 0)

  async function refreshMeals() {
    await queryClient.invalidateQueries({ queryKey: ['meals-day'] })
    await queryClient.invalidateQueries({ queryKey: ['meals-summary'] })
  }

  async function saveWater(body: { milliliters?: number; addMl?: number }) {
    const next = await api<DayMeals>('/api/meals/water', {
      method: 'PUT',
      body: JSON.stringify({ date, ...body }),
    })
    queryClient.setQueryData(['meals-day', date], next)
    void queryClient.invalidateQueries({ queryKey: ['today'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  async function addRecipeTo(recipe: Recipe, slot: string) {
    await api('/api/meals', { method: 'POST', body: JSON.stringify({ date, slot, recipeId: recipe.id }) })
    await refreshMeals()
  }

  async function addFoodTo(food: PickedFood, slot: string) {
    await api('/api/meals', {
      method: 'POST',
      body: JSON.stringify({ date, slot, name: food.name, items: [food] }),
    })
    await refreshMeals()
  }

  async function saveLoggedMeal(meal: Meal, next: FoodDraft) {
    await api(`/api/meals/${meal.id}`, { method: 'PATCH', body: JSON.stringify({ name: next.name, slot: next.slot }) })
    const kept = new Set(next.items.filter((item) => item.id).map((item) => item.id))
    for (const item of meal.items) {
      if (!kept.has(item.id)) {
        await api(`/api/meals/items/${item.id}`, { method: 'DELETE' })
      }
    }
    for (const item of next.items) {
      if (!item.name.trim()) continue
      if (item.id) {
        await api(`/api/meals/items/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify(linePayload(item)),
        })
      } else {
        await api(`/api/meals/${meal.id}/items`, {
          method: 'POST',
          body: JSON.stringify(linePayload(item)),
        })
      }
    }
    setEditingMeal(null)
    await refreshMeals()
  }

  async function saveRecipeDraft(recipe: Recipe, next: FoodDraft) {
    await api(`/api/recipes/${recipe.id}`, { method: 'PATCH', body: JSON.stringify({ name: next.name }) })
    const kept = new Set(next.items.filter((item) => item.id).map((item) => item.id))
    for (const item of recipe.items) {
      if (!kept.has(item.id)) {
        await api(`/api/recipes/items/${item.id}`, { method: 'DELETE' })
      }
    }
    for (const item of next.items) {
      if (!item.name.trim()) continue
      if (item.id) {
        await api(`/api/recipes/items/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify(linePayload(item)),
        })
      } else {
        await api(`/api/recipes/${recipe.id}/items`, {
          method: 'POST',
          body: JSON.stringify(linePayload(item)),
        })
      }
    }
    setEditingRecipe(null)
    void queryClient.invalidateQueries({ queryKey: ['recipes'] })
  }

  async function removeRecipe(id: string) {
    await api(`/api/recipes/${id}`, { method: 'DELETE' })
    setEditingRecipe((current) => (current?.id === id ? null : current))
    void queryClient.invalidateQueries({ queryKey: ['recipes'] })
  }

  function openNewFood() {
    setEditingFood(null)
    setFoodDraft(EMPTY_USER_FOOD)
    setFoodError('')
    setFoodOpen(true)
  }

  function openEditFood(food: UserFood) {
    const grams = foodPortionGrams(food.servingAmount, food.servings)
    setEditingFood(food)
    setFoodDraft({
      name: food.name,
      brand: food.brand ?? '',
      servingAmount: String(food.servingAmount ?? 100),
      servingUnit: food.servingUnit === 'ml' ? 'ml' : 'g',
      servings: String(food.servings ?? 1),
      kcal: String(per100ToPortion(food.kcal, grams)),
      protein: String(per100ToPortion(food.protein, grams)),
      carbs: String(per100ToPortion(food.carbs, grams)),
      fat: String(per100ToPortion(food.fat, grams)),
      micros: Object.fromEntries(
        FOOD_MICROS.filter((row) => food.micros?.[row.key] != null).map((row) => [
          row.key,
          String(per100ToPortion(food.micros![row.key], grams)),
        ]),
      ),
    })
    setFoodError('')
    setFoodOpen(true)
  }

  async function saveUserFood() {
    setFoodError('')
    const micros = Object.fromEntries(
      FOOD_MICROS.flatMap((row) => {
        const raw = foodDraft.micros[row.key]
        if (raw == null || raw.trim() === '') return []
        const value = Number(raw)
        return Number.isFinite(value) ? [[row.key, value]] : []
      }),
    )
    const body = {
      name: foodDraft.name.trim(),
      brand: foodDraft.brand.trim() || null,
      servingAmount: Number(foodDraft.servingAmount) || 100,
      servingUnit: foodDraft.servingUnit,
      servings: Number(foodDraft.servings) > 0 ? Number(foodDraft.servings) : 1,
      kcal: Number(foodDraft.kcal) || 0,
      protein: Number(foodDraft.protein) || 0,
      carbs: Number(foodDraft.carbs) || 0,
      fat: Number(foodDraft.fat) || 0,
      micros,
    }
    try {
      if (editingFood) {
        await api(`/api/foods/${editingFood.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        await api('/api/foods', { method: 'POST', body: JSON.stringify(body) })
      }
      setFoodOpen(false)
      setEditingFood(null)
      setFoodDraft(EMPTY_USER_FOOD)
      void queryClient.invalidateQueries({ queryKey: ['user-foods'] })
    } catch (err) {
      setFoodError(err instanceof Error ? err.message : 'Could not save that food.')
    }
  }

  async function removeFood(id: string) {
    await api(`/api/foods/${id}`, { method: 'DELETE' })
    setFoodOpen(false)
    setEditingFood(null)
    void queryClient.invalidateQueries({ queryKey: ['user-foods'] })
  }

  async function refreshSupplements() {
    await queryClient.invalidateQueries({ queryKey: ['supplements'] })
  }

  function openNewSupplement() {
    setEditingSupplement(null)
    setSupplementDraft(EMPTY_SUPPLEMENT)
    setSupplementOpen(true)
  }

  function openEditSupplement(row: FuelSupplement) {
    setEditingSupplement(row)
    setSupplementDraft({
      name: row.name,
      dose: row.dose ?? '',
      timing: row.timing ?? '',
      notes: row.notes ?? '',
    })
    setSupplementOpen(true)
  }

  async function saveSupplementDraft() {
    const body = {
      name: supplementDraft.name.trim(),
      dose: supplementDraft.dose.trim(),
      timing: supplementDraft.timing.trim(),
      notes: supplementDraft.notes.trim(),
    }
    if (!body.name) return
    if (editingSupplement) {
      await api(`/api/supplements/${editingSupplement.id}`, { method: 'PATCH', body: JSON.stringify(body) })
    } else {
      await api('/api/supplements', { method: 'POST', body: JSON.stringify(body) })
    }
    setSupplementOpen(false)
    setEditingSupplement(null)
    setSupplementDraft(EMPTY_SUPPLEMENT)
    await refreshSupplements()
  }

  async function removeSupplement(id: string) {
    await api(`/api/supplements/${id}`, { method: 'DELETE' })
    setEditingSupplement((current) => (current?.id === id ? null : current))
    setSupplementOpen(false)
    await refreshSupplements()
  }

  async function setSupplementServings(id: string, servings: number) {
    const next = await api<FuelSupplement>(`/api/supplements/${id}/day`, {
      method: 'PUT',
      body: JSON.stringify({ date, servings: Math.max(0, Math.min(20, servings)) }),
    })
    queryClient.setQueryData<FuelSupplement[]>(['supplements', date], (current) =>
      (current ?? []).map((row) => (row.id === next.id ? { ...row, ...next } : row)),
    )
  }

  function saveGoal() {
    const next = Number(goalDraft)
    if (!Number.isFinite(next) || next < 800) return
    localStorage.setItem(GOAL_KEY, String(Math.round(next)))
    setStoredGoal(Math.round(next))
    setGoalOpen(false)
  }

  function openLog(slot: (typeof MEAL_SLOTS)[number]['id'] | 'OTHER' = 'BREAKFAST', nextTab: 'all' | 'recipes' = 'all') {
    setAddingSlot(slot)
    setSearchTab(nextTab)
  }

  const slotTotals = Object.fromEntries(
    [...MEAL_SLOTS.map((item) => item.id), 'OTHER'].map((slot) => [
      slot,
      (day.data?.meals ?? []).filter((meal) => meal.slot === slot).reduce((sum, meal) => sum + Number(meal.totals.kcal), 0),
    ]),
  ) as Record<string, number>

  return (
    <div className="diary-page">
      <div className="diary-chrome">
      <div className="flex items-center justify-between py-1">
        <button type="button" className="grid size-11 place-items-center text-[var(--diary-blue)]" onClick={() => setDate(shift(date, -1))} aria-label="Previous day">
          <Glyph icon={ChevronLeft} size={22} />
        </button>
        <div className="text-center">
          <div className="text-[15px] font-semibold">{formatDiaryDate(date)}</div>
          <input
            className="mt-0.5 bg-transparent text-center text-[var(--muted)]"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Pick date"
          />
        </div>
        <button type="button" className="grid size-11 place-items-center text-[var(--diary-blue)]" onClick={() => setDate(shift(date, 1))} aria-label="Next day">
          <Glyph icon={ChevronRight} size={22} />
        </button>
      </div>

      <div className="flex justify-center gap-1 pb-3">
        {days.map((dayKey, index) => (
          <button
            key={dayKey}
            type="button"
            className={`grid size-11 place-items-center rounded-[9px] text-xs font-semibold ${
              dayKey === date ? 'bg-[var(--fg)] text-[var(--bg)]' : 'text-[var(--muted)]'
            }`}
            onClick={() => setDate(dayKey)}
          >
            {WEEKDAYS[index]}
          </button>
        ))}
      </div>

      <PageTabs label="Body" value={tab} items={DIARY_TABS} onChange={setTab} />
      </div>

      {tab === 'diary' && (
        <div className="mx-auto w-full max-w-6xl space-y-3 py-3 lg:grid lg:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)] lg:items-start lg:gap-4 lg:space-y-0">
          <div className="space-y-3 lg:sticky lg:top-0">
          <button type="button" className="diary-card flex w-full items-center gap-4 px-4 py-4 text-left" onClick={() => { setGoalDraft(String(kcalGoal)); setGoalOpen(true) }}>
            <CalorieRing food={food} goal={kcalGoal} burned={burned} remaining={remaining} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[var(--muted)]">
                {tdee != null ? 'TDEE remaining' : 'Calories remaining'}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px] text-[var(--muted)]">
                <span>
                  <span className="block text-base font-semibold tabular text-[var(--fg)]">{macro(kcalGoal)}</span>
                  {tdee != null ? 'TDEE' : 'Goal'}
                </span>
                <span>
                  <span className="block text-base font-semibold tabular text-[var(--fg)]">{macro(food)}</span>
                  Food
                </span>
                <span>
                  <span className="block text-base font-semibold tabular text-[var(--fg)]">{macro(burned)}</span>
                  Exercise
                </span>
                <span>
                  <span className={`block text-base font-semibold tabular ${remaining < 0 ? 'text-[var(--danger)]' : 'text-[var(--fg)]'}`}>
                    {macro(remaining)}
                  </span>
                  Left
                </span>
              </div>
              <p className="mt-2 text-[11px] text-[var(--muted)]">
                {tdee != null
                  ? `${macro(kcalGoal)} − ${macro(food)} + ${macro(burned)} = ${macro(remaining)}`
                  : 'Set height and weight in Play → Body to use TDEE as the goal.'}
              </p>
              {burns.length > 0 && (
                <div className="mt-2 space-y-1 text-[11px] text-[var(--muted)]">
                  {burns.map((row, index) => (
                    <div key={`${row.source}-${row.name}-${index}`} className="flex justify-between gap-3">
                      <span className="truncate">{row.name}</span>
                      <span className="tabular">{macro(row.kcal)} kcal</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </button>

          <button type="button" className="diary-card grid w-full grid-cols-3 gap-3 px-4 py-4 text-left" onClick={() => setMacroMode(macroMode === 'eaten' ? 'left' : macroMode === 'left' ? 'pct' : 'eaten')}>
            {(['carbs', 'fat', 'protein'] as const).map((key) => (
              <MacroMeter
                key={key}
                label={key}
                eaten={eaten[key]}
                goal={goals[key]}
                mode={macroMode}
                color={MACRO_COLORS[key]}
              />
            ))}
          </button>

          <WaterCard milliliters={day.data?.waterMl ?? 0} onSet={(milliliters) => void saveWater({ milliliters })} onAdd={(addMl) => void saveWater({ addMl })} />
          </div>

          <div className="space-y-3">
          {[...MEAL_SLOTS, { id: 'OTHER' as const, label: 'Other' }].map((slot) => {
            if (slot.id === 'OTHER' && (day.data?.meals.filter((meal) => meal.slot === 'OTHER').length ?? 0) === 0) return null
            const meals = day.data?.meals.filter((meal) => meal.slot === slot.id) ?? []
            return (
              <section key={slot.id} className="diary-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <h2 className="text-[15px] font-semibold">{slot.label}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular text-[var(--muted)]">{macro(slotTotals[slot.id])}</span>
                    <button type="button" className="diary-log" onClick={() => openLog(slot.id)}>
                      Log
                    </button>
                  </div>
                </div>
                {meals.map((meal) => (
                  <div key={meal.id} className="diary-row flex items-center gap-3 px-4 py-3">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditingMeal(meal)}>
                      <div className="truncate text-[15px]">{meal.name}</div>
                      <div className="text-xs text-[var(--muted)]">{mealSubtitle(meal)}</div>
                    </button>
                    <span className="text-sm tabular text-[var(--muted)]">{macro(meal.totals.kcal)}</span>
                    <TrashButton
                      label="Delete meal"
                      onClick={async () => {
                        await api(`/api/meals/${meal.id}`, { method: 'DELETE' })
                        await refreshMeals()
                      }}
                    />
                  </div>
                ))}
                <AddButton label="Add food" className="mx-2 my-2" onClick={() => openLog(slot.id)} />
              </section>
            )
          })}
          </div>
        </div>
      )}

      {tab === 'recipes' && (
        <div className="mx-auto w-full max-w-6xl px-3 py-3">
          <div className="mb-3 flex flex-wrap justify-end gap-2">
            <PrimaryButton onClick={openNewFood}>Create a food</PrimaryButton>
            <PrimaryButton onClick={() => setRecipeOpen(true)}>Create a recipe</PrimaryButton>
          </div>
          <h3 className="mb-2 px-1 text-sm text-[var(--muted)]">Foods</h3>
          <div className="diary-card overflow-hidden">
            {(userFoods.data?.length ?? 0) === 0 && (
              <p className="px-4 py-6 text-sm text-[var(--muted)]">
                Save an ingredient with calories and macros. It shows up when you search foods for a recipe or meal.
              </p>
            )}
            {userFoods.data?.map((food) => (
              <div key={food.id} className="diary-row flex items-center gap-3 px-4 py-3">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openEditFood(food)}>
                  <div className="truncate text-[15px]">{food.name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {food.brand ? `${food.brand} · ` : ''}
                    {macro(per100ToPortion(food.kcal, foodPortionGrams(food.servingAmount, food.servings)))} kcal ·{' '}
                    {food.servings ?? 1} × {food.servingAmount ?? 100}
                    {food.servingUnit === 'ml' ? 'ml' : 'g'}
                  </div>
                </button>
                <TrashButton label="Delete food" onClick={() => void removeFood(food.id)} />
              </div>
            ))}
          </div>
          <h3 className="mt-6 mb-2 px-1 text-sm text-[var(--muted)]">Recipes</h3>
          <div className="diary-card overflow-hidden">
            {recipes.data?.length === 0 && <p className="px-4 py-6 text-sm text-[var(--muted)]">No saved recipes yet.</p>}
            {recipes.data?.map((recipe) => (
              <div key={recipe.id} className="diary-row flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setEditingRecipe(recipe)}
                >
                  <div className="truncate text-[15px]">{recipe.name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {macro(recipe.totals.kcal)} kcal · {recipe.items.length} foods
                  </div>
                </button>
                <button type="button" className="diary-log" onClick={() => openLog('BREAKFAST', 'recipes')}>
                  Log
                </button>
                <TrashButton label="Delete recipe" onClick={() => void removeRecipe(recipe.id)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'supplements' && (
        <div className="mx-auto w-full max-w-6xl px-3 py-3">
          <div className="mb-3 flex justify-end">
            <PrimaryButton onClick={openNewSupplement}>Add supplement</PrimaryButton>
          </div>
          <div className="diary-card overflow-hidden">
            {(fuelSupplements.data?.length ?? 0) === 0 && (
              <p className="px-4 py-6 text-sm text-[var(--muted)]">
                Creatine, whey, fish oil — add what you take. Tick a serving for this day. Medicines stay on Profile → Medicines.
              </p>
            )}
            {fuelSupplements.data?.map((item) => {
              const taken = item.servings > 0
              const detail = [item.dose, item.timing].filter(Boolean).join(' · ')
              return (
                <div key={item.id} className="diary-row flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--fg)]"
                    aria-pressed={taken}
                    aria-label={taken ? `Undo ${item.name}` : `Take ${item.name}`}
                    onClick={() => void setSupplementServings(item.id, taken ? 0 : 1)}
                  >
                    <Glyph icon={taken ? CheckMark : Circle} size={16} strokeWidth={2} />
                  </button>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openEditSupplement(item)}>
                    <div className="truncate text-[15px]">{item.name}</div>
                    <div className="truncate text-xs text-[var(--muted)]">
                      {detail || 'Tap to add dose and timing'}
                    </div>
                  </button>
                  {taken && (
                    <div className="flex items-center gap-1 text-sm tabular">
                      <button
                        type="button"
                        className="grid size-7 place-items-center rounded-full text-[var(--muted)]"
                        aria-label="Fewer servings"
                        onClick={() => void setSupplementServings(item.id, item.servings - 1)}
                      >
                        −
                      </button>
                      <span className="min-w-5 text-center">{item.servings}</span>
                      <button
                        type="button"
                        className="grid size-7 place-items-center rounded-full text-[var(--diary-blue)]"
                        aria-label="More servings"
                        onClick={() => void setSupplementServings(item.id, item.servings + 1)}
                      >
                        +
                      </button>
                    </div>
                  )}
                  <TrashButton label="Delete supplement" onClick={() => void removeSupplement(item.id)} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'nutrition' && (
        <div className="mx-auto w-full max-w-6xl space-y-4 px-3 py-3">
          <div className="diary-card grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <div className="text-[11px] text-[var(--muted)]">{tdee != null ? 'TDEE' : 'Goal'}</div>
              <div className="text-lg font-semibold tabular">{macro(kcalGoal)}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--muted)]">Food</div>
              <div className="text-lg font-semibold tabular">{macro(food)}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--muted)]">Exercise</div>
              <div className="text-lg font-semibold tabular">{macro(burned)}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--muted)]">Left</div>
              <div className={`text-lg font-semibold tabular ${remaining < 0 ? 'text-[var(--danger)]' : ''}`}>{macro(remaining)}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--muted)]">Water</div>
              <div className="text-lg font-semibold tabular">{formatLiters(day.data?.waterMl ?? 0)}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--muted)]">Supplements</div>
              <div className="text-lg font-semibold tabular">
                {(fuelSupplements.data?.length ?? 0) === 0
                  ? '—'
                  : `${fuelSupplements.data?.filter((row) => row.servings > 0).length ?? 0}/${fuelSupplements.data?.length ?? 0}`}
              </div>
            </div>
          </div>
          <div className="diary-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold">Nutrition charts</h2>
              <div className="control-cluster">
                {(['day', 'week', 'month'] as const).map((option) => (
                  <button key={option} type="button" aria-pressed={grain === option} onClick={() => setGrain(option)}>
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">Calories by meal</h3>
                {pie.length === 0 ? (
                  <p className="mt-8 text-sm text-[var(--muted)]">No meals logged for this day.</p>
                ) : (
                  <>
                    <MonoDonut
                      data={pie.map((entry) => ({ name: entry.name, value: entry.value }))}
                      center={`${macro(pie.reduce((sum, row) => sum + row.value, 0))}`}
                    />
                    <ChartKey
                      items={pie.map((entry, index) => ({
                        label: entry.name,
                        color: `color-mix(in srgb, var(--fg) ${Math.round(100 - index * 24)}%, transparent)`,
                        detail: `${macro(entry.value)} kcal`,
                      }))}
                    />
                  </>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">Macros (grams)</h3>
                {chart.length === 0 ? (
                  <p className="mt-8 text-sm text-[var(--muted)]">No macro history in this range.</p>
                ) : (
                  <>
                    <MonoBars
                      data={chart}
                      bars={MACRO_SERIES.map((series, index) => ({
                        key: series.key,
                        name: series.label,
                        fill: `color-mix(in srgb, var(--fg) ${Math.round(100 - index * 28)}%, transparent)`,
                      }))}
                      format={(value) => macro(value)}
                    />
                    <ChartKey
                      items={MACRO_SERIES.map((series, index) => ({
                        label: series.label,
                        color: `color-mix(in srgb, var(--fg) ${Math.round(100 - index * 28)}%, transparent)`,
                      }))}
                    />
                  </>
                )}
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">Calories</h3>
              {chart.length === 0 ? (
                <p className="mt-8 text-sm text-[var(--muted)]">No calorie history in this range.</p>
              ) : (
                <>
                  <MonoLine data={chart} valueKey="kcal" format={(value) => macro(value)} />
                  <ChartKey items={[{ label: 'Calories', color: 'var(--fg)', detail: 'kcal' }]} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[30] grid size-14 place-items-center rounded-2xl bg-[var(--fg)] text-[var(--bg)] lg:bottom-8"
        aria-label="Add food"
        onClick={() => openLog('BREAKFAST')}
      >
        <Glyph icon={Plus} size={26} />
      </button>

      {addingSlot && (
        <Dialog title="Add food" onClose={() => setAddingSlot(null)}>
          <div className="mt-3 flex flex-wrap gap-1">
            {MEAL_SLOTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={addingSlot === item.id ? 'glass-primary px-2.5 py-1 text-xs' : 'glass-btn px-2.5 py-1 text-xs'}
                onClick={() => setAddingSlot(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex border-b border-[var(--line)]">
            {(['all', 'recipes'] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={`flex-1 py-2 text-sm font-semibold ${
                  searchTab === item ? 'text-[var(--diary-blue)] shadow-[inset_0_-2px_0_var(--diary-blue)]' : 'text-[var(--muted)]'
                }`}
                onClick={() => setSearchTab(item)}
              >
                {item === 'all' ? 'All' : 'My Recipes'}
              </button>
            ))}
          </div>
          <div className="mt-3">
            {searchTab === 'all' && (
              <FoodPicker
                confirmLabel={`Add to ${slotLabel(addingSlot)}`}
                onPick={async (food) => {
                  await addFoodTo(food, addingSlot)
                  setAddingSlot(null)
                }}
              />
            )}
            {searchTab === 'recipes' && (
              <div className="max-h-[45vh] overflow-y-auto">
                {(recipes.data ?? []).map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    className="diary-row flex w-full items-center justify-between gap-3 py-3 text-left"
                    aria-label={`Add ${recipe.name}`}
                    onClick={async () => {
                      await addRecipeTo(recipe, addingSlot === 'OTHER' ? 'BREAKFAST' : addingSlot)
                      setAddingSlot(null)
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px]">{recipe.name}</span>
                      <span className="block text-xs text-[var(--muted)]">{macro(recipe.totals.kcal)} kcal</span>
                    </span>
                    <Glyph icon={Plus} size={16} className="shrink-0 text-[var(--diary-blue)]" />
                  </button>
                ))}
                {(recipes.data?.length ?? 0) === 0 && (
                  <p className="py-6 text-sm text-[var(--muted)]">No saved recipes yet.</p>
                )}
              </div>
            )}
          </div>
        </Dialog>
      )}

      {goalOpen && (
        <Dialog title={tdee != null ? 'Energy budget' : 'Calorie goal'} onClose={() => setGoalOpen(false)}>
          {tdee != null ? (
            <div className="mt-4 space-y-3 text-sm">
              <p>
                Goal is ICMR-NIN 2020 TDEE from Play body: <strong className="tabular">{macro(tdee)} kcal</strong>.
                Sessions and Garmin logs add exercise calories back.
              </p>
              <p className="text-[var(--muted)]">
                {macro(kcalGoal)} TDEE − {macro(food)} food + {macro(burned)} exercise = {macro(remaining)} left.
              </p>
              <Link className="text-[var(--diary-blue)]" to="/play" onClick={() => setGoalOpen(false)}>
                Edit height, weight, and activity in Play
              </Link>
            </div>
          ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              saveGoal()
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--muted)]">Daily calories</span>
              <input className="field" inputMode="numeric" value={goalDraft} onChange={(event) => setGoalDraft(event.target.value)} required />
            </label>
            <p className="text-xs text-[var(--muted)]">
              Save height and weight in Play → Body to replace this with TDEE. Macros follow 50% carbs, 20% protein, 30% fat.
            </p>
            <div className="flex justify-end">
              <PrimaryButton type="submit">Save</PrimaryButton>
            </div>
          </form>
          )}
        </Dialog>
      )}

      {editingMeal && (
        <FoodEditor
          title="Edit food"
          name={editingMeal.name}
          slot={editingMeal.slot}
          items={editingMeal.items}
          onClose={() => setEditingMeal(null)}
          onSave={(draft) => saveLoggedMeal(editingMeal, draft)}
          onRemove={async () => {
            await api(`/api/meals/${editingMeal.id}`, { method: 'DELETE' })
            setEditingMeal(null)
            await refreshMeals()
          }}
        />
      )}

      {editingRecipe && (
        <FoodEditor
          title="Edit recipe"
          name={editingRecipe.name}
          items={editingRecipe.items}
          onClose={() => setEditingRecipe(null)}
          onSave={(draft) => saveRecipeDraft(editingRecipe, draft)}
          onRemove={async () => {
            await removeRecipe(editingRecipe.id)
          }}
        />
      )}

      {foodOpen && (
        <Dialog title={editingFood ? 'Edit food' : 'Create a food'} onClose={() => setFoodOpen(false)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              void saveUserFood()
            }}
          >
            <label className="block text-xs font-medium text-[var(--muted)]">
              Name
              <input
                className="field mt-1"
                value={foodDraft.name}
                onChange={(event) => setFoodDraft((current) => ({ ...current, name: event.target.value }))}
                required
                placeholder="Greek yogurt"
                autoFocus
              />
            </label>
            <label className="block text-xs font-medium text-[var(--muted)]">
              Brand
              <input
                className="field mt-1"
                value={foodDraft.brand}
                onChange={(event) => setFoodDraft((current) => ({ ...current, brand: event.target.value }))}
                placeholder="Optional"
              />
            </label>
            <label className="block text-xs font-medium text-[var(--muted)]">
              Serving size
              <span className="mt-1 grid grid-cols-[minmax(0,1fr)_4.5rem] gap-2">
                <input
                  className="field"
                  inputMode="decimal"
                  value={foodDraft.servingAmount}
                  onChange={(event) => setFoodDraft((current) => ({ ...current, servingAmount: event.target.value }))}
                  required
                />
                <select
                  className="field"
                  value={foodDraft.servingUnit}
                  onChange={(event) =>
                    setFoodDraft((current) => ({ ...current, servingUnit: event.target.value === 'ml' ? 'ml' : 'g' }))
                  }
                >
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                </select>
              </span>
            </label>
            <label className="block text-xs font-medium text-[var(--muted)]">
              Number of servings
              <input
                className="field mt-1"
                inputMode="decimal"
                value={foodDraft.servings}
                onChange={(event) => setFoodDraft((current) => ({ ...current, servings: event.target.value }))}
                required
              />
            </label>
            <p className="text-xs text-[var(--muted)]">Calories and macros are for this serving.</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['kcal', 'Calories'],
                  ['protein', 'Protein g'],
                  ['carbs', 'Carbs g'],
                  ['fat', 'Fat g'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-xs font-medium text-[var(--muted)]">
                  {label}
                  <input
                    className="field mt-1"
                    inputMode="decimal"
                    value={foodDraft[key]}
                    onChange={(event) => setFoodDraft((current) => ({ ...current, [key]: event.target.value }))}
                    placeholder="0"
                  />
                </label>
              ))}
            </div>
            <details open className="rounded-md border border-[var(--line)] px-3 py-2">
              <summary className="cursor-pointer text-sm">Micronutrients</summary>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {FOOD_MICROS.map((row) => (
                  <label key={row.key} className="block text-xs font-medium text-[var(--muted)]">
                    {row.label} ({row.unit})
                    <input
                      className="field mt-1"
                      inputMode="decimal"
                      value={foodDraft.micros[row.key] ?? ''}
                      onChange={(event) =>
                        setFoodDraft((current) => ({
                          ...current,
                          micros: { ...current.micros, [row.key]: event.target.value },
                        }))
                      }
                      placeholder="—"
                    />
                  </label>
                ))}
              </div>
            </details>
            <div className="flex items-center justify-end gap-2">
              {foodError && <p className="mr-auto text-sm text-[var(--danger)]">{foodError}</p>}
              {editingFood && (
                <button type="button" className="text-sm text-[var(--danger)]" onClick={() => void removeFood(editingFood.id)}>
                  Delete
                </button>
              )}
              <PrimaryButton type="submit">Save</PrimaryButton>
            </div>
          </form>
        </Dialog>
      )}

      {recipeOpen && (
        <Dialog title="Create a recipe" onClose={() => setRecipeOpen(false)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              const created = await api<Recipe>('/api/recipes', { method: 'POST', body: JSON.stringify({ name: recipeName }) })
              setRecipeOpen(false)
              setRecipeName('')
              setEditingRecipe(created)
              void queryClient.invalidateQueries({ queryKey: ['recipes'] })
            }}
          >
            <input className="field" value={recipeName} onChange={(event) => setRecipeName(event.target.value)} required placeholder="Overnight oats" />
            <div className="flex justify-end">
              <PrimaryButton type="submit">Save</PrimaryButton>
            </div>
          </form>
        </Dialog>
      )}

      {supplementOpen && (
        <Dialog title={editingSupplement ? 'Edit supplement' : 'Add supplement'} onClose={() => setSupplementOpen(false)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              void saveSupplementDraft()
            }}
          >
            <label className="block text-xs font-medium text-[var(--muted)]">
              Name
              <input
                className="field mt-1"
                value={supplementDraft.name}
                onChange={(event) => setSupplementDraft((current) => ({ ...current, name: event.target.value }))}
                required
                placeholder="Creatine"
                autoFocus
              />
            </label>
            <label className="block text-xs font-medium text-[var(--muted)]">
              Dose
              <input
                className="field mt-1"
                value={supplementDraft.dose}
                onChange={(event) => setSupplementDraft((current) => ({ ...current, dose: event.target.value }))}
                placeholder="5 g"
              />
            </label>
            <div>
              <div className="text-xs font-medium text-[var(--muted)]">Timing</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SUPPLEMENT_TIMES.map((time) => (
                  <button
                    key={time}
                    type="button"
                    className={`weekday-chip ${supplementDraft.timing === time ? 'on' : ''}`}
                    aria-pressed={supplementDraft.timing === time}
                    onClick={() =>
                      setSupplementDraft((current) => ({
                        ...current,
                        timing: current.timing === time ? '' : time,
                      }))
                    }
                  >
                    {time}
                  </button>
                ))}
              </div>
              <input
                className="field mt-2"
                value={supplementDraft.timing}
                onChange={(event) => setSupplementDraft((current) => ({ ...current, timing: event.target.value }))}
                placeholder="Or type your own"
              />
            </div>
            <label className="block text-xs font-medium text-[var(--muted)]">
              Notes
              <input
                className="field mt-1"
                value={supplementDraft.notes}
                onChange={(event) => setSupplementDraft((current) => ({ ...current, notes: event.target.value }))}
                placeholder="With water, skip rest days"
              />
            </label>
            <div className="flex items-center justify-end gap-3 pt-1">
              {editingSupplement && (
                <button
                  type="button"
                  className="text-sm font-semibold text-[var(--danger)]"
                  onClick={() => void removeSupplement(editingSupplement.id)}
                >
                  Delete
                </button>
              )}
              <PrimaryButton type="submit">Save</PrimaryButton>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}

export const RecipePage = FuelPage

function CalorieRing({ food, goal, burned, remaining }: { food: number; goal: number; burned: number; remaining: number }) {
  const radius = 34
  const circ = 2 * Math.PI * radius
  const budget = Math.max(1, goal + burned)
  const pct = Math.min(1, food / budget)
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true" className="text-[var(--fg)]">
      <circle cx="44" cy="44" r={radius} fill="none" stroke="var(--diary-track)" strokeWidth="8" />
      <circle
        cx="44"
        cy="44"
        r={radius}
        fill="none"
        stroke={remaining < 0 ? 'var(--danger)' : 'var(--diary-blue)'}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${pct * circ} ${circ}`}
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="42" textAnchor="middle" fill="currentColor" fontSize="16" fontWeight="700">
        {macro(remaining)}
      </text>
      <text x="44" y="58" textAnchor="middle" fill="currentColor" opacity="0.55" fontSize="9">
        remaining
      </text>
    </svg>
  )
}

function WaterCard({
  milliliters,
  onSet,
  onAdd,
}: {
  milliliters: number
  onSet: (milliliters: number) => void
  onAdd: (addMl: number) => void
}) {
  const [draft, setDraft] = useState(milliliters)
  useEffect(() => {
    setDraft(milliliters)
  }, [milliliters])
  const pct = Math.min(100, (draft / WATER_GOAL_ML) * 100)
  return (
    <section className="diary-card px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold">Water</h2>
        <p className="text-sm tabular text-[var(--muted)]">
          <span className="font-semibold text-[var(--fg)]">{formatLiters(draft)}</span>
          {' / '}
          {formatLiters(WATER_GOAL_ML)}
        </p>
      </div>
      <input
        className="slider mt-3"
        type="range"
        min={0}
        max={WATER_MAX_ML}
        step={50}
        value={Math.min(WATER_MAX_ML, draft)}
        aria-label="Water drunk today"
        style={{
          background: `linear-gradient(to right, var(--diary-blue) ${pct}%, var(--surface-2) ${pct}%)`,
        }}
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={(event) => onSet(Number(event.currentTarget.value))}
        onKeyUp={(event) => onSet(Number(event.currentTarget.value))}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {WATER_POURS.map((pour) => (
          <button
            key={pour.ml}
            type="button"
            className="glass-btn px-3 py-1.5 text-xs"
            onClick={() => onAdd(pour.ml)}
          >
            +{pour.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function MacroMeter({
  label,
  eaten,
  goal,
  mode,
  color,
}: {
  label: string
  eaten: number
  goal: number
  mode: MacroMode
  color: string
}) {
  const left = Math.max(0, goal - eaten)
  const pct = goal <= 0 ? 0 : (eaten / goal) * 100
  const value = mode === 'eaten' ? `${macro(eaten)}g` : mode === 'left' ? `${macro(left)}g left` : `${macro(pct)}%`
  return (
    <div>
      <div className="text-[11px] font-semibold capitalize text-[var(--muted)]">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular">{value}</div>
      <div className="diary-bar mt-2">
        <span style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
    </div>
  )
}

type DraftLine = {
  key: string
  id?: string
  name: string
  grams: string
  unit: 'g' | 'ml'
  brand?: string
  externalId?: string
  source?: string
  kcal?: number
  protein?: number
  carbs?: number
  fat?: number
  micros?: Record<string, number>
}

type FoodDraft = {
  name: string
  slot?: string
  items: {
    id?: string
    name: string
    grams: number
    unit: 'g' | 'ml'
    externalId?: string
    source?: string
    kcal?: number
    protein?: number
    carbs?: number
    fat?: number
    micros?: Record<string, number>
  }[]
}

function linePayload(item: FoodDraft['items'][number]) {
  return {
    name: item.name.trim(),
    grams: item.grams,
    unit: item.unit,
    externalId: item.externalId,
    source: item.source,
    kcal: item.kcal,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    micros: item.micros,
  }
}

function sumMicros(lines: { micros?: Record<string, number> }[]) {
  const out: Record<string, number> = {}
  for (const line of lines) {
    if (!line.micros) continue
    for (const [key, value] of Object.entries(line.micros)) {
      out[key] = (out[key] ?? 0) + Number(value)
    }
  }
  return out
}

function FoodEditor({
  title,
  name,
  slot,
  items,
  onClose,
  onSave,
  onRemove,
}: {
  title: string
  name: string
  slot?: string
  items: FoodLine[]
  onClose: () => void
  onSave: (draft: FoodDraft) => Promise<void>
  onRemove?: () => Promise<void>
}) {
  const [editName, setEditName] = useState(name)
  const [editSlot, setEditSlot] = useState(slot ?? 'OTHER')
  const [lines, setLines] = useState<DraftLine[]>(() =>
    items.map((item) => ({
      key: item.id,
      id: item.id,
      name: item.name,
      grams: String(item.grams),
      unit: item.unit === 'ml' ? 'ml' : 'g',
      kcal: item.kcal,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      micros: item.micros,
      externalId: item.externalId,
      source: item.source,
    })),
  )
  const [saving, setSaving] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [entry, setEntry] = useState<{
    hit: FoodHit
    key?: string
    amount?: number
    unit?: 'g' | 'ml'
  } | null>(null)

  const totals = lines.reduce(
    (sum, line) => ({
      kcal: sum.kcal + (line.kcal ?? 0),
      protein: sum.protein + (line.protein ?? 0),
      carbs: sum.carbs + (line.carbs ?? 0),
      fat: sum.fat + (line.fat ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )

  function applyFood(food: PickedFood, key?: string) {
    setLines((current) => {
      const existing = key ? current.find((row) => row.key === key) : undefined
      const next: DraftLine = {
        key: key ?? crypto.randomUUID(),
        id: existing?.id,
        name: food.name,
        grams: String(food.grams),
        unit: food.unit,
        brand: food.brand,
        externalId: food.externalId,
        source: food.source,
        kcal: food.kcal,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        micros: food.micros,
      }
      return key ? current.map((row) => (row.key === key ? next : row)) : [...current, next]
    })
  }

  async function saveDraft() {
    if (!editName.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: editName.trim(),
        slot: slot == null ? undefined : editSlot,
        items: lines.map((line) => ({
          id: line.id,
          name: line.name,
          grams: Number(line.grams) || 0,
          unit: line.unit,
          externalId: line.externalId,
          source: line.source,
          kcal: line.kcal,
          protein: line.protein,
          carbs: line.carbs,
          fat: line.fat,
          micros: line.micros,
        })),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog
        title={title}
        onClose={onClose}
        action={
          <button type="button" className="diary-log px-2" disabled={saving} onClick={() => void saveDraft()}>
            Save
          </button>
        }
      >
        <div className="mt-2 space-y-4">
          <input
            className="field border-0 bg-transparent px-0 text-[22px] font-semibold"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            required
            placeholder="Name"
          />
          {slot != null && (
            <div className="food-field-row -mx-6">
              <span>Meal</span>
              <select className="food-value" value={editSlot} onChange={(event) => setEditSlot(event.target.value)}>
                {[...MEAL_SLOTS, { id: 'OTHER', label: 'Other' }].map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <MacroBoard food={totals} />
          <MicroList micros={sumMicros(lines)} grams={100} />
          <div>
            <div className="mb-1 text-[15px] font-semibold">Meal Items</div>
            {lines.length === 0 && <p className="py-4 text-sm text-[var(--muted)]">No foods yet.</p>}
            {lines.map((line) => (
              <div key={line.key} className="diary-row flex items-center gap-3 py-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() =>
                    setEntry({
                      hit: hitFromMacros({
                        name: line.name,
                        grams: Number(line.grams) || 100,
                        unit: line.unit,
                        kcal: line.kcal,
                        protein: line.protein,
                        carbs: line.carbs,
                        fat: line.fat,
                        micros: line.micros,
                        externalId: line.externalId,
                        source: line.source,
                        brand: line.brand,
                      }),
                      key: line.key,
                      amount: Number(line.grams) || 100,
                      unit: line.unit,
                    })
                  }
                >
                  <div className="truncate text-[15px] font-medium">{line.name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {line.brand ? `${line.brand} · ` : ''}
                    {servingLabel(line.grams, line.unit)}
                  </div>
                </button>
                <span className="text-[15px] tabular text-[var(--muted)]">{macro(line.kcal ?? 0)}</span>
                <TrashButton
                  label="Delete food"
                  onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}
                />
              </div>
            ))}
          </div>
          <button type="button" className="food-add-btn" onClick={() => setSearchOpen(true)}>
            Add Food
          </button>
          {onRemove && (
            <div className="flex justify-start">
              <TrashButton label={slot != null ? 'Delete meal' : 'Delete recipe'} onClick={() => void onRemove()} />
            </div>
          )}
        </div>
      </Dialog>

      {searchOpen && (
        <Dialog title="Add Food" layer={2} onClose={() => setSearchOpen(false)}>
          <div className="mt-3">
            <FoodSearch
              onSelect={(hit) => {
                setEntry({ hit, amount: undefined, unit: undefined })
              }}
            />
          </div>
        </Dialog>
      )}

      {entry && (
        <FoodEntryDialog
          hit={entry.hit}
          amount={entry.amount}
          unit={entry.unit}
          title={entry.key ? 'Edit Entry' : 'Add Food'}
          layer={3}
          confirmLabel="Save"
          onBack={() => setEntry(null)}
          onClose={() => {
            setEntry(null)
            setSearchOpen(false)
          }}
          onConfirm={(food) => {
            applyFood(food, entry.key)
            setEntry(null)
            setSearchOpen(false)
          }}
        />
      )}
    </>
  )
}
