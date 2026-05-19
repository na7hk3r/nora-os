/**
 * Demo data seeder — usado cuando el usuario activa "cargar ejemplos" durante
 * el onboarding. Inserta filas mínimas en plugins activos para que el dashboard
 * no quede vacío y se pueda explorar el copiloto con datos reales.
 *
 * Reglas:
 * - Sólo escribe en plugins efectivamente activos.
 * - Nunca pisa datos preexistentes (usa INSERT OR IGNORE / detecta vacío).
 * - Ningún fallo individual aborta el resto.
 */

const id = () => `demo_${Math.random().toString(36).slice(2, 10)}`

async function safeExec(sql: string, params: unknown[] = []): Promise<void> {
  try {
    await window.storage?.execute(sql, params)
  } catch (err) {
    console.warn('[seedDemoData] step failed', sql.slice(0, 60), err)
  }
}

async function tableIsEmpty(table: string): Promise<boolean> {
  try {
    const rows = (await window.storage?.query(`SELECT COUNT(*) as c FROM ${table}`, [])) as
      | { c: number }[]
      | undefined
    return !rows || rows[0]?.c === 0
  } catch {
    return false
  }
}

async function seedWork(): Promise<void> {
  if (!(await tableIsEmpty('work_cards'))) return
  const samples = [
    { title: 'Configurar primer foco profundo de la mañana', col: 'col-todo' },
    { title: 'Revisar plugins activos en Configuración', col: 'col-doing' },
    { title: 'Probar el copiloto con tu objetivo', col: 'col-todo' },
  ]
  let pos = 0
  for (const s of samples) {
    await safeExec(
      `INSERT INTO work_cards (id, column_id, title, description, position) VALUES (?, ?, ?, '', ?)`,
      [id(), s.col, s.title, pos++],
    )
  }
}

async function seedHabits(): Promise<void> {
  if (!(await tableIsEmpty('habits_definitions'))) return
  const samples = [
    { name: 'Caminar 20 min', icon: 'Footprints' },
    { name: 'Leer 10 páginas', icon: 'BookOpen' },
    { name: 'Hidratarse 2L', icon: 'Droplet' },
  ]
  for (const s of samples) {
    await safeExec(
      `INSERT INTO habits_definitions (id, name, icon, kind, period, target, archived, created_at)
       VALUES (?, ?, ?, 'positive', 'daily', 1, 0, datetime('now'))`,
      [id(), s.name, s.icon],
    )
  }
}

async function seedJournal(): Promise<void> {
  if (!(await tableIsEmpty('journal_entries'))) return
  const content = 'Empecé a usar Nora OS hoy. Quiero ver qué pasa cuando lo uso una semana entera.'
  await safeExec(
    `INSERT OR IGNORE INTO journal_entries (id, date, mood, title, content, tags, word_count, pinned, created_at, updated_at)
     VALUES (?, date('now'), 4, 'Primer día', ?, '[]', ?, 0, datetime('now'), datetime('now'))`,
    [id(), content, content.split(/\s+/).length],
  )
}

async function seedKnowledge(): Promise<void> {
  if (!(await tableIsEmpty('knowledge_resources'))) return
  await safeExec(
    `INSERT INTO knowledge_resources (id, type, title, author, source_url, status, progress, started_at, finished_at, tags, notes, created_at)
     VALUES (?, 'book', 'Atomic Habits', 'James Clear', NULL, 'in_progress', 35, date('now', '-7 days'), NULL, 'productividad,hábitos', '', datetime('now'))`,
    [id()],
  )
}

const SEEDERS: Record<string, () => Promise<void>> = {
  work: seedWork,
  habits: seedHabits,
  journal: seedJournal,
  knowledge: seedKnowledge,
}

export async function seedDemoData(activePlugins: string[]): Promise<void> {
  if (!window.storage) return
  for (const pluginId of activePlugins) {
    const seeder = SEEDERS[pluginId]
    if (seeder) {
      await seeder()
    }
  }
}
