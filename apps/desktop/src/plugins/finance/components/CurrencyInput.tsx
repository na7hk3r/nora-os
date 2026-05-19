import { useMemo } from 'react'
import { COMMON_CURRENCIES, normalizeCurrencyCode } from '../utils'

interface CurrencyInputProps {
  value: string
  onChange: (currency: string) => void
  className?: string
  inputClassName?: string
  selectClassName?: string
}

const CUSTOM_VALUE = '__custom__'

export function CurrencyInput({
  value,
  onChange,
  className = '',
  inputClassName = '',
  selectClassName = '',
}: CurrencyInputProps) {
  const raw = value.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)
  const normalized = normalizeCurrencyCode(raw)
  const isCommon = raw.length === 3 && COMMON_CURRENCIES.includes(raw)
  const selectValue = isCommon ? raw : CUSTOM_VALUE

  const options = useMemo(() => {
    const values = new Set(COMMON_CURRENCIES)
    if (isCommon) values.add(raw)
    return Array.from(values)
  }, [isCommon, raw])

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <select
        value={selectValue}
        onChange={(event) => {
          const next = event.target.value
          onChange(next === CUSTOM_VALUE ? raw || normalized : next)
        }}
        className={`min-w-0 rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white outline-none focus:border-accent ${selectClassName}`}
      >
        {options.map((currency) => (
          <option key={currency} value={currency}>{currency}</option>
        ))}
        <option value={CUSTOM_VALUE}>Otra</option>
      </select>
      {selectValue === CUSTOM_VALUE && (
        <input
          value={raw}
          onChange={(event) => onChange(event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
          maxLength={3}
          placeholder="ABC"
          className={`w-20 rounded-lg border border-border bg-surface px-2 py-2 text-sm uppercase text-white outline-none focus:border-accent ${inputClassName}`}
        />
      )}
    </div>
  )
}
