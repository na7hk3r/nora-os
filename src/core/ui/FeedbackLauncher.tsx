import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ExternalLink, MessageSquare, X } from 'lucide-react'
import { APP_VERSION } from '@core/utils/version'
import { eventBus } from '@core/events/EventBus'
import { useCoreStore } from '@core/state/coreStore'
import { useToast } from '@core/ui/components/ToastProvider'
import { buildFeedbackFormUrl, type FeedbackContext } from './feedback'

interface FeedbackLauncherProps {
  collapsed?: boolean
  feedbackFormUrl?: string
}

function getConfiguredFeedbackFormUrl(): string {
  return import.meta.env.VITE_FEEDBACK_FORM_URL ?? ''
}

function getPlatform(): string {
  if (typeof navigator === 'undefined') return 'unknown'
  return navigator.platform || 'unknown'
}

export function FeedbackLauncher({
  collapsed = false,
  feedbackFormUrl = getConfiguredFeedbackFormUrl(),
}: FeedbackLauncherProps) {
  const location = useLocation()
  const { toast } = useToast()
  const theme = useCoreStore((s) => s.settings.theme)
  const activePlugins = useCoreStore((s) => s.activePlugins)
  const [open, setOpen] = useState(false)
  const [attachContext, setAttachContext] = useState(false)

  const collectContext = (): FeedbackContext => ({
    version: APP_VERSION,
    route: `${location.pathname}${location.search}${location.hash}`,
    theme,
    activePlugins,
    platform: getPlatform(),
    recentEvents: eventBus.getHistory(20).map((entry) => ({
      event: entry.event,
      timestamp: entry.timestamp,
    })),
  })

  const openForm = () => {
    const url = buildFeedbackFormUrl(feedbackFormUrl, collectContext(), attachContext)
    if (!url) {
      toast.error('No hay formulario de feedback configurado para esta build.')
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
    toast.info('Se abrio el formulario de feedback en el navegador.')
    setOpen(false)
    setAttachContext(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Enviar feedback beta"
        aria-haspopup="dialog"
        className={
          collapsed
            ? 'mx-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:border-accent/40 hover:text-accent-light'
            : 'flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-white'
        }
        title="Enviar feedback beta"
      >
        <MessageSquare size={14} aria-hidden />
        {!collapsed && <span>Feedback</span>}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <section
            className="w-full max-w-md rounded-2xl border border-border bg-surface-light p-5 text-left text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-caption uppercase tracking-eyebrow text-muted">Beta</p>
                <h2 id="feedback-title" className="mt-1 text-lg font-semibold">
                  Tu opinion ayuda a mejorar Nora OS
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-md p-1.5 text-muted hover:bg-surface hover:text-white"
                aria-label="Cerrar feedback"
                title="Cerrar"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-muted">
              Se va a abrir un formulario simple en tu navegador. No necesitas una cuenta tecnica:
              podes contar que te gusto, que fallo o que te resulto confuso.
            </p>

            <label className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
              <input
                type="checkbox"
                checked={attachContext}
                onChange={(event) => setAttachContext(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span className="text-xs leading-relaxed text-muted">
                Adjuntar contexto tecnico basico: version, pantalla actual, tema, modulos activos,
                plataforma y eventos recientes sin contenido personal.
              </span>
            </label>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-xs text-muted hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={openForm}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85"
              >
                <ExternalLink size={13} aria-hidden />
                Abrir formulario
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
