import { dehydrate, hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AuthProvider, useAuth } from './lib/auth'
import { QUERY_CACHE } from './lib/api'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { DashboardPage } from './pages/DashboardPage'
import { FinancePage } from './pages/FinancePage'
import { GoalsPage } from './pages/GoalsPage'
import { HabitsPage } from './pages/HabitsPage'
import { HomePage } from './pages/HomePage'
import { JournalPage } from './pages/JournalPage'
import { MedicationsPage } from './pages/MedicationsPage'
import { MindPage } from './pages/MindPage'
import { FuelPage } from './pages/RecipePage'
import { RoutinePage } from './pages/RoutinePage'
import { SettingsPage } from './pages/SettingsPage'
import { TodayPage } from './pages/TodayPage'
import { TrainPage } from './pages/TrainPage'
import { TransformationPage } from './pages/TransformationPage'
import { VoicePage } from './pages/VoicePage'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000, gcTime: 30 * 60_000, refetchOnWindowFocus: false },
  },
})

try {
  const raw = sessionStorage.getItem(QUERY_CACHE)
  if (raw) hydrate(queryClient, JSON.parse(raw))
} catch {
  sessionStorage.removeItem(QUERY_CACHE)
}

window.addEventListener('pagehide', () => {
  try {
    sessionStorage.setItem(QUERY_CACHE, JSON.stringify(dehydrate(queryClient)))
  } catch {
    sessionStorage.removeItem(QUERY_CACHE)
  }
})

function Guard({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  if (!ready) return <div className="grid min-h-dvh place-items-center text-[var(--muted)]">Opening Verax…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function Guest({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  if (!ready) return <div className="grid min-h-dvh place-items-center text-[var(--muted)]">Opening Verax…</div>
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <Guest>
                  <LoginPage />
                </Guest>
              }
            />
            <Route
              path="/register"
              element={
                <Guest>
                  <RegisterPage />
                </Guest>
              }
            />
            <Route
              element={
                <Guard>
                  <AppShell />
                </Guard>
              }
            >
              <Route path="/" element={<HomePage />} />
              <Route path="/routine" element={<RoutinePage />} />
              <Route path="/body" element={<FuelPage />} />
              <Route path="/fuel" element={<Navigate to="/body" replace />} />
              <Route path="/recipe" element={<Navigate to="/body" replace />} />
              <Route path="/play" element={<TrainPage />} />
              <Route path="/train" element={<Navigate to="/play" replace />} />
              <Route path="/money" element={<FinancePage />} />
              <Route path="/finance" element={<Navigate to="/money" replace />} />
              <Route path="/mind" element={<MindPage />} />
              <Route path="/voice" element={<VoicePage />} />
              <Route path="/today" element={<TodayPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/transformation" element={<TransformationPage />} />
              <Route path="/journal" element={<JournalPage />} />
              <Route path="/invest" element={<Navigate to="/money" replace />} />
              <Route path="/consistency" element={<DashboardPage />} />
              <Route path="/meds" element={<MedicationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
