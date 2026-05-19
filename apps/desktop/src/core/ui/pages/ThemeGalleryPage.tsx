import { useMemo, useState } from 'react'
import { Palette, Check, Eye } from 'lucide-react'
import { THEMES, type ThemeOption } from '../../config/themes'
import { useCoreStore } from '../../state/coreStore'

/**
 * Galería de temas con previews en vivo.
 *
 * - Click en un tema → aplica al instante (data-theme en <html>) y persiste.
 * - Cada card muestra una mini-app (sidebar fake + dashboard fake) usando los
 *   tokens reales del tema vía CSS variables.
 * - El tema seleccionado tiene borde y check; el resto se ven en su paleta nativa
 *   pero no afectan el layout global.
 */
function ThemePreview({ option }: { option: ThemeOption }) {
  const { swatch } = option
  return (
    <div
      className="h-32 w-full overflow-hidden rounded-lg border"
      style={{ background: swatch.bg, borderColor: swatch.surface }}
      aria-hidden
    >
      <div className="flex h-full">
        {/* Sidebar fake */}
        <div
          className="flex w-10 flex-col gap-2 border-r p-2"
          style={{ background: swatch.surface, borderColor: swatch.bg }}
        >
          <div className="h-2 w-6 rounded-full" style={{ background: swatch.accent }} />
          <div className="h-1.5 w-5 rounded-full opacity-50" style={{ background: swatch.text }} />
          <div className="h-1.5 w-5 rounded-full opacity-30" style={{ background: swatch.text }} />
          <div className="h-1.5 w-5 rounded-full opacity-30" style={{ background: swatch.text }} />
        </div>
        {/* Main fake */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="h-2 w-1/2 rounded" style={{ background: swatch.text, opacity: 0.85 }} />
          <div className="flex gap-2">
            <div
              className="h-12 flex-1 rounded"
              style={{ background: swatch.surface, border: `1px solid ${swatch.accent}33` }}
            >
              <div
                className="m-2 h-1.5 w-2/3 rounded"
                style={{ background: swatch.accent }}
              />
              <div
                className="mx-2 h-1 w-1/2 rounded opacity-50"
                style={{ background: swatch.text }}
              />
            </div>
            <div
              className="h-12 w-12 rounded"
              style={{ background: swatch.accent, opacity: 0.85 }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-3 rounded" style={{ background: swatch.accent }} />
            <div className="h-1.5 w-6 rounded opacity-40" style={{ background: swatch.text }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ThemeGalleryPage() {
  const settings = useCoreStore((s) => s.settings)
  const updateSettings = useCoreStore((s) => s.updateSettings)
  const persistSettings = useCoreStore((s) => s.persistSettings)
  const [hovered, setHovered] = useState<string | null>(null)

  const active = settings.theme || 'default'
  const sorted = useMemo(() => {
    return [...THEMES].sort((a, b) => (a.value === active ? -1 : b.value === active ? 1 : 0))
  }, [active])

  const apply = (value: string) => {
    updateSettings({ theme: value })
    void persistSettings()
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-8 text-white">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Palette size={22} className="text-accent-light" aria-hidden />
          <div>
            <h1 className="text-2xl font-semibold">Galería de temas</h1>
            <p className="text-sm text-muted">
              Hacé click en un tema para aplicarlo al instante. Pasá el mouse para previsualizarlo
              sin guardar.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-border bg-surface-light/70 px-3 py-1 text-xs text-muted">
          {THEMES.length} temas disponibles
        </span>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((t) => {
          const isActive = t.value === active
          const isHovered = hovered === t.value
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => apply(t.value)}
              onMouseEnter={() => {
                setHovered(t.value)
                document.documentElement.setAttribute('data-theme', t.value)
              }}
              onMouseLeave={() => {
                setHovered(null)
                document.documentElement.setAttribute('data-theme', active)
              }}
              className={`group relative flex flex-col gap-3 rounded-2xl border bg-surface-light/85 p-4 text-left transition-all ${
                isActive
                  ? 'border-accent ring-2 ring-accent/40'
                  : 'border-border hover:border-accent/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">{t.label}</h2>
                  <p className="text-xs text-muted line-clamp-1">{t.description}</p>
                </div>
                {isActive ? (
                  <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-caption font-medium text-accent-light">
                    <Check size={12} /> Activo
                  </span>
                ) : isHovered ? (
                  <span className="flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-caption text-muted">
                    <Eye size={12} /> Preview
                  </span>
                ) : null}
              </div>

              <ThemePreview option={t} />

              <div className="flex items-center gap-1.5">
                {(['bg', 'surface', 'accent', 'text'] as const).map((k) => (
                  <span
                    key={k}
                    className="h-4 w-4 rounded-full border border-black/20"
                    style={{ background: t.swatch[k] }}
                    title={`${k}: ${t.swatch[k]}`}
                  />
                ))}
                <span className="ml-auto text-micro uppercase tracking-wider text-muted">
                  {t.value}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <p className="mt-6 text-xs text-muted">
        Los cambios se guardan automáticamente. Para más ajustes visuales abrí el{' '}
        <a href="#/control" className="text-accent-light hover:underline">
          Centro de Control
        </a>
        .
      </p>
    </section>
  )
}
