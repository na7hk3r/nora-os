/**
 * Validation utilities and validators
 * Centralized validation logic for forms and data
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate non-empty string
 */
export function isValidString(value: string, minLength = 1): boolean {
  return typeof value === 'string' && value.trim().length >= minLength
}

/**
 * Validate number is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max
}

/**
 * Validate array not empty
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0
}

/**
 * Validate date string is valid ISO date
 */
export function isValidDateString(dateStr: string): boolean {
  const date = new Date(dateStr)
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * Validate date is not in the past
 */
export function isDateNotInPast(dateStr: string): boolean {
  if (!isValidDateString(dateStr)) return false
  const date = new Date(dateStr).getTime()
  const now = new Date().getTime()
  return date >= now
}

/**
 * Validate date is in the past
 */
export function isDateInPast(dateStr: string): boolean {
  if (!isValidDateString(dateStr)) return false
  const date = new Date(dateStr).getTime()
  const now = new Date().getTime()
  return date < now
}

/**
 * Validate URL format
 */
export function isValidUrl(urlStr: string): boolean {
  try {
    new URL(urlStr)
    return true
  } catch {
    return false
  }
}

/**
 * Sanitize string by removing HTML tags
 */
export function sanitizeString(input: string): string {
  if (!isValidString(input)) return ''
  return input.replace(/<[^>]*>/g, '').trim()
}

/**
 * Validate and parse JSON safely
 */
export function parseJSON<T = unknown>(jsonStr: string): T | null {
  try {
    return JSON.parse(jsonStr) as T
  } catch {
    return null
  }
}

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate form data object
 */
export function validateForm(
  data: Record<string, unknown>,
  rules: Record<string, (value: unknown) => string | null>,
): ValidationResult {
  const errors: string[] = []

  for (const [field, validator] of Object.entries(rules)) {
    const error = validator(data[field])
    if (error) {
      errors.push(`${field}: ${error}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Common validator functions for use in validateForm
 */
export const validators = {
  required: (value: unknown) =>
    isValidString(value as string) ? null : 'Campo requerido',

  email: (value: unknown) =>
    isValidString(value as string) && isValidEmail(value as string)
      ? null
      : 'Email inválido',

  minLength: (min: number) => (value: unknown) =>
    isValidString(value as string, min)
      ? null
      : `Mínimo ${min} caracteres`,

  maxLength: (max: number) => (value: unknown) =>
    typeof value === 'string' && value.length <= max
      ? null
      : `Máximo ${max} caracteres`,

  number: (value: unknown) =>
    typeof value === 'number' && !isNaN(value) ? null : 'Debe ser un número',

  range: (min: number, max: number) => (value: unknown) =>
    typeof value === 'number' && isInRange(value, min, max)
      ? null
      : `Debe estar entre ${min} y ${max}`,

  url: (value: unknown) =>
    isValidString(value as string) && isValidUrl(value as string)
      ? null
      : 'URL inválida',

  date: (value: unknown) =>
    isValidString(value as string) && isValidDateString(value as string)
      ? null
      : 'Fecha inválida',
}
