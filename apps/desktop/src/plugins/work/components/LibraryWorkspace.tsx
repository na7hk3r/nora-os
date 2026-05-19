import { Link2, NotebookPen, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LinkManager } from './LinkManager'
import { NoteEditor } from './NoteEditor'
import { useWorkStore } from '../store'

export type LibraryTab = 'notes' | 'links'

interface LibraryWorkspaceProps {
  activeTab: LibraryTab
}

const tabMeta: Record<LibraryTab, { label: string; path: string; icon: LucideIcon }> = {
  notes: { label: 'Notas', path: '/notes', icon: NotebookPen },
  links: { label: 'Enlaces', path: '/links', icon: Link2 },
}

export function LibraryWorkspace({ activeTab }: LibraryWorkspaceProps) {
  const navigate = useNavigate()
  const notesCount = useWorkStore((state) => state.notes.length)
  const linksCount = useWorkStore((state) => state.links.length)

  const counts: Record<LibraryTab, number> = {
    notes: notesCount,
    links: linksCount,
  }

  return (
    <div className="library-workspace">
      <header className="library-header">
        <div className="min-w-0">
          <p className="text-micro uppercase tracking-eyebrow text-muted">Biblioteca</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Notas y enlaces</h1>
        </div>

        <div className="library-tabs" role="tablist" aria-label="Secciones de biblioteca">
          {(Object.keys(tabMeta) as LibraryTab[]).map((tab) => {
            const Icon = tabMeta[tab].icon
            const selected = activeTab === tab

            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`library-panel-${tab}`}
                className={`library-tab ${selected ? 'library-tab-active' : ''}`}
                onClick={() => navigate(tabMeta[tab].path)}
              >
                <Icon size={14} aria-hidden />
                <span>{tabMeta[tab].label}</span>
                <span className="library-tab-count">{counts[tab]}</span>
              </button>
            )
          })}
        </div>
      </header>

      <section
        id={`library-panel-${activeTab}`}
        role="tabpanel"
        aria-label={tabMeta[activeTab].label}
        className="library-panel"
      >
        {activeTab === 'notes' ? <NoteEditor /> : <LinkManager />}
      </section>
    </div>
  )
}
