import { useState } from 'react'
import { ImageOff } from 'lucide-react'

export interface ScreenshotTab {
  id: string
  label: string
  src: string
  alt: string
  caption?: string
}

interface Props {
  tabs: ScreenshotTab[]
  /** id por defecto. Default: primer tab. */
  defaultTabId?: string
  ariaLabel?: string
  missingLabel?: string
}

export function ScreenshotTabs({
  tabs,
  defaultTabId,
  ariaLabel = 'Capturas de Nora OS',
  missingLabel = 'Captura próximamente',
}: Props) {
  const [activeId, setActiveId] = useState<string>(defaultTabId ?? tabs[0]?.id ?? '')
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]

  if (!active) return null

  return (
    <div>
      {/* Tablist */}
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="mb-6 flex flex-wrap justify-start gap-2 sm:justify-center"
      >
        {tabs.map((t) => {
          const isActive = t.id === active.id
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              id={`shot-tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`shot-panel-${t.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(t.id)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium leading-snug transition-colors sm:px-4 ${
                isActive
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'bg-surface/60 text-muted border-border hover:text-foreground hover:border-accent/40'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      <div
        role="tabpanel"
        id={`shot-panel-${active.id}`}
        aria-labelledby={`shot-tab-${active.id}`}
        className="group animate-fade-in overflow-hidden rounded-2xl border border-border bg-surface/60"
      >
        <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-surface-light">
          <img
            key={active.src}
            src={`${import.meta.env.BASE_URL}${active.src}`}
            alt={active.alt}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              const sibling = (e.currentTarget as HTMLImageElement)
                .nextElementSibling as HTMLElement | null
              if (sibling) sibling.style.display = 'flex'
            }}
          />
          <div
            className="absolute inset-0 hidden flex-col items-center justify-center gap-2 px-4 text-center text-muted"
            aria-hidden="true"
          >
            <ImageOff className="w-8 h-8" />
            <span className="text-sm">{missingLabel}</span>
          </div>
        </div>
        {active.caption && (
          <p className="border-t border-border px-4 py-4 text-sm leading-relaxed text-muted sm:px-5">
            {active.caption}
          </p>
        )}
      </div>
    </div>
  )
}
