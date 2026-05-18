"use strict";
const electron = require("electron");
const path = require("path");
const url = require("url");
const Database = require("better-sqlite3");
const fs = require("fs");
const crypto = require("crypto");
const CHANNELS$7 = {
  query: "storage:query",
  execute: "storage:execute",
  migrate: "storage:migrate"
};
const QUERY_OPERATIONS = /* @__PURE__ */ new Set(["SELECT", "WITH", "PRAGMA"]);
const EXECUTE_OPERATIONS = /* @__PURE__ */ new Set(["INSERT", "UPDATE", "DELETE"]);
const MIGRATION_OPERATIONS = /* @__PURE__ */ new Set(["CREATE", "ALTER", "DROP", "INSERT", "UPDATE", "DELETE"]);
function normalizeSql(sql) {
  return sql.trim().replace(/;+\s*$/, "");
}
function assertParamsArray(params) {
  if (params !== void 0 && !Array.isArray(params)) {
    throw new Error("params must be an array");
  }
}
function assertSqlString(sql) {
  if (typeof sql !== "string" || normalizeSql(sql).length === 0) {
    throw new Error("sql must be a non-empty string");
  }
}
function getSqlStatements(sql) {
  return normalizeSql(sql).split(";").map((part) => part.trim()).filter(Boolean);
}
function getSqlOperation(sql) {
  const token = normalizeSql(sql).split(/\s+/)[0];
  return (token ?? "").toUpperCase();
}
function assertSingleStatement(sql) {
  if (getSqlStatements(sql).length !== 1) {
    throw new Error("only a single SQL statement is allowed for this channel");
  }
}
function assertAllowedOperation(sql, allowed, channel) {
  const operation = getSqlOperation(sql);
  if (!allowed.has(operation)) {
    throw new Error(`${channel} does not allow '${operation || "UNKNOWN"}' statements`);
  }
}
function assertPluginId(pluginId) {
  if (typeof pluginId !== "string" || !/^[a-z][a-z0-9_-]*$/.test(pluginId)) {
    throw new Error("pluginId is invalid");
  }
}
function extractTableNames(statement) {
  const normalized = statement.replace(/\s+/g, " ").trim();
  const patterns = [
    /\bCREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?\s+ON\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bCREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bALTER\s+TABLE\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bDROP\s+(?:TABLE|INDEX)(?:\s+IF\s+EXISTS)?\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bINSERT\s+(?:OR\s+\w+\s+)?INTO\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bUPDATE\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bDELETE\s+FROM\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const table = match[2] ?? match[1];
      return table ? [table.toLowerCase()] : [];
    }
  }
  return [];
}
function assertTablesBelongToPlugin(statement, pluginId, version) {
  const tables = extractTableNames(statement);
  if (tables.length === 0) {
    throw new Error(`migration ${version} could not resolve target table for statement`);
  }
  const prefix = `${pluginId.toLowerCase()}_`;
  for (const table of tables) {
    if (!table.startsWith(prefix)) {
      throw new Error(
        `migration ${version} touches table '${table}' outside plugin namespace '${prefix}'`
      );
    }
  }
}
function assertMigrations(migrations, pluginId) {
  if (!Array.isArray(migrations) || migrations.length === 0) {
    throw new Error("migrations must be a non-empty array");
  }
  const seenVersions = /* @__PURE__ */ new Set();
  for (const migration of migrations) {
    if (typeof migration !== "object" || migration === null || typeof migration.version !== "number" || !Number.isInteger(migration.version) || migration.version <= 0) {
      throw new Error("each migration must contain a positive integer version");
    }
    const version = migration.version;
    if (seenVersions.has(version)) {
      throw new Error(`duplicate migration version ${version}`);
    }
    seenVersions.add(version);
    const up = migration.up;
    if (typeof up !== "string" || normalizeSql(up).length === 0) {
      throw new Error(`migration ${version} must define a non-empty up SQL string`);
    }
    const statements = getSqlStatements(up);
    if (statements.length === 0) {
      throw new Error(`migration ${version} does not contain executable SQL statements`);
    }
    for (const statement of statements) {
      const operation = getSqlOperation(statement);
      if (!MIGRATION_OPERATIONS.has(operation)) {
        throw new Error(`migration ${version} contains disallowed '${operation || "UNKNOWN"}' operation`);
      }
      assertTablesBelongToPlugin(statement, pluginId, version);
    }
  }
}
function withStorageErrorHandling(fn) {
  try {
    return fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown storage error";
    throw new Error(`Storage IPC validation failed: ${message}`);
  }
}
function registerStorageIpc(db) {
  electron.ipcMain.handle(CHANNELS$7.query, (_event, sql, params) => {
    return withStorageErrorHandling(() => {
      assertSqlString(sql);
      assertParamsArray(params);
      assertSingleStatement(sql);
      assertAllowedOperation(sql, QUERY_OPERATIONS, CHANNELS$7.query);
      return db.query(sql, params ?? []);
    });
  });
  electron.ipcMain.handle(CHANNELS$7.execute, (_event, sql, params) => {
    return withStorageErrorHandling(() => {
      assertSqlString(sql);
      assertParamsArray(params);
      assertSingleStatement(sql);
      assertAllowedOperation(sql, EXECUTE_OPERATIONS, CHANNELS$7.execute);
      return db.execute(sql, params ?? []);
    });
  });
  electron.ipcMain.handle(CHANNELS$7.migrate, (_event, pluginId, migrations) => {
    return withStorageErrorHandling(() => {
      assertPluginId(pluginId);
      assertMigrations(migrations, pluginId);
      db.runMigrations(pluginId, migrations);
    });
  });
}
const MAGIC$3 = Buffer.from("POS1", "utf8");
const VERSION = 1;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const SCRYPT_N = 1 << 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const MIN_PASSPHRASE_LENGTH = 12;
class EncryptionError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "EncryptionError";
  }
  code;
}
function deriveKey$3(passphrase, salt) {
  return crypto.scryptSync(passphrase.normalize("NFKC"), salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 128 * SCRYPT_N * SCRYPT_R * 2
  });
}
function isPassphraseStrongEnough(passphrase) {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) return false;
  let categories = 0;
  if (/[a-z]/.test(passphrase)) categories += 1;
  if (/[A-Z]/.test(passphrase)) categories += 1;
  if (/[0-9]/.test(passphrase)) categories += 1;
  if (/[^A-Za-z0-9]/.test(passphrase)) categories += 1;
  return categories >= 2;
}
function encryptFile(plainPath, encryptedPath, passphrase) {
  if (!isPassphraseStrongEnough(passphrase)) {
    throw new EncryptionError("passphrase too weak", "WEAK_PASSPHRASE");
  }
  if (!fs.existsSync(plainPath)) {
    throw new EncryptionError(`source not found: ${plainPath}`, "IO");
  }
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey$3(passphrase, salt);
  const plaintext = fs.readFileSync(plainPath);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const versionByte = Buffer.from([VERSION]);
  const out = Buffer.concat([MAGIC$3, versionByte, salt, iv, tag, ciphertext]);
  fs.writeFileSync(encryptedPath, out);
  try {
    fs.unlinkSync(plainPath);
  } catch (err) {
    console.warn("[encryption] failed to remove plain file after encrypt:", err);
  }
}
function decryptFile(encryptedPath, plainPath, passphrase) {
  if (!fs.existsSync(encryptedPath)) {
    throw new EncryptionError(`encrypted file not found: ${encryptedPath}`, "IO");
  }
  const blob = fs.readFileSync(encryptedPath);
  const headerSize = MAGIC$3.length + 1 + SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
  if (blob.length < headerSize) {
    throw new EncryptionError("file too small to be a valid POS1 blob", "CORRUPT_FILE");
  }
  const magic = blob.subarray(0, MAGIC$3.length);
  if (!magic.equals(MAGIC$3)) {
    throw new EncryptionError("invalid magic header", "CORRUPT_FILE");
  }
  const version = blob[MAGIC$3.length];
  if (version !== VERSION) {
    throw new EncryptionError(`unsupported version ${version}`, "CORRUPT_FILE");
  }
  let offset = MAGIC$3.length + 1;
  const salt = blob.subarray(offset, offset + SALT_LENGTH);
  offset += SALT_LENGTH;
  const iv = blob.subarray(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;
  const tag = blob.subarray(offset, offset + TAG_LENGTH);
  offset += TAG_LENGTH;
  const ciphertext = blob.subarray(offset);
  const key = deriveKey$3(passphrase, salt);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let plaintext;
  try {
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new EncryptionError("passphrase incorrect or file tampered", "BAD_PASSPHRASE");
  }
  fs.writeFileSync(plainPath, plaintext);
}
function isEncryptedFile(path2) {
  if (!fs.existsSync(path2)) return false;
  try {
    const fd = fs.readFileSync(path2).subarray(0, MAGIC$3.length);
    return fd.equals(MAGIC$3);
  } catch {
    return false;
  }
}
const CORE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY DEFAULT 1,
    name TEXT,
    height REAL,
    age INTEGER,
    start_date TEXT,
    weight_goal REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS events_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    source TEXT NOT NULL,
    payload TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_events_log_created_at ON events_log(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_log_type_created ON events_log(event_type, created_at);

  CREATE TABLE IF NOT EXISTS plugin_state (
    plugin_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (plugin_id, key)
  );

  CREATE TABLE IF NOT EXISTS _migrations (
    plugin_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    applied_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (plugin_id, version)
  );

  CREATE TABLE IF NOT EXISTS core_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS core_tag_links (
    tag_id INTEGER NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (tag_id, entity_type, entity_id),
    FOREIGN KEY (tag_id) REFERENCES core_tags(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_core_tag_links_entity ON core_tag_links(entity_type, entity_id);

  CREATE TABLE IF NOT EXISTS core_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_core_templates_plugin ON core_templates(plugin_id, kind);

  CREATE TABLE IF NOT EXISTS core_automations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    trigger_event TEXT NOT NULL,
    condition TEXT,
    action_type TEXT NOT NULL,
    action_payload TEXT,
    last_run_at TEXT,
    run_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_core_automations_event ON core_automations(trigger_event, enabled);

  CREATE TABLE IF NOT EXISTS core_notifications_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT,
    source TEXT,
    scheduled_at TEXT NOT NULL,
    delivered_at TEXT,
    dismissed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_core_notifications_scheduled ON core_notifications_queue(scheduled_at, delivered_at);
`;
const AUTH_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    recovery_question TEXT NOT NULL,
    recovery_answer_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    revoked_at TEXT,
    last_seen_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_revoked_at ON sessions(revoked_at);
`;
class DatabaseService {
  static instance;
  authDb = null;
  userDb = null;
  dataDir = null;
  activeUserId = null;
  /** Passphrase mantenida en memoria sólo mientras la sesión esté activa. */
  activePassphrase = null;
  static getInstance() {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }
  initialize() {
    const userDataPath = electron.app.getPath("userData");
    const dbDir = path.join(userDataPath, "data");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const authDbPath = path.join(dbDir, "auth.db");
    this.authDb = new Database(authDbPath);
    this.authDb.pragma("journal_mode = WAL");
    this.authDb.pragma("foreign_keys = ON");
    this.authDb.pragma("busy_timeout = 5000");
    this.authDb.exec(AUTH_SCHEMA);
    this.dataDir = dbDir;
  }
  getLegacyDbPath() {
    if (!this.dataDir) throw new Error("Database not initialized");
    return path.join(this.dataDir, "personal-os.db");
  }
  getUserDbPath(userId) {
    if (!this.dataDir) throw new Error("Database not initialized");
    return path.join(this.dataDir, `personal-os-user-${userId}.db`);
  }
  /** Path del archivo cifrado en reposo (si el usuario lo activó). */
  getEncryptedDbPath(userId) {
    return `${this.getUserDbPath(userId)}.enc`;
  }
  /**
   * Devuelve true si el usuario tiene el archivo cifrado en reposo. Útil
   * para que el frontend sepa que va a necesitar pedir passphrase.
   */
  hasEncryptedDb(userId) {
    return isEncryptedFile(this.getEncryptedDbPath(userId));
  }
  hasLegacySingleUserDb() {
    return fs.existsSync(this.getLegacyDbPath());
  }
  claimLegacyDbForUser(userId) {
    const legacyPath = this.getLegacyDbPath();
    const userDbPath = this.getUserDbPath(userId);
    if (!fs.existsSync(legacyPath) || fs.existsSync(userDbPath)) {
      return;
    }
    fs.renameSync(legacyPath, userDbPath);
  }
  setActiveUser(userId, passphrase) {
    if (this.activeUserId === userId && this.userDb) {
      return;
    }
    const plainPath = this.getUserDbPath(userId);
    const encPath = this.getEncryptedDbPath(userId);
    if (isEncryptedFile(encPath)) {
      if (!passphrase) {
        this.userDb?.close();
        this.userDb = null;
        this.activeUserId = userId;
        this.activePassphrase = null;
        return;
      }
      decryptFile(encPath, plainPath, passphrase);
      this.activePassphrase = passphrase;
    } else {
      this.activePassphrase = null;
    }
    this.userDb?.close();
    this.userDb = new Database(plainPath);
    this.userDb.pragma("journal_mode = WAL");
    this.userDb.pragma("foreign_keys = ON");
    this.userDb.pragma("busy_timeout = 5000");
    this.userDb.exec(CORE_SCHEMA);
    this.activeUserId = userId;
    this.purgeOldEvents();
  }
  /**
   * Si el usuario activo quedó con .enc bloqueado, desbloquearlo con la
   * passphrase. Idempotente: si ya está abierto, no hace nada.
   */
  unlockEncryptedDb(passphrase) {
    if (!this.activeUserId) throw new Error("No active user session");
    if (this.userDb) return;
    this.setActiveUser(this.activeUserId, passphrase);
  }
  /** True si el usuario activo todavía no abrió su DB cifrada. */
  isLocked() {
    return this.activeUserId != null && this.userDb == null;
  }
  /**
   * Política de retención del log de eventos.
   * Sin esto, `events_log` crece sin tope y degrada inserts/queries con el
   * tiempo. Llamado al activar usuario (≈ una vez por arranque); barato gracias
   * al índice por `created_at` implícito en SQLite.
   */
  static EVENT_RETENTION_DAYS = 90;
  static EVENT_HARD_CAP_ROWS = 5e4;
  purgeOldEvents() {
    if (!this.userDb) return;
    try {
      this.userDb.prepare(
        `DELETE FROM events_log WHERE created_at < datetime('now', ?)`
      ).run(`-${DatabaseService.EVENT_RETENTION_DAYS} days`);
      const row = this.userDb.prepare(`SELECT COUNT(*) as c FROM events_log`).get();
      if (row.c > DatabaseService.EVENT_HARD_CAP_ROWS) {
        const excess = row.c - DatabaseService.EVENT_HARD_CAP_ROWS;
        this.userDb.prepare(
          `DELETE FROM events_log WHERE id IN (SELECT id FROM events_log ORDER BY id ASC LIMIT ?)`
        ).run(excess);
      }
    } catch (err) {
      console.warn("[DatabaseService] purgeOldEvents failed:", err);
    }
  }
  clearActiveUser() {
    if (this.activeUserId && this.activePassphrase) {
      try {
        try {
          this.userDb?.pragma("wal_checkpoint(TRUNCATE)");
        } catch {
        }
        this.userDb?.close();
        this.userDb = null;
        const plainPath = this.getUserDbPath(this.activeUserId);
        const encPath = this.getEncryptedDbPath(this.activeUserId);
        encryptFile(plainPath, encPath, this.activePassphrase);
      } catch (err) {
        console.error("[DatabaseService] failed to re-encrypt on logout:", err);
      } finally {
        this.activePassphrase = null;
      }
    }
    this.userDb?.close();
    this.userDb = null;
    this.activeUserId = null;
    this.activePassphrase = null;
  }
  getActiveUserId() {
    return this.activeUserId;
  }
  authQuery(sql, params = []) {
    if (!this.authDb) throw new Error("Auth database not initialized");
    const stmt = this.authDb.prepare(sql);
    return stmt.all(...params);
  }
  authExecute(sql, params = []) {
    if (!this.authDb) throw new Error("Auth database not initialized");
    const stmt = this.authDb.prepare(sql);
    const result = stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid)
    };
  }
  query(sql, params = []) {
    if (!this.userDb) throw new Error("No active user session");
    const stmt = this.userDb.prepare(sql);
    return stmt.all(...params);
  }
  execute(sql, params = []) {
    if (!this.userDb) throw new Error("No active user session");
    const stmt = this.userDb.prepare(sql);
    const result = stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid)
    };
  }
  runMigrations(pluginId, migrations) {
    if (!this.userDb) throw new Error("No active user session");
    const applied = this.userDb.prepare("SELECT version FROM _migrations WHERE plugin_id = ?").all(pluginId);
    const appliedVersions = new Set(applied.map((r) => r.version));
    const pending = migrations.filter((m) => !appliedVersions.has(m.version)).sort((a, b) => a.version - b.version);
    const runInTransaction = this.userDb.transaction(() => {
      for (const migration of pending) {
        this.userDb.exec(migration.up);
        this.userDb.prepare("INSERT INTO _migrations (plugin_id, version) VALUES (?, ?)").run(pluginId, migration.version);
      }
    });
    runInTransaction();
  }
  /**
   * Export the active user DB to a destination path.
   * Uses SQLite's online backup so it is safe even with active connections.
   */
  exportActiveUserDb(destinationPath) {
    if (!this.userDb) throw new Error("No active user session");
    const backupPath = destinationPath;
    try {
      this.userDb.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
    }
    if (!this.activeUserId) throw new Error("No active user session");
    const sourcePath = this.getUserDbPath(this.activeUserId);
    fs.copyFileSync(sourcePath, backupPath);
  }
  /**
   * Replace the active user DB with the contents of the given file. Closes
   * the current connection, swaps the file, and reopens with CORE_SCHEMA.
   */
  importActiveUserDb(sourcePath) {
    if (!this.activeUserId) throw new Error("No active user session");
    const userId = this.activeUserId;
    this.userDb?.close();
    this.userDb = null;
    const targetPath = this.getUserDbPath(userId);
    const data = fs.readFileSync(sourcePath);
    fs.writeFileSync(targetPath, data);
    this.setActiveUser(userId);
  }
  close() {
    if (this.activeUserId && this.activePassphrase) {
      try {
        try {
          this.userDb?.pragma("wal_checkpoint(TRUNCATE)");
        } catch {
        }
        this.userDb?.close();
        this.userDb = null;
        const plainPath = this.getUserDbPath(this.activeUserId);
        const encPath = this.getEncryptedDbPath(this.activeUserId);
        encryptFile(plainPath, encPath, this.activePassphrase);
      } catch (err) {
        console.error("[DatabaseService] failed to re-encrypt on close:", err);
      }
    }
    this.userDb?.close();
    this.authDb?.close();
    this.activePassphrase = null;
  }
  // ─── Cifrado opt-in ────────────────────────────────────────────────
  /**
   * Activa el cifrado para el usuario activo: cifra inmediatamente la DB,
   * borra el plano y guarda la passphrase en memoria para esta sesión.
   * Lanza EncryptionError si la passphrase es débil.
   */
  enableEncryptionForActiveUser(passphrase) {
    if (!this.activeUserId || !this.userDb) throw new Error("No active user session");
    if (!isPassphraseStrongEnough(passphrase)) {
      throw new EncryptionError("passphrase too weak", "WEAK_PASSPHRASE");
    }
    const userId = this.activeUserId;
    try {
      this.userDb.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
    }
    this.userDb.close();
    this.userDb = null;
    const plainPath = this.getUserDbPath(userId);
    const encPath = this.getEncryptedDbPath(userId);
    encryptFile(plainPath, encPath, passphrase);
    decryptFile(encPath, plainPath, passphrase);
    this.userDb = new Database(plainPath);
    this.userDb.pragma("journal_mode = WAL");
    this.userDb.pragma("foreign_keys = ON");
    this.userDb.pragma("busy_timeout = 5000");
    this.activePassphrase = passphrase;
  }
  /**
   * Desactiva el cifrado: borra el archivo .enc y deja el plano. Requiere
   * que la sesión esté activa (es decir, ya con la passphrase válida).
   */
  disableEncryptionForActiveUser() {
    if (!this.activeUserId) throw new Error("No active user session");
    const encPath = this.getEncryptedDbPath(this.activeUserId);
    if (fs.existsSync(encPath)) {
      fs.unlinkSync(encPath);
    }
    this.activePassphrase = null;
  }
  /** True si el usuario activo tiene el cifrado en uso esta sesión. */
  isEncryptionEnabledForActiveUser() {
    return Boolean(this.activeUserId && this.activePassphrase);
  }
}
function normalizeUsername(username) {
  return username.trim().toLowerCase();
}
function assertUsername(username) {
  if (!username.trim()) {
    throw new Error("El nombre de usuario no puede estar vacío.");
  }
  if (username.length < 3) {
    throw new Error("El nombre de usuario debe tener al menos 3 caracteres.");
  }
  if (username.length > 32) {
    throw new Error("El nombre de usuario no puede exceder 32 caracteres.");
  }
  if (!/^[a-z0-9._-]+$/i.test(username)) {
    throw new Error("El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos.");
  }
}
function assertPassword(password) {
  if (!password) {
    throw new Error("La contraseña no puede estar vacía.");
  }
  if (password.length < 8) {
    throw new Error("La contraseña debe tener mínimo 8 caracteres.");
  }
}
function assertRecoveryQuestion(question) {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("La pregunta de recuperación no puede estar vacía.");
  }
  if (trimmed.length < 10) {
    throw new Error("La pregunta de recuperación debe tener mínimo 10 caracteres.");
  }
}
function assertRecoveryAnswer(answer) {
  const trimmed = answer.trim();
  if (!trimmed) {
    throw new Error("La respuesta de recuperación no puede estar vacía.");
  }
  if (trimmed.length < 2) {
    throw new Error("La respuesta de recuperación debe tener mínimo 2 caracteres.");
  }
}
function hashSecret(secret) {
  const salt = crypto.randomBytes(16);
  const digest = crypto.scryptSync(secret, salt, 64);
  return `${salt.toString("hex")}:${digest.toString("hex")}`;
}
function verifySecret(secret, encodedHash) {
  const [saltHex, digestHex] = encodedHash.split(":");
  if (!saltHex || !digestHex) {
    return false;
  }
  const computed = crypto.scryptSync(secret, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(digestHex, "hex");
  if (computed.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(computed, expected);
}
function mapAuthUser(row) {
  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at
  };
}
class AuthService {
  constructor(db) {
    this.db = db;
  }
  db;
  currentUser = null;
  currentSessionId = null;
  getUserByUsername(username) {
    const rows = this.db.authQuery(
      `SELECT id, username, password_hash, recovery_question, recovery_answer_hash, created_at, last_login_at
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [normalizeUsername(username)]
    );
    return rows[0] ?? null;
  }
  activateSession(user) {
    this.currentUser = user;
    this.db.setActiveUser(user.id);
  }
  createSession(userId) {
    this.db.authExecute(
      `UPDATE sessions
       SET revoked_at = datetime('now')
       WHERE revoked_at IS NULL`,
      []
    );
    const sessionId = crypto.randomUUID();
    this.db.authExecute(
      `INSERT INTO sessions (id, user_id, created_at, last_seen_at)
       VALUES (?, ?, datetime('now'), datetime('now'))`,
      [sessionId, userId]
    );
    this.currentSessionId = sessionId;
  }
  touchSession(sessionId) {
    this.db.authExecute(
      `UPDATE sessions
       SET last_seen_at = datetime('now')
       WHERE id = ?`,
      [sessionId]
    );
  }
  async register(params) {
    const username = normalizeUsername(params.username);
    assertUsername(username);
    assertPassword(params.password);
    assertRecoveryQuestion(params.recoveryQuestion);
    assertRecoveryAnswer(params.recoveryAnswer);
    const existing = this.getUserByUsername(username);
    if (existing) {
      throw new Error("Este nombre de usuario ya está en uso. Elige otro.");
    }
    const usersCountRows = this.db.authQuery("SELECT COUNT(*) as count FROM users");
    const isFirstUser = (usersCountRows[0]?.count ?? 0) === 0;
    const userId = crypto.randomUUID();
    this.db.authExecute(
      `INSERT INTO users (
        id,
        username,
        password_hash,
        recovery_question,
        recovery_answer_hash,
        created_at,
        updated_at,
        last_login_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`,
      [
        userId,
        username,
        hashSecret(params.password),
        params.recoveryQuestion.trim(),
        hashSecret(params.recoveryAnswer.trim().toLowerCase())
      ]
    );
    if (isFirstUser && this.db.hasLegacySingleUserDb()) {
      this.db.claimLegacyDbForUser(userId);
    }
    const userRows = this.db.authQuery(
      `SELECT id, username, password_hash, recovery_question, recovery_answer_hash, created_at, last_login_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );
    const row = userRows[0];
    if (!row) {
      throw new Error("No se pudo completar el registro. Intenta de nuevo.");
    }
    const user = mapAuthUser(row);
    this.createSession(user.id);
    this.activateSession(user);
    return user;
  }
  async login(username, password) {
    const userRow = this.getUserByUsername(username);
    if (!userRow || !verifySecret(password, userRow.password_hash)) {
      throw new Error("El nombre de usuario o contraseña es incorrecto.");
    }
    this.db.authExecute(
      `UPDATE users
       SET last_login_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
      [userRow.id]
    );
    const updatedRow = {
      ...userRow,
      last_login_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const user = mapAuthUser(updatedRow);
    this.createSession(user.id);
    this.activateSession(user);
    return user;
  }
  async getCurrentUser() {
    if (this.currentUser && this.currentSessionId) {
      this.touchSession(this.currentSessionId);
      return this.currentUser;
    }
    const sessionRows = this.db.authQuery(
      `SELECT id, user_id
       FROM sessions
       WHERE revoked_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      []
    );
    const session = sessionRows[0];
    if (!session) {
      return null;
    }
    const userRows = this.db.authQuery(
      `SELECT id, username, password_hash, recovery_question, recovery_answer_hash, created_at, last_login_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [session.user_id]
    );
    const userRow = userRows[0];
    if (!userRow) {
      return null;
    }
    this.currentSessionId = session.id;
    const user = mapAuthUser(userRow);
    this.activateSession(user);
    this.touchSession(session.id);
    return user;
  }
  async logout() {
    if (this.currentSessionId) {
      this.db.authExecute(
        `UPDATE sessions
         SET revoked_at = datetime('now')
         WHERE id = ?`,
        [this.currentSessionId]
      );
    }
    this.currentSessionId = null;
    this.currentUser = null;
    this.db.clearActiveUser();
  }
  async getRecoveryQuestion(username) {
    const user = this.getUserByUsername(username);
    return user?.recovery_question ?? null;
  }
  async resetPasswordWithRecovery(params) {
    assertPassword(params.newPassword);
    assertRecoveryAnswer(params.recoveryAnswer);
    const user = this.getUserByUsername(params.username);
    if (!user) {
      throw new Error("No encontramos ese nombre de usuario. Verifica e intenta de nuevo.");
    }
    const answerOk = verifySecret(params.recoveryAnswer.trim().toLowerCase(), user.recovery_answer_hash);
    if (!answerOk) {
      throw new Error("La respuesta de recuperación es incorrecta. Intenta de nuevo.");
    }
    this.db.authExecute(
      `UPDATE users
       SET password_hash = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [hashSecret(params.newPassword), user.id]
    );
    this.db.authExecute(
      `UPDATE sessions
       SET revoked_at = datetime('now')
       WHERE user_id = ? AND revoked_at IS NULL`,
      [user.id]
    );
    if (this.currentUser?.id === user.id) {
      this.currentSessionId = null;
      this.currentUser = null;
      this.db.clearActiveUser();
    }
  }
}
const CHANNELS$6 = {
  register: "auth:register",
  login: "auth:login",
  logout: "auth:logout",
  me: "auth:me",
  getRecoveryQuestion: "auth:get-recovery-question",
  resetPasswordWithRecovery: "auth:reset-password-with-recovery"
};
function assertString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
}
function withAuthErrorHandling(fn) {
  return fn().catch((error) => {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(typeof error === "string" ? error : "Error de autenticación");
  });
}
function registerAuthIpc(authService) {
  electron.ipcMain.handle(CHANNELS$6.register, (_event, payload) => {
    return withAuthErrorHandling(async () => {
      if (typeof payload !== "object" || payload === null) {
        throw new Error("payload is required");
      }
      const data = payload;
      assertString(data.username, "username");
      assertString(data.password, "password");
      assertString(data.recoveryQuestion, "recoveryQuestion");
      assertString(data.recoveryAnswer, "recoveryAnswer");
      return authService.register({
        username: data.username,
        password: data.password,
        recoveryQuestion: data.recoveryQuestion,
        recoveryAnswer: data.recoveryAnswer
      });
    });
  });
  electron.ipcMain.handle(CHANNELS$6.login, (_event, username, password) => {
    return withAuthErrorHandling(async () => {
      assertString(username, "username");
      assertString(password, "password");
      return authService.login(username, password);
    });
  });
  electron.ipcMain.handle(CHANNELS$6.logout, () => {
    return withAuthErrorHandling(async () => {
      await authService.logout();
    });
  });
  electron.ipcMain.handle(CHANNELS$6.me, () => {
    return withAuthErrorHandling(async () => authService.getCurrentUser());
  });
  electron.ipcMain.handle(CHANNELS$6.getRecoveryQuestion, (_event, username) => {
    return withAuthErrorHandling(async () => {
      assertString(username, "username");
      return authService.getRecoveryQuestion(username);
    });
  });
  electron.ipcMain.handle(
    CHANNELS$6.resetPasswordWithRecovery,
    (_event, payload) => {
      return withAuthErrorHandling(async () => {
        if (typeof payload !== "object" || payload === null) {
          throw new Error("payload is required");
        }
        const data = payload;
        assertString(data.username, "username");
        assertString(data.recoveryAnswer, "recoveryAnswer");
        assertString(data.newPassword, "newPassword");
        await authService.resetPasswordWithRecovery({
          username: data.username,
          recoveryAnswer: data.recoveryAnswer,
          newPassword: data.newPassword
        });
      });
    }
  );
}
const CHANNELS$5 = {
  exportPlain: "backup:export-plain",
  exportEncrypted: "backup:export-encrypted",
  importPlain: "backup:import-plain",
  importEncrypted: "backup:import-encrypted"
};
const MAGIC$2 = Buffer.from("POS-BAK1");
const ALGO$2 = "aes-256-gcm";
const KEY_LEN$2 = 32;
const SALT_LEN$2 = 16;
const IV_LEN$2 = 12;
const TAG_LEN$1 = 16;
function deriveKey$2(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, KEY_LEN$2, { N: 16384, r: 8, p: 1 });
}
function encrypt$2(payload, passphrase) {
  const salt = crypto.randomBytes(SALT_LEN$2);
  const iv = crypto.randomBytes(IV_LEN$2);
  const key = deriveKey$2(passphrase, salt);
  const cipher = crypto.createCipheriv(ALGO$2, key, iv);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC$2, salt, iv, tag, encrypted]);
}
function decrypt$1(blob, passphrase) {
  if (blob.length < MAGIC$2.length + SALT_LEN$2 + IV_LEN$2 + TAG_LEN$1) {
    throw new Error("Backup file is too small or corrupted");
  }
  const magic = blob.subarray(0, MAGIC$2.length);
  if (!magic.equals(MAGIC$2)) {
    throw new Error("Invalid backup format");
  }
  let offset = MAGIC$2.length;
  const salt = blob.subarray(offset, offset + SALT_LEN$2);
  offset += SALT_LEN$2;
  const iv = blob.subarray(offset, offset + IV_LEN$2);
  offset += IV_LEN$2;
  const tag = blob.subarray(offset, offset + TAG_LEN$1);
  offset += TAG_LEN$1;
  const encrypted = blob.subarray(offset);
  const key = deriveKey$2(passphrase, salt);
  const decipher = crypto.createDecipheriv(ALGO$2, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
async function pickSavePath$1(defaultName) {
  const focused = electron.BrowserWindow.getFocusedWindow();
  const result = await electron.dialog.showSaveDialog(focused ?? new electron.BrowserWindow({ show: false }), {
    title: "Guardar backup de Nora OS",
    defaultPath: defaultName
  });
  return result.canceled || !result.filePath ? null : result.filePath;
}
async function pickOpenPath$1() {
  const focused = electron.BrowserWindow.getFocusedWindow();
  const result = await electron.dialog.showOpenDialog(focused ?? new electron.BrowserWindow({ show: false }), {
    title: "Restaurar backup de Nora OS",
    properties: ["openFile"]
  });
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
}
function registerBackupIpc(db) {
  electron.ipcMain.handle(CHANNELS$5.exportPlain, async () => {
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const dest = await pickSavePath$1(`personal-os-backup-${stamp}.db`);
    if (!dest) return { ok: false, canceled: true };
    db.exportActiveUserDb(dest);
    return { ok: true, path: dest };
  });
  electron.ipcMain.handle(CHANNELS$5.exportEncrypted, async (_event, passphrase) => {
    if (typeof passphrase !== "string" || passphrase.length < 8) {
      throw new Error("La passphrase debe tener al menos 8 caracteres");
    }
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const dest = await pickSavePath$1(`personal-os-backup-${stamp}.posbak`);
    if (!dest) return { ok: false, canceled: true };
    const tmp = `${dest}.tmp.db`;
    db.exportActiveUserDb(tmp);
    try {
      const data = fs.readFileSync(tmp);
      const blob = encrypt$2(data, passphrase);
      fs.writeFileSync(dest, blob);
    } finally {
      try {
        if (fs.existsSync(tmp)) {
          fs.writeFileSync(tmp, "");
        }
      } catch {
      }
    }
    return { ok: true, path: dest };
  });
  electron.ipcMain.handle(CHANNELS$5.importPlain, async () => {
    const src = await pickOpenPath$1();
    if (!src) return { ok: false, canceled: true };
    db.importActiveUserDb(src);
    return { ok: true };
  });
  electron.ipcMain.handle(CHANNELS$5.importEncrypted, async (_event, passphrase) => {
    if (typeof passphrase !== "string" || passphrase.length < 1) {
      throw new Error("Ingresá la passphrase usada al exportar");
    }
    const src = await pickOpenPath$1();
    if (!src) return { ok: false, canceled: true };
    const blob = fs.readFileSync(src);
    const data = decrypt$1(blob, passphrase);
    const tmp = `${src}.decrypted.tmp.db`;
    fs.writeFileSync(tmp, data);
    db.importActiveUserDb(tmp);
    try {
      fs.writeFileSync(tmp, "");
    } catch {
    }
    return { ok: true };
  });
}
const CHANNELS$4 = {
  exportPlain: "profile:export-plain",
  exportEncrypted: "profile:export-encrypted",
  importPlain: "profile:import-plain",
  importEncrypted: "profile:import-encrypted"
};
const MAGIC$1 = Buffer.from("POS-PRF1");
const ALGO$1 = "aes-256-gcm";
const KEY_LEN$1 = 32;
const SALT_LEN$1 = 16;
const IV_LEN$1 = 12;
const TAG_LEN = 16;
const PROFILE_SCHEMA_VERSION = 1;
const ALLOWED_SETTING_KEYS = /* @__PURE__ */ new Set([
  "theme",
  "sidebarCollapsed",
  "activePlugins",
  "profile.bigGoal"
]);
function deriveKey$1(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, KEY_LEN$1, { N: 16384, r: 8, p: 1 });
}
function encrypt$1(payload, passphrase) {
  const salt = crypto.randomBytes(SALT_LEN$1);
  const iv = crypto.randomBytes(IV_LEN$1);
  const key = deriveKey$1(passphrase, salt);
  const cipher = crypto.createCipheriv(ALGO$1, key, iv);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC$1, salt, iv, tag, encrypted]);
}
function decrypt(blob, passphrase) {
  if (blob.length < MAGIC$1.length + SALT_LEN$1 + IV_LEN$1 + TAG_LEN) {
    throw new Error("Archivo de perfil corrupto o demasiado chico");
  }
  if (!blob.subarray(0, MAGIC$1.length).equals(MAGIC$1)) {
    throw new Error("Formato inválido: el archivo no es un perfil cifrado de Nora OS");
  }
  let offset = MAGIC$1.length;
  const salt = blob.subarray(offset, offset + SALT_LEN$1);
  offset += SALT_LEN$1;
  const iv = blob.subarray(offset, offset + IV_LEN$1);
  offset += IV_LEN$1;
  const tag = blob.subarray(offset, offset + TAG_LEN);
  offset += TAG_LEN;
  const ciphertext = blob.subarray(offset);
  const key = deriveKey$1(passphrase, salt);
  const decipher = crypto.createDecipheriv(ALGO$1, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
async function pickSavePath(defaultName) {
  const focused = electron.BrowserWindow.getFocusedWindow();
  const result = await electron.dialog.showSaveDialog(focused ?? new electron.BrowserWindow({ show: false }), {
    title: "Exportar perfil de Nora OS",
    defaultPath: defaultName
  });
  return result.canceled || !result.filePath ? null : result.filePath;
}
async function pickOpenPath() {
  const focused = electron.BrowserWindow.getFocusedWindow();
  const result = await electron.dialog.showOpenDialog(focused ?? new electron.BrowserWindow({ show: false }), {
    title: "Importar perfil de Nora OS",
    properties: ["openFile"]
  });
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
}
function buildSnapshot(db) {
  const profileRow = db.query(
    "SELECT name, height, age, start_date as startDate, weight_goal as weightGoal FROM profile WHERE id = 1"
  )[0];
  const settingsRows = db.query("SELECT key, value FROM settings");
  const settings = {};
  for (const row of settingsRows) {
    if (ALLOWED_SETTING_KEYS.has(row.key)) {
      settings[row.key] = row.value;
    }
  }
  let activePlugins = [];
  if (settings.activePlugins) {
    try {
      const parsed = JSON.parse(settings.activePlugins);
      if (Array.isArray(parsed)) activePlugins = parsed.filter((id) => typeof id === "string");
    } catch {
    }
  }
  let gamification = null;
  try {
    const gRow = db.query(
      "SELECT total_xp as totalXp, level FROM gamification_stats WHERE id = 1"
    )[0];
    if (gRow) gamification = { totalXp: gRow.totalXp ?? 0, level: gRow.level ?? 1 };
  } catch {
  }
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    // `app.name` legacy: se mantiene como `personal-os` para que snapshots
    // exportados sigan siendo importables en versiones previas de la app.
    // No es el nombre comercial visible (la app se llama Nora OS).
    app: { name: "personal-os", ref: "profile-export" },
    profile: profileRow ? {
      ...profileRow,
      bigGoal: settings["profile.bigGoal"] || void 0
    } : null,
    settings,
    activePlugins,
    gamification
  };
}
function applySnapshot(db, snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("Snapshot inválido");
  }
  if (snapshot.schemaVersion !== PROFILE_SCHEMA_VERSION) {
    throw new Error(`Versión de perfil no soportada: ${snapshot.schemaVersion}`);
  }
  if (snapshot.profile) {
    const p = snapshot.profile;
    db.execute(
      `INSERT OR REPLACE INTO profile (id, name, height, age, start_date, weight_goal, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, datetime('now'))`,
      [p.name ?? "", p.height ?? 0, p.age ?? 0, p.startDate ?? "", p.weightGoal ?? 0]
    );
  }
  if (snapshot.settings) {
    for (const [key, value] of Object.entries(snapshot.settings)) {
      if (ALLOWED_SETTING_KEYS.has(key) && typeof value === "string") {
        db.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
      }
    }
  }
  if (snapshot.profile?.bigGoal) {
    db.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('profile.bigGoal', ?)", [
      snapshot.profile.bigGoal
    ]);
  }
}
function parseSnapshot(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("El archivo no es un JSON válido");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Snapshot inválido");
  const snap = parsed;
  if (snap.app?.name !== "personal-os") {
    throw new Error("El archivo no parece ser un perfil de Nora OS");
  }
  return snap;
}
function summarize(snapshot) {
  return {
    schemaVersion: snapshot.schemaVersion,
    exportedAt: snapshot.exportedAt,
    hadProfile: Boolean(snapshot.profile),
    activePlugins: snapshot.activePlugins ?? []
  };
}
function registerProfileIpc(db) {
  electron.ipcMain.handle(CHANNELS$4.exportPlain, async () => {
    const snapshot = buildSnapshot(db);
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const dest = await pickSavePath(`personal-os-profile-${stamp}.posprof.json`);
    if (!dest) return { ok: false, canceled: true };
    fs.writeFileSync(dest, JSON.stringify(snapshot, null, 2), "utf8");
    return { ok: true, path: dest };
  });
  electron.ipcMain.handle(CHANNELS$4.exportEncrypted, async (_event, passphrase) => {
    if (typeof passphrase !== "string" || passphrase.length < 8) {
      throw new Error("La passphrase debe tener al menos 8 caracteres");
    }
    const snapshot = buildSnapshot(db);
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const dest = await pickSavePath(`personal-os-profile-${stamp}.posprof`);
    if (!dest) return { ok: false, canceled: true };
    const blob = encrypt$1(Buffer.from(JSON.stringify(snapshot), "utf8"), passphrase);
    fs.writeFileSync(dest, blob);
    return { ok: true, path: dest };
  });
  electron.ipcMain.handle(CHANNELS$4.importPlain, async () => {
    const src = await pickOpenPath();
    if (!src) return { ok: false, canceled: true };
    const text = fs.readFileSync(src, "utf8");
    const snapshot = parseSnapshot(text);
    applySnapshot(db, snapshot);
    return { ok: true, summary: summarize(snapshot) };
  });
  electron.ipcMain.handle(CHANNELS$4.importEncrypted, async (_event, passphrase) => {
    if (typeof passphrase !== "string" || passphrase.length < 1) {
      throw new Error("Ingresá la passphrase usada al exportar");
    }
    const src = await pickOpenPath();
    if (!src) return { ok: false, canceled: true };
    const blob = fs.readFileSync(src);
    const plain = decrypt(blob, passphrase);
    const snapshot = parseSnapshot(plain.toString("utf8"));
    applySnapshot(db, snapshot);
    return { ok: true, summary: summarize(snapshot) };
  });
}
const CHANNELS$3 = {
  health: "ollama:health",
  generate: "ollama:generate",
  listModels: "ollama:list-models",
  pullModel: "ollama:pull-model"
};
const DEFAULT_BASE = "http://127.0.0.1:11434";
function getBase() {
  return process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_BASE;
}
function postJson(path2, body, timeoutMs = 6e4) {
  return new Promise((resolve, reject) => {
    const req = electron.net.request({
      method: "POST",
      url: `${getBase()}${path2}`
    });
    req.setHeader("Content-Type", "application/json");
    const chunks = [];
    const timer2 = setTimeout(() => {
      try {
        req.abort();
      } catch {
      }
      reject(new Error(`Ollama request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    req.on("response", (response) => {
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => {
        clearTimeout(timer2);
        const text = Buffer.concat(chunks).toString("utf-8");
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`Ollama HTTP ${response.statusCode}: ${text}`));
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch (err) {
          reject(new Error(`Ollama response is not valid JSON: ${err.message}`));
        }
      });
      response.on("error", (err) => {
        clearTimeout(timer2);
        reject(err);
      });
    });
    req.on("error", (err) => {
      clearTimeout(timer2);
      reject(err);
    });
    req.write(JSON.stringify(body));
    req.end();
  });
}
function getJson(path2, timeoutMs = 5e3) {
  return new Promise((resolve, reject) => {
    const req = electron.net.request({ method: "GET", url: `${getBase()}${path2}` });
    const chunks = [];
    const timer2 = setTimeout(() => {
      try {
        req.abort();
      } catch {
      }
      reject(new Error(`Ollama request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    req.on("response", (response) => {
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => {
        clearTimeout(timer2);
        const text = Buffer.concat(chunks).toString("utf-8");
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`Ollama HTTP ${response.statusCode}: ${text}`));
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch (err) {
          reject(new Error(`Ollama response is not valid JSON: ${err.message}`));
        }
      });
      response.on("error", (err) => {
        clearTimeout(timer2);
        reject(err);
      });
    });
    req.on("error", (err) => {
      clearTimeout(timer2);
      reject(err);
    });
    req.end();
  });
}
function registerOllamaIpc() {
  electron.ipcMain.handle(CHANNELS$3.health, async () => {
    try {
      await getJson("/api/tags", 3e3);
      return { ok: true, baseUrl: getBase() };
    } catch (err) {
      return { ok: false, baseUrl: getBase(), error: err.message };
    }
  });
  electron.ipcMain.handle(CHANNELS$3.listModels, async () => {
    const data = await getJson("/api/tags", 5e3);
    return data.models?.map((m) => ({ name: m.name, size: m.size, modifiedAt: m.modified_at })) ?? [];
  });
  electron.ipcMain.handle(CHANNELS$3.pullModel, async (_event, payload) => {
    if (typeof payload !== "string" || payload.trim().length === 0) {
      throw new Error("model requerido");
    }
    const model = payload.trim();
    const result = await postJson("/api/pull", {
      model,
      stream: false
    }, 6e5);
    return { ok: true, model, status: result.status };
  });
  electron.ipcMain.handle(CHANNELS$3.generate, async (_event, payload) => {
    if (!payload || typeof payload !== "object") {
      throw new Error("Payload inválido");
    }
    const req = payload;
    if (typeof req.model !== "string" || req.model.length === 0) {
      throw new Error("model requerido");
    }
    if (typeof req.prompt !== "string" || req.prompt.length === 0) {
      throw new Error("prompt requerido");
    }
    const body = {
      model: req.model,
      prompt: req.prompt,
      system: req.system,
      stream: false,
      options: req.options ?? {}
    };
    const result = await postJson(
      "/api/generate",
      body,
      12e4
    );
    return { text: result.response, durationMs: result.total_duration ? Math.round(result.total_duration / 1e6) : void 0 };
  });
}
const CHANNELS$2 = {
  show: "notifications:show",
  isSupported: "notifications:supported"
};
function registerNotificationsIpc() {
  electron.ipcMain.handle(CHANNELS$2.isSupported, () => electron.Notification.isSupported());
  electron.ipcMain.handle(CHANNELS$2.show, (_event, payload) => {
    if (!electron.Notification.isSupported()) return { ok: false, reason: "not-supported" };
    if (!payload || typeof payload !== "object") {
      throw new Error("Payload inválido");
    }
    const p = payload;
    if (typeof p.title !== "string" || p.title.length === 0) {
      throw new Error("title requerido");
    }
    const n = new electron.Notification({
      title: p.title,
      body: p.body ?? "",
      silent: p.silent === true
    });
    n.show();
    return { ok: true };
  });
}
const CHANNEL = "diagnostic:export";
function buildReport(input) {
  return {
    ...input,
    appVersion: input.appVersion ?? electron.app.getVersion(),
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    electronVersion: process.versions.electron ?? "unknown",
    chromeVersion: process.versions.chrome ?? "unknown",
    nodeVersion: process.versions.node ?? "unknown",
    platform: process.platform,
    arch: process.arch,
    locale: electron.app.getLocale()
  };
}
function registerDiagnosticIpc() {
  electron.ipcMain.handle(CHANNEL, async (_event, raw) => {
    const payload = typeof raw === "object" && raw !== null ? raw : {};
    const report = buildReport(payload);
    const focused = electron.BrowserWindow.getFocusedWindow();
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const defaultName = `personal-os-diagnostic-${stamp}.json`;
    const result = await electron.dialog.showSaveDialog(focused ?? new electron.BrowserWindow({ show: false }), {
      title: "Exportar diagnóstico de Nora OS",
      defaultPath: path.join(electron.app.getPath("downloads"), defaultName),
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePath) {
      return { ok: false, canceled: true };
    }
    try {
      fs.writeFileSync(result.filePath, JSON.stringify(report, null, 2), "utf-8");
      return { ok: true, path: result.filePath };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "No se pudo escribir el archivo"
      };
    }
  });
}
const DEFAULT_BOOT_DELAY_MS = 1e4;
const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1e3;
function scheduleAutoUpdateChecks(opts) {
  const {
    check,
    disabled = false,
    bootDelayMs = DEFAULT_BOOT_DELAY_MS,
    intervalMs = DEFAULT_INTERVAL_MS,
    setTimeoutFn = setTimeout,
    setIntervalFn = setInterval,
    clearTimeoutFn = clearTimeout,
    clearIntervalFn = clearInterval
  } = opts;
  if (disabled) {
    return { stop: () => {
    }, isActive: false };
  }
  const safeCheck = () => {
    try {
      const result = check();
      if (result && typeof result.then === "function") {
        void result.catch(() => {
        });
      }
    } catch {
    }
  };
  const bootHandle = setTimeoutFn(safeCheck, bootDelayMs);
  const intervalHandle = setIntervalFn(safeCheck, intervalMs);
  const handle = {
    isActive: true,
    stop: () => {
      if (!handle.isActive) return;
      clearTimeoutFn(bootHandle);
      clearIntervalFn(intervalHandle);
      handle.isActive = false;
    }
  };
  return handle;
}
const OFFICIAL_DOWNLOAD_URL = "https://na7hk3r.github.io/nora-os/#download";
const MANUAL_UPDATE_ERROR_MESSAGE = "No pudimos conectar con el servidor de actualizaciones. Descargá manualmente la última versión desde el sitio oficial.";
const RECOVERABLE_UPDATE_ERROR_PATTERNS = [
  /ERR_NAME_NOT_RESOLVED/i,
  /\bENOTFOUND\b/i,
  /\bEAI_AGAIN\b/i,
  /\bETIMEDOUT\b/i,
  /\bECONNRESET\b/i,
  /\bECONNREFUSED\b/i,
  /timeout|timed out/i,
  /network|fetch failed|socket hang up/i,
  /\b404\b|not found/i,
  /latest\.ya?ml|app-update\.ya?ml|manifest|feed/i
];
function getAppUpdateErrorMessage(error) {
  if (error instanceof Error) {
    const details = error;
    return [
      error.name,
      error.message,
      details.code,
      details.statusCode,
      details.status
    ].filter((value) => typeof value === "string" || typeof value === "number").join(" ");
  }
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const details = error;
    const parts = [details.message, details.code, details.statusCode, details.status].filter((value) => typeof value === "string" || typeof value === "number").join(" ");
    if (parts) return parts;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
function isRecoverableAppUpdateError(error) {
  const message = getAppUpdateErrorMessage(error);
  return RECOVERABLE_UPDATE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}
function toAppUpdateErrorStatus(_error) {
  return {
    state: "error",
    message: MANUAL_UPDATE_ERROR_MESSAGE,
    manualDownloadUrl: OFFICIAL_DOWNLOAD_URL
  };
}
const CHANNELS$1 = {
  getStatus: "app-update:get-status",
  check: "app-update:check",
  download: "app-update:download",
  quitAndInstall: "app-update:quit-and-install",
  status: "app-update:status"
};
let currentStatus = { state: "idle" };
let updater = null;
let mainWindowGetter = null;
let scheduleHandle = null;
function broadcast(status) {
  currentStatus = status;
  const win = mainWindowGetter?.();
  if (win && !win.isDestroyed()) {
    win.webContents.send(CHANNELS$1.status, status);
  }
}
function tryLoadUpdater() {
  try {
    const mod = require("electron-updater");
    return mod.autoUpdater;
  } catch {
    return null;
  }
}
function broadcastUpdateError(context, err) {
  const technicalMessage = getAppUpdateErrorMessage(err);
  const recoverable = isRecoverableAppUpdateError(err);
  console.warn(`[app-update] ${context}`, { recoverable, technicalMessage, error: err });
  broadcast(toAppUpdateErrorStatus());
}
function registerAppUpdateIpc(getMainWindow) {
  mainWindowGetter = getMainWindow;
  if (!electron.app.isPackaged) {
    currentStatus = { state: "disabled", reason: "No disponible en modo desarrollo." };
  } else {
    updater = tryLoadUpdater();
    if (!updater) {
      currentStatus = {
        state: "disabled",
        reason: "electron-updater no está instalado. Instalá la dependencia para activar auto-update."
      };
    } else {
      updater.autoDownload = false;
      updater.autoInstallOnAppQuit = true;
      updater.on("checking-for-update", () => broadcast({ state: "checking" }));
      updater.on("update-not-available", (info) => {
        const version = info?.version ?? electron.app.getVersion();
        broadcast({ state: "no-update", currentVersion: version });
      });
      updater.on("update-available", (info) => {
        const data = info;
        broadcast({
          state: "available",
          version: data?.version ?? "desconocida",
          releaseNotes: typeof data?.releaseNotes === "string" ? data.releaseNotes : void 0
        });
      });
      updater.on("download-progress", (progress) => {
        const p = progress;
        broadcast({
          state: "downloading",
          percent: Math.round(p?.percent ?? 0),
          transferredBytes: p?.transferred ?? 0,
          totalBytes: p?.total ?? 0
        });
      });
      updater.on("update-downloaded", (info) => {
        const version = info?.version ?? "desconocida";
        broadcast({ state: "downloaded", version });
      });
      updater.on("error", (err) => broadcastUpdateError("autoUpdater error", err));
    }
  }
  electron.ipcMain.handle(CHANNELS$1.getStatus, () => currentStatus);
  electron.ipcMain.handle(CHANNELS$1.check, async () => {
    if (!updater) return currentStatus;
    try {
      await updater.checkForUpdates();
    } catch (err) {
      broadcastUpdateError("checkForUpdates failed", err);
    }
    return currentStatus;
  });
  electron.ipcMain.handle(CHANNELS$1.download, async () => {
    if (!updater) return currentStatus;
    try {
      await updater.downloadUpdate();
    } catch (err) {
      broadcastUpdateError("downloadUpdate failed", err);
    }
    return currentStatus;
  });
  electron.ipcMain.handle(CHANNELS$1.quitAndInstall, () => {
    if (!updater) return;
    updater.quitAndInstall();
  });
  if (updater) {
    const localUpdater = updater;
    scheduleHandle = scheduleAutoUpdateChecks({
      disabled: !electron.app.isPackaged,
      check: () => localUpdater.checkForUpdates()
    });
  }
}
function shutdownAppUpdateIpc() {
  scheduleHandle?.stop();
  scheduleHandle = null;
}
const CHANNELS = {
  status: "dbencryption:status",
  enable: "dbencryption:enable",
  disable: "dbencryption:disable",
  checkStrength: "dbencryption:check-strength",
  unlock: "dbencryption:unlock"
};
function registerDbEncryptionIpc() {
  const db = DatabaseService.getInstance();
  electron.ipcMain.handle(CHANNELS.status, () => {
    const userId = db.getActiveUserId();
    return {
      enabled: db.isEncryptionEnabledForActiveUser(),
      hasEncryptedAtRest: userId ? db.hasEncryptedDb(userId) : false,
      locked: db.isLocked()
    };
  });
  electron.ipcMain.handle(CHANNELS.unlock, (_evt, passphrase) => {
    try {
      db.unlockEncryptedDb(passphrase);
      return { ok: true };
    } catch (err) {
      if (err instanceof EncryptionError) {
        return { ok: false, code: err.code, message: err.message };
      }
      return { ok: false, code: "IO", message: err.message };
    }
  });
  electron.ipcMain.handle(CHANNELS.checkStrength, (_evt, passphrase) => {
    return { strong: isPassphraseStrongEnough(passphrase ?? "") };
  });
  electron.ipcMain.handle(CHANNELS.enable, (_evt, passphrase) => {
    try {
      db.enableEncryptionForActiveUser(passphrase);
      return { ok: true };
    } catch (err) {
      if (err instanceof EncryptionError) {
        return { ok: false, code: err.code, message: err.message };
      }
      return { ok: false, code: "IO", message: err.message };
    }
  });
  electron.ipcMain.handle(CHANNELS.disable, () => {
    try {
      db.disableEncryptionForActiveUser();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  });
}
let focusWindow = null;
function focusMainWindow(getMainWindow) {
  const mainWindow2 = getMainWindow();
  if (!mainWindow2 || mainWindow2.isDestroyed()) return;
  if (mainWindow2.isMinimized()) mainWindow2.restore();
  mainWindow2.show();
  mainWindow2.focus();
}
function loadFocusRoute(window, options) {
  if (options.rendererUrl) {
    const base = options.rendererUrl.replace(/\/$/, "");
    void window.loadURL(`${base}/#/work/focus-mini`);
    return;
  }
  void window.loadURL(`${url.pathToFileURL(options.rendererFile).toString()}#/work/focus-mini`);
}
function openFocusWindow(getMainWindow, options) {
  if (focusWindow && !focusWindow.isDestroyed()) {
    focusWindow.show();
    focusWindow.focus();
    return;
  }
  focusWindow = new electron.BrowserWindow({
    width: 376,
    height: 342,
    minWidth: 340,
    minHeight: 310,
    title: "Nora Focus",
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: "#111111",
    show: false,
    webPreferences: {
      preload: options.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  focusWindow.setAlwaysOnTop(true, "floating");
  focusWindow.on("ready-to-show", () => focusWindow?.show());
  focusWindow.on("closed", () => {
    focusWindow = null;
  });
  loadFocusRoute(focusWindow, options);
  focusMainWindow(getMainWindow);
}
function registerWorkFocusWindowIpc(getMainWindow, options) {
  electron.ipcMain.handle("work-focus-window:open", () => {
    openFocusWindow(getMainWindow, options);
  });
  electron.ipcMain.handle("work-focus-window:close", () => {
    focusWindow?.close();
  });
  electron.ipcMain.handle("work-focus-window:toggle", () => {
    if (focusWindow && !focusWindow.isDestroyed()) {
      focusWindow.close();
      return;
    }
    openFocusWindow(getMainWindow, options);
  });
  electron.ipcMain.handle("work-focus-window:focus-main", () => {
    focusMainWindow(getMainWindow);
  });
}
function closeWorkFocusWindow() {
  focusWindow?.close();
  focusWindow = null;
}
const SETTINGS_KEY = "scheduledBackup";
const STATUS_KEY = "scheduledBackupStatus";
const DEFAULT_CONFIG = {
  enabled: false,
  frequencyDays: 7,
  destinationDir: null,
  encrypt: true,
  retainCount: 5
};
const MAGIC = Buffer.from("POS-BAK1");
const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const SALT_LEN = 16;
const IV_LEN = 12;
let timer = null;
let sessionPassphrase = null;
function deriveKey(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, KEY_LEN, { N: 16384, r: 8, p: 1 });
}
function encrypt(payload, passphrase) {
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(passphrase, salt);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, salt, iv, tag, encrypted]);
}
function loadConfig(db) {
  try {
    const rows = db.query(
      `SELECT value FROM settings WHERE key = ?`,
      [SETTINGS_KEY]
    );
    if (rows.length === 0) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(rows[0].value);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
function saveConfig(db, config) {
  db.execute(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [SETTINGS_KEY, JSON.stringify(config)]
  );
}
function loadStatus(db) {
  try {
    const rows = db.query(
      `SELECT value FROM settings WHERE key = ?`,
      [STATUS_KEY]
    );
    if (rows.length === 0) return { lastRunAt: null, lastResultPath: null, lastError: null };
    return JSON.parse(rows[0].value);
  } catch {
    return { lastRunAt: null, lastResultPath: null, lastError: null };
  }
}
function saveStatus(db, status) {
  db.execute(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [STATUS_KEY, JSON.stringify(status)]
  );
}
function computeNextRunAt(config, lastRunAt) {
  if (!config.enabled) return null;
  const baseMs = lastRunAt ? Date.parse(lastRunAt) : Date.now() - config.frequencyDays * 24 * 60 * 60 * 1e3;
  return new Date(baseMs + config.frequencyDays * 24 * 60 * 60 * 1e3).toISOString();
}
function buildStatus(db) {
  const config = loadConfig(db);
  const persisted = loadStatus(db);
  return {
    config,
    ...persisted,
    nextRunAt: computeNextRunAt(config, persisted.lastRunAt),
    passphraseLoaded: sessionPassphrase !== null
  };
}
function pruneOldBackups(dir, retainCount) {
  if (retainCount <= 0) return;
  if (!fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir).filter((f) => f.startsWith("personal-os-auto-") && (f.endsWith(".db") || f.endsWith(".posbak"))).map((f) => {
      const full = path.join(dir, f);
      return { full, mtime: fs.statSync(full).mtimeMs };
    }).sort((a, b) => b.mtime - a.mtime);
    const toDelete = entries.slice(retainCount);
    for (const entry of toDelete) {
      try {
        fs.unlinkSync(entry.full);
      } catch (err) {
        console.warn("[ScheduledBackup] failed to prune", entry.full, err);
      }
    }
  } catch (err) {
    console.warn("[ScheduledBackup] pruning failed", err);
  }
}
async function performBackup(db) {
  const config = loadConfig(db);
  if (!config.destinationDir) {
    return { ok: false, error: "Sin carpeta destino configurada." };
  }
  if (!fs.existsSync(config.destinationDir)) {
    try {
      fs.mkdirSync(config.destinationDir, { recursive: true });
    } catch (err) {
      return { ok: false, error: `No se pudo crear la carpeta: ${err.message}` };
    }
  }
  if (config.encrypt && !sessionPassphrase) {
    return { ok: false, error: "Backup cifrado requiere passphrase. Definila en Control Center." };
  }
  const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const ext = config.encrypt ? "posbak" : "db";
  const dest = path.join(config.destinationDir, `personal-os-auto-${stamp}.${ext}`);
  const tmp = `${dest}.tmp.db`;
  try {
    db.exportActiveUserDb(tmp);
    if (config.encrypt && sessionPassphrase) {
      const data = fs.readFileSync(tmp);
      const blob = encrypt(data, sessionPassphrase);
      fs.writeFileSync(dest, blob);
      try {
        fs.unlinkSync(tmp);
      } catch {
      }
    } else {
      const data = fs.readFileSync(tmp);
      fs.writeFileSync(dest, data);
      try {
        fs.unlinkSync(tmp);
      } catch {
      }
    }
    pruneOldBackups(config.destinationDir, config.retainCount);
    return { ok: true, path: dest };
  } catch (err) {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
    }
    return { ok: false, error: err.message };
  }
}
async function tickIfDue(db) {
  const config = loadConfig(db);
  if (!config.enabled || !config.destinationDir) return;
  const persisted = loadStatus(db);
  const dueAt = computeNextRunAt(config, persisted.lastRunAt);
  if (!dueAt) return;
  if (Date.parse(dueAt) > Date.now()) return;
  const result = await performBackup(db);
  saveStatus(db, {
    lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastResultPath: result.ok ? result.path ?? null : persisted.lastResultPath,
    lastError: result.ok ? null : result.error ?? "Error desconocido"
  });
}
function startTimer(db) {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    void tickIfDue(db);
  }, 60 * 60 * 1e3);
  setTimeout(() => void tickIfDue(db), 3e4);
}
function registerScheduledBackupIpc(db) {
  electron.ipcMain.handle("scheduled-backup:get-status", () => buildStatus(db));
  electron.ipcMain.handle("scheduled-backup:set-config", (_event, raw) => {
    if (typeof raw !== "object" || raw === null) {
      throw new Error("config debe ser un objeto");
    }
    const current = loadConfig(db);
    const next = {
      ...current,
      ...raw
    };
    if (!Number.isInteger(next.frequencyDays) || next.frequencyDays < 1 || next.frequencyDays > 30) {
      throw new Error("frequencyDays debe estar entre 1 y 30");
    }
    if (!Number.isInteger(next.retainCount) || next.retainCount < 1 || next.retainCount > 50) {
      throw new Error("retainCount debe estar entre 1 y 50");
    }
    saveConfig(db, next);
    startTimer(db);
    return buildStatus(db);
  });
  electron.ipcMain.handle("scheduled-backup:pick-destination", async () => {
    const focused = electron.BrowserWindow.getFocusedWindow();
    const result = await electron.dialog.showOpenDialog(focused ?? new electron.BrowserWindow({ show: false }), {
      title: "Carpeta para backups automáticos",
      defaultPath: electron.app.getPath("documents"),
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) return { path: null };
    return { path: result.filePaths[0] };
  });
  electron.ipcMain.handle("scheduled-backup:set-passphrase", (_event, passphrase) => {
    if (passphrase === null) {
      sessionPassphrase = null;
      return { ok: true };
    }
    if (typeof passphrase !== "string" || passphrase.length < 8) {
      throw new Error("Passphrase muy corta. Mínimo 8 caracteres.");
    }
    sessionPassphrase = passphrase;
    return { ok: true };
  });
  electron.ipcMain.handle("scheduled-backup:run-now", async () => {
    const result = await performBackup(db);
    const persisted = loadStatus(db);
    saveStatus(db, {
      lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastResultPath: result.ok ? result.path ?? null : persisted.lastResultPath,
      lastError: result.ok ? null : result.error ?? "Error desconocido"
    });
    return buildStatus(db);
  });
}
function bootScheduledBackup(db) {
  startTimer(db);
}
function shutdownScheduledBackup() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  sessionPassphrase = null;
}
let mainWindow = null;
const rendererUrl = process.env.ELECTRON_RENDERER_URL;
const isDebugDevtoolsEnabled = process.env.ELECTRON_DEBUG_DEVTOOLS === "true";
electron.app.setName("Nora OS");
if (process.platform !== "win32") {
  electron.app.setAboutPanelOptions({
    applicationName: "Nora OS",
    applicationVersion: electron.app.getVersion(),
    copyright: "Copyright © 2026 na7hk3r",
    iconPath: path.join(__dirname, "../../buildResources/icon.png")
  });
}
const ALLOWED_EXTERNAL_PROTOCOLS = /* @__PURE__ */ new Set(["https:", "http:", "mailto:"]);
function isSafeExternalUrl(rawUrl) {
  try {
    const parsed = new url.URL(rawUrl);
    return ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}
function isAllowedNavigationTarget(rawUrl) {
  try {
    const parsed = new url.URL(rawUrl);
    if (parsed.protocol === "file:") return true;
    if (rendererUrl) {
      const dev = new url.URL(rendererUrl);
      return parsed.origin === dev.origin;
    }
    return false;
  } catch {
    return false;
  }
}
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "Nora OS",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    titleBarStyle: "hiddenInset",
    show: false
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });
  if (rendererUrl && isDebugDevtoolsEnabled) {
    mainWindow.webContents.openDevTools();
  }
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.on("web-contents-created", (_event, contents) => {
  contents.setWindowOpenHandler(({ url: url2 }) => {
    if (isAllowedNavigationTarget(url2)) {
      return { action: "deny" };
    }
    if (isSafeExternalUrl(url2)) {
      void electron.shell.openExternal(url2);
    }
    return { action: "deny" };
  });
  contents.on("will-navigate", (event, url2) => {
    if (!isAllowedNavigationTarget(url2)) {
      event.preventDefault();
      if (isSafeExternalUrl(url2)) {
        void electron.shell.openExternal(url2);
      }
    }
  });
  contents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
});
electron.app.whenReady().then(() => {
  if (process.platform !== "darwin") {
    electron.Menu.setApplicationMenu(null);
  }
  const db = DatabaseService.getInstance();
  db.initialize();
  const authService = new AuthService(db);
  registerStorageIpc(db);
  registerAuthIpc(authService);
  registerBackupIpc(db);
  registerProfileIpc(db);
  registerOllamaIpc();
  registerNotificationsIpc();
  registerDiagnosticIpc();
  registerScheduledBackupIpc(db);
  registerAppUpdateIpc(() => mainWindow);
  registerDbEncryptionIpc();
  registerWorkFocusWindowIpc(() => mainWindow, {
    preloadPath: path.join(__dirname, "../preload/index.js"),
    rendererFile: path.join(__dirname, "../renderer/index.html"),
    rendererUrl
  });
  bootScheduledBackup(db);
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  closeWorkFocusWindow();
  shutdownScheduledBackup();
  shutdownAppUpdateIpc();
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
