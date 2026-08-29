import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { App } from '@/App'
import { I18nProvider } from '@core/i18n'
import { NoraLogoMark } from '@core/ui/components/NoraLogo'
import { initBridges } from './bridge/bootstrap'
import '@/index.css'

function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service Worker registration failed', err)
    })
  })
}

registerServiceWorker()

function NoraWeb() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    initBridges()
      .then(() => setReady(true))
      .catch((e) => setError(e))
  }, [])

  if (error) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_#1d0e3d_0%,_#110a24_42%,_#07060d_100%)] text-white">
        <div className="pointer-events-none absolute -left-32 top-1/4 h-[480px] w-[480px] rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-accent-light/10 blur-3xl" />
        <div className="relative rounded-2xl border border-white/10 bg-surface-light/70 px-10 py-8 text-center shadow-2xl backdrop-blur">
          <NoraLogoMark size={64} glow className="mx-auto mb-4" />
          <p className="text-base font-medium">Nora no pudo iniciar</p>
          <pre className="mt-2 max-w-md text-left text-xs text-red-400 break-words">{error.message}</pre>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_#1d0e3d_0%,_#110a24_42%,_#07060d_100%)] text-white">
        <div className="pointer-events-none absolute -left-32 top-1/4 h-[480px] w-[480px] rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-accent-light/10 blur-3xl" />
        <div className="relative rounded-2xl border border-white/10 bg-surface-light/70 px-10 py-8 text-center shadow-2xl backdrop-blur">
          <NoraLogoMark size={64} glow className="mx-auto mb-4 animate-pulse" />
          <p className="mt-2 text-base font-medium">Iniciando Nora…</p>
        </div>
      </div>
    )
  }

  return (
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<NoraWeb />)
