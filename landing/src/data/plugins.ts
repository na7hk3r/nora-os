import type { LucideIcon } from 'lucide-react'
import { Wallet, Dumbbell, Briefcase, Repeat, BookOpen, GraduationCap, Timer } from 'lucide-react'
import type { BrandIconName } from '../components/BrandIcon'

export type PluginDomain =
  | 'finance'
  | 'fitness'
  | 'productivity'
  | 'habits'
  | 'knowledge'
  | 'health'
  | 'time'

export interface PluginCard {
  id: string
  name: string
  description: string
  domain: PluginDomain
  icon: LucideIcon
  /** Color de acento del card; usa CSS color o gradient. */
  accent: string
  /** Texto humano del dominio. */
  domainLabel: string
  /** Ilustración decorativa (SVG en /icons) que refuerza la identidad visual del plugin. */
  brandArt: BrandIconName
}

export const plugins: PluginCard[] = [
  {
    id: 'work',
    name: 'Work',
    description:
      'Kanban con prioridades y Focus Engine 2.0. Library Workspace suma notas, enlaces, busqueda, filtros, URLs normalizadas y Markdown.',
    domain: 'productivity',
    domainLabel: 'Productividad',
    icon: Briefcase,
    accent: 'from-indigo-500/30 to-purple-500/10',
    brandArt: 'LaptopShell',
  },
  {
    id: 'fitness',
    name: 'Fitness',
    description:
      'Tracking diario de peso, comidas, ejercicios y sueño. Medidas corporales, resúmenes mensuales y seguimiento opcional para dejar de fumar.',
    domain: 'fitness',
    domainLabel: 'Fitness',
    icon: Dumbbell,
    accent: 'from-emerald-500/30 to-teal-500/10',
    brandArt: 'Magic',
  },
  {
    id: 'finance',
    name: 'Finanzas',
    description:
      'Cuentas, transacciones, presupuestos y gastos recurrentes con motor RRULE. Insights IA opcionales en moneda local.',
    domain: 'finance',
    domainLabel: 'Finanzas',
    icon: Wallet,
    accent: 'from-amber-500/30 to-orange-500/10',
    brandArt: 'TreasureChest',
  },
  {
    id: 'habits',
    name: 'Hábitos',
    description:
      'Hábitos diarios, semanales y mensuales con racha, heatmap, detección de "en riesgo" y proveedor IA con top streaks.',
    domain: 'habits',
    domainLabel: 'Hábitos',
    icon: Repeat,
    accent: 'from-rose-500/30 to-pink-500/10',
    brandArt: 'Cards',
  },
  {
    id: 'journal',
    name: 'Journal',
    description:
      'Diario con prompts, mood (1–5), tags, búsqueda y pin. Una entrada por día, undo en borrado. Privacy-first.',
    domain: 'knowledge',
    domainLabel: 'Conocimiento',
    icon: BookOpen,
    accent: 'from-sky-500/30 to-blue-500/10',
    brandArt: 'BookJournal',
  },
  {
    id: 'knowledge',
    name: 'Conocimiento',
    description:
      'PKM ligero: recursos, highlights y flashcards con algoritmo SM-2. Repaso espaciado para retener lo que estás aprendiendo.',
    domain: 'knowledge',
    domainLabel: 'Conocimiento',
    icon: GraduationCap,
    accent: 'from-cyan-500/30 to-teal-500/10',
    brandArt: 'TomeIdea',
  },
  {
    id: 'time',
    name: 'Tiempo',
    description:
      'Cronómetro y timesheet con un único timer activo, proyectos con tarifa por hora y auto-entries desde sesiones de Focus.',
    domain: 'time',
    domainLabel: 'Tiempo',
    icon: Timer,
    accent: 'from-violet-500/30 to-fuchsia-500/10',
    brandArt: 'HourGlass',
  },
]

