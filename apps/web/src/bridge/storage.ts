/**
 * WebStorageBridge (producción)
 *
 * Expone el `StorageBridge` que el renderer consume vía `window.storage`.
 * Cada usuario activo tiene su propia DB sql.js persistida en IndexedDB bajo
 * la clave `user:{id}` (análogo a `personal-os-user-{id}.db` de Electron).
 *
 * Solo `setActiveUser` selecciona/cambia la DB concreta; las operaciones
 * (query/execute/migrate) operan SIEMPRE sobre el usuario previamente
 * seleccionado (se abre de forma perezosa la primera vez). Se persiste en cada
 * escritura para sobrevivir recargas.
 */
import type { Migration } from '@core/types'
import { WebStorageBridge as SpikeBridge } from '@spike/storage-bridge'
import { CORE_SCHEMA } from '@spike/schema'

class WebStorageBridgeProd {
  private bridge: SpikeBridge | null = null
  private dbKey: string | null = null

  /** Selecciona la DB del usuario activo. Llamado tras login/registro/logout. */
  async setActiveUser(userId: string | null): Promise<void> {
    const nextKey = userId ? `user:${userId}` : 'default'
    if (this.bridge && this.dbKey === nextKey) return
    if (this.bridge) {
      this.bridge.close()
      this.bridge = null
    }
    this.dbKey = nextKey
    this.bridge = new SpikeBridge({ dbKey: this.dbKey, schema: CORE_SCHEMA })
    await this.bridge.open()
  }

  private async get(): Promise<SpikeBridge> {
    if (!this.bridge) {
      await this.setActiveUser(null)
    }
    if (!this.bridge) throw new Error('storage bridge not initialized')
    return this.bridge
  }

  async query(sql: string, params: unknown[] = []): Promise<unknown[]> {
    return (await this.get()).query(sql, params)
  }

  async execute(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ changes: number; lastInsertRowid: number }> {
    const b = await this.get()
    const result = await b.execute(sql, params)
    await b.save().catch((err) => console.warn('[storage] save failed', err))
    return result
  }

  async migrate(pluginId: string, migrations: Migration[]): Promise<void> {
    const b = await this.get()
    await b.migrate(pluginId, migrations)
    await b.save().catch((err) => console.warn('[storage] save failed', err))
  }

  /** Clave IndexedDB de la DB del usuario activo (null si no hay usuario). */
  getDbKey(): string | null {
    return this.dbKey
  }

  /** Exporta la DB del usuario activo como bytes crudos (para backup). */
  async exportBytes(): Promise<Uint8Array> {
    return (await this.get()).exportBytes()
  }

  /** Reemplaza la DB del usuario activo entera por bytes importados. */
  async importBytes(bytes: Uint8Array): Promise<void> {
    const b = await this.get()
    await b.importBytes(bytes)
  }
}

export const storageBridge = new WebStorageBridgeProd()
