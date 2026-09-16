import { beforeEach, describe, expect, it, vi } from 'vitest'
import workPlugin from './index'

/**
 * Cobertura de la migración v9 del plugin Work: crea las tablas de proyectos
 * activos (`work_projects` y `work_project_links`) con su constraint UNIQUE
 * por tripleta (project_id, entity_type, entity_id).
 */
describe('work plugin migration v9', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('declara la migración v9 con ambas tablas y la constraint UNIQUE', () => {
    const v9 = (workPlugin.migrations ?? []).find((migration) => migration.version === 9)
    expect(v9).toBeDefined()
    expect(v9!.up).toContain('CREATE TABLE IF NOT EXISTS work_projects')
    expect(v9!.up).toContain('CREATE TABLE IF NOT EXISTS work_project_links')
    expect(v9!.up).toContain('UNIQUE (project_id, entity_type, entity_id)')
  })

  it('emite ambos CREATE TABLE al ejecutar la migración contra storage', async () => {
    const v9 = (workPlugin.migrations ?? []).find((migration) => migration.version === 9)!
    const executeSpy = vi.spyOn(window.storage, 'execute').mockResolvedValue({
      changes: 1,
      lastInsertRowid: 0,
    })

    await window.storage.execute(v9.up)

    expect(executeSpy).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS work_projects'),
    )
    expect(executeSpy).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS work_project_links'),
    )
    expect(executeSpy).toHaveBeenCalledWith(
      expect.stringContaining('UNIQUE (project_id, entity_type, entity_id)'),
    )
  })
})