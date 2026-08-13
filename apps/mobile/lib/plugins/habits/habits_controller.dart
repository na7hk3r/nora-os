import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/nora_models.dart' show newLocalId, noraDateKey;
import '../../core/plugins/plugin_event_bus.dart';
import '../../core/plugins/plugin_storage.dart';
import '../../core/plugins/plugin_storage_provider.dart';
import '../../features/auth/auth_controller.dart';
import 'habits_events.dart';
import 'habits_models.dart';
import 'habits_repository.dart';
import 'habits_utils.dart';

class HabitsState {
  const HabitsState({this.definitions = const [], this.logs = const []});

  final List<HabitDefinition> definitions;
  final List<HabitLog> logs;

  HabitDefinition? byId(String id) {
    for (final definition in definitions) {
      if (definition.id == id) return definition;
    }
    return null;
  }

  List<HabitLog> logsFor(String habitId) {
    return logs.where((log) => log.habitId == habitId).toList();
  }
}

final habitsControllerProvider =
    StateNotifierProvider<HabitsController, AsyncValue<HabitsState>>((ref) {
  final ownerId = ref.watch(authControllerProvider).user?.id;
  final storage = ref.watch<PluginStorage>(pluginStorageProvider('habits'));
  return HabitsController(HabitRepository(storage), ownerId)..load();
});

/// Controller del plugin Hábitos. Persiste vía repo, actualiza el estado y
/// emite eventos (persist=true) para que los listeners del init (XP +
/// métricas) reaccionen.
class HabitsController extends StateNotifier<AsyncValue<HabitsState>> {
  HabitsController(this._repository, this._ownerId)
      : super(const AsyncValue.loading());

  final HabitRepository _repository;
  final String? _ownerId;

  Future<void> load() async {
    final ownerId = _ownerId;
    if (ownerId == null) {
      state = const AsyncValue.data(HabitsState());
      return;
    }
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final definitions = await _repository.listDefinitions(ownerId);
      final logs = await _repository.listLogs(ownerId);
      return HabitsState(definitions: definitions, logs: logs);
    });
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  Future<HabitDefinition?> createHabit({
    required String name,
    HabitKind kind = HabitKind.positive,
    HabitPeriod period = HabitPeriod.daily,
    int target = 1,
    String? icon,
    String? color,
  }) async {
    final ownerId = _ownerId;
    final cleanName = name.trim();
    if (ownerId == null || cleanName.isEmpty) return null;
    final habit = HabitDefinition(
      id: newLocalId('hbt'),
      ownerId: ownerId,
      name: cleanName,
      icon: icon,
      color: color,
      kind: kind,
      period: period,
      target: target < 1 ? 1 : target,
      archived: false,
      createdAt: DateTime.now(),
    );
    await _repository.saveDefinition(habit);
    final current = state.valueOrNull ?? const HabitsState();
    state = AsyncValue.data(
      HabitsState(
          definitions: [...current.definitions, habit], logs: current.logs),
    );
    _emit(HabitsEvents.created, {'id': habit.id, 'name': habit.name});
    return habit;
  }

  Future<void> updateHabit(
    String id, {
    String? name,
    HabitKind? kind,
    HabitPeriod? period,
    int? target,
    String? icon,
    String? color,
  }) async {
    final current = state.valueOrNull;
    final existing = current?.byId(id);
    if (current == null || existing == null) return;
    final updated = existing.copyWith(
      name: name?.trim().isEmpty ?? true ? existing.name : name?.trim(),
      kind: kind,
      period: period,
      target: target != null && target < 1 ? 1 : target,
      icon: icon,
      color: color,
    );
    await _repository.saveDefinition(updated);
    state = AsyncValue.data(
      HabitsState(
        definitions: [
          for (final definition in current.definitions)
            if (definition.id == id) updated else definition,
        ],
        logs: current.logs,
      ),
    );
    _emit(HabitsEvents.updated, {'id': id});
  }

  Future<void> archiveHabit(String id, {bool archived = true}) async {
    final current = state.valueOrNull;
    final existing = current?.byId(id);
    if (current == null || existing == null) return;
    final updated = existing.copyWith(archived: archived);
    await _repository.saveDefinition(updated);
    state = AsyncValue.data(
      HabitsState(
        definitions: [
          for (final definition in current.definitions)
            if (definition.id == id) updated else definition,
        ],
        logs: current.logs,
      ),
    );
    _emit(HabitsEvents.archived, {'id': id, 'archived': archived});
  }

  Future<void> deleteHabit(String id) async {
    final ownerId = _ownerId;
    final current = state.valueOrNull;
    if (ownerId == null || current == null) return;
    await _repository.deleteLogsForHabit(id);
    await _repository.deleteDefinition(id);
    state = AsyncValue.data(
      HabitsState(
        definitions: current.definitions.where((d) => d.id != id).toList(),
        logs: current.logs.where((log) => log.habitId != id).toList(),
      ),
    );
    _emit(HabitsEvents.archived, {'id': id, 'deleted': true});
  }

  // ─── Logs ────────────────────────────────────────────────────────────────

  Future<void> logHabit(
    String habitId, {
    String? date,
    int count = 1,
    String? note,
  }) async {
    final current = state.valueOrNull;
    final habit = current?.byId(habitId);
    final ownerId = _ownerId;
    if (current == null || habit == null || ownerId == null) return;

    final dateKey = date ?? noraDateKey(DateTime.now());
    final increment = count < 1 ? 1 : count;
    final existing = current.logs
        .where((log) => log.habitId == habitId && log.date == dateKey)
        .toList();

    HabitLog log;
    if (existing.isNotEmpty) {
      log = existing.first
          .copyWith(count: existing.first.count + increment, note: note);
      await _repository.saveLog(log);
    } else {
      log = HabitLog(
        id: newLocalId('hlg'),
        ownerId: ownerId,
        habitId: habitId,
        date: dateKey,
        count: increment,
        note: note,
        createdAt: DateTime.now(),
      );
      await _repository.saveLog(log);
    }

    state = AsyncValue.data(
      HabitsState(
        definitions: current.definitions,
        logs: [...current.logs.where((l) => l.id != log.id), log],
      ),
    );
    _emit(HabitsEvents.logged,
        {'habitId': habitId, 'date': dateKey, 'count': log.count});

    // Detectar goal_met para gamificación: emitido solo cuando el conteo
    // alcanza el target en este período (mismo criterio que Desktop).
    final allLogs = state.valueOrNull?.logsFor(habitId) ?? const [];
    final stats = computeHabitStats(habit, allLogs);
    if (stats.completedThisPeriod &&
        stats.countThisPeriod - increment < habit.target) {
      _emit(
        HabitsEvents.goalMet,
        {'habitId': habitId, 'name': habit.name, 'streak': stats.streak},
      );
    }
  }

  Future<void> unlogHabit(String logId) async {
    final current = state.valueOrNull;
    final log = current?.logs.where((l) => l.id == logId).toList();
    if (current == null || log == null || log.isEmpty) return;
    await _repository.deleteLog(logId);
    state = AsyncValue.data(
      HabitsState(
        definitions: current.definitions,
        logs: current.logs.where((l) => l.id != logId).toList(),
      ),
    );
    _emit(HabitsEvents.unlogged,
        {'habitId': log.first.habitId, 'date': log.first.date});
  }

  /// Si hay log hoy, lo borra; si no, crea uno con count=1.
  Future<void> toggleToday(String habitId) async {
    final current = state.valueOrNull;
    final today = noraDateKey(DateTime.now());
    final existing = current?.logs
        .where((log) => log.habitId == habitId && log.date == today)
        .toList();
    if (existing == null) return;
    if (existing.isNotEmpty) {
      await unlogHabit(existing.first.id);
    } else {
      await logHabit(habitId, date: today, count: 1);
    }
  }

  void _emit(String event, Map<String, Object?> payload) {
    NoraEventBus.instance.emit(event, payload, source: 'habits');
  }
}
