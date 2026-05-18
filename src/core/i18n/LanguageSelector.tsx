import { Languages } from 'lucide-react'
import { languageOptions, useI18n, type AppLanguage } from './index'

interface LanguageSelectorProps {
  compact?: boolean
  className?: string
}

export function LanguageSelector({ compact = false, className = '' }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useI18n()

  return (
    <label className={`flex max-w-full min-w-0 flex-wrap items-center gap-2 ${className}`}>
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted">
        <Languages size={15} aria-hidden />
      </span>
      {!compact && (
        <span className="min-w-0 shrink whitespace-nowrap text-xs font-medium text-muted">{t.language.label}</span>
      )}
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as AppLanguage)}
        aria-label={t.language.aria}
        className={`${compact ? 'w-auto' : 'min-w-[7.5rem] flex-1 sm:flex-none'} max-w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-white outline-none focus:border-accent`}
      >
        {languageOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {compact ? option.shortLabel : t.language[option.labelKey]}
          </option>
        ))}
      </select>
    </label>
  )
}
