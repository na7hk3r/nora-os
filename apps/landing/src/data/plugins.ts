import type { LucideIcon } from 'lucide-react'
import { Wallet, Dumbbell, Briefcase, Repeat, BookOpen, GraduationCap, Timer } from 'lucide-react'
import type { BrandIconName } from '../components/BrandIcon'

export interface PluginCard {
  id: string
  icon: LucideIcon
  /** Color de acento del card; usa CSS color o gradient. */
  accent: string
  /** Ilustración decorativa (SVG en /icons) que refuerza la identidad visual del plugin. */
  brandArt: BrandIconName
}

export const plugins: PluginCard[] = [
  {
    id: 'work',
    icon: Briefcase,
    accent: 'from-indigo-500/30 to-purple-500/10',
    brandArt: 'LaptopShell',
  },
  {
    id: 'fitness',
    icon: Dumbbell,
    accent: 'from-emerald-500/30 to-teal-500/10',
    brandArt: 'Magic',
  },
  {
    id: 'finance',
    icon: Wallet,
    accent: 'from-amber-500/30 to-orange-500/10',
    brandArt: 'TreasureChest',
  },
  {
    id: 'habits',
    icon: Repeat,
    accent: 'from-rose-500/30 to-pink-500/10',
    brandArt: 'Cards',
  },
  {
    id: 'journal',
    icon: BookOpen,
    accent: 'from-sky-500/30 to-blue-500/10',
    brandArt: 'BookJournal',
  },
  {
    id: 'knowledge',
    icon: GraduationCap,
    accent: 'from-cyan-500/30 to-teal-500/10',
    brandArt: 'TomeIdea',
  },
  {
    id: 'time',
    icon: Timer,
    accent: 'from-violet-500/30 to-fuchsia-500/10',
    brandArt: 'HourGlass',
  },
]