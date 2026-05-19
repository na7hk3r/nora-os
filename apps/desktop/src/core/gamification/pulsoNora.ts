export const PULSO_NORA_SYSTEM_NAME = 'Pulso Nora'
export const PULSO_NORA_COMPANION_NAME = 'Nori'

export const NORA_MAX_LEVEL = 15

export const NORA_LEVEL_XP = [
  0,
  120,
  280,
  480,
  730,
  1030,
  1380,
  1780,
  2230,
  2730,
  3280,
  3880,
  4530,
  5230,
  5980,
] as const

export interface NoriLevelConfig {
  level: number
  requiredXp: number
  title: string
  stage: NoriStage
  rewardId: string
}

export interface NoriReward {
  id: string
  level: number
  title: string
  description: string
  category: 'progress' | 'ui' | 'ai'
}

export interface NoriStage {
  id: string
  title: string
  description: string
}

export interface NoriProgress {
  level: number
  maxLevel: number
  currentLevelXp: number
  nextLevelXp: number | null
  xpInLevel: number
  xpForLevel: number
  xpToNextLevel: number
  percent: number
  isMaxLevel: boolean
}

const NORA_STAGES: NoriStage[] = [
  {
    id: 'spark',
    title: 'Chispa',
    description: 'Nori está despertando y aprendiendo tu ritmo.',
  },
  {
    id: 'trail',
    title: 'Rastro',
    description: 'Nori ya reconoce patrones simples de tus días.',
  },
  {
    id: 'pulse',
    title: 'Pulso',
    description: 'Nori acompasa foco, rachas y prioridades.',
  },
  {
    id: 'orbit',
    title: 'Órbita',
    description: 'Nori conecta señales entre módulos y contexto.',
  },
  {
    id: 'sync',
    title: 'Sincronía',
    description: 'Nori opera como una presencia completa dentro de Nora.',
  },
]

export const NORA_REWARDS: NoriReward[] = [
  {
    id: 'nori-awakens',
    level: 1,
    title: 'Nori despierta',
    description: 'Progreso base, misiones XP y la primera evolución visible.',
    category: 'progress',
  },
  {
    id: 'daily-brief-tone',
    level: 2,
    title: 'Brief con Pulso Nora',
    description: 'El brief diario adopta el tono vivo de Nori.',
    category: 'ai',
  },
  {
    id: 'next-milestone',
    level: 3,
    title: 'Próxima meta destacada',
    description: 'Pulso Nora resalta tu logro o recompensa más cercana.',
    category: 'ui',
  },
  {
    id: 'focus-nudges',
    level: 4,
    title: 'Empujones de foco',
    description: 'Nori puede sugerir por dónde arrancar una sesión de foco.',
    category: 'ai',
  },
  {
    id: 'weekly-review',
    level: 5,
    title: 'Review semanal IA',
    description: 'La vista Progreso desbloquea análisis semanal con IA local.',
    category: 'ai',
  },
  {
    id: 'copilot-actions',
    level: 6,
    title: 'Acciones ejecutables',
    description: 'El copiloto puede proponer acciones que se ejecutan desde Nora.',
    category: 'ai',
  },
  {
    id: 'cross-module-context',
    level: 7,
    title: 'Contexto cruzado',
    description: 'La IA usa señales combinadas de tus módulos activos.',
    category: 'ai',
  },
  {
    id: 'proactive-alerts',
    level: 8,
    title: 'Alertas proactivas',
    description: 'Nori mejora las notificaciones con señales de riesgo.',
    category: 'ai',
  },
  {
    id: 'recovery-plan',
    level: 9,
    title: 'Plan de recuperación',
    description: 'El score diario gana mejores pistas para volver a baseline.',
    category: 'ai',
  },
  {
    id: 'weekly-patterns',
    level: 10,
    title: 'Patrones semanales',
    description: 'Pulso Nora interpreta tendencias recientes con más precisión.',
    category: 'ai',
  },
  {
    id: 'streak-personalization',
    level: 11,
    title: 'Rachas personalizadas',
    description: 'Nori ajusta sus sugerencias según tu consistencia.',
    category: 'ai',
  },
  {
    id: 'advanced-priorities',
    level: 12,
    title: 'Priorización avanzada',
    description: 'Las recomendaciones ponderan urgencia, foco y energía.',
    category: 'ai',
  },
  {
    id: 'multi-module-recs',
    level: 13,
    title: 'Recomendaciones multi-módulo',
    description: 'Nori cruza hábitos, trabajo, fitness y planner.',
    category: 'ai',
  },
  {
    id: 'full-coach-mode',
    level: 14,
    title: 'Modo coach completo',
    description: 'El copiloto responde con una mirada más estratégica.',
    category: 'ai',
  },
  {
    id: 'nori-synced',
    level: 15,
    title: 'Nori sincronizado',
    description: 'Estado máximo: Nori está completamente integrado al sistema.',
    category: 'progress',
  },
]

export const NORA_LEVELS: NoriLevelConfig[] = NORA_LEVEL_XP.map((requiredXp, index) => {
  const level = index + 1
  return {
    level,
    requiredXp,
    title: getLevelLabel(level),
    stage: getNoriStage(level),
    rewardId: NORA_REWARDS[index]?.id ?? 'nori-awakens',
  }
})

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 1
  return Math.min(NORA_MAX_LEVEL, Math.max(1, Math.floor(level)))
}

function getLevelLabel(level: number): string {
  if (level <= 3) return 'Chispa inicial'
  if (level <= 6) return 'Companero de ritmo'
  if (level <= 9) return 'Guardian del pulso'
  if (level <= 12) return 'Oraculo operativo'
  if (level <= 14) return 'Nucleo vivo'
  return 'Sincronia total'
}

export function getNoriLevel(points: number): number {
  const xp = Math.max(0, Math.floor(Number(points) || 0))
  let level = 1
  for (let i = 0; i < NORA_LEVEL_XP.length; i++) {
    if (xp >= NORA_LEVEL_XP[i]) {
      level = i + 1
    }
  }
  return clampLevel(level)
}

export function getNoriStage(level: number): NoriStage {
  const safeLevel = clampLevel(level)
  if (safeLevel <= 3) return NORA_STAGES[0]
  if (safeLevel <= 6) return NORA_STAGES[1]
  if (safeLevel <= 9) return NORA_STAGES[2]
  if (safeLevel <= 12) return NORA_STAGES[3]
  return NORA_STAGES[4]
}

export function getNoriSprite(level: number): string {
  const safeLevel = clampLevel(level)
  const baseUrl = import.meta.env.BASE_URL || '/'
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizedBase}nora-evo/nori-${String(safeLevel).padStart(2, '0')}.png`
}

export function getNoriProgress(points: number, storedLevel?: number): NoriProgress {
  const xp = Math.max(0, Math.floor(Number(points) || 0))
  const derivedLevel = getNoriLevel(xp)
  const normalizedStoredLevel = Number.isFinite(Number(storedLevel))
    ? Math.max(1, Math.floor(Number(storedLevel)))
    : derivedLevel
  const level = Math.max(normalizedStoredLevel, derivedLevel)
  const cappedLevel = clampLevel(level)
  const isMaxLevel = cappedLevel >= NORA_MAX_LEVEL
  const currentLevelXp = NORA_LEVEL_XP[cappedLevel - 1]
  const nextLevelXp = isMaxLevel ? null : NORA_LEVEL_XP[cappedLevel]
  const xpForLevel = nextLevelXp == null ? 0 : nextLevelXp - currentLevelXp
  const xpInLevel = nextLevelXp == null ? 0 : Math.max(0, xp - currentLevelXp)
  const xpToNextLevel = nextLevelXp == null ? 0 : Math.max(0, nextLevelXp - xp)
  const percent = isMaxLevel || xpForLevel <= 0
    ? 100
    : Math.max(0, Math.min(100, Math.round((xpInLevel / xpForLevel) * 100)))

  return {
    level,
    maxLevel: NORA_MAX_LEVEL,
    currentLevelXp,
    nextLevelXp,
    xpInLevel,
    xpForLevel,
    xpToNextLevel,
    percent,
    isMaxLevel,
  }
}

export function getUnlockedRewards(level: number): NoriReward[] {
  const safeLevel = clampLevel(level)
  return NORA_REWARDS.filter((reward) => reward.level <= safeLevel)
}

export function getNextReward(level: number): NoriReward | null {
  const safeLevel = clampLevel(level)
  return NORA_REWARDS.find((reward) => reward.level > safeLevel) ?? null
}

export function getRewardForLevel(level: number): NoriReward | null {
  const safeLevel = clampLevel(level)
  return NORA_REWARDS.find((reward) => reward.level === safeLevel) ?? null
}

export function isRewardUnlocked(id: string, level: number): boolean {
  const safeLevel = clampLevel(level)
  const reward = NORA_REWARDS.find((item) => item.id === id)
  return Boolean(reward && reward.level <= safeLevel)
}
