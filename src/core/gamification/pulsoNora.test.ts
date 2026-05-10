import { describe, expect, it } from 'vitest'
import {
  NORA_MAX_LEVEL,
  getNoriLevel,
  getNoriProgress,
  getNoriSprite,
  getUnlockedRewards,
  isRewardUnlocked,
} from './pulsoNora'

describe('Pulso Nora progression', () => {
  it('maps XP to a capped 15-level curve', () => {
    expect(NORA_MAX_LEVEL).toBe(15)
    expect(getNoriLevel(0)).toBe(1)
    expect(getNoriLevel(119)).toBe(1)
    expect(getNoriLevel(120)).toBe(2)
    expect(getNoriLevel(1030)).toBe(6)
    expect(getNoriLevel(5980)).toBe(15)
    expect(getNoriLevel(99_999)).toBe(15)
  })

  it('computes progress inside the current level', () => {
    const progress = getNoriProgress(200)

    expect(progress.level).toBe(2)
    expect(progress.currentLevelXp).toBe(120)
    expect(progress.nextLevelXp).toBe(280)
    expect(progress.xpInLevel).toBe(80)
    expect(progress.xpForLevel).toBe(160)
    expect(progress.xpToNextLevel).toBe(80)
    expect(progress.percent).toBe(50)
  })

  it('keeps max level progress complete', () => {
    const progress = getNoriProgress(7000)

    expect(progress.level).toBe(15)
    expect(progress.isMaxLevel).toBe(true)
    expect(progress.nextLevelXp).toBeNull()
    expect(progress.percent).toBe(100)
  })

  it('resolves sprite paths for each evolution', () => {
    expect(getNoriSprite(1)).toBe('/nora-evo/nori-01.png')
    expect(getNoriSprite(15)).toBe('/nora-evo/nori-15.png')
  })

  it('unlocks rewards by level', () => {
    expect(isRewardUnlocked('weekly-review', 4)).toBe(false)
    expect(isRewardUnlocked('weekly-review', 5)).toBe(true)
    expect(isRewardUnlocked('copilot-actions', 5)).toBe(false)
    expect(isRewardUnlocked('copilot-actions', 6)).toBe(true)
    expect(getUnlockedRewards(6).map((reward) => reward.id)).toContain('copilot-actions')
  })
})

