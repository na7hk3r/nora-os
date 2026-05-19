import { useEffect, useRef } from 'react'
import { useWorkStore } from '../store'
import { startWorkFocusSession } from '../focus'
import { useToast } from '@core/ui/components/ToastProvider'
import { messages } from '@core/ui/messages'

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000
const IDLE_DELAY_MS = 45_000

// Flag global por sesión de app: evita disparar más de un nudge por proceso.
let nudgeFiredThisAppSession = false

/**
 * Hook que monta un nudge de foco cuando el usuario lleva 45s en /work
 * sin acción y la última sesión de foco fue hace >4h. Solo dispara una vez
 * por sesión de la app.
 */
export function useFocusNudge() {
  const { focusSessions, currentFocusSession, cards } = useWorkStore()
  const { toast } = useToast()
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (nudgeFiredThisAppSession) return
    if (currentFocusSession) return

    const lastEnded = focusSessions
      .map((s) => s.endTime ?? 0)
      .filter((t) => t > 0)
      .reduce((max, t) => (t > max ? t : max), 0)
    const elapsed = Date.now() - lastEnded
    const noRecentSession = lastEnded === 0 || elapsed > FOUR_HOURS_MS
    if (!noRecentSession) return

    const cancel = () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const reset = () => {
      cancel()
      schedule()
    }

    const schedule = () => {
      timerRef.current = window.setTimeout(() => {
        if (nudgeFiredThisAppSession) return
        nudgeFiredThisAppSession = true
        const candidate = pickHighestPriorityCard(cards)
        toast.undo({
          message: messages.guidance.focusNudgeHeading,
          undoLabel: messages.guidance.focusNudgeStart,
          onUndo: async () => { await startWorkFocusSession(candidate?.id ?? null) },
          timeoutMs: 12_000,
        })
        cancel()
      }, IDLE_DELAY_MS)
    }

    schedule()
    const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'wheel', 'touchstart']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      cancel()
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [focusSessions, currentFocusSession, cards, toast])
}

interface CardLike {
  id: string
  archived?: boolean
  columnId?: string
  position?: number
  dueDate?: string | null
}

function pickHighestPriorityCard(cards: CardLike[]): CardLike | null {
  const candidates = cards.filter((c) => !c.archived)
  if (candidates.length === 0) return null
  // Prioridad: con dueDate más cercano primero; sin dueDate, por position asc.
  const withDue = candidates
    .filter((c) => typeof c.dueDate === 'string' && c.dueDate)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
  if (withDue[0]) return withDue[0]
  const sorted = [...candidates].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  return sorted[0] ?? null
}
