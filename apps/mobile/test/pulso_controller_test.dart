import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/core/events/nora_event.dart';
import 'package:nora_mobile/core/models/nora_models.dart';
import 'package:nora_mobile/core/plugins/plugin_event_bus.dart';
import 'package:nora_mobile/core/pulso/pulso_controller.dart';
import 'package:nora_mobile/core/pulso/pulso_repository.dart';
import 'package:nora_mobile/core/storage/local_store.dart';
import 'package:nora_mobile/features/auth/auth_controller.dart';
import 'package:nora_mobile/features/auth/auth_repository.dart';
import 'package:nora_mobile/features/auth/session_store.dart';

void main() {
  test('PULSO_XP_ADDED en el bus recarga el estado de Pulso en la UI',
      () async {
    final store = _MutablePulsoStore(points: 10);
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(
          AuthRepository(
            store: _FakeAuthLocalStore(
              user: NoraUser(
                id: 'user-1',
                username: 'nora',
                displayName: 'Nora',
                createdAt: DateTime(2026, 1, 1),
              ),
            ),
            sessionStore: _FakeSessionStore(userId: 'user-1'),
          ),
        ),
        sessionStoreProvider.overrideWithValue(
          _FakeSessionStore(userId: 'user-1'),
        ),
        pulsoRepositoryProvider.overrideWithValue(PulsoRepository(store)),
      ],
    );
    addTearDown(container.dispose);

    // Espera el restore de sesión y el load inicial de Pulso.
    await _waitUntil(() => !container.read(authControllerProvider).checking);
    container.read(pulsoControllerProvider.notifier);
    await _waitUntil(
      () => (container.read(pulsoControllerProvider).valueOrNull?.points ??
              -1) ==
          10,
    );

    // Un plugin otorga XP: el bus debe disparar el reload del controller.
    store.points = 99;
    NoraEventBus.instance.emit(
      PulsoRepository.xpAddedEvent,
      {'amount': 89, 'reason': 'Hábito registrado'},
      persist: false,
    );

    await _waitUntil(
      () => (container.read(pulsoControllerProvider).valueOrNull?.points ??
              -1) ==
          99,
      reason: 'el bus PULSO_XP_ADDED debe recargar el estado de Pulso',
    );
  });
}

Future<void> _waitUntil(
  bool Function() condition, {
  String? reason,
  int maxTries = 200,
}) async {
  for (var i = 0; i < maxTries; i++) {
    if (condition()) return;
    await Future<void>.delayed(const Duration(milliseconds: 5));
  }
  fail(reason ?? 'la condición no se cumplió a tiempo');
}

class _MutablePulsoStore implements PulsoLocalStore {
  _MutablePulsoStore({required this.points});

  int points;
  int? visibleLevel;
  final List<String> loggedEvents = [];

  String get settingsKey => PulsoRepository.settingsKey;

  @override
  Future<String?> getSetting(String ownerId, String key) async {
    if (key != settingsKey) return null;
    return PulsoSnapshot(
      points: points,
      level: visibleLevel ?? 1,
      streak: 0,
      history: const [],
      updatedAt: DateTime.utc(2026, 1, 1),
    ).toJsonString();
  }

  @override
  Future<void> setSetting(String ownerId, String key, String value) async {}

  @override
  Future<void> logEvent({
    required String ownerId,
    required String eventType,
    required String source,
    required Map<String, Object?> payload,
  }) async {
    loggedEvents.add(eventType);
  }

  @override
  Future<List<NoraEventLogEntry>> listRecentEvents(String ownerId,
      {int limit = 30}) async {
    return const [];
  }
}

class _FakeSessionStore implements SessionStore {
  _FakeSessionStore({required this.userId});

  final String? userId;

  @override
  Future<void> clear() async {}

  @override
  Future<String?> readUserId() async => userId;

  @override
  Future<void> writeUserId(String userId) async {}
}

class _FakeAuthLocalStore implements AuthLocalStore {
  _FakeAuthLocalStore({required this.user});

  final NoraUser? user;

  @override
  Future<Map<String, Object?>?> findUserCredentials(String username) async =>
      null;

  @override
  Future<NoraUser?> findUserById(String id) async =>
      user?.id == id ? user : null;

  @override
  Future<NoraUser?> findUserByUsername(String username) async =>
      user?.username == username ? user : null;

  @override
  Future<bool> hasAnyUser() async => user != null;

  @override
  Future<void> insertUser({
    required String id,
    required String username,
    required String displayName,
    required String passwordHash,
    required String salt,
    required String passwordVersion,
    String? recoveryQuestion,
    String? recoveryAnswerHash,
    String? recoverySalt,
  }) async {}

  @override
  Future<void> updatePassword({
    required String userId,
    required String passwordHash,
    required String salt,
    required String passwordVersion,
  }) async {}

  @override
  Future<void> seedUserDataIfEmpty(String ownerId) async {}

  @override
  Future<void> touchLogin(String userId) async {}
}