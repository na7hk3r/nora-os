import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from './Button'
import { detectOS, osLabel, type DetectedOS } from '../hooks/useDetectOS'
import { useLatestRelease, type LatestRelease } from '../hooks/useLatestRelease'

interface DownloadButtonProps {
  size?: 'md' | 'lg'
  /** Forzar OS (útil para tests). */
  forceOS?: DetectedOS
}

/**
 * Selecciona el asset adecuado para el OS detectado. Si no hay match exacto
 * (por ejemplo OS desconocido o assets faltantes), cae al instalador Windows
 * NSIS — siempre presente en cada release — para garantizar que el botón
 * dispare una descarga directa y nunca redirija a la página de releases.
 */
function pickAsset(os: DetectedOS, release: LatestRelease): string | null {
  const a = release.assets
  const winFallback = a.windows?.url ?? a.windowsPortable?.url
  switch (os) {
    case 'windows':
      return a.windows?.url ?? a.windowsPortable?.url ?? null
    case 'mac':
      return a.macDmg?.url ?? winFallback ?? null
    case 'linux':
      return a.linuxAppImage?.url ?? a.linuxDeb?.url ?? winFallback ?? null
    default:
      return winFallback ?? a.all[0]?.url ?? null
  }
}

export function DownloadButton({ size = 'lg', forceOS }: DownloadButtonProps) {
  const { release, loading } = useLatestRelease()
  const [os, setOS] = useState<DetectedOS>(forceOS ?? 'unknown')

  useEffect(() => {
    if (forceOS) {
      setOS(forceOS)
      return
    }
    setOS(detectOS())
  }, [forceOS])

  const assetUrl = release ? pickAsset(os, release) : null
  const label = `Descargar para ${osLabel(os)}`
  const isLoading = loading && !release
  const disabled = !assetUrl

  return (
    <Button
      as="a"
      href={assetUrl ?? '#'}
      variant="primary"
      size={size}
      leftIcon={<Download className="w-5 h-5" aria-hidden="true" />}
      aria-label={isLoading ? 'Cargando última versión' : label}
      aria-disabled={disabled || undefined}
      onClick={disabled ? (e) => e.preventDefault() : undefined}
      // Forzamos descarga (Content-Disposition lo respeta GitHub Releases) en
      // lugar de navegar al binario, evitando que el browser intente renderizarlo.
      {...(assetUrl ? { download: '' } : {})}
    >
      {isLoading ? 'Cargando…' : label}
    </Button>
  )
}
