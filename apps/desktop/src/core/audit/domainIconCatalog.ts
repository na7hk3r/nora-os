/**
 * Catálogo de íconos por dominio para el auditor (R6).
 *
 * El auditor verifica que la `iconography.primary` y todo ícono usado en
 * `pages`, `navItems`, `widgets` y quick-actions de un plugin pertenezca al
 * conjunto `allowed ∪ NEUTRAL_ICONS ∪ iconography.gallery` y NO esté en
 * `forbidden`.
 *
 * Importante: el dominio describe el CONTENIDO del plugin (de qué trata),
 * no el theme visual de la app.
 *
 * Para agregar un dominio nuevo:
 *   1. Agregalo a `PluginDomain` en `src/core/types.ts`.
 *   2. Agregá una entrada en este catálogo con `allowed`, `forbidden?` y
 *      `description`.
 *   3. Actualizá el snapshot test en `__tests__/domainIconCatalog.test.ts`.
 */

import type { LucideIconName, PluginDomain } from '@core/types'

export interface DomainIconRule {
  description: string
  allowed: LucideIconName[]
  /** Íconos explícitamente prohibidos en este dominio. */
  forbidden?: LucideIconName[]
}

/**
 * Íconos neutrales — siempre permitidos en cualquier dominio porque
 * representan acciones/UI universales.
 */
export const NEUTRAL_ICONS: readonly LucideIconName[] = [
  'Settings',
  'Settings2',
  'Info',
  'HelpCircle',
  'Bell',
  'Plus',
  'X',
  'Search',
  'MoreHorizontal',
  'ChevronRight',
  'ChevronDown',
  'ChevronLeft',
  'ChevronUp',
  'Filter',
  'Edit',
  'Edit2',
  'Edit3',
  'Trash2',
  'Save',
  'Download',
  'Upload',
  'Copy',
  'Check',
  'CheckCircle',
  'AlertCircle',
  'AlertTriangle',
  'LayoutDashboard',
  'List',
  'Grid',
  'History',
  'RefreshCw',
  'Eye',
  'EyeOff',
  'Star',
] as const

export const DOMAIN_ICON_CATALOG: Record<PluginDomain, DomainIconRule> = {
  finance: {
    description: 'Dinero, presupuestos, transacciones, cuentas.',
    allowed: [
      'DollarSign',
      'Euro',
      'Wallet',
      'WalletCards',
      'Banknote',
      'BanknoteArrowUp',
      'BanknoteArrowDown',
      'PiggyBank',
      'Coins',
      'CreditCard',
      'Receipt',
      'ReceiptText',
      'TrendingUp',
      'TrendingDown',
      'Landmark',
      'Calculator',
      'BadgeDollarSign',
      'CircleDollarSign',
      'HandCoins',
      'BarChart',
      'BarChart2',
      'BarChart3',
      'PieChart',
      'ChartPie',
      'LineChart',
      'ChartSpline',
      'ChartNoAxesCombined',
      'ChartColumnIncreasing',
      'FileChartColumn',
      'FileChartColumnIncreasing',
      'Scale',
      'CalendarSync',
      'Tag',
      'Repeat',
      'ArrowUpRight',
      'ArrowDownRight',
    ],
    forbidden: ['Leaf', 'TreePine', 'Trees', 'PawPrint', 'Dog', 'Cat', 'Music', 'Guitar'],
  },
  health: {
    description: 'Bienestar general, signos vitales, salud médica.',
    allowed: [
      'HeartPulse',
      'Heart',
      'Stethoscope',
      'Pill',
      'Syringe',
      'Cross',
      'Activity',
      'Thermometer',
      'Bandage',
      'Brain',
    ],
  },
  fitness: {
    description: 'Entrenamiento, ejercicio, peso, medidas corporales.',
    allowed: [
      'Dumbbell',
      'Activity',
      'HeartPulse',
      'Bike',
      'Footprints',
      'Medal',
      'Trophy',
      'Timer',
      'Ruler',
      'Scale',
      'PersonStanding',
      'Flame',
      'Target',
      'TrendingUp',
      'TrendingDown',
      'SquarePen',
      'CalendarDays',
    ],
    forbidden: ['DollarSign', 'Wallet', 'Music', 'Book'],
  },
  nutrition: {
    description: 'Alimentación, comidas, recetas, hidratación.',
    allowed: [
      'Apple',
      'Carrot',
      'Utensils',
      'UtensilsCrossed',
      'Soup',
      'CupSoda',
      'Cookie',
      'Salad',
      'Beef',
      'Fish',
      'Egg',
      'Wheat',
      'GlassWater',
      'Coffee',
    ],
  },
  nature: {
    description: 'Plantas, jardín, vida silvestre, exterior.',
    allowed: [
      'Leaf',
      'Trees',
      'TreePine',
      'TreeDeciduous',
      'Flower',
      'Flower2',
      'Sprout',
      'Sun',
      'Cloud',
      'Mountain',
      'Bird',
      'Fish',
      'Bug',
      'Snowflake',
      'Droplet',
      'Droplets',
      'Wind',
    ],
    forbidden: ['DollarSign', 'CreditCard', 'Briefcase', 'BriefcaseBusiness'],
  },
  knowledge: {
    description: 'Notas, conocimiento, segundo cerebro, aprendizaje.',
    allowed: [
      'Brain',
      'BookOpen',
      'Book',
      'NotebookPen',
      'Notebook',
      'NotebookText',
      'GraduationCap',
      'Lightbulb',
      'FileText',
      'Files',
      'Folder',
      'FolderOpen',
      'Archive',
      'Bookmark',
      'Library',
    ],
  },
  reading: {
    description: 'Libros, lectura, literatura, biblioteca personal.',
    allowed: [
      'Book',
      'BookOpen',
      'BookMarked',
      'BookCopy',
      'BookPlus',
      'Library',
      'Bookmark',
      'NotebookPen',
      'Newspaper',
      'ScrollText',
    ],
  },
  productivity: {
    description: 'Tareas, kanban, gestión del trabajo, foco.',
    allowed: [
      'CheckSquare',
      'CheckCircle2',
      'ListTodo',
      'ListChecks',
      'Calendar',
      'CalendarDays',
      'Clock',
      'Target',
      'Flag',
      'Briefcase',
      'BriefcaseBusiness',
      'KanbanSquare',
      'Workflow',
      'Layers',
      'Zap',
      'Timer',
      'TimerReset',
      'Play',
      'Pause',
      'StopCircle',
      'SquarePen',
      'Tag',
    ],
    forbidden: ['Leaf', 'PawPrint', 'Music', 'Pizza'],
  },
  habits: {
    description: 'Rutinas, hábitos diarios, cadenas de constancia.',
    allowed: [
      'Repeat',
      'Repeat2',
      'CalendarCheck',
      'CalendarDays',
      'CheckCircle2',
      'CheckSquare',
      'Flame',
      'Target',
      'Sparkles',
      'TrendingUp',
      'Award',
    ],
  },
  social: {
    description: 'Contactos, relaciones, comunidad.',
    allowed: [
      'Users',
      'User',
      'UserPlus',
      'UserCheck',
      'MessageCircle',
      'MessageSquare',
      'Mail',
      'Phone',
      'Heart',
      'HeartHandshake',
      'Smile',
    ],
  },
  travel: {
    description: 'Viajes, mapas, transporte, alojamiento.',
    allowed: [
      'Plane',
      'PlaneTakeoff',
      'PlaneLanding',
      'MapPin',
      'Map',
      'Compass',
      'Luggage',
      'Globe',
      'Globe2',
      'Hotel',
      'Train',
      'Car',
      'Ship',
      'Bus',
      'Tent',
      'Backpack',
    ],
  },
  creativity: {
    description: 'Arte, diseño, creación, ideas.',
    allowed: [
      'Palette',
      'Paintbrush',
      'PaintBucket',
      'Brush',
      'Pencil',
      'PenTool',
      'Camera',
      'Image',
      'ImagePlus',
      'Sparkles',
      'Wand',
      'Wand2',
      'Lightbulb',
    ],
  },
  music: {
    description: 'Música, audio, instrumentos.',
    allowed: ['Music', 'Music2', 'Music3', 'Music4', 'Headphones', 'Disc', 'Disc3', 'Mic', 'Mic2', 'Radio', 'Guitar', 'Piano', 'Volume2'],
  },
  gaming: {
    description: 'Videojuegos, partidas, logros gamer.',
    allowed: ['Gamepad', 'Gamepad2', 'Joystick', 'Trophy', 'Medal', 'Award', 'Swords', 'Shield', 'Crown', 'Dice1', 'Dice5'],
  },
  spirituality: {
    description: 'Meditación, mindfulness, prácticas contemplativas.',
    allowed: ['Sparkles', 'Sun', 'Moon', 'Star', 'Heart', 'Flower', 'Flower2', 'Mountain', 'Wind', 'Feather'],
  },
  home: {
    description: 'Hogar, mantenimiento, electrodomésticos.',
    allowed: ['Home', 'House', 'Sofa', 'Bed', 'Bath', 'Lamp', 'Refrigerator', 'WashingMachine', 'Wrench', 'Hammer', 'Key', 'DoorOpen'],
  },
  pets: {
    description: 'Mascotas y cuidado animal.',
    allowed: ['Dog', 'Cat', 'PawPrint', 'Bone', 'Bird', 'Fish', 'Rabbit'],
  },
  weather: {
    description: 'Clima, pronóstico, condiciones meteorológicas.',
    allowed: [
      'Sun',
      'Moon',
      'Cloud',
      'CloudRain',
      'CloudSnow',
      'CloudLightning',
      'CloudFog',
      'CloudDrizzle',
      'Wind',
      'Umbrella',
      'Thermometer',
      'Snowflake',
      'Sunrise',
      'Sunset',
    ],
  },
  time: {
    description: 'Tiempo, planificación temporal, recordatorios.',
    allowed: ['Clock', 'Clock1', 'Clock4', 'Timer', 'TimerReset', 'Hourglass', 'AlarmClock', 'Calendar', 'CalendarDays', 'CalendarClock', 'Watch'],
  },
  utility: {
    description: 'Plugins genéricos sin dominio temático específico.',
    // utility no tiene allowed estrictos: aceptamos cualquier ícono no
    // explícitamente prohibido por otra regla. Lo expresamos como conjunto
    // amplio (catch-all). Las validaciones R6 trataremos `utility` como
    // permisivo en runtime.
    allowed: ['LayoutDashboard', 'Settings', 'Wrench', 'Cog', 'Box', 'Package', 'Plug', 'Puzzle'],
  },
}

/** Sugiere íconos de un dominio diferentes al actual. */
export function suggestIconsForDomain(domain: PluginDomain, exclude: string[] = [], limit = 5): string[] {
  const allowed = DOMAIN_ICON_CATALOG[domain]?.allowed ?? []
  return allowed.filter((i) => !exclude.includes(i)).slice(0, limit)
}

/** Devuelve true si el ícono es válido para el dominio dado (considerando neutrales y galería). */
export function isIconValidForDomain(
  icon: string,
  domain: PluginDomain | undefined,
  gallery: string[] = [],
): { valid: boolean; reason?: 'forbidden' | 'not-in-domain' } {
  if (!domain) return { valid: true }
  if (NEUTRAL_ICONS.includes(icon)) return { valid: true }
  if (gallery.includes(icon)) return { valid: true }
  const rule = DOMAIN_ICON_CATALOG[domain]
  if (!rule) return { valid: true }
  if (rule.forbidden?.includes(icon)) return { valid: false, reason: 'forbidden' }
  // utility es permisivo (catch-all): solo bloquea forbidden si lo definiera.
  if (domain === 'utility') return { valid: true }
  if (rule.allowed.includes(icon)) return { valid: true }
  return { valid: false, reason: 'not-in-domain' }
}
