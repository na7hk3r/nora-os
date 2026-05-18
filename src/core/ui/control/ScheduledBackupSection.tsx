import { useEffect, useState } from 'react'
import { CalendarClock, FolderOpen, KeyRound, Play, Save, ShieldCheck } from 'lucide-react'
import { useI18n } from '@core/i18n'
import type { ScheduledBackupConfig, ScheduledBackupStatus } from '../../types'

const FREQ_OPTIONS = [
  { value: 1, label: 'Diario' },
  { value: 3, label: 'Cada 3 días' },
  { value: 7, label: 'Semanal' },
  { value: 14, label: 'Cada 2 semanas' },
  { value: 30, label: 'Mensual' },
]

function formatDate(
  iso: string | null,
  formatDateTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string,
): string {
  if (!iso) return '—'
  try {
    return formatDateTime(iso)
  } catch {
    return iso
  }
}

export function ScheduledBackupSection() {
  const { formatDateTime, language, t } = useI18n()
  const bridge = window.scheduledBackup
  const [status, setStatus] = useState<ScheduledBackupStatus | null>(null)
  const [draftConfig, setDraftConfig] = useState<ScheduledBackupConfig | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const refresh = async () => {
    if (!bridge) return
    const result = await bridge.getStatus()
    setStatus(result)
    setDraftConfig(result.config)
  }

  useEffect(() => {
    void refresh()
  }, [])

  if (!bridge) {
    return (
      <section className="rounded-2xl border border-border bg-surface-light/40 p-5">
        <h2 className="text-lg font-semibold text-white">
          {language === 'en' ? 'Automatic backup' : 'Backup automatico'}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {language === 'en' ? 'Not available in this environment.' : 'No disponible en este entorno.'}
        </p>
      </section>
    )
  }

  const config = status?.config ?? null
  const editableConfig = draftConfig ?? config
  const configDirty = Boolean(
    config &&
    editableConfig &&
    JSON.stringify(config) !== JSON.stringify(editableConfig),
  )

  const updateDraft = (patch: Partial<ScheduledBackupConfig>) => {
    setDraftConfig((prev) => {
      const base = prev ?? config
      return base ? { ...base, ...patch } : prev
    })
    setFeedback(null)
  }

  const saveConfig = async () => {
    if (!config || !editableConfig) return
    setBusy(true)
    setFeedback(null)
    try {
      const result = await bridge.setConfig(editableConfig)
      setStatus(result)
      setDraftConfig(result.config)
      setFeedback({ kind: 'ok', text: language === 'en' ? 'Configuration saved.' : 'Configuracion guardada.' })
    } catch (err) {
      setFeedback({ kind: 'err', text: (err as Error).message ?? t.messages.errors.generic })
    } finally {
      setBusy(false)
    }
  }

  const pickDestination = async () => {
    setBusy(true)
    try {
      const result = await bridge.pickDestination()
      if (result.path) {
        updateDraft({ destinationDir: result.path })
      }
    } finally {
      setBusy(false)
    }
  }

  const savePassphrase = async () => {
    if (passphrase.length < 8) {
      setFeedback({ kind: 'err', text: t.messages.errors.backupPassphraseShort })
      return
    }
    setBusy(true)
    try {
      await bridge.setPassphrase(passphrase)
      setPassphrase('')
      setFeedback({
        kind: 'ok',
        text: language === 'en'
          ? 'Passphrase saved in session memory.'
          : 'Passphrase guardada en memoria de la sesion.',
      })
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const runNow = async () => {
    setBusy(true)
    setFeedback(null)
    try {
      const result = await bridge.runNow()
      setStatus(result)
      if (result.lastError) {
        setFeedback({ kind: 'err', text: result.lastError })
      } else if (result.lastResultPath) {
        setFeedback({ kind: 'ok', text: t.messages.success.backupSaved(result.lastResultPath) })
      }
    } finally {
      setBusy(false)
    }
  }

  const enabled = editableConfig?.enabled ?? false
  const passphraseLoaded = status?.passphraseLoaded ?? false
  const freqOptions = language === 'en' ? [
    { value: 1, label: 'Daily' },
    { value: 3, label: 'Every 3 days' },
    { value: 7, label: 'Weekly' },
    { value: 14, label: 'Every 2 weeks' },
    { value: 30, label: 'Monthly' },
  ] : FREQ_OPTIONS

  return (
    <section className="rounded-2xl border border-border bg-surface-light/40 p-5 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <CalendarClock size={18} className="text-accent-light" />
            {language === 'en' ? 'Automatic backup' : 'Backup automatico'}
          </h2>
          <p className="text-xs text-muted mt-1">
            {language === 'en'
              ? 'Runs automatically on the selected frequency and saves the encrypted file in your chosen folder.'
              : 'Se ejecuta solo segun la frecuencia y guarda el archivo cifrado en tu carpeta elegida.'}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={enabled}
            disabled={busy || !editableConfig}
            onChange={(e) => updateDraft({ enabled: e.target.checked })}
            className="h-4 w-4 accent-accent"
          />
          {language === 'en' ? 'Enabled' : 'Activado'}
        </label>
      </header>

      {editableConfig && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted">{language === 'en' ? 'Frequency' : 'Frecuencia'}</label>
            <select
              value={editableConfig.frequencyDays}
              disabled={busy}
              onChange={(e) => updateDraft({ frequencyDays: Number(e.target.value) })}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
            >
              {freqOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted">
              {language === 'en' ? 'Keep last N copies' : 'Mantener ultimas N copias'}
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={editableConfig.retainCount}
              disabled={busy}
              onChange={(e) => updateDraft({ retainCount: Number(e.target.value) })}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs text-muted">{language === 'en' ? 'Destination folder' : 'Carpeta destino'}</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={editableConfig.destinationDir ?? (language === 'en' ? 'Not set' : 'Sin definir')}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={pickDestination}
                disabled={busy}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white hover:bg-surface-light"
              >
                <FolderOpen size={14} /> {language === 'en' ? 'Choose' : 'Elegir'}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-white md:col-span-2">
            <input
              type="checkbox"
              checked={editableConfig.encrypt}
              disabled={busy}
              onChange={(e) => updateDraft({ encrypt: e.target.checked })}
              className="h-4 w-4 accent-accent"
            />
            <ShieldCheck size={14} className="text-accent-light" />
            {language === 'en' ? 'Encrypt backup with passphrase (recommended)' : 'Cifrar backup con passphrase (recomendado)'}
          </label>
        </div>
      )}

      {editableConfig?.encrypt && (
        <div className="rounded-lg border border-border bg-surface px-3 py-3 space-y-2">
          <p className="text-xs text-muted flex items-center gap-2">
            <KeyRound size={12} /> Passphrase {passphraseLoaded
              ? language === 'en' ? '(loaded in memory)' : '(cargada en memoria)'
              : language === 'en' ? '(not set)' : '(no definida)'}
          </p>
          <p className="text-caption text-muted">
            {language === 'en'
              ? 'The passphrase is not saved to disk. You need to enter it again when you restart Nora OS.'
              : 'La passphrase no se guarda a disco. Tenes que volver a ingresarla cuando reinicias Nora OS.'}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder={language === 'en' ? 'Minimum 8 characters' : 'Minimo 8 caracteres'}
              className="flex-1 rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              onClick={savePassphrase}
              disabled={busy || passphrase.length < 8}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {t.common.save}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface px-3 py-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-muted">{language === 'en' ? 'Last run' : 'Ultima ejecucion'}</p>
          <p className="text-white mt-0.5">{formatDate(status?.lastRunAt ?? null, formatDateTime)}</p>
        </div>
        <div>
          <p className="text-muted">{language === 'en' ? 'Next estimated' : 'Proxima estimada'}</p>
          <p className="text-white mt-0.5">{formatDate(status?.nextRunAt ?? null, formatDateTime)}</p>
        </div>
        {status?.lastError && (
          <div className="col-span-2">
            <p className="text-rose-300">
              {language === 'en' ? 'Last error' : 'Ultimo error'}: {status.lastError}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void saveConfig()}
            disabled={busy || !editableConfig || !configDirty}
            className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent/85 disabled:opacity-40"
          >
            <Save size={14} /> {t.common.save}
          </button>
          <button
            type="button"
            onClick={runNow}
            disabled={busy || !config}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white hover:bg-surface-light disabled:opacity-40"
          >
            <Play size={14} /> {language === 'en' ? 'Run now' : 'Ejecutar ahora'}
          </button>
          {configDirty && <span className="text-xs text-warning">{t.control.appearance.unsaved}</span>}
        </div>
        {feedback && (
          <span
            className={`text-xs ${feedback.kind === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}
          >
            {feedback.text}
          </span>
        )}
      </div>
    </section>
  )
}
