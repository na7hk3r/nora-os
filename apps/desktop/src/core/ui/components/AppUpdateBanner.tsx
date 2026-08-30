import { useEffect, useState } from 'react'
import { Download, RotateCw, X } from 'lucide-react'
import { useI18n } from '@core/i18n'
import type { AppUpdateStatus } from '../../types'

/**
 * Banner global mínimo que aparece cuando hay una actualización lista.
 * Solo se muestra en estados 'available' y 'downloaded'.
 */
export function AppUpdateBanner() {
  const { language } = useI18n()
  const bridge = window.appUpdate
  const [status, setStatus] = useState<AppUpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!bridge) return
    let cancelled = false
    void bridge.getStatus().then((s) => {
      if (!cancelled) setStatus(s)
    })
    const off = bridge.onStatus((s) => {
      if (!cancelled) {
        setStatus(s)
        setDismissed(false)
      }
    })
    return () => {
      cancelled = true
      off()
    }
  }, [bridge])

  if (!bridge || !status || dismissed) return null
  if (status.state !== 'available' && status.state !== 'downloaded') return null

  const en = language === 'en'
  const isDownloaded = status.state === 'downloaded'
  const version = 'version' in status ? status.version : null

  const action = async () => {
    setBusy(true)
    try {
      if (isDownloaded) await bridge.quitAndInstall()
      else await bridge.downloadUpdate()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-full border border-accent/40 bg-surface-light/95 px-4 py-2 text-sm shadow-2xl backdrop-blur">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-accent-light">
        {isDownloaded ? <RotateCw size={14} /> : <Download size={14} />}
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-white font-medium">
          {isDownloaded ? (en ? 'Update ready' : 'Actualización lista') : (en ? 'An update is available' : 'Hay una actualización disponible')}
        </span>
        {version && (
          <span className="text-caption text-muted">{en ? 'Version' : 'Versión'} {version}</span>
        )}
      </div>
      <button
        type="button"
        onClick={action}
        disabled={busy}
        className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white hover:bg-accent/80 disabled:opacity-40"
      >
        {isDownloaded ? (en ? 'Restart and install' : 'Reiniciar e instalar') : (en ? 'Download' : 'Descargar')}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded-full p-1 text-muted hover:bg-surface hover:text-white"
        title={en ? 'Close' : 'Cerrar'}
        aria-label={en ? 'Close' : 'Cerrar'}
      >
        <X size={14} />
      </button>
    </div>
  )
}
