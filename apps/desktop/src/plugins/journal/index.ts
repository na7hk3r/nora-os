/**
 * Plugin Journal — manifest.
 *
 * Diario personal con mood tracking y prompts. Una entrada por día, búsqueda
 * por texto/tag/mood, y un proveedor de contexto IA que solo expone agregados.
 */

import type { PluginManifest, CoreAPI } from '@core/types'
import { registerPlugin } from '@core/plugins/PluginRegistry'
import { useJournalStore } from './store'
import { JOURNAL_EVENTS } from './events'
import { registerAIContextProvider } from '@core/services/aiContextRegistry'
import { journalAIProvider } from './aiProvider'
import { JournalSummaryWidget } from './components/JournalSummaryWidget'
import { JournalDashboard } from './pages/JournalDashboard'
import { JournalHistoryPage } from './pages/JournalHistoryPage'
import { BUILTIN_PROMPTS } from './prompts'
import { journalEntriesRepo, journalPromptsRepo } from './repository'
import type { JournalPrompt } from './types'

const journalPlugin: PluginManifest = {
  id: 'journal',
  name: 'Journal',
  version: '1.0.0',
  description: 'Diario personal con mood tracking y prompts.',
  icon: 'BookOpen',
  domain: 'knowledge',
  domainKeywords: ['journal', 'diary', 'mood', 'reflection'],
  iconography: {
    primary: 'BookOpen',
    gallery: ['BookOpen', 'NotebookPen', 'Notebook', 'History', 'Bookmark'],
  },

  migrations: [
    {
      version: 1,
      up: `
        CREATE TABLE IF NOT EXISTS journal_entries (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL UNIQUE,
          mood INTEGER,
          prompt_id TEXT,
          title TEXT NOT NULL DEFAULT '',
          content TEXT NOT NULL,
          tags TEXT NOT NULL DEFAULT '[]',
          word_count INTEGER NOT NULL DEFAULT 0,
          pinned INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
        CREATE TABLE IF NOT EXISTS journal_prompts (
          id TEXT PRIMARY KEY,
          text TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'free',
          builtin INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `,
    },
    {
      version: 2,
      up: `
        INSERT OR IGNORE INTO journal_prompts (id, text, category, builtin) VALUES
          ('prm_morning_intent', '¿Qué quiero lograr hoy?', 'morning', 1),
          ('prm_morning_energy', '¿Cómo amanecí (1-5) y por qué?', 'morning', 1),
          ('prm_evening_review', '¿Qué hice bien hoy? ¿Qué cambiaría?', 'evening', 1),
          ('prm_gratitude', 'Tres cosas que agradezco hoy.', 'gratitude', 1),
          ('prm_lesson', '¿Qué aprendí esta semana?', 'reflection', 1),
          ('prm_blocker', '¿Qué me está bloqueando ahora mismo?', 'reflection', 1),
          ('prm_free', 'Escribir libre.', 'free', 1);
      `,
    },
  ],

  widgets: [
    {
      id: 'journal-summary',
      pluginId: 'journal',
      title: 'Journal',
      component: JournalSummaryWidget,
      defaultSize: { w: 1, h: 1 },
    },
  ],

  pages: [
    { id: 'journal-dashboard', pluginId: 'journal', path: '/journal', title: 'Journal', icon: 'BookOpen', component: JournalDashboard },
    { id: 'journal-history', pluginId: 'journal', path: '/journal/history', title: 'Historial', icon: 'History', component: JournalHistoryPage },
  ],

  navItems: [
    { id: 'journal-nav', pluginId: 'journal', label: 'Journal', icon: 'BookOpen', path: '/journal', order: 50 },
    { id: 'journal-history-nav', pluginId: 'journal', label: 'Historial', icon: 'History', path: '/journal/history', order: 51, parentId: 'journal-nav' },
  ],

  events: {
    emits: Object.values(JOURNAL_EVENTS),
    listens: [],
  },

  async init(api: CoreAPI) {
    const entries = await journalEntriesRepo.find({ orderBy: [{ column: 'date', direction: 'DESC' }] })
    let prompts = await journalPromptsRepo.find({
      orderBy: [
        { column: 'builtin', direction: 'DESC' },
        { column: 'text', direction: 'ASC' },
      ],
    })

    // Si la migración v2 no se aplicó (DB existente sin built-ins), los inyectamos en memoria.
    if (prompts.length === 0) {
      prompts = BUILTIN_PROMPTS.map((p): JournalPrompt => ({ ...p, createdAt: new Date().toISOString() }))
    }

    const store = useJournalStore.getState()
    store.setEntries(entries)
    store.setPrompts(prompts)

    registerAIContextProvider(journalAIProvider)

    api.events.on(JOURNAL_EVENTS.ENTRY_CREATED, () => {
      api.gamification.addPoints(5, 'Entrada de journal creada')
    })
    api.events.on(JOURNAL_EVENTS.ENTRY_UPDATED, () => {
      api.gamification.addPoints(2, 'Entrada de journal actualizada')
    })
    api.events.on(JOURNAL_EVENTS.MOOD_LOGGED, () => {
      api.gamification.addPoints(1, 'Mood registrado')
    })
  },
}

registerPlugin(journalPlugin)

export default journalPlugin
