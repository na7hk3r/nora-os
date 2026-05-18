import { useEffect, useState } from 'react'
import { Bell, Save } from 'lucide-react'
import { useI18n } from '@core/i18n'
import { storageAPI } from '@core/storage/StorageAPI'
import { notificationsService, type QuietHours } from '@core/services/notificationsService'

const DEFAULT: QuietHours = { enabled: false, startMinutes: 22 * 60, endMinutes: 7 * 60 }
const KEY = 'core:quietHours'

function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0')
  const m = (mins % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}
function fromHHMM(v: string): number {
  const [h, m] = v.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function NotificationsSection() {
  const { language, t } = useI18n()
  const [quiet, setQuiet] = useState<QuietHours>(DEFAULT)
  const [savedQuiet, setSavedQuiet] = useState<QuietHours>(DEFAULT)
  const [supported, setSupported] = useState(false)
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    void window.notifications?.isSupported().then(setSupported).catch(() => setSupported(false))
    void storageAPI.getSetting(KEY).then((v) => {
      if (v) try {
        const loaded = { ...DEFAULT, ...JSON.parse(v) }
        setQuiet(loaded)
        setSavedQuiet(loaded)
      } catch { /* noop */ }
    })
  }, [])

  const save = async () => {
    await storageAPI.setSetting(KEY, JSON.stringify(quiet))
    notificationsService.setQuietHours(quiet)
    setSavedQuiet(quiet)
    setStatus(t.common.saved)
  }

  const testNotify = async () => {
    await notificationsService.showNow({
      title: 'Nora OS',
      body: language === 'en' ? 'Test notification' : 'Notificacion de prueba',
    })
    setStatus(language === 'en' ? 'Notification sent' : 'Notificacion enviada')
  }

  const dirty = JSON.stringify(savedQuiet) !== JSON.stringify(quiet)

  return (
    <article className="rounded-2xl border border-border bg-surface-light/85 p-6">
      <div className="flex items-center gap-2">
        <Bell size={18} className="text-accent-light" />
        <h2 className="text-lg font-semibold">{language === 'en' ? 'Notifications' : 'Notificaciones'}</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        {language === 'en'
          ? 'Native system notifications for scheduled reminders. Support detected: '
          : 'Notificaciones nativas del sistema para recordatorios programados. Soporte detectado: '}
        <span className={supported ? 'text-emerald-300' : 'text-warning'}>
          {supported
            ? language === 'en' ? 'yes' : 'si'
            : language === 'en' ? 'no' : 'no'}
        </span>.
      </p>

      <div className="mt-4 space-y-3">
        <label className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
          <span className="text-sm">{language === 'en' ? 'Enable quiet hours' : 'Activar horas de silencio'}</span>
          <input
            type="checkbox"
            checked={quiet.enabled}
            onChange={(e) => setQuiet({ ...quiet, enabled: e.target.checked })}
            className="h-4 w-4"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-muted">{language === 'en' ? 'Start' : 'Inicio'}</span>
            <input
              type="time"
              value={toHHMM(quiet.startMinutes)}
              onChange={(e) => setQuiet({ ...quiet, startMinutes: fromHHMM(e.target.value) })}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">{language === 'en' ? 'End' : 'Fin'}</span>
            <input
              type="time"
              value={toHHMM(quiet.endMinutes)}
              onChange={(e) => setQuiet({ ...quiet, endMinutes: fromHHMM(e.target.value) })}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => void save()}
          disabled={!dirty}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-50"
        ><Save size={13} /> {t.common.save}</button>
        <button
          onClick={() => void testNotify()}
          disabled={!supported}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted hover:text-white disabled:opacity-50"
        >{language === 'en' ? 'Test notification' : 'Probar notificacion'}</button>
        {dirty && <span className="text-xs text-warning">{t.control.appearance.unsaved}</span>}
        {status && <span className="text-xs text-muted">{status}</span>}
      </div>
    </article>
  )
}
