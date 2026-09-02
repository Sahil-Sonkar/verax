import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AuthProvider, useAuth } from './lib/auth'
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
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
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
              <Route path="/fuel" element={<FuelPage />} />
              <Route path="/recipe" element={<Navigate to="/fuel" replace />} />
              <Route path="/train" element={<TrainPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/mind" element={<MindPage />} />
              <Route path="/today" element={<TodayPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/transformation" element={<TransformationPage />} />
              <Route path="/journal" element={<JournalPage />} />
              <Route path="/invest" element={<Navigate to="/finance" replace />} />
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
