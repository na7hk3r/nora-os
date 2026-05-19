import { useState } from 'react'
import { Download, KeyRound, ShieldCheck, Upload, X } from 'lucide-react'
import { useI18n } from '@core/i18n'

type BackupAction = 'export-plain' | 'export-encrypted' | 'import-plain' | 'import-encrypted'
type PassphraseAction = Extract<BackupAction, 'export-encrypted' | 'import-encrypted'>

const MIN_PASSPHRASE_LENGTH = 8

const passphraseDialogCopy: Record<
  PassphraseAction,
  { title: string; description: string; submitLabel: string; autoComplete: string }
> = {
  'export-encrypted': {
    title: 'Exportar backup cifrado',
    description:
      'Elegí una passphrase de al menos 8 caracteres. Sin esta clave, el backup no se puede restaurar.',
    submitLabel: 'Exportar backup cifrado',
    autoComplete: 'new-password',
  },
  'import-encrypted': {
    title: 'Restaurar backup cifrado',
    description:
      'Ingresá la passphrase usada al exportar. Restaurar reemplaza tu base actual y no se puede deshacer.',
    submitLabel: 'Restaurar backup cifrado',
    autoComplete: 'current-password',
  },
}

export function BackupSection() {
  const { language, t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [passphraseAction, setPassphraseAction] = useState<PassphraseAction | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [passphraseError, setPassphraseError] = useState('')
  const [confirmPlainRestore, setConfirmPlainRestore] = useState(false)

  const closePassphraseDialog = () => {
    if (busy) return
    setPassphraseAction(null)
    setPassphrase('')
    setPassphraseError('')
  }

  const openPassphraseDialog = (kind: PassphraseAction) => {
    if (busy) return
    setMessage('')
    setPassphrase('')
    setPassphraseError('')
    setPassphraseAction(kind)
  }

  const run = async (kind: BackupAction, pass?: string) => {
    if (busy) return
    setBusy(true)
    setMessage('')

    try {
      let result: { ok: boolean; path?: string; error?: string; canceled?: boolean }
      if (kind === 'export-plain') result = await window.backup.exportPlain()
      else if (kind === 'export-encrypted') result = await window.backup.exportEncrypted(pass ?? '')
      else if (kind === 'import-plain') result = await window.backup.importPlain()
      else result = await window.backup.importEncrypted(pass ?? '')

      if (result?.ok) {
        setMessage(
          kind.startsWith('import')
            ? t.messages.success.backupRestored
            : result.path
              ? t.messages.success.backupSaved(result.path)
              : 'OK',
        )
      } else {
        setMessage(result?.error ?? (language === 'en' ? 'Operation canceled' : 'Operacion cancelada'))
      }
    } catch (err) {
      setMessage((err as Error).message)
    } finally {
      setBusy(false)
      setPassphraseAction(null)
      setPassphrase('')
      setPassphraseError('')
      setConfirmPlainRestore(false)
    }
  }

  const submitPassphrase = () => {
    if (!passphraseAction || busy) return
    if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
      setPassphraseError(t.messages.errors.backupPassphraseShort)
      return
    }

    void run(passphraseAction, passphrase)
  }

  const localizedPassphraseDialogCopy: typeof passphraseDialogCopy = language === 'en' ? {
    'export-encrypted': {
      title: 'Export encrypted backup',
      description:
        'Choose a passphrase of at least 8 characters. Without this key, the backup cannot be restored.',
      submitLabel: 'Export encrypted backup',
      autoComplete: 'new-password',
    },
    'import-encrypted': {
      title: 'Restore encrypted backup',
      description:
        'Enter the passphrase used during export. Restoring replaces your current database and cannot be undone.',
      submitLabel: 'Restore encrypted backup',
      autoComplete: 'current-password',
    },
  } : passphraseDialogCopy
  const dialogCopy = passphraseAction ? localizedPassphraseDialogCopy[passphraseAction] : null

  return (
    <article className="rounded-2xl border border-border bg-surface-light/85 p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-accent-light" />
        <h2 className="text-lg font-semibold">
          {language === 'en' ? 'Backup and restore' : 'Backup y restauracion'}
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        {language === 'en'
          ? 'Export your full local database as a file. Recommended: encrypted backup with a strong passphrase.'
          : 'Exporta toda tu base local como archivo. Recomendado: backup cifrado con passphrase fuerte.'}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => openPassphraseDialog('export-encrypted')}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-60"
        >
          <Download size={13} /> {language === 'en' ? 'Export encrypted (recommended)' : 'Exportar cifrado (recomendado)'}
        </button>
        <button
          type="button"
          onClick={() => openPassphraseDialog('import-encrypted')}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs text-muted hover:text-white disabled:opacity-60"
        >
          <Upload size={13} /> {language === 'en' ? 'Restore encrypted' : 'Restaurar cifrado'}
        </button>
        <button
          type="button"
          onClick={() => void run('export-plain')}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs text-muted hover:text-white disabled:opacity-60"
        >
          <Download size={13} /> {language === 'en' ? 'Export unencrypted (.db)' : 'Exportar sin cifrar (.db)'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (busy) return
            setMessage('')
            setConfirmPlainRestore(true)
          }}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs text-muted hover:text-white disabled:opacity-60"
        >
          <Upload size={13} /> {language === 'en' ? 'Restore unencrypted (.db)' : 'Restaurar sin cifrar (.db)'}
        </button>
      </div>

      {message && <p className="mt-3 text-xs text-muted" aria-live="polite">{message}</p>}

      {dialogCopy && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="backup-passphrase-title"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={closePassphraseDialog}
        >
          <form
            className="w-full max-w-md rounded-2xl border border-border bg-surface-light p-5 text-left text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault()
              submitPassphrase()
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-caption uppercase tracking-eyebrow text-muted">Backup</p>
                <h3 id="backup-passphrase-title" className="mt-1 text-lg font-semibold">
                  {dialogCopy.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={closePassphraseDialog}
                disabled={busy}
                className="shrink-0 rounded-md p-1.5 text-muted hover:bg-surface hover:text-white disabled:opacity-50"
                aria-label={language === 'en' ? 'Close encrypted backup' : 'Cerrar backup cifrado'}
                title={t.common.close}
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-muted">{dialogCopy.description}</p>

            <label className="mt-4 block text-xs text-muted">
              Passphrase
              <span className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 focus-within:border-accent">
                <KeyRound size={14} aria-hidden className="shrink-0 text-muted" />
                <input
                  type="password"
                  value={passphrase}
                  onChange={(event) => {
                    setPassphrase(event.target.value)
                    setPassphraseError('')
                  }}
                  autoComplete={dialogCopy.autoComplete}
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
                  placeholder={language === 'en' ? 'Minimum 8 characters' : 'Minimo 8 caracteres'}
                  autoFocus
                />
              </span>
            </label>

            {passphraseError && (
              <p className="mt-2 text-xs text-rose-300" aria-live="polite">{passphraseError}</p>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closePassphraseDialog}
                disabled={busy}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-xs text-muted hover:text-white disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={busy || passphrase.length < MIN_PASSPHRASE_LENGTH}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-50"
              >
                {dialogCopy.submitLabel}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmPlainRestore && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="backup-restore-title"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={() => !busy && setConfirmPlainRestore(false)}
        >
          <section
            className="w-full max-w-md rounded-2xl border border-border bg-surface-light p-5 text-left text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="backup-restore-title" className="text-lg font-semibold">
              {language === 'en' ? 'Restore unencrypted backup' : 'Restaurar backup sin cifrar'}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t.messages.confirm.restoreBackup}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmPlainRestore(false)}
                disabled={busy}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-xs text-muted hover:text-white disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => void run('import-plain')}
                disabled={busy}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-50"
              >
                {language === 'en' ? 'Restore backup' : 'Restaurar backup'}
              </button>
            </div>
          </section>
        </div>
      )}
    </article>
  )
}
