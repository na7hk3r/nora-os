import { getNoriSprite, PULSO_NORA_COMPANION_NAME } from '@core/gamification/pulsoNora'

interface NoriSpriteProps {
  level: number
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero'
  className?: string
  alt?: string
  decorative?: boolean
}

const SIZE_CLASS: Record<NonNullable<NoriSpriteProps['size']>, string> = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-28 w-28',
  xl: 'h-40 w-40',
  hero: 'h-48 w-48 sm:h-56 sm:w-56',
}

export function NoriSprite({
  level,
  size = 'md',
  className = '',
  alt,
  decorative = false,
}: NoriSpriteProps) {
  return (
    <img
      src={getNoriSprite(level)}
      alt={decorative ? '' : alt ?? `${PULSO_NORA_COMPANION_NAME} nivel ${level}`}
      aria-hidden={decorative || undefined}
      className={`${SIZE_CLASS[size]} shrink-0 object-contain drop-shadow-[0_18px_34px_rgba(139,92,246,0.42)] ${className}`}
      draggable={false}
    />
  )
}
