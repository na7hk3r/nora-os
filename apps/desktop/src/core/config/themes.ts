/**
 * Centralized theme configuration
 * Used in ControlCenter, ThemeGalleryPage and Shell.
 */

export interface ThemeOption {
  value: string
  label: string
  description: string
  /** Paleta de muestra para previews (background, surface, accent, text). */
  swatch: {
    bg: string
    surface: string
    accent: string
    text: string
  }
}

export const THEMES: ThemeOption[] = [
  {
    value: 'default',
    label: 'Default · Obsidian',
    description: 'Dark clásico — purples y slate',
    swatch: { bg: '#070d14', surface: '#1e1e2e', accent: '#7c3aed', text: '#e2e8f0' },
  },
  {
    value: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'Negros profundos, cian y magenta neon',
    swatch: { bg: '#03000c', surface: '#0a0519', accent: '#00f5ff', text: '#e0e0ff' },
  },
  {
    value: 'calma',
    label: 'Calma',
    description: 'Azules profundos, relajado',
    swatch: { bg: '#0a0e19', surface: '#121a2d', accent: '#60a5fa', text: '#dbeafe' },
  },
  {
    value: 'bosque',
    label: 'Bosque',
    description: 'Verdes oscuros, natural',
    swatch: { bg: '#040a06', surface: '#0a160e', accent: '#22c55e', text: '#d4f4da' },
  },
  {
    value: 'nord',
    label: 'Nord',
    description: 'Frost ártico — polar night y cyan',
    swatch: { bg: '#242933', surface: '#2e3440', accent: '#88c0d0', text: '#eceff4' },
  },
  {
    value: 'mocha',
    label: 'Mocha',
    description: 'Warm dark estilo Catppuccin con mauve',
    swatch: { bg: '#181825', surface: '#1e1e2e', accent: '#cba6f7', text: '#cdd6f4' },
  },
  {
    value: 'graphite',
    label: 'Graphite',
    description: 'Monocromático puro, mínimo distractor',
    swatch: { bg: '#121212', surface: '#1a1a1a', accent: '#e5e5e5', text: '#e0e0e0' },
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Cremas pastel, cálido y plano',
    swatch: { bg: '#fbf7ee', surface: '#fffcf5', accent: '#d97757', text: '#3e3328' },
  },
] as const

export function getThemeLabel(themeValue: string): string {
  return THEMES.find((t) => t.value === themeValue)?.label ?? themeValue
}

export function getThemeDescription(themeValue: string): string {
  return THEMES.find((t) => t.value === themeValue)?.description ?? ''
}
