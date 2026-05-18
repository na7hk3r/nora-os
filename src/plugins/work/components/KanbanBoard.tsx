import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Archive, Flag, Inbox, Pencil, Plus, RotateCcw, Trash2, CheckCircle2 } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  getFirstCollision,
  MeasuringStrategy,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragOverEvent,
  type DragStartEvent,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useWorkStore } from '../store'
import { eventBus } from '@core/events/EventBus'
import { WORK_EVENTS } from '../events'
import { useToast } from '@core/ui/components/ToastProvider'
import { messages } from '@core/ui/messages'
import { useI18n } from '@core/i18n'
import { interruptWorkFocusSession, startWorkFocusSession, completeWorkFocusSession, completeWorkTask, stopWorkTask } from '../focus'
import { isDoneColumn as isDoneColumnUtil } from '../utils/columnUtils'
import {
  getChangedReorderUpdates,
  getColumnIdForTarget,
  getInsertionIndex,
  getVisibleCardsForColumn,
  isColumnId,
  moveVisibleCard,
  sortVisibleCardsByPriority,
} from '../utils/kanbanDnD'
import {
  archiveCompletedCards,
  getCompletedArchiveTargets,
  getNextActiveCardPosition,
  restoreArchivedCard,
} from '../archive'
import { SortableCard } from './SortableCard'
import { CardDetailModal } from './CardDetailModal'
import type { Card, Column } from '../types'
import { TAG_ENTITY_TYPES, tagsService } from '@core/services/tagsService'
import { GlobalTagChip } from '@core/ui/components/GlobalTagPicker'

interface ColumnDropZoneProps {
  id: string
  className: string
  children: React.ReactNode
}

function ColumnDropZone({ id, className, children }: ColumnDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'column', columnId: id },
  })

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'ring-1 ring-accent/40 ring-inset' : ''}`}
    >
      {children}
    </div>
  )
}

function formatArchiveMonth(timestamp: number | null | undefined, locale: string): string {
  if (!timestamp) return 'Sin fecha'
  return new Date(timestamp).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

function formatArchiveDate(timestamp: number | null | undefined, locale: string): string {
  if (!timestamp) return 'Sin fecha'
  return new Date(timestamp).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatFocusDuration(durationMs: number): string {
  const minutes = Math.max(0, Math.round(durationMs / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

const TAG_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#f59e0b', '#fb7185', '#2dd4bf', '#f472b6', '#84cc16']
const PRIORITY_LABELS: Record<NonNullable<Card['priority']>, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

function colorForTagName(name: string): string {
  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0
  }
  return TAG_COLORS[hash % TAG_COLORS.length]
}

export function KanbanBoard() {
  const { columns, cards, focusSessions, addCard, reorderCards, deleteCard, currentFocusSession, setColumns, setCards } = useWorkStore()
  const { toast } = useToast()
  const { locale, compareText } = useI18n()
  const [newCardTitle, setNewCardTitle] = useState<Record<string, string>>({})
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [dragCards, setDragCards] = useState<Card[] | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [columnDraft, setColumnDraft] = useState<{ name: string; wipLimit: string }>({ name: '', wipLimit: '' })
  const [creatingColumn, setCreatingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const dragStartCardsRef = useRef<Card[] | null>(null)
  const lastOverId = useRef<UniqueIdentifier | null>(null)
  const recentlyMovedToNewColumn = useRef(false)

  const displayCards = dragCards ?? cards
  const availableTags = useMemo(() => {
    const byName = new Map<string, { name: string; count: number }>()
    for (const card of cards) {
      if (card.archived) continue
      for (const label of card.labels) {
        const clean = label.trim()
        if (!clean) continue
        const key = clean.toLowerCase()
        const current = byName.get(key)
        byName.set(key, { name: current?.name ?? clean, count: (current?.count ?? 0) + 1 })
      }
    }
    return [...byName.values()].sort((a, b) => compareText(a.name, b.name))
  }, [cards, compareText])
  const filteredDisplayCards = tagFilter
    ? displayCards.filter((card) => card.labels.some((label) => label.toLowerCase() === tagFilter.toLowerCase()))
    : displayCards
  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.position - b.position), [columns])
  const columnIds = useMemo(() => sortedColumns.map((column) => column.id), [sortedColumns])
  const columnIdSet = useMemo(() => new Set(columnIds), [columnIds])
  const visibleCardIdsByColumn = useMemo(() => {
    const map = new Map<string, string[]>()
    columnIds.forEach((columnId) => {
      map.set(columnId, getVisibleCardsForColumn(filteredDisplayCards, columnId).map((card) => card.id))
    })
    return map
  }, [columnIds, filteredDisplayCards])

  // Conteo de sesiones de foco por tarea (solo sesiones finalizadas).
  const focusCountByTask = focusSessions.reduce<Map<string, number>>((acc, session) => {
    if (!session.taskId || !session.endTime) return acc
    acc.set(session.taskId, (acc.get(session.taskId) ?? 0) + 1)
    return acc
  }, new Map())

  const focusDurationByTask = useMemo(() => {
    const map = new Map<string, number>()
    for (const session of focusSessions) {
      if (!session.taskId || !session.endTime || session.interrupted) continue
      const duration = session.duration ?? Math.max(0, session.endTime - session.startTime)
      map.set(session.taskId, (map.get(session.taskId) ?? 0) + duration)
    }
    return map
  }, [focusSessions])

  const isDoneColumn = (columnId: string) => {
    const col = columns.find((c) => c.id === columnId)
    return col ? isDoneColumnUtil(col) : false
  }

  const isInProgressColumn = (columnId: string) =>
    columnId === 'col-progress' || columns.some((column) => column.id === columnId && /progreso|progress/i.test(column.name))

  const doneColumn = useMemo(() => (
    sortedColumns.find((column) => isDoneColumnUtil(column)) ??
    sortedColumns.find((column) => column.id === 'col-done') ??
    sortedColumns.find((column) => /hecho|done|completad/i.test(column.name)) ??
    null
  ), [sortedColumns])

  const archivedCards = useMemo(() => (
    cards
      .filter((card) => card.archived)
      .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0))
  ), [cards])

  const archivedCardsByMonth = useMemo(() => {
    const groups = new Map<string, Card[]>()
    for (const card of archivedCards) {
      const key = formatArchiveMonth(card.archivedAt, locale)
      groups.set(key, [...(groups.get(key) ?? []), card])
    }
    return [...groups.entries()]
  }, [archivedCards, locale])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (!activeCard) return undefined
    const frame = window.requestAnimationFrame(() => {
      recentlyMovedToNewColumn.current = false
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeCard, displayCards])

  const collisionDetectionStrategy = useCallback<CollisionDetection>((args) => {
    if (!activeCard) return closestCorners(args)

    const pointerCollisions = pointerWithin(args)
    const intersections = pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args)
    let overId = getFirstCollision(intersections, 'id')

    if (overId != null) {
      const overKey = String(overId)

      if (columnIdSet.has(overKey)) {
        const columnCardIds = visibleCardIdsByColumn.get(overKey) ?? []
        if (columnCardIds.length > 0) {
          overId = closestCorners({
            ...args,
            droppableContainers: args.droppableContainers.filter((container) =>
              columnCardIds.includes(String(container.id)),
            ),
          })[0]?.id ?? overId
        }
      }

      lastOverId.current = overId
      return [{ id: overId }]
    }

    if (recentlyMovedToNewColumn.current) {
      lastOverId.current = args.active.id
    }

    return lastOverId.current != null ? [{ id: lastOverId.current }] : []
  }, [activeCard, columnIdSet, visibleCardIdsByColumn])

  const isBelowOverItem = (event: DragOverEvent | DragEndEvent) => {
    if (!event.over || isColumnId(columnIds, event.over.id)) return false
    const activeRect = event.active.rect.current.translated
    if (!activeRect) return false
    const activeCenterY = activeRect.top + activeRect.height / 2
    const overCenterY = event.over.rect.top + event.over.rect.height / 2
    return activeCenterY > overCenterY
  }

  const getMoveResult = useCallback((event: DragOverEvent | DragEndEvent, sourceCards: Card[]) => {
    if (!event.over) return null

    const activeId = String(event.active.id)
    const targetColumnId = getColumnIdForTarget(sourceCards, columnIds, event.over.id)
    if (!targetColumnId) return null

    const insertIndex = getInsertionIndex({
      cards: sourceCards,
      activeId,
      targetColumnId,
      overId: event.over.id,
      isBelowOverItem: isBelowOverItem(event),
    })

    return moveVisibleCard(sourceCards, activeId, targetColumnId, insertIndex)
  }, [columnIds])

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id)
    if (!card) return
    dragStartCardsRef.current = cards
    lastOverId.current = event.active.id
    setDragCards(cards)
    setActiveCard(card)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const result = getMoveResult(event, dragCards ?? cards)
    if (!result || result.updates.length === 0) return

    if (result.sourceColumnId && result.sourceColumnId !== result.targetColumnId) {
      recentlyMovedToNewColumn.current = true
    }

    setDragCards(result.cards)
  }

  const clearDragState = () => {
    setActiveCard(null)
    setDragCards(null)
    dragStartCardsRef.current = null
    lastOverId.current = null
    recentlyMovedToNewColumn.current = false
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    const beforeCards = dragStartCardsRef.current ?? cards
    const finalResult = over ? getMoveResult(event, dragCards ?? cards) : null
    const finalCards = finalResult?.cards ?? (dragCards ?? cards)
    clearDragState()

    if (!over || !finalResult) return

    const draggedCard = beforeCards.find((c) => c.id === active.id)
    const finalDraggedCard = finalCards.find((c) => c.id === active.id)
    if (!draggedCard) return

    const sourceColumnId = draggedCard.columnId

    const targetColumnId = finalDraggedCard?.columnId ?? finalResult.targetColumnId
    const realUpdates = getChangedReorderUpdates(beforeCards, finalCards)
    if (realUpdates.length === 0) return

    // Apply atomic store update
    reorderCards(realUpdates)

    // Persist to SQLite (secuencial pero sin await en el loop de UI)
    if (window.storage) {
      await Promise.all(
        realUpdates.map((u) =>
          window.storage.execute(
            `UPDATE work_cards SET column_id = ?, position = ? WHERE id = ?`,
            [u.columnId, u.position, u.id],
          ),
        ),
      )
    }

    if (sourceColumnId !== targetColumnId) {
      const sourceColumn = columns.find((c) => c.id === sourceColumnId)
      const targetColumn = columns.find((c) => c.id === targetColumnId)
      eventBus.emit(WORK_EVENTS.TASK_MOVED, {
        cardId: draggedCard.id,
        cardTitle: draggedCard.title,
        fromColumn: sourceColumnId,
        fromColumnName: sourceColumn?.name ?? null,
        toColumn: targetColumnId,
        toColumnName: targetColumn?.name ?? null,
      })

      if (!isDoneColumn(sourceColumnId) && isDoneColumn(targetColumnId)) {
        // Si la card movida está en foco activo, cerrar la sesión como completada.
        if (currentFocusSession?.taskId === draggedCard.id) {
          await completeWorkFocusSession()
        }
        eventBus.emit(WORK_EVENTS.TASK_COMPLETED, {
          taskId: draggedCard.id,
          title: draggedCard.title,
          columnId: targetColumnId,
          columnName: targetColumn?.name ?? null,
        })
      }
    }
  }

  const handleDragCancel = () => {
    clearDragState()
  }

  const handleAddCard = async (columnId: string) => {
    const title = newCardTitle[columnId]?.trim()
    if (!title) return

    const id = crypto.randomUUID()
    const position = cards.filter((c) => c.columnId === columnId && !c.archived).length

    const card: Card = {
      id,
      columnId,
      title,
      description: '',
      content: '',
      labels: [],
      dueDate: null,
      position,
      priority: null,
      estimateMinutes: null,
      checklist: [],
      archived: false,
      archivedAt: null,
    }

    addCard(card)
    setNewCardTitle((prev) => ({ ...prev, [columnId]: '' }))

    if (window.storage) {
      await window.storage.execute(
        `INSERT INTO work_cards (id, column_id, title, description, content, labels, due_date, position, priority, estimate_minutes, checklist, archived, archived_at)
         VALUES (?, ?, ?, '', '', '[]', NULL, ?, NULL, NULL, '[]', 0, NULL)`,
        [id, columnId, title, position],
      )
    }

    eventBus.emit(WORK_EVENTS.TASK_CREATED, { id, title, columnId })
  }

  // Atajo global Ctrl/Cmd + T → crea tarea en la primera columna disponible.
  useEffect(() => {
    const onCreate = async () => {
      const firstCol = columns[0]
      if (!firstCol) return
      const id = crypto.randomUUID()
      const position = cards.filter((c) => c.columnId === firstCol.id && !c.archived).length
      const card: Card = {
        id,
        columnId: firstCol.id,
        title: 'Nueva tarea',
        description: '',
        content: '',
        labels: [],
        dueDate: null,
        position,
        priority: null,
        estimateMinutes: null,
        checklist: [],
        archived: false,
        archivedAt: null,
      }
      addCard(card)
      if (window.storage) {
        await window.storage.execute(
          `INSERT INTO work_cards (id, column_id, title, description, content, labels, due_date, position, priority, estimate_minutes, checklist, archived, archived_at)
           VALUES (?, ?, ?, '', '', '[]', NULL, ?, NULL, NULL, '[]', 0, NULL)`,
          [id, firstCol.id, card.title, position],
        )
      }
      eventBus.emit(WORK_EVENTS.TASK_CREATED, { id, title: card.title, columnId: firstCol.id })
    }
    window.addEventListener('work:new-task', onCreate as EventListener)
    return () => window.removeEventListener('work:new-task', onCreate as EventListener)
  }, [columns, cards, addCard])

  const handleDeleteCard = async (id: string) => {
    const target = cards.find((c) => c.id === id)
    if (!target) return
    if (currentFocusSession?.taskId === id) {
      await interruptWorkFocusSession()
    }

    deleteCard(id)
    if (window.storage) {
      await window.storage.execute(`DELETE FROM work_cards WHERE id = ?`, [id])
    }
    await tagsService.unlinkEntity(TAG_ENTITY_TYPES.WORK_CARD, id)
    eventBus.emit(WORK_EVENTS.TASK_DELETED, { taskId: id, title: target.title ?? null })

    toast.undo({
      message: messages.confirm.deleteCard(target.title || 'Sin título'),
      onUndo: async () => {
        addCard(target)
        if (window.storage) {
          await window.storage.execute(
            `INSERT INTO work_cards (id, column_id, title, description, content, labels, due_date, position, priority, estimate_minutes, checklist, archived, archived_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              target.id,
              target.columnId,
              target.title,
              target.description ?? '',
              target.content ?? '',
              JSON.stringify(target.labels ?? []),
              target.dueDate ?? null,
              target.position ?? 0,
              target.priority ?? null,
              target.estimateMinutes ?? null,
              JSON.stringify(target.checklist ?? []),
              target.archived ? 1 : 0,
              target.archivedAt ?? null,
            ],
          )
        }
        const tags = await Promise.all((target.labels ?? []).map((tag) => tagsService.ensure(tag)))
        await tagsService.setForEntity(TAG_ENTITY_TYPES.WORK_CARD, target.id, tags.map((tag) => tag.id))
        eventBus.emit(WORK_EVENTS.TASK_CREATED, { id: target.id, title: target.title, columnId: target.columnId })
      },
    })
  }

  const handleArchiveCompleted = async (columnId: string) => {
    const targets = getCompletedArchiveTargets(cards, columnId)
    if (targets.length === 0) return
    const ok = window.confirm(`Archivar ${targets.length} tarjeta(s) completadas? Van a quedar disponibles en el archivo.`)
    if (!ok) return

    const archivedAt = Date.now()
    const result = archiveCompletedCards(cards, columnId, archivedAt)
    setCards(result.cards)

    if (window.storage) {
      await Promise.all(result.targetIds.map((id) =>
        window.storage.execute(
          `UPDATE work_cards SET archived = 1, archived_at = ? WHERE id = ?`,
          [archivedAt, id],
        ),
      ))
    }
    setShowArchive(true)
  }

  const handleRestoreArchivedCard = async (card: Card) => {
    const targetColumn = doneColumn ?? sortedColumns[0]
    if (!targetColumn) return
    const nextPosition = getNextActiveCardPosition(cards, targetColumn.id)
    setCards(restoreArchivedCard(cards, card.id, targetColumn.id, nextPosition))

    if (window.storage) {
      await window.storage.execute(
        `UPDATE work_cards SET column_id = ?, position = ?, archived = 0, archived_at = NULL WHERE id = ?`,
        [targetColumn.id, nextPosition, card.id],
      )
    }

    eventBus.emit(WORK_EVENTS.TASK_UPDATED, { taskId: card.id, title: card.title })
  }

  const startEditColumn = (col: { id: string; name: string; wipLimit?: number | null }) => {
    setEditingColumnId(col.id)
    setColumnDraft({ name: col.name, wipLimit: col.wipLimit ? String(col.wipLimit) : '' })
  }

  const cancelEditColumn = () => {
    setEditingColumnId(null)
    setColumnDraft({ name: '', wipLimit: '' })
  }

  const saveEditColumn = async () => {
    if (!editingColumnId) return
    const name = columnDraft.name.trim()
    if (!name) return
    const wipRaw = columnDraft.wipLimit.trim()
    const wipLimit = wipRaw === '' ? null : Math.max(0, Number.parseInt(wipRaw, 10) || 0) || null

    setColumns(
      columns.map((c) => (c.id === editingColumnId ? { ...c, name, wipLimit } : c)),
    )
    if (window.storage) {
      await window.storage.execute(
        `UPDATE work_columns SET name = ?, wip_limit = ? WHERE id = ?`,
        [name, wipLimit, editingColumnId],
      )
    }
    cancelEditColumn()
  }

  const handleAddColumn = async () => {
    const name = newColumnName.trim()
    if (!name) {
      setCreatingColumn(false)
      setNewColumnName('')
      return
    }
    const boardId = columns[0]?.boardId ?? 'default'
    const id = `col-${crypto.randomUUID().slice(0, 8)}`
    const position = columns.filter((c) => c.boardId === boardId).length
    const newCol: Column = { id, boardId, name, position, wipLimit: null, isDone: false }
    setColumns([...columns, newCol])
    if (window.storage) {
      await window.storage.execute(
        `INSERT INTO work_columns (id, board_id, name, position, wip_limit, is_done) VALUES (?, ?, ?, ?, NULL, 0)`,
        [id, boardId, name, position],
      )
    }
    setCreatingColumn(false)
    setNewColumnName('')
  }

  const handleDeleteColumn = async (col: Column) => {
    const sameBoard = columns.filter((c) => c.boardId === col.boardId)
    if (sameBoard.length <= 1) {
      window.alert('No podés eliminar la única columna del tablero.')
      return
    }
    if (isDoneColumnUtil(col)) {
      window.alert('Esta es la columna marcada como Completada. Mové la marca a otra columna antes de eliminarla.')
      return
    }
    const colCards = cards.filter((c) => c.columnId === col.id && !c.archived)
    let fallbackId: string | null = null
    if (colCards.length > 0) {
      const candidates = sameBoard.filter((c) => c.id !== col.id)
      const fallback = candidates.find((c) => !isDoneColumnUtil(c)) ?? candidates[0]
      if (!fallback) return
      const ok = window.confirm(
        `La columna "${col.name}" tiene ${colCards.length} tarjeta(s). Se moverán a "${fallback.name}" antes de eliminar la columna. ¿Continuar?`,
      )
      if (!ok) return
      fallbackId = fallback.id
    } else {
      const ok = window.confirm(`¿Eliminar la columna "${col.name}"?`)
      if (!ok) return
    }

    // Mover tarjetas al fallback si corresponde.
    if (fallbackId) {
      const targetBase = cards.filter((c) => c.columnId === fallbackId && !c.archived).length
      const updates = colCards.map((card, idx) => ({
        id: card.id,
        columnId: fallbackId!,
        position: targetBase + idx,
      }))
      reorderCards(updates)
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
    }

    // Recalcular posiciones del board sin la columna eliminada.
    const remaining = columns
      .filter((c) => c.id !== col.id)
      .sort((a, b) => a.position - b.position)
      .map((c, idx) => (c.boardId === col.boardId ? { ...c, position: idx } : c))

    setColumns(remaining)
    if (window.storage) {
      await window.storage.execute(`DELETE FROM work_columns WHERE id = ?`, [col.id])
      await Promise.all(
        remaining
          .filter((c) => c.boardId === col.boardId)
          .map((c) =>
            window.storage.execute(`UPDATE work_columns SET position = ? WHERE id = ?`, [c.position, c.id]),
          ),
      )
    }

    // Si la card en foco fue movida, no es necesario interrumpir (sigue en otra columna).
  }

  const handleToggleDoneColumn = async (col: Column) => {
    const sameBoard = columns.filter((c) => c.boardId === col.boardId)
    const currentDone = sameBoard.find((c) => c.isDone)
    if (currentDone?.id === col.id) {
      window.alert('Cada tablero requiere una columna Completada. Marcá otra columna como Completada antes de quitar esta.')
      return
    }
    setColumns(
      columns.map((c) => {
        if (c.boardId !== col.boardId) return c
        return { ...c, isDone: c.id === col.id }
      }),
    )
    if (window.storage) {
      await window.storage.execute(
        `UPDATE work_columns SET is_done = 0 WHERE board_id = ?`,
        [col.boardId],
      )
      await window.storage.execute(
        `UPDATE work_columns SET is_done = 1 WHERE id = ?`,
        [col.id],
      )
    }
  }

  const handleSortColumnByPriority = async (columnId: string) => {
    const result = sortVisibleCardsByPriority(cards, columnId)
    if (result.updates.length === 0) return

    reorderCards(result.updates)

    if (window.storage) {
      await Promise.all(
        result.updates.map((u) =>
          window.storage.execute(
            `UPDATE work_cards SET column_id = ?, position = ? WHERE id = ?`,
            [u.columnId, u.position, u.id],
          ),
        ),
      )
    }
  }

  // Layout uniforme: scroll horizontal SIEMPRE con anchos fijos predecibles.
  // El layout equitativo deformaba columnas al competir con el botón "Nueva
  // columna" (w-44 fijo) y al achicar el viewport con sidebar+copilot abiertos.
  const trackClass = 'scrollbar-kanban flex items-start gap-4 overflow-x-auto overflow-y-hidden pb-4'
  const columnSizingClass = 'work-kanban-column flex flex-shrink-0 flex-col overflow-hidden w-[280px] md:w-[300px] 2xl:w-[320px]'

  return (
    <>
      <div className="mb-3 rounded-xl border border-border bg-surface-light/75 px-3 py-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-caption uppercase tracking-wide text-muted">Tags del tablero</span>
            {availableTags.length === 0 ? (
              <span className="text-caption text-muted/70">Sin tags activos</span>
            ) : (
              availableTags.slice(0, 14).map((tag) => (
                <GlobalTagChip
                  key={tag.name}
                  tag={{ name: tag.name, color: colorForTagName(tag.name) }}
                  count={tag.count}
                  selected={tagFilter?.toLowerCase() === tag.name.toLowerCase()}
                />
              ))
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {tagFilter && (
              <button
                type="button"
                onClick={() => setTagFilter(null)}
                className="text-caption text-muted underline-offset-2 hover:text-white hover:underline"
              >
                Limpiar filtro
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowArchive((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-caption font-medium transition-colors ${
                showArchive
                  ? 'border-accent/40 bg-accent/15 text-accent-light'
                  : 'border-border bg-surface text-muted hover:border-accent/35 hover:text-white'
              }`}
            >
              <Archive size={13} />
              Archivo de completadas
              <span className="rounded-full bg-white/10 px-1.5 py-0 text-[10px] leading-4">
                {archivedCards.length}
              </span>
            </button>
          </div>
        </div>
        {tagFilter && (
          <p className="mt-1 text-caption text-muted">
            Mostrando tareas con #{tagFilter}. El arrastre queda pausado mientras el filtro esta activo.
          </p>
        )}
      </div>

      {showArchive && (
        <section className="mb-4 overflow-hidden rounded-xl border border-border bg-surface-light/80 shadow-lg shadow-black/20">
          <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <Inbox size={15} className="text-accent-light" />
                Archivo de completadas
              </p>
              <p className="mt-0.5 text-caption text-muted">
                Cards archivadas manualmente desde la columna Done. Se conservan en Work y pueden restaurarse.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowArchive(false)}
              className="self-start rounded-lg border border-border px-3 py-1.5 text-caption text-muted transition-colors hover:bg-surface hover:text-white sm:self-auto"
            >
              Cerrar
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-3">
            {archivedCards.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted">
                Todavia no hay cards archivadas. Usá Archivar completadas desde la columna Done cuando quieras limpiar el tablero.
              </div>
            ) : (
              <div className="space-y-4">
                {archivedCardsByMonth.map(([month, monthCards]) => (
                  <div key={month}>
                    <h4 className="mb-2 text-caption font-semibold uppercase tracking-eyebrow text-muted">{month}</h4>
                    <div className="grid gap-2 lg:grid-cols-2">
                      {monthCards.map((card) => {
                        const priority = card.priority ? card.priority : null
                        const focusMs = focusDurationByTask.get(card.id) ?? 0
                        return (
                          <article
                            key={card.id}
                            className="rounded-lg border border-border bg-surface px-3 py-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white" title={card.title}>
                                  {card.title}
                                </p>
                                <p className="mt-0.5 text-caption text-muted">
                                  Archivada {formatArchiveDate(card.archivedAt, locale)}
                                  {focusMs > 0 ? ` · foco ${formatFocusDuration(focusMs)}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => { void handleRestoreArchivedCard(card) }}
                                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-success/30 px-2 py-1 text-caption text-success transition-colors hover:bg-success/10"
                                title="Restaurar a Done"
                              >
                                <RotateCcw size={12} />
                                Restaurar
                              </button>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {priority && (
                                <span className="rounded-full border border-border/70 bg-surface-light/70 px-2 py-0.5 text-micro uppercase tracking-wide text-muted">
                                  {PRIORITY_LABELS[priority]}
                                </span>
                              )}
                              {card.labels.slice(0, 4).map((label) => (
                                <GlobalTagChip
                                  key={label}
                                  tag={{ name: label, color: colorForTagName(label) }}
                                  className="px-2 py-0.5 text-micro"
                                />
                              ))}
                              {card.labels.length > 4 && (
                                <span className="rounded-full border border-border/70 bg-surface-light/70 px-2 py-0.5 text-micro text-muted">
                                  +{card.labels.length - 4}
                                </span>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={trackClass}>
          {sortedColumns.map((col) => {
            const colCards = getVisibleCardsForColumn(filteredDisplayCards, col.id)

            const overWip = col.wipLimit != null && col.wipLimit > 0 && colCards.length > col.wipLimit
            const isDone = isDoneColumnUtil(col)
            const completedArchiveCount = isDone
              ? getCompletedArchiveTargets(cards, col.id).length
              : 0

            return (
              <ColumnDropZone
                key={col.id}
                id={col.id}
                className={`${columnSizingClass} rounded-xl border ${isDone ? 'border-success/40' : 'border-border'} bg-surface-light shadow-lg shadow-black/25 transition-shadow duration-200 hover:shadow-xl hover:shadow-black/35 animate-slide-up`}
              >
                {/* Column header (also drop target) */}
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  {editingColumnId === col.id ? (
                    <div className="flex w-full items-center gap-1">
                      <input
                        autoFocus
                        value={columnDraft.name}
                        onChange={(e) => setColumnDraft((d) => ({ ...d, name: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditColumn()
                          if (e.key === 'Escape') cancelEditColumn()
                        }}
                        placeholder="Nombre"
                        className="flex-1 rounded border border-border bg-surface px-2 py-1 text-sm focus:border-accent/60 focus:outline-none"
                      />
                      <input
                        type="number"
                        min={0}
                        value={columnDraft.wipLimit}
                        onChange={(e) => setColumnDraft((d) => ({ ...d, wipLimit: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditColumn()
                          if (e.key === 'Escape') cancelEditColumn()
                        }}
                        placeholder="WIP"
                        className="w-14 rounded border border-border bg-surface px-2 py-1 text-xs focus:border-accent/60 focus:outline-none"
                      />
                      <button
                        onClick={saveEditColumn}
                        title="Guardar"
                        className="rounded bg-accent/20 px-2 py-1 text-xs text-accent-light hover:bg-accent/30"
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelEditColumn}
                        title="Cancelar"
                        className="rounded px-2 py-1 text-xs text-muted hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`h-2 w-2 rounded-full ${isDone ? 'bg-success/80 shadow-[0_0_6px_1px_rgba(34,197,94,0.45)]' : 'bg-accent/70 shadow-[0_0_6px_1px_rgba(249,115,22,0.42)]'}`} />
                        <h4 className="text-sm font-semibold truncate">{col.name}</h4>
                        {isDone && (
                          <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wide text-success" title="Columna marcada como Completada">
                            Done
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => startEditColumn(col)}
                          title="Editar columna"
                          className="text-muted/40 hover:text-accent-light transition-colors"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleDoneColumn(col)}
                          title={isDone ? 'Esta es la columna Completada' : 'Marcar como columna Completada'}
                          className={`transition-colors ${isDone ? 'text-success' : 'text-muted/40 hover:text-success'}`}
                        >
                          <CheckCircle2 size={12} />
                        </button>
                        {isDone && (
                          <button
                            type="button"
                            onClick={() => { void handleArchiveCompleted(col.id) }}
                            title="Archivar todas las cards completadas de esta columna"
                            aria-label={`Archivar completadas de ${col.name}`}
                            className="text-muted/40 transition-colors hover:text-accent-light disabled:cursor-not-allowed disabled:opacity-30"
                            disabled={completedArchiveCount === 0}
                          >
                            <Archive size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { void handleSortColumnByPriority(col.id) }}
                          title="Ordenar tareas por prioridad"
                          aria-label={`Ordenar ${col.name} por prioridad`}
                          className="text-muted/40 transition-colors hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-30"
                          disabled={colCards.length < 2}
                        >
                          <Flag size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteColumn(col)}
                          title="Eliminar columna"
                          className="text-muted/40 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                          overWip ? 'bg-red-500/20 text-red-300' : 'bg-surface text-muted'
                        }`}
                        title={col.wipLimit ? `Límite WIP: ${col.wipLimit}` : undefined}
                      >
                        {colCards.length}
                        {col.wipLimit ? ` / ${col.wipLimit}` : ''}
                      </span>
                    </>
                  )}
                </div>

                {isDone && completedArchiveCount > 0 && editingColumnId !== col.id && (
                  <div className="border-b border-border/50 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => { void handleArchiveCompleted(col.id) }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-1.5 text-caption font-medium text-success transition-colors hover:bg-success/15"
                    >
                      <Archive size={13} />
                      Archivar completadas ({completedArchiveCount})
                    </button>
                  </div>
                )}

                {/* Cards */}
                <SortableContext items={colCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="work-kanban-card-list min-h-0 flex-1 space-y-2 overflow-y-auto p-2" id={col.id}>
                    {colCards.map((card) => (
                      <SortableCard
                        key={card.id}
                        card={card}
                        focusSessionCount={focusCountByTask.get(card.id) ?? 0}
                        onDelete={handleDeleteCard}
                        onOpen={setSelectedCard}
                        onStartFocus={(selected) => startWorkFocusSession(selected.id)}
                        onStopFocus={() => { void stopWorkTask(card.id) }}
                        onComplete={isInProgressColumn(col.id) ? (selected) => completeWorkTask(selected.id) : undefined}
                        isFocusActive={currentFocusSession?.taskId === card.id}
                        dragDisabled={Boolean(tagFilter)}
                        activeTag={tagFilter}
                      />
                    ))}

                    {colCards.length === 0 && (
                      <div className="flex h-full min-h-[180px] items-center justify-center rounded-lg border border-dashed border-border/40 text-xs text-muted/50">
                        Sin tareas
                      </div>
                    )}
                  </div>
                </SortableContext>

                {/* New card input */}
                <div className="border-t border-border/50 p-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nueva tarea..."
                      value={newCardTitle[col.id] || ''}
                      onChange={(e) =>
                        setNewCardTitle((prev) => ({ ...prev, [col.id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCard(col.id)}
                      className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1.5 text-sm placeholder:text-muted/50 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />
                    <button
                      onClick={() => handleAddCard(col.id)}
                      className="flex-shrink-0 rounded bg-accent/20 px-2.5 py-1.5 text-sm font-bold text-accent-light transition-colors hover:bg-accent/35 active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>
              </ColumnDropZone>
            )
          })}

          {/* Botón / formulario para añadir nueva columna (placeholder angosto, no compite por ancho) */}
          <div className="flex-shrink-0 w-44 rounded-xl border border-dashed border-border/60 bg-surface/40 p-2 self-start">
            {creatingColumn ? (
              <div className="flex flex-col gap-2 p-2">
                <input
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleAddColumn()
                    if (e.key === 'Escape') {
                      setCreatingColumn(false)
                      setNewColumnName('')
                    }
                  }}
                  placeholder="Nombre de la columna"
                  className="rounded border border-border bg-surface px-2 py-1.5 text-sm focus:border-accent/60 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleAddColumn()}
                    className="flex-1 rounded bg-accent/20 px-2 py-1.5 text-xs font-semibold text-accent-light hover:bg-accent/30"
                  >
                    Crear
                  </button>
                  <button
                    onClick={() => {
                      setCreatingColumn(false)
                      setNewColumnName('')
                    }}
                    className="rounded px-2 py-1.5 text-xs text-muted hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreatingColumn(true)}
                className="flex h-full min-h-[120px] w-full items-center justify-center gap-2 rounded-lg text-sm text-muted/70 transition-colors hover:bg-surface hover:text-white"
              >
                <Plus size={14} /> Nueva columna
              </button>
            )}
          </div>
        </div>

        {/* Drag overlay (ghost card) — portalado a body para escapar a ancestros transformados */}
        {createPortal(
          <DragOverlay
            dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}
            style={{ pointerEvents: 'none' }}
          >
            {activeCard && (
              <div className="rounded-lg border border-accent/40 bg-surface p-3 shadow-2xl shadow-black/50 opacity-95 rotate-1 scale-105 cursor-grabbing">
                <p className="text-sm leading-snug">{activeCard.title}</p>
              </div>
            )}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>

      {/* Card detail modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </>
  )
}
