/**
 * Repository layer (Wave 3 · A5).
 *
 * Capa fina sobre `StorageAPI` que ofrece operaciones tipadas y declarativas
 * para una tabla. Mantiene la seguridad (allowlist + identifier validation)
 * porque delega en `storageAPI.insert/update/deleteRow` y no construye SQL
 * propio. Para selects expone un builder mínimo (where/orderBy/limit) que
 * compila a SQL parametrizado y se ejecuta vía `storageAPI.query`.
 *
 * Diseño deliberado:
 *  - Sin caching propio: el caching vive en los stores de Zustand de cada plugin.
 *  - Sin tracking de cambios: cada operación va a la DB.
 *  - Sin joins: si un plugin necesita join, usa `storageAPI.query` directo.
 *  - Cada repo recibe `mapRow(row): Entity` y `toRow(entity): Row` para
 *    desacoplar el modelo de dominio del esquema físico.
 */

import { storageAPI } from './StorageAPI'

const VALID_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/
const ALLOWED_OPERATORS = new Set(['=', '!=', '<', '<=', '>', '>=', 'LIKE', 'IS', 'IS NOT', 'IN'])

export type WhereOperator = '=' | '!=' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'IS' | 'IS NOT' | 'IN'

export interface WhereClause {
  column: string
  op: WhereOperator
  value: unknown
}

export interface FindOptions {
  where?: WhereClause[]
  orderBy?: { column: string; direction?: 'ASC' | 'DESC' }[]
  limit?: number
  offset?: number
}

export interface RepositoryConfig<TEntity, TRow extends Record<string, unknown>> {
  /** Nombre de la tabla. Debe estar en el allowlist de StorageAPI. */
  table: string
  /** Columna PK. Por defecto 'id'. */
  primaryKey?: keyof TRow & string
  /** Mapea una fila bruta de SQL al modelo de dominio. */
  mapRow: (row: TRow) => TEntity
  /** Convierte un parcial del modelo a columnas físicas. */
  toRow: (entity: Partial<TEntity>) => Partial<TRow>
}

function assertIdentifier(name: string, kind: 'column' | 'table'): void {
  if (!VALID_IDENTIFIER.test(name)) {
    throw new Error(`Invalid ${kind} identifier '${name}'`)
  }
}

function buildWhere(where: WhereClause[] | undefined, params: unknown[]): string {
  if (!where || where.length === 0) return ''
  const parts: string[] = []
  for (const clause of where) {
    assertIdentifier(clause.column, 'column')
    if (!ALLOWED_OPERATORS.has(clause.op)) {
      throw new Error(`Invalid operator '${clause.op}'`)
    }
    if (clause.op === 'IN') {
      if (!Array.isArray(clause.value) || clause.value.length === 0) {
        throw new Error(`IN clause requires non-empty array for column '${clause.column}'`)
      }
      const placeholders = clause.value.map(() => '?').join(', ')
      parts.push(`${clause.column} IN (${placeholders})`)
      params.push(...clause.value)
    } else if (clause.value === null && (clause.op === 'IS' || clause.op === 'IS NOT')) {
      parts.push(`${clause.column} ${clause.op} NULL`)
    } else {
      parts.push(`${clause.column} ${clause.op} ?`)
      params.push(clause.value)
    }
  }
  return ` WHERE ${parts.join(' AND ')}`
}

function buildOrderBy(orderBy: FindOptions['orderBy']): string {
  if (!orderBy || orderBy.length === 0) return ''
  const parts: string[] = []
  for (const o of orderBy) {
    assertIdentifier(o.column, 'column')
    const dir = o.direction === 'DESC' ? 'DESC' : 'ASC'
    parts.push(`${o.column} ${dir}`)
  }
  return ` ORDER BY ${parts.join(', ')}`
}

export class Repository<TEntity, TRow extends Record<string, unknown> = Record<string, unknown>> {
  private readonly table: string
  private readonly primaryKey: string
  private readonly mapRow: (row: TRow) => TEntity
  private readonly toRow: (entity: Partial<TEntity>) => Partial<TRow>

  constructor(config: RepositoryConfig<TEntity, TRow>) {
    assertIdentifier(config.table, 'table')
    this.table = config.table
    this.primaryKey = config.primaryKey ?? 'id'
    assertIdentifier(this.primaryKey, 'column')
    this.mapRow = config.mapRow
    this.toRow = config.toRow
  }

  /** SELECT * con filtros y orden. */
  async find(options: FindOptions = {}): Promise<TEntity[]> {
    const params: unknown[] = []
    const where = buildWhere(options.where, params)
    const order = buildOrderBy(options.orderBy)
    let sql = `SELECT * FROM ${this.table}${where}${order}`
    if (options.limit != null) {
      if (!Number.isInteger(options.limit) || options.limit <= 0) {
        throw new Error('limit must be a positive integer')
      }
      sql += ` LIMIT ?`
      params.push(options.limit)
      if (options.offset != null) {
        if (!Number.isInteger(options.offset) || options.offset < 0) {
          throw new Error('offset must be a non-negative integer')
        }
        sql += ` OFFSET ?`
        params.push(options.offset)
      }
    }
    const rows = await storageAPI.query<TRow>(sql, params)
    return rows.map(this.mapRow)
  }

  /** Devuelve el primer match o undefined. */
  async findOne(options: FindOptions = {}): Promise<TEntity | undefined> {
    const result = await this.find({ ...options, limit: 1 })
    return result[0]
  }

  /** Atajo: busca por PK. */
  async findById(id: string | number): Promise<TEntity | undefined> {
    return this.findOne({ where: [{ column: this.primaryKey, op: '=', value: id }] })
  }

  /** Cuenta filas. */
  async count(where?: WhereClause[]): Promise<number> {
    const params: unknown[] = []
    const whereSql = buildWhere(where, params)
    const sql = `SELECT COUNT(*) as c FROM ${this.table}${whereSql}`
    const rows = await storageAPI.query<{ c: number }>(sql, params)
    return Number(rows[0]?.c ?? 0)
  }

  /**
   * Crea una fila. La PK debe venir en `entity` (los plugins generan IDs con
   * `crypto.randomUUID`). Devuelve la entidad ya mapeada (re-fetch para
   * recoger defaults de la DB).
   */
  async create(entity: TEntity): Promise<TEntity> {
    const row = this.toRow(entity)
    await storageAPI.insert(this.table, row)
    const id = (row as Record<string, unknown>)[this.primaryKey] as string | number | undefined
    if (id == null) {
      throw new Error(`create() requires '${this.primaryKey}' in the entity payload`)
    }
    const fetched = await this.findById(id)
    return fetched ?? entity
  }

  /** Update parcial por PK. Devuelve la entidad actualizada o undefined si ya no existe. */
  async update(id: string | number, patch: Partial<TEntity>): Promise<TEntity | undefined> {
    const row = this.toRow(patch)
    if (Object.keys(row).length === 0) return this.findById(id)
    await storageAPI.update(this.table, id, row)
    return this.findById(id)
  }

  /** Borra por PK. Devuelve true si había algo para borrar. */
  async delete(id: string | number): Promise<boolean> {
    const exists = await this.findById(id)
    if (!exists) return false
    await storageAPI.deleteRow(this.table, id)
    return true
  }

  /** Borrado masivo por filtro. Útil para limpiar logs cuando se elimina un padre. */
  async deleteWhere(where: WhereClause[]): Promise<number> {
    if (!where || where.length === 0) {
      throw new Error('deleteWhere requires at least one clause to prevent full-table deletes')
    }
    const params: unknown[] = []
    const whereSql = buildWhere(where, params)
    const sql = `DELETE FROM ${this.table}${whereSql}`
    const result = await storageAPI.execute(sql, params)
    return result.changes
  }
}

/** Factory helper para legibilidad: `defineRepository({...})`. */
export function defineRepository<TEntity, TRow extends Record<string, unknown> = Record<string, unknown>>(
  config: RepositoryConfig<TEntity, TRow>,
): Repository<TEntity, TRow> {
  return new Repository<TEntity, TRow>(config)
}
