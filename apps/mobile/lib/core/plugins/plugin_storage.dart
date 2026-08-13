import '../storage/local_store.dart';
import 'plugin_manifest.dart';

/// Bridge de storage entregado a los plugins vía [CoreAPI]
/// (`query` / `execute` / `migrate` / `logEvent`):
///   - la DB ya soporta múltiples usuarios locales, así que toda tabla de
///     plugin creada por migración incluye `owner_id` y este bridge scopea
///     settings y eventos por el owner actual;
///   - las migraciones se trackean por (plugin_id, version) en la tabla
///     `plugin_migrations`;
///   - las settings quedan namespaced por plugin:
///     `mobile:plugins:<pluginId>:<key>`.
class PluginStorage {
  PluginStorage({
    required NoraLocalStore store,
    required String pluginId,
    required String? Function() ownerId,
  })  : _store = store,
        _pluginId = pluginId,
        _ownerId = ownerId;

  final NoraLocalStore _store;
  final String _pluginId;
  final String? Function() _ownerId;

  /// Ejecuta las migraciones pendientes de [manifest] dentro de una
  /// transacción y las registra en `plugin_migrations`. Idempotente.
  Future<void> migrate(PluginManifest manifest) async {
    final migrations = manifest.migrations;
    if (migrations.isEmpty) return;
    final db = await _store.database;
    await db.transaction((txn) async {
      for (final migration in migrations) {
        final applied = await txn.query(
          'plugin_migrations',
          columns: ['version'],
          where: 'plugin_id = ? AND version = ?',
          whereArgs: [_pluginId, migration.version],
          limit: 1,
        );
        if (applied.isNotEmpty) continue;
        await txn.execute(migration.up);
        await txn.insert('plugin_migrations', {
          'plugin_id': _pluginId,
          'version': migration.version,
          'applied_at': DateTime.now().toIso8601String(),
        });
      }
    });
  }

  /// SELECT crudo. Los plugins deben filtrar por `owner_id = api.ownerId`,
  /// mismo contrato que el resto de tablas de Mobile.
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> parameters = const [],
  ]) async {
    final db = await _store.database;
    return db.rawQuery(sql, parameters);
  }

  /// INSERT/UPDATE/DELETE crudo. Devuelve la cantidad de filas afectadas.
  Future<int> execute(String sql, [List<Object?> parameters = const []]) async {
    final db = await _store.database;
    return db.rawUpdate(sql, parameters);
  }

  Future<String?> getSetting(String key) async {
    final owner = _ownerId();
    if (owner == null) return null;
    return _store.getSetting(owner, _settingsKey(key));
  }

  Future<void> setSetting(String key, String value) async {
    final owner = _ownerId();
    if (owner == null) return;
    await _store.setSetting(owner, _settingsKey(key), value);
  }

  /// Clave de settings agnóstica al plugin (para el core, ej. activePlugins).
  static String coreKey(String key) => 'mobile:plugins:$key';

  String _settingsKey(String key) => 'mobile:plugins:$_pluginId:$key';

  Future<void> logEvent(
      String event, String source, Map<String, Object?> payload) async {
    final owner = _ownerId();
    if (owner == null) return;
    await _store.logEvent(
      ownerId: owner,
      eventType: event,
      source: source,
      payload: payload,
    );
  }
}
