import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/core/events/nora_event.dart';
import 'package:nora_mobile/core/pulso/pulso_repository.dart';

void main() {
  test('experience is persisted as a Pulso snapshot and event log', () async {
    final store = FakePulsoStore();
    final repository = PulsoRepository(store);

    final snapshot = await repository.addExperience(
      ownerId: 'user-1',
      amount: 16,
      reason: 'Planner alta completada',
      source: 'planner',
      sourceEvent: 'MOBILE_PLANNER_ITEM_COMPLETED',
    );

    expect(snapshot.points, 16);
    expect(snapshot.level, 1);
    expect(snapshot.history, hasLength(1));
    expect(snapshot.history.single.reason, 'Planner alta completada');
    expect(store.settings[PulsoRepository.settingsKey], contains('"points":16'));
    expect(store.events.map((event) => event.eventType), [
      'MOBILE_PLANNER_ITEM_COMPLETED',
      'PULSO_XP_ADDED',
    ]);
  });

  test('stored visible level is never lowered by current xp', () async {
    final store = FakePulsoStore();
    final repository = PulsoRepository(store);
    await store.setSetting(
      'user-1',
      PulsoRepository.settingsKey,
      PulsoSnapshot(
        points: 120,
        level: 4,
        streak: 0,
        history: const [],
        updatedAt: DateTime.utc(2026, 5, 19),
      ).toJsonString(),
    );

    final snapshot = await repository.load('user-1');

    expect(snapshot.points, 120);
    expect(snapshot.level, 4);
  });
}

class FakePulsoStore implements PulsoLocalStore {
  final Map<String, String> settings = {};
  final List<NoraEventLogEntry> events = [];

  @override
  Future<String?> getSetting(String ownerId, String key) async => settings[key];

  @override
  Future<void> setSetting(String ownerId, String key, String value) async {
    settings[key] = value;
  }

  @override
  Future<void> logEvent({
    required String ownerId,
    required String eventType,
    required String source,
    required Map<String, Object?> payload,
  }) async {
    events.add(
      NoraEventLogEntry(
        id: events.length + 1,
        ownerId: ownerId,
        eventType: eventType,
        source: source,
        payload: payload,
        createdAt: DateTime.utc(2026, 5, 19, 12, events.length),
      ),
    );
  }

  @override
  Future<List<NoraEventLogEntry>> listRecentEvents(String ownerId, {int limit = 30}) async {
    return events.take(limit).toList();
  }
}
