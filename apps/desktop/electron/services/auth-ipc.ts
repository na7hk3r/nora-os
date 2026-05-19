import { ipcMain } from 'electron'
import { AuthService } from './auth'

const CHANNELS = {
  register: 'auth:register',
  login: 'auth:login',
  logout: 'auth:logout',
  me: 'auth:me',
  getRecoveryQuestion: 'auth:get-recovery-question',
  resetPasswordWithRecovery: 'auth:reset-password-with-recovery',
} as const

function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} is required`)
  }
}

function withAuthErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error) => {
    // Re-lanzar Errors reales sin prefijo: el mensaje del AuthService ya es
    // legible para el usuario (ej. "El nombre de usuario o contraseña es
    // incorrecto."). Solo envolvemos valores no-Error para no perder señal.
    if (error instanceof Error) {
      throw error
    }
    throw new Error(typeof error === 'string' ? error : 'Error de autenticación')
  })
}

export function registerAuthIpc(authService: AuthService): void {
  ipcMain.handle(CHANNELS.register, (_event, payload: unknown) => {
    return withAuthErrorHandling(async () => {
      if (typeof payload !== 'object' || payload === null) {
        throw new Error('payload is required')
      }

      const data = payload as Record<string, unknown>
      assertString(data.username, 'username')
      assertString(data.password, 'password')
      assertString(data.recoveryQuestion, 'recoveryQuestion')
      assertString(data.recoveryAnswer, 'recoveryAnswer')

      return authService.register({
        username: data.username,
        password: data.password,
        recoveryQuestion: data.recoveryQuestion,
        recoveryAnswer: data.recoveryAnswer,
      })
    })
  })

  ipcMain.handle(CHANNELS.login, (_event, username: unknown, password: unknown) => {
    return withAuthErrorHandling(async () => {
      assertString(username, 'username')
      assertString(password, 'password')
      return authService.login(username, password)
    })
  })

  ipcMain.handle(CHANNELS.logout, () => {
    return withAuthErrorHandling(async () => {
      await authService.logout()
    })
  })

  ipcMain.handle(CHANNELS.me, () => {
    return withAuthErrorHandling(async () => authService.getCurrentUser())
  })

  ipcMain.handle(CHANNELS.getRecoveryQuestion, (_event, username: unknown) => {
    return withAuthErrorHandling(async () => {
      assertString(username, 'username')
      return authService.getRecoveryQuestion(username)
    })
  })

  ipcMain.handle(
    CHANNELS.resetPasswordWithRecovery,
    (_event, payload: unknown) => {
      return withAuthErrorHandling(async () => {
        if (typeof payload !== 'object' || payload === null) {
          throw new Error('payload is required')
        }

        const data = payload as Record<string, unknown>
        assertString(data.username, 'username')
        assertString(data.recoveryAnswer, 'recoveryAnswer')
        assertString(data.newPassword, 'newPassword')

        await authService.resetPasswordWithRecovery({
          username: data.username,
          recoveryAnswer: data.recoveryAnswer,
          newPassword: data.newPassword,
        })
      })
    },
  )
}
