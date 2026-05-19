/**
 * Error handling and logging utilities
 * Centralized error management for the application
 */

export interface AppError extends Error {
  code: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  context?: Record<string, unknown>
  originalError?: unknown
}

/**
 * Create a typed application error
 */
export function createError(
  message: string,
  code: string,
  severity: 'info' | 'warning' | 'error' | 'critical' = 'error',
  context?: Record<string, unknown>,
): AppError {
  const error = new Error(message) as AppError
  error.code = code
  error.severity = severity
  error.context = context
  error.name = 'AppError'
  return error
}

/**
 * Safe error logger
 * Can be extended to send to logging service
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const appError = error instanceof Error
    ? (error as AppError)
    : createError(String(error), 'UNKNOWN_ERROR', 'error', context)

  const log = {
    timestamp: new Date().toISOString(),
    message: appError.message,
    code: appError.code,
    severity: appError.severity,
    context: { ...appError.context, ...context },
    stack: appError.stack,
  }

  // Log by severity level
  switch (appError.severity) {
    case 'critical':
    case 'error':
      console.error('[AppError]', log)
      break
    case 'warning':
      console.warn('[AppWarning]', log)
      break
    case 'info':
      console.info('[AppInfo]', log)
      break
  }

  // In production, could send to error tracking service
  // e.g., Sentry, LogRocket, etc.
}

/**
 * Common error codes for the application
 */
export const ERROR_CODES = {
  // Plugin errors
  PLUGIN_NOT_FOUND: 'PLUGIN_NOT_FOUND',
  PLUGIN_INIT_FAILED: 'PLUGIN_INIT_FAILED',
  PLUGIN_LOAD_ERROR: 'PLUGIN_LOAD_ERROR',

  // Storage errors
  STORAGE_READ_ERROR: 'STORAGE_READ_ERROR',
  STORAGE_WRITE_ERROR: 'STORAGE_WRITE_ERROR',
  STORAGE_MIGRATION_ERROR: 'STORAGE_MIGRATION_ERROR',

  // Database errors
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Event errors
  EVENT_EMIT_ERROR: 'EVENT_EMIT_ERROR',
  EVENT_LISTENER_ERROR: 'EVENT_LISTENER_ERROR',

  // State errors
  STATE_UPDATE_ERROR: 'STATE_UPDATE_ERROR',
  STATE_SYNC_ERROR: 'STATE_SYNC_ERROR',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

  // Generic errors
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const

/**
 * Error messages in Spanish
 */
export const ERROR_MESSAGES: Record<string, string> = {
  PLUGIN_NOT_FOUND: 'Plugin no encontrado',
  PLUGIN_INIT_FAILED: 'Error al inicializar plugin',
  PLUGIN_LOAD_ERROR: 'Error al cargar plugin',
  STORAGE_READ_ERROR: 'Error al leer datos',
  STORAGE_WRITE_ERROR: 'Error al guardar datos',
  STORAGE_MIGRATION_ERROR: 'Error en migración de datos',
  DB_QUERY_ERROR: 'Error en consulta de base de datos',
  DB_CONNECTION_ERROR: 'Error de conexión a base de datos',
  VALIDATION_ERROR: 'Error de validación',
  INVALID_INPUT: 'Entrada inválida',
  EVENT_EMIT_ERROR: 'Error al emitir evento',
  EVENT_LISTENER_ERROR: 'Error en listener de evento',
  STATE_UPDATE_ERROR: 'Error al actualizar estado',
  STATE_SYNC_ERROR: 'Error de sincronización de estado',
  NETWORK_ERROR: 'Error de red',
  TIMEOUT_ERROR: 'Tiempo de espera agotado',
  NOT_FOUND: 'No encontrado',
  PERMISSION_DENIED: 'Permiso denegado',
  OPERATION_FAILED: 'Operación fallida',
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof Error && 'code' in error) {
    const appError = error as AppError
    return ERROR_MESSAGES[appError.code] || appError.message
  }
  return 'Algo salió mal. Por favor intenta nuevamente.'
}

/**
 * Async error boundary wrapper
 * Usage: await withErrorBoundary(() => someFn())
 */
export async function withErrorBoundary<T>(
  fn: () => Promise<T>,
  fallback?: T,
): Promise<T | undefined> {
  try {
    return await fn()
  } catch (error) {
    logError(error)
    return fallback
  }
}

/**
 * Sync error boundary wrapper
 */
export function withErrorBoundarySync<T>(
  fn: () => T,
  fallback?: T,
): T | undefined {
  try {
    return fn()
  } catch (error) {
    logError(error)
    return fallback
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000,
): Promise<T> {
  let lastError: unknown

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (i < maxAttempts - 1) {
        const delay = delayMs * Math.pow(2, i)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}
