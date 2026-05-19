import type { AppUpdateStatus } from '../../src/core/types'

export const OFFICIAL_DOWNLOAD_URL = 'https://na7hk3r.github.io/nora-os/#download'
export const MANUAL_UPDATE_ERROR_MESSAGE =
  'No pudimos conectar con el servidor de actualizaciones. Descargá manualmente la última versión desde el sitio oficial.'

const RECOVERABLE_UPDATE_ERROR_PATTERNS = [
  /ERR_NAME_NOT_RESOLVED/i,
  /\bENOTFOUND\b/i,
  /\bEAI_AGAIN\b/i,
  /\bETIMEDOUT\b/i,
  /\bECONNRESET\b/i,
  /\bECONNREFUSED\b/i,
  /timeout|timed out/i,
  /network|fetch failed|socket hang up/i,
  /\b404\b|not found/i,
  /latest\.ya?ml|app-update\.ya?ml|manifest|feed/i,
]

export function getAppUpdateErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const details = error as Error & Record<string, unknown>
    return [
      error.name,
      error.message,
      details.code,
      details.statusCode,
      details.status,
    ]
      .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
      .join(' ')
  }
  if (typeof error === 'string') return error

  if (error && typeof error === 'object') {
    const details = error as Record<string, unknown>
    const parts = [details.message, details.code, details.statusCode, details.status]
      .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
      .join(' ')

    if (parts) return parts
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export function isRecoverableAppUpdateError(error: unknown): boolean {
  const message = getAppUpdateErrorMessage(error)
  return RECOVERABLE_UPDATE_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

export function toAppUpdateErrorStatus(_error: unknown): AppUpdateStatus {
  return {
    state: 'error',
    message: MANUAL_UPDATE_ERROR_MESSAGE,
    manualDownloadUrl: OFFICIAL_DOWNLOAD_URL,
  }
}
