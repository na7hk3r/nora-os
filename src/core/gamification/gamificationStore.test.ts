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

describe('gamificationStore Pulso Nora migration', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useCoreStore.setState({ activePlugins: [] })
    resetGamificationStore()
  })

  it('recalculates legacy persisted levels from XP', async () => {
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
    expect(useGamificationStore.getState().level).toBe(6)
  })

  it('caps loaded users at Nori level 15', async () => {
    vi.spyOn(window.storage, 'query').mockResolvedValue([
      {
        value: JSON.stringify({
          points: 99_999,
          level: 120,
          streak: 0,
          history: [],
          unlockedIds: [],
        }),
      },
    ])

    await useGamificationStore.getState().loadFromStorage()

    expect(useGamificationStore.getState().level).toBe(15)
  })
})

