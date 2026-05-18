import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, MessageSquare, Send } from 'lucide-react'
import { Button } from '../components/Button'
import { NoraLogo } from '../components/NoraLogo'

const FEEDBACK_ENDPOINT = import.meta.env.VITE_FEEDBACK_ENDPOINT ?? ''
const LANDING_HOME = import.meta.env.BASE_URL || '/'

interface FeedbackContext {
  version: string
  route: string
  theme: string
  activePlugins: string
  platform: string
  recentEvents: string
}

function getFeedbackEndpoint(): string {
  return FEEDBACK_ENDPOINT.trim()
}

function readFeedbackContext(): FeedbackContext {
  const params = new URLSearchParams(window.location.search)

  const hashQueryIndex = window.location.hash.indexOf('?')
  if (hashQueryIndex >= 0) {
    const hashParams = new URLSearchParams(window.location.hash.slice(hashQueryIndex + 1))
    hashParams.forEach((value, key) => {
      if (!params.has(key)) params.set(key, value)
    })
  }

  return {
    version: params.get('version') ?? '',
    route: params.get('route') ?? '',
    theme: params.get('theme') ?? '',
    activePlugins: params.get('activePlugins') ?? '',
    platform: params.get('platform') ?? '',
    recentEvents: params.get('recentEvents') ?? '',
  }
}

interface FeedbackPageProps {
  feedbackEndpoint?: string
}

export function FeedbackPage({ feedbackEndpoint = getFeedbackEndpoint() }: FeedbackPageProps) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')
  const iframeName = useRef(`feedback-target-${Math.random().toString(36).slice(2)}`)
  const fallbackTimer = useRef<number | null>(null)
  const endpoint = feedbackEndpoint.trim()
  const context = useMemo(readFeedbackContext, [])

  useEffect(() => {
    return () => {
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current)
    }
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    setError('')
    if (!endpoint) {
      event.preventDefault()
      setError('El formulario temporal todavía no está configurado.')
      return
    }
    setStatus('sending')

    if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current)
    fallbackTimer.current = window.setTimeout(() => {
      setStatus('sent')
    }, 1800)
  }

  return (
    <main id="main" className="min-h-screen px-4 pb-16 pt-24 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href={LANDING_HOME}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/70 px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-light hover:text-foreground"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Volver a Nora OS
          </a>
          <NoraLogo variant="wordmark" size={24} />
        </div>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface/80 shadow-glow-sm backdrop-blur">
          <div className="border-b border-border bg-surface-light/70 px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent-light">
                <MessageSquare size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Beta privada</p>
                <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
                  Contanos qué tal va Nora OS
                </h1>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
              Este formulario es simple y temporal. Escribi con tus palabras que funciono,
              que fallo o que te resulto confuso. No necesitas cuenta de GitHub.
            </p>
          </div>

          {status === 'sent' ? (
            <div className="px-5 py-8 sm:px-7">
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Gracias, feedback enviado.</h2>
                    <p className="mt-1 text-sm text-muted">
                      Si dejaste un contacto, podemos responderte cuando revisemos la beta.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <Button as="a" href={LANDING_HOME} variant="secondary" leftIcon={<ArrowLeft size={16} />}>
                  Volver al sitio
                </Button>
              </div>
            </div>
          ) : (
            <form
              aria-label="Formulario de feedback beta"
              action={endpoint}
              method="POST"
              target={iframeName.current}
              onSubmit={handleSubmit}
              className="space-y-5 px-5 py-6 sm:px-7"
            >
              <input type="hidden" name="_subject" value="Nora OS beta feedback" />
              <input type="hidden" name="_template" value="table" />
              <input type="hidden" name="_captcha" value="false" />
              <input type="hidden" name="source" value="Nora OS landing feedback" />
              <input type="hidden" name="version" value={context.version} />
              <input type="hidden" name="route" value={context.route} />
              <input type="hidden" name="theme" value={context.theme} />
              <input type="hidden" name="activePlugins" value={context.activePlugins} />
              <input type="hidden" name="platform" value={context.platform} />
              <input type="hidden" name="recentEvents" value={context.recentEvents} />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Tu nombre</span>
                  <input
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Opcional"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Contacto</span>
                  <input
                    name="contact"
                    type="text"
                    autoComplete="email"
                    placeholder="Email, Discord, Telegram..."
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Tipo de feedback</span>
                  <select
                    name="kind"
                    defaultValue="opinion"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                  >
                    <option value="opinion">Opinion general</option>
                    <option value="bug">Algo fallo</option>
                    <option value="confusing">Algo fue confuso</option>
                    <option value="idea">Idea o mejora</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Puntaje rapido</span>
                  <select
                    name="rating"
                    defaultValue=""
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                  >
                    <option value="">Sin puntaje</option>
                    <option value="5">5 - Muy bien</option>
                    <option value="4">4 - Bien</option>
                    <option value="3">3 - Regular</option>
                    <option value="2">2 - Complicado</option>
                    <option value="1">1 - No pude usarla</option>
                  </select>
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Tu mensaje</span>
                <textarea
                  name="message"
                  required
                  rows={7}
                  maxLength={4000}
                  placeholder="Ej: me costo encontrar..., me gusto..., cuando toque... paso..."
                  className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted/70 focus:border-accent"
                />
              </label>

              {error && (
                <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                <p className="max-w-md text-xs leading-relaxed text-muted">
                  {status === 'sending'
                    ? 'Enviando feedback...'
                    : 'El envío ocurre dentro de esta página. No se abre GitHub ni tu cliente de correo.'}
                </p>
                <Button type="submit" disabled={status === 'sending'} rightIcon={<Send size={16} />}>
                  {status === 'sending' ? 'Enviando...' : 'Enviar feedback'}
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>

      <iframe
        title="Destino invisible del formulario de feedback"
        name={iframeName.current}
        className="hidden"
      />
    </main>
  )
}
