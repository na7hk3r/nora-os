// Reformado: copy orientado a beneficio (no a feature técnica), íconos lucide curados.
import type { LucideIcon } from 'lucide-react'
import { HardDrive, Boxes, RefreshCw, ShieldCheck, Users, Sparkles, Bot } from 'lucide-react'

export interface Feature {
  title: string
  description: string
  icon: LucideIcon
  /** Tag corto opcional, mostrado como chip arriba del título. */
  tag?: string
}

export const featureIcons = [HardDrive, Boxes, RefreshCw, ShieldCheck, Users, Sparkles, Bot] as const

export const features: Feature[] = [
  {
    tag: 'Local-first',
    title: 'Tus datos nunca salen de tu máquina',
    description:
      'SQLite en tu disco. Sin nube, sin sincronización, sin telemetría. Ni siquiera nosotros podemos verlos.',
    icon: HardDrive,
  },
  {
    tag: 'Modular',
    title: 'Todo lo que necesitás, nada de lo que no',
    description:
      'Activás solo los módulos que usás: trabajo, hábitos, finanzas, fitness, journal, conocimiento.',
    icon: Boxes,
  },
  {
    tag: 'Auto-update',
    title: 'Siempre actualizado, sin que lo notes',
    description:
      'Releases en GitHub, instalación en un clic. Sin pop-ups molestos ni interrupciones de tu flujo.',
    icon: RefreshCw,
  },
  {
    tag: 'Seguro',
    title: 'Privacidad real, no marketing',
    description:
      'Cifrado AES-256-GCM opcional sobre la base completa. Tu vida no es un asset para vender.',
    icon: ShieldCheck,
  },
  {
    tag: 'Multiusuario',
    title: 'Varios perfiles, cero cloud',
    description:
      'Cada usuario del equipo tiene su propia base cifrable. Sin cuentas online, todo separado en disco.',
    icon: Users,
  },
  {
    tag: 'Pulso Nora',
    title: 'Nori evoluciona con tu constancia',
    description:
      '15 niveles, XP mas exigente y recompensas que desbloquean mejoras visibles e IA mas capaz.',
    icon: Sparkles,
  },
  {
    tag: 'IA opcional',
    title: 'Un copiloto que no espía',
    description:
      'Ollama corre en tu equipo. El modelo te conoce, pero nunca le manda nada a OpenAI ni a la nube.',
    icon: Bot,
  },
]
