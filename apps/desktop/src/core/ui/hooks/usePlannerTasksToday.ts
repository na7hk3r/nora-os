import { useEffect, useState } from 'react'
import { storageAPI } from '@core/storage/StorageAPI'

export interface PlannerTaskTodayItem {
  id: string
  title: string
  category: 'domestica' | 'recordatorio' | 'trabajo' | 'personal'
  complexity: 'baja' | 'media' | 'alta'
  date: string
  completed: boolean
  isOverdue: boolean
}

const STORAGE_KEY = 'corePlannerTasksV1'

function todayIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

/**
 * Carga las tareas del Planner core desde `settings[corePlannerTasksV1]` y
 * devuelve aquellas pendientes que vencen hoy o están atrasadas.
 *
 * Refresca al montar y al recibir el evento storage:settings:corePlannerTasksV1
 * (no implementado aún — recarga manual mediante `refresh`). Para mantener
 * sincronía simple, hacemos polling ligero cada 60s.
 */
export function usePlannerTasksToday(limit = 3) {
  const [items, setItems] = useState<PlannerTaskTodayItem[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const rows = await storageAPI.query<{ value: string }>(
          'SELECT value FROM settings WHERE key = ? LIMIT 1',
          [STORAGE_KEY],
        )
        if (cancelled) return
        if (!rows[0]) {
          setItems([])
          return
        }
        const parsed = JSON.parse(rows[0].value) as Array<{
          id: string
          title: string
          category: PlannerTaskTodayItem['category']
          complexity: PlannerTaskTodayItem['complexity']
          date: string
          completed: boolean
        }>
        const today = todayIso()
        const filtered = parsed
          .filter((t) => !t.completed && t.date <= today)
          .map<PlannerTaskTodayItem>((t) => ({
            id: t.id,
            title: t.title,
            category: t.category,
            complexity: t.complexity,
            date: t.date,
            completed: t.completed,
            isOverdue: t.date < today,
          }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, limit)
        setItems(filtered)
      } catch (err) {
        console.error('[usePlannerTasksToday] load failed', err)
        if (!cancelled) setItems([])
      }
    }

    void load()
    const t = setInterval(() => { void load() }, 60_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [limit])

  return items
}
