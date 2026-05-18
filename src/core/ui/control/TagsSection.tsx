import { useEffect, useState } from 'react'
import { ChevronDown, Plus, Tag, Trash2 } from 'lucide-react'
import { useI18n } from '@core/i18n'
import { tagsService, type Tag as TagModel, type TagUsage } from '@core/services/tagsService'
import { GlobalTagChip } from '@core/ui/components/GlobalTagPicker'

const PRESET_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280']

export function TagsSection() {
  const { language } = useI18n()
  const [tags, setTags] = useState<TagModel[]>([])
  const [usage, setUsage] = useState<Record<number, TagUsage>>({})
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(PRESET_COLORS[0])
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  const refresh = () => {
    void Promise.all([tagsService.list(), tagsService.usageCounts()]).then(([nextTags, counts]) => {
      setTags(nextTags)
      setUsage(Object.fromEntries(counts.map((item) => [item.id, item])))
    })
  }

  useEffect(() => { refresh() }, [])

  const create = async () => {
    setError('')
    try {
      await tagsService.ensure(name.trim(), color)
      setName('')
      refresh()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const removeTag = async (tag: TagModel) => {
    if (!window.confirm(language === 'en' ? `Delete tag "${tag.name}"?` : `Eliminar tag "${tag.name}"?`)) return
    await tagsService.remove(tag.id)
    refresh()
  }

  const totalUsage = Object.values(usage).reduce((sum, item) => sum + item.usage_count, 0)

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface-light/70">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="global-tags-body"
        className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-light"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-accent-light">
          <Tag size={16} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">
            {language === 'en' ? 'Global tags' : 'Tags globales'}
          </span>
          <span className="line-clamp-1 text-xs text-muted">
            {language === 'en'
              ? 'Shared tags for notes, Work, and Planner.'
              : 'Etiquetas compartidas para notas, Work y Planner.'}
          </span>
        </span>
        <span className="hidden shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-caption text-muted sm:inline">
          {language === 'en'
            ? `${tags.length} tags - ${totalUsage} uses`
            : `${tags.length} tags - ${totalUsage} usos`}
        </span>
        <ChevronDown
          size={17}
          className={`shrink-0 text-muted transition-transform group-hover:text-accent-light ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div id="global-tags-body" className="border-t border-border/60 px-4 pb-4 pt-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[14rem] flex-1 space-y-1">
              <span className="text-xs text-muted">{language === 'en' ? 'New tag' : 'Nuevo tag'}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej: cliente-acme"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-surface/70 px-2 py-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full border-2 transition-all ${color === c ? 'scale-110 border-white' : 'border-border'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => void create()}
              disabled={!name.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-50"
            >
              <Plus size={12} aria-hidden />
              {language === 'en' ? 'Create' : 'Crear'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-warning">{error}</p>}

          <div className="mt-4 flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
            {tags.length === 0 ? (
              <p className="text-xs text-muted">{language === 'en' ? 'No tags yet.' : 'Sin tags todavia.'}</p>
            ) : tags.map((tag) => (
              <div key={tag.id} className="inline-flex items-center gap-1 rounded-full">
                <GlobalTagChip
                  tag={tag}
                  count={usage[tag.id]?.usage_count ?? 0}
                />
                <button
                  type="button"
                  onClick={() => void removeTag(tag)}
                  className="rounded-md p-1 text-muted hover:bg-warning/10 hover:text-warning"
                  aria-label={language === 'en' ? `Delete tag ${tag.name}` : `Eliminar tag ${tag.name}`}
                >
                  <Trash2 size={11} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
