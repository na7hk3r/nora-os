import { useEffect, useState } from 'react'
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
  const src = getNoriSprite(level)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const label = alt ?? `${PULSO_NORA_COMPANION_NAME} nivel ${level}`
  const imageFailed = failedSrc === src

  useEffect(() => {
    setFailedSrc(null)
  }, [src])

  if (imageFailed) {
    return (
      <div
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : label}
        aria-hidden={decorative || undefined}
        title={decorative ? undefined : label}
        className={`${SIZE_CLASS[size]} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/35 bg-gradient-to-br from-surface-lighter via-surface-light to-surface shadow-[0_18px_34px_rgba(139,92,246,0.28)] ${className}`}
      >
        <div className="absolute inset-2 rounded-full border border-white/10 bg-accent/10" />
        <div className="relative text-center leading-none">
          <p className="text-[10px] font-bold uppercase text-accent-light">Nori</p>
          <p className="mt-1 text-sm font-black text-white">L{level}</p>
        </div>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={decorative ? '' : label}
      aria-hidden={decorative || undefined}
      className={`${SIZE_CLASS[size]} shrink-0 object-contain drop-shadow-[0_18px_34px_rgba(139,92,246,0.42)] ${className}`}
      draggable={false}
      onError={() => setFailedSrc(src)}
    />
  )
}
