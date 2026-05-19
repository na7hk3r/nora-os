import { ipcMain } from 'electron'
import { DatabaseService } from './database'

const CHANNELS = {
  query: 'storage:query',
  execute: 'storage:execute',
  migrate: 'storage:migrate',
} as const

const QUERY_OPERATIONS = new Set(['SELECT', 'WITH', 'PRAGMA'])
const EXECUTE_OPERATIONS = new Set(['INSERT', 'UPDATE', 'DELETE'])
const MIGRATION_OPERATIONS = new Set(['CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE'])

function normalizeSql(sql: string): string {
  return sql.trim().replace(/;+\s*$/, '')
}

function assertParamsArray(params: unknown): asserts params is unknown[] {
  if (params !== undefined && !Array.isArray(params)) {
    throw new Error('params must be an array')
  }
}

function assertSqlString(sql: unknown): asserts sql is string {
  if (typeof sql !== 'string' || normalizeSql(sql).length === 0) {
    throw new Error('sql must be a non-empty string')
  }
}

function getSqlStatements(sql: string): string[] {
  return normalizeSql(sql)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
}

function getSqlOperation(sql: string): string {
  const token = normalizeSql(sql).split(/\s+/)[0]
  return (token ?? '').toUpperCase()
}

function assertSingleStatement(sql: string): void {
  if (getSqlStatements(sql).length !== 1) {
    throw new Error('only a single SQL statement is allowed for this channel')
  }
}

function assertAllowedOperation(sql: string, allowed: Set<string>, channel: string): void {
  const operation = getSqlOperation(sql)
  if (!allowed.has(operation)) {
    throw new Error(`${channel} does not allow '${operation || 'UNKNOWN'}' statements`)
  }
}

function assertPluginId(pluginId: unknown): asserts pluginId is string {
  if (typeof pluginId !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(pluginId)) {
    throw new Error('pluginId is invalid')
  }
}

/**
 * Extract table names referenced in a single SQL statement. Best-effort parser
 * that covers the DDL/DML shapes allowed by MIGRATION_OPERATIONS.
 * Returns lowercased table names without quotes.
 */
function extractTableNames(statement: string): string[] {
  const normalized = statement.replace(/\s+/g, ' ').trim()
  const patterns: RegExp[] = [
    /\bCREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?\s+ON\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bCREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bALTER\s+TABLE\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bDROP\s+(?:TABLE|INDEX)(?:\s+IF\s+EXISTS)?\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bINSERT\s+(?:OR\s+\w+\s+)?INTO\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bUPDATE\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bDELETE\s+FROM\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
  ]

  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match) {
      // CREATE INDEX captures (index_name, table_name); use the table.
      const table = match[2] ?? match[1]
      return table ? [table.toLowerCase()] : []
    }
  }
  return []
}

function assertTablesBelongToPlugin(statement: string, pluginId: string, version: number): void {
  const tables = extractTableNames(statement)
  if (tables.length === 0) {
    throw new Error(`migration ${version} could not resolve target table for statement`)
  }
  const prefix = `${pluginId.toLowerCase()}_`
  for (const table of tables) {
    if (!table.startsWith(prefix)) {
      throw new Error(
        `migration ${version} touches table '${table}' outside plugin namespace '${prefix}'`,
      )
    }
  }
}

function assertMigrations(
  migrations: unknown,
  pluginId: string,
): asserts migrations is { version: number; up: string }[] {
  if (!Array.isArray(migrations) || migrations.length === 0) {
    throw new Error('migrations must be a non-empty array')
  }

  const seenVersions = new Set<number>()
  for (const migration of migrations) {
    if (
      typeof migration !== 'object' ||
      migration === null ||
      typeof (migration as { version?: unknown }).version !== 'number' ||
      !Number.isInteger((migration as { version: number }).version) ||
      (migration as { version: number }).version <= 0
    ) {
      throw new Error('each migration must contain a positive integer version')
    }

    const version = (migration as { version: number }).version
    if (seenVersions.has(version)) {
      throw new Error(`duplicate migration version ${version}`)
    }
    seenVersions.add(version)

    const up = (migration as { up?: unknown }).up
    if (typeof up !== 'string' || normalizeSql(up).length === 0) {
      throw new Error(`migration ${version} must define a non-empty up SQL string`)
    }

    const statements = getSqlStatements(up)
    if (statements.length === 0) {
      throw new Error(`migration ${version} does not contain executable SQL statements`)
    }

    for (const statement of statements) {
      const operation = getSqlOperation(statement)
      if (!MIGRATION_OPERATIONS.has(operation)) {
        throw new Error(`migration ${version} contains disallowed '${operation || 'UNKNOWN'}' operation`)
      }
      assertTablesBelongToPlugin(statement, pluginId, version)
    }
  }
}

function withStorageErrorHandling<T>(fn: () => T): T {
  try {
    return fn()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown storage error'
    throw new Error(`Storage IPC validation failed: ${message}`)
  }
}

export function registerStorageIpc(db: DatabaseService): void {
  ipcMain.handle(CHANNELS.query, (_event, sql: unknown, params?: unknown) => {
    return withStorageErrorHandling(() => {
      assertSqlString(sql)
      assertParamsArray(params)
      assertSingleStatement(sql)
      assertAllowedOperation(sql, QUERY_OPERATIONS, CHANNELS.query)
      return db.query(sql, params ?? [])
    })
  })

  ipcMain.handle(CHANNELS.execute, (_event, sql: unknown, params?: unknown) => {
    return withStorageErrorHandling(() => {
      assertSqlString(sql)
      assertParamsArray(params)
      assertSingleStatement(sql)
      assertAllowedOperation(sql, EXECUTE_OPERATIONS, CHANNELS.execute)
      return db.execute(sql, params ?? [])
    })
  })

  ipcMain.handle(CHANNELS.migrate, (_event, pluginId: unknown, migrations: unknown) => {
    return withStorageErrorHandling(() => {
      assertPluginId(pluginId)
      assertMigrations(migrations, pluginId)
      db.runMigrations(pluginId, migrations)
    })
  })
}
