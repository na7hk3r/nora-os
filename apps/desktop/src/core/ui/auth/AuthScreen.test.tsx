import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthBridge, AuthUser } from '@core/types'
import { useAuthStore } from '@core/state/authStore'
import { AuthScreen, REMEMBERED_LOGIN_USERNAME_KEY, REMEMBERED_LOGIN_USERNAMES_KEY } from './AuthScreen'

const originalAuth = window.auth

const authUser: AuthUser = {
  id: 'user-1',
  username: 'nora',
  createdAt: '2026-05-01T00:00:00.000Z',
  lastLoginAt: '2026-05-08T00:00:00.000Z',
}

function installAuthBridge(overrides: Partial<AuthBridge> = {}): AuthBridge {
  const bridge: AuthBridge = {
    register: vi.fn().mockResolvedValue(authUser),
    login: vi.fn().mockResolvedValue(authUser),
    logout: vi.fn().mockResolvedValue(undefined),
    me: vi.fn().mockResolvedValue(null),
    getRecoveryQuestion: vi.fn().mockResolvedValue(null),
    resetPasswordWithRecovery: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }

  Object.defineProperty(window, 'auth', {
    configurable: true,
    writable: true,
    value: bridge,
  })

  return bridge
}

describe('AuthScreen remembered login', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useAuthStore.setState({
      status: 'unauthenticated',
      currentUser: null,
      loading: false,
      error: null,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'auth', {
      configurable: true,
      writable: true,
      value: originalAuth,
    })
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders a remembered user chip and fills the username when selected', async () => {
    window.localStorage.setItem(REMEMBERED_LOGIN_USERNAMES_KEY, JSON.stringify(['nora', 'matias']))
    installAuthBridge()

    render(<AuthScreen />)

    fireEvent.click(screen.getByRole('button', { name: /usar usuario nora/i }))

    expect(screen.getByPlaceholderText(/usuario/i)).toHaveValue('nora')
    await waitFor(() => expect(screen.getByPlaceholderText(/contrase/i)).toHaveFocus())
  })

  it('migrates the legacy remembered username into the multi-user list', () => {
    window.localStorage.setItem(REMEMBERED_LOGIN_USERNAME_KEY, 'nora')
    installAuthBridge()

    render(<AuthScreen />)

    expect(screen.getByRole('button', { name: /usar usuario nora/i })).toBeInTheDocument()
    expect(window.localStorage.getItem(REMEMBERED_LOGIN_USERNAME_KEY)).toBeNull()
    expect(JSON.parse(window.localStorage.getItem(REMEMBERED_LOGIN_USERNAMES_KEY) ?? '[]')).toEqual(['nora'])
  })

  it('stores the username after a successful opt-in login', async () => {
    const auth = installAuthBridge()

    render(<AuthScreen />)

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: 'nora' } })
    fireEvent.change(screen.getByPlaceholderText(/contrase/i), { target: { value: 'clave1234' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /recordar usuario/i }))
    fireEvent.click(screen.getByRole('button', { name: /^entrar$/i }))

    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('nora', 'clave1234'))
    expect(JSON.parse(window.localStorage.getItem(REMEMBERED_LOGIN_USERNAMES_KEY) ?? '[]')).toEqual(['nora'])
  })

  it('moves a remembered username to the front and caps the list after opt-in login', async () => {
    window.localStorage.setItem(REMEMBERED_LOGIN_USERNAMES_KEY, JSON.stringify(['uno', 'dos', 'nora', 'tres', 'cuatro']))
    const auth = installAuthBridge()

    render(<AuthScreen />)

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: 'nora' } })
    fireEvent.change(screen.getByPlaceholderText(/contrase/i), { target: { value: 'clave1234' } })
    fireEvent.click(screen.getByRole('button', { name: /^entrar$/i }))

    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('nora', 'clave1234'))
    expect(JSON.parse(window.localStorage.getItem(REMEMBERED_LOGIN_USERNAMES_KEY) ?? '[]')).toEqual([
      'nora',
      'uno',
      'dos',
      'tres',
      'cuatro',
    ])
  })

  it('removes only the current username after a successful login when opt-in is off', async () => {
    window.localStorage.setItem(REMEMBERED_LOGIN_USERNAMES_KEY, JSON.stringify(['nora', 'matias']))
    const auth = installAuthBridge()

    render(<AuthScreen />)

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: 'nora' } })
    fireEvent.change(screen.getByPlaceholderText(/contrase/i), { target: { value: 'clave1234' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /recordar usuario/i }))
    fireEvent.click(screen.getByRole('button', { name: /^entrar$/i }))

    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('nora', 'clave1234'))
    expect(JSON.parse(window.localStorage.getItem(REMEMBERED_LOGIN_USERNAMES_KEY) ?? '[]')).toEqual(['matias'])
  })

  it('forgets a remembered username from the login screen', () => {
    window.localStorage.setItem(REMEMBERED_LOGIN_USERNAMES_KEY, JSON.stringify(['nora', 'matias']))
    installAuthBridge()

    render(<AuthScreen />)

    fireEvent.click(screen.getByRole('button', { name: /olvidar usuario nora/i }))

    expect(JSON.parse(window.localStorage.getItem(REMEMBERED_LOGIN_USERNAMES_KEY) ?? '[]')).toEqual(['matias'])
    expect(screen.queryByRole('button', { name: /usar usuario nora/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /usar usuario matias/i })).toBeInTheDocument()
  })

  it('forgets all remembered usernames from the login screen', () => {
    window.localStorage.setItem(REMEMBERED_LOGIN_USERNAMES_KEY, JSON.stringify(['nora', 'matias']))
    installAuthBridge()

    render(<AuthScreen />)

    fireEvent.click(screen.getByRole('button', { name: /olvidar todos/i }))

    expect(JSON.parse(window.localStorage.getItem(REMEMBERED_LOGIN_USERNAMES_KEY) ?? '[]')).toEqual([])
    expect(screen.queryByRole('button', { name: /usar usuario nora/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /usar usuario matias/i })).not.toBeInTheDocument()
  })
})
