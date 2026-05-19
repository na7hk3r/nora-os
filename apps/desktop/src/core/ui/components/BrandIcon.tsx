/// <reference types="vite/client" />
import type { CSSProperties, HTMLAttributes } from 'react'

/**
 * Conjunto de iconos disponibles en `public/icons/` provenientes de
 * https://github.com/xero/svg-icons (CC0 / dominio público).
 * Mantener sincronizado con los SVG que copiemos al bundle del renderer.
 */
export type BrandIconName =
  | 'BookCode'
  | 'BookJournal'
  | 'BrainSlug'
  | 'Cards'
  | 'Chip'
  | 'CircuitBoard'
  | 'CrystalBallEye'
  | 'Eye'
  | 'Fire'
  | 'Floppy'
  | 'HourGlass'
  | 'IdeaBulbNeon'
  | 'Keyboard'
  | 'LaptopShell'
  | 'Magic'
  | 'MultiToolSak'
  | 'PCB'
  | 'Project'
  | 'Scroller'
  | 'Terminal'
  | 'Todo'
  | 'TomeAtlas'
  | 'TomeIdea'
  | 'Tools'
  | 'TreasureChest'
  | 'TreasureMap'
  | 'Wizard'
  | 'Zettelkasten'

interface BrandIconProps extends HTMLAttributes<HTMLSpanElement> {
  name: BrandIconName
  /** Tamaño en px (alto = ancho). Default 24. */
  size?: number
  /**
   * Envuelve el icono en una baldosa con fondo claro / borde para que sea
   * visible en cualquier tema sin perder los colores originales del SVG.
   * Default true — los SVG son arte ilustrativo con paletas propias
   * (algunos son siluetas oscuras que necesitan fondo claro para verse).
   */
  tile?: boolean
  className?: string
}

/**
 * Renderiza un SVG ilustrativo (xero/svg-icons) preservando sus colores
 * originales. Por defecto se monta sobre una baldosa clara para que sea
 * visible tanto en tema claro como oscuro.
 *
 * Uso:
 *   <BrandIcon name="Magic" size={40} />
 *   <BrandIcon name="Tools" size={120} tile={false} className="opacity-30" />
 */
export function BrandIcon({
  name,
  size = 24,
  tile = true,
  className = '',
  style,
  ...rest
}: BrandIconProps) {
  const url = `${import.meta.env.BASE_URL}icons/${name}.svg`
  const inner = (
    <img
      src={url}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      style={{ width: size, height: size, display: 'block', userSelect: 'none' }}
    />
  )
  if (!tile) {
    return (
      <span
        aria-hidden
        role="img"
        className={className}
        style={{ display: 'inline-flex', flexShrink: 0, ...style }}
        {...rest}
      >
        {inner}
      </span>
    )
  }
  const pad = Math.max(6, Math.round(size * 0.18))
  const tileStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: pad,
    background: '#fbf7ee', // crema neutral; los iconos son ilustrativos sobre papel
    borderRadius: 16,
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    ...style,
  }
  return (
    <span aria-hidden role="img" className={className} style={tileStyle} {...rest}>
      {inner}
    </span>
  )
}
