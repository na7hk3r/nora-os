import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/core/plugins/plugin_event_bus.dart';
import 'package:nora_mobile/core/plugins/plugin_storage.dart';
import 'package:nora_mobile/core/storage/local_store.dart';
import 'package:nora_mobile/plugins/habits/habits_controller.dart';
import 'package:nora_mobile/plugins/habits/habits_events.dart';
import 'package:nora_mobile/plugins/habits/habits_repository.dart';

void main() {
  test('deleteHabit emite el evento de borrado, no un archivado disfrazado',
      () async {
    final controller = HabitsController(
      HabitRepository(_NoopStorage()),
      'user-1',
    );
    await controller.load();

    final archivedEvents = <Object?>[];
    final deletedEvents = <Object?>[];
    addTearDown(
        NoraEventBus.instance.on(HabitsEvents.archived, archivedEvents.add));
    addTearDown(
        NoraEventBus.instance.on(HabitsEvents.deleted, deletedEvents.add));

    await controller.deleteHabit('hbt-1');

    expect(deletedEvents, hasLength(1),
        reason: 'borrar un hábito debe emitir HABITS_HABIT_DELETED');
    expect((deletedEvents.single as Map)['id'], 'hbt-1');
    expect(
      archivedEvents.where((p) => (p as Map)['deleted'] == true),
      isEmpty,
      reason: 'deleteHabit no debe mentir emitiendo archived {deleted: true}',
    );
    expect(controller.state.valueOrNull?.definitions, isEmpty);
  });
}

/// [PluginStorage] concreto sin DB: sobreescribe query/execute para no tocar
/// sqflite (NoraLocalStore es singleton que abre archivo).
class _NoopStorage extends PluginStorage {
  _NoopStorage()
      : super(
          store: noraLocalStore,
          pluginId: 'habits-test',
          ownerId: () => 'user-1',
        );

  @override
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> parameters = const [],
  ]) async {
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