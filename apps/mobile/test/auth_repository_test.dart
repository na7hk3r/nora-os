import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/core/models/nora_models.dart';
import 'package:nora_mobile/core/storage/local_store.dart';
import 'package:nora_mobile/features/auth/auth_repository.dart';
import 'package:nora_mobile/features/auth/session_store.dart';

void main() {
  test('valid user is created, persisted in session, and restored', () async {
    final store = FakeAuthLocalStore();
    final session = FakeSessionStore();
    final repository = AuthRepository(store: store, sessionStore: session);

    final user = await repository.register(
      username: 'natalia',
      password: 'password123',
      recoveryQuestion: 'Cual es tu proyecto favorito?',
      recoveryAnswer: 'Nora',
    );
    final restored = await repository.restoreSession();

    expect(user.username, 'natalia');
    expect(restored?.id, user.id);
    expect(store.seededOwners, contains(user.id));
  });

  test('duplicate user returns a visible auth error', () async {
    final store = FakeAuthLocalStore();
    final repository = AuthRepository(store: store, sessionStore: FakeSessionStore());

    await repository.register(
      username: 'natalia',
      password: 'password123',
      recoveryQuestion: 'Cual es tu proyecto favorito?',
      recoveryAnswer: 'Nora',
    );

    expect(
      () => repository.register(
        username: 'natalia',
        password: 'password123',
        recoveryQuestion: 'Cual es tu proyecto favorito?',
        recoveryAnswer: 'Nora',
      ),
      throwsA(
        isA<AuthException>()
            .having((error) => error.code, 'code', AuthErrorCode.duplicateUser)
            .having((error) => error.message, 'message', 'Ese usuario ya existe.'),
      ),
    );
  });

  test('short password fails before touching storage', () async {
    final store = FakeAuthLocalStore();
    final repository = AuthRepository(store: store, sessionStore: FakeSessionStore());

    expect(
      () => repository.register(
        username: 'natalia',
        password: 'short',
        recoveryQuestion: 'Cual es tu proyecto favorito?',
        recoveryAnswer: 'Nora',
      ),
      throwsA(isA<AuthException>().having(
        (error) => error.code,
        'code',
        AuthErrorCode.validation,
      )),
    );
    expect(store.findUserByUsernameCalls, 0);
  });

  test('recovery question is stored and can reset the password', () async {
    final store = FakeAuthLocalStore();
    final session = FakeSessionStore();
    final repository = AuthRepository(store: store, sessionStore: session);

    await repository.register(
      username: 'natalia',
      password: 'password123',
      recoveryQuestion: 'Cual es tu proyecto favorito?',
      recoveryAnswer: 'Nora',
    );

    expect(
      await repository.getRecoveryQuestion('natalia'),
      'Cual es tu proyecto favorito?',
    );

    await repository.resetPasswordWithRecovery(
      username: 'natalia',
      recoveryAnswer: 'nora',
      newPassword: 'newpassword123',
    );

    expect(session.userId, isNull);
    expect(
      () => repository.login(username: 'natalia', password: 'password123'),
      throwsA(isA<AuthException>().having(
        (error) => error.code,
        'code',
        AuthErrorCode.invalidCredentials,
      )),
    );

    final user = await repository.login(username: 'natalia', password: 'newpassword123');
    expect(user.username, 'natalia');
  });

  test('legacy users without recovery can still login', () async {
    final store = FakeAuthLocalStore();
    final repository = AuthRepository(store: store, sessionStore: FakeSessionStore());

    final user = await repository.register(
      username: 'natalia',
      password: 'password123',
      recoveryQuestion: 'Cual es tu proyecto favorito?',
      recoveryAnswer: 'Nora',
    );
    store.rowsById[user.id]?.remove('recovery_question');
    store.rowsById[user.id]?.remove('recovery_answer_hash');
    store.rowsById[user.id]?.remove('recovery_salt');

    final loggedIn = await repository.login(username: 'natalia', password: 'password123');
    expect(loggedIn.id, user.id);
  });
}

class FakeSessionStore implements SessionStore {
  String? userId;

  @override
  Future<void> clear() async {
    userId = null;
  }

  @override
  Future<String?> readUserId() async => userId;

  @override
  Future<void> writeUserId(String userId) async {
    this.userId = userId;
  }
}

class FakeAuthLocalStore implements AuthLocalStore {
  final Map<String, Map<String, Object?>> rowsById = {};
  final Set<String> seededOwners = {};
  int findUserByUsernameCalls = 0;

  @override
  Future<Map<String, Object?>?> findUserCredentials(String username) async {
    for (final row in rowsById.values) {
      if (row['username'] == username) return row;
    }
    return null;
  }

  @override
  Future<NoraUser?> findUserById(String id) async {
    final row = rowsById[id];
    return row == null ? null : NoraUser.fromMap(row);
  }

  @override
  Future<NoraUser?> findUserByUsername(String username) async {
    findUserByUsernameCalls++;
    final row = await findUserCredentials(username);
    return row == null ? null : NoraUser.fromMap(row);
  }

  @override
  Future<bool> hasAnyUser() async => rowsById.isNotEmpty;

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
  }) async {
    rowsById[id] = {
      'id': id,
      'username': username,
      'display_name': displayName,
      'password_hash': passwordHash,
      'salt': salt,
      'recovery_question': recoveryQuestion,
      'recovery_answer_hash': recoveryAnswerHash,
      'recovery_salt': recoverySalt,
      'created_at': DateTime.utc(2026, 5, 19).toIso8601String(),
      'last_login_at': DateTime.utc(2026, 5, 19).toIso8601String(),
    };
  }

  @override
  Future<void> updatePassword({
    required String userId,
    required String passwordHash,
    required String salt,
  }) async {
    final row = rowsById[userId];
    if (row == null) return;
    row['password_hash'] = passwordHash;
    row['salt'] = salt;
    row['last_login_at'] = DateTime.utc(2026, 5, 19).toIso8601String();
  }

  @override
  Future<void> seedUserDataIfEmpty(String ownerId) async {
    seededOwners.add(ownerId);
  }

  @override
  Future<void> touchLogin(String userId) async {}
}
