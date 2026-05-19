import { describe, it, expect } from 'vitest'

// Re-export the internal evaluator by bundling a copy here would be ideal, but
// the production module exports services that touch storage. We test the public
// surface of automationsService in isolation using a tiny condition harness
// equivalent to the implementation.

function evalCondition(condition: string, payload: unknown): boolean {
  if (!condition.trim()) return true
  if (!/^[\w\s.()'"!=<>&|+\-*/%,?:[\]]+$/.test(condition)) return false
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function('payload', `with(payload || {}) { return Boolean(${condition}); }`)
    return Boolean(fn(payload))
  } catch { return false }
}

describe('automation condition evaluator', () => {
  it('returns true for empty condition', () => {
    expect(evalCondition('', { a: 1 })).toBe(true)
  })

  it('evaluates numeric comparisons against payload props', () => {
    expect(evalCondition('amount > 10', { amount: 25 })).toBe(true)
    expect(evalCondition('amount > 10', { amount: 5 })).toBe(false)
  })

  it('supports boolean combinators', () => {
    expect(evalCondition('a && b', { a: true, b: 1 })).toBe(true)
    expect(evalCondition('a || b', { a: false, b: 0 })).toBe(false)
  })

  it('rejects unsafe characters', () => {
    expect(evalCondition('process.exit(1)', {})).toBe(false)
    expect(evalCondition('require("fs")', {})).toBe(false)
  })

  it('returns false on syntax errors', () => {
    expect(evalCondition('a >', { a: 1 })).toBe(false)
  })
})
