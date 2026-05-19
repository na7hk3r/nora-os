import { useEffect, useMemo, useState } from 'react'
import { eventBus } from '@core/events/EventBus'
import { CORE_EVENTS, GAMIFICATION_EVENTS } from '@core/events/events'
import { FITNESS_EVENTS } from '@plugins/fitness/events'
import { WORK_EVENTS } from '@plugins/work/events'
import { Trophy, Sparkles } from 'lucide-react'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { buildGamificationStats, isMissionTrackedEvent } from '@core/gamification/gamificationUtils'
import { useCoreStore } from '@core/state/coreStore'
import { getNoriStage, getRewardForLevel } from '@core/gamification/pulsoNora'
import { NoriSprite } from './components/NoriSprite'

type NotificationItem =
  | {
      id: string
      type: 'xp'
      amount: number
      reason: string
    }
  | {
      id: string
      type: 'achievement'
      title: string
      description: string
      icon: string
    }

interface LevelOverlayState {
  level: number
  visible: boolean
  rewardTitle?: string
  rewardDescription?: string
  stageTitle?: string
}

const ICON_LABEL_MAP: Record<string, string> = {
  Star: '✦',
  Flame: '🔥',
  Gem: '💎',
  Target: '🎯',
  PersonStanding: '🏋️',
  CheckCircle2: '✅',
  TimerReset: '⏱️',
  NotebookPen: '📝',
  Sunrise: '🌅',
}

export function GamificationNotificationHub() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [levelOverlay, setLevelOverlay] = useState<LevelOverlayState>({ level: 1, visible: false })

  const ensureDailyMissions = useGamificationStore((s) => s.ensureDailyMissions)
  const activePluginIds = useCoreStore((s) => s.activePlugins)

  const confetti = useMemo(
    () =>
      Array.from({ length: 26 }).map((_, idx) => ({
        id: idx,
        left: `${(idx * 3.9) % 100}%`,
        delay: `${(idx % 7) * 90}ms`,
        duration: `${1800 + (idx % 5) * 220}ms`,
      })),
    [],
  )

  useEffect(() => {
    ensureDailyMissions()

    const stats = buildGamificationStats(
      useGamificationStore.getState().points,
      useGamificationStore.getState().streak,
      useGamificationStore.getState().history,
    )
    useGamificationStore.getState().checkAchievements(stats)

    const removeLater = (id: string, delay = 2100) => {
      window.setTimeout(() => {
        setNotifications((prev) => prev.filter((item) => item.id !== id))
      }, delay)
    }

    const onPointsAdded = (payload: unknown) => {
      const data = (payload ?? {}) as { amount?: number; reason?: string }
      const amount = Number(data.amount ?? 0)
      if (amount === 0) return

      const id = crypto.randomUUID()
      setNotifications((prev) => [
        ...prev,
        {
          id,
          type: 'xp',
          amount,
          reason: String(data.reason ?? 'Progreso'),
        },
      ])
      removeLater(id)
    }

    const onAchievementUnlocked = (payload: unknown) => {
      const data = (payload ?? {}) as { title?: string; description?: string; icon?: string }
      const id = crypto.randomUUID()
      setNotifications((prev) => [
        ...prev,
        {
          id,
          type: 'achievement',
          title: String(data.title ?? 'Logro desbloqueado'),
          description: String(data.description ?? 'Segui asi, vas excelente.'),
          icon: String(data.icon ?? 'Star'),
        },
      ])
      removeLater(id, 2800)
    }

    const onLevelUp = (payload: unknown) => {
      const data = (payload ?? {}) as { level?: number }
      const level = Number(data.level ?? 1)
      const reward = getRewardForLevel(level)
      const stage = getNoriStage(level)
      setLevelOverlay({
        level,
        visible: true,
        rewardTitle: reward?.title,
        rewardDescription: reward?.description,
        stageTitle: stage.title,
      })
      window.setTimeout(() => {
        setLevelOverlay((prev) => ({ ...prev, visible: false }))
      }, 3000)
    }

    const onAction = (eventName: string) => {
      const store = useGamificationStore.getState()
      if (isMissionTrackedEvent(eventName)) {
        store.processMissionEvent(eventName)
      }

      const refreshedStats = buildGamificationStats(store.points, store.streak, store.history)
      store.checkAchievements(refreshedStats)
    }

    const unsubs = [
      eventBus.on(GAMIFICATION_EVENTS.POINTS_ADDED, onPointsAdded),
      eventBus.on(GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED, onAchievementUnlocked),
      eventBus.on(GAMIFICATION_EVENTS.LEVEL_UP, onLevelUp),
      eventBus.on(CORE_EVENTS.PLUGIN_ACTIVATED, () => ensureDailyMissions()),
      eventBus.on(CORE_EVENTS.PLUGIN_DEACTIVATED, () => ensureDailyMissions()),
      eventBus.on(FITNESS_EVENTS.DAILY_ENTRY_SAVED, () => onAction(FITNESS_EVENTS.DAILY_ENTRY_SAVED)),
      eventBus.on(FITNESS_EVENTS.WORKOUT_COMPLETED, () => onAction(FITNESS_EVENTS.WORKOUT_COMPLETED)),
      eventBus.on(FITNESS_EVENTS.MEASUREMENT_SAVED, () => onAction(FITNESS_EVENTS.MEASUREMENT_SAVED)),
      eventBus.on(WORK_EVENTS.TASK_COMPLETED, () => onAction(WORK_EVENTS.TASK_COMPLETED)),
      eventBus.on(WORK_EVENTS.FOCUS_STARTED, () => onAction(WORK_EVENTS.FOCUS_STARTED)),
      eventBus.on(WORK_EVENTS.FOCUS_COMPLETED, () => onAction(WORK_EVENTS.FOCUS_COMPLETED)),
      eventBus.on(WORK_EVENTS.NOTE_CREATED, () => onAction(WORK_EVENTS.NOTE_CREATED)),
      eventBus.on(CORE_EVENTS.PLANNER_TASK_COMPLETED, () => onAction(CORE_EVENTS.PLANNER_TASK_COMPLETED)),
    ]

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe())
    }
  }, [ensureDailyMissions, activePluginIds])

  return (
    <>
      <div
        role="region"
        aria-label="Notificaciones de progreso"
        aria-live="polite"
        className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      >
        <div className="absolute right-5 top-5 flex w-[min(380px,90vw)] flex-col gap-2">
          {notifications
            .filter((item) => item.type === 'xp')
            .map((item) => {
              if (item.type !== 'xp') return null
              const positive = item.amount > 0
              return (
                <div
                  key={item.id}
                  className={`xp-toast animate-xp-float rounded-xl border px-4 py-3 shadow-xl backdrop-blur ${
                    positive
                      ? 'border-success/30 bg-success/15 text-success'
                      : 'border-danger/30 bg-danger/10 text-danger'
                  }`}
                >
                  <p className="text-sm font-semibold">{positive ? '+' : ''}{item.amount} XP ✦ {item.reason}</p>
                </div>
              )
            })}
        </div>

        <div className="absolute left-1/2 top-4 flex w-[min(500px,92vw)] -translate-x-1/2 flex-col gap-2">
          {notifications
            .filter((item) => item.type === 'achievement')
            .map((item) => {
              if (item.type !== 'achievement') return null
              return (
                <div
                  key={item.id}
                  className="animate-achievement-slide rounded-2xl border border-xp-gold/70 bg-gradient-to-r from-[#3a2a09]/90 to-[#5b3f0f]/90 px-4 py-3 text-amber-100 shadow-2xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-2xl">{ICON_LABEL_MAP[item.icon] ?? '🏅'}</div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 text-sm font-semibold tracking-wide uppercase">
                        <Trophy size={14} />
                        Logro desbloqueado
                      </p>
                      <p className="mt-0.5 text-base font-semibold">{item.title}</p>
                      <p className="text-sm text-amber-200/90">{item.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {levelOverlay.visible && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
          <div className="relative w-[min(620px,92vw)] overflow-hidden rounded-3xl border border-accent/35 bg-surface-light/95 p-8 text-center shadow-2xl animate-level-burst">
            <div className="absolute inset-0 opacity-90">
              {confetti.map((piece) => (
                <span
                  key={piece.id}
                  className="confetti-piece"
                  style={{
                    left: piece.left,
                    animationDelay: piece.delay,
                    animationDuration: piece.duration,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center gap-3">
              <NoriSprite level={levelOverlay.level} size="hero" />
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted">Pulso Nora</p>
                <p className="text-4xl font-black text-white">Nori nivel {levelOverlay.level}</p>
                {levelOverlay.stageTitle && (
                  <p className="mt-1 text-sm text-accent-light">{levelOverlay.stageTitle}</p>
                )}
              </div>
              {levelOverlay.rewardTitle && (
                <div className="max-w-md rounded-xl border border-accent/25 bg-accent/10 px-4 py-3">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                    <Sparkles className="text-xp-gold" size={16} />
                    {levelOverlay.rewardTitle}
                  </p>
                  <p className="mt-1 text-xs text-muted">{levelOverlay.rewardDescription}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
