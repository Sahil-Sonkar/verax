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
  kind: string
  amount: number
  currency: string
  notes?: string
  asOf?: string
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
