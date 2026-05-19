import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCoreStore } from '@core/state/coreStore'
import { useGamificationStore } from './gamificationStore'

function resetGamificationStore() {
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
}

describe('gamificationStore Pulso Nora persistence', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useCoreStore.setState({ activePlugins: [] })
    resetGamificationStore()
  })

  it('preserves persisted levels even when the current XP curve would lower them', async () => {
    vi.spyOn(window.storage, 'query').mockResolvedValue([
      {
        value: JSON.stringify({
          points: 1030,
          level: 99,
          streak: 0,
          history: [],
          unlockedIds: [],
        }),
      },
    ])

    await useGamificationStore.getState().loadFromStorage()

    expect(useGamificationStore.getState().points).toBe(1030)
    expect(useGamificationStore.getState().level).toBe(99)
  })

  it('derives the level from XP only when no persisted level exists', async () => {
    vi.spyOn(window.storage, 'query').mockResolvedValue([
      {
        value: JSON.stringify({
          points: 1030,
          streak: 0,
          history: [],
          unlockedIds: [],
        }),
      },
    ])

    await useGamificationStore.getState().loadFromStorage()

    expect(useGamificationStore.getState().level).toBe(6)
  })

  it('raises a lower persisted level when XP unlocks a higher current level', async () => {
    vi.spyOn(window.storage, 'query').mockResolvedValue([
      {
        value: JSON.stringify({
          points: 99_999,
          level: 1,
          streak: 0,
          history: [],
          unlockedIds: [],
        }),
      },
    ])

    await useGamificationStore.getState().loadFromStorage()

    expect(useGamificationStore.getState().level).toBe(15)
  })

  it('does not downgrade the current level when adding XP', () => {
    const execute = vi.spyOn(window.storage, 'execute')
    useGamificationStore.setState({
      points: 1030,
      level: 99,
      streak: 0,
      history: [],
      unlockedIds: [],
    })

    useGamificationStore.getState().addPoints(1, 'test')

    expect(useGamificationStore.getState().points).toBe(1031)
    expect(useGamificationStore.getState().level).toBe(99)
    expect(execute).toHaveBeenCalled()
  })
})
