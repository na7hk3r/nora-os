import type { EventLogEntry, Migration, StorageBridge } from '@core/types'

const MAX_GENERAL_READ_LIMIT = 500
const DEFAULT_GENERAL_READ_LIMIT = 200
const VALID_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

const ALLOWED_TABLE_COLUMNS: Record<string, Set<string>> = {
  profile: new Set(['id', 'name', 'height', 'age', 'start_date', 'weight_goal', 'created_at', 'updated_at']),
  settings: new Set(['key', 'value']),
  events_log: new Set(['id', 'event_type', 'source', 'payload', 'created_at']),
  plugin_state: new Set(['plugin_id', 'key', 'value']),
  _migrations: new Set(['plugin_id', 'version', 'applied_at']),
  fitness_daily_entries: new Set([
    'id',
    'date',
    'day_name',
    'weight',
    'breakfast',
    'lunch',
    'snack',
    'dinner',
    'workout',
    'cigarettes',
    'sleep',
    'notes',
    'created_at',
  ]),
  fitness_measurements: new Set([
    'id',
    'date',
    'weight',
    'arm_relaxed',
    'arm_flexed',
    'chest',
    'waist',
    'leg',
    'created_at',
  ]),
  work_boards: new Set(['id', 'name']),
  work_columns: new Set(['id', 'board_id', 'name', 'position', 'wip_limit']),
  work_cards: new Set([
    'id',
    'column_id',
    'title',
    'description',
    'labels',
    'due_date',
    'position',
    'content',
    'priority',
    'estimate_minutes',
    'checklist',
    'archived',
    'archived_at',
  ]),
  work_notes: new Set(['id', 'title', 'content', 'tags', 'created_at', 'updated_at', 'pinned']),
  work_links: new Set(['id', 'title', 'url', 'category']),
  work_focus_sessions: new Set([
    'id',
    'task_id',
    'start_time',
    'end_time',
    'duration',
    'interrupted',
    'paused_at',
    'paused_total',
  ]),
  core_tags: new Set(['id', 'name', 'color', 'created_at']),
  core_tag_links: new Set(['tag_id', 'entity_type', 'entity_id', 'created_at']),
  core_templates: new Set(['id', 'plugin_id', 'name', 'kind', 'content', 'created_at', 'updated_at']),
  core_automations: new Set([
    'id',
    'name',
    'enabled',
    'trigger_event',
    'condition',
    'action_type',
    'action_payload',
    'last_run_at',
    'run_count',
    'created_at',
  ]),
  core_notifications_queue: new Set([
    'id',
    'title',
    'body',
    'source',
    'scheduled_at',
    'delivered_at',
    'dismissed_at',
    'created_at',
  ]),
  finance_accounts: new Set([
    'id',
    'name',
    'type',
    'currency',
    'initial_balance',
    'color',
    'archived',
    'created_at',
  ]),
  finance_categories: new Set([
    'id',
    'name',
    'parent_id',
    'kind',
    'color',
    'archived',
  ]),
  finance_transactions: new Set([
    'id',
    'account_id',
    'category_id',
    'kind',
    'amount',
    'currency',
    'original_amount',
    'original_currency',
    'base_amount',
    'base_currency',
    'exchange_rate',
    'occurred_at',
    'note',
    'recurring_id',
    'transfer_pair_id',
    'transfer_group_id',
    'movement_subtype',
    'created_at',
  ]),
  finance_recurring: new Set([
    'id',
    'template_json',
    'rrule',
    'next_run',
    'active',
    'created_at',
  ]),
  finance_budgets: new Set([
    'id',
    'category_id',
    'period',
    'limit_amount',
    'currency',
    'created_at',
  ]),
  finance_merchant_aliases: new Set([
    'id',
    'pattern',
    'category_id',
    'created_at',
  ]),
  habits_definitions: new Set([
    'id',
    'name',
    'icon',
    'color',
    'kind',
    'period',
    'target',
    'archived',
    'created_at',
  ]),
  habits_logs: new Set([
    'id',
    'habit_id',
    'date',
    'count',
    'note',
    'created_at',
  ]),
  journal_entries: new Set([
    'id',
    'date',
    'mood',
    'prompt_id',
    'title',
    'content',
    'tags',
    'word_count',
    'pinned',
    'created_at',
    'updated_at',
  ]),
  journal_prompts: new Set([
    'id',
    'text',
    'category',
    'builtin',
    'created_at',
  ]),
  goals_objectives: new Set([
    'id',
    'title',
    'description',
    'period',
    'year',
    'status',
    'color',
    'created_at',
  ]),
  goals_key_results: new Set([
    'id',
    'goal_id',
    'name',
    'source',
    'baseline',
    'target_value',
    'current_value',
    'unit',
    'direction',
    'created_at',
  ]),
  goals_milestones: new Set([
    'id',
    'kr_id',
    'value',
    'achieved_at',
    'note',
  ]),
  knowledge_resources: new Set([
    'id',
    'type',
    'title',
    'author',
    'source_url',
    'status',
    'progress',
    'started_at',
    'finished_at',
    'tags',
    'notes',
    'created_at',
  ]),
  knowledge_highlights: new Set([
    'id',
    'resource_id',
    'text',
    'page',
    'note',
    'tags',
    'created_at',
  ]),
  knowledge_flashcards: new Set([
    'id',
    'resource_id',
    'deck',
    'front',
    'back',
    'ease',
    'interval',
    'repetitions',
    'next_review',
    'archived',
    'created_at',
  ]),
  knowledge_reviews: new Set([
    'id',
    'flashcard_id',
    'reviewed_at',
    'quality',
  ]),
  time_projects: new Set([
    'id',
    'name',
    'color',
    'client',
    'hourly_rate',
    'archived',
    'created_at',
  ]),
  time_entries: new Set([
    'id',
    'project_id',
    'task_id',
    'start',
    'end',
    'duration_sec',
    'billable',
    'source',
    'note',
    'created_at',
  ]),
}

function assertTableName(table: string): void {
  if (!VALID_IDENTIFIER.test(table)) {
    throw new Error(`Invalid table identifier '${table}'`)
  }
  if (!(table in ALLOWED_TABLE_COLUMNS)) {
    throw new Error(`Table '${table}' is not allowed by StorageAPI`)
  }
}

function assertColumnNames(table: string, columns: string[]): void {
  if (columns.length === 0) {
    throw new Error(`At least one column is required for table '${table}'`)
  }

  const allowedColumns = ALLOWED_TABLE_COLUMNS[table]
  for (const column of columns) {
    if (!VALID_IDENTIFIER.test(column)) {
      throw new Error(`Invalid column identifier '${column}' for table '${table}'`)
    }
    if (!allowedColumns.has(column)) {
      throw new Error(`Column '${column}' is not allowed for table '${table}'`)
    }
  }
}

function normalizeLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('limit must be a positive integer')
  }
  return Math.min(limit, MAX_GENERAL_READ_LIMIT)
}

function getStorage(): StorageBridge {
  if (!window.storage) {
    throw new Error(
      'window.storage is not available. Make sure the app is running inside Electron with the preload script loaded.',
    )
  }
  return window.storage
}

export class StorageAPI {
  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    return getStorage().query(sql, params) as Promise<T[]>
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
    return getStorage().execute(sql, params)
  }

  async migrate(pluginId: string, migrations: Migration[]): Promise<void> {
    return getStorage().migrate(pluginId, migrations)
  }

  // Convenience helpers

  async getAll<T>(table: string, limit: number = DEFAULT_GENERAL_READ_LIMIT): Promise<T[]> {
    assertTableName(table)
    const safeLimit = normalizeLimit(limit)
    return this.query<T>(`SELECT * FROM ${table} LIMIT ?`, [safeLimit])
  }

  async getById<T>(table: string, id: string | number): Promise<T | undefined> {
    assertTableName(table)
    const rows = await this.query<T>(`SELECT * FROM ${table} WHERE id = ?`, [id])
    return rows[0]
  }

  async insert(table: string, data: Record<string, unknown>): Promise<number> {
    assertTableName(table)
    const keys = Object.keys(data)
    assertColumnNames(table, keys)
    const placeholders = keys.map(() => '?').join(', ')
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
    const result = await this.execute(sql, Object.values(data))
    return result.lastInsertRowid
  }

  async update(table: string, id: string | number, data: Record<string, unknown>): Promise<void> {
    assertTableName(table)
    const keys = Object.keys(data)
    assertColumnNames(table, keys)
    const sets = keys.map((k) => `${k} = ?`).join(', ')
    const sql = `UPDATE ${table} SET ${sets} WHERE id = ?`
    await this.execute(sql, [...Object.values(data), id])
  }

  async deleteRow(table: string, id: string | number): Promise<void> {
    assertTableName(table)
    await this.execute(`DELETE FROM ${table} WHERE id = ?`, [id])
  }

  async logEvent(type: string, source: string, payload: Record<string, unknown>): Promise<void> {
    const sql = `INSERT INTO events_log (event_type, source, payload) VALUES (?, ?, ?)`
    await this.execute(sql, [type, source, JSON.stringify(payload)])
  }

  async getRecentEvents(limit = 30): Promise<EventLogEntry[]> {
    const safeLimit = Math.min(Math.max(1, limit), 200)
    return this.query<EventLogEntry>(
      `SELECT id, event_type, source, payload, created_at FROM events_log ORDER BY created_at DESC LIMIT ?`,
      [safeLimit],
    )
  }

  async getSetting(key: string): Promise<string | undefined> {
    const rows = await this.query<{ value: string }>(
      `SELECT value FROM settings WHERE key = ? LIMIT 1`,
      [key],
    )
    return rows[0]?.value
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.execute(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      [key, value],
    )
  }
}

export const storageAPI = new StorageAPI()
