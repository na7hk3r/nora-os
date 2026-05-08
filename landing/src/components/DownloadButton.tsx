import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from './Button'
import { detectOS, osLabel, type DetectedOS } from '../hooks/useDetectOS'
import { useLatestRelease, type LatestRelease } from '../hooks/useLatestRelease'
import { useI18n } from '../i18n'
import { trackDownload } from '../utils/telemetry'

interface DownloadButtonProps {
  size?: 'sm' | 'md' | 'lg'
  /** Forzar OS (útil para tests). */
  forceOS?: DetectedOS
  className?: string
  compact?: boolean
}

/**
 * Selecciona el asset adecuado para el OS detectado. Si no hay match exacto
 * (por ejemplo OS desconocido o assets faltantes), cae al instalador Windows
 * NSIS — siempre presente en cada release — para garantizar que el botón
 * dispare una descarga directa y nunca redirija a la página de releases.
 */
function pickAsset(os: DetectedOS, release: LatestRelease): { url: string; name: string } | null {
  const a = release.assets
  const winFallback = a.windows ?? a.windowsPortable
  switch (os) {
    case 'windows':
      return a.windows ?? a.windowsPortable ?? null
    case 'mac':
      return a.macDmg ?? winFallback ?? null
    case 'linux':
      return a.linuxAppImage ?? a.linuxDeb ?? winFallback ?? null
    default:
      return winFallback ?? a.all[0] ?? null
  }
}

export function DownloadButton({ size = 'lg', forceOS, className, compact = false }: DownloadButtonProps) {
  const { release, loading } = useLatestRelease()
  const [os, setOS] = useState<DetectedOS>(forceOS ?? 'unknown')
  const { t } = useI18n()

  useEffect(() => {
    if (forceOS) {
      setOS(forceOS)
      return
    }
    setOS(detectOS())
  }, [forceOS])

  const asset = release ? pickAsset(os, release) : null
  const assetUrl = asset?.url ?? null
  const label = t.common.downloadFor.replace('{os}', osLabel(os, t.common.yourSystem))
  const visibleLabel = compact ? t.download.download : label
  const isLoading = loading && !release
  const disabled = !assetUrl

  return (
    <Button
      as="a"
      href={assetUrl ?? '#'}
      variant="primary"
      size={size}
      className={className}
      leftIcon={<Download className={compact ? 'h-3.5 w-3.5 shrink-0' : 'h-5 w-5 shrink-0'} aria-hidden="true" />}
      aria-label={isLoading ? t.common.loadingLatest : label}
      aria-disabled={disabled || undefined}
      onClick={
        disabled
          ? (e) => e.preventDefault()
          : () => {
              trackDownload({
                os,
                version: release?.version,
                assetName: asset?.name,
                assetUrl: asset?.url,
              })
            }
      }
      // Forzamos descarga (Content-Disposition lo respeta GitHub Releases) en
      // lugar de navegar al binario, evitando que el browser intente renderizarlo.
      {...(assetUrl ? { download: '' } : {})}
    >
      {isLoading ? (compact ? '...' : `${t.common.loadingLatest}...`) : visibleLabel}
    </Button>
  )
}
