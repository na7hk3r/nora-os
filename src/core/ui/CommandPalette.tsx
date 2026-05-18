import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, Notebook, Link2, ListTodo, LayoutDashboard, SlidersHorizontal, CalendarDays, Sparkles, BarChart3, Hash } from 'lucide-react'
import { storageAPI } from '@core/storage/StorageAPI'
import { pluginManager } from '@core/plugins/PluginManager'
import {
  isTagSearchQuery,
  searchTagConnections,
  TAG_CONNECTION_KIND_LABEL,
  type TagConnectionItem,
} from '@core/services/tagConnectionsService'
import { useWorkspaceLayout, type WorkspacePaneId } from './WorkspaceLayoutContext'
import { resolveI18nString, useI18n, type AppCopy, type AppLanguage } from '@core/i18n'

export interface CommandResult {
  id: string
  kind: 'note' | 'link' | 'card' | 'planner' | 'tag' | 'nav' | 'action'
  title: string
  titleKey?: string
  subtitle?: string
  ctaPath: string
  actionId?: 'workspace:open-dual' | 'workspace:close-dual' | 'workspace:activate-primary' | 'workspace:activate-secondary'
}

const NAV_RESULTS: CommandResult[] = [
  { id: 'nav:dashboard', kind: 'nav', title: 'Dashboard', titleKey: 'routes.core-dashboard', ctaPath: '/' },
  { id: 'nav:control', kind: 'nav', title: 'Configuracion', titleKey: 'routes.core-control', ctaPath: '/control' },
  { id: 'nav:notes', kind: 'nav', title: 'Notas', titleKey: 'routes.core-notes', ctaPath: '/notes' },
  { id: 'nav:links', kind: 'nav', title: 'Enlaces', titleKey: 'routes.core-links', ctaPath: '/links' },
  { id: 'nav:planner', kind: 'nav', title: 'Planner', titleKey: 'routes.core-planner', ctaPath: '/planner' },
  { id: 'nav:calendar', kind: 'nav', title: 'Calendario unificado', titleKey: 'routes.core-calendar', ctaPath: '/calendar' },
  { id: 'nav:review', kind: 'nav', title: 'Review semanal/mensual', titleKey: 'routes.core-review', ctaPath: '/review' },
  { id: 'nav:profile', kind: 'nav', title: 'Perfil (export/import)', titleKey: 'routes.core-profile', ctaPath: '/profile' },
  { id: 'nav:shortcuts', kind: 'nav', title: 'Atajos de teclado', titleKey: 'routes.core-shortcuts', ctaPath: '/shortcuts' },
]

function getNavResults(language: AppLanguage): CommandResult[] {
  return NAV_RESULTS.map((result) => ({
    ...result,
    title: resolveI18nString(language, result.title, result.titleKey),
  }))
}

const ICONS: Record<CommandResult['kind'], React.ComponentType<{ size?: number; className?: string }>> = {
  note: Notebook,
  link: Link2,
  card: ListTodo,
  planner: CalendarDays,
  tag: Hash,
  nav: LayoutDashboard,
  action: Sparkles,
}

async function searchNotes(q: string, t: AppCopy): Promise<CommandResult[]> {
  try {
    const rows = await storageAPI.query<{ id: string; title: string }>(
      "SELECT id, title FROM work_notes WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ? ORDER BY updated_at DESC LIMIT 10",
      [`%${q}%`, `%${q}%`],
    )
    return rows.map((r) => ({ id: `note:${r.id}`, kind: 'note', title: r.title || t.staticText['Sin título'] || 'Sin titulo', ctaPath: '/notes' }))
  } catch { return [] }
}

async function searchLinks(q: string): Promise<CommandResult[]> {
  try {
    const rows = await storageAPI.query<{ id: string; title: string; url: string; category: string }>(
      "SELECT id, title, url, category FROM work_links WHERE LOWER(title) LIKE ? OR LOWER(url) LIKE ? OR LOWER(category) LIKE ? LIMIT 10",
      [`%${q}%`, `%${q}%`, `%${q}%`],
    )
    return rows.map((r) => ({ id: `link:${r.id}`, kind: 'link', title: r.title, subtitle: r.url, ctaPath: '/links' }))
  } catch { return [] }
}

async function searchCards(q: string): Promise<CommandResult[]> {
  try {
    const rows = await storageAPI.query<{ id: string; title: string; column_id: string }>(
      "SELECT id, title, column_id FROM work_cards WHERE archived = 0 AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?) LIMIT 10",
      [`%${q}%`, `%${q}%`],
    )
    return rows.map((r) => ({ id: `card:${r.id}`, kind: 'card', title: r.title, subtitle: r.column_id, ctaPath: '/work' }))
  } catch { return [] }
}

function searchNav(q: string, navResults: CommandResult[]): CommandResult[] {
  return navResults.filter((r) => r.title.toLowerCase().includes(q))
}

function searchWorkspaceActions(q: string, dualEnabled: boolean, t: AppCopy): CommandResult[] {
  const actions: CommandResult[] = dualEnabled
    ? [
        { id: 'action:workspace-close-dual', kind: 'action', title: t.commandPalette.actions.closeDual, subtitle: t.commandPalette.actions.closeDualSubtitle, ctaPath: '/', actionId: 'workspace:close-dual' },
        { id: 'action:workspace-primary', kind: 'action', title: t.commandPalette.actions.activatePrimary, subtitle: t.commandPalette.actions.activatePrimarySubtitle, ctaPath: '/', actionId: 'workspace:activate-primary' },
        { id: 'action:workspace-secondary', kind: 'action', title: t.commandPalette.actions.activateSecondary, subtitle: t.commandPalette.actions.activateSecondarySubtitle, ctaPath: '/', actionId: 'workspace:activate-secondary' },
      ]
    : [
        { id: 'action:workspace-open-dual', kind: 'action', title: t.commandPalette.actions.openDual, subtitle: t.commandPalette.actions.openDualSubtitle, ctaPath: '/', actionId: 'workspace:open-dual' },
      ]

  if (!q) return actions
  return actions.filter((result) =>
    `${result.title} ${result.subtitle ?? ''}`.toLowerCase().includes(q),
  )
}

function searchPluginPages(q: string, language: AppLanguage): CommandResult[] {
  return pluginManager.getActivePages()
    .map((p) => ({
      id: `nav:${p.id}`,
      kind: 'nav' as const,
      title: resolveI18nString(language, p.title, p.titleKey ?? `plugins.pages.${p.id}`),
      subtitle: p.path,
      ctaPath: p.path,
    }))
    .filter((p) => p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q))
}

function kindForConnection(item: TagConnectionItem): CommandResult['kind'] {
  if (item.kind === 'note') return 'note'
  if (item.kind === 'work_card') return 'card'
  if (item.kind === 'planner_task') return 'planner'
  return 'tag'
}

async function searchTags(q: string, t: AppCopy): Promise<CommandResult[]> {
  try {
    const matches = await searchTagConnections(q, 8)
    const results: CommandResult[] = []

    for (const match of matches) {
      const tagName = match.tag?.name ?? match.queryName
      if (!tagName) continue
      results.push({
        id: `tag:${tagName}`,
        kind: 'tag',
        title: `#${tagName}`,
        subtitle: t.commandPalette.tagConnections(match.items.length),
        ctaPath: '/control',
      })

      for (const item of match.items) {
        results.push({
          id: `tag:${tagName}:${item.entityType}:${item.id}`,
          kind: kindForConnection(item),
          title: item.title,
          subtitle: `#${tagName} - ${TAG_CONNECTION_KIND_LABEL[item.kind]}${item.subtitle ? ` - ${item.subtitle}` : ''}`,
          ctaPath: item.ctaPath,
        })
      }
    }

    return results.slice(0, 25)
  } catch {
    return []
  }
}

interface CommandPaletteProps {
  onShortcutHandled?: () => void
}

type PaletteShortcutEvent = Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>

function isOpenBesideShortcut(event: PaletteShortcutEvent): boolean {
  if (!event.ctrlKey && !event.metaKey) return false
  return (
    event.key === '/' ||
    event.key === '?' ||
    event.code === 'Slash' ||
    event.code === 'NumpadDivide' ||
    (event.code === 'Digit7' && event.shiftKey)
  )
}

function consumeKeyboardEvent(event: React.KeyboardEvent | KeyboardEvent) {
  event.preventDefault()
  event.stopPropagation()
  if ('nativeEvent' in event) {
    event.nativeEvent.stopImmediatePropagation?.()
  } else {
    event.stopImmediatePropagation?.()
  }
}

export function CommandPalette({ onShortcutHandled }: CommandPaletteProps) {
  const { t, language } = useI18n()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CommandResult[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const workspace = useWorkspaceLayout()
  const navResults = useMemo(() => getNavResults(language), [language])

  // Discovery hint: tras 3 sesiones sin abrir Cmd+K, mostrar tooltip una sola vez.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const ls = window.localStorage
      if (ls.getItem('core:cmdk:hintShown') === '1') return
      if ((Number(ls.getItem('core:cmdk:opens')) || 0) > 0) return
      const sessions = (Number(ls.getItem('core:cmdk:sessions')) || 0) + 1
      ls.setItem('core:cmdk:sessions', String(sessions))
      if (sessions >= 3) {
        setShowHint(true)
        ls.setItem('core:cmdk:hintShown', '1')
        const t = window.setTimeout(() => setShowHint(false), 8000)
        return () => window.clearTimeout(t)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')
      if (isCmdK) {
        e.preventDefault()
        onShortcutHandled?.()
        setOpen((prev) => {
          const next = !prev
          if (next && typeof window !== 'undefined') {
            try {
              const opens = (Number(window.localStorage.getItem('core:cmdk:opens')) || 0) + 1
              window.localStorage.setItem('core:cmdk:opens', String(opens))
            } catch {
              // ignore
            }
            setShowHint(false)
          }
          return next
        })
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onShortcutHandled])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
    else { setQuery(''); setResults([]); setActiveIndex(0) }
  }, [open])

  useEffect(() => {
    const q = query.trim().toLowerCase()
    const workspaceActions = searchWorkspaceActions(q, workspace.dualEnabled, t)
    if (!q) {
      setResults([...workspaceActions, ...navResults, ...searchPluginPages('', language)])
      setActiveIndex(0)
      return
    }
    let cancelled = false
    void (async () => {
      if (isTagSearchQuery(q)) {
        const tagResults = await searchTags(q, t)
        if (cancelled) return
        setResults(tagResults)
        setActiveIndex(0)
        return
      }

      const [notes, links, cards] = await Promise.all([
        searchNotes(q, t),
        searchLinks(q),
        searchCards(q),
      ])
      if (cancelled) return
      const foundNavResults = [...searchNav(q, navResults), ...searchPluginPages(q, language)]
      setResults([...workspaceActions, ...foundNavResults, ...cards, ...notes, ...links])
      setActiveIndex(0)
    })()
    return () => { cancelled = true }
  }, [language, navResults, query, t, workspace.dualEnabled])

  const visibleResults = useMemo(() => results.slice(0, 25), [results])

  const runAction = (actionId: NonNullable<CommandResult['actionId']>) => {
    if (actionId === 'workspace:open-dual') workspace.openDual()
    if (actionId === 'workspace:close-dual') workspace.closeDual()
    if (actionId === 'workspace:activate-primary') workspace.setActivePane('primary')
    if (actionId === 'workspace:activate-secondary') workspace.setActivePane('secondary')
  }

  const handleSelect = (result: CommandResult, pane?: WorkspacePaneId) => {
    setOpen(false)
    if (result.actionId) {
      runAction(result.actionId)
      return
    }
    workspace.navigateWorkspace(result.ctaPath, pane ? { pane, openDual: pane === 'secondary' } : undefined)
  }

  useEffect(() => {
    if (!open) return

    const handler = (event: KeyboardEvent) => {
      if (!isOpenBesideShortcut(event)) return
      consumeKeyboardEvent(event)
      const sel = visibleResults[activeIndex]
      if (sel) handleSelect(sel, 'secondary')
    }

    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [activeIndex, handleSelect, open, visibleResults])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (isOpenBesideShortcut(e)) {
      consumeKeyboardEvent(e)
      const sel = visibleResults[activeIndex]
      if (sel) handleSelect(sel, 'secondary')
    } else if (e.key === 'ArrowDown') {
      consumeKeyboardEvent(e)
      setActiveIndex((i) => Math.min(i + 1, visibleResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      consumeKeyboardEvent(e)
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      consumeKeyboardEvent(e)
      const sel = visibleResults[activeIndex]
      if (sel) handleSelect(sel)
    }
  }

  if (!open) {
    if (!showHint) return null
    return (
      <div
        className="fixed bottom-4 left-1/2 z-[90] -translate-x-1/2 animate-pulse rounded-full border border-accent/40 bg-surface-light/95 px-4 py-2 text-xs text-foreground shadow-2xl backdrop-blur"
        role="status"
      >
        <span>
          {t.commandPalette.hintPrefix}{' '}
          <kbd className="rounded bg-surface-lighter px-1.5 py-0.5 text-caption font-semibold text-accent-light">⌘</kbd>{' '}
          <kbd className="rounded bg-surface-lighter px-1.5 py-0.5 text-caption font-semibold text-accent-light">K</kbd>
        </span>
        <button
          onClick={() => setShowHint(false)}
          className="ml-3 text-muted hover:text-white"
          aria-label={t.common.close}
        >×</button>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-24 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label={t.commandPalette.aria}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface-light shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={16} className="text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.commandPalette.placeholder}
            aria-label={t.commandPalette.searchAria}
            role="combobox"
            aria-expanded={visibleResults.length > 0}
            aria-controls="command-palette-listbox"
            aria-activedescendant={visibleResults[activeIndex] ? `cmd-result-${visibleResults[activeIndex].id}` : undefined}
            aria-autocomplete="list"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted/70"
          />
          <button
            onClick={() => setOpen(false)}
            aria-label={t.commandPalette.close}
            className="rounded p-1 text-muted hover:text-white"
            title={t.commandPalette.closeTip}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div
          id="command-palette-listbox"
          role="listbox"
          aria-label={t.commandPalette.results}
          className="max-h-[55vh] overflow-y-auto p-2"
        >
          {visibleResults.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-foreground">{t.commandPalette.emptyTitle}</p>
              <p className="mt-1 text-xs text-muted">{t.commandPalette.emptyHint}</p>
            </div>
          ) : (
            visibleResults.map((r, i) => {
              const Icon = ICONS[r.kind]
              const active = i === activeIndex
              return (
                <button
                  type="button"
                  key={r.id}
                  id={`cmd-result-${r.id}`}
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(r)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    active ? 'bg-accent/15 text-white' : 'text-foreground/80 hover:bg-surface-lighter'
                  }`}
                >
                  <Icon size={14} className="shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{r.title}</p>
                    {r.subtitle && <p className="truncate text-xs text-muted">{r.subtitle}</p>}
                  </div>
                  <span className="shrink-0 rounded bg-surface-lighter px-1.5 py-0.5 text-micro uppercase tracking-wider text-muted">
                    {t.commandPalette.kinds[r.kind]}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border px-4 py-2 text-micro uppercase tracking-wider text-muted">
          <span><kbd className="rounded bg-surface-lighter px-1">↑</kbd> <kbd className="rounded bg-surface-lighter px-1">↓</kbd> {t.commandPalette.footerNavigate}</span>
          <span><kbd className="rounded bg-surface-lighter px-1">Enter</kbd> {t.commandPalette.footerOpen}</span>
          <span><kbd className="rounded bg-surface-lighter px-1">Ctrl</kbd>+<kbd className="rounded bg-surface-lighter px-1">/</kbd> {t.commandPalette.footerOpenBeside}</span>
          <span><kbd className="rounded bg-surface-lighter px-1">Esc</kbd> {t.commandPalette.footerClose}</span>
          <span className="flex items-center gap-1"><BarChart3 size={10} /> {t.commandPalette.resultCount(visibleResults.length)}</span>
        </div>
      </div>
    </div>
  )
}

export const CommandPaletteIcons = { Search, SlidersHorizontal, CalendarDays }
