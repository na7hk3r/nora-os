export function noraDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

