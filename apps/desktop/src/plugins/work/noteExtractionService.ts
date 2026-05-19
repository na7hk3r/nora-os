import { ollamaService } from '@core/services/ollamaService'
import { eventBus } from '@core/events/EventBus'
import { useWorkStore } from './store'
import { WORK_EVENTS } from './events'
import type { Card } from './types'

export interface ExtractedTask {
  title: string
  dueDate?: string | null
}

const PROMPT_INSTRUCTION = [
  'TAREA: Extraé hasta 7 tareas accionables del texto.',
  'Devolvé SOLO un objeto JSON válido con la forma {"tasks":[{"title":"...","dueDate":"YYYY-MM-DD"|null}]}.',
  'Cada title máximo 80 caracteres, en español rioplatense con vos, sin emojis, sin signos de exclamación.',
  'Si no hay nada accionable devolvé {"tasks":[]}.',
  'No agregues comentarios, ni markdown, ni texto fuera del JSON.',
].join('\n')

function buildPrompt(text: string): string {
  return `TEXTO DE LA NOTA:\n${text.slice(0, 4000)}\n\n${PROMPT_INSTRUCTION}`
}

function tryExtractJson(raw: string): { tasks?: unknown } | null {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  const slice = trimmed.slice(start, end + 1)
  try { return JSON.parse(slice) as { tasks?: unknown } } catch { return null }
}

function normalizeTasks(parsed: { tasks?: unknown } | null): ExtractedTask[] {
  if (!parsed || !Array.isArray(parsed.tasks)) return []
  const out: ExtractedTask[] = []
  for (const item of parsed.tasks) {
    if (!item || typeof item !== 'object') continue
    const obj = item as Record<string, unknown>
    const title = typeof obj.title === 'string' ? obj.title.trim() : ''
    if (!title) continue
    const dueRaw = obj.dueDate
    const dueDate = typeof dueRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null
    out.push({ title: title.slice(0, 200), dueDate })
    if (out.length >= 7) break
  }
  return out
}

export const noteExtractionService = {
  async extract(text: string): Promise<ExtractedTask[]> {
    const ready = await ollamaService.isReady()
    if (!ready.enabled) throw new Error('Ollama está deshabilitado en Configuración')
    if (!ready.healthy) throw new Error(`Ollama no responde: ${ready.reason ?? 'sin detalle'}`)
    const raw = await ollamaService.generate(buildPrompt(text))
    return normalizeTasks(tryExtractJson(raw))
  },

  /**
   * Crea cards en la primera columna del primer board para cada tarea.
   * Devuelve los ids creados.
   */
  async createCards(tasks: ExtractedTask[]): Promise<string[]> {
    if (tasks.length === 0) return []
    const state = useWorkStore.getState()
    const firstBoardCols = state.columns.filter((c) => c.boardId === state.boards[0]?.id)
    const targetColumn = firstBoardCols.sort((a, b) => a.position - b.position)[0]
    if (!targetColumn) throw new Error('No hay columnas disponibles para insertar tareas')

    const baseCount = state.cards.filter((c) => c.columnId === targetColumn.id && !c.archived).length
    const created: string[] = []
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i]
      const id = crypto.randomUUID()
      const card: Card = {
        id,
        columnId: targetColumn.id,
        title: t.title,
        description: '',
        content: '',
        labels: [],
        dueDate: t.dueDate ?? null,
        position: baseCount + i,
        priority: null,
        estimateMinutes: null,
        checklist: [],
        archived: false,
        archivedAt: null,
      }
      state.addCard(card)
      if (window.storage) {
        await window.storage.execute(
          `INSERT INTO work_cards (id, column_id, title, description, content, labels, due_date, position, priority, estimate_minutes, checklist, archived, archived_at)
           VALUES (?, ?, ?, '', '', '[]', ?, ?, NULL, NULL, '[]', 0, NULL)`,
          [id, targetColumn.id, t.title, t.dueDate ?? null, baseCount + i],
        )
      }
      eventBus.emit(WORK_EVENTS.TASK_CREATED, { id, title: t.title, columnId: targetColumn.id })
      created.push(id)
    }
    return created
  },
}
