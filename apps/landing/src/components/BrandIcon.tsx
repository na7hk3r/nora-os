/// <reference types="vite/client" />
import type { CSSProperties, HTMLAttributes } from 'react'

/**
 * Iconos disponibles en `landing/public/icons/` (subset curado de
 * https://github.com/xero/svg-icons, CC0 / dominio público).
 */
export type BrandIconName =
  | 'BookCode'
  | 'BookJournal'
  | 'BrainSlug'
  | 'Cards'
  | 'Chip'
  | 'CrystalBallEye'
  | 'Floppy'
  | 'HourGlass'
  | 'LaptopShell'
  | 'Magic'
  | 'Terminal'
  | 'TomeAtlas'
  | 'TomeIdea'
  | 'Tools'
  | 'TreasureChest'
  | 'Zettelkasten'

interface BrandIconProps extends HTMLAttributes<HTMLSpanElement> {
  name: BrandIconName
  size?: number
  /** Envuelve en baldosa clara (default true) para que sea visible en cualquier tema. */
  tile?: boolean
  className?: string
}

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
    background: '#fbf7ee',
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
