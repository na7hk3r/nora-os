import { useMemo, useState } from 'react'
import {
  Check,
  Code2,
  ExternalLink,
  FileText,
  Globe,
  Link as LinkIcon,
  PlaySquare,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { useWorkStore } from '../store'
import type { Link as LinkRecord } from '../types'

function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    return new URL(withProtocol).toString()
  } catch {
    return withProtocol
  }
}

function displayUrl(url: string): string {
  try {
    const parsed = new URL(normalizeUrl(url))
    const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '')
    return `${parsed.hostname}${path}`
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
  }
}

function fallbackTitleForUrl(url: string): string {
  const display = displayUrl(url)
  return display || url
}

function iconForUrl(url: string) {
  try {
    const host = new URL(normalizeUrl(url)).hostname.toLowerCase()
    if (host.includes('github.com') || host.includes('gitlab.com') || host.includes('bitbucket.')) return Code2
    if (host.includes('youtube.com') || host.includes('youtu.be') || host.includes('vimeo.com')) return PlaySquare
    if (host.includes('notion.so') || host.includes('docs.google.com') || host.includes('confluence.')) return FileText
  } catch {
    // Fallback offline: no favicons remotos ni metadata externa.
  }
  return Globe
}

export function LinkManager() {
  const { links, setLinks } = useWorkStore()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ title: string; url: string; category: string }>({
    title: '',
    url: '',
    category: '',
  })
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const allCategories = useMemo(
    () => [...new Set(links.map((link) => link.category.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [links],
  )

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return links.filter((link) => {
      if (selectedCategory && link.category !== selectedCategory) return false
      if (!q) return true
      return (
        link.title.toLowerCase().includes(q) ||
        link.url.toLowerCase().includes(q) ||
        link.category.toLowerCase().includes(q) ||
        displayUrl(link.url).toLowerCase().includes(q)
      )
    })
  }, [links, search, selectedCategory])

  const categories = useMemo(
    () => [...new Set(filteredLinks.map((link) => link.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [filteredLinks],
  )

  const uncategorized = filteredLinks.filter((link) => !link.category)

  const handleAdd = async () => {
    const normalizedUrl = normalizeUrl(url)
    if (!normalizedUrl) return

    const link: LinkRecord = {
      id: crypto.randomUUID(),
      title: title.trim() || fallbackTitleForUrl(normalizedUrl),
      url: normalizedUrl,
      category: category.trim(),
    }

    setLinks([...links, link])
    setTitle('')
    setUrl('')
    setCategory('')

    await window.storage.execute(
      'INSERT INTO work_links (id, title, url, category) VALUES (?, ?, ?, ?)',
      [link.id, link.title, link.url, link.category],
    )
  }

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      window.setTimeout(() => setConfirmDeleteId((cur) => (cur === id ? null : cur)), 3000)
      return
    }

    setLinks(links.filter((link) => link.id !== id))
    setConfirmDeleteId(null)
    await window.storage.execute('DELETE FROM work_links WHERE id = ?', [id])
  }

  const startEdit = (link: LinkRecord) => {
    setEditingId(link.id)
    setEditDraft({ title: link.title, url: link.url, category: link.category })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft({ title: '', url: '', category: '' })
  }

  const saveEdit = async () => {
    if (!editingId) return
    const normalizedUrl = normalizeUrl(editDraft.url)
    if (!normalizedUrl) return

    const trimmed = {
      title: editDraft.title.trim() || fallbackTitleForUrl(normalizedUrl),
      url: normalizedUrl,
      category: editDraft.category.trim(),
    }

    setLinks(links.map((link) => (link.id === editingId ? { ...link, ...trimmed } : link)))
    await window.storage.execute(
      'UPDATE work_links SET title = ?, url = ?, category = ? WHERE id = ?',
      [trimmed.title, trimmed.url, trimmed.category, editingId],
    )
    cancelEdit()
  }

  return (
    <div className="library-link-manager">
      <div className="border-b border-border/55 bg-surface-light/45 p-3">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.15fr)_minmax(10rem,0.7fr)_auto]">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Titulo del enlace"
            placeholder="Titulo opcional"
            className="min-w-0 rounded-lg border border-border/70 bg-surface/75 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
          />
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            aria-label="URL del enlace"
            placeholder="URL"
            className="min-w-0 rounded-lg border border-border/70 bg-surface/75 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
          />
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Categoria del enlace"
            placeholder="Categoria"
            className="min-w-0 rounded-lg border border-border/70 bg-surface/75 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!url.trim()}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-accent px-3 text-sm text-white hover:bg-accent/85 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Agregar enlace"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar enlaces"
              placeholder="Buscar enlaces..."
              className="w-full rounded-lg border border-border/70 bg-surface/70 py-2 pl-9 pr-3 text-sm placeholder:text-muted/50 focus:border-accent/60 focus:outline-none"
            />
          </div>

          {allCategories.length > 0 && (
            <div className="flex max-w-full gap-1 overflow-x-auto">
              <CategoryChip
                label="Todas"
                count={links.length}
                selected={!selectedCategory}
                onClick={() => setSelectedCategory(null)}
              />
              {allCategories.map((cat) => (
                <CategoryChip
                  key={cat}
                  label={cat}
                  count={links.filter((link) => link.category === cat).length}
                  selected={selectedCategory === cat}
                  onClick={() => setSelectedCategory(cat)}
                />
              ))}
            </div>
          )}
        </div>

        {links.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">No hay enlaces guardados</p>
        )}

        {links.length > 0 && filteredLinks.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">Sin resultados para &quot;{search || selectedCategory}&quot;</p>
        )}

        {uncategorized.length > 0 && (
          <LinkGroup
            title="Sin categoria"
            links={uncategorized}
            editingId={editingId}
            editDraft={editDraft}
            confirmDeleteId={confirmDeleteId}
            onStartEdit={startEdit}
            onCancelEdit={cancelEdit}
            onSaveEdit={saveEdit}
            onEditDraftChange={setEditDraft}
            onDelete={handleDelete}
          />
        )}

        {categories.map((cat) => (
          <LinkGroup
            key={cat}
            title={cat}
            links={filteredLinks.filter((link) => link.category === cat)}
            editingId={editingId}
            editDraft={editDraft}
            confirmDeleteId={confirmDeleteId}
            onStartEdit={startEdit}
            onCancelEdit={cancelEdit}
            onSaveEdit={saveEdit}
            onEditDraftChange={setEditDraft}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}

interface CategoryChipProps {
  label: string
  count: number
  selected: boolean
  onClick: () => void
}

function CategoryChip({ label, count, selected, onClick }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-caption transition-colors ${
        selected
          ? 'border-accent/40 bg-accent/15 text-accent-light'
          : 'border-border/70 bg-surface/55 text-muted hover:border-accent/30 hover:text-white'
      }`}
    >
      <Tag size={11} aria-hidden />
      <span className="max-w-28 truncate">{label}</span>
      <span className="text-micro text-muted/70">{count}</span>
    </button>
  )
}

interface LinkGroupProps {
  title: string
  links: LinkRecord[]
  editingId: string | null
  editDraft: { title: string; url: string; category: string }
  confirmDeleteId: string | null
  onStartEdit: (link: LinkRecord) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onEditDraftChange: (draft: { title: string; url: string; category: string }) => void
  onDelete: (id: string) => void
}

function LinkGroup({
  title,
  links,
  editingId,
  editDraft,
  confirmDeleteId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditDraftChange,
  onDelete,
}: LinkGroupProps) {
  return (
    <section className="rounded-lg border border-border/65 bg-surface-light/35">
      <header className="flex items-center justify-between border-b border-border/45 px-3 py-2">
        <h4 className="truncate text-sm font-semibold text-white">{title}</h4>
        <span className="text-micro text-muted">{links.length}</span>
      </header>
      <div className="divide-y divide-border/35">
        {links.map((link) => (
          <LinkRow
            key={link.id}
            link={link}
            isEditing={editingId === link.id}
            editDraft={editDraft}
            confirmingDelete={confirmDeleteId === link.id}
            onStartEdit={() => onStartEdit(link)}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
            onEditDraftChange={onEditDraftChange}
            onDelete={() => onDelete(link.id)}
          />
        ))}
      </div>
    </section>
  )
}

interface LinkRowProps {
  link: LinkRecord
  isEditing: boolean
  editDraft: { title: string; url: string; category: string }
  confirmingDelete: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onEditDraftChange: (draft: { title: string; url: string; category: string }) => void
  onDelete: () => void
}

function LinkRow({
  link,
  isEditing,
  editDraft,
  confirmingDelete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditDraftChange,
  onDelete,
}: LinkRowProps) {
  const Icon = iconForUrl(link.url)

  if (isEditing) {
    return (
      <div className="space-y-2 bg-surface/50 p-2">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(9rem,0.6fr)]">
          <input
            value={editDraft.title}
            onChange={(event) => onEditDraftChange({ ...editDraft, title: event.target.value })}
            aria-label="Editar titulo del enlace"
            placeholder="Titulo opcional"
            className="min-w-0 rounded border border-border bg-surface-light px-2 py-1.5 text-sm focus:border-accent/60 focus:outline-none"
          />
          <input
            value={editDraft.url}
            onChange={(event) => onEditDraftChange({ ...editDraft, url: event.target.value })}
            aria-label="Editar URL del enlace"
            placeholder="URL"
            className="min-w-0 rounded border border-border bg-surface-light px-2 py-1.5 text-sm focus:border-accent/60 focus:outline-none"
          />
          <input
            value={editDraft.category}
            onChange={(event) => onEditDraftChange({ ...editDraft, category: event.target.value })}
            aria-label="Editar categoria del enlace"
            placeholder="Categoria"
            className="min-w-0 rounded border border-border bg-surface-light px-2 py-1.5 text-sm focus:border-accent/60 focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted hover:text-white"
          >
            <X size={12} />
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSaveEdit}
            disabled={!editDraft.url.trim()}
            className="inline-flex items-center gap-1 rounded bg-accent px-2 py-1 text-xs text-white hover:bg-accent/85 disabled:opacity-50"
          >
            <Check size={12} />
            Guardar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex min-w-0 items-center gap-2 px-3 py-2 hover:bg-surface/55">
      <a
        href={normalizeUrl(link.url)}
        target="_blank"
        rel="noopener noreferrer"
        className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 text-sm"
      >
        <Icon size={15} className="row-span-2 shrink-0 text-muted" />
        <span className="truncate font-medium text-accent-light">{link.title}</span>
        <ExternalLink size={12} className="row-span-2 shrink-0 text-muted/55" />
        <span className="truncate text-micro text-muted/70">{displayUrl(link.url)}</span>
      </a>

      {link.category && (
        <span className="workspace-pane-hide-narrow hidden max-w-32 shrink-0 truncate rounded-full border border-border/60 bg-surface/60 px-2 py-0.5 text-micro text-muted md:inline">
          {link.category}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={onStartEdit}
          title="Editar"
          aria-label={`Editar ${link.title}`}
          className="rounded p-1 text-muted hover:bg-surface-lighter hover:text-accent-light"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title={confirmingDelete ? 'Confirmar eliminacion' : 'Eliminar'}
          aria-label={confirmingDelete ? `Confirmar eliminacion de ${link.title}` : `Eliminar ${link.title}`}
          className={`rounded p-1 ${
            confirmingDelete ? 'bg-red-500/15 text-red-300' : 'text-muted hover:bg-red-500/10 hover:text-red-400'
          }`}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}
