import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/app/router/nora_shell.dart';
import 'package:nora_mobile/core/models/nora_models.dart';
import 'package:nora_mobile/core/pulso/pulso_controller.dart';
import 'package:nora_mobile/core/pulso/pulso_repository.dart';
import 'package:nora_mobile/core/storage/local_store.dart';
import 'package:nora_mobile/features/auth/auth_repository.dart';
import 'package:nora_mobile/features/auth/session_store.dart';
import 'package:nora_mobile/features/dashboard/dashboard_screen.dart';
import 'package:nora_mobile/features/notifications/notifications_repository.dart';
import 'package:nora_mobile/features/planner/planner_repository.dart';
import 'package:nora_mobile/features/tasks/tasks_repository.dart';

void main() {
  testWidgets('dashboard root shows companion subtitle and removes duplicate body copy', (tester) async {
    final repository = AuthRepository(
      store: _FakeAuthLocalStore(
        user: NoraUser(
          id: 'user-1',
          username: 'nora',
          displayName: 'Nombre muy largo que debe truncarse con ellipsis',
          createdAt: DateTime(2025, 1, 1),
        ),
      ),
      sessionStore: _FakeSessionStore(userId: 'user-1'),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          plannerRepositoryProvider.overrideWithValue(_FakePlannerRepository()),
          tasksRepositoryProvider.overrideWithValue(_FakeTasksRepository()),
          notificationsRepositoryProvider.overrideWithValue(_FakeNotificationsRepository()),
          pulsoRepositoryProvider.overrideWithValue(_FakePulsoRepository()),
          sessionStoreProvider.overrideWithValue(_FakeSessionStore(userId: 'user-1')),
        ],
        child: const MaterialApp(
          home: NoraShell(
            location: '/',
            child: DashboardScreen(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Tu sistema. Tu vida. Una sola IA.'), findsOneWidget);
    expect(find.text('Lo importante de tu dia'), findsNothing);
    expect(find.text('Hola, Nombre muy largo que debe truncarse con ellipsis'), findsOneWidget);

    final greeting = tester.widget<Text>(find.text('Hola, Nombre muy largo que debe truncarse con ellipsis'));
    expect(greeting.maxLines, equals(1));
    expect(greeting.overflow, equals(TextOverflow.ellipsis));
  });
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
  _FakeAuthLocalStore({this.user});

  final NoraUser? user;

  @override
  Future<Map<String, Object?>?> findUserCredentials(String username) async => null;

  @override
  Future<NoraUser?> findUserById(String id) async => user?.id == id ? user : null;

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

class _FakePlannerRepository implements PlannerRepository {
  @override
  Future<void> delete(String ownerId, String itemId) async {}

  @override
  Future<List<PlannerItem>> list(String ownerId) async => [];

  @override
  Future<void> save(PlannerItem item) async {}
}

class _FakeTasksRepository implements TasksRepository {
  @override
  Future<void> delete(String ownerId, String itemId) async {}

  @override
  Future<List<TaskItem>> list(String ownerId) async => [];

  @override
  Future<void> save(TaskItem item) async {}
}

class _FakeNotificationsRepository implements NotificationsRepository {
  @override
  Future<List<NoraNotification>> list(String ownerId) async => [];

  @override
  Future<void> markAllRead(String ownerId) async {}

  @override
  Future<void> save(NoraNotification notification) async {}
}

class _FakePulsoRepository implements PulsoRepository {
  @override
  Future<PulsoSnapshot> load(String ownerId) async => PulsoSnapshot.empty();

  @override
  Future<PulsoSnapshot> addExperience({
    required String ownerId,
    required int amount,
    required String reason,
    required String source,
    required String sourceEvent,
  }) async {
    return PulsoSnapshot.empty();
  }
}
