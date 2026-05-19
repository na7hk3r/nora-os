import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/app/nora_mobile_app.dart';
import 'package:nora_mobile/core/models/nora_models.dart';
import 'package:nora_mobile/core/storage/local_store.dart';
import 'package:nora_mobile/features/auth/auth_repository.dart';
import 'package:nora_mobile/features/auth/auth_controller.dart';
import 'package:nora_mobile/features/auth/auth_screen.dart';
import 'package:nora_mobile/features/auth/session_store.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  testWidgets('first opening without users starts in register mode', (tester) async {
    await tester.pumpWidget(_authHarness(hasUsers: false));
    await tester.pumpAndSettle();

    expect(find.text('Crear cuenta'), findsWidgets);
    expect(find.text('Usuario'), findsOneWidget);
    expect(find.text('Pregunta de recuperacion (min 10 caracteres)'), findsOneWidget);
    expect(find.text('Primer arranque: crea tu cuenta local para entrar a Nora OS.'), findsOneWidget);
  });

  testWidgets('auth mode can switch between login register and recovery', (tester) async {
    await tester.pumpWidget(_authHarness(hasUsers: false));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Login'));
    await tester.pumpAndSettle();

    expect(find.text('Iniciar sesion'), findsOneWidget);
    expect(find.text('Pregunta de recuperacion (min 10 caracteres)'), findsNothing);

    await tester.tap(find.text('Registro'));
    await tester.pumpAndSettle();

    expect(find.text('Crear cuenta'), findsWidgets);
    expect(find.text('Pregunta de recuperacion (min 10 caracteres)'), findsOneWidget);

    await tester.tap(find.text('Recuperar'));
    await tester.pumpAndSettle();

    expect(find.text('Recuperar acceso'), findsOneWidget);
    expect(find.text('Ver pregunta secreta'), findsOneWidget);
  });

  testWidgets('invalid register form shows visible feedback', (tester) async {
    await tester.pumpWidget(_authHarness(hasUsers: false));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), 'na');
    await tester.enterText(find.byType(TextField).at(1), 'short');
    await tester.pumpAndSettle();

    expect(find.text('El usuario debe tener al menos 3 caracteres.'), findsOneWidget);
    final button = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Crear cuenta').last);
    expect(button.onPressed, isNull);
  });

  testWidgets('typing in auth with app router keeps field values', (tester) async {
    final repository = AuthRepository(
      store: FakeAuthLocalStore(hasUsers: false),
      sessionStore: FakeSessionStore(),
    );
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const NoraMobileApp(),
      ),
    );
    await tester.pumpAndSettle();

    container.read(authControllerProvider.notifier).setValidationError('Error temporal');
    await tester.pump();

    await tester.enterText(find.byType(TextField).at(0), 'natalia');
    await tester.pump();
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.pumpAndSettle();

    final username = tester.widget<TextField>(find.byType(TextField).at(0));
    final password = tester.widget<TextField>(find.byType(TextField).at(1));
    expect(username.controller?.text, 'natalia');
    expect(password.controller?.text, 'password123');
  });
}

Widget _authHarness({required bool hasUsers}) {
  final repository = AuthRepository(
    store: FakeAuthLocalStore(hasUsers: hasUsers),
    sessionStore: FakeSessionStore(),
  );

  return ProviderScope(
    overrides: [
      authRepositoryProvider.overrideWithValue(repository),
    ],
    child: const MaterialApp(home: AuthScreen()),
  );
}

class FakeSessionStore implements SessionStore {
  @override
  Future<void> clear() async {}

  @override
  Future<String?> readUserId() async => null;

  @override
  Future<void> writeUserId(String userId) async {}
}

class FakeAuthLocalStore implements AuthLocalStore {
  FakeAuthLocalStore({required this.hasUsers});

  final bool hasUsers;

  @override
  Future<Map<String, Object?>?> findUserCredentials(String username) async => null;

  @override
  Future<NoraUser?> findUserById(String id) async => null;

  @override
  Future<NoraUser?> findUserByUsername(String username) async => null;

  @override
  Future<bool> hasAnyUser() async => hasUsers;

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
  }) async {}

  @override
  Future<void> updatePassword({
    required String userId,
    required String passwordHash,
    required String salt,
  }) async {}

  @override
  Future<void> seedUserDataIfEmpty(String ownerId) async {}

  @override
  Future<void> touchLogin(String userId) async {}
}
