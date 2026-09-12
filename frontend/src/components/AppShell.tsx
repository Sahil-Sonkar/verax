import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Brain, Clock3, Dumbbell, HeartPulse, Home, Menu, Mic, Settings, Wallet, X } from 'lucide'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/button'
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
const settings = { to: '/settings', label: 'Settings', icon: Settings }
const desktop = [home, ...rooms, { to: '/settings', label: 'Profile', icon: Settings }]
const dock = [home, rooms[0], settings]

function initials(name?: string) {
  const parts = (name ?? 'V').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? 'V') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function AppShell() {
  const { user } = useAuth()
  const location = useLocation()
  const [menu, setMenu] = useState(false)
  const title = desktop.find((d) => d.to === location.pathname)?.label ?? 'Verax'
  const fullBleed = location.pathname === '/body'

  useEffect(() => {
    setMenu(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menu) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenu(false)
    }
    function onResize() {
      if (window.matchMedia('(min-width: 1024px)').matches) setMenu(false)
    }
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      document.body.style.overflow = previous
    }
  }, [menu])

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
        <nav className="flex-1 px-3" aria-label="Primary">
          <div className="flex flex-col gap-1">
            {desktop.map((item) => (
              <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />
            ))}
          </div>
        </nav>
        <div className="flex items-center gap-3 px-6 py-6 text-sm">
          <span className="grid size-8 place-items-center rounded-[9px] bg-[var(--surface-2)] text-xs font-semibold">
            {initials(user?.name)}
          </span>
          {user?.name}
        </div>
      </aside>

      <div className="lg:pl-[244px]">
        <header className="nav-compact sticky top-0 z-[20] flex min-h-14 items-center gap-2 lg:hidden">
          <Button type="button" variant="ghost" size="icon-lg" className="size-11" aria-label="Open menu" onClick={() => setMenu(true)}>
            <Glyph icon={Menu} size={22} />
          </Button>
          <NavLink to="/" className="wordmark min-w-0 flex-1 text-[32px] leading-none" translate="no" aria-label="Home" end>
            Verax
          </NavLink>
          <div className="max-w-[40%] truncate text-sm font-semibold">{title === 'Home' ? '' : title}</div>
        </header>
        <main
          id="main"
          className={
            fullBleed
              ? 'min-h-dvh min-w-0 p-0'
              : 'min-w-0 px-[max(1rem,env(safe-area-inset-left))] pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-4 pr-[max(1rem,env(safe-area-inset-right))] lg:px-8 lg:pb-12 lg:pt-8'
          }
        >
          <InstallHint />
          <Outlet />
        </main>
      </div>

      {menu ? (
        <div className="fixed inset-0 z-[40] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-[color-mix(in_srgb,var(--fg)_42%,transparent)]"
            aria-label="Close menu"
            onClick={() => setMenu(false)}
          />
          <aside
            className="nav-glass fixed inset-y-0 left-0 flex w-[min(18rem,86vw)] flex-col pl-[env(safe-area-inset-left)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            role="dialog"
            aria-modal="true"
            aria-label="Sections"
          >
            <div className="flex items-center justify-between px-3 pt-3">
              <div className="wordmark px-3 text-[32px] leading-none" translate="no">
                Verax
              </div>
              <Button type="button" variant="ghost" size="icon-lg" className="size-11" aria-label="Close menu" onClick={() => setMenu(false)}>
                <Glyph icon={X} size={22} />
              </Button>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="All sections">
              <div className="flex flex-col gap-1">
                {desktop.map((item) => (
                  <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />
                ))}
              </div>
            </nav>
            <div className="flex items-center gap-3 px-6 py-5 text-sm">
              <span className="grid size-8 place-items-center rounded-[9px] bg-[var(--surface-2)] text-xs font-semibold">
                {initials(user?.name)}
              </span>
              {user?.name}
            </div>
          </aside>
        </div>
      ) : null}

      <nav className="tab-glass fixed z-[20] lg:hidden" aria-label="Primary">
        <div className="grid grid-cols-3">
          {dock.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              aria-label={item.label}
              className="flex min-h-11 flex-col items-center justify-center gap-0.5 py-1 text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {({ isActive }) => (
                <>
                  <Glyph icon={item.icon} size={22} strokeWidth={isActive ? 2 : 1.5} />
                  <span className={clsx('text-[10px]', isActive ? 'font-semibold' : 'text-[var(--muted)]')}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function NavItem({
  to,
  label,
  icon,
}: {
  to: string
  label: string
  icon: typeof Home
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className="nav-item flex items-center gap-4 px-3 py-3 text-base text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      {({ isActive }) => (
        <>
          <Glyph icon={icon} size={24} strokeWidth={isActive ? 2 : 1.5} />
          <span className={isActive ? 'font-semibold' : 'font-normal'}>{label}</span>
        </>
      )}
    </NavLink>
  )
}
