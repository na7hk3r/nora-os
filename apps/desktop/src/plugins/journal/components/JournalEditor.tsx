import { useEffect, useMemo, useState, useRef } from 'react'
import { Save, Pin, PinOff, Trash2, Wand2 } from 'lucide-react'
import { useJournalStore } from '../store'
import { upsertEntry, deleteEntry, togglePin } from '../operations'
import { countWords, parseTagsInput, tagsToString, todayISO, moodLabel } from '../utils'
import { messages } from '@core/ui/messages'
import { useToast } from '@core/ui/components/ToastProvider'
import type { JournalEntry } from '../types'

interface Props {
  date?: string
  onAfterSave?: (entry: JournalEntry) => void
}

/**
 * Editor inline de la entrada de un día. Si no existe, se crea al guardar.
 */
export function JournalEditor({ date = todayISO(), onAfterSave }: Props) {
  const entries = useJournalStore((s) => s.entries)
  const prompts = useJournalStore((s) => s.prompts)
  const { toast } = useToast()
  const taRef = useRef<HTMLTextAreaElement>(null)

  const existing = useMemo(() => entries.find((e) => e.date === date), [entries, date])

  const [title, setTitle] = useState(existing?.title ?? '')
  const [content, setContent] = useState(existing?.content ?? '')
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null)
  const [tagsInput, setTagsInput] = useState(existing ? tagsToString(existing.tags) : '')
  const [promptId, setPromptId] = useState<string | null>(existing?.promptId ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync cuando cambia la entrada cargada (cambio de fecha o reload).
  useEffect(() => {
    setTitle(existing?.title ?? '')
    setContent(existing?.content ?? '')
    setMood(existing?.mood ?? null)
    setTagsInput(existing ? tagsToString(existing.tags) : '')
    setPromptId(existing?.promptId ?? null)
    setError(null)
  }, [existing?.id])

  const wordCount = useMemo(() => countWords(content), [content])
  const dirty =
    (existing?.content ?? '') !== content ||
    (existing?.title ?? '') !== title ||
    (existing?.mood ?? null) !== mood ||
    (existing ? tagsToString(existing.tags) : '') !== tagsInput ||
    (existing?.promptId ?? null) !== promptId

  const handleSave = async () => {
    if (!content.trim()) {
      setError(messages.errors.journalEmpty)
      return
    }
    setError(null)
    setBusy(true)
    try {
      const tags = parseTagsInput(tagsInput)
      const entry = await upsertEntry({ date, title, content, mood, promptId, tags })
      toast.success(messages.success.journalEntrySaved)
      onAfterSave?.(entry)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!existing) return
    const id = existing.id
    const snapshot = existing
    await deleteEntry(id)
    toast.undo({
      message: messages.success.journalEntryDeleted,
      onUndo: async () => {
        await upsertEntry({
          date: snapshot.date,
          mood: snapshot.mood,
          promptId: snapshot.promptId,
          title: snapshot.title,
          content: snapshot.content,
          tags: snapshot.tags,
        })
      },
    })
  }

  const handlePromptApply = (id: string) => {
    setPromptId(id)
    const p = prompts.find((x) => x.id === id)
    if (p && !content.includes(p.text)) {
      setContent((c) => (c ? `${c}\n\n${p.text}\n` : `${p.text}\n\n`))
      requestAnimationFrame(() => taRef.current?.focus())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      void handleSave()
    }
  }

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl" onKeyDown={handleKeyDown} aria-label={`Editor de entrada del ${date}`}>
      <header className="flex flex-wrap items-center gap-2">
        <span className="text-caption uppercase tracking-eyebrow text-muted">Entrada</span>
        <span className="text-sm text-white">{date}</span>
        {existing && (
          <button
            type="button"
            onClick={() => togglePin(existing.id)}
            aria-label={existing.pinned ? 'Quitar fijado' : 'Fijar entrada'}
            className="ml-auto rounded-md border border-border px-2 py-1 text-xs text-white hover:border-accent"
          >
            {existing.pinned ? <PinOff size={12} aria-hidden="true" /> : <Pin size={12} aria-hidden="true" />}
          </button>
        )}
      </header>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título (opcional)"
        maxLength={120}
        aria-label="Título de la entrada"
        className="block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
      />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label htmlFor="journal-mood" className="text-muted">Mood</label>
        <select
          id="journal-mood"
          value={mood ?? ''}
          onChange={(e) => setMood(e.target.value === '' ? null : Number.parseInt(e.target.value, 10))}
          className="rounded-md border border-border bg-surface px-2 py-1 text-white outline-none focus:border-accent"
        >
          <option value="">Sin registrar</option>
          <option value="1">{moodLabel(1)}</option>
          <option value="2">{moodLabel(2)}</option>
          <option value="3">{moodLabel(3)}</option>
          <option value="4">{moodLabel(4)}</option>
          <option value="5">{moodLabel(5)}</option>
        </select>

        <label htmlFor="journal-prompt" className="text-muted ml-2">Prompt</label>
        <select
          id="journal-prompt"
          value={promptId ?? ''}
          onChange={(e) => handlePromptApply(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1 text-white outline-none focus:border-accent"
        >
          <option value="">Sin prompt</option>
          {prompts.map((p) => (
            <option key={p.id} value={p.id}>{p.text}</option>
          ))}
        </select>
      </div>

      <textarea
        ref={taRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escribí lo que tengas en la cabeza."
        rows={12}
        aria-label="Contenido de la entrada"
        className="block w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
      />

      <input
        type="text"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="#tag1 #tag2 (opcional, separados por coma o espacio)"
        aria-label="Tags de la entrada"
        className="block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
      />

      {error && <p className="text-xs text-rose-300" role="alert">{error}</p>}

      <footer className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted">{wordCount} palabras</span>
        <span className="ml-auto flex items-center gap-2">
          {existing && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1 rounded-md border border-rose-400/40 px-3 py-1.5 text-rose-200 hover:border-rose-400"
              aria-label="Borrar entrada"
            >
              <Trash2 size={12} aria-hidden="true" /> Borrar
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !dirty}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 font-medium text-white hover:bg-accent/80 disabled:opacity-50"
            aria-label="Guardar entrada (Ctrl+S)"
            title="Ctrl+S"
          >
            <Save size={12} aria-hidden="true" /> Guardar
          </button>
        </span>
      </footer>
      <p className="sr-only" aria-live="polite">{busy ? 'Guardando' : ''}</p>
      <Wand2 className="hidden" aria-hidden="true" />
    </article>
  )
}
