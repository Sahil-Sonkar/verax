import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TrackerHabitRow } from '../components/TrackerHabitRow'
import { api } from '../lib/api'
import { flattenDay, isWaterHabit, pickTracked } from '../lib/dailyHabits'
import { scoreTone } from '../lib/colors'
import type { CompletionStatus, DayMeals, DaySnapshot } from '../types'

export function TodayPage() {
  const queryClient = useQueryClient()
  const today = useQuery({ queryKey: ['today'], queryFn: () => api<DaySnapshot>('/api/days/today') })
  const meals = useQuery({
    queryKey: ['meals', today.data?.date],
    queryFn: () => api<DayMeals>(`/api/meals/day?date=${today.data?.date}`),
    enabled: Boolean(today.data?.date),
  })

  const mutation = useMutation({
    mutationFn: ({ habitId, status, value }: { habitId: string; status: CompletionStatus; value?: number }) =>
      api<DaySnapshot>(`/api/days/${today.data?.date}/habits/${habitId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, value }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['today'], data)
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['tracker'] })
    },
  })

  if (today.isLoading) return <div className="skeleton h-40" aria-busy="true" aria-label="Loading today" />
  if (!today.data) return <p>Could not load today.</p>

  const day = today.data
  const tracked = pickTracked(flattenDay(day))
  const done = tracked.filter((row) => row.status === 'COMPLETED').length
  const tone = scoreTone(tracked.length === 0 ? 0 : Math.round((done / tracked.length) * 100))
  const date = new Date(day.date + 'T00:00:00')
  const waterLiters = (meals.data?.waterMl ?? 0) / 1000

  return (
    <div>
      <h1 className="text-4xl tracking-tight">
        {new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(date)}
      </h1>
      <div className="mt-6 border-y border-[var(--line)]">
        {tracked.length === 0 && (
          <p className="py-8 text-sm text-[var(--muted)]">No tracked habits yet. Add them on Home.</p>
        )}
        {tracked.map((item) => (
          <TrackerHabitRow
            key={item.habit.id}
            item={item}
            trail={[]}
            waterLiters={isWaterHabit(item) ? waterLiters : undefined}
            onStatus={(id, status, value) => mutation.mutate({ habitId: id, status, value })}
          />
        ))}
      </div>
      <div className="mt-8 flex items-end justify-between border-t border-[var(--line)] pt-4">
        <div>
          <div className="text-4xl tracking-tight tabular" style={{ color: tone }}>
            {done} / {tracked.length}
          </div>
          <div className="text-sm text-[var(--muted)]">Tracked habits</div>
        </div>
      </div>
    </div>
  )
}
