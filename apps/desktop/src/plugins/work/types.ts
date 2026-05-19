export interface Board {
  id: string
  name: string
}

export interface Column {
  id: string
  boardId: string
  name: string
  position: number
  /** Límite de trabajo en progreso (WIP). null/0 = sin límite. */
  wipLimit?: number | null
  /**
   * Marca explícita de columna "completada" (DONE). Sólo una columna por board
   * debe tener este flag activo. Es la columna a la que se mueven las tareas
   * al completarse y la que dispara el cierre de sesión de foco.
   */
  isDone?: boolean
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export type CardPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Card {
  id: string
  columnId: string
  title: string
  description: string
  content: string
  labels: string[]
  dueDate: string | null
  position: number
  /** Prioridad de la tarjeta. */
  priority?: CardPriority | null
  /** Estimación en minutos (opcional). */
  estimateMinutes?: number | null
  /** Checklist embebida. */
  checklist?: ChecklistItem[]
  /** Si la tarjeta está archivada (se oculta del tablero). */
  archived?: boolean
  /** Timestamp de cuándo fue archivada. */
  archivedAt?: number | null
}

export interface FocusSession {
  id: string
  taskId: string | null
  startTime: number
  endTime?: number
  duration?: number
  interrupted: boolean
  /** Timestamp de cuándo se pausó la sesión actual. null si no está pausada. */
  pausedAt?: number | null
  /** Tiempo total acumulado en pausas (ms). */
  pausedTotal?: number
}

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
  pinned?: boolean
}

export interface Link {
  id: string
  title: string
  url: string
  category: string
}
