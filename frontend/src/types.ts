export type Importance = 'CRITICAL' | 'IMPORTANT' | 'OPTIONAL'
export type FrequencyType = 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
export type HabitSection = 'NON_NEGOTIABLE' | 'GROWTH' | 'OTHER'
export type CompletionStatus = 'COMPLETED' | 'PARTIAL' | 'MISSED' | 'SKIPPED'
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'ARCHIVED'

export type Category = {
  id: string
  name: string
  slug: string
  color?: string
  icon?: string
  sortOrder: number
  systemKey?: string
}

export type FrequencyConfig = {
  weekdays?: number[]
  timesPerPeriod?: number
  intervalDays?: number
}

export type Habit = {
  id: string
  name: string
  description?: string
  icon?: string
  category?: Category
  section: HabitSection
  frequencyType: FrequencyType
  frequencyConfig: FrequencyConfig
  targetValue?: number
  unit?: string
  importance: Importance
  weight: number
  startDate: string
  endDate?: string
  active: boolean
  autoCompleteMetricId?: string
  autoCompleteThreshold?: number
  parentId?: string
}

export type HabitItem = {
  habit: Habit
  status?: CompletionStatus
  value?: number
  note?: string
  due: boolean
  periodProgress?: string
  children?: HabitItem[]
}

export type DaySnapshot = {
  date: string
  today: boolean
  score?: number
  percent: number
  scheduled: number
  completed: number
  partial: number
  missed: number
  skipped: number
  pending: number
  message: string
  note?: string
  nonNegotiables: HabitItem[]
  growth: HabitItem[]
  other: HabitItem[]
}

export type MetricEntry = {
  id: string
  metricId: string
  metricName: string
  unit?: string
  date: string
  value: number
  note?: string
}

export type DayDetail = {
  day: DaySnapshot
  metrics: MetricEntry[]
}

export type NamedScore = {
  id?: string
  name: string
  color?: string
  score: number
  percent: number
}

export type HeatCell = {
  date: string
  score?: number
  percent: number
  level: number
}

export type Dashboard = {
  overall: number
  overallPercent: number
  vsPreviousMonth?: number
  previousMonthName?: string
  currentStreak: number
  bestStreak: number
  thisWeek?: number
  thisMonth?: number
  categories: NamedScore[]
  heatmap: HeatCell[]
}

export type TrendPoint = {
  label: string
  start: string
  score?: number
  percent: number
}

export type Compare = {
  period: string
  current?: number
  previous?: number
  delta?: number
  currentLabel: string
  previousLabel: string
}

export type WeeklyReview = {
  weekStart: string
  weekEnd: string
  consistency?: number
  vsPreviousWeek?: number
  bestArea?: NamedScore
  needsAttention?: NamedScore
  habitsCompleted: number
  habitsScheduled: number
  streak: number
  wentWell: string[]
  needsWork: string[]
}

export type Goal = {
  id: string
  name: string
  description?: string
  category?: Category
  targetValue?: number
  currentValue: number
  baselineValue?: number
  unit?: string
  startDate?: string
  targetDate?: string
  status: GoalStatus
  notes?: string
  progressPercent?: number
  milestones: {
    id: string
    name: string
    targetValue?: number
    reachedAt?: string
    notes?: string
    sortOrder: number
  }[]
}

export type Metric = {
  id: string
  name: string
  unit?: string
  description?: string
  source: string
  category?: Category
  latestValue?: number
  latestDate?: string
}

export type JournalEntry = {
  id?: string
  date: string
  content?: string
  mood?: string
  reflection?: string
  wins?: string
  problems?: string
  lessons?: string
  updatedAt?: string
}

export type Transformation = {
  id: string
  name: string
  startDate: string
  endDate: string
  notes?: string
  daysElapsed: number
  daysTotal: number
  consistency?: number
  goals: Goal[]
}

export type User = {
  id: string
  name: string
  email: string
  timezone: string
  createdAt: string
}

export type AuthResponse = {
  token: string
  expiresAt: string
  user: User
}

export type InsightPreview = {
  insights: string[]
  focus: string
  source: string
  weekStart: string
}

export type NotificationPrefs = {
  morningReminder: boolean
  eveningCheckin: boolean
  missedHabit: boolean
  weeklyReview: boolean
  goalMilestone: boolean
  streakMilestone: boolean
  morningTime: string
  eveningTime: string
}

export type Photo = {
  id: string
  kind: string
  category?: string
  takenAt?: string
  notes?: string
  url: string
  createdAt: string
}

export type IntegrationProvider = {
  key: string
  name: string
  tracks: string
  status: string
  detail: string
}

export type IntegrationCatalog = {
  providers: IntegrationProvider[]
}

export type Medication = {
  id: string
  name: string
  dosage?: string
  instructions?: string
  times: string[]
  weekdays: number[]
  startDate: string
  endDate?: string
  active: boolean
}

export type DoseStatus = 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED'

export type MedicationDose = {
  id: string
  medicationId: string
  name: string
  dosage?: string
  scheduledTime: string
  status: DoseStatus
  takenAt?: string
}

export type MedicationToday = {
  date: string
  doses: MedicationDose[]
}

export type SessionKind = 'MEDITATION' | 'READING'

export type FocusSession = {
  id: string
  kind: SessionKind
  habitId?: string
  habitName?: string
  seconds: number
  date: string
  createdAt: string
}

export type SessionDay = {
  date: string
  meditationSeconds: number
  readingSeconds: number
  sessions: FocusSession[]
}

export type Quote = {
  text: string
  author: string
  source?: string
}

export type AuthProviders = {
  google: boolean
  apple: boolean
  googleClientId?: string
  appleClientId?: string
}

export type Holding = {
  id: string
  name: string
  ticker?: string
  exchange?: string
  kind: string
  quantity?: number
  avgBuy?: number
  amount: number
  buyValue?: number
  currentValue?: number
  currentValueInr?: number
  sliceValueInr?: number
  weight?: number
  pnl?: number
  pnlPct?: number
  currency: string
  notes?: string
  asOf?: string
  quote?: MarketQuote | null
}

export type MarketQuote = {
  name: string
  ticker: string
  exchange?: string
  symbol: string
  ltp: number
  dayChange?: number
  dayChangePct?: number
  lastClose?: number
  marketCap?: number
  marketCapLabel?: string
  peRatio?: number
  volume?: number
  volumeLabel?: string
  currency: string
  source: string
}

export type BudgetLine = {
  id?: string
  name: string
  planned: number
  spent: number
}

export type Budget = {
  id: string
  yearMonth: string
  income: number
  plannedInvest: number
  notes?: string
  holdingsTotal: number
  lines: BudgetLine[]
}

export type BudgetKind = 'EXPENSE' | 'INCOME' | 'BUFFER' | 'GOAL'

export type WorkbookItem = {
  id: string
  category: string
  name: string
  kind: BudgetKind | string
  sortOrder: number
  amounts: Record<string, number | null>
}

export type MonthTotal = {
  expenses: number
  income: number
  balance: number
  running: number
}

export type Workbook = {
  months: string[]
  items: WorkbookItem[]
  totals: Record<string, MonthTotal>
}

export type Macros = {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export type FoodServing = {
  label: string
  amount: number
  unit: string
}

export type FoodHit = {
  id: string
  source: string
  name: string
  brand?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  per: string
  servings?: FoodServing[]
}

export type FoodLine = {
  id: string
  name: string
  externalId?: string
  source?: string
  grams: number
  unit?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export type Recipe = {
  id: string
  name: string
  servings: number
  totals: Macros
  items: FoodLine[]
}

export type FuelSupplement = {
  id: string
  name: string
  dose?: string | null
  timing?: string | null
  notes?: string | null
  sortOrder: number
  servings: number
}

export type Meal = {
  id: string
  date: string
  slot: string
  recipeId?: string
  name: string
  totals: Macros
  items: FoodLine[]
}

export type DayMeals = {
  date: string
  totals: Macros
  meals: Meal[]
  waterMl?: number
  energy?: {
    tdee?: number
    consumed: number
    burned: number
    remaining?: number
    burns: { name: string; source: string; kcal: number }[]
  }
}

export type MealSummary = {
  points: { period: string; totals: Macros }[]
  totals: Macros
}

export type RoutineTask = {
  id: string
  name: string
  weekdays: number[]
}

export type RoutineBlock = {
  id: string
  title: string
  startMin: number
  endMin: number
  color: string
  weekdays: number[]
  tasks: RoutineTask[]
}

export type RoutineDay = {
  weekday: number
  blocks: RoutineBlock[]
}

export type RoutineWeek = {
  days: RoutineDay[]
}

export type GoogleCalendarStatus = {
  configured: boolean
  connected: boolean
  email?: string
  lastSyncedAt?: string
  lastError?: string
}

export type GoogleCalendarEvent = {
  id: string
  title: string
  date: string
  weekday: number
  startMin: number
  endMin: number
}

export type PlannedSet = {
  reps?: number
  kg?: number
  seconds?: number
}

export type ExerciseHit = {
  name: string
  type: string
  muscle: string
  mappedMuscle: string
  track: string
  difficulty: string
  instructions: string
  safetyInfo: string
  equipment: string[]
  catalogId?: string
  img?: string
  gif?: string
}

export type TrainExercise = {
  id?: string
  name: string
  muscle: string
  track: string
  sets: PlannedSet[]
}

export type TrainTemplate = {
  id: string
  name: string
  kind: string
  exercises: TrainExercise[]
}

export type TrainSet = {
  id: string
  exerciseName: string
  muscle: string
  track: string
  setIndex: number
  reps?: number
  kg?: number
  seconds?: number
}

export type TrainSession = {
  id: string
  templateId?: string
  name: string
  kind: string
  startedAt: string
  endedAt?: string
  source: string
  durationSec: number
  volume: number
  photoUrl?: string
  sets: TrainSet[]
}

export type TrainSessionReport = {
  session: TrainSession
  previous?: TrainSession
  volume: number
  durationSec: number
  volumeDelta?: number
  durationDelta?: number
  exercises: {
    name: string
    muscle: string
    volume: number
    previousVolume?: number
    bestKg?: number
    previousBestKg?: number
    improved: boolean
  }[]
  radar: { muscle: string; volume: number; sessions: number }[]
  photoUrl?: string
}

export type BodyProfile = {
  heightCm?: number
  sex?: string
  birthYear?: number
  activity: string
  age?: number
  weightKg?: number
  bmi?: number
  bmr?: number
  tdee?: number
}

export type BodyLog = {
  id?: string
  date: string
  source: string
  kind?: string
  weightKg?: number
  heightCm?: number
  bmi?: number
  bodyFatPct?: number
  fatFreeKg?: number
  subcutaneousFatPct?: number
  visceralFat?: number
  bodyWaterPct?: number
  skeletalMusclePct?: number
  muscleMassKg?: number
  muscleStorage?: number
  boneMassKg?: number
  proteinPct?: number
  bmrKcal?: number
  bmrComputed?: number
  tdee?: number
  metabolicAge?: number
  waistCm?: number
  chestCm?: number
  leftBicepCm?: number
  rightBicepCm?: number
  hipsCm?: number
  leftThighCm?: number
  rightThighCm?: number
  neckCm?: number
  shouldersCm?: number
  leftCalfCm?: number
  rightCalfCm?: number
  leftForearmCm?: number
  rightForearmCm?: number
  notes?: string
}

export type TrainActivity = {
  id: string
  name: string
  activityType: string
  date: string
  durationSec?: number
  distanceM?: number
  calories?: number
  avgHr?: number
  notes?: string
  source: string
}

export type TrainMusclePoint = { muscle: string; volume: number; sessions: number }

export type TrainSummary = {
  trends: { period: string; volume: number; durationSec: number; radar?: TrainMusclePoint[] }[]
  radar: TrainMusclePoint[]
  recovery: { muscle: string; lastDate: string; hoursSince: number; recoveryPct: number }[]
  totalVolume: number
  totalDurationSec: number
}

export type SleepNight = {
  id: string
  date: string
  startTime?: string
  endTime?: string
  score?: number
  awakeMin: number
  remMin: number
  coreMin: number
  deepMin: number
  totalMin: number
  source: string
}

export type SleepSummary = {
  nights: SleepNight[]
  points: {
    period: string
    avgScore: number
    avgTotal: number
    avgAwake: number
    avgRem: number
    avgCore: number
    avgDeep: number
  }[]
}

export type MindTag = {
  id: string
  name: string
  color: string
  noteCount: number
}

export type MindNote = {
  id: string
  body: string
  createdAt: string
  updatedAt: string
  tags: MindTag[]
}

export type MindJournal = {
  tags: MindTag[]
  notes: MindNote[]
}

export type FinanceAccount = {
  id: string
  name: string
  kind: string
  balance: number
  currency: string
}

export type FinanceLoanPayment = {
  id: string
  dueDate: string
  kind: string
  source: string
  emi: number
  interest: number
  principal: number
  outstandingAfter: number
}

export type FinanceLoan = {
  id: string
  name: string
  kind: string
  principal: number
  remaining: number
  emi: number
  rate?: number
  tenureMonths?: number
  nextDueDate?: string
  termMonths?: number
  disbursed?: number
  currentRoi?: number
  repaymentMode?: string
  plan?: string
  principalBalance?: number
  accruedInterest?: number
  interestAsOf?: string
  feeRefund?: number
  feeRefundUntil?: string
  earlyPayoffSavings?: number
  schedule?: { id: string; dueDate: string; amount: number }[]
  payments?: FinanceLoanPayment[]
  forecast?: { period: string; remaining: number }[]
}

export type TaxItem = {
  id: string
  taxYear: number
  name: string
  kind: string
  amount: number
}

export type TaxCompare = {
  income: number
  oldTaxable: number
  newTaxable: number
  oldTax: number
  newTax: number
  oldCess: number
  newCess: number
  oldTotal: number
  newTotal: number
  cheaper: string
  section80c: number
  otherDeductions: number
  items: TaxItem[]
}

export type Portfolio = {
  accountsTotal: number
  holdingsTotal: number
  loansTotal: number
  netWorth: number
  monthIncome: number
  monthExpenses: number
  leftover: number
  month: string
  nodes: { id: number; name: string; side: string }[]
  links: { source: number; target: number; value: number }[]
}

export type PriceQuote = {
  name: string
  symbol: string
  price: number
  currency: string
  source: string
  usd?: number
}
