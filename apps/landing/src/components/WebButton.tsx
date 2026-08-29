import { Globe } from 'lucide-react'
import { Button } from './Button'
import { WEB_APP_URL } from '../constants'
import { useI18n } from '../i18n'
import { trackWebOpen } from '../utils/telemetry'

interface WebButtonProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'ghost'
  /** Muestra la etiqueta corta ("Web") en lugar del CTA completo. */
  compact?: boolean
  source?: string
  className?: string
}

export function WebButton({
  size = 'lg',
  variant = 'primary',
  compact = false,
  source,
  className,
}: WebButtonProps) {
  const { t } = useI18n()
  const label: string = compact ? t.common.web : t.common.openWeb

  return (
    <Button
      as="a"
      href={WEB_APP_URL}
      target="_blank"
      rel="noopener noreferrer"
      variant={variant}
      size={size}
      className={className}
      leftIcon={<Globe className={compact ? 'h-3.5 w-3.5 shrink-0' : 'h-5 w-5 shrink-0'} aria-hidden="true" />}
      onClick={() => trackWebOpen({ source })}
    >
      {label}
    </Button>
  )
}