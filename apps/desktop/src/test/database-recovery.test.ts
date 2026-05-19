import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { DatabaseService as DatabaseServiceType } from '../../electron/services/database'

interface FakeDbState {
  users: Array<{ id: string; username: string }>
  settings: Record<string, string>
}

const fakeSqlite = vi.hoisted(() => {
  const {
    existsSync: hoistedExistsSync,
    mkdirSync: hoistedMkdirSync,
    readFileSync: hoistedReadFileSync,
    writeFileSync: hoistedWriteFileSync,
  // vi.hoisted runs before static imports are initialized, so this mock uses sync loading.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
  } = require('fs') as typeof import('fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
  const { dirname: hoistedDirname } = require('path') as typeof import('path')
  const dbs = new Map<string, FakeDbState>()

  function readState(path: string): FakeDbState {
    const existing = dbs.get(path)
    if (existing) return existing

    try {
      if (!hoistedExistsSync(path)) throw new Error('missing fake db')
      const parsed = JSON.parse(hoistedReadFileSync(path, 'utf8')) as FakeDbState
      const state = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {},
      }
      dbs.set(path, state)
      return state
    } catch {
      const state = { users: [], settings: {} }
      dbs.set(path, state)
      return state
    }
  }

  function writeState(path: string, state: FakeDbState): void {
    hoistedMkdirSync(hoistedDirname(path), { recursive: true })
    hoistedWriteFileSync(path, JSON.stringify(state), 'utf8')
    dbs.set(path, state)
  }

  class FakeDatabase {
    private readonly state: FakeDbState

    constructor(private readonly path: string) {
      this.state = readState(path)
    }

    pragma() {
      return undefined
    }

    exec() {
      return undefined
    }

    close() {
      return undefined
    }

    prepare(sql: string) {
      const state = this.state
      const path = this.path
      return {
        all(...params: unknown[]) {
          if (/SELECT username FROM users/i.test(sql)) return state.users.map((user) => ({ username: user.username }))
          if (/SELECT version FROM _migrations/i.test(sql)) return []
          if (/SELECT value FROM settings/i.test(sql)) {
            const key = String(params[0])
            return state.settings[key] ? [{ value: state.settings[key] }] : []
          }
          return []
        },
        get(...params: unknown[]) {
          if (/SELECT username FROM users WHERE id/i.test(sql)) {
            return state.users.find((user) => user.id === params[0]) ?? undefined
          }
          if (/SELECT id FROM users WHERE username/i.test(sql)) {
            return state.users.find((user) => user.username === params[0]) ?? undefined
          }
          if (/SELECT value FROM settings/i.test(sql)) {
            const key = String(params[0])
            return state.settings[key] ? { value: state.settings[key] } : undefined
          }
          if (/SELECT COUNT\(\*\) as c FROM events_log/i.test(sql)) return { c: 0 }
          return undefined
        },
        run(...params: unknown[]) {
          if (/INSERT OR REPLACE INTO settings/i.test(sql)) {
            state.settings[String(params[0])] = String(params[1])
            writeState(path, state)
          }
          return { changes: 1, lastInsertRowid: 1 }
        },
      }
    }
  }

  return { dbs, writeState, Database: FakeDatabase }
})

const electronMock = vi.hoisted(() => ({
  getPath: vi.fn<(name: string) => string>(),
}))

vi.mock('better-sqlite3', () => ({
  default: fakeSqlite.Database,
}))

vi.mock('electron', () => ({
  app: {
    getPath: electronMock.getPath,
  },
}))

function writeFakeDb(path: string, state: FakeDbState): void {
  fakeSqlite.writeState(path, state)
}

describe('DatabaseService legacy recovery', () => {
  let root: string
  let appData: string
  let currentUserData: string
  let DatabaseService: typeof DatabaseServiceType

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'nora-db-recovery-'))
    appData = join(root, 'AppData')
    currentUserData = join(appData, 'Nora OS')
    fakeSqlite.dbs.clear()
    electronMock.getPath.mockImplementation((name: string) => {
      if (name === 'appData') return appData
      if (name === 'userData') return currentUserData
      throw new Error(`Unexpected path request: ${name}`)
    })
    ;({ DatabaseService } = await import('../../electron/services/database'))
  })

  afterEach(() => {
    electronMock.getPath.mockReset()
    rmSync(root, { recursive: true, force: true })
    vi.resetModules()
  })

  it('copies legacy Personal OS data when the current data directory is empty', () => {
    const legacyData = join(appData, 'Personal OS', 'data')
    writeFakeDb(join(legacyData, 'auth.db'), {
      users: [{ id: 'u1', username: 'ada' }],
      settings: {},
    })
    writeFakeDb(join(legacyData, 'personal-os-user-u1.db'), {
      users: [],
      settings: { gamificationState: JSON.stringify({ points: 800, level: 12 }) },
    })

    const service = new DatabaseService()
    service.initialize()

    expect(existsSync(join(currentUserData, 'data', 'auth.db'))).toBe(true)
    expect(existsSync(join(currentUserData, 'data', 'personal-os-user-u1.db'))).toBe(true)
    expect(service.authQuery('SELECT username FROM users')).toEqual(
      expect.arrayContaining([expect.objectContaining({ username: 'ada' })]),
    )

    service.close()
  })

  it('does not overwrite an existing current auth database', () => {
    writeFakeDb(join(currentUserData, 'data', 'auth.db'), {
      users: [{ id: 'current', username: 'current' }],
      settings: {},
    })
    writeFakeDb(join(appData, 'Personal OS', 'data', 'auth.db'), {
      users: [{ id: 'legacy', username: 'legacy' }],
      settings: {},
    })

    const service = new DatabaseService()
    service.initialize()

    expect(service.authQuery('SELECT username FROM users')).toEqual([
      expect.objectContaining({ username: 'current' }),
    ])

    service.close()
  })

  it('recovers richer gamificationState from a legacy user with the same username', () => {
    writeFakeDb(join(currentUserData, 'data', 'auth.db'), {
      users: [{ id: 'new-user', username: 'ada' }],
      settings: {},
    })
    const legacyData = join(appData, 'Personal OS', 'data')
    writeFakeDb(join(legacyData, 'auth.db'), {
      users: [{ id: 'old-user', username: 'ada' }],
      settings: {},
    })
    writeFakeDb(join(legacyData, 'personal-os-user-old-user.db'), {
      users: [],
      settings: {
        gamificationState: JSON.stringify({
          points: 900,
          level: 42,
          history: [{ amount: 900, reason: 'legacy', date: '2026-05-18T00:00:00.000Z' }],
          unlockedIds: ['legacy-achievement'],
        }),
      },
    })

    const service = new DatabaseService()
    service.initialize()
    service.setActiveUser('new-user')

    const rows = service.query(
      'SELECT value FROM settings WHERE key = ? LIMIT 1',
      ['gamificationState'],
    ) as Array<{ value: string }>
    const parsed = JSON.parse(rows[0].value) as { points: number; level: number; unlockedIds: string[] }

    expect(parsed.points).toBe(900)
    expect(parsed.level).toBe(42)
    expect(parsed.unlockedIds).toContain('legacy-achievement')

    service.close()
  })
})
