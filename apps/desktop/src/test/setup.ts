import '@testing-library/jest-dom/vitest'

// Stub Electron bridges to avoid crashes in components/services that touch them.
const noop = async () => undefined as unknown as never

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key)
    },
    setItem: (key: string, value: string) => {
      values.set(key, String(value))
    },
  }
}

if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>
  if (!window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createMemoryStorage(),
    })
  }
  w.storage ??= {
    query: async () => [],
    execute: async () => ({ changes: 0, lastInsertRowid: 0 }),
    getSetting: async () => null,
    setSetting: async () => undefined,
    getRecentEvents: async () => [],
  }
  w.notifications ??= { supported: async () => false, show: noop }
  w.ollama ??= {
    health: async () => ({ ok: false, baseUrl: '', error: 'stub' }),
    listModels: async () => [],
    generate: async () => ({ text: 'stub' }),
  }
  w.backup ??= {
    exportPlain: async () => ({ ok: false }),
    exportEncrypted: async () => ({ ok: false }),
    importPlain: async () => ({ ok: false }),
    importEncrypted: async () => ({ ok: false }),
  }
  w.workFocusWindow ??= {
    open: async () => undefined,
    close: async () => undefined,
    toggle: async () => undefined,
    focusMain: async () => undefined,
  }
  w.auth ??= {}
}
