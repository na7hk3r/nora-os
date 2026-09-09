import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/core/events/nora_event.dart';
import 'package:nora_mobile/core/plugins/plugin_manager.dart';
import 'package:nora_mobile/core/pulso/pulso_repository.dart';

void main() {
  test('addExperience de un plugin emite PULSO_XP_ADDED en el bus compartido',
      () async {
    PluginManager.instance.setCurrentOwner('user-1');
    addTearDown(() => PluginManager.instance.setCurrentOwner(null));

    final emitted = <Object?>[];
    final unsubscribe = PluginManager.instance.eventBus
        .on(PulsoRepository.xpAddedEvent, emitted.add);
    addTearDown(unsubscribe);

    final api = PluginManager.instance.buildCoreApi(
      'habits',
      pulsoRepository: _FakePulsoRepository(_FakePulsoStore()),
    );

    await api.pulso.addExperience(
      10,
      reason: 'Hábito registrado',
      source: 'habits',
      sourceEvent: 'MOBILE_HABIT_LOGGED',
    );

    expect(emitted, hasLength(1),
        reason: 'la XP otorgada por un plugin debe notificar al bus para que '
            'el dashboard refresque Pulso');
    final payload = emitted.single as Map;
    expect(payload['amount'], 10);
    expect(payload['reason'], 'Hábito registrado');
  });
}

class _FakePulsoStore implements PulsoLocalStore {
  final Map<String, String> settings = {};

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
  }) async {}

  @override
  Future<List<NoraEventLogEntry>> listRecentEvents(String ownerId,
      {int limit = 30}) async {
    return const [];
  }
}

/// [PulsoRepository] concreto respaldado por un store en memoria: el closure
/// del manager solo necesita un repositorio cuyo `addExperience` no toque
/// sqflite en host.
class _FakePulsoRepository extends PulsoRepository {
  _FakePulsoRepository(this.store) : super(store);

  final _FakePulsoStore store;
}