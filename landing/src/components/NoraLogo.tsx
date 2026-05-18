// Logo oficial de Nora OS — versiones imagen (PNG) tomadas de
// `visual-id/`, copiadas a `landing/public/brand/`.
//
// Variantes:
//   - "mark"           → solo isotipo, white/black según tema.
//   - "mark-original"  → solo isotipo a color (no cambia con tema).
//   - "wordmark"       → solo tipografía, white/black según tema.
//   - "full"           → isotipo + tipografía, white/black según tema.
//
// Para variantes con sufijo white/black renderizamos las dos imágenes y
// alternamos visibilidad con clases dark:* (Tailwind con
// `darkMode: ['class', '[data-theme="dark"]']`). En oscuro se ve la blanca,
// en claro la negra.

type Variant = 'mark' | 'mark-original' | 'wordmark' | 'full'

interface Props {
  variant?: Variant
  /** Altura en px. El ancho se ajusta proporcionalmente. */
  size?: number
  className?: string
  /** Glow sutil — útil en footer. */
  glow?: boolean
  /** Texto alt. Default: "Nora OS". */
  alt?: string
}

const ASSETS: Record<Exclude<Variant, 'mark-original'>, { white: string; black: string }> = {
  mark: {
    white: '/nora-os/brand/nora-isotipo-white.png',
    black: '/nora-os/brand/nora-isotipo-black.png',
  },
  wordmark: {
    white: '/nora-os/brand/nora-white.png',
    black: '/nora-os/brand/nora-black.png',
  },
  full: {
    white: '/nora-os/brand/nora-logo-white.png',
    black: '/nora-os/brand/nora-logo-black.png',
  },
}

export function NoraLogo({
  variant = 'mark',
  size = 32,
  className,
  glow = false,
  alt = 'Nora OS',
}: Props) {
  const baseStyle = glow
    ? { filter: 'drop-shadow(0 0 14px rgb(var(--color-glow) / 0.55))' }
    : undefined

  // Clases comunes a ambas imágenes (la altura controla el tamaño y `width:auto`
  // mantiene proporción del PNG).
  const imgClass = `block object-contain ${className ?? ''}`

  // mark-original: una sola imagen, sin theme switch.
  if (variant === 'mark-original') {
    return (
      <span
        className="inline-flex items-center"
        style={{ height: size, ...baseStyle }}
      >
        <img
          src="/nora-os/brand/nora-isotipo-original.png"
          alt={alt}
          height={size}
          style={{ height: size, width: 'auto' }}
          className={imgClass}
          draggable={false}
        />
      </span>
    )
  }

  const { white, black } = ASSETS[variant]

  return (
    <span
      className="inline-flex items-center"
      style={{ height: size, ...baseStyle }}
    >
      {/* Variante oscura (PNG blanco) — visible en data-theme="dark" */}
      <img
        src={white}
        alt={alt}
        height={size}
        style={{ height: size, width: 'auto' }}
        className={`hidden dark:block ${imgClass}`}
        draggable={false}
      />
      {/* Variante clara (PNG negro) — visible en data-theme="light" */}
      <img
        src={black}
        alt=""
        aria-hidden="true"
        height={size}
        style={{ height: size, width: 'auto' }}
        className={`block dark:hidden ${imgClass}`}
        draggable={false}
      />
    </span>
  )
}
