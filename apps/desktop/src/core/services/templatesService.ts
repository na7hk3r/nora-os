import { storageAPI } from '@core/storage/StorageAPI'

export interface Template {
  id: number
  plugin_id: string
  name: string
  kind: string
  content: string
  created_at: string
  updated_at: string
}

export interface TemplatePayload {
  pluginId: string
  name: string
  kind: string
  content: unknown
}

const VALID_PLUGIN = /^[a-z][a-z0-9_-]{0,40}$/

function assertPluginId(pluginId: string): void {
  if (!VALID_PLUGIN.test(pluginId)) throw new Error('pluginId inválido')
}

function serialize(content: unknown): string {
  if (typeof content === 'string') return content
  return JSON.stringify(content ?? null)
}

export const templatesService = {
  async list(pluginId?: string, kind?: string): Promise<Template[]> {
    const where: string[] = []
    const params: unknown[] = []
    if (pluginId) { assertPluginId(pluginId); where.push('plugin_id = ?'); params.push(pluginId) }
    if (kind) { where.push('kind = ?'); params.push(kind) }
    const sql = `SELECT * FROM core_templates ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY plugin_id, kind, name`
    return storageAPI.query<Template>(sql, params)
  },

  async create(payload: TemplatePayload): Promise<number> {
    assertPluginId(payload.pluginId)
    if (!payload.name || payload.name.length > 80) throw new Error('Nombre requerido (max 80)')
    if (!payload.kind || payload.kind.length > 40) throw new Error('Kind requerido (max 40)')
    const result = await storageAPI.execute(
      'INSERT INTO core_templates (plugin_id, name, kind, content) VALUES (?, ?, ?, ?)',
      [payload.pluginId, payload.name, payload.kind, serialize(payload.content)],
    )
    return result.lastInsertRowid
  },

  async update(id: number, partial: Partial<TemplatePayload>): Promise<void> {
    const sets: string[] = []
    const params: unknown[] = []
    if (partial.name != null) { sets.push('name = ?'); params.push(partial.name) }
    if (partial.kind != null) { sets.push('kind = ?'); params.push(partial.kind) }
    if (partial.content != null) { sets.push('content = ?'); params.push(serialize(partial.content)) }
    if (sets.length === 0) return
    sets.push("updated_at = datetime('now')")
    params.push(id)
    await storageAPI.execute(`UPDATE core_templates SET ${sets.join(', ')} WHERE id = ?`, params)
  },

  async remove(id: number): Promise<void> {
    await storageAPI.execute('DELETE FROM core_templates WHERE id = ?', [id])
  },

  parseContent<T = unknown>(template: Template): T | string {
    try {
      return JSON.parse(template.content) as T
    } catch {
      return template.content
    }
  },
}
