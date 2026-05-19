import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from './components/ToastProvider'
import { TodayFocus } from './TodayFocus'
import { useCoreStore } from '@core/state/coreStore'
import { useGamificationStore, type DailyMission } from '@core/gamification/gamificationStore'
import { useWorkStore } from '@plugins/work/store'

vi.mock('./hooks/usePlannerTasksToday', () => ({
  usePlannerTasksToday: () => [],
}))

function mission(overrides: Partial<DailyMission>): DailyMission {
  return {
    id: 'mission',
    title: 'Mision',
    description: 'Descripcion',
    xp: 5,
    triggerEvents: [],
    completed: false,
    ...overrides,
  }
}

function renderTodayFocus() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <TodayFocus />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('TodayFocus mission sweeping', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    useCoreStore.setState({ activePlugins: [] })
    useWorkStore.setState({
      boards: [],
      columns: [],
      cards: [],
      notes: [],
      links: [],
      focusSessions: [],
      currentFocusSession: null,
    })
    window.localStorage.removeItem('dashboard:todayFocusCollapsed:v1')
    useGamificationStore.setState({
      points: 0,
      level: 1,
      streak: 0,
      history: [],
      unlockedIds: [],
      dailyMissions: [],
      dailyMissionsDate: '',
      missionsCompletedDate: undefined,
      sweptMissionIds: [],
      sweptMissionsDate: undefined,
      lastActionAt: undefined,
    })
  })

  it('hides completed missions without changing XP, history, or badges', async () => {
    useCoreStore.setState({ activePlugins: [] })
    useGamificationStore.setState({
      points: 42,
      level: 1,
      streak: 0,
      history: [{ amount: 5, reason: 'Mision diaria', date: new Date().toISOString() }],
      unlockedIds: ['first-entry'],
      dailyMissions: [
        mission({ id: 'done', title: 'Completada', completed: true, xp: 5 }),
        mission({ id: 'pending', title: 'Pendiente', completed: false, xp: 8 }),
      ],
      dailyMissionsDate: new Date().toISOString().slice(0, 10),
      sweptMissionIds: [],
      sweptMissionsDate: undefined,
    })

    renderTodayFocus()

    await waitFor(() => expect(screen.getByText('Completada')).toBeInTheDocument())
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /limpiar/i }))
    })

    expect(screen.queryByText('Completada')).not.toBeInTheDocument()
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)

    const state = useGamificationStore.getState()
    expect(state.points).toBe(42)
    expect(state.history).toHaveLength(1)
    expect(state.unlockedIds).toEqual(['first-entry'])
    expect(state.sweptMissionIds).toEqual(['done'])
  })

  it('clears stale swept missions when loading a new day', async () => {
    const querySpy = vi.spyOn(window.storage, 'query').mockResolvedValue([
      {
        value: JSON.stringify({
          points: 10,
          level: 1,
          streak: 0,
          history: [],
          unlockedIds: [],
          dailyMissionsDate: '2000-01-01',
          dailyMissions: [
            mission({ id: 'core-planner-task', title: 'Vieja', completed: true }),
          ],
          sweptMissionIds: ['core-planner-task'],
          sweptMissionsDate: '2000-01-01',
        }),
      },
    ])

    await useGamificationStore.getState().loadFromStorage()

    expect(querySpy).toHaveBeenCalled()
    expect(useGamificationStore.getState().sweptMissionIds).toEqual([])
    expect(useGamificationStore.getState().sweptMissionsDate).toBeUndefined()
  })

  it('wraps a long suggested task in compact focus instead of truncating it', async () => {
    const longTitle = 'Preparar una propuesta extremadamente larga con contexto operativo, dependencias, riesgos, seguimiento y una siguiente accion accionable sin romper el dashboard'
    window.localStorage.setItem('dashboard:todayFocusCollapsed:v1', '1')
    useCoreStore.setState({ activePlugins: ['work'] })
    useWorkStore.setState({
      columns: [
        { id: 'todo', boardId: 'board', name: 'Pendiente', position: 0 },
        { id: 'done', boardId: 'board', name: 'Hecho', position: 1 },
      ],
      cards: [
        {
          id: 'long-task',
          columnId: 'todo',
          title: longTitle,
          description: '',
          content: '',
          labels: [],
          dueDate: new Date().toISOString().slice(0, 10),
          position: 0,
          priority: 'high',
          estimateMinutes: 120,
          checklist: [],
          archived: false,
          archivedAt: null,
        },
      ],
    })

    renderTodayFocus()

    const title = await screen.findByText(longTitle)
    expect(title).toHaveClass('line-clamp-2')
    expect(title).toHaveClass('break-words')
    expect(title).not.toHaveClass('truncate')
  })
})
