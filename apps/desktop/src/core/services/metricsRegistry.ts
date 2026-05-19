/**
 * Cross-plugin metrics registry.
 *
 * Permite que un plugin "publique" un valor numérico bajo un id estable
 * (ej. `work.focus_hours`, `habits.top_streak`, `finance.savings_rate`)
 * y que otros plugins (típicamente Goals/OKRs) lo consuman sin tener que
 * conocer el store interno del productor.
 *
 * Convenciones:
 *  - `metricId` debe seguir el patrón `<pluginId>.<snake_case>`.
 *  - Solo se almacena el último valor (snapshot), no la serie temporal.
 *  - Es un registry in-memory: no persiste entre sesiones; cada plugin
 *    debe republicar al iniciar (típicamente desde su `init()` o como
 *    reacción a sus eventos).
 *  - Los listeners se notifican síncronamente; mantenelos baratos.
 */

export interface MetricEntry {
  id: string
  value: number
  updatedAt: number
}

export type MetricListener = (entry: MetricEntry) => void

const metrics = new Map<string, MetricEntry>()
const listeners = new Set<MetricListener>()

/** Publica (o sobreescribe) el valor actual de una métrica. */
export function publishMetric(id: string, value: number): void {
  if (!id || typeof id !== 'string') return
  if (typeof value !== 'number' || !Number.isFinite(value)) return
  const entry: MetricEntry = { id, value, updatedAt: Date.now() }
  metrics.set(id, entry)
  for (const fn of listeners) {
    try {
      fn(entry)
    } catch (err) {
      console.error('[metricsRegistry] listener failed for', id, err)
    }
  }
}

/** Devuelve el último valor publicado, o `undefined` si nunca se publicó. */
export function getMetric(id: string): MetricEntry | undefined {
  return metrics.get(id)
}

/** Devuelve el valor numérico, o `fallback` si no existe. */
export function getMetricValue(id: string, fallback = 0): number {
  return metrics.get(id)?.value ?? fallback
}

/** Lista todas las métricas registradas (snapshot inmutable). */
export function listMetrics(): MetricEntry[] {
  return Array.from(metrics.values())
}

/** Suscribe un listener invocado en cada `publishMetric`. */
export function subscribeMetrics(listener: MetricListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Limpia el registry. Usado en tests. */
export function __resetMetricsForTests(): void {
  metrics.clear()
  listeners.clear()
}
