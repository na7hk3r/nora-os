import { useEffect, useMemo, useState } from 'react'
import { Brain, Plus } from 'lucide-react'
import { useKnowledgeStore } from '../store'
import { createFlashcard, deleteFlashcard, reviewFlashcard } from '../operations'
import { dueFlashcards, isMastered } from '../utils'

const QUALITY_BUTTONS: Array<{ value: number; label: string; help: string; tone: string }> = [
  { value: 0, label: 'Otra vez', help: 'No me acuerdo', tone: 'border-rose-500/50 text-rose-200' },
  { value: 3, label: 'Difícil', help: 'Lo sabía pero costó', tone: 'border-amber-500/50 text-amber-200' },
  { value: 4, label: 'Bien', help: 'Lo recordé', tone: 'border-emerald-500/50 text-emerald-200' },
  { value: 5, label: 'Fácil', help: 'Trivial', tone: 'border-sky-500/50 text-sky-200' },
]

export function KnowledgeReviewPage() {
  const flashcards = useKnowledgeStore((s) => s.flashcards)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const queue = useMemo(
    () => dueFlashcards(flashcards).sort((a, b) => a.nextReview.localeCompare(b.nextReview)),
    [flashcards],
  )
  const current = queue[0]
  const mastered = useMemo(() => flashcards.filter(isMastered).length, [flashcards])

  useEffect(() => {
    setShowAnswer(false)
  }, [current?.id])

  async function rate(quality: number) {
    if (!current) return
    await reviewFlashcard(current.id, quality)
    setShowAnswer(false)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-caption uppercase tracking-eyebrow text-muted">Repaso</p>
          <h1 className="text-2xl font-semibold text-white">
            {queue.length} pendientes · {flashcards.length} totales · {mastered} dominadas
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1 self-start rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs text-white hover:border-accent/70"
        >
          <Plus size={12} aria-hidden="true" />
          {showAdd ? 'Cerrar' : 'Nueva flashcard'}
        </button>
      </header>

      {showAdd && <FlashcardQuickAdd onCreated={() => setShowAdd(false)} />}

      {!current ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center text-sm text-muted">
          {flashcards.length === 0
            ? 'No tenés flashcards. Creá una o convertí highlights.'
            : '🎉 No hay nada para repasar hoy. Volvé mañana.'}
        </div>
      ) : (
        <article className="space-y-4 rounded-2xl border border-border bg-surface-light/90 p-6">
          <div className="flex items-center gap-2 text-caption uppercase tracking-wide text-muted">
            <Brain size={12} className="text-accent-light" aria-hidden="true" />
            <span>{current.deck}</span>
            <span className="ml-auto">
              ease {current.ease.toFixed(2)} · interval {current.interval}d · reps {current.repetitions}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-lg text-white">{current.front}</p>

          {showAnswer ? (
            <>
              <hr className="border-border" />
              <p className="whitespace-pre-wrap text-base text-white">{current.back}</p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {QUALITY_BUTTONS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => rate(b.value)}
                    className={`rounded-xl border bg-surface px-3 py-3 text-sm font-medium hover:bg-surface-light ${b.tone}`}
                  >
                    <div>{b.label}</div>
                    <div className="text-micro font-normal opacity-70">{b.help}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowAnswer(true)}
              className="w-full rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-white hover:border-accent/70"
            >
              Mostrar respuesta
            </button>
          )}

          <button
            type="button"
            onClick={async () => {
              if (!confirm('¿Eliminar esta flashcard?')) return
              await deleteFlashcard(current.id)
            }}
            className="text-caption text-muted hover:text-rose-200"
          >
            Eliminar flashcard
          </button>
        </article>
      )}
    </div>
  )
}

function FlashcardQuickAdd({ onCreated }: { onCreated: () => void }) {
  const resources = useKnowledgeStore((s) => s.resources)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [deck, setDeck] = useState('general')
  const [resourceId, setResourceId] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!front.trim() || !back.trim() || busy) return
    setBusy(true)
    try {
      await createFlashcard({
        front,
        back,
        deck,
        resourceId: resourceId || null,
      })
      setFront('')
      setBack('')
      onCreated()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-light/80 p-4"
    >
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          value={deck}
          onChange={(e) => setDeck(e.target.value)}
          placeholder="Deck"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted"
        />
        <select
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-white"
        >
          <option value="">Sin recurso</option>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
      </div>
      <textarea
        required
        value={front}
        onChange={(e) => setFront(e.target.value)}
        placeholder="Pregunta / front"
        rows={2}
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted"
      />
      <textarea
        required
        value={back}
        onChange={(e) => setBack(e.target.value)}
        placeholder="Respuesta / back"
        rows={2}
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted"
      />
      <button
        type="submit"
        disabled={busy || !front.trim() || !back.trim()}
        className="self-end rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs text-white hover:border-accent/70 disabled:opacity-50"
      >
        Crear
      </button>
    </form>
  )
}
