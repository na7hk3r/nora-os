// Logo oficial de Nora OS para la app de escritorio.
//
// Usa los PNG del kit de identidad (`visual-id/`) copiados a
// `public/brand/`. La versión "original" del isotipo está pensada para
// funcionar sobre cualquier fondo (no depende del tema), así que la usamos
// como default para todos los lugares de la app que mostraban el viejo SVG.
//
// Variantes:
//   - "mark"      → solo isotipo, color original (default).
//   - "mark-white"/"mark-black" → versiones monocromas si hace falta forzar.
//   - "wordmark"  → tipografía "nora", se ajusta al tema (white en oscuro,
//                   black en `data-theme="light"`).
//   - "full"      → isotipo + tipografía, también ajusta al tema.

import type { ImgHTMLAttributes } from 'react'

type Variant = 'mark' | 'mark-white' | 'mark-black' | 'wordmark' | 'full'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'height' | 'width'> & {
  size?: number
  glow?: boolean
  variant?: Variant
  alt?: string
}

const SINGLE_SRC: Partial<Record<Variant, string>> = {
  mark: './brand/nora-isotipo-original.png',
  'mark-white': './brand/nora-isotipo-white.png',
  'mark-black': './brand/nora-isotipo-black.png',
}

const DUAL_SRC: Partial<Record<Variant, { white: string; black: string }>> = {
  wordmark: { white: './brand/nora-white.png', black: './brand/nora-black.png' },
  full: { white: './brand/nora-logo-white.png', black: './brand/nora-logo-black.png' },
}

/**
 * NoraLogoMark — mantiene el nombre histórico (era SVG) por compat con los
 * call-sites: Sidebar, AuthScreen, UnlockScreen, DashboardFooter,
 * SystemStatusHero, StepWelcome.
 */
export function NoraLogoMark({
  size = 28,
  glow = false,
  variant = 'mark',
  alt = 'Nora OS',
  className,
  style,
  ...rest
}: Props) {
  const filter = glow ? 'drop-shadow(0 0 10px rgb(var(--color-accent) / 0.55))' : undefined

  // Variantes con una sola imagen (no dependen del tema).
  const singleSrc = SINGLE_SRC[variant]
  if (singleSrc) {
    return (
      <img
        src={singleSrc}
        alt={alt}
        height={size}
        style={{ height: size, width: 'auto', filter, ...style }}
        className={`inline-block object-contain align-middle ${className ?? ''}`}
        draggable={false}
        {...rest}
      />
    )
  }

  // Variantes duales (white/black según tema).
  const dual = DUAL_SRC[variant]!
  return (
    <span
      className={`inline-flex items-center align-middle ${className ?? ''}`}
      style={{ height: size, filter, ...style }}
    >
      <img
        src={dual.white}
        alt={alt}
        height={size}
        style={{ height: size, width: 'auto' }}
        className="block object-contain nora-logo-dark"
        draggable={false}
      />
      <img
        src={dual.black}
        alt=""
        aria-hidden="true"
        height={size}
        style={{ height: size, width: 'auto' }}
        className="hidden object-contain nora-logo-light"
        draggable={false}
      />
    </span>
  )
}
