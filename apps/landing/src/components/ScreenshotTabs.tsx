import { useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, SyntheticEvent } from 'react'
import { ImageOff } from 'lucide-react'

export interface ScreenshotTab {
  id: string
  label: string
  src: string
  compareSrc?: string
  alt: string
  compareAlt?: string
  caption?: string
}

interface Props {
  tabs: ScreenshotTab[]
  /** id por defecto. Default: primer tab. */
  defaultTabId?: string
  ariaLabel?: string
  missingLabel?: string
}

const COMPARE_MIN = 8
const COMPARE_MAX = 92
const COMPARE_KEY_STEP = 5
const COMPARE_DIAGONAL_OFFSET = 7

function screenshotSrc(src: string) {
  return `${import.meta.env.BASE_URL}${src}`
}

function clampCompare(value: number) {
  return Math.min(COMPARE_MAX, Math.max(COMPARE_MIN, Math.round(value)))
}

function revealMissingPlaceholder(event: SyntheticEvent<HTMLImageElement>) {
  const stage = event.currentTarget.closest('[data-screenshot-stage]')

  stage?.querySelectorAll('img').forEach((img) => {
    img.style.display = 'none'
  })

  const placeholder = stage?.querySelector<HTMLElement>('[data-screenshot-placeholder]')
  if (placeholder) placeholder.style.display = 'flex'
}

function MissingScreenshot({ label }: { label: string }) {
  return (
    <div
      data-screenshot-placeholder
      className="absolute inset-0 hidden flex-col items-center justify-center gap-2 px-4 text-center text-muted"
      aria-hidden="true"
    >
      <ImageOff className="w-8 h-8" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

function StaticScreenshot({ tab, missingLabel }: { tab: ScreenshotTab; missingLabel: string }) {
  return (
    <div
      data-screenshot-stage
      className="relative flex aspect-[2/1] items-center justify-center overflow-hidden rounded-lg bg-surface-light/55 ring-1 ring-border/50"
    >
      <img
        key={tab.src}
        src={screenshotSrc(tab.src)}
        alt={tab.alt}
        loading="lazy"
        className="h-full w-full object-contain"
        onError={revealMissingPlaceholder}
      />
      <MissingScreenshot label={missingLabel} />
    </div>
  )
}

function ThemeCompare({ tab, missingLabel }: { tab: ScreenshotTab; missingLabel: string }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [split, setSplit] = useState(50)

  const updateSplitFromPointer = (clientX: number) => {
    if (!Number.isFinite(clientX)) return

    const frame = frameRef.current
    if (!frame) return

    const rect = frame.getBoundingClientRect()
    if (rect.width <= 0) return

    setSplit(clampCompare(((clientX - rect.left) / rect.width) * 100))
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    updateSplitFromPointer(event.clientX)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    updateSplitFromPointer(event.clientX)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setSplit((current) => clampCompare(current - COMPARE_KEY_STEP))
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setSplit((current) => clampCompare(current + COMPARE_KEY_STEP))
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setSplit(COMPARE_MIN)
    }

    if (event.key === 'End') {
      event.preventDefault()
      setSplit(COMPARE_MAX)
    }
  }

  const topSplit = clampCompare(split + COMPARE_DIAGONAL_OFFSET)
  const bottomSplit = clampCompare(split - COMPARE_DIAGONAL_OFFSET)

  return (
    <div
      ref={frameRef}
      data-screenshot-stage
      role="slider"
      tabIndex={0}
      aria-label={`${tab.label}: ${tab.alt}`}
      aria-valuemin={COMPARE_MIN}
      aria-valuemax={COMPARE_MAX}
      aria-valuenow={split}
      aria-valuetext={`${split}% ${tab.alt}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onKeyDown={handleKeyDown}
      className="relative flex aspect-[2/1] cursor-ew-resize items-center justify-center overflow-hidden rounded-lg bg-surface-light/55 ring-1 ring-border/50 focus-visible:ring-inset"
    >
      <img
        src={screenshotSrc(tab.compareSrc ?? tab.src)}
        alt={tab.compareAlt ?? tab.alt}
        loading="lazy"
        className="h-full w-full object-contain"
        draggable={false}
        onError={revealMissingPlaceholder}
      />
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          clipPath: `polygon(0 0, ${topSplit}% 0, ${bottomSplit}% 100%, 0 100%)`,
        }}
      >
        <img
          src={screenshotSrc(tab.src)}
          alt={tab.alt}
          loading="lazy"
          className="h-full w-full object-contain"
          draggable={false}
          onError={revealMissingPlaceholder}
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-visible"
      >
        <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
          <line
            x1={topSplit}
            y1="0"
            x2={bottomSplit}
            y2="100"
            vectorEffect="non-scaling-stroke"
            className="stroke-black/25"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1={topSplit}
            y1="0"
            x2={bottomSplit}
            y2="100"
            vectorEffect="non-scaling-stroke"
            className="stroke-white/90 drop-shadow-[0_0_14px_rgba(255,255,255,0.55)]"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-base/80 shadow-glow-sm backdrop-blur"
        style={{ left: `${split}%` }}
      >
        <span className="h-4 w-px bg-white/80" />
        <span className="ml-1 h-4 w-px bg-white/80" />
      </div>
      <MissingScreenshot label={missingLabel} />
    </div>
  )
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
        className="mb-5 flex flex-wrap justify-start gap-2 sm:justify-center"
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
        className="group animate-fade-in overflow-hidden rounded-xl border border-border/70 bg-surface/55 p-2 shadow-glow-sm backdrop-blur-sm"
      >
        {active.compareSrc ? (
          <ThemeCompare key={active.id} tab={active} missingLabel={missingLabel} />
        ) : (
          <StaticScreenshot key={active.id} tab={active} missingLabel={missingLabel} />
        )}
        {active.caption && (
          <p className="mt-2 border-t border-border/60 px-2 pb-1 pt-3 text-sm leading-relaxed text-muted sm:px-3">
            {active.caption}
          </p>
        )}
      </div>
    </div>
  )
}
