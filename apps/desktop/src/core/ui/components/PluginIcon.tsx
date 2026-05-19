import {
  LayoutDashboard,
  SlidersHorizontal,
  Dumbbell,
  SquarePen,
  Ruler,
  BriefcaseBusiness,
  NotebookPen,
  Link2,
  CalendarDays,
  Flame,
  ListChecks,
  Tag,
  Bell,
  Wrench,
  Landmark,
  ReceiptText,
  BadgeDollarSign,
  PiggyBank,
  CalendarSync,
  ChartNoAxesCombined,
  WalletCards,
  Banknote,
  Scale,
  HandCoins,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  SlidersHorizontal,
  Dumbbell,
  SquarePen,
  Ruler,
  BriefcaseBusiness,
  NotebookPen,
  Link2,
  CalendarDays,
  Flame,
  ListChecks,
  Tag,
  Bell,
  Wrench,
  Landmark,
  ReceiptText,
  BadgeDollarSign,
  PiggyBank,
  CalendarSync,
  ChartNoAxesCombined,
  WalletCards,
  Banknote,
  Scale,
  HandCoins,
}

interface Props {
  name: string
  size?: number
  className?: string
}

/**
 * Renderiza un ícono lucide a partir del nombre declarado en un manifest.
 * Si el nombre no está mapeado, usa LayoutDashboard como fallback.
 */
export function PluginIcon({ name, size = 18, className }: Props) {
  const Icon = iconMap[name] ?? LayoutDashboard
  return <Icon size={size} className={className} />
}

export function getPluginIcon(name: string): LucideIcon {
  return iconMap[name] ?? LayoutDashboard
}
