import { aiContextService, type UserContextSnapshot } from './aiContextService'
import { ollamaService } from './ollamaService'
import {
  PULSO_NORA_COMPANION_NAME,
  PULSO_NORA_SYSTEM_NAME,
  isRewardUnlocked,
} from '@core/gamification/pulsoNora'

export interface AISuggestion {
  id: string
  text: string
  generatedAt: string
  /** Resumen de que datos del usuario se usaron para auditar y dar transparencia */
  contextHint: string
}
const TASKS = {
  dailyCoach: {
    id: 'daily-coach',
    label: 'Coach diario',
    instruction:
      'Analiza los datos del usuario y responde en MAXIMO 3 oraciones: ' +
      'qué viene haciendo bien, qué señal de alerta hay y un único próximo paso accionable. ' +
      'No uses listas, no uses markdown, no uses emojis. Si no entrena hace varios días, motivá sin culpar.',
  },
  weeklyReview: {
    id: 'weekly-review',
    label: 'Review semanal IA',
    instruction:
      'Genera un review breve (max 6 lineas) de la ultima semana del usuario: ' +
      'wins, lo que falto, y una recomendacion concreta para la semana que arranca. ' +
      'Usa lenguaje directo, sin emojis ni markdown.',
  },
  focusNudge: {
    id: 'focus-nudge',
    label: 'Empujones de foco',
    instruction:
      'En 1-2 oraciones, dale al usuario un empujón motivacional para arrancar una sesión de foco AHORA, ' +
      'usando algun dato real reciente (foco semanal, tareas pendientes, racha). Sin emojis, sin markdown.',
  },
} as const

export type AISuggestionKind = keyof typeof TASKS

const FREE_CHAT_TASK_ID = 'free-chat'

const TASK_UNLOCKS: Partial<Record<AISuggestionKind, { rewardId: string; level: number }>> = {
  weeklyReview: { rewardId: 'weekly-review', level: 5 },
  focusNudge: { rewardId: 'focus-nudges', level: 4 },
}

function buildFreeChatInstruction(userMessage: string, snapshot: UserContextSnapshot): string {
  const safe = userMessage.replace(/"/g, '\\"').slice(0, 800)
  const canUseActions = isRewardUnlocked('copilot-actions', snapshot.gamification.level)
  const actionLines = canUseActions
    ? [
        'Si implicás una acción concreta, agregá AL FINAL una sola línea con uno de estos formatos exactos:',
        'ACCION: INICIAR_FOCO',
        'ACCION: CREAR_TAREA: <texto corto de la tarea>',
        'ACCION: REGISTRAR_HABITO: <id-o-nombre-del-habito>',
        'Si no hay acción clara, no agregues la línea ACCION.',
      ]
    : [
        `Pulso Nora todavia no desbloqueo acciones ejecutables. No agregues lineas ACCION; ese comportamiento se activa cuando ${PULSO_NORA_COMPANION_NAME} llega a nivel 6.`,
      ]

  return [
    `El usuario pregunta: "${safe}".`,
    'Responde en MAXIMO 4 oraciones usando sus datos reales del contexto.',
    `Tono: español rioplatense con vos, breve, como ${PULSO_NORA_SYSTEM_NAME}. Sin emojis, sin markdown, sin moralizar.`,
    `Respeta los desbloqueos activos de ${PULSO_NORA_COMPANION_NAME}. No prometas capacidades que aun no esten activas.`,
    ...actionLines,
  ].join('\n')
}

function buildPrompt(kind: AISuggestionKind, snapshot: UserContextSnapshot): string {
  const context = aiContextService.asPromptContext(snapshot)
  const { instruction } = TASKS[kind]
  return [
    'CONTEXTO REAL DEL USUARIO (datos de su Nora OS local):',
    context,
    '',
    `${PULSO_NORA_SYSTEM_NAME}: responde como una capacidad viva del sistema, vinculada a ${PULSO_NORA_COMPANION_NAME}.`,
    'Respeta los desbloqueos activos listados en el contexto.',
    '',
    'TAREA:',
    instruction,
  ].join('\n')
}

function summarizeContext(snapshot: UserContextSnapshot): string {
  const parts: string[] = []
  if (snapshot.fitness) parts.push(`fitness ${snapshot.fitness.daysWithDataLast7}/7 días`)
  if (snapshot.work) parts.push(`work ${snapshot.work.activeCards} activas`)
  if (snapshot.planner) parts.push(`planner ${snapshot.planner.pendingToday} pendientes hoy`)
  parts.push(`Nori L${snapshot.gamification.level}`)
  return parts.join(' - ')
}

function assertTaskUnlocked(kind: AISuggestionKind, snapshot: UserContextSnapshot): void {
  const gate = TASK_UNLOCKS[kind]
  if (!gate) return
  if (isRewardUnlocked(gate.rewardId, snapshot.gamification.level)) return
  throw new Error(`${TASKS[kind].label} se desbloquea cuando ${PULSO_NORA_COMPANION_NAME} llega a nivel ${gate.level}.`)
}

export const aiSuggestionsService = {
  async generate(kind: AISuggestionKind): Promise<AISuggestion> {
    const ready = await ollamaService.isReady()
    if (!ready.enabled) throw new Error('Ollama está deshabilitado en Configuración')
    if (!ready.healthy) throw new Error(`Ollama no responde: ${ready.reason ?? 'sin detalle'}`)
    const snapshot = await aiContextService.snapshot()
    assertTaskUnlocked(kind, snapshot)
    const prompt = buildPrompt(kind, snapshot)
    const text = await ollamaService.generate(prompt)
    return {
      id: `${kind}-${Date.now()}`,
      text: text.trim(),
      generatedAt: new Date().toISOString(),
      contextHint: summarizeContext(snapshot),
    }
  },

  /**
   * Conversacion libre con el copiloto. Usa el snapshot real del usuario y,
   * desde nivel 6, permite que la IA sugiera una acción ejecutable al final.
   */
  async freeChat(userMessage: string): Promise<AISuggestion> {
    const ready = await ollamaService.isReady()
    if (!ready.enabled) throw new Error('Ollama está deshabilitado en Configuración')
    if (!ready.healthy) throw new Error(`Ollama no responde: ${ready.reason ?? 'sin detalle'}`)
    const snapshot = await aiContextService.snapshot()
    const context = aiContextService.asPromptContext(snapshot)
    const prompt = [
      'CONTEXTO REAL DEL USUARIO (datos de su Nora OS local):',
      context,
      '',
      'TAREA:',
      buildFreeChatInstruction(userMessage, snapshot),
    ].join('\n')
    const text = await ollamaService.generate(prompt)
    return {
      id: `${FREE_CHAT_TASK_ID}-${Date.now()}`,
      text: text.trim(),
      generatedAt: new Date().toISOString(),
      contextHint: summarizeContext(snapshot),
    }
  },
}

export const __aiSuggestionInternals = {
  buildFreeChatInstruction,
  assertTaskUnlocked,
}
