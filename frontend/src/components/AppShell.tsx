import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  CalendarCheck,
  Flag,
  LayoutDashboard,
  NotebookPen,
  Pill,
  Settings,
  Sparkles,
  Compass,
  UserRound,
  Wallet,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../lib/auth'

const desktop = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/today', label: 'Today', icon: CalendarCheck },
  { to: '/goals', label: 'Goals', icon: Flag },
  { to: '/habits', label: 'Habits', icon: Sparkles },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/transformation', label: 'Transformation', icon: Compass },
  { to: '/journal', label: 'Journal', icon: NotebookPen },
  { to: '/invest', label: 'Invest', icon: Wallet },
  { to: '/meds', label: 'Medicines', icon: Pill },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const mobile = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/today', label: 'Today', icon: CalendarCheck },
  { to: '/invest', label: 'Invest', icon: Wallet },
  { to: '/goals', label: 'Goals', icon: Flag },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Profile', icon: UserRound },
]

const glows: Record<string, { a: string; b: string }> = {
  '/': { a: 'var(--violet)', b: 'var(--sky)' },
  '/today': { a: 'var(--brass)', b: 'var(--sky)' },
  '/goals': { a: 'var(--sky)', b: 'var(--violet)' },
  '/habits': { a: 'var(--violet)', b: 'var(--brass)' },
  '/analytics': { a: 'var(--sky)', b: 'var(--brass)' },
  '/transformation': { a: 'var(--violet)', b: 'var(--sky)' },
  '/journal': { a: 'var(--violet)', b: 'var(--sky)' },
  '/invest': { a: 'var(--brass)', b: 'var(--sky)' },
  '/meds': { a: 'var(--sky)', b: 'var(--violet)' },
  '/settings': { a: 'var(--brass)', b: 'var(--violet)' },
}

export function AppShell() {
  const { user } = useAuth()
  const location = useLocation()
  const glow = glows[location.pathname] ?? glows['/']

  return (
    <div className="min-h-dvh text-[var(--fg)]">
      <div className="page-glow" style={{ ['--glow-a' as string]: glow.a, ['--glow-b' as string]: glow.b }} />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="nav-glass fixed z-[20] hidden w-60 lg:flex lg:flex-col">
        <div className="px-6 py-7">
          <div className="wordmark text-3xl font-medium tracking-tight" translate="no">
            Verax
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3" aria-label="Primary">
          {desktop.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'nav-item flex items-center gap-3 px-3 py-2 text-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                  isActive ? 'text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={16} strokeWidth={1.5} aria-hidden="true" style={{ color: isActive ? 'var(--accent)' : undefined }} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-5 text-sm text-[var(--muted)]">{user?.name}</div>
      </aside>

      <div className="lg:pl-[17rem]">
        <header className="nav-compact sticky top-3 z-[20] mx-3 flex items-center justify-between px-5 py-3 lg:hidden">
          <div>
            <div className="text-sm font-medium tracking-tight" translate="no">
              Verax
            </div>
            <div className="text-sm text-[var(--muted)]">
              {desktop.find((d) => d.to === location.pathname)?.label ?? 'Command center'}
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-5 pb-32 pt-6 lg:pb-12 lg:pt-10">
          <Outlet />
        </main>
      </div>

      <nav className="tab-glass fixed z-[20] lg:hidden" aria-label="Primary">
        <div className="grid grid-cols-6 px-1 py-1.5">
          {mobile.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="flex min-h-11 min-w-0 flex-col items-center gap-1 rounded-2xl px-0.5 py-2.5 text-[10px] tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={({ isActive }) => ({
                color: isActive ? 'var(--fg)' : 'var(--muted)',
                background: isActive ? 'color-mix(in srgb, var(--fg) 12%, transparent)' : 'transparent',
              })}
            >
              <item.icon size={18} strokeWidth={1.5} aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
