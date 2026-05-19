/**
 * Plugin Knowledge — manifest.
 *
 * PKM ligero: recursos (libros/cursos/papers/articles/videos), highlights
 * y flashcards con SM-2. Sin sync externo, sin nube. Cross-plugin con
 * Work (highlights → tasks), Habits (review diario) y Goals (recursos
 * terminados como métrica).
 */

import type { CoreAPI, PluginManifest } from '@core/types'
import { registerPlugin } from '@core/plugins/PluginRegistry'
import { useKnowledgeStore } from './store'
import { KNOWLEDGE_EVENTS } from './events'
import { registerAIContextProvider } from '@core/services/aiContextRegistry'
import { knowledgeAIProvider } from './aiProvider'
import { KnowledgeSummaryWidget } from './components/KnowledgeSummaryWidget'
import { KnowledgeDashboard } from './pages/KnowledgeDashboard'
import { KnowledgeResourcesPage } from './pages/KnowledgeResourcesPage'
import { KnowledgeReviewPage } from './pages/KnowledgeReviewPage'
import { KnowledgeHighlightsPage } from './pages/KnowledgeHighlightsPage'
import {
  knowledgeFlashcardsRepo,
  knowledgeHighlightsRepo,
  knowledgeResourcesRepo,
  knowledgeReviewsRepo,
} from './repository'
import { dueFlashcards, isMastered, todayISO } from './utils'

const knowledgePlugin: PluginManifest = {
  id: 'knowledge',
  name: 'Conocimiento',
  version: '1.0.0',
  description: 'Recursos, highlights y flashcards con SM-2 para aprender lo que importa.',
  icon: 'BookOpen',
  domain: 'knowledge',
  domainKeywords: ['reading', 'learning', 'pkm', 'flashcards', 'study'],
  iconography: {
    primary: 'BookOpen',
    gallery: ['BookOpen', 'GraduationCap', 'Library', 'Highlighter', 'Brain', 'NotebookPen', 'Layers', 'Sparkles'],
  },

  migrations: [
    {
      version: 1,
      up: `
        CREATE TABLE IF NOT EXISTS knowledge_resources (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL DEFAULT 'article',
          title TEXT NOT NULL,
          author TEXT,
          source_url TEXT,
          status TEXT NOT NULL DEFAULT 'queued',
          progress INTEGER NOT NULL DEFAULT 0,
          started_at TEXT,
          finished_at TEXT,
          tags TEXT,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_resources_status ON knowledge_resources(status);

        CREATE TABLE IF NOT EXISTS knowledge_highlights (
          id TEXT PRIMARY KEY,
          resource_id TEXT NOT NULL,
          text TEXT NOT NULL,
          page INTEGER,
          note TEXT,
          tags TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (resource_id) REFERENCES knowledge_resources(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_highlights_resource ON knowledge_highlights(resource_id);

        CREATE TABLE IF NOT EXISTS knowledge_flashcards (
          id TEXT PRIMARY KEY,
          resource_id TEXT,
          deck TEXT NOT NULL DEFAULT 'general',
          front TEXT NOT NULL,
          back TEXT NOT NULL,
          ease REAL NOT NULL DEFAULT 2.5,
          interval INTEGER NOT NULL DEFAULT 0,
          repetitions INTEGER NOT NULL DEFAULT 0,
          next_review TEXT NOT NULL,
          archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (resource_id) REFERENCES knowledge_resources(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_flashcards_due ON knowledge_flashcards(next_review, archived);

        CREATE TABLE IF NOT EXISTS knowledge_reviews (
          id TEXT PRIMARY KEY,
          flashcard_id TEXT NOT NULL,
          reviewed_at TEXT NOT NULL,
          quality INTEGER NOT NULL,
          FOREIGN KEY (flashcard_id) REFERENCES knowledge_flashcards(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_reviews_flashcard ON knowledge_reviews(flashcard_id);
      `,
    },
  ],

  widgets: [
    {
      id: 'knowledge-summary',
      pluginId: 'knowledge',
      title: 'Conocimiento',
      component: KnowledgeSummaryWidget,
      defaultSize: { w: 1, h: 1 },
    },
  ],

  pages: [
    { id: 'knowledge-dashboard', pluginId: 'knowledge', path: '/knowledge', title: 'Conocimiento', icon: 'BookOpen', component: KnowledgeDashboard },
    { id: 'knowledge-resources', pluginId: 'knowledge', path: '/knowledge/resources', title: 'Biblioteca', icon: 'Library', component: KnowledgeResourcesPage },
    { id: 'knowledge-highlights', pluginId: 'knowledge', path: '/knowledge/highlights', title: 'Highlights', icon: 'Highlighter', component: KnowledgeHighlightsPage },
    { id: 'knowledge-review', pluginId: 'knowledge', path: '/knowledge/review', title: 'Repaso', icon: 'Brain', component: KnowledgeReviewPage },
  ],

  navItems: [
    { id: 'knowledge-nav', pluginId: 'knowledge', label: 'Conocimiento', icon: 'BookOpen', path: '/knowledge', order: 50 },
    { id: 'knowledge-resources-nav', pluginId: 'knowledge', label: 'Biblioteca', icon: 'Library', path: '/knowledge/resources', order: 51, parentId: 'knowledge-nav' },
    { id: 'knowledge-highlights-nav', pluginId: 'knowledge', label: 'Highlights', icon: 'Highlighter', path: '/knowledge/highlights', order: 52, parentId: 'knowledge-nav' },
    { id: 'knowledge-review-nav', pluginId: 'knowledge', label: 'Repaso', icon: 'Brain', path: '/knowledge/review', order: 53, parentId: 'knowledge-nav' },
  ],

  events: {
    emits: Object.values(KNOWLEDGE_EVENTS),
    listens: [],
  },

  async init(api: CoreAPI) {
    const [resources, highlights, flashcards, reviews] = await Promise.all([
      knowledgeResourcesRepo.find({ orderBy: [{ column: 'created_at', direction: 'DESC' }] }),
      knowledgeHighlightsRepo.find({ orderBy: [{ column: 'created_at', direction: 'DESC' }] }),
      knowledgeFlashcardsRepo.find({ orderBy: [{ column: 'next_review', direction: 'ASC' }] }),
      knowledgeReviewsRepo.find({ orderBy: [{ column: 'reviewed_at', direction: 'ASC' }] }),
    ])

    const store = useKnowledgeStore.getState()
    store.setResources(resources)
    store.setHighlights(highlights)
    store.setFlashcards(flashcards)
    store.setReviews(reviews)

    registerAIContextProvider(knowledgeAIProvider)

    // Métricas cross-plugin (Goals/OKRs y otros).
    function publishMetrics() {
      const state = useKnowledgeStore.getState()
      const today = todayISO()
      const monthPrefix = today.slice(0, 7)

      const finishedTotal = state.resources.filter((r) => r.status === 'finished').length
      const finishedThisMonth = state.resources.filter(
        (r) => r.status === 'finished' && (r.finishedAt ?? '').startsWith(monthPrefix),
      ).length
      const inProgress = state.resources.filter((r) => r.status === 'in_progress').length
      const due = dueFlashcards(state.flashcards).length
      const mastered = state.flashcards.filter(isMastered).length

      api.metrics.publish('knowledge.resources_finished', finishedTotal)
      api.metrics.publish('knowledge.resources_finished_month', finishedThisMonth)
      api.metrics.publish('knowledge.resources_in_progress', inProgress)
      api.metrics.publish('knowledge.flashcards_due', due)
      api.metrics.publish('knowledge.flashcards_mastered', mastered)
      api.metrics.publish('knowledge.highlights_total', state.highlights.length)
    }
    publishMetrics()
    api.events.on(KNOWLEDGE_EVENTS.RESOURCE_CREATED, publishMetrics)
    api.events.on(KNOWLEDGE_EVENTS.RESOURCE_UPDATED, publishMetrics)
    api.events.on(KNOWLEDGE_EVENTS.RESOURCE_FINISHED, publishMetrics)
    api.events.on(KNOWLEDGE_EVENTS.RESOURCE_DELETED, publishMetrics)
    api.events.on(KNOWLEDGE_EVENTS.HIGHLIGHT_ADDED, publishMetrics)
    api.events.on(KNOWLEDGE_EVENTS.HIGHLIGHT_DELETED, publishMetrics)
    api.events.on(KNOWLEDGE_EVENTS.FLASHCARD_CREATED, publishMetrics)
    api.events.on(KNOWLEDGE_EVENTS.FLASHCARD_REVIEWED, publishMetrics)
    api.events.on(KNOWLEDGE_EVENTS.FLASHCARD_DELETED, publishMetrics)

    // Gamificación: pequeñas dosis para reforzar el hábito de aprender.
    api.events.on(KNOWLEDGE_EVENTS.HIGHLIGHT_ADDED, () => {
      api.gamification.addPoints(3, 'Highlight capturado')
    })
    api.events.on(KNOWLEDGE_EVENTS.FLASHCARD_REVIEWED, () => {
      api.gamification.addPoints(2, 'Flashcard repasada')
    })
    api.events.on(KNOWLEDGE_EVENTS.RESOURCE_FINISHED, () => {
      api.gamification.addPoints(15, 'Recurso terminado')
    })
  },
}

registerPlugin(knowledgePlugin)

export default knowledgePlugin
