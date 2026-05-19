import type { PluginManifest, CoreAPI } from '@core/types'
import { registerPlugin } from '@core/plugins/PluginRegistry'
import { useWorkStore } from './store'
import { WORK_EVENTS } from './events'
import { WorkDashboard } from './pages/WorkDashboard'
import { NotesPage } from './pages/NotesPage'
import { WorkSummaryWidget } from './components/WorkSummaryWidget'
import { startWorkFocusSession } from './focus'
import type { Board, Column, Card, Note, Link, FocusSession } from './types'
import { TAG_ENTITY_TYPES, tagsService } from '@core/services/tagsService'

async function migrateEntityTags(entityType: string, entityId: string, names: string[]): Promise<void> {
  const legacyNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
  if (legacyNames.length === 0) return
  const existing = await tagsService.forEntity(entityType, entityId)
  if (existing.length > 0) return
  const tags = await Promise.all(legacyNames.map((name) => tagsService.ensure(name)))
  await tagsService.setForEntity(entityType, entityId, tags.map((tag) => tag.id))
}

async function migrateLegacyTags(cards: Card[], notes: Note[]): Promise<void> {
  await Promise.all([
    ...cards.map((card) => migrateEntityTags(TAG_ENTITY_TYPES.WORK_CARD, card.id, card.labels ?? [])),
    ...notes.map((note) => migrateEntityTags(TAG_ENTITY_TYPES.WORK_NOTE, note.id, note.tags ?? [])),
  ])
}

const workPlugin: PluginManifest = {
  id: 'work',
  name: 'Work',
  version: '1.0.0',
  description: 'Kanban boards, notas y enlaces de trabajo',
  icon: 'BriefcaseBusiness',
  domain: 'productivity',
  domainKeywords: ['kanban', 'tasks', 'focus', 'notes'],
  iconography: {
    primary: 'BriefcaseBusiness',
    gallery: ['BriefcaseBusiness', 'Briefcase', 'KanbanSquare', 'CheckSquare', 'Timer', 'Target', 'ListTodo'],
  },

  migrations: [
    {
      version: 1,
      up: `
        CREATE TABLE IF NOT EXISTS work_boards (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS work_columns (
          id TEXT PRIMARY KEY,
          board_id TEXT NOT NULL,
          name TEXT NOT NULL,
          position INTEGER DEFAULT 0,
          FOREIGN KEY (board_id) REFERENCES work_boards(id)
        );
        CREATE TABLE IF NOT EXISTS work_cards (
          id TEXT PRIMARY KEY,
          column_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          labels TEXT DEFAULT '[]',
          due_date TEXT,
          position INTEGER DEFAULT 0,
          FOREIGN KEY (column_id) REFERENCES work_columns(id)
        );
        CREATE TABLE IF NOT EXISTS work_notes (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT DEFAULT '',
          tags TEXT DEFAULT '[]',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS work_links (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          category TEXT DEFAULT ''
        );
      `,
    },
    {
      version: 2,
      up: `
        INSERT OR IGNORE INTO work_boards (id, name) VALUES ('default', 'Principal');
        INSERT OR IGNORE INTO work_columns (id, board_id, name, position) VALUES
          ('col-backlog', 'default', 'Backlog', 0),
          ('col-todo', 'default', 'Por hacer', 1),
          ('col-progress', 'default', 'En progreso', 2),
          ('col-done', 'default', 'Hecho', 3);
      `,
    },
    {
      version: 3,
      up: `ALTER TABLE work_cards ADD COLUMN content TEXT DEFAULT '';`,
    },
    {
      version: 4,
      up: `
        CREATE TABLE IF NOT EXISTS work_focus_sessions (
          id TEXT PRIMARY KEY,
          task_id TEXT,
          start_time INTEGER NOT NULL,
          end_time INTEGER,
          duration INTEGER,
          interrupted INTEGER DEFAULT 0,
          FOREIGN KEY (task_id) REFERENCES work_cards(id)
        );
        CREATE INDEX IF NOT EXISTS idx_work_focus_sessions_task_id ON work_focus_sessions(task_id);
        CREATE INDEX IF NOT EXISTS idx_work_focus_sessions_start_time ON work_focus_sessions(start_time);
      `,
    },
    {
      version: 5,
      up: `
        ALTER TABLE work_focus_sessions ADD COLUMN paused_at INTEGER;
        ALTER TABLE work_focus_sessions ADD COLUMN paused_total INTEGER DEFAULT 0;
      `,
    },
    {
      version: 6,
      up: `ALTER TABLE work_notes ADD COLUMN pinned INTEGER DEFAULT 0;`,
    },
    {
      version: 7,
      up: `
        ALTER TABLE work_cards ADD COLUMN priority TEXT;
        ALTER TABLE work_cards ADD COLUMN estimate_minutes INTEGER;
        ALTER TABLE work_cards ADD COLUMN checklist TEXT DEFAULT '[]';
        ALTER TABLE work_cards ADD COLUMN archived INTEGER DEFAULT 0;
        ALTER TABLE work_cards ADD COLUMN archived_at INTEGER;
        ALTER TABLE work_columns ADD COLUMN wip_limit INTEGER;
      `,
    },
    {
      version: 8,
      up: `
        ALTER TABLE work_columns ADD COLUMN is_done INTEGER DEFAULT 0;
        UPDATE work_columns SET is_done = 1 WHERE id = 'col-done';
        UPDATE work_columns
           SET is_done = 1
         WHERE is_done = 0
           AND board_id NOT IN (SELECT DISTINCT board_id FROM work_columns WHERE is_done = 1)
           AND (LOWER(name) LIKE '%hecho%' OR LOWER(name) LIKE '%done%' OR LOWER(name) LIKE '%completad%');
      `,
    },
  ],

  widgets: [
    {
      id: 'work-summary',
      pluginId: 'work',
      title: 'Resumen Trabajo',
      component: WorkSummaryWidget,
      defaultSize: { w: 1, h: 1 },
    },
  ],

  pages: [
    {
      id: 'work-dashboard',
      pluginId: 'work',
      path: '/work',
      title: 'Work',
      icon: 'BriefcaseBusiness',
      component: WorkDashboard,
    },
    {
      id: 'work-notes',
      pluginId: 'work',
      path: '/work/notes',
      title: 'Notas',
      icon: 'SquarePen',
      component: NotesPage,
    },
  ],

  navItems: [
    { id: 'work-nav', pluginId: 'work', label: 'Work', icon: 'BriefcaseBusiness', path: '/work', order: 20 },
    { id: 'work-notes-nav', pluginId: 'work', label: 'Notas', icon: 'SquarePen', path: '/work/notes', order: 22, parentId: 'work-nav' },
  ],

  events: {
    emits: Object.values(WORK_EVENTS),
    listens: [],
  },

  async init(api: CoreAPI) {
    const boards = await api.storage.query('SELECT * FROM work_boards')
    const columns = await api.storage.query('SELECT * FROM work_columns ORDER BY position ASC')
    const cardsRaw = await api.storage.query('SELECT * FROM work_cards ORDER BY position ASC')
    const notesRaw = await api.storage.query('SELECT * FROM work_notes ORDER BY updated_at DESC')
    const links = await api.storage.query('SELECT * FROM work_links')
    const focusSessionsRaw = await api.storage.query('SELECT * FROM work_focus_sessions ORDER BY start_time DESC')

    const cards: Card[] = Array.isArray(cardsRaw)
      ? cardsRaw.map((raw) => {
        const row = raw as Record<string, unknown>
        return {
          id: row.id as string,
          columnId: row.column_id as string,
          title: row.title as string,
          description: (row.description ?? '') as string,
          content: (row.content ?? '') as string,
          labels: JSON.parse((row.labels || '[]') as string) as string[],
          dueDate: (row.due_date ?? null) as string | null,
          position: row.position as number,
          priority: (row.priority ?? null) as Card['priority'],
          estimateMinutes: row.estimate_minutes == null ? null : Number(row.estimate_minutes),
          checklist: JSON.parse((row.checklist || '[]') as string) as Card['checklist'],
          archived: Boolean(row.archived),
          archivedAt: row.archived_at == null ? null : Number(row.archived_at),
        }
      })
      : []

    const parsedColumns: Column[] = Array.isArray(columns)
      ? (columns as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        boardId: row.board_id as string,
        name: row.name as string,
        position: row.position as number,
        wipLimit: row.wip_limit == null ? null : Number(row.wip_limit),
        isDone: Boolean(row.is_done),
      }))
      : []

    const notes: Note[] = Array.isArray(notesRaw)
      ? notesRaw.map((raw) => {
        const row = raw as Record<string, unknown>
        return {
          id: row.id as string,
          title: row.title as string,
          content: (row.content ?? '') as string,
          tags: JSON.parse((row.tags || '[]') as string) as string[],
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
          pinned: Boolean(row.pinned),
        }
      })
      : []

    const focusSessions: FocusSession[] = Array.isArray(focusSessionsRaw)
      ? focusSessionsRaw.map((raw) => {
        const row = raw as Record<string, unknown>
        return {
          id: row.id as string,
          taskId: (row.task_id ?? null) as string | null,
          startTime: Number(row.start_time),
          endTime: row.end_time == null ? undefined : Number(row.end_time),
          duration: row.duration == null ? undefined : Number(row.duration),
          interrupted: Boolean(row.interrupted),
          pausedAt: row.paused_at == null ? null : Number(row.paused_at),
          pausedTotal: row.paused_total == null ? 0 : Number(row.paused_total),
        }
      })
      : []

    await migrateLegacyTags(cards, notes)
    const cardTags = await tagsService.forEntities(TAG_ENTITY_TYPES.WORK_CARD, cards.map((card) => card.id))
    const noteTags = await tagsService.forEntities(TAG_ENTITY_TYPES.WORK_NOTE, notes.map((note) => note.id))
    const cardsWithGlobalTags = cards.map((card) => {
      const globalTags = cardTags[card.id] ?? []
      return globalTags.length > 0 ? { ...card, labels: globalTags.map((tag) => tag.name) } : card
    })
    const notesWithGlobalTags = notes.map((note) => {
      const globalTags = noteTags[note.id] ?? []
      return globalTags.length > 0 ? { ...note, tags: globalTags.map((tag) => tag.name) } : note
    })
    await Promise.all([
      ...cardsWithGlobalTags
        .filter((card, index) => JSON.stringify(card.labels) !== JSON.stringify(cards[index]?.labels ?? []))
        .map((card) => api.storage.execute(
          `UPDATE work_cards SET labels = ? WHERE id = ?`,
          [JSON.stringify(card.labels), card.id],
        )),
      ...notesWithGlobalTags
        .filter((note, index) => JSON.stringify(note.tags) !== JSON.stringify(notes[index]?.tags ?? []))
        .map((note) => api.storage.execute(
          `UPDATE work_notes SET tags = ? WHERE id = ?`,
          [JSON.stringify(note.tags), note.id],
        )),
    ])

    // Limpieza de sesiones "zombie": si la app se cerró con una sesión abierta
    // hace más de 8 horas, la cerramos como interrumpida con cap de 8h.
    const ZOMBIE_THRESHOLD_MS = 8 * 60 * 60 * 1000
    const now = Date.now()
    for (const session of focusSessions) {
      if (session.endTime != null) continue
      const elapsed = now - session.startTime
      if (elapsed > ZOMBIE_THRESHOLD_MS) {
        const cappedEnd = session.startTime + ZOMBIE_THRESHOLD_MS
        session.endTime = cappedEnd
        session.duration = ZOMBIE_THRESHOLD_MS
        session.interrupted = true
        session.pausedAt = null
        await api.storage.execute(
          `UPDATE work_focus_sessions
           SET end_time = ?, duration = ?, interrupted = 1, paused_at = NULL
           WHERE id = ?`,
          [cappedEnd, ZOMBIE_THRESHOLD_MS, session.id],
        )
      }
    }

    const store = useWorkStore.getState()
    store.setBoards(boards as Board[])
    store.setColumns(parsedColumns)
    store.setCards(cardsWithGlobalTags)
    store.setNotes(notesWithGlobalTags)
    store.setLinks(links as Link[])
    store.setFocusSessions(focusSessions)

    api.events.on(WORK_EVENTS.TASK_COMPLETED, () => {
      api.gamification.addPoints(10, 'Tarea completada')
    })
    api.events.on(WORK_EVENTS.FOCUS_COMPLETED, () => {
      api.gamification.addPoints(5, 'Sesión de foco completada')
    })
    api.events.on(WORK_EVENTS.FOCUS_INTERRUPTED, () => {
      api.gamification.addPoints(-2, 'Sesión de foco interrumpida')
    })
    api.events.on(WORK_EVENTS.NOTE_CREATED, () => {
      api.gamification.addPoints(3, 'Nota creada')
    })

    // Métricas cross-plugin (consumidas por Goals/OKRs).
    function publishWorkMetrics() {
      const state = useWorkStore.getState()
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      const quarterStart = new Date(year, month - (month % 3), 1).getTime()

      let focusMs = 0
      let sessionsCompleted = 0
      for (const s of state.focusSessions) {
        if (!s.endTime || s.interrupted) continue
        if (s.startTime < quarterStart) continue
        focusMs += s.duration ?? Math.max(0, s.endTime - s.startTime)
        sessionsCompleted += 1
      }
      const tasksArchived = state.cards.filter(
        (c) => c.archived && (c.archivedAt ?? 0) >= quarterStart,
      ).length

      api.metrics.publish('work.focus_hours', Math.round((focusMs / 3_600_000) * 10) / 10)
      api.metrics.publish('work.focus_sessions', sessionsCompleted)
      api.metrics.publish('work.tasks_completed', tasksArchived)
    }
    publishWorkMetrics()
    api.events.on(WORK_EVENTS.FOCUS_COMPLETED, publishWorkMetrics)
    api.events.on(WORK_EVENTS.TASK_COMPLETED, publishWorkMetrics)

    // Quick action del Core: iniciar foco libre si no hay sesión.
    api.events.on('core:focus-request', () => {
      const state = useWorkStore.getState()
      if (state.currentFocusSession) return
      void startWorkFocusSession(null)
    })
  },
}

registerPlugin(workPlugin)

export default workPlugin
