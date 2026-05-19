/**
 * Registry de proveedores de contexto IA.
 *
 * Cada plugin puede registrar un proveedor que aporta un "slice" de información
 * al snapshot que se le pasa a Ollama. Esto desacopla `aiContextService` de los
 * stores específicos y habilita IA por plugin sin tocar core.
 *
 * Convenciones:
 *  - El proveedor debe ser barato (las llamadas son agregadas con Promise.all).
 *  - Si el plugin no tiene datos, devolver `undefined` (NO objeto vacío).
 *  - El renderer debe producir 1-3 líneas planas, sin markdown, sin emojis.
 */

export interface AIContextProvider<T = unknown> {
  /** Identificador único, típicamente el plugin id. */
  id: string
  /** Genera el slice de datos para el snapshot. */
  collect: () => Promise<T | undefined>
  /** Convierte el slice a líneas de texto planas para embeber en el prompt. */
  render: (slice: T) => string[]
}

const providers = new Map<string, AIContextProvider<unknown>>()

export function registerAIContextProvider<T>(provider: AIContextProvider<T>): void {
  providers.set(provider.id, provider as AIContextProvider<unknown>)
}

export function unregisterAIContextProvider(id: string): void {
  providers.delete(id)
}

export function getAIContextProviders(): AIContextProvider[] {
  return Array.from(providers.values())
}
