import { Link } from 'react-router-dom'
import { Brain, Clock3, Dumbbell, Flame, Wallet } from 'lucide'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Glyph } from '../components/Glyph'

const rooms = [
  {
    to: '/routine',
    title: 'Routine',
    copy: 'The week as seven days. A clock, not a checklist.',
    icon: Clock3,
  },
  {
    to: '/fuel',
    title: 'Fuel',
    copy: 'Meals, recipes, and supplements. Log food and what you took today.',
    icon: Flame,
  },
  {
    to: '/train',
    title: 'Train',
    copy: 'Favourite workouts, session reports, body tape and scale imports.',
    icon: Dumbbell,
  },
  {
    to: '/finance',
    title: 'Finance',
    copy: 'Invest, budget, accounts, loans, portfolio, tax plan.',
    icon: Wallet,
  },
  {
    to: '/mind',
    title: 'Mind',
    copy: 'Journal, meditation, and sleep.',
    icon: Brain,
  },
]

export function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      <div>
        <p className="kicker stagger-item">Rooms</p>
        <h1 className="stagger-item mt-2 text-5xl tracking-tight" style={{ animationDelay: '100ms' }}>
          Home
        </h1>
        <p
          className="stagger-item mt-4 max-w-[58ch] text-[15px] leading-relaxed text-[var(--muted)]"
          style={{ animationDelay: '200ms' }}
        >
          Five rooms. Each one keeps its own record. The score that ties them together lands here next.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-6">
        {rooms.map((room, index) => (
          <Link
            key={room.to}
            to={room.to}
            className={`stagger-item block ${index < 2 ? 'md:col-span-3' : 'md:col-span-2'}`}
            style={{ animationDelay: `${300 + index * 100}ms` }}
          >
            <Card className="h-full gap-0 py-0">
              <CardHeader className="p-6">
                <Glyph icon={room.icon} size={22} />
                <CardTitle className="mt-5 text-2xl font-normal tracking-tight">{room.title}</CardTitle>
                <CardDescription className="mt-2 text-sm leading-relaxed">{room.copy}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
