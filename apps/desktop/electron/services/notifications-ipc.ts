import { ipcMain, Notification } from 'electron'

const CHANNELS = {
  show: 'notifications:show',
  isSupported: 'notifications:supported',
} as const

interface ShowPayload {
  title: string
  body?: string
  silent?: boolean
}

export function registerNotificationsIpc(): void {
  ipcMain.handle(CHANNELS.isSupported, () => Notification.isSupported())

  ipcMain.handle(CHANNELS.show, (_event, payload: unknown) => {
    if (!Notification.isSupported()) return { ok: false, reason: 'not-supported' }
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload inválido')
    }
    const p = payload as Partial<ShowPayload>
    if (typeof p.title !== 'string' || p.title.length === 0) {
      throw new Error('title requerido')
    }
    const n = new Notification({
      title: p.title,
      body: p.body ?? '',
      silent: p.silent === true,
    })
    n.show()
    return { ok: true }
  })
}
