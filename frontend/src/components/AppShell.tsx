import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Brain, Clock3, Dumbbell, HeartPulse, Home, Mic, Settings, Wallet } from 'lucide'
import { clsx } from 'clsx'
import { useAuth } from '../lib/auth'
import { Glyph } from './Glyph'
import { InstallHint } from './InstallHint'

const rooms = [
  { to: '/routine', label: 'Routine', icon: Clock3 },
  { to: '/body', label: 'Body', icon: HeartPulse },
  { to: '/play', label: 'Play', icon: Dumbbell },
  { to: '/money', label: 'Money', icon: Wallet },
  { to: '/mind', label: 'Mind', icon: Brain },
  { to: '/voice', label: 'Voice', icon: Mic },
]
const home = { to: '/', label: 'Home', icon: Home }
const desktop = [home, ...rooms, { to: '/settings', label: 'Profile', icon: Settings }]
const mobile = [home, ...rooms]

function initials(name?: string) {
  const parts = (name ?? 'V').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? 'V') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function AppShell() {
  const { user } = useAuth()
  const location = useLocation()
  const title = desktop.find((d) => d.to === location.pathname)?.label ?? 'Verax'
  const fullBleed = location.pathname === '/body'

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--fg)]">
      <div className="grain" aria-hidden="true" />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="nav-glass fixed z-[20] hidden w-[244px] lg:flex lg:flex-col">
        <div className="px-6 pb-6 pt-8">
          <div className="wordmark text-[42px] leading-none" translate="no">
            Verax
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Primary">
          {desktop.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="nav-item flex items-center gap-4 px-3 py-3 text-base text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {({ isActive }) => (
                <>
                  <Glyph icon={item.icon} size={24} strokeWidth={isActive ? 2 : 1.5} />
                  <span className={isActive ? 'font-semibold' : 'font-normal'}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 px-6 py-6 text-sm">
          <span className="grid size-8 place-items-center rounded-[9px] bg-[var(--surface-2)] text-xs font-semibold">
            {initials(user?.name)}
          </span>
          {user?.name}
        </div>
      </aside>

      <div className="lg:pl-[244px]">
        {!fullBleed && (
          <header className="nav-compact sticky top-0 z-[20] flex min-h-14 items-center justify-between px-4 lg:hidden">
            <NavLink to="/" className="wordmark text-[32px] leading-none" translate="no" aria-label="Home" end>
              Verax
            </NavLink>
            <div className="text-sm font-semibold">{title === 'Home' ? '' : title}</div>
          </header>
        )}
        <main
          id="main"
          className={
            fullBleed
              ? 'min-h-dvh p-0'
              : 'px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-4 lg:px-8 lg:pb-12 lg:pt-8'
          }
        >
          <InstallHint />
          <Outlet />
        </main>
      </div>

      <nav className="tab-glass fixed z-[20] lg:hidden" aria-label="Primary">
        <div className="grid grid-cols-8">
          {mobile.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              aria-label={item.label}
              className="flex h-12 items-center justify-center text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {({ isActive }) => (
                <Glyph icon={item.icon} size={24} strokeWidth={isActive ? 2 : 1.5} />
              )}
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            aria-label="Profile"
            className="flex h-12 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {({ isActive }) => (
              <span
                className={clsx(
                  'grid size-6 place-items-center rounded-[7px] text-[10px] font-semibold',
                  isActive ? 'ring-2 ring-[var(--fg)] ring-offset-1 ring-offset-[var(--bg)]' : 'bg-[var(--surface-2)]',
                )}
                style={isActive ? { background: 'var(--surface-2)' } : undefined}
              >
                {initials(user?.name)}
              </span>
            )}
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
