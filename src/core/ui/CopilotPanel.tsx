import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ChevronRight,
  Eye,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import {
  copilotChatService,
  type CopilotAction,
  type CopilotMessage,
} from '@core/services/copilotChatService'
import { dailyBriefService, type DailyBrief } from '@core/services/dailyBriefService'
import { eventBus } from '@core/events/EventBus'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { PULSO_NORA_COMPANION_NAME, isRewardUnlocked } from '@core/gamification/pulsoNora'

interface CopilotPanelProps {
  collapsed: boolean
  onToggle: () => void
}

const QUICK_ACTIONS: { label: string; prompt: string; icon: typeof Sparkles }[] = [
  { label: '¿Qué estoy descuidando?', prompt: '¿Qué estoy descuidando últimamente según mis datos?', icon: Eye },
  { label: 'Arrancar foco', prompt: 'Quiero arrancar una sesión de foco ahora. Sugerime en qué.', icon: Zap },
  { label: 'Review rápido', prompt: 'Hacé un review rápido de cómo vengo hoy y qué priorizar.', icon: Target },
]

export function CopilotPanel({ collapsed, onToggle }: CopilotPanelProps) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<CopilotMessage[]>(() => copilotChatService.getMessages())
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [brief, setBrief] = useState<DailyBrief | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const initializedRef = useRef(false)

  // Suscripción al servicio de chat
  useEffect(() => {
    const unsubscribe = copilotChatService.subscribe(setMessages)
    return unsubscribe
  }, [])

  // Carga inicial: brief de hoy + saludo del copiloto (una sola vez por sesión)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    let cancelled = false
    void (async () => {
      const cached = await dailyBriefService.getCached()
      if (cancelled) return
      if (cached) {
        setBrief(cached)
        if (copilotChatService.getMessages().length === 0) {
          copilotChatService.pushSystem(cached.text, { contextHint: 'brief diario' })
        }
        return
      }
      setBriefLoading(true)
      try {
        const fresh = await dailyBriefService.generate()
        if (cancelled) return
        setBrief(fresh)
        if (copilotChatService.getMessages().length === 0) {
          copilotChatService.pushSystem(fresh.text, { contextHint: 'brief diario' })
        }
      } finally {
        if (!cancelled) setBriefLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, briefLoading])

  // Auto-clear del feedback de acción
  useEffect(() => {
    if (!actionFeedback) return
    const id = window.setTimeout(() => setActionFeedback(null), 4000)
    return () => window.clearTimeout(id)
  }, [actionFeedback])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setInput('')
    setSending(true)
    try {
      await copilotChatService.send(trimmed)
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(input)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  const refreshBrief = async () => {
    setBriefLoading(true)
    try {
      const fresh = await dailyBriefService.generate({ force: true })
      setBrief(fresh)
    } finally {
      setBriefLoading(false)
    }
  }

  const runAction = async (action: CopilotAction) => {
    try {
      const level = useGamificationStore.getState().level
      if (!isRewardUnlocked('copilot-actions', level)) {
        setActionFeedback(`${PULSO_NORA_COMPANION_NAME} desbloquea acciones ejecutables en nivel 6.`)
        return
      }
      if (action.kind === 'INICIAR_FOCO') {
        const mod = await import('@plugins/work/focus')
        await mod.startWorkFocusSession(null)
        eventBus.emit('COPILOT_ACTION_EXECUTED', { kind: action.kind })
        setActionFeedback('Sesión de foco iniciada.')
        navigate('/work')
        return
      }
      if (action.kind === 'CREAR_TAREA') {
        const title = (action.payload || '').trim()
        if (!title) {
          setActionFeedback('No se entendió el texto de la tarea.')
          return
        }
        await createPlannerTask(title)
        eventBus.emit('COPILOT_ACTION_EXECUTED', { kind: action.kind, title })
        setActionFeedback(`Tarea creada: "${title}".`)
        navigate('/planner')
        return
      }
      if (action.kind === 'REGISTRAR_HABITO') {
        const hint = (action.payload || '').trim()
        eventBus.emit('HABITS_CHECKIN_REQUESTED', { hint })
        setActionFeedback(hint ? `Abrí Hábitos para "${hint}".` : 'Abrí Hábitos para tu check-in.')
        navigate('/habits')
        return
      }
    } catch (err) {
      console.error('[CopilotPanel] action error', err)
      setActionFeedback(err instanceof Error ? err.message : 'No pude ejecutar la acción.')
    }
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="fixed right-2 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl border border-border bg-surface-light/90 px-2 py-3 text-muted shadow-lg transition-colors hover:border-accent/40 hover:text-accent-light"
        title="Abrir copiloto"
        aria-label="Abrir copiloto"
      >
        <Sparkles className="h-4 w-4 text-accent-light" />
        <span className="text-micro uppercase tracking-wide">Copiloto</span>
      </button>
    )
  }

  return (
    <aside
      className="flex h-screen w-[88vw] max-w-[360px] shrink-0 flex-col border-l border-border bg-surface-light/95 text-white backdrop-blur md:w-[320px] xl:w-[360px]"
      aria-label="Copiloto IA"
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-accent-light" />
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold">Copiloto</div>
            <div className="truncate text-[10px] uppercase tracking-eyebrow text-muted">
              {brief?.source === 'fallback' ? 'sin IA · datos locales' : 'asistente del día'}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void refreshBrief()}
            disabled={briefLoading}
            className="rounded-md p-1.5 text-muted hover:text-accent-light hover:bg-surface disabled:opacity-50"
            title="Regenerar brief de hoy"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${briefLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md p-1.5 text-muted hover:text-accent-light hover:bg-surface"
            title="Colapsar copiloto"
            aria-label="Colapsar copiloto"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-2.5">
        {messages.length === 0 && !briefLoading && (
          <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border/70 p-3 text-[11px] text-muted">
            <MessageSquare className="h-3.5 w-3.5 text-muted" />
            Preguntale a tu copiloto sobre tu día, tus rachas o qué priorizar.
          </div>
        )}
        {briefLoading && messages.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface/60 p-3 text-[11px] text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-light" />
            Preparando el brief de hoy…
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onRunAction={runAction} />
        ))}
        {actionFeedback && (
          <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[11px] text-accent-light break-words">
            {actionFeedback}
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="border-t border-border px-3 py-2">
        <div className="mb-1.5 text-[10px] uppercase tracking-eyebrow text-muted">Acciones rápidas</div>
        <div className="flex flex-wrap gap-1">
          {QUICK_ACTIONS.map(({ label, prompt, icon: Icon }) => (
            <button
              key={label}
              type="button"
              disabled={sending}
              onClick={() => void send(prompt)}
              title={prompt}
              className="flex items-center gap-1 rounded-full border border-border/70 bg-surface px-2 py-0.5 text-[10px] text-muted transition-colors hover:border-accent/40 hover:text-accent-light disabled:opacity-50"
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border px-3 py-3">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 focus-within:border-accent/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Escribí algo… (Enter envía, Shift+Enter salto)"
            className="min-w-0 flex-1 resize-none bg-transparent text-xs text-white placeholder:text-muted focus:outline-none"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-md bg-accent/80 p-1.5 text-white transition-colors hover:bg-accent disabled:opacity-50"
            title="Enviar"
            aria-label="Enviar mensaje"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </form>
    </aside>
  )
}

function MessageBubble({
  message,
  onRunAction,
}: {
  message: CopilotMessage
  onRunAction: (action: CopilotAction) => void
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] break-words rounded-2xl rounded-tr-sm bg-accent/20 px-3 py-2 text-xs text-white">
          {message.text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="max-w-[92%] break-words rounded-2xl rounded-tl-sm border border-border/70 bg-surface/80 px-3 py-2 text-xs leading-relaxed text-white">
        {message.pending ? (
          <span className="inline-flex items-center gap-2 text-muted">
            <Loader2 className="h-3 w-3 animate-spin" />
            Pensando con tus datos…
          </span>
        ) : message.error ? (
          <span className="inline-flex items-center gap-2 text-danger">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span className="break-words">{message.error}</span>
          </span>
        ) : (
          <span className="whitespace-pre-wrap break-words">{message.text}</span>
        )}
        {message.contextHint && !message.pending && !message.error && (
          <div className="mt-1.5 truncate text-[10px] uppercase tracking-eyebrow text-muted/80">
            ctx: {message.contextHint}
          </div>
        )}
      </div>
      {message.action && !message.pending && !message.error && (
        <button
          type="button"
          onClick={() => onRunAction(message.action!)}
          className="self-start rounded-md border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-[11px] font-medium text-accent-light transition-colors hover:bg-accent/25"
        >
          {actionLabel(message.action)}
        </button>
      )}
    </div>
  )
}

function actionLabel(action: CopilotAction): string {
  if (action.kind === 'INICIAR_FOCO') return '▶ Iniciar foco'
  if (action.kind === 'CREAR_TAREA') return `＋ Crear tarea${action.payload ? `: ${action.payload}` : ''}`
  if (action.kind === 'REGISTRAR_HABITO') return `✓ Registrar hábito${action.payload ? `: ${action.payload}` : ''}`
  return 'Ejecutar acción'
}

interface PlannerTaskRecord {
  id: string
  title: string
  category: 'domestica' | 'recordatorio' | 'trabajo' | 'personal'
  complexity: 'baja' | 'media' | 'alta'
  date: string
  note?: string
  completed: boolean
  createdAt: string
}

const PLANNER_STORAGE_KEY = 'corePlannerTasksV1'

async function createPlannerTask(title: string): Promise<void> {
  if (!window.storage) throw new Error('Storage no disponible')
  const rows = await window.storage.query(
    'SELECT value FROM settings WHERE key = ? LIMIT 1',
    [PLANNER_STORAGE_KEY],
  ) as { value: string }[]
  let tasks: PlannerTaskRecord[] = []
  if (rows[0]?.value) {
    try {
      const parsed = JSON.parse(rows[0].value) as unknown
      if (Array.isArray(parsed)) tasks = parsed as PlannerTaskRecord[]
    } catch {
      tasks = []
    }
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isoDate = today.toISOString().slice(0, 10)
  const newTask: PlannerTaskRecord = {
    id: `copilot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: title.slice(0, 200),
    category: 'personal',
    complexity: 'media',
    date: isoDate,
    completed: false,
    createdAt: new Date().toISOString(),
    note: 'Creada por el copiloto',
  }
  const next = [...tasks, newTask]
  await window.storage.execute(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [PLANNER_STORAGE_KEY, JSON.stringify(next)],
  )
  eventBus.emit('CORE_PLANNER_TASK_CREATED', { id: newTask.id, title: newTask.title, date: newTask.date })
}
