import { describe, expect, it } from 'vitest'
import {
  MANUAL_UPDATE_ERROR_MESSAGE,
  OFFICIAL_DOWNLOAD_URL,
  isRecoverableAppUpdateError,
  toAppUpdateErrorStatus,
} from '../../electron/services/app-update-errors'

describe('app update error normalization', () => {
  it.each([
    ['net::ERR_NAME_NOT_RESOLVED'],
    ['getaddrinfo ENOTFOUND github.com'],
    ['request failed with EAI_AGAIN'],
    ['update check timed out'],
    ['Cannot download latest.yml: 404 Not Found'],
    ['Invalid update feed manifest'],
  ])('treats %s as a recoverable update error', (message) => {
    const error = new Error(message)

    expect(isRecoverableAppUpdateError(error)).toBe(true)
    expect(toAppUpdateErrorStatus(error)).toEqual({
      state: 'error',
      message: MANUAL_UPDATE_ERROR_MESSAGE,
      manualDownloadUrl: OFFICIAL_DOWNLOAD_URL,
    })
  })

  it('keeps unknown errors generic and points to the official download', () => {
    const error = new Error('Unexpected updater failure with internal details')

    expect(isRecoverableAppUpdateError(error)).toBe(false)
    expect(toAppUpdateErrorStatus(error)).toEqual({
      state: 'error',
      message: MANUAL_UPDATE_ERROR_MESSAGE,
      manualDownloadUrl: OFFICIAL_DOWNLOAD_URL,
    })
  })

  it('detects network codes even when they are not part of the message', () => {
    expect(isRecoverableAppUpdateError({ message: 'lookup failed', code: 'ENOTFOUND' })).toBe(true)
  })
})
