import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/core/models/nora_models.dart' show noraDateKey;
import 'package:nora_mobile/core/plugins/core_api.dart';
import 'package:nora_mobile/core/plugins/plugin_event_bus.dart';
import 'package:nora_mobile/core/plugins/plugin_metrics.dart';
import 'package:nora_mobile/core/plugins/plugin_storage.dart';
import 'package:nora_mobile/core/storage/local_store.dart';
import 'package:nora_mobile/plugins/habits/habits_events.dart';
import 'package:nora_mobile/plugins/habits/habits_index.dart';
import 'package:nora_mobile/plugins/habits/habits_models.dart';

void main() {
  test('archivar o borrar un hábito refresca las métricas publicadas',
      () async {
    final storage = _MetricsStorage();
    final metrics = <String, Object?>{};
    var publishCalls = 0;
    final bus = NoraEventBus.instance;

    final api = CoreAPI(
      pluginId: 'habits',
      storage: storage,
      events: CoreEventsApi(
        emit: (event, payload, {source, persist = true}) => bus.emit(
          event,
          payload as Object,
          source: source,
          persist: persist,
        ),
        on: bus.on,
        off: bus.off,
      ),
      metrics: CoreMetricsApi(
        publish: (name, value, {unit, domain}) {
          publishCalls++;
          metrics[name] = value;
        },
        get: (name) => metrics[name],
        list: () => metrics.entries
            .map((entry) => MetricValue(
                name: entry.key, value: entry.value as Object))
            .toList(),
      ),
      pulso: CorePulsoApi(
        addExperience: (amount,
            {required reason, required source, required sourceEvent}) async {},
      ),
      getOwnerId: () => 'user-1',
    );

    await habitsPlugin.init?.call(api);
    expect(metrics['habits.top_streak'], 2,
        reason: 'dos días seguidos logueados => racha 2 al iniciar');
    expect(publishCalls, 2);

    // El hábito se archiva: el evento debe republicar métricas con racha 0.
    storage.archiveHabit();
    bus.emit(HabitsEvents.archived, {'id': 'hbt-1', 'archived': true});
    await _waitFor(() => metrics['habits.top_streak'] == 0,
        reason: 'archivar debe refrescar métricas (HABITS_HABIT_ARCHIVED)');
    expect(metrics['habits.completion_rate_30d'], 0);

    // El hábito se borra: el evento de borrado también debe republicar.
    storage.removeHabit();
    bus.emit(HabitsEvents.deleted, {'id': 'hbt-1'});
    await _waitFor(() => publishCalls == 6,
        reason: 'borrar debe refrescar métricas (HABITS_HABIT_DELETED)');
    expect(metrics['habits.top_streak'], 0);
    expect(metrics['habits.completion_rate_30d'], 0);
    expect(publishCalls, 6,
        reason: 'init(2) + archivado(2) + borrado(2) republicaciones');
  });
}

Future<void> _waitFor(bool Function() condition,
    {required String reason}) async {
  for (var i = 0; i < 200; i++) {
    if (condition()) return;
    await Future<void>.delayed(const Duration(milliseconds: 5));
  }
  fail(reason);
}

class _MetricsStorage extends PluginStorage {
  _MetricsStorage()
      : super(
          store: noraLocalStore,
          pluginId: 'habits-test',
          ownerId: () => 'user-1',
        );

  bool archived = false;
  bool removed = false;

  void archiveHabit() => archived = true;
  void removeHabit() => removed = true;

  @override
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> parameters = const [],
  ]) async {
    if (sql.contains('habits_definitions')) {
      if (removed) return const [];
      return [
        HabitDefinition(
          id: 'hbt-1',
          ownerId: 'user-1',
          name: 'Meditar',
          icon: null,
          color: null,
          kind: HabitKind.positive,
          period: HabitPeriod.daily,
          target: 1,
          archived: archived,
          createdAt: DateTime(2026, 1, 1),
        ).toRow(),
      ];
    }
    if (sql.contains('habits_logs')) {
      final now = DateTime.now();
      final yesterday = now.subtract(const Duration(days: 1));
      final todayKey = noraDateKey(now);
      final yesterdayKey = noraDateKey(yesterday);
      return [
        HabitLog(
          id: 'hlg-1',
          ownerId: 'user-1',
          habitId: 'hbt-1',
          date: todayKey,
          count: 1,
          note: null,
          createdAt: now,
        ).toRow(),
        HabitLog(
          id: 'hlg-2',
          ownerId: 'user-1',
          habitId: 'hbt-1',
          date: yesterdayKey,
          count: 1,
          note: null,
          createdAt: yesterday,
        ).toRow(),
      ];
    }
    return const [];
  }

  @override
  Future<int> execute(
    String sql, [
    List<Object?> parameters = const [],
  ]) async {
    return 1;
  }
}