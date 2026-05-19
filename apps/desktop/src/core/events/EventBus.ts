import type { EventHandler, UnsubscribeFn } from '../types'

type PersistFn = (event: string, payload: unknown, source: string) => void

function inferEventSource(event: string): string | undefined {
  if (event.startsWith('FITNESS_') || event.startsWith('WEIGHT_') || event.startsWith('DAILY_')) {
    return 'fitness'
  }
  if (event.startsWith('WORK_') || event.startsWith('TASK_') || event.startsWith('NOTE_') || event.startsWith('FOCUS_')) {
    return 'work'
  }
  if (event.startsWith('CORE_')) {
    return 'core'
  }
  if (event.startsWith('GAMIFICATION_')) {
    return 'gamification'
  }
  if (event.startsWith('GOALS_')) {
    return 'goals'
  }
  return undefined
}

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>()
  private history: { event: string; payload: unknown; timestamp: number }[] = []
  private maxHistory = 100
  private persistFn: PersistFn | null = null

  setPersistenceCallback(fn: PersistFn): void {
    this.persistFn = fn
  }

  emit(event: string, payload?: unknown, options?: { source?: string; persist?: boolean }): void {
    this.history.push({ event, payload, timestamp: Date.now() })
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    const source = options?.source ?? inferEventSource(event)

    if (this.persistFn && source && options?.persist !== false) {
      try {
        this.persistFn(event, payload, source)
      } catch (err) {
        console.error(`[EventBus] Error persisting event "${event}":`, err)
      }
    }

    const handlers = this.listeners.get(event)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload)
        } catch (err) {
          console.error(`[EventBus] Error in handler for "${event}":`, err)
        }
      }
    }
  }

  on(event: string, handler: EventHandler): UnsubscribeFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)

    return () => {
      this.off(event, handler)
    }
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler)
  }

  getHistory(limit = 50) {
    return this.history.slice(-limit)
  }

  clear(): void {
    this.listeners.clear()
    this.history = []
  }
}

// Singleton
export const eventBus = new EventBus()
