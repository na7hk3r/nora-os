import { readdirSync, readFileSync, existsSync, statSync } from 'fs'
import { resolve, join } from 'path'
import { describe, it, expect } from 'vitest'

// Root paths relativos a este archivo (apps/web/src). No se importa nada de
// desktop ni se mockea: solo lecturas de fs contra rutas del repo, como exige D5.
const webRoot = resolve(__dirname, '..')
const desktopPublic = resolve(webRoot, '../desktop/public')
const webPublic = resolve(webRoot, 'public')

const MANIFEST_ICONS = [
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
]

function isDirectory(p: string) {
  return existsSync(p) && statSync(p).isDirectory()
}

function svgFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.svg'))
    .sort()
}

function brandFiles(dir: string): string[] {
  return readdirSync(dir).sort()
}

function assertByteIdentical(desktopPath: string, webPath: string, label: string) {
  const desktop = readFileSync(desktopPath)
  const web = readFileSync(webPath)
  expect(Buffer.compare(desktop, web), `${label} byte-identical`).toBe(0)
}

describe('web visual parity — static asset sync', () => {
  it('syncs every desktop icons/*.svg into web public/icons byte-identical', () => {
    const desktopSvg = svgFiles(join(desktopPublic, 'icons'))
    // Al menos la set esperada (xero + NoraLogo.svg).
    expect(desktopSvg.length).toBeGreaterThanOrEqual(29)
    for (const name of desktopSvg) {
      const webPath = join(webPublic, 'icons', name)
      expect(existsSync(webPath), `web icons/${name} exists`).toBe(true)
      assertByteIdentical(join(desktopPublic, 'icons', name), webPath, `icons/${name}`)
    }
  })

  it('syncs every desktop brand/* file into web public/brand byte-identical', () => {
    const desktopBrand = brandFiles(join(desktopPublic, 'brand'))
    expect(desktopBrand.length).toBeGreaterThanOrEqual(7)
    for (const name of desktopBrand) {
      const webPath = join(webPublic, 'brand', name)
      expect(existsSync(webPath), `web brand/${name} exists`).toBe(true)
      assertByteIdentical(join(desktopPublic, 'brand', name), webPath, `brand/${name}`)
    }
  })

  it('keeps the 4 PWA manifest icons in web public/icons', () => {
    for (const name of MANIFEST_ICONS) {
      const p = join(webPublic, 'icons', name)
      expect(existsSync(p), `web icons/${name} preserved`).toBe(true)
    }
  })

  it('keeps nora-evo/ intact and non-empty', () => {
    const dir = join(webPublic, 'nora-evo')
    expect(isDirectory(dir), 'nora-evo dir exists').toBe(true)
    expect(readdirSync(dir).filter((n) => n.endsWith('.png'))).not.toHaveLength(0)
  })
})
