import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import '../models/nora_models.dart';

abstract class AuthLocalStore {
  Future<void> insertUser({
    required String id,
    required String username,
    required String displayName,
    required String passwordHash,
    required String salt,
    String? recoveryQuestion,
    String? recoveryAnswerHash,
    String? recoverySalt,
  });

  Future<Map<String, Object?>?> findUserCredentials(String username);
  Future<NoraUser?> findUserById(String id);
  Future<NoraUser?> findUserByUsername(String username);
  Future<bool> hasAnyUser();
  Future<void> updatePassword({
    required String userId,
    required String passwordHash,
    required String salt,
  });
  Future<void> touchLogin(String userId);
  Future<void> seedUserDataIfEmpty(String ownerId);
}

class NoraLocalStore implements AuthLocalStore {
  NoraLocalStore._();

  static final NoraLocalStore instance = NoraLocalStore._();

  Database? _database;

  Future<Database> get database async {
    final existing = _database;
    if (existing != null) return existing;

    final root = await getDatabasesPath();
    final path = p.join(root, 'nora_mobile.db');
    final db = await openDatabase(
      path,
      version: 2,
      onCreate: _createSchema,
      onUpgrade: _upgradeSchema,
      onConfigure: (db) async {
        await db.execute('PRAGMA foreign_keys = ON');
      },
    );
    _database = db;
    return db;
  }

  Future<void> _createSchema(Database db, int version) async {
    await db.execute('''
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        recovery_question TEXT,
        recovery_answer_hash TEXT,
        recovery_salt TEXT,
        created_at TEXT NOT NULL,
        last_login_at TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE planner_items (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        start_minute INTEGER,
        end_minute INTEGER,
        kind TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE TABLE task_items (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        due_date TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        read_at TEXT,
        deep_link TEXT,
        FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE TABLE settings (
        owner_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY(owner_id, key),
        FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    ''');

    await db.execute('CREATE INDEX idx_planner_owner_date ON planner_items(owner_id, date)');
    await db.execute('CREATE INDEX idx_tasks_owner_status ON task_items(owner_id, status)');
    await db.execute('CREATE INDEX idx_notifications_owner_created ON notifications(owner_id, created_at)');
  }

  Future<void> _upgradeSchema(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      await db.execute('ALTER TABLE users ADD COLUMN recovery_question TEXT');
      await db.execute('ALTER TABLE users ADD COLUMN recovery_answer_hash TEXT');
      await db.execute('ALTER TABLE users ADD COLUMN recovery_salt TEXT');
    }
  }

  @override
  Future<void> insertUser({
    required String id,
    required String username,
    required String displayName,
    required String passwordHash,
    required String salt,
    String? recoveryQuestion,
    String? recoveryAnswerHash,
    String? recoverySalt,
  }) async {
    final db = await database;
    final now = DateTime.now().toIso8601String();
    await db.insert('users', {
      'id': id,
      'username': username,
      'display_name': displayName,
      'password_hash': passwordHash,
      'salt': salt,
      'recovery_question': recoveryQuestion,
      'recovery_answer_hash': recoveryAnswerHash,
      'recovery_salt': recoverySalt,
      'created_at': now,
      'last_login_at': now,
    });
  }

  @override
  Future<Map<String, Object?>?> findUserCredentials(String username) async {
    final db = await database;
    final rows = await db.query(
      'users',
      where: 'username = ?',
      whereArgs: [username],
      limit: 1,
    );
    return rows.isEmpty ? null : rows.first;
  }

  @override
  Future<bool> hasAnyUser() async {
    final db = await database;
    final count = Sqflite.firstIntValue(await db.rawQuery('SELECT COUNT(*) FROM users')) ?? 0;
    return count > 0;
  }

  @override
  Future<void> updatePassword({
    required String userId,
    required String passwordHash,
    required String salt,
  }) async {
    final db = await database;
    await db.update(
      'users',
      {
        'password_hash': passwordHash,
        'salt': salt,
        'last_login_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [userId],
    );
  }

  @override
  Future<NoraUser?> findUserById(String id) async {
    final db = await database;
    final rows = await db.query('users', where: 'id = ?', whereArgs: [id], limit: 1);
    return rows.isEmpty ? null : NoraUser.fromMap(rows.first);
  }

  @override
  Future<NoraUser?> findUserByUsername(String username) async {
    final db = await database;
    final rows = await db.query(
      'users',
      where: 'username = ?',
      whereArgs: [username],
      limit: 1,
    );
    return rows.isEmpty ? null : NoraUser.fromMap(rows.first);
  }

  @override
  Future<void> touchLogin(String userId) async {
    final db = await database;
    await db.update(
      'users',
      {'last_login_at': DateTime.now().toIso8601String()},
      where: 'id = ?',
      whereArgs: [userId],
    );
  }

  Future<List<PlannerItem>> listPlanner(String ownerId) async {
    final db = await database;
    final rows = await db.query(
      'planner_items',
      where: 'owner_id = ?',
      whereArgs: [ownerId],
      orderBy: 'date ASC, start_minute ASC, created_at DESC',
    );
    return rows.map(PlannerItem.fromMap).toList();
  }

  Future<void> upsertPlanner(PlannerItem item) async {
    final db = await database;
    await db.insert(
      'planner_items',
      item.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> deletePlanner(String ownerId, String itemId) async {
    final db = await database;
    await db.delete(
      'planner_items',
      where: 'owner_id = ? AND id = ?',
      whereArgs: [ownerId, itemId],
    );
  }

  Future<List<TaskItem>> listTasks(String ownerId) async {
    final db = await database;
    final rows = await db.query(
      'task_items',
      where: 'owner_id = ?',
      whereArgs: [ownerId],
      orderBy: 'status ASC, due_date ASC, created_at DESC',
    );
    return rows.map(TaskItem.fromMap).toList();
  }

  Future<void> upsertTask(TaskItem item) async {
    final db = await database;
    await db.insert(
      'task_items',
      item.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> deleteTask(String ownerId, String itemId) async {
    final db = await database;
    await db.delete(
      'task_items',
      where: 'owner_id = ? AND id = ?',
      whereArgs: [ownerId, itemId],
    );
  }

  Future<List<NoraNotification>> listNotifications(String ownerId) async {
    final db = await database;
    final rows = await db.query(
      'notifications',
      where: 'owner_id = ?',
      whereArgs: [ownerId],
      orderBy: 'created_at DESC',
      limit: 80,
    );
    return rows.map(NoraNotification.fromMap).toList();
  }

  Future<void> upsertNotification(NoraNotification notification) async {
    final db = await database;
    await db.insert(
      'notifications',
      notification.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> markAllNotificationsRead(String ownerId) async {
    final db = await database;
    await db.update(
      'notifications',
      {'read_at': DateTime.now().toIso8601String()},
      where: 'owner_id = ? AND read_at IS NULL',
      whereArgs: [ownerId],
    );
  }

  @override
  Future<void> seedUserDataIfEmpty(String ownerId) async {
    final db = await database;
    final plannerCount = Sqflite.firstIntValue(
          await db.rawQuery(
            'SELECT COUNT(*) FROM planner_items WHERE owner_id = ?',
            [ownerId],
          ),
        ) ??
        0;
    final taskCount = Sqflite.firstIntValue(
          await db.rawQuery(
            'SELECT COUNT(*) FROM task_items WHERE owner_id = ?',
            [ownerId],
          ),
        ) ??
        0;

    if (plannerCount > 0 || taskCount > 0) return;

    final now = DateTime.now();
    final today = noraDateKey(now);
    final tomorrow = noraDateKey(now.add(const Duration(days: 1)));
    final createdAt = now;

    final plannerItems = [
      PlannerItem(
        id: newLocalId('planner'),
        ownerId: ownerId,
        title: 'Revision del dia',
        date: today,
        startMinute: 8 * 60,
        endMinute: 9 * 60,
        kind: PlannerKind.event,
        category: 'Trabajo',
        status: TaskStatus.pending,
        priority: NoraPriority.medium,
        note: 'Alinear pendientes de Nora OS.',
        createdAt: createdAt,
        updatedAt: createdAt,
      ),
      PlannerItem(
        id: newLocalId('planner'),
        ownerId: ownerId,
        title: 'Bloque de foco Nora OS',
        date: today,
        startMinute: 9 * 60 + 30,
        endMinute: 11 * 60,
        kind: PlannerKind.focus,
        category: 'Diseno',
        status: TaskStatus.pending,
        priority: NoraPriority.high,
        note: 'Trabajo profundo sin ruido.',
        createdAt: createdAt,
        updatedAt: createdAt,
      ),
      PlannerItem(
        id: newLocalId('planner'),
        ownerId: ownerId,
        title: 'Cerrar pendientes clave',
        date: today,
        startMinute: 14 * 60,
        endMinute: 16 * 60,
        kind: PlannerKind.focus,
        category: 'Ejecucion',
        status: TaskStatus.pending,
        priority: NoraPriority.high,
        createdAt: createdAt,
        updatedAt: createdAt,
      ),
    ];

    final tasks = [
      TaskItem(
        id: newLocalId('task'),
        ownerId: ownerId,
        title: 'Priorizar tareas del dia',
        status: TaskStatus.pending,
        priority: NoraPriority.high,
        dueDate: today,
        note: 'Nora OS',
        createdAt: createdAt,
        updatedAt: createdAt,
      ),
      TaskItem(
        id: newLocalId('task'),
        ownerId: ownerId,
        title: 'Revisar bloque de foco',
        status: TaskStatus.inProgress,
        priority: NoraPriority.medium,
        dueDate: today,
        note: 'Trabajo',
        createdAt: createdAt,
        updatedAt: createdAt,
      ),
      TaskItem(
        id: newLocalId('task'),
        ownerId: ownerId,
        title: 'Actualizar documentacion de Nora OS',
        status: TaskStatus.pending,
        priority: NoraPriority.medium,
        dueDate: tomorrow,
        note: 'Nora OS',
        createdAt: createdAt,
        updatedAt: createdAt,
      ),
    ];

    final notifications = [
      NoraNotification(
        id: newLocalId('notice'),
        ownerId: ownerId,
        kind: NoraNotificationKind.mention,
        title: 'Nueva senal en Work',
        body: 'Revisa la tarea prioritaria del dia',
        createdAt: now.subtract(const Duration(hours: 1)),
        deepLink: '/tasks',
      ),
      NoraNotification(
        id: newLocalId('notice'),
        ownerId: ownerId,
        kind: NoraNotificationKind.task,
        title: 'Tarea completada',
        body: 'Priorizar tareas del dia',
        createdAt: now.subtract(const Duration(hours: 2)),
        readAt: now.subtract(const Duration(minutes: 40)),
      ),
      NoraNotification(
        id: newLocalId('notice'),
        ownerId: ownerId,
        kind: NoraNotificationKind.reminder,
        title: 'Recordatorio de foco',
        body: 'Bloque de foco sugerido a las 11:00',
        createdAt: now.subtract(const Duration(days: 1, hours: 2)),
      ),
    ];

    final batch = db.batch();
    for (final item in plannerItems) {
      batch.insert('planner_items', item.toMap());
    }
    for (final task in tasks) {
      batch.insert('task_items', task.toMap());
    }
    for (final notification in notifications) {
      batch.insert('notifications', notification.toMap());
    }
    await batch.commit(noResult: true);
  }
}

final noraLocalStore = NoraLocalStore.instance;
