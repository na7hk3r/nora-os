import { describe, expect, it, vi } from 'vitest'
import { __testing } from '../../electron/services/profile-ipc'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  dialog: {
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
  },
  BrowserWindow: class {
    static getFocusedWindow() {
      return null
    }
  },
}))

function createProfileDb(settings: Record<string, string>) {
  const executed: Array<{ sql: string; params: unknown[] }> = []
  return {
    executed,
    query(sql: string) {
      if (sql.includes('FROM profile')) {
        return [
          {
            name: 'Ada',
            height: 170,
            age: 35,
            startDate: '2026-05-18',
            weightGoal: 70,
          },
        ]
      }
      if (sql.includes('FROM settings')) {
        return Object.entries(settings).map(([key, value]) => ({ key, value }))
      }
      return []
    },
    execute(sql: string, params: unknown[]) {
      executed.push({ sql, params })
      return { changes: 1, lastInsertRowid: 1 }
    },
  }
}

describe('profile IPC gamification snapshot', () => {
  it('exports gamification from settings.gamificationState', () => {
    const db = createProfileDb({
      gamificationState: JSON.stringify({ points: 1234, level: 37, history: [] }),
      activePlugins: '["work"]',
    })

    const snapshot = __testing.buildSnapshot(db as never)

    expect(snapshot.gamification).toEqual({ totalXp: 1234, level: 37 })
    expect(snapshot.settings.gamificationState).toContain('"points":1234')
  })

  it('restores legacy profile gamification into settings.gamificationState', () => {
    const db = createProfileDb({})

    __testing.applySnapshot(db as never, {
      schemaVersion: 1,
      exportedAt: '2026-05-18T00:00:00.000Z',
      app: { name: 'personal-os', ref: 'profile-export' },
      profile: null,
      settings: {},
      activePlugins: [],
      gamification: { totalXp: 777, level: 22 },
    })

    expect(db.executed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          params: [
            'gamificationState',
            expect.stringContaining('"points":777'),
          ],
        }),
      ]),
    )
  })
})
