import { useEffect, useState } from 'react'
import { Download, ExternalLink, RefreshCw, RotateCw } from 'lucide-react'
import { useI18n, type AppLanguage } from '@core/i18n'
import type { AppUpdateStatus } from '../../types'

function statusLabel(state: AppUpdateStatus['state'], language: AppLanguage): string {
  if (language === 'en') {
    switch (state) {
      case 'idle': return 'Idle'
      case 'checking': return 'Checking for updates...'
      case 'no-update': return 'You are on the latest version'
      case 'available': return 'An update is available'
      case 'downloading': return 'Downloading...'
      case 'downloaded': return 'Ready to install'
      case 'error': return 'Update error'
      case 'disabled': return 'Auto-update disabled'
      default: return state
    }
  }

  switch (state) {
    case 'idle': return 'En espera'
    case 'checking': return 'Buscando actualizacion...'
    case 'no-update': return 'Estas en la ultima version'
    case 'available': return 'Hay una actualizacion disponible'
    case 'downloading': return 'Descargando...'
    case 'downloaded': return 'Lista para instalar'
    case 'error': return 'Error en la actualizacion'
    case 'disabled': return 'Auto-update deshabilitado'
    default: return state
  }
}

export function AutoUpdateSection() {
  const { language } = useI18n()
  const bridge = window.appUpdate
  const [status, setStatus] = useState<AppUpdateStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!bridge) return
    let cancelled = false
    void bridge.getStatus().then((s) => {
      if (!cancelled) setStatus(s)
    })
    const off = bridge.onStatus((s) => {
      if (!cancelled) setStatus(s)
    })
    return () => {
      cancelled = true
      off()
    }
  }, [bridge])

  if (!bridge) {
    return (
      <section className="rounded-2xl border border-border bg-surface-light/40 p-5">
        <h2 className="text-lg font-semibold text-white">{language === 'en' ? 'Updates' : 'Actualizaciones'}</h2>
        <p className="mt-2 text-sm text-muted">
          {language === 'en' ? 'Not available in this environment.' : 'No disponible en este entorno.'}
        </p>
      </section>
    )
  }

  const state = status?.state ?? 'idle'
  const disabled = state === 'disabled'
  const downloading = state === 'downloading' || state === 'checking'

  const checkUpdate = async () => {
    setBusy(true)
    try { await bridge.checkForUpdates() } finally { setBusy(false) }
  }
  const downloadUpdate = async () => {
    setBusy(true)
    try { await bridge.downloadUpdate() } finally { setBusy(false) }
  }
  const installUpdate = async () => {
    setBusy(true)
    try { await bridge.quitAndInstall() } finally { setBusy(false) }
  }

  const version = status && 'version' in status ? status.version : null
  const percent = status && status.state === 'downloading' ? status.percent : null
  const errorMessage = status && status.state === 'error' ? status.message : null
  const manualDownloadUrl = status && status.state === 'error' ? status.manualDownloadUrl : null
  const disabledReason = status && status.state === 'disabled' ? status.reason : null

  return (
    <section className="rounded-2xl border border-border bg-surface-light/40 p-5 space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <RotateCw size={18} className="text-accent-light" />
          {language === 'en' ? 'Updates' : 'Actualizaciones'}
        </h2>
        <p className="text-xs text-muted mt-1">
          {language === 'en'
            ? 'Nora OS checks for updates automatically. You decide when to download and install.'
            : 'Nora OS busca actualizaciones automaticamente. Vos decidis cuando descargar e instalar.'}
        </p>
      </header>

      <div className="rounded-lg border border-border bg-surface px-3 py-3 text-sm space-y-1">
        <p className="text-white font-medium">{statusLabel(state, language)}</p>
        {version && (
          <p className="text-xs text-muted">{language === 'en' ? 'Version' : 'Version'}: {version}</p>
        )}
        {percent !== null && (
          <p className="text-xs text-muted">{language === 'en' ? 'Progress' : 'Progreso'}: {Math.round(percent)}%</p>
        )}
        {errorMessage && (
          <p className="text-xs text-rose-300">{errorMessage}</p>
        )}
        {manualDownloadUrl && (
          <a
            href={manualDownloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-light hover:text-white"
          >
            <ExternalLink size={13} aria-hidden />
            {language === 'en' ? 'Download from the official site' : 'Descargar desde el sitio oficial'}
          </a>
        )}
        {disabled && (
          <p className="text-xs text-muted">
            {disabledReason ?? (language === 'en'
              ? 'In development or electron-updater is not configured.'
              : 'En desarrollo o sin electron-updater configurado.')}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={checkUpdate}
          disabled={busy || downloading || disabled}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white hover:bg-surface-light disabled:opacity-40"
        >
          <RefreshCw size={14} /> {language === 'en' ? 'Check' : 'Buscar'}
        </button>
        <button
          type="button"
          onClick={downloadUpdate}
          disabled={busy || disabled || state !== 'available'}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white hover:bg-surface-light disabled:opacity-40"
        >
          <Download size={14} /> {language === 'en' ? 'Download' : 'Descargar'}
        </button>
        <button
          type="button"
          onClick={installUpdate}
          disabled={busy || state !== 'downloaded'}
          className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {language === 'en' ? 'Restart and install' : 'Reiniciar e instalar'}
        </button>
      </div>
    </section>
  )
}
