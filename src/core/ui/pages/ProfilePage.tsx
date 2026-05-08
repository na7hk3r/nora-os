import { useState } from 'react'
import { Download, Upload, ShieldCheck, FileJson, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useCoreStore } from '../../state/coreStore'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { PluginIcon } from '../components/PluginIcon'
import type { ProfileTransferResult } from '@core/types'

type Status =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'success'; message: string; detail?: string }
  | { kind: 'error'; message: string }

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function ProfilePage() {
  const profile = useCoreStore((s) => s.profile)
  const updateProfile = useCoreStore((s) => s.updateProfile)
  const persistProfile = useCoreStore((s) => s.persistProfile)
  const loadFromStorage = useCoreStore((s) => s.loadFromStorage)
  const achievements = useGamificationStore((s) => s.achievements)
  const unlockedIds = useGamificationStore((s) => s.unlockedIds)

  const [name, setName] = useState(profile.name)
  const [bigGoal, setBigGoal] = useState(profile.bigGoal ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [exportPass, setExportPass] = useState('')
  const [importPass, setImportPass] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const isAvailable = typeof window !== 'undefined' && Boolean(window.profile)
  const unlockedAchievements = achievements.filter((achievement) => unlockedIds.includes(achievement.id))

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      updateProfile({ name: name.trim(), bigGoal: bigGoal.trim() || undefined })
      await persistProfile()
      setStatus({ kind: 'success', message: 'Perfil actualizado' })
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message ?? 'Error al guardar perfil' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleResult = async (result: ProfileTransferResult, label: string) => {
    if (result.canceled) {
      setStatus({ kind: 'idle' })
      return
    }
    if (!result.ok) {
      setStatus({ kind: 'error', message: `${label}: el archivo no se procesó` })
      return
    }
    if (result.summary) {
      // Refresh in-memory store so UI reflects imported data immediately.
      await loadFromStorage()
      setStatus({
        kind: 'success',
        message: `Perfil importado (v${result.summary.schemaVersion})`,
        detail: `Exportado el ${formatDate(result.summary.exportedAt)} · ${result.summary.activePlugins.length} plugins activos`,
      })
    } else {
      setStatus({
        kind: 'success',
        message: `${label} guardado`,
        detail: result.path ?? undefined,
      })
    }
  }

  const runAction = async (
    fn: () => Promise<ProfileTransferResult>,
    label: string,
  ) => {
    setStatus({ kind: 'busy' })
    try {
      const result = await fn()
      await handleResult(result, label)
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message ?? 'Error inesperado' })
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-sm text-muted">
          Tu información personal y portabilidad entre dispositivos. Todo se guarda localmente.
        </p>
      </header>

      {/* Status banner */}
      {status.kind === 'success' && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <p className="font-medium">{status.message}</p>
            {status.detail && <p className="text-xs text-emerald-200/80">{status.detail}</p>}
          </div>
        </div>
      )}
      {status.kind === 'error' && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
          <p>{status.message}</p>
        </div>
      )}
      {status.kind === 'busy' && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-light/40 px-4 py-3 text-sm text-muted">
          <RefreshCw size={16} className="animate-spin" /> Procesando…
        </div>
      )}

      {/* Profile data */}
      <section className="space-y-4 rounded-2xl border border-border bg-surface-light/40 p-6">
        <h2 className="text-lg font-semibold">Datos personales</h2>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider text-muted">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface/80 px-4 py-2.5 text-sm focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider text-muted">
              Objetivo del año (north star)
            </label>
            <textarea
              value={bigGoal}
              onChange={(e) => setBigGoal(e.target.value)}
              rows={2}
              placeholder="Lo que tu copiloto debería recordar cuando te dispersás."
              className="w-full rounded-lg border border-border bg-surface/80 px-4 py-2.5 text-sm resize-none focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            onClick={saveProfile}
            disabled={savingProfile || !name.trim()}
            className="rounded-lg bg-accent hover:bg-accent/80 disabled:opacity-40 px-5 py-2 text-sm font-medium text-white transition-all"
          >
            {savingProfile ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface-light/40 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">Badges</p>
            <h2 className="text-lg font-semibold">Logros desbloqueados</h2>
          </div>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
            {unlockedAchievements.length}/{achievements.length}
          </span>
        </div>

        {unlockedAchievements.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {unlockedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-start gap-3 rounded-xl border border-xp-gold/45 bg-xp-gold/10 p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-xp-gold/35 bg-xp-gold/15 text-xp-gold">
                  <PluginIcon name={achievement.icon} size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{achievement.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted">{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm text-muted">
            Todavia no hay badges desbloqueados. Los logros completados van a aparecer aca.
          </div>
        )}
      </section>

      {/* Export */}
      <section className="space-y-4 rounded-2xl border border-border bg-surface-light/40 p-6">
        <div className="flex items-start gap-3">
          <Download size={20} className="mt-0.5 text-accent-light flex-shrink-0" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Exportar perfil</h2>
            <p className="text-sm text-muted">
              Genera un archivo con tu nombre, objetivo, plugins activos y settings. No incluye
              contraseña ni datos de plugins. Útil para llevar tu setup a otra máquina.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            disabled={!isAvailable || status.kind === 'busy'}
            onClick={() => runAction(() => window.profile.exportPlain(), 'Exportar (plano)')}
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface/60 px-4 py-2.5 text-sm hover:border-accent/40 disabled:opacity-40 transition-all"
          >
            <FileJson size={16} /> JSON plano
          </button>
          <div className="space-y-2">
            <input
              type="password"
              value={exportPass}
              onChange={(e) => setExportPass(e.target.value)}
              placeholder="Passphrase (mín 8)"
              className="w-full rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <button
              disabled={!isAvailable || exportPass.length < 8 || status.kind === 'busy'}
              onClick={() =>
                runAction(() => window.profile.exportEncrypted(exportPass), 'Exportar cifrado')
              }
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-accent/90 hover:bg-accent disabled:opacity-40 px-4 py-2 text-sm font-medium text-white transition-all"
            >
              <ShieldCheck size={16} /> Cifrado AES-256-GCM
            </button>
          </div>
        </div>
      </section>

      {/* Import */}
      <section className="space-y-4 rounded-2xl border border-border bg-surface-light/40 p-6">
        <div className="flex items-start gap-3">
          <Upload size={20} className="mt-0.5 text-accent-light flex-shrink-0" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Importar perfil</h2>
            <p className="text-sm text-muted">
              Sobreescribe nombre, objetivo y settings con los del archivo. Los plugins activos
              de la lista se respetarán al próximo arranque. No toca tus datos de plugins.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            disabled={!isAvailable || status.kind === 'busy'}
            onClick={() => runAction(() => window.profile.importPlain(), 'Importar (plano)')}
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface/60 px-4 py-2.5 text-sm hover:border-accent/40 disabled:opacity-40 transition-all"
          >
            <FileJson size={16} /> Desde JSON plano
          </button>
          <div className="space-y-2">
            <input
              type="password"
              value={importPass}
              onChange={(e) => setImportPass(e.target.value)}
              placeholder="Passphrase del archivo"
              className="w-full rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <button
              disabled={!isAvailable || importPass.length < 1 || status.kind === 'busy'}
              onClick={() =>
                runAction(() => window.profile.importEncrypted(importPass), 'Importar cifrado')
              }
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-border bg-surface/60 px-4 py-2 text-sm hover:border-accent/40 disabled:opacity-40 transition-all"
            >
              <ShieldCheck size={16} /> Desde archivo cifrado
            </button>
          </div>
        </div>
      </section>

      {!isAvailable && (
        <p className="text-xs text-muted text-center">
          La importación/exportación requiere ejecutar Nora OS como app de escritorio.
        </p>
      )}
    </div>
  )
}
