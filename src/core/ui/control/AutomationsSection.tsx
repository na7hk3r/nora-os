import { useEffect, useMemo, useState } from 'react'
import { Edit3, Plus, Power, Trash2, Zap } from 'lucide-react'
import { useI18n } from '@core/i18n'
import { automationsService, type ActionType, type Automation, type AutomationDraft } from '@core/services/automationsService'
import { CORE_EVENTS } from '@core/events/events'

type AutomationMode = 'simple' | 'advanced'
type SimpleActionType = 'notify' | 'add_xp' | 'emit_event'

interface AutomationRecipe {
  id: string
  label: string
  description: string
  triggerEvent: string
}

const ACTION_TYPES: ActionType[] = ['notify', 'add_xp', 'emit_event', 'log']
const SIMPLE_ACTIONS: SimpleActionType[] = ['notify', 'add_xp', 'emit_event']

const RECIPES: AutomationRecipe[] = [
  {
    id: 'focus-completed',
    label: 'Cuando completo una sesion de foco',
    description: 'Ideal para celebrar avances o sumar XP extra.',
    triggerEvent: 'WORK_FOCUS_COMPLETED',
  },
  {
    id: 'work-task-completed',
    label: 'Cuando completo una tarea de Work',
    description: 'Reacciona cuando una tarjeta pasa a completada.',
    triggerEvent: 'WORK_TASK_COMPLETED',
  },
  {
    id: 'planner-task-completed',
    label: 'Cuando completo una tarea del Planner',
    description: 'Conecta misiones diarias con avisos o recompensas.',
    triggerEvent: CORE_EVENTS.PLANNER_TASK_COMPLETED,
  },
  {
    id: 'fitness-day-logged',
    label: 'Cuando registro mi dia de fitness',
    description: 'Sirve para recordatorios de continuidad.',
    triggerEvent: 'FITNESS_DAY_LOGGED',
  },
  {
    id: 'profile-updated',
    label: 'Cuando actualizo mi perfil',
    description: 'Util para confirmar cambios importantes.',
    triggerEvent: CORE_EVENTS.PROFILE_UPDATED,
  },
]

const RECIPES_EN: AutomationRecipe[] = [
  {
    id: 'focus-completed',
    label: 'When I complete a focus session',
    description: 'Ideal for celebrating progress or adding extra XP.',
    triggerEvent: 'WORK_FOCUS_COMPLETED',
  },
  {
    id: 'work-task-completed',
    label: 'When I complete a Work task',
    description: 'Reacts when a card is marked completed.',
    triggerEvent: 'WORK_TASK_COMPLETED',
  },
  {
    id: 'planner-task-completed',
    label: 'When I complete a Planner task',
    description: 'Connects daily missions with alerts or rewards.',
    triggerEvent: CORE_EVENTS.PLANNER_TASK_COMPLETED,
  },
  {
    id: 'fitness-day-logged',
    label: 'When I log my fitness day',
    description: 'Useful for continuity reminders.',
    triggerEvent: 'FITNESS_DAY_LOGGED',
  },
  {
    id: 'profile-updated',
    label: 'When I update my profile',
    description: 'Useful for confirming important changes.',
    triggerEvent: CORE_EVENTS.PROFILE_UPDATED,
  },
]

const KNOWN_EVENTS: string[] = Array.from(new Set([
  ...Object.values(CORE_EVENTS),
  ...RECIPES.map((recipe) => recipe.triggerEvent),
  'WORK_TASK_COMPLETED',
  'TASK_COMPLETED',
  'WORK_FOCUS_STARTED',
  'WORK_FOCUS_COMPLETED',
  'FITNESS_DAY_LOGGED',
  'FITNESS_WORKOUT_COMPLETED',
])).sort()

function parsePayload(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

function defaultPayload(actionType: ActionType, language: 'es' | 'en' = 'es'): string {
  if (language === 'en') {
    switch (actionType) {
      case 'notify': return '{"title":"Reminder","body":"Nora detected the event."}'
      case 'add_xp': return '{"amount":25,"reason":"automation"}'
      case 'emit_event': return '{"event":"CUSTOM_EVENT","payload":{}}'
      case 'log': return '{"message":"check"}'
    }
  }

  switch (actionType) {
    case 'notify': return '{"title":"Recordatorio","body":"Nora detecto el evento."}'
    case 'add_xp': return '{"amount":25,"reason":"automation"}'
    case 'emit_event': return '{"event":"CUSTOM_EVENT","payload":{}}'
    case 'log': return '{"message":"check"}'
  }
}

export function AutomationsSection() {
  const { language } = useI18n()
  const [items, setItems] = useState<Automation[]>([])
  const [mode, setMode] = useState<AutomationMode>('simple')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const [simpleName, setSimpleName] = useState('')
  const [recipeId, setRecipeId] = useState(RECIPES[0]?.id ?? '')
  const [simpleAction, setSimpleAction] = useState<SimpleActionType>('notify')
  const [notifyTitle, setNotifyTitle] = useState('Nora OS')
  const [notifyBody, setNotifyBody] = useState(() => language === 'en' ? 'Automation executed.' : 'Automatizacion ejecutada.')
  const [xpAmount, setXpAmount] = useState(25)
  const [xpReason, setXpReason] = useState(() => language === 'en' ? 'Automation' : 'Automatizacion')
  const [customEvent, setCustomEvent] = useState('CUSTOM_EVENT')

  const [name, setName] = useState('')
  const [triggerEvent, setTriggerEvent] = useState(KNOWN_EVENTS[0] ?? CORE_EVENTS.PROFILE_UPDATED)
  const [condition, setCondition] = useState('')
  const [actionType, setActionType] = useState<ActionType>('notify')
  const [actionPayloadStr, setActionPayloadStr] = useState(() => defaultPayload('notify', language))

  const recipes = language === 'en' ? RECIPES_EN : RECIPES
  const selectedRecipe = recipes.find((recipe) => recipe.id === recipeId) ?? recipes[0]

  const refresh = () => { void automationsService.list().then(setItems) }
  useEffect(() => { refresh() }, [])

  const placeholder = useMemo(() => defaultPayload(actionType, language), [actionType, language])

  const resetForm = () => {
    setEditingId(null)
    setError('')
    setStatus('')
    setSimpleName('')
    setRecipeId(RECIPES[0]?.id ?? '')
    setSimpleAction('notify')
    setNotifyTitle('Nora OS')
    setNotifyBody(language === 'en' ? 'Automation executed.' : 'Automatizacion ejecutada.')
    setXpAmount(25)
    setXpReason(language === 'en' ? 'Automation' : 'Automatizacion')
    setCustomEvent('CUSTOM_EVENT')
    setName('')
    setTriggerEvent(KNOWN_EVENTS[0] ?? CORE_EVENTS.PROFILE_UPDATED)
    setCondition('')
    setActionType('notify')
    setActionPayloadStr(defaultPayload('notify', language))
  }

  const saveDraft = async (draft: AutomationDraft) => {
    const message = editingId == null
      ? language === 'en' ? 'Automation created.' : 'Automatizacion creada.'
      : language === 'en' ? 'Automation updated.' : 'Automatizacion actualizada.'
    if (editingId == null) {
      await automationsService.create(draft)
    } else {
      await automationsService.update(editingId, draft)
    }
    resetForm()
    setStatus(message)
    refresh()
  }

  const submitSimple = async () => {
    if (!selectedRecipe) return
    setError('')
    const title = simpleName.trim() || selectedRecipe.label
    let actionPayload: Record<string, unknown>
    if (simpleAction === 'notify') {
      actionPayload = { title: notifyTitle.trim() || title, body: notifyBody.trim() || undefined }
    } else if (simpleAction === 'add_xp') {
      actionPayload = { amount: xpAmount, reason: xpReason.trim() || title }
    } else {
      actionPayload = { event: customEvent.trim(), payload: {} }
    }

    try {
      await saveDraft({
        name: title,
        triggerEvent: selectedRecipe.triggerEvent,
        condition: null,
        actionType: simpleAction,
        actionPayload,
        enabled: true,
      })
    } catch (err) {
      setError(err instanceof Error
        ? err.message
        : language === 'en' ? 'Could not save the automation' : 'No se pudo guardar la automatizacion')
    }
  }

  const submitAdvanced = async () => {
    setError('')
    const parsed = parsePayload(actionPayloadStr)
    if (!parsed) {
      setError(language === 'en' ? 'The payload must be a valid JSON object.' : 'El payload debe ser un objeto JSON valido.')
      return
    }
    try {
      await saveDraft({
        name,
        triggerEvent,
        condition: condition.trim() || null,
        actionType,
        actionPayload: parsed,
        enabled: true,
      })
    } catch (err) {
      setError(err instanceof Error
        ? err.message
        : language === 'en' ? 'Could not save the automation' : 'No se pudo guardar la automatizacion')
    }
  }

  const editAutomation = (automation: Automation) => {
    const payload = parsePayload(automation.action_payload ?? '{}') ?? {}
    setEditingId(automation.id)
    setStatus('')
    setError('')
    setName(automation.name)
    setTriggerEvent(automation.trigger_event)
    setCondition(automation.condition ?? '')
    setActionType(automation.action_type as ActionType)
    setActionPayloadStr(JSON.stringify(payload, null, 2))

    const recipe = recipes.find((item) => item.triggerEvent === automation.trigger_event)
    if (recipe && SIMPLE_ACTIONS.includes(automation.action_type as SimpleActionType)) {
      setMode('simple')
      setRecipeId(recipe.id)
      setSimpleName(automation.name)
      setSimpleAction(automation.action_type as SimpleActionType)
      setNotifyTitle(String(payload.title ?? 'Nora OS'))
      setNotifyBody(String(payload.body ?? ''))
      setXpAmount(Number(payload.amount ?? 25))
      setXpReason(String(payload.reason ?? automation.name))
      setCustomEvent(String(payload.event ?? 'CUSTOM_EVENT'))
    } else {
      setMode('advanced')
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-surface-light/85 p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-accent-light" />
          <h2 className="text-lg font-semibold">{language === 'en' ? 'Automations' : 'Automatizaciones'}</h2>
        </div>
        {editingId != null && (
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:text-white"
          >
            {language === 'en' ? 'Cancel edit' : 'Cancelar edicion'}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        {language === 'en'
          ? 'Create rules with simple recipes or use advanced mode for events, conditions, and JSON payloads.'
          : 'Crea reglas con recetas simples o usa el modo avanzado para eventos, condiciones y payload JSON.'}
      </p>

      <div className="mt-4 inline-flex rounded-lg border border-border bg-surface p-1 text-xs">
        <button
          type="button"
          onClick={() => setMode('simple')}
          className={`rounded-md px-3 py-1.5 ${mode === 'simple' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
        >
          Simple
        </button>
        <button
          type="button"
          onClick={() => setMode('advanced')}
          className={`rounded-md px-3 py-1.5 ${mode === 'advanced' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
        >
          {language === 'en' ? 'Advanced' : 'Avanzado'}
        </button>
      </div>

      {mode === 'simple' ? (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface p-4">
          <label className="block space-y-1">
            <span className="text-xs text-muted">{language === 'en' ? 'Name' : 'Nombre'}</span>
            <input value={simpleName} onChange={(e) => setSimpleName(e.target.value)} className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm" placeholder={selectedRecipe?.label} />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted">{language === 'en' ? 'When this happens' : 'Cuando pase esto'}</span>
            <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)} className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm">
              {recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.label}</option>)}
            </select>
            {selectedRecipe && <p className="text-caption text-muted">{selectedRecipe.description}</p>}
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted">{language === 'en' ? 'Do' : 'Hacer'}</span>
            <select value={simpleAction} onChange={(e) => setSimpleAction(e.target.value as SimpleActionType)} className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm">
              <option value="notify">{language === 'en' ? 'Show a notification' : 'Mostrar una notificacion'}</option>
              <option value="add_xp">{language === 'en' ? 'Add XP' : 'Sumar XP'}</option>
              <option value="emit_event">{language === 'en' ? 'Emit custom event' : 'Emitir evento personalizado'}</option>
            </select>
          </label>

          {simpleAction === 'notify' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-muted">{language === 'en' ? 'Title' : 'Titulo'}</span>
                <input value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted">{language === 'en' ? 'Message' : 'Mensaje'}</span>
                <input value={notifyBody} onChange={(e) => setNotifyBody(e.target.value)} className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm" />
              </label>
            </div>
          )}

          {simpleAction === 'add_xp' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-muted">XP</span>
                <input type="number" value={xpAmount} onChange={(e) => setXpAmount(Number(e.target.value) || 0)} className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted">{language === 'en' ? 'Reason' : 'Motivo'}</span>
                <input value={xpReason} onChange={(e) => setXpReason(e.target.value)} className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm" />
              </label>
            </div>
          )}

          {simpleAction === 'emit_event' && (
            <label className="block space-y-1">
              <span className="text-xs text-muted">{language === 'en' ? 'Custom event' : 'Evento personalizado'}</span>
              <input value={customEvent} onChange={(e) => setCustomEvent(e.target.value.toUpperCase())} className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm" />
            </label>
          )}

          <button onClick={() => void submitSimple()} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85">
            <Plus size={12} /> {editingId == null
              ? language === 'en' ? 'Create automation' : 'Crear automatizacion'
              : language === 'en' ? 'Save changes' : 'Guardar cambios'}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface p-4">
          <label className="block space-y-1">
            <span className="text-xs text-muted">{language === 'en' ? 'Name' : 'Nombre'}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-muted">{language === 'en' ? 'Trigger event' : 'Evento trigger'}</span>
              <input list="known-events" value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm" />
              <datalist id="known-events">{KNOWN_EVENTS.map((ev) => <option key={ev} value={ev} />)}</datalist>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">{language === 'en' ? 'Action' : 'Accion'}</span>
              <select
                value={actionType}
                onChange={(e) => {
                  const next = e.target.value as ActionType
                  setActionType(next)
                  setActionPayloadStr(defaultPayload(next, language))
                }}
                className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
              >
                {ACTION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-muted">{language === 'en' ? 'Optional condition' : 'Condicion opcional'}</span>
            <input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Ej: amount > 10" className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Payload JSON</span>
            <textarea value={actionPayloadStr} onChange={(e) => setActionPayloadStr(e.target.value)} rows={4} placeholder={placeholder} className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 font-mono text-xs" />
          </label>
          <button onClick={() => void submitAdvanced()} className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85">
            {editingId == null
              ? language === 'en' ? 'Create advanced automation' : 'Crear automatizacion avanzada'
              : language === 'en' ? 'Save changes' : 'Guardar cambios'}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-warning">{error}</p>}
      {status && <p className="mt-2 text-xs text-success">{status}</p>}

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted">
            {language === 'en'
              ? 'No automations yet. Create the first one with simple mode.'
              : 'Aun no hay automatizaciones. Crea la primera con el modo simple.'}
          </p>
        ) : items.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{a.name}</p>
              <p className="truncate text-caption text-muted">
                {language === 'en'
                  ? `${a.trigger_event} -> ${a.action_type} - ran ${a.run_count}x`
                  : `${a.trigger_event} -> ${a.action_type} - ejecutada ${a.run_count}x`}
                {a.last_run_at && (language === 'en' ? ` - last ${a.last_run_at}` : ` - ultima ${a.last_run_at}`)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => editAutomation(a)}
                title={language === 'en' ? 'Edit' : 'Editar'}
                className="rounded p-1.5 text-muted hover:bg-surface-light hover:text-white"
              ><Edit3 size={14} /></button>
              <button
                onClick={() => void automationsService.toggle(a.id, !a.enabled).then(refresh)}
                title={a.enabled
                  ? language === 'en' ? 'Disable' : 'Desactivar'
                  : language === 'en' ? 'Enable' : 'Activar'}
                className={`rounded p-1.5 ${a.enabled ? 'text-emerald-300' : 'text-muted'} hover:bg-surface-light`}
              ><Power size={14} /></button>
              <button
                onClick={() => {
                  if (window.confirm(language === 'en' ? 'Delete automation?' : 'Eliminar automatizacion?')) {
                    void automationsService.remove(a.id).then(refresh)
                  }
                }}
                className="rounded p-1.5 text-muted hover:bg-surface-light hover:text-warning"
              ><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
