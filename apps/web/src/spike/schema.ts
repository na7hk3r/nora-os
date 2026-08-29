/**
 * Core schema (spike) — extraído y reducido de
 * apps/desktop/electron/services/database.ts (CORE_SCHEMA + operaciones clave).
 *
 * El objetivo del spike es validar que sql.js ejecuta correctamente las
 * construcciones SQL que el renderer de Nora OS usa de verdad:
 *   - CREATE TABLE / CREATE INDEX
 *   - INSERT OR REPLACE / INSERT
 *   - UPDATE / DELETE
 *   - parametrizado (?)
 *   - AUTOINCREMENT + last insert rowid
 *   - foreign keys ON (para ON DELETE CASCADE)
 *   - migraciones con transacción (INSERT INTO _migrations)
 */

export const CORE_SCHEMA = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY DEFAULT 1,
    name TEXT,
    height REAL,
    age INTEGER,
    start_date TEXT,
    weight_goal REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS events_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    source TEXT NOT NULL,
    payload TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_events_log_created_at ON events_log(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_log_type_created ON events_log(event_type, created_at);

  CREATE TABLE IF NOT EXISTS plugin_state (
    plugin_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (plugin_id, key)
  );

  CREATE TABLE IF NOT EXISTS _migrations (
    plugin_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    applied_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (plugin_id, version)
  );

  CREATE TABLE IF NOT EXISTS core_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS core_tag_links (
    tag_id INTEGER NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (tag_id, entity_type, entity_id),
    FOREIGN KEY (tag_id) REFERENCES core_tags(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_core_tag_links_entity ON core_tag_links(entity_type, entity_id);

  CREATE TABLE IF NOT EXISTS core_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_core_templates_plugin ON core_templates(plugin_id, kind);

  CREATE TABLE IF NOT EXISTS core_automations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    trigger_event TEXT NOT NULL,
    condition TEXT,
    action_type TEXT NOT NULL,
    action_payload TEXT,
    last_run_at TEXT,
    run_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_core_automations_event ON core_automations(trigger_event, enabled);

  CREATE TABLE IF NOT EXISTS core_notifications_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT,
    source TEXT,
    scheduled_at TEXT NOT NULL,
    delivered_at TEXT,
    dismissed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_core_notifications_scheduled ON core_notifications_queue(scheduled_at, delivered_at);
`

// Un plugin de ejemplo (usamos el segmento de work) para probar migraciones
// y operaciones parametrizadas reales del renderer.
export const WORK_MIGRATIONS: { version: number; up: string }[] = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS work_boards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS work_columns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        board_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        wip_limit INTEGER
      );
      CREATE TABLE IF NOT EXISTS work_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        column_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        labels TEXT,
        due_date TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        content TEXT,
        priority TEXT,
        estimate_minutes INTEGER,
        checklist TEXT,
        archived INTEGER NOT NULL DEFAULT 0,
        archived_at TEXT
      );
    `,
  },
  {
    version: 2,
    up: `
      CREATE TABLE IF NOT EXISTS work_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        tags TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        pinned INTEGER NOT NULL DEFAULT 0
      );
    `,
  },
]
