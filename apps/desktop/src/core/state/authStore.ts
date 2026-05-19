import { create } from 'zustand'
import type { AuthUser, RegisterPayload, ResetPasswordWithRecoveryPayload } from '@core/types'

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

interface AuthState {
  status: AuthStatus
  currentUser: AuthUser | null
  loading: boolean
  error: string | null
  initializeSession: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  getRecoveryQuestion: (username: string) => Promise<string | null>
  resetPasswordWithRecovery: (payload: ResetPasswordWithRecoveryPayload) => Promise<void>
}

function toReadableError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Ocurrio un error inesperado.'
  }

  // Electron envuelve los errores cruzando IPC con prefijos técnicos como:
  //   "Error invoking remote method 'auth:login': Error: Auth IPC failed: <msg>"
  // Al usuario solo le interesa <msg>. Pelamos prefijos conocidos en orden.
  let message = error.message
  const strippers: RegExp[] = [
    /^Error invoking remote method '[^']+':\s*/i,
    /^Error:\s*/i,
    /^Auth IPC failed:\s*/i,
    /^Error:\s*/i, // puede quedar un segundo "Error:" tras el unwrap
  ]

  for (const rx of strippers) {
    message = message.replace(rx, '')
  }

  return message.trim() || 'Ocurrio un error inesperado.'
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  currentUser: null,
  loading: false,
  error: null,

  initializeSession: async () => {
    if (!window.auth) {
      set({ status: 'unauthenticated', currentUser: null })
      return
    }

    set({ loading: true, error: null })
    try {
      const user = await window.auth.me()
      set({
        status: user ? 'authenticated' : 'unauthenticated',
        currentUser: user,
        loading: false,
      })
    } catch (error) {
      set({
        status: 'unauthenticated',
        currentUser: null,
        error: toReadableError(error),
        loading: false,
      })
    }
  },

  login: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const user = await window.auth.login(username, password)
      set({ status: 'authenticated', currentUser: user, loading: false })
    } catch (error) {
      set({ error: toReadableError(error), loading: false })
      throw error
    }
  },

  register: async (payload) => {
    set({ loading: true, error: null })
    try {
      const user = await window.auth.register(payload)
      set({ status: 'authenticated', currentUser: user, loading: false })
    } catch (error) {
      set({ error: toReadableError(error), loading: false })
      throw error
    }
  },

  logout: async () => {
    try {
      await window.auth.logout()
    } finally {
      set({ status: 'unauthenticated', currentUser: null, loading: false, error: null })
      window.location.reload()
    }
  },

  clearError: () => set({ error: null }),

  getRecoveryQuestion: async (username) => {
    try {
      return await window.auth.getRecoveryQuestion(username)
    } catch {
      return null
    }
  },

  resetPasswordWithRecovery: async (payload) => {
    set({ loading: true, error: null })
    try {
      await window.auth.resetPasswordWithRecovery(payload)
      set({ loading: false })
    } catch (error) {
      set({ error: toReadableError(error), loading: false })
      throw error
    }
  },
}))
