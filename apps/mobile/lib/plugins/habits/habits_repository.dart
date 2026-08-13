import '../../core/plugins/plugin_storage.dart';
import 'habits_models.dart';

/// Repositorio del plugin Hábitos sobre [PluginStorage] (mismo bridge que
/// `api.storage`). Todo filtrado por `owner_id` — contrato de Mobile.
class HabitRepository {
  HabitRepository(this._storage);

  final PluginStorage _storage;

  Future<List<HabitDefinition>> listDefinitions(String ownerId) async {
    final rows = await _storage.query(
      'SELECT * FROM habits_definitions WHERE owner_id = ? ORDER BY created_at ASC',
      [ownerId],
    );
    return rows.map(HabitDefinition.fromRow).toList();
  }

  Future<void> saveDefinition(HabitDefinition definition) async {
    await _storage.execute(
      '''INSERT OR REPLACE INTO habits_definitions
         (id, owner_id, name, icon, color, kind, period, target, archived, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
      [
        definition.id,
        definition.ownerId,
        definition.name,
        definition.icon,
        definition.color,
        definition.kind.name,
        definition.period.name,
        definition.target,
        definition.archived ? 1 : 0,
        definition.createdAt.toIso8601String(),
      ],
    );
  }

  Future<void> deleteDefinition(String id) async {
    await _storage.execute('DELETE FROM habits_definitions WHERE id = ?', [id]);
  }

  Future<List<HabitLog>> listLogs(String ownerId) async {
    final rows = await _storage.query(
      'SELECT * FROM habits_logs WHERE owner_id = ? ORDER BY date ASC',
      [ownerId],
    );
    return rows.map(HabitLog.fromRow).toList();
  }

  Future<void> saveLog(HabitLog log) async {
    await _storage.execute(
      '''INSERT OR REPLACE INTO habits_logs
         (id, owner_id, habit_id, date, count, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)''',
      [
        log.id,
        log.ownerId,
        log.habitId,
        log.date,
        log.count,
        log.note,
        log.createdAt.toIso8601String(),
      ],
    );
  }

  Future<void> deleteLog(String id) async {
    await _storage.execute('DELETE FROM habits_logs WHERE id = ?', [id]);
  }

  Future<void> deleteLogsForHabit(String habitId) async {
    await _storage
        .execute('DELETE FROM habits_logs WHERE habit_id = ?', [habitId]);
  }
}
