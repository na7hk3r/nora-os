import { eventBus } from '@core/events/EventBus'
import { WORK_EVENTS } from './events'
import { useWorkStore } from './store'
import type { FocusSession } from './types'

/**
 * Duración mínima (ms) para que una sesión descartada al cambiar de tarea
 * cuente como sesión real. Por debajo de este umbral se borra sin penalizar.
 */
const MIN_VALID_SESSION_MS = 60_000

function getCurrentTimestamp() {
  return Date.now()
}

/**
 * Devuelve el título de una tarea por id (snapshot del estado actual del store).
 * Usado para enriquecer payloads de eventos con datos descriptivos al emitir,
 * de modo que el feed de actividad reciente sobreviva a renombres/borrados.
 */
function getTaskTitle(taskId: string | null): string | null {
  if (!taskId) return null
  const card = useWorkStore.getState().cards.find((c) => c.id === taskId)
  return card?.title ?? null
}

function getColumnName(columnId: string | null): string | null {
  if (!columnId) return null
  const col = useWorkStore.getState().columns.find((c) => c.id === columnId)
  return col?.name ?? null
}

function msToMinutes(ms: number): number {
  return Math.max(0, Math.round(ms / 60_000))
}

async function persistFocusSession(session: FocusSession) {
  if (!window.storage) return

  await window.storage.execute(
    `INSERT INTO work_focus_sessions (id, task_id, start_time, end_time, duration, interrupted, paused_at, paused_total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.taskId,
      session.startTime,
      session.endTime ?? null,
      session.duration ?? null,
      session.interrupted ? 1 : 0,
      session.pausedAt ?? null,
      session.pausedTotal ?? 0,
    ],
  )
}

async function updatePersistedFocusSession(session: FocusSession) {
  if (!window.storage) return

  await window.storage.execute(
    `UPDATE work_focus_sessions
     SET task_id = ?, end_time = ?, duration = ?, interrupted = ?, paused_at = ?, paused_total = ?
     WHERE id = ?`,
    [
      session.taskId,
      session.endTime ?? null,
      session.duration ?? null,
      session.interrupted ? 1 : 0,
      session.pausedAt ?? null,
      session.pausedTotal ?? 0,
      session.id,
    ],
  )
}

async function deletePersistedFocusSession(id: string) {
  if (!window.storage) return
  await window.storage.execute(`DELETE FROM work_focus_sessions WHERE id = ?`, [id])
}

/**
 * Tiempo efectivo (sin pausas) de una sesión en curso o finalizada.
 */
export function getEffectiveDuration(session: FocusSession, now: number = Date.now()): number {
  const end = session.endTime ?? now
  const gross = Math.max(0, end - session.startTime)
  const pausedTotal = session.pausedTotal ?? 0
  const pausedOngoing = session.pausedAt ? Math.max(0, now - session.pausedAt) : 0
  return Math.max(0, gross - pausedTotal - pausedOngoing)
}

export async function startWorkFocusSession(taskId: string | null) {
  const store = useWorkStore.getState()
  const currentSession = store.currentFocusSession

  // Mismo target: si está pausada la reanudamos; si no, no-op.
  if (currentSession && currentSession.taskId === taskId) {
    if (currentSession.pausedAt) {
      await resumeWorkFocusSession()
    }
    return currentSession
  }

  const previousTaskId = currentSession?.taskId ?? null

  // Switch limpio: cerrar la sesión actual sin penalizar.
  //   - Si la sesión lleva ≥ 1 min de tiempo efectivo, la cerramos como COMPLETED.
  //   - Si lleva menos, la descartamos (no cuenta como interrupción).
  if (currentSession) {
    const effectiveMs = getEffectiveDuration(currentSession)

    if (effectiveMs >= MIN_VALID_SESSION_MS) {
      await finalizeCurrentSession({ interrupted: false, silent: true })
    } else {
      // Descarte silencioso
      store.finishFocusSession(currentSession.id, {
        endTime: getCurrentTimestamp(),
        duration: 0,
      })
      // Quitar del store y de la DB
      useWorkStore.setState((s) => ({
        focusSessions: s.focusSessions.filter((entry) => entry.id !== currentSession.id),
      }))
      await deletePersistedFocusSession(currentSession.id)
    }
  }

  const session: FocusSession = {
    id: crypto.randomUUID(),
    taskId,
    startTime: getCurrentTimestamp(),
    interrupted: false,
    pausedAt: null,
    pausedTotal: 0,
  }

  store.startFocusSession(session)
  await persistFocusSession(session)

  const taskTitle = getTaskTitle(taskId)

  if (taskId) {
    eventBus.emit(WORK_EVENTS.TASK_STARTED, { taskId, taskTitle, sessionId: session.id })
  }

  if (previousTaskId && taskId && previousTaskId !== taskId) {
    eventBus.emit(WORK_EVENTS.TASK_SWITCHED, {
      fromTaskId: previousTaskId,
      fromTaskTitle: getTaskTitle(previousTaskId),
      toTaskId: taskId,
      toTaskTitle: taskTitle,
      sessionId: session.id,
    })
  }

  eventBus.emit(WORK_EVENTS.FOCUS_STARTED, {
    sessionId: session.id,
    taskId,
    taskTitle,
  })

  return session
}

/**
 * Pausa la sesión activa sin cerrarla ni penalizar XP.
 */
export async function pauseWorkFocusSession() {
  const store = useWorkStore.getState()
  const currentSession = store.currentFocusSession
  if (!currentSession || currentSession.pausedAt) return null

  const pausedAt = getCurrentTimestamp()
  const updated: FocusSession = { ...currentSession, pausedAt }

  store.finishFocusSession(currentSession.id, { pausedAt })
  // finishFocusSession setea currentFocusSession=null cuando id coincide; lo
  // volvemos a apuntar porque sigue siendo la sesión activa (solo pausada).
  useWorkStore.setState({ currentFocusSession: updated })

  await updatePersistedFocusSession(updated)
  eventBus.emit(WORK_EVENTS.FOCUS_PAUSED, {
    sessionId: updated.id,
    taskId: updated.taskId,
    taskTitle: getTaskTitle(updated.taskId),
  })
  return updated
}

/**
 * Reanuda una sesión previamente pausada, sumando el tiempo pausado al total.
 */
export async function resumeWorkFocusSession() {
  const store = useWorkStore.getState()
  const currentSession = store.currentFocusSession
  if (!currentSession || !currentSession.pausedAt) return null

  const now = getCurrentTimestamp()
  const pausedDelta = Math.max(0, now - currentSession.pausedAt)
  const updated: FocusSession = {
    ...currentSession,
    pausedAt: null,
    pausedTotal: (currentSession.pausedTotal ?? 0) + pausedDelta,
  }

  useWorkStore.setState((s) => ({
    currentFocusSession: updated,
    focusSessions: s.focusSessions.map((session) => (session.id === updated.id ? updated : session)),
  }))

  await updatePersistedFocusSession(updated)
  eventBus.emit(WORK_EVENTS.FOCUS_RESUMED, {
    sessionId: updated.id,
    taskId: updated.taskId,
    taskTitle: getTaskTitle(updated.taskId),
  })
  return updated
}

interface FinalizeOptions {
  interrupted: boolean
  /** Si es true, NO emite el evento COMPLETED/INTERRUPTED (usado por switch limpio). */
  silent?: boolean
}

async function finalizeCurrentSession(opts: FinalizeOptions) {
  const store = useWorkStore.getState()
  const currentSession = store.currentFocusSession
  if (!currentSession) return null

  const endTime = getCurrentTimestamp()
  // Si estaba pausada al cerrar, cerramos también la pausa en curso.
  const pausedOngoing = currentSession.pausedAt ? Math.max(0, endTime - currentSession.pausedAt) : 0
  const pausedTotal = (currentSession.pausedTotal ?? 0) + pausedOngoing
  const duration = Math.max(0, endTime - currentSession.startTime - pausedTotal)

  const completedSession: FocusSession = {
    ...currentSession,
    endTime,
    duration,
    interrupted: opts.interrupted,
    pausedAt: null,
    pausedTotal,
  }

  store.finishFocusSession(currentSession.id, completedSession)
  await updatePersistedFocusSession(completedSession)

  if (!opts.silent) {
    eventBus.emit(
      opts.interrupted ? WORK_EVENTS.FOCUS_INTERRUPTED : WORK_EVENTS.FOCUS_COMPLETED,
      {
        sessionId: completedSession.id,
        taskId: completedSession.taskId,
        taskTitle: getTaskTitle(completedSession.taskId),
        duration,
        durationMin: msToMinutes(duration),
      },
    )
  }

  return completedSession
}

export async function completeWorkFocusSession() {
  return finalizeCurrentSession({ interrupted: false })
}

export async function interruptWorkFocusSession() {
  return finalizeCurrentSession({ interrupted: true })
}

/**
 * Devuelve el id de la columna "Hecho" del tablero principal, si existe.
 * Detecta tanto por id canónico como por nombre.
 */
function findDoneColumnId(): string | null {
  const { columns } = useWorkStore.getState()
  const flagged = columns.find((column) => column.isDone)
  if (flagged) return flagged.id
  const explicit = columns.find((column) => column.id === 'col-done')
  if (explicit) return explicit.id
  const byName = columns.find((column) => /hecho|done|completad/i.test(column.name))
  return byName?.id ?? null
}

/**
 * Marca una tarea como completada:
 *  - Detiene la sesión de foco activa si pertenece a esa tarea (cuenta como completed).
 *  - Mueve la card al final de la columna "Hecho".
 *  - Persiste cambios y emite TASK_MOVED + TASK_COMPLETED.
 *
 * Es la operación canónica detrás del botón "Completar" y del drag a Hecho.
 */
export async function completeWorkTask(cardId: string): Promise<void> {
  const store = useWorkStore.getState()
  const card = store.cards.find((c) => c.id === cardId)
  if (!card) return

  const doneColumnId = findDoneColumnId()
  if (!doneColumnId) return

  // 1. Detener la sesión de foco si corresponde a esta tarea.
  if (store.currentFocusSession && store.currentFocusSession.taskId === cardId) {
    await completeWorkFocusSession()
  }

  // 2. Si ya está en Hecho, sólo emitimos completed (idempotente respecto a la columna).
  if (card.columnId === doneColumnId) {
    eventBus.emit(WORK_EVENTS.TASK_COMPLETED, {
      taskId: card.id,
      title: card.title,
      columnId: doneColumnId,
    })
    return
  }

  const fromColumnId = card.columnId

  // 3. Calcular nueva posición (al final de la columna destino).
  const doneSiblings = store.cards
    .filter((c) => c.columnId === doneColumnId && c.id !== cardId && !c.archived)
    .sort((a, b) => a.position - b.position)

  const newPosition = doneSiblings.length

  // Re-slot columna origen (compactar posiciones).
  const sourceSiblings = store.cards
    .filter((c) => c.columnId === fromColumnId && c.id !== cardId && !c.archived)
    .sort((a, b) => a.position - b.position)

  const updates: Array<{ id: string; columnId: string; position: number }> = [
    { id: cardId, columnId: doneColumnId, position: newPosition },
    ...sourceSiblings.map((s, idx) => ({ id: s.id, columnId: fromColumnId, position: idx })),
  ]

  store.reorderCards(updates)

  if (window.storage) {
    await Promise.all(
      updates.map((u) =>
        window.storage.execute(
          `UPDATE work_cards SET column_id = ?, position = ? WHERE id = ?`,
          [u.columnId, u.position, u.id],
        ),
      ),
    )
  }

  eventBus.emit(WORK_EVENTS.TASK_MOVED, {
    cardId,
    cardTitle: card.title,
    fromColumn: fromColumnId,
    fromColumnName: getColumnName(fromColumnId),
    toColumn: doneColumnId,
    toColumnName: getColumnName(doneColumnId),
  })
  eventBus.emit(WORK_EVENTS.TASK_COMPLETED, {
    taskId: cardId,
    title: card.title,
    columnId: doneColumnId,
    columnName: getColumnName(doneColumnId),
  })
}

/**
 * Detiene la sesión de foco activa marcándola como interrumpida y mueve la
 * tarea asociada a la columna marcada como Completada (si existe).
 *
 * Diferencia con `completeWorkTask`:
 *  - Mantiene la semántica de "interrumpido" en la sesión (penaliza puntos).
 *  - Igualmente reubica la card en Done para reflejar que el trabajo se cerró.
 *
 * Si no hay tarea asociada, sólo interrumpe el foco.
 */
export async function stopWorkTask(cardId: string | null): Promise<void> {
  // 1. Interrumpir la sesión de foco actual (sea o no del cardId indicado).
  await interruptWorkFocusSession()

  if (!cardId) return

  const store = useWorkStore.getState()
  const card = store.cards.find((c) => c.id === cardId)
  if (!card) return

  const doneColumnId = findDoneColumnId()
  if (!doneColumnId || card.columnId === doneColumnId) return

  const fromColumnId = card.columnId
  const doneSiblings = store.cards
    .filter((c) => c.columnId === doneColumnId && c.id !== cardId && !c.archived)
    .sort((a, b) => a.position - b.position)
  const newPosition = doneSiblings.length

  const sourceSiblings = store.cards
    .filter((c) => c.columnId === fromColumnId && c.id !== cardId && !c.archived)
    .sort((a, b) => a.position - b.position)

  const updates: Array<{ id: string; columnId: string; position: number }> = [
    { id: cardId, columnId: doneColumnId, position: newPosition },
    ...sourceSiblings.map((s, idx) => ({ id: s.id, columnId: fromColumnId, position: idx })),
  ]

  store.reorderCards(updates)

  if (window.storage) {
    await Promise.all(
      updates.map((u) =>
        window.storage.execute(
          `UPDATE work_cards SET column_id = ?, position = ? WHERE id = ?`,
          [u.columnId, u.position, u.id],
        ),
      ),
    )
  }

  eventBus.emit(WORK_EVENTS.TASK_MOVED, {
    cardId,
    cardTitle: card.title,
    fromColumn: fromColumnId,
    fromColumnName: getColumnName(fromColumnId),
    toColumn: doneColumnId,
    toColumnName: getColumnName(doneColumnId),
  })
  eventBus.emit(WORK_EVENTS.TASK_COMPLETED, {
    taskId: cardId,
    title: card.title,
    columnId: doneColumnId,
    columnName: getColumnName(doneColumnId),
  })
}

