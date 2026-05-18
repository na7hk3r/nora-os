import { useEffect, useState } from 'react'
import { Lock, LockOpen, ShieldAlert } from 'lucide-react'
import { useI18n } from '@core/i18n'
import type { DbEncryptionStatus } from '@core/types'

const MIN_LEN = 12

function strengthHint(p: string, language: 'es' | 'en'): { ok: boolean; reason: string } {
  if (p.length < MIN_LEN) {
    return {
      ok: false,
      reason: language === 'en' ? `Minimum ${MIN_LEN} characters` : `Minimo ${MIN_LEN} caracteres`,
    }
  }
  const cats = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((r) => r.test(p)).length
  if (cats < 2) {
    return {
      ok: false,
      reason: language === 'en' ? 'Mix at least 2 character types' : 'Mezcla al menos 2 tipos de caracteres',
    }
  }
  return { ok: true, reason: language === 'en' ? 'Strength accepted' : 'Fortaleza aceptable' }
}

export function DbEncryptionSection() {
  const { language, t } = useI18n()
  const [status, setStatus] = useState<DbEncryptionStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [showEnable, setShowEnable] = useState(false)
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')

  const refresh = async () => {
    try {
      const next = await window.dbEncryption.status()
      setStatus(next)
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const onEnable = async () => {
    if (busy) return
    setMessage('')
    if (pass !== confirm) {
      setMessage(language === 'en' ? 'Passphrases do not match' : 'Las passphrases no coinciden')
      return
    }
    const hint = strengthHint(pass, language)
    if (!hint.ok) {
      setMessage(t.messages.errors.dbEncryptionWeakPassphrase)
      return
    }
    if (
      !window.confirm(
        t.messages.confirm.enableDbEncryption ?? (language === 'en'
          ? 'Enable encryption at rest? Without the passphrase you will not be able to open your data.'
          : 'Activar cifrado en reposo? Sin la passphrase no vas a poder abrir tus datos.'),
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const result = await window.dbEncryption.enable(pass)
      if (result.ok) {
        setMessage(t.messages.success.dbEncryptionEnabled)
        setPass('')
        setConfirm('')
        setShowEnable(false)
        await refresh()
      } else if (result.code === 'WEAK_PASSPHRASE') {
        setMessage(t.messages.errors.dbEncryptionWeakPassphrase)
      } else {
        setMessage(result.message ?? t.messages.errors.dbEncryptionUnavailable)
      }
    } finally {
      setBusy(false)
    }
  }

  const onDisable = async () => {
    if (busy) return
    if (
      !window.confirm(
        t.messages.confirm.disableDbEncryption ?? (language === 'en'
          ? 'Disable encryption? Your data will stay on disk without additional protection.'
          : 'Desactivar cifrado? Tus datos quedan en disco sin proteccion adicional.'),
      )
    ) {
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const result = await window.dbEncryption.disable()
      if (result.ok) {
        setMessage(t.messages.success.dbEncryptionDisabled)
        await refresh()
      } else {
        setMessage(result.message ?? (language === 'en' ? 'Could not disable encryption' : 'No se pudo desactivar'))
      }
    } finally {
      setBusy(false)
    }
  }

  const enabled = status?.enabled ?? false
  const hint = pass ? strengthHint(pass, language) : null

  return (
    <article className="rounded-2xl border border-border bg-surface-light/85 p-6">
      <div className="flex items-center gap-2">
        {enabled ? (
          <Lock size={18} className="text-accent-light" aria-hidden />
        ) : (
          <LockOpen size={18} className="text-muted" aria-hidden />
        )}
        <h2 className="text-lg font-semibold">
          {language === 'en' ? 'Database encryption at rest' : 'Cifrado de base en reposo'}
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        {language === 'en'
          ? 'Protect your local database with a passphrase. When you close the app, the file is encrypted; when you open it, the passphrase is required to decrypt it.'
          : 'Protege tu base local con una passphrase. Al cerrar la app, el archivo se cifra; al abrirla, se te pide la passphrase para descifrarlo.'}
      </p>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <span
          className={`rounded-full px-2 py-0.5 ${enabled ? 'bg-accent/20 text-accent-light' : 'bg-surface text-muted'}`}
          aria-live="polite"
        >
          {enabled
            ? language === 'en' ? 'Enabled' : 'Activado'
            : language === 'en' ? 'Disabled' : 'Desactivado'}
        </span>
        {status?.hasEncryptedAtRest && !enabled && (
          <span className="rounded-full bg-warning/20 px-2 py-0.5 text-warning">
            {language === 'en' ? 'There is a .enc file on disk' : 'Hay un .enc en disco'}
          </span>
        )}
      </div>

      {!enabled && !showEnable && (
        <button
          onClick={() => setShowEnable(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85"
        >
          <Lock size={13} /> {language === 'en' ? 'Enable encryption' : 'Activar cifrado'}
        </button>
      )}

      {!enabled && showEnable && (
        <div className="mt-4 space-y-3 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-start gap-2 rounded bg-warning/10 p-2 text-xs text-warning">
            <ShieldAlert size={14} aria-hidden />
            <span>
              {language === 'en'
                ? 'If you lose the passphrase, you lose access to your data. There is no recovery.'
                : 'Si perdés la passphrase, perdés acceso a tus datos. No hay recuperación.'}
            </span>
          </div>
          <label className="block text-xs text-muted">
            {language === 'en' ? `Passphrase (min. ${MIN_LEN} characters)` : `Passphrase (min. ${MIN_LEN} caracteres)`}
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-surface-light px-2 py-1.5 text-sm text-white focus:border-accent focus:outline-none"
              autoComplete="new-password"
            />
          </label>
          <label className="block text-xs text-muted">
            {language === 'en' ? 'Confirm passphrase' : 'Confirmar passphrase'}
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-surface-light px-2 py-1.5 text-sm text-white focus:border-accent focus:outline-none"
              autoComplete="new-password"
            />
          </label>
          {hint && (
            <p className={`text-xs ${hint.ok ? 'text-accent-light' : 'text-warning'}`} aria-live="polite">
              {hint.reason}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => void onEnable()}
              disabled={busy || !pass || !confirm}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-60"
            >
              {language === 'en' ? 'Confirm' : 'Confirmar'}
            </button>
            <button
              onClick={() => {
                setShowEnable(false)
                setPass('')
                setConfirm('')
                setMessage('')
              }}
              disabled={busy}
              className="rounded-lg border border-border px-4 py-2 text-xs text-muted hover:text-white disabled:opacity-60"
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}

      {enabled && (
        <button
          onClick={() => void onDisable()}
          disabled={busy}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs text-muted hover:text-white disabled:opacity-60"
        >
          <LockOpen size={13} /> {language === 'en' ? 'Disable encryption' : 'Desactivar cifrado'}
        </button>
      )}

      {message && <p className="mt-3 text-xs text-muted" aria-live="polite">{message}</p>}
    </article>
  )
}
