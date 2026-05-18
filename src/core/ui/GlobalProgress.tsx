import { useState } from 'react'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import {
  buildGamificationStats,
  getAchievementProgress,
  getNextAchievement,
  getXpHistoryByDay,
} from '@core/gamification/gamificationUtils'
import {
  NORA_REWARDS,
  PULSO_NORA_COMPANION_NAME,
  PULSO_NORA_SYSTEM_NAME,
  getNextReward,
  getNoriProgress,
  getNoriStage,
} from '@core/gamification/pulsoNora'
import { NoriSprite } from './components/NoriSprite'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CheckCircle2,
  Flame,
  Gem,
  LockKeyhole,
  NotebookPen,
  PersonStanding,
  Sparkles,
  Star,
  Sunrise,
  Target,
  TimerReset,
  Unlock,
  X,
} from 'lucide-react'
import { useI18n } from '@core/i18n'

const PLUGIN_LABELS: Record<string, string> = {
  fitness: 'Fitness',
  work: 'Work',
}

const REASON_PREFIXES = [
  { prefix: 'fitness', label: 'Fitness' },
  { prefix: 'work', label: 'Work' },
  { prefix: 'weight', label: 'Fitness' },
  { prefix: 'task', label: 'Work' },
  { prefix: 'note', label: 'Work' },
]

const ACH_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Star,
  Flame,
  Gem,
  Target,
  PersonStanding,
  CheckCircle2,
  TimerReset,
  NotebookPen,
  Sunrise,
}

function categorizeReason(reason: string): string {
  const lower = reason.toLowerCase()
  for (const { prefix, label } of REASON_PREFIXES) {
    if (lower.includes(prefix)) return label
  }
  return 'General'
}

export function GlobalProgress() {
  const { t, language } = useI18n()
  const { points, level, streak, history, unlockedIds, achievements } = useGamificationStore()
  const [achievementsExpanded, setAchievementsExpanded] = useState(false)
  const [evolutionsOpen, setEvolutionsOpen] = useState(false)
  const progress = getNoriProgress(points, level)
  const stage = getNoriStage(level)
  const stats = buildGamificationStats(points, streak, history)
  const xpByDay = getXpHistoryByDay(history, 7)
  const nextAchievement = getNextAchievement(achievements, unlockedIds, stats)
  const nextReward = getNextReward(level)
  const nextNoriLevel = Math.min(progress.level + 1, progress.maxLevel)
  const stageCopy = t.gamification.stages[stage.id] ?? stage
  const nextRewardCopy = nextReward ? (t.gamification.rewards[nextReward.id] ?? nextReward) : null

  const breakdown = history.reduce<Record<string, number>>((acc, entry) => {
    const cat = categorizeReason(entry.reason)
    acc[cat] = (acc[cat] ?? 0) + entry.amount
    return acc
  }, {})

  const breakdownEntries = Object.entries(breakdown).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface-light/85 p-5 shadow-lg">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex min-h-44 w-full items-end justify-center sm:w-56 sm:justify-start">
            <div className="absolute bottom-4 h-4 w-36 rounded-[50%] bg-black/35 blur-md" aria-hidden />
            <button
              type="button"
              onClick={() => setEvolutionsOpen(true)}
              className="relative z-10 -mb-2 rounded-full outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-accent/70 sm:-ml-3"
              aria-label="Ver evoluciones de Nori"
              title="Ver evoluciones de Nori"
            >
              <NoriSprite level={level} size="hero" />
            </button>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-caption uppercase tracking-eyebrow text-muted">{PULSO_NORA_SYSTEM_NAME}</p>
              <h2 className="text-2xl font-semibold text-white">
                {PULSO_NORA_COMPANION_NAME} nivel {level}
              </h2>
              <p className="text-sm text-muted">{stageCopy.title} - {stageCopy.description}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-accent-light">{points} XP total</span>
                <span className="text-muted">
                  {progress.isMaxLevel
                    ? (language === 'en' ? 'Max level' : 'Nivel máximo')
                    : language === 'en'
                      ? `${progress.xpInLevel}/${progress.xpForLevel} XP toward level ${level + 1}`
                      : `${progress.xpInLevel}/${progress.xpForLevel} XP hacia nivel ${level + 1}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-surface">
                  <div
                    className="progress-bar-fill h-3 rounded-full bg-gradient-to-r from-accent via-violet-400 to-accent-light transition-all duration-500"
                    style={{ width: `${progress.percent}%` }}
                  >
                    <span className="absolute inset-0 progress-shimmer" />
                  </div>
                  {[25, 50, 75].map((pct) => (
                    <div
                      key={pct}
                      className={`absolute bottom-0 top-0 w-px ${progress.percent >= pct ? 'bg-white/35' : 'bg-surface-lighter'}`}
                      style={{ left: `${pct}%` }}
                    />
                  ))}
                </div>
                <div
                  className="relative flex h-16 w-14 shrink-0 items-center justify-center"
                  title={progress.isMaxLevel ? (language === 'en' ? 'Final evolution unlocked' : 'Evolución final desbloqueada') : (language === 'en' ? `Next evolution: level ${nextNoriLevel}` : `Siguiente evolución: nivel ${nextNoriLevel}`)}
                >
                  <div className="absolute bottom-1 h-2 w-10 rounded-[50%] bg-black/35 blur-sm" aria-hidden />
                  <NoriSprite
                    level={progress.isMaxLevel ? progress.level : nextNoriLevel}
                    size="md"
                    decorative
                    className={progress.isMaxLevel ? 'relative z-10' : 'relative z-10 opacity-35 grayscale brightness-75 blur-[0.6px]'}
                  />
                  {!progress.isMaxLevel && (
                    <span className="absolute right-0 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-light/90 text-muted shadow">
                      <LockKeyhole size={11} />
                    </span>
                  )}
                </div>
              </div>
              <p className="text-right text-caption text-muted">
                {progress.isMaxLevel ? (language === 'en' ? 'Final evolution unlocked' : 'Evolución final desbloqueada') : (language === 'en' ? `Next evolution locked: level ${nextNoriLevel}` : `Siguiente evolución bloqueada: nivel ${nextNoriLevel}`)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <PulseStat label={language === 'en' ? 'Streak' : 'Racha'} value={`${streak}d`} icon={<Flame size={14} className="text-warning" />} />
              <PulseStat label={language === 'en' ? 'Evolution' : 'Evolución'} value={`${level}/15`} icon={<Sparkles size={14} className="text-accent-light" />} />
              <PulseStat
                label={nextReward ? (language === 'en' ? 'Next unlock' : 'Próximo desbloqueo') : (language === 'en' ? 'Status' : 'Estado')}
                value={nextReward ? (language === 'en' ? `Level ${nextReward.level}` : `Nivel ${nextReward.level}`) : (language === 'en' ? 'Complete' : 'Completo')}
                icon={nextReward ? <LockKeyhole size={14} className="text-muted" /> : <Unlock size={14} className="text-success" />}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface/55 p-4">
          <p className="text-caption uppercase tracking-eyebrow text-muted">{language === 'en' ? 'Active pulse' : 'Pulso activo'}</p>
          <div className="mt-3 space-y-3">
            {nextReward ? (
              <div className="rounded-lg border border-accent/25 bg-accent/10 p-3">
                <p className="text-xs font-semibold text-accent-light">{nextRewardCopy?.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{nextRewardCopy?.description}</p>
              </div>
            ) : (
              <div className="rounded-lg border border-success/30 bg-success/10 p-3">
                <p className="text-xs font-semibold text-success">Nori sincronizado</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">Todas las recompensas de Pulso Nora están activas.</p>
              </div>
            )}
            {nextAchievement && (
              <div className="rounded-lg border border-border bg-surface/70 p-3">
                <p className="text-xs font-semibold text-white">
                  {t.gamification.achievements[nextAchievement.id]?.title ?? nextAchievement.title}
                </p>
                <p className="mt-1 text-caption text-muted">
                  {nextAchievement.progress.current}/{nextAchievement.progress.target}{' '}
                  {t.gamification.progressLabels[nextAchievement.progress.label] ?? nextAchievement.progress.label}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface/50 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-eyebrow text-muted">Desbloqueos de Nori</p>
          <span className="text-caption text-muted">{level}/15 activos</span>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          {NORA_REWARDS.map((reward) => {
            const unlocked = reward.level <= level
            const rewardCopy = t.gamification.rewards[reward.id] ?? reward
            return (
              <div
                key={reward.id}
                className={`min-h-[88px] rounded-lg border p-2.5 transition-colors ${
                  unlocked
                    ? 'border-accent/35 bg-accent/10'
                    : 'border-border bg-surface/60 opacity-75'
                }`}
                title={rewardCopy.description}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-caption font-semibold ${unlocked ? 'text-accent-light' : 'text-muted'}`}>
                    {language === 'en' ? `Level ${reward.level}` : `Nivel ${reward.level}`}
                  </span>
                  {unlocked ? <Unlock size={12} className="text-success" /> : <LockKeyhole size={12} className="text-muted" />}
                </div>
                <p className="mt-1 line-clamp-2 text-xs font-semibold text-white">{rewardCopy.title}</p>
                <p className="mt-1 line-clamp-2 text-caption text-muted">{rewardCopy.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface/50 p-3">
        <p className="mb-2 text-xs uppercase tracking-eyebrow text-muted">{language === 'en' ? 'XP last 7 days' : 'XP últimos 7 días'}</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={xpByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="date" stroke="var(--chart-axis)" fontSize={11} />
              <YAxis stroke="var(--chart-axis)" fontSize={11} width={28} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--chart-tooltip-bg)',
                  border: '1px solid var(--chart-tooltip-border)',
                }}
                labelStyle={{ color: 'var(--chart-axis)' }}
              />
              <Bar dataKey="xp" fill="var(--chart-weight)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {breakdownEntries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {breakdownEntries.map(([cat, xp]) => (
            <span
              key={cat}
              className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs text-muted"
            >
              {PLUGIN_LABELS[cat.toLowerCase()] ?? cat}: +{xp} XP
            </span>
          ))}
        </div>
      )}

      {(() => {
        const VISIBLE_COUNT = 6
        const visible = achievementsExpanded ? achievements : achievements.slice(0, VISIBLE_COUNT)
        const hiddenCount = achievements.length - VISIBLE_COUNT
        return (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((ach) => {
                const unlocked = unlockedIds.includes(ach.id)
                const Icon = ACH_ICON_MAP[ach.icon] ?? Star
                const achievementProgress = getAchievementProgress(ach.id, stats)
                const achCopy = t.gamification.achievements[ach.id] ?? ach
                return (
                  <div
                    key={ach.id}
                    title={`${achCopy.title}: ${achCopy.description}`}
                    className={`cursor-default rounded-xl border p-2.5 transition-all duration-200 ${
                      unlocked
                        ? 'border-xp-gold/55 bg-xp-gold/10'
                        : 'border-border bg-surface/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`rounded-lg p-1.5 ${unlocked ? 'bg-xp-gold/20 text-xp-gold' : 'bg-surface text-muted'}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{achCopy.title}</p>
                        <p className="truncate text-caption text-muted">{achCopy.description}</p>
                      </div>
                    </div>
                    {!unlocked && (
                      <div className="mt-2 space-y-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-lighter">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-warning to-xp-gold transition-all duration-500"
                            style={{ width: `${achievementProgress.percent}%` }}
                          />
                        </div>
                        <p className="text-caption text-muted">
                          {achievementProgress.current}/{achievementProgress.target}{' '}
                          {t.gamification.progressLabels[achievementProgress.label] ?? achievementProgress.label}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setAchievementsExpanded((prev) => !prev)}
                className="w-full rounded-lg border border-border bg-surface/40 py-1.5 text-xs text-muted transition-colors hover:bg-surface-lighter hover:text-white"
              >
                {achievementsExpanded
                  ? (language === 'en' ? 'Show less' : 'Ver menos')
                  : language === 'en'
                    ? `Show ${hiddenCount} more achievement${hiddenCount !== 1 ? 's' : ''}`
                    : `Ver ${hiddenCount} logro${hiddenCount !== 1 ? 's' : ''} más`}
              </button>
            )}
          </>
        )
      })()}

      {evolutionsOpen && (
        <NoriEvolutionsDialog
          currentLevel={level}
          previewLevel={progress.isMaxLevel ? null : nextNoriLevel}
          onClose={() => setEvolutionsOpen(false)}
        />
      )}
    </div>
  )
}

function PulseStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 px-3 py-2">
      <div className="flex items-center gap-1.5 text-caption uppercase tracking-wider text-muted">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function NoriEvolutionsDialog({
  currentLevel,
  previewLevel,
  onClose,
}: {
  currentLevel: number
  previewLevel: number | null
  onClose: () => void
}) {
  const { t, language } = useI18n()
  const rows = [
    ...Array.from({ length: currentLevel }, (_, index) => ({
      level: index + 1,
      unlocked: true,
    })),
    ...(previewLevel ? [{ level: previewLevel, unlocked: false }] : []),
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={language === 'en' ? 'Nori evolutions' : 'Evoluciones de Nori'}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="max-h-[88vh] w-[min(760px,94vw)] overflow-hidden rounded-2xl border border-border bg-surface-light/95 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-caption uppercase tracking-eyebrow text-muted">{language === 'en' ? 'Evolution archive' : 'Archivo evolutivo'}</p>
            <h3 className="text-lg font-semibold text-white">{language === 'en' ? 'Nori evolutions' : 'Evoluciones de Nori'}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-accent/40 hover:text-white"
            aria-label={language === 'en' ? 'Close evolutions' : 'Cerrar evoluciones'}
            title={t.common.close}
          >
            <X size={15} />
          </button>
        </header>

        <div className="max-h-[calc(88vh-74px)] overflow-y-auto p-4">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface text-caption uppercase tracking-eyebrow text-muted">
                <tr>
                  <th className="w-24 px-3 py-2 font-medium">{language === 'en' ? 'Level' : 'Nivel'}</th>
                  <th className="px-3 py-2 font-medium">{language === 'en' ? 'Evolution' : 'Evolución'}</th>
                  <th className="px-3 py-2 font-medium">{language === 'en' ? 'Unlock' : 'Desbloqueo'}</th>
                  <th className="w-28 px-3 py-2 font-medium">{language === 'en' ? 'Status' : 'Estado'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface/45">
                {rows.map((row) => {
                  const reward = NORA_REWARDS.find((item) => item.level === row.level)
                  const rewardCopy = reward ? (t.gamification.rewards[reward.id] ?? reward) : null
                  return (
                    <tr key={`${row.level}-${row.unlocked ? 'unlocked' : 'preview'}`} className={row.unlocked ? '' : 'bg-surface-light/40'}>
                      <td className="px-3 py-3 align-middle text-xs font-semibold text-accent-light">
                        {language === 'en' ? `Level ${row.level}` : `Nivel ${row.level}`}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                            <div className="absolute bottom-1 h-2 w-10 rounded-[50%] bg-black/35 blur-sm" aria-hidden />
                            <NoriSprite
                              level={row.level}
                              size="md"
                              decorative
                              className={row.unlocked ? 'relative z-10' : 'relative z-10 opacity-35 grayscale brightness-75 blur-[0.6px]'}
                            />
                            {!row.unlocked && (
                              <span className="absolute right-0 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-light/90 text-muted shadow">
                                <LockKeyhole size={11} />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">
                              {row.unlocked
                                ? (language === 'en' ? `Nori level ${row.level}` : `Nori nivel ${row.level}`)
                                : (language === 'en' ? `Level ${row.level} preview` : `Preview nivel ${row.level}`)}
                            </p>
                            <p className="text-caption text-muted">
                              {row.unlocked
                                ? (language === 'en' ? 'Evolution unlocked' : 'Evolución desbloqueada')
                                : (language === 'en' ? 'Next evolution hidden' : 'Siguiente evolucion oculta')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <p className="text-xs font-semibold text-white">{rewardCopy?.title ?? 'Pulso Nora'}</p>
                        <p className="mt-0.5 line-clamp-2 text-caption text-muted">{rewardCopy?.description ?? (language === 'en' ? 'Nori evolution.' : 'Evolución de Nori.')}</p>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-caption font-semibold ${
                          row.unlocked
                            ? 'border-success/35 bg-success/10 text-success'
                            : 'border-border bg-surface text-muted'
                        }`}>
                          {row.unlocked ? <Unlock size={11} /> : <LockKeyhole size={11} />}
                          {row.unlocked ? (language === 'en' ? 'Active' : 'Activo') : 'Preview'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
