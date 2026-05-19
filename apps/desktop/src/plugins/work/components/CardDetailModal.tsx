import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Card, CardPriority, ChecklistItem } from '../types'
import { useWorkStore } from '../store'
import { eventBus } from '@core/events/EventBus'
import { WORK_EVENTS } from '../events'
import {
  completeWorkFocusSession,
  interruptWorkFocusSession,
  pauseWorkFocusSession,
  resumeWorkFocusSession,
  startWorkFocusSession,
} from '../focus'
import { GlobalTagPicker, type TagSelection } from '@core/ui/components/GlobalTagPicker'
import { TAG_ENTITY_TYPES, tagsService } from '@core/services/tagsService'

interface Props {
  card: Card
  onClose: () => void
}

const PRIORITIES: Array<{ value: CardPriority; label: string; className: string }> = [
  { value: 'low', label: 'Baja', className: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  { value: 'medium', label: 'Media', className: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  { value: 'high', label: 'Alta', className: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { value: 'urgent', label: 'Urgente', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
]

export function CardDetailModal({ card, onClose }: Props) {
  const { updateCard, deleteCard, currentFocusSession } = useWorkStore()
  const [title, setTitle] = useState(card.title)
  const [content, setContent] = useState(card.content ?? '')
  const [description, setDescription] = useState(card.description ?? '')
  const [priority, setPriority] = useState<CardPriority | null>(card.priority ?? null)
  const [estimateMinutes, setEstimateMinutes] = useState<number | null>(card.estimateMinutes ?? null)
  const [dueDate, setDueDate] = useState<string | null>(card.dueDate ?? null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist ?? [])
  const [selectedTags, setSelectedTags] = useState<TagSelection[]>([])
  const [newChecklistText, setNewChecklistText] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const isActiveFocusTask = currentFocusSession?.taskId === card.id

  useEffect(() => {
    let cancelled = false
    async function loadTags() {
      let tags = await tagsService.forEntity(TAG_ENTITY_TYPES.WORK_CARD, card.id)
      if (tags.length === 0 && (card.labels ?? []).length > 0) {
        const ensured = await Promise.all(card.labels.map((tag) => tagsService.ensure(tag)))
        await tagsService.setForEntity(TAG_ENTITY_TYPES.WORK_CARD, card.id, ensured.map((tag) => tag.id))
        tags = ensured
      }
      if (!cancelled) setSelectedTags(tags)
    }
    void loadTags().catch(() => {
      if (!cancelled) setSelectedTags([])
    })
    return () => {
      cancelled = true
    }
  }, [card.id, card.labels])

  // Close on ESC
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const save = async () => {
    if (saving || !title.trim()) return
    setSaving(true)
    const patch = {
      title,
      content,
      description,
      labels: selectedTags.map((tag) => tag.name),
      priority,
      estimateMinutes,
      dueDate,
      checklist,
    }
    updateCard(card.id, patch)
    if (window.storage) {
      await window.storage.execute(
        `UPDATE work_cards
         SET title = ?, description = ?, content = ?, labels = ?, priority = ?, estimate_minutes = ?, due_date = ?, checklist = ?
         WHERE id = ?`,
        [
          title,
          description,
          content,
          JSON.stringify(selectedTags.map((tag) => tag.name)),
          priority,
          estimateMinutes,
          dueDate,
          JSON.stringify(checklist),
          card.id,
        ],
      )
    }
    await tagsService.setForEntity(TAG_ENTITY_TYPES.WORK_CARD, card.id, selectedTags.map((tag) => tag.id))
    eventBus.emit(WORK_EVENTS.TASK_UPDATED, { taskId: card.id, title, description })
    setSaving(false)
    onClose()
  }

  const saveOnEnter = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    void save()
  }

  const addChecklistItem = () => {
    const text = newChecklistText.trim()
    if (!text) return
    setChecklist((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }])
    setNewChecklistText('')
  }

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))
  }

  const removeChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((i) => i.id !== id))
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      window.setTimeout(() => setConfirmDelete(false), 3000)
      return
    }

    if (isActiveFocusTask) {
      await interruptWorkFocusSession()
    }

    deleteCard(card.id)
    if (window.storage) {
      await window.storage.execute(`DELETE FROM work_cards WHERE id = ?`, [card.id])
    }
    await tagsService.unlinkEntity(TAG_ENTITY_TYPES.WORK_CARD, card.id)
    eventBus.emit(WORK_EVENTS.TASK_DELETED, { taskId: card.id, title: card.title })
    onClose()
  }

  // Renderizamos en un portal sobre `document.body` para evitar que un
  // contexto de stacking de un ancestro (transform/filter/will-change/etc.)
  // recorte o solape al modal con elementos hermanos posicionados.
  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Detalle de tarea"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="text-xs uppercase tracking-widest text-muted">Detalle de tarea</span>
          <button
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="rounded-lg p-1.5 text-muted hover:bg-surface-light hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs text-muted block mb-1.5">Título</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={saveOnEnter}
              className="w-full rounded-xl border border-border bg-surface-light/60 px-4 py-2.5 text-sm font-medium text-white placeholder:text-muted/40 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted block mb-1.5">Descripción breve</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={saveOnEnter}
              placeholder="Descripción opcional..."
              className="w-full rounded-xl border border-border bg-surface-light/60 px-4 py-2.5 text-sm text-white/80 placeholder:text-muted/40 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20"
            />
          </div>

          {/* Priority + estimate + due date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted block mb-1.5">Prioridad</label>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setPriority(null)}
                  className={`rounded-full border px-2 py-1 text-caption ${
                    priority == null
                      ? 'border-accent/40 text-accent-light bg-accent/10'
                      : 'border-border/70 text-muted hover:text-white'
                  }`}
                >
                  —
                </button>
                {PRIORITIES.map((p) => (
                  <button
                    type="button"
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={`rounded-full border px-2 py-1 text-caption ${
                      priority === p.value
                        ? p.className
                        : 'border-border/70 text-muted hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">Estimación (min)</label>
              <input
                type="number"
                min={0}
                step={5}
                value={estimateMinutes ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setEstimateMinutes(v === '' ? null : Math.max(0, Number(v)))
                }}
                onKeyDown={saveOnEnter}
                placeholder="e.g. 30"
                className="w-full rounded-xl border border-border bg-surface-light/60 px-3 py-2 text-sm text-white/80 placeholder:text-muted/40 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">Vencimiento</label>
              <div className="flex gap-1">
                <input
                  type="date"
                  value={dueDate ?? ''}
                  onChange={(e) => setDueDate(e.target.value || null)}
                  onKeyDown={saveOnEnter}
                  className="flex-1 rounded-xl border border-border bg-surface-light/60 px-3 py-2 text-sm text-white/80 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate(null)}
                    title="Quitar vencimiento"
                    className="rounded-xl border border-border px-2 text-xs text-muted hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="rounded-xl border border-border bg-surface-light/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-[0.16em] text-muted">Checklist</label>
              {checklist.length > 0 && (
                <span className="text-micro text-muted">
                  {checklist.filter((i) => i.done).length} / {checklist.length}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="accent-accent"
                  />
                  <span className={`flex-1 text-sm ${item.done ? 'text-muted line-through' : 'text-white/90'}`}>
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(item.id)}
                    className="text-micro text-muted opacity-0 group-hover:opacity-100 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                placeholder="Agregar ítem..."
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-muted/40 focus:border-accent/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={addChecklistItem}
                disabled={!newChecklistText.trim()}
                className="rounded-lg bg-accent/20 px-3 py-1.5 text-sm text-accent-light hover:bg-accent/30 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <GlobalTagPicker
            selected={selectedTags}
            onChange={setSelectedTags}
            label="Tags globales"
            placeholder="Buscar o crear tag para esta tarea"
          />

          <div className="rounded-xl border border-border bg-surface-light/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Focus Engine</p>
                <p className="mt-1 text-sm text-white/90">
                  {isActiveFocusTask
                    ? currentFocusSession?.pausedAt
                      ? 'Sesión pausada para esta tarea.'
                      : 'Esta tarea está en sesión activa.'
                    : 'Convertí esta tarea en el foco actual.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!isActiveFocusTask && (
                  <button
                    onClick={() => startWorkFocusSession(card.id)}
                    className="rounded-xl border border-accent/30 px-3 py-2 text-xs text-accent-light transition-colors hover:bg-accent/10"
                  >
                    Start Focus
                  </button>
                )}
                {isActiveFocusTask && currentFocusSession?.pausedAt && (
                  <button
                    onClick={() => resumeWorkFocusSession()}
                    className="rounded-xl border border-accent/30 px-3 py-2 text-xs text-accent-light transition-colors hover:bg-accent/10"
                  >
                    Resume
                  </button>
                )}
                {isActiveFocusTask && !currentFocusSession?.pausedAt && (
                  <button
                    onClick={() => pauseWorkFocusSession()}
                    className="rounded-xl border border-warning/30 px-3 py-2 text-xs text-warning transition-colors hover:bg-warning/10"
                  >
                    Pause
                  </button>
                )}
                <button
                  onClick={() => completeWorkFocusSession()}
                  disabled={!isActiveFocusTask}
                  title="Finalizar la sesión"
                  className="rounded-xl border border-success/30 px-3 py-2 text-xs text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Stop
                </button>
                <button
                  onClick={() => interruptWorkFocusSession()}
                  disabled={!isActiveFocusTask}
                  title="Abandonar la sesión (cuenta como interrumpida)"
                  className="rounded-xl border border-danger/30 px-3 py-2 text-xs text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* Content (rich text area) */}
          <div>
            <label className="text-xs text-muted block mb-1.5">Notas / Contenido</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribí los detalles, pasos, ideas..."
              rows={8}
              className="w-full rounded-xl border border-border bg-surface-light/60 px-4 py-3 text-sm text-white/80 placeholder:text-muted/40 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <button
            onClick={handleDelete}
            className={`rounded-lg px-3 py-2 text-xs transition-colors ${
              confirmDelete
                ? 'bg-danger/20 text-danger hover:bg-danger/30'
                : 'text-danger/80 hover:bg-danger/10 hover:text-danger'
            }`}
          >
            {confirmDelete ? '¿Confirmar eliminación?' : 'Eliminar tarea'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-white hover:border-border/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving || !title.trim()}
              className="rounded-xl bg-accent hover:bg-accent/80 disabled:opacity-50 active:scale-95 transition-all px-5 py-2 text-sm font-medium text-white"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
