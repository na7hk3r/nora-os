import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../types'
import { CalendarClock, CheckCircle2, CheckSquare, FileText, Flag, Pause, Play, Target, Timer } from 'lucide-react'
import { GlobalTagChip } from '@core/ui/components/GlobalTagPicker'
import { useI18n, type AppLanguage } from '@core/i18n'

interface Props {
  card: Card
  focusSessionCount?: number
  onDelete: (id: string) => void
  onOpen: (card: Card) => void
  onStartFocus: (card: Card) => void
  onStopFocus: () => void
  onComplete?: (card: Card) => void
  isFocusActive: boolean
  dragDisabled?: boolean
  activeTag?: string | null
}

const PRIORITY_STYLES: Record<NonNullable<Card['priority']>, { label: string; chipClass: string; cardClass: string }> = {
  urgent: {
    label: 'Urgente',
    chipClass: 'bg-red-500/20 text-red-300 border-red-500/30',
    cardClass: 'border-l-red-400 bg-red-500/[0.07] shadow-[inset_2px_0_0_0_rgba(248,113,113,0.18)]',
  },
  high: {
    label: 'Alta',
    chipClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    cardClass: 'border-l-orange-400 bg-orange-500/[0.06] shadow-[inset_2px_0_0_0_rgba(251,146,60,0.16)]',
  },
  medium: {
    label: 'Media',
    chipClass: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
    cardClass: 'border-l-yellow-300 bg-yellow-500/[0.045] shadow-[inset_2px_0_0_0_rgba(253,224,71,0.12)]',
  },
  low: {
    label: 'Baja',
    chipClass: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
    cardClass: 'border-l-sky-400 bg-sky-500/[0.045] shadow-[inset_2px_0_0_0_rgba(56,189,248,0.12)]',
  },
}

const LABEL_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#f59e0b', '#fb7185', '#2dd4bf', '#f472b6', '#84cc16']

function colorForLabel(label: string): string {
  let hash = 0
  for (let index = 0; index < label.length; index += 1) {
    hash = (hash * 31 + label.charCodeAt(index)) >>> 0
  }
  return LABEL_COLORS[hash % LABEL_COLORS.length]
}

function formatEstimate(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatDueDate(
  iso: string,
  language: AppLanguage,
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string,
): { label: string; overdue: boolean } {
  const dueMs = new Date(iso).getTime()
  if (Number.isNaN(dueMs)) return { label: iso, overdue: false }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueMs)
  due.setHours(0, 0, 0, 0)

  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  const overdue = diffDays < 0

  let label: string
  if (diffDays === 0) label = language === 'en' ? 'Today' : 'Hoy'
  else if (diffDays === 1) label = language === 'en' ? 'Tomorrow' : 'Mañana'
  else if (diffDays === -1) label = language === 'en' ? 'Yesterday' : 'Ayer'
  else if (diffDays > 1 && diffDays <= 6) label = language === 'en' ? `In ${diffDays}d` : `En ${diffDays}d`
  else if (diffDays < -1 && diffDays >= -6) label = language === 'en' ? `${-diffDays}d ago` : `Hace ${-diffDays}d`
  else label = formatDate(due, { day: '2-digit', month: 'short' })

  return { label, overdue }
}

export function SortableCard({
  card,
  focusSessionCount = 0,
  onDelete,
  onOpen,
  onStartFocus,
  onStopFocus,
  onComplete,
  isFocusActive,
  dragDisabled = false,
  activeTag = null,
}: Props) {
  const { language, formatDate } = useI18n()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', cardId: card.id, columnId: card.columnId },
    disabled: dragDisabled,
  })

  const [confirmDelete, setConfirmDelete] = useState(false)

  // Cuando esta tarjeta es la que se está arrastrando, NO aplicamos su propio
  // transform y la ocultamos completamente: la representa el <DragOverlay>.
  // De este modo el cursor coincide con la tarjeta visual durante el drag.
  const style: React.CSSProperties = isDragging
    ? {
        opacity: 0,
        // Reservamos su espacio sin transform para que los hermanos animen sólo a su sitio.
        transform: 'none',
        transition: 'none',
      }
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        cursor: dragDisabled ? 'default' : 'grab',
      }

  const due = card.dueDate ? formatDueDate(card.dueDate, language, formatDate) : null
  const visibleLabels = card.labels.slice(0, 3)
  const extraLabels = Math.max(0, card.labels.length - visibleLabels.length)
  const priorityStyle = card.priority ? PRIORITY_STYLES[card.priority] : null
  const checklistTotal = card.checklist?.length ?? 0
  const checklistDone = card.checklist?.filter((i) => i.done).length ?? 0

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete(card.id)
      return
    }
    setConfirmDelete(true)
    // Auto-reset tras 3s si no se confirma.
    window.setTimeout(() => setConfirmDelete(false), 3000)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group flex min-h-[116px] flex-col rounded-lg border border-l-4 border-border/50 bg-surface p-3 animate-fade-in select-none touch-none ${
        priorityStyle?.cardClass ?? 'border-l-border/60'
      }`}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('[data-delete], [data-focus]')) {
          onOpen(card)
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm leading-snug">{card.title}</p>
        <button
          data-delete="true"
          onClick={handleDeleteClick}
          title={confirmDelete ? 'Confirmar eliminación' : 'Eliminar tarea'}
          className={`mt-0.5 flex-shrink-0 rounded px-1 text-micro font-medium transition-all duration-150 ${
            confirmDelete
              ? 'bg-red-500/20 text-red-300 opacity-100'
              : 'text-muted opacity-0 group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-400'
          }`}
        >
          {confirmDelete ? '¿Eliminar?' : '✕'}
        </button>
      </div>

      {card.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted">{card.description}</p>
      )}

      {card.content && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted/60">
          <FileText size={12} />
          <span className="truncate">{card.content.slice(0, 40)}</span>
        </div>
      )}

      {(visibleLabels.length > 0 || due || focusSessionCount > 0 || priorityStyle || card.estimateMinutes || checklistTotal > 0) && (
        <div className="mt-2 flex max-h-[3.75rem] flex-wrap items-center gap-1 overflow-hidden">
          {priorityStyle && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-micro ${priorityStyle.chipClass}`}
              title={`Prioridad ${priorityStyle.label}`}
            >
              <Flag size={10} />
              {priorityStyle.label}
            </span>
          )}
          {card.estimateMinutes != null && card.estimateMinutes > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface-light/60 px-2 py-0.5 text-micro text-muted"
              title={`Estimación: ${formatEstimate(card.estimateMinutes)}`}
            >
              <Timer size={10} />
              {formatEstimate(card.estimateMinutes)}
            </span>
          )}
          {checklistTotal > 0 && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-micro ${
                checklistDone === checklistTotal
                  ? 'border-success/30 bg-success/15 text-success'
                  : 'border-border/70 bg-surface-light/60 text-muted'
              }`}
              title={`Checklist: ${checklistDone} de ${checklistTotal}`}
            >
              <CheckSquare size={10} />
              {checklistDone}/{checklistTotal}
            </span>
          )}
          {visibleLabels.map((label, index) => (
            <GlobalTagChip
              key={label}
              tag={{ name: label, color: colorForLabel(label) }}
              selected={activeTag?.toLowerCase() === label.toLowerCase()}
              title={index === 0 ? `Categoria visual: ${label}. Ver conexiones` : `Ver conexiones de ${label}`}
              className="px-2 py-0.5 text-micro"
            />
          ))}
          {extraLabels > 0 && (
            <span className="rounded-full border border-border/70 bg-surface-light/60 px-2 py-0.5 text-micro text-muted">
              +{extraLabels}
            </span>
          )}
          {due && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro ${
                due.overdue
                  ? 'bg-danger/15 text-danger'
                  : 'bg-surface-light/60 text-muted border border-border/70'
              }`}
            >
              <CalendarClock size={10} />
              {due.label}
            </span>
          )}
          {focusSessionCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-surface-light/60 px-2 py-0.5 text-micro text-muted border border-border/70"
              title={`${focusSessionCount} sesion${focusSessionCount === 1 ? '' : 'es'} de foco`}
            >
              <Target size={10} />
              {focusSessionCount}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <span className={`text-micro uppercase tracking-[0.16em] ${isFocusActive ? 'text-success' : 'text-muted/40'}`}>
          {isFocusActive ? 'En foco' : 'Listo para foco'}
        </span>
        <div className="flex items-center gap-1.5">
          {onComplete && (
            <button
              type="button"
              data-focus="true"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onComplete(card)
              }}
              title="Completar tarea (mueve a Hecho y detiene el foco)"
              className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-caption font-medium text-success transition-colors hover:bg-success/25"
            >
              <CheckCircle2 size={12} />
              Completar
            </button>
          )}
          <button
            type="button"
            data-focus="true"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              if (isFocusActive) {
                onStopFocus()
                return
              }
              onStartFocus(card)
            }}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-medium transition-colors ${
              isFocusActive
                ? 'bg-warning/15 text-warning hover:bg-warning/25'
                : 'bg-accent/15 text-accent-light hover:bg-accent/25'
            }`}
          >
            {isFocusActive ? <Pause size={12} /> : <Play size={12} />}
            {isFocusActive ? 'Pause' : 'Start Focus'}
          </button>
        </div>
      </div>
    </div>
  )
}
