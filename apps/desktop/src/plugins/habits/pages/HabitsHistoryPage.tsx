import { useMemo } from 'react'
import { useHabitsStore } from '../store'
import { addDays, formatLocalDate, computeStats, fallbackColor } from '../utils'
import { messages } from '@core/ui/messages'

/**
 * Heatmap de últimos 30 días para todos los hábitos activos.
 */
export function HabitsHistoryPage() {
  const habits = useHabitsStore((s) => s.habits)
  const logs = useHabitsStore((s) => s.logs)

  const active = useMemo(() => habits.filter((h) => !h.archived), [habits])
  const days = useMemo(() => {
    const today = new Date()
    const arr: string[] = []
    for (let i = 29; i >= 0; i--) {
      arr.push(formatLocalDate(addDays(today, -i)))
    }
    return arr
  }, [])

  const matrix = useMemo(() => {
    return active.map((h) => {
      const habitLogs = logs.filter((l) => l.habitId === h.id)
      const map = new Map(habitLogs.map((l) => [l.date, l.count]))
      const cells = days.map((d) => ({ date: d, count: map.get(d) ?? 0 }))
      const stats = computeStats(h, habitLogs)
      return { habit: h, cells, stats }
    })
  }, [active, logs, days])

  if (active.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-8 text-center text-sm text-muted">
        {messages.empty.habitsAll}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
        <p className="text-caption uppercase tracking-eyebrow text-muted">Hábitos</p>
        <h1 className="text-2xl font-semibold text-white">Historial 30 días</h1>
        <p className="text-xs text-muted">Cada celda es un día. Más opaco = más cumplimiento.</p>
      </header>

      <section className="overflow-x-auto rounded-2xl border border-border bg-surface-light/90 p-4 shadow-xl">
        <table className="min-w-full text-xs" role="table" aria-label="Heatmap de hábitos últimos 30 días">
          <caption className="sr-only">Cumplimiento de cada hábito en los últimos 30 días.</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 bg-surface-light px-2 py-1 text-left text-muted">Hábito</th>
              {days.map((d) => (
                <th key={d} scope="col" className="px-0.5 py-1 text-[9px] text-muted">{d.slice(8)}</th>
              ))}
              <th scope="col" className="px-2 py-1 text-right text-muted">30d</th>
              <th scope="col" className="px-2 py-1 text-right text-muted">Racha</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map(({ habit, cells, stats }) => {
              const color = habit.color ?? fallbackColor(habit.name)
              return (
                <tr key={habit.id}>
                  <th scope="row" className="sticky left-0 bg-surface-light px-2 py-1 text-left text-white whitespace-nowrap max-w-[10rem] truncate">
                    {habit.name}
                  </th>
                  {cells.map((c) => {
                    const intensity = c.count >= habit.target ? 1 : c.count > 0 ? 0.45 : 0
                    return (
                      <td key={c.date} className="px-0.5 py-1">
                        <span
                          className="block h-4 w-4 rounded-sm border border-border/40"
                          style={{ backgroundColor: intensity > 0 ? color : 'transparent', opacity: intensity || 1 }}
                          title={`${c.date}: ${c.count}/${habit.target}`}
                          aria-label={`${habit.name}, ${c.date}, ${c.count} de ${habit.target}`}
                        />
                      </td>
                    )
                  })}
                  <td className="px-2 py-1 text-right text-white">{Math.round(stats.rate30d * 100)}%</td>
                  <td className="px-2 py-1 text-right text-white">{stats.streak}d</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
