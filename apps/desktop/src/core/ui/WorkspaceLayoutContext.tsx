import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  defaultSecondaryWorkspacePath,
  normalizeWorkspacePath,
} from './workspaceRoutes'

export const WORKSPACE_LAYOUT_SETTINGS_KEY = 'core:workspaceLayout:v1'
export type WorkspacePaneId = 'primary' | 'secondary'

export interface WorkspaceLayoutSnapshot {
  dualEnabled: boolean
  activePane: WorkspacePaneId
  secondaryPath: string
  splitRatio: number
}

interface NavigateWorkspaceOptions {
  pane?: WorkspacePaneId
  openDual?: boolean
  replace?: boolean
}

interface WorkspaceLayoutContextValue extends WorkspaceLayoutSnapshot {
  navigateWorkspace: (path: string, options?: NavigateWorkspaceOptions) => void
  openDual: (path?: string) => void
  closeDual: () => void
  setActivePane: (pane: WorkspacePaneId) => void
  setSplitRatio: (value: number) => void
}

const DEFAULT_SPLIT_RATIO = 50
const MIN_SPLIT_RATIO = 32
const MAX_SPLIT_RATIO = 68

const WorkspaceLayoutContext = createContext<WorkspaceLayoutContextValue | null>(null)

function clampSplitRatio(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_SPLIT_RATIO
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, Math.round(numeric)))
}

function sanitizePane(value: unknown): WorkspacePaneId {
  return value === 'secondary' ? 'secondary' : 'primary'
}

function sanitizeLayoutSnapshot(
  value: unknown,
  fallbackSecondaryPath: string,
): WorkspaceLayoutSnapshot {
  if (!value || typeof value !== 'object') {
    return {
      dualEnabled: false,
      activePane: 'primary',
      secondaryPath: fallbackSecondaryPath,
      splitRatio: DEFAULT_SPLIT_RATIO,
    }
  }

  const raw = value as Partial<WorkspaceLayoutSnapshot>
  const dualEnabled = Boolean(raw.dualEnabled)
  const activePane = dualEnabled ? sanitizePane(raw.activePane) : 'primary'
  const secondaryPath = normalizeWorkspacePath(raw.secondaryPath || fallbackSecondaryPath)

  return {
    dualEnabled,
    activePane,
    secondaryPath,
    splitRatio: clampSplitRatio(raw.splitRatio),
  }
}

export function WorkspaceLayoutProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [loaded, setLoaded] = useState(false)
  const [layout, setLayout] = useState<WorkspaceLayoutSnapshot>(() => ({
    dualEnabled: false,
    activePane: 'primary',
    secondaryPath: defaultSecondaryWorkspacePath(location.pathname),
    splitRatio: DEFAULT_SPLIT_RATIO,
  }))

  useEffect(() => {
    let cancelled = false
    const fallbackSecondaryPath = defaultSecondaryWorkspacePath(location.pathname)

    if (!window.storage) {
      setLoaded(true)
      return
    }

    void window.storage
      .query('SELECT value FROM settings WHERE key = ? LIMIT 1', [WORKSPACE_LAYOUT_SETTINGS_KEY])
      .then((rows) => {
        if (cancelled) return
        const list = rows as { value: string }[]
        const raw = list[0]?.value
        if (!raw) {
          return
        }
        try {
          setLayout(sanitizeLayoutSnapshot(JSON.parse(raw), fallbackSecondaryPath))
        } catch {
          setLayout(sanitizeLayoutSnapshot(null, fallbackSecondaryPath))
        }
      })
      .catch(() => {
        // Keep the optimistic in-memory default if persistence is unavailable.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => {
      cancelled = true
    }
    // Load once from the route that booted the workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!loaded || !window.storage) return
    void window.storage.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [WORKSPACE_LAYOUT_SETTINGS_KEY, JSON.stringify(layout)],
    )
  }, [layout, loaded])

  const navigateWorkspace = useCallback((path: string, options: NavigateWorkspaceOptions = {}) => {
    const normalized = normalizeWorkspacePath(path)
    const targetPane = options.pane ?? (layout.dualEnabled ? layout.activePane : 'primary')

    if (targetPane === 'secondary') {
      setLayout((prev) => ({
        ...prev,
        dualEnabled: true,
        activePane: 'secondary',
        secondaryPath: normalized,
      }))
      return
    }

    setLayout((prev) => ({
      ...prev,
      dualEnabled: options.openDual ? true : prev.dualEnabled,
      activePane: 'primary',
    }))
    navigate(normalized, { replace: options.replace })
  }, [layout.activePane, layout.dualEnabled, navigate])

  const openDual = useCallback((path?: string) => {
    setLayout((prev) => ({
      ...prev,
      dualEnabled: true,
      activePane: 'secondary',
      secondaryPath: normalizeWorkspacePath(path || prev.secondaryPath || defaultSecondaryWorkspacePath(location.pathname)),
    }))
  }, [location.pathname])

  const closeDual = useCallback(() => {
    setLayout((prev) => ({
      ...prev,
      dualEnabled: false,
      activePane: 'primary',
    }))
  }, [])

  const setActivePane = useCallback((pane: WorkspacePaneId) => {
    setLayout((prev) => ({
      ...prev,
      dualEnabled: pane === 'secondary' ? true : prev.dualEnabled,
      activePane: pane,
    }))
  }, [])

  const setSplitRatio = useCallback((value: number) => {
    setLayout((prev) => ({
      ...prev,
      splitRatio: clampSplitRatio(value),
    }))
  }, [])

  const value = useMemo<WorkspaceLayoutContextValue>(() => ({
    ...layout,
    navigateWorkspace,
    openDual,
    closeDual,
    setActivePane,
    setSplitRatio,
  }), [closeDual, layout, navigateWorkspace, openDual, setActivePane, setSplitRatio])

  return (
    <WorkspaceLayoutContext.Provider value={value}>
      {children}
    </WorkspaceLayoutContext.Provider>
  )
}

export function useWorkspaceLayout(): WorkspaceLayoutContextValue {
  const value = useContext(WorkspaceLayoutContext)
  if (!value) {
    throw new Error('useWorkspaceLayout must be used inside WorkspaceLayoutProvider')
  }
  return value
}
