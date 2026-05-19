import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sqflite/sqflite.dart';

import '../../core/models/nora_models.dart';
import '../../core/storage/local_store.dart';
import 'session_store.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    store: noraLocalStore,
    sessionStore: ref.watch(sessionStoreProvider),
  );
});

class AuthRepository {
  AuthRepository({
    required this.store,
    required this.sessionStore,
    Random? random,
  }) : _random = random ?? Random.secure();

  final AuthLocalStore store;
  final SessionStore sessionStore;
  final Random _random;

  Future<NoraUser?> restoreSession() async {
    try {
      final userId = await sessionStore.readUserId();
      if (userId == null || userId.isEmpty) return null;
      final user = await store.findUserById(userId);
      if (user == null) {
        await sessionStore.clear();
        return null;
      }
      await store.seedUserDataIfEmpty(user.id);
      return user;
    } on AuthException {
      rethrow;
    } catch (error) {
      throw AuthException(
        'No se pudo restaurar la sesion local.',
        code: AuthErrorCode.sessionStorage,
        cause: error,
      );
    }
  }

  Future<bool> hasAnyUser() async {
    try {
      return await store.hasAnyUser();
    } catch (error) {
      throw AuthException(
        'No se pudo revisar si ya existen cuentas locales.',
        code: AuthErrorCode.storage,
        cause: error,
      );
    }
  }

  Future<NoraUser?> findUserByUsername(String username) async {
    final cleanUsername = _normalizeUsername(username);
    if (cleanUsername.isEmpty) return null;
    try {
      return await store.findUserByUsername(cleanUsername);
    } catch (error) {
      throw AuthException(
        'No se pudo buscar la cuenta local.',
        code: AuthErrorCode.storage,
        cause: error,
      );
    }
  }

  Future<void> saveSessionForUser(String userId) async {
    try {
      await sessionStore.writeUserId(userId);
    } catch (error) {
      throw AuthException(
        'La cuenta fue creada, pero Android no permitio guardar la sesion segura. Proba iniciar sesion manualmente.',
        code: AuthErrorCode.sessionStorage,
        cause: error,
      );
    }
  }

  Future<NoraUser?> createUserOnly({
    required String username,
    required String password,
    required String recoveryQuestion,
    required String recoveryAnswer,
    String? displayName,
  }) async {
    final cleanUsername = _normalizeUsername(username);
    _validateCredentials(cleanUsername, password);
    _validateRecoveryQuestion(recoveryQuestion);
    _validateRecoveryAnswer(recoveryAnswer);

    try {
      final existing = await store.findUserByUsername(cleanUsername);
      if (existing != null) {
        throw AuthException('Ese usuario ya existe.', code: AuthErrorCode.duplicateUser);
      }

      final salt = _newSalt();
      final recoverySalt = _newSalt();
      final userId = newLocalId('user');
      await store.insertUser(
        id: userId,
        username: cleanUsername,
        displayName: _displayName(displayName, cleanUsername),
        passwordHash: _hashPassword(password, salt),
        salt: salt,
        recoveryQuestion: recoveryQuestion.trim(),
        recoveryAnswerHash: _hashPassword(_normalizeRecoveryAnswer(recoveryAnswer), recoverySalt),
        recoverySalt: recoverySalt,
      );

      final user = await store.findUserById(userId);
      if (user == null) {
        throw AuthException(
          'No se pudo crear la cuenta.',
          code: AuthErrorCode.storage,
        );
      }

      return user;
    } on AuthException {
      rethrow;
    } on DatabaseException catch (error) {
      if (error.isUniqueConstraintError()) {
        throw AuthException(
          'Ese usuario ya existe.',
          code: AuthErrorCode.duplicateUser,
          cause: error,
        );
      }
      throw AuthException(
        'No se pudo guardar la cuenta local.',
        code: AuthErrorCode.storage,
        cause: error,
      );
    } catch (error) {
      throw AuthException(
        'No se pudo crear la cuenta local.',
        code: AuthErrorCode.storage,
        cause: error,
      );
    }
  }

  Future<NoraUser> completeFirstRun(NoraUser user) async {
    await saveSessionForUser(user.id);
    try {
      await store.seedUserDataIfEmpty(user.id);
      return user;
    } catch (error) {
      throw AuthException(
        'La cuenta se creo, pero no se pudo preparar el espacio inicial.',
        code: AuthErrorCode.storage,
        cause: error,
      );
    }
  }

  Future<NoraUser> register({
    required String username,
    required String password,
    required String recoveryQuestion,
    required String recoveryAnswer,
    String? displayName,
  }) async {
    final user = await createUserOnly(
      username: username,
      password: password,
      recoveryQuestion: recoveryQuestion,
      recoveryAnswer: recoveryAnswer,
      displayName: displayName,
    );
    if (user == null) {
      throw AuthException('No se pudo crear la cuenta.', code: AuthErrorCode.storage);
    }
    return completeFirstRun(user);
  }

  Future<NoraUser> login({
    required String username,
    required String password,
  }) async {
    final cleanUsername = _normalizeUsername(username);
    _validateLogin(cleanUsername, password);

    try {
      final row = await store.findUserCredentials(cleanUsername);
      if (row == null) {
        throw AuthException(
          'Usuario o contrasena incorrectos.',
          code: AuthErrorCode.invalidCredentials,
        );
      }

      final salt = row['salt'] as String;
      final expected = row['password_hash'] as String;
      final actual = _hashPassword(password, salt);
      if (!_constantTimeEquals(expected, actual)) {
        throw AuthException(
          'Usuario o contrasena incorrectos.',
          code: AuthErrorCode.invalidCredentials,
        );
      }

      final userId = row['id'] as String;
      await store.touchLogin(userId);
      await saveSessionForUser(userId);
      await store.seedUserDataIfEmpty(userId);
      final user = await store.findUserById(userId);
      if (user == null) {
        throw AuthException('No se pudo abrir la sesion.', code: AuthErrorCode.storage);
      }
      return user;
    } on AuthException {
      rethrow;
    } catch (error) {
      throw AuthException(
        'No se pudo iniciar sesion.',
        code: AuthErrorCode.storage,
        cause: error,
      );
    }
  }

  Future<String?> getRecoveryQuestion(String username) async {
    final cleanUsername = _normalizeUsername(username);
    if (cleanUsername.isEmpty) return null;

    try {
      final row = await store.findUserCredentials(cleanUsername);
      final question = row?['recovery_question'] as String?;
      if (question == null || question.trim().isEmpty) return null;
      return question;
    } catch (error) {
      throw AuthException(
        'No se pudo buscar la pregunta de recuperacion.',
        code: AuthErrorCode.storage,
        cause: error,
      );
    }
  }

  Future<void> resetPasswordWithRecovery({
    required String username,
    required String recoveryAnswer,
    required String newPassword,
  }) async {
    final cleanUsername = _normalizeUsername(username);
    _validateLogin(cleanUsername, newPassword);
    _validatePassword(newPassword);
    _validateRecoveryAnswer(recoveryAnswer);

    try {
      final row = await store.findUserCredentials(cleanUsername);
      if (row == null) {
        throw AuthException(
          'No encontramos ese nombre de usuario. Verifica e intenta de nuevo.',
          code: AuthErrorCode.invalidCredentials,
        );
      }

      final recoveryHash = row['recovery_answer_hash'] as String?;
      final recoverySalt = row['recovery_salt'] as String?;
      if (recoveryHash == null || recoverySalt == null) {
        throw AuthException(
          'Esta cuenta no tiene recuperacion configurada.',
          code: AuthErrorCode.recoveryUnavailable,
        );
      }

      final answerHash = _hashPassword(_normalizeRecoveryAnswer(recoveryAnswer), recoverySalt);
      if (!_constantTimeEquals(recoveryHash, answerHash)) {
        throw AuthException(
          'La respuesta de recuperacion es incorrecta. Intenta de nuevo.',
          code: AuthErrorCode.invalidRecoveryAnswer,
        );
      }

      final newSalt = _newSalt();
      await store.updatePassword(
        userId: row['id'] as String,
        passwordHash: _hashPassword(newPassword, newSalt),
        salt: newSalt,
      );
      await sessionStore.clear();
    } on AuthException {
      rethrow;
    } catch (error) {
      throw AuthException(
        'No se pudo actualizar la contrasena.',
        code: AuthErrorCode.storage,
        cause: error,
      );
    }
  }

  Future<void> logout() async {
    try {
      await sessionStore.clear();
    } catch (error) {
      throw AuthException(
        'No se pudo cerrar la sesion segura.',
        code: AuthErrorCode.sessionStorage,
        cause: error,
      );
    }
  }

  String _normalizeUsername(String username) => username.trim().toLowerCase();
  String _normalizeRecoveryAnswer(String answer) => answer.trim().toLowerCase();

  void _validateLogin(String username, String password) {
    if (username.isEmpty || password.isEmpty) {
      throw AuthException('Ingresa usuario y contrasena.', code: AuthErrorCode.validation);
    }
  }

  void _validateCredentials(String username, String password) {
    if (username.length < 3) {
      throw AuthException(
        'El usuario debe tener al menos 3 caracteres.',
        code: AuthErrorCode.validation,
      );
    }
    if (username.length > 32) {
      throw AuthException(
        'El usuario no puede exceder 32 caracteres.',
        code: AuthErrorCode.validation,
      );
    }
    if (!RegExp(r'^[a-z0-9._-]+$').hasMatch(username)) {
      throw AuthException(
        'Usa letras, numeros, puntos, guiones o guion bajo.',
        code: AuthErrorCode.validation,
      );
    }
    _validatePassword(password);
  }

  void _validatePassword(String password) {
    if (password.length < 8) {
      throw AuthException(
        'La contrasena debe tener minimo 8 caracteres.',
        code: AuthErrorCode.validation,
      );
    }
  }

  void _validateRecoveryQuestion(String question) {
    final clean = question.trim();
    if (clean.isEmpty) {
      throw AuthException(
        'La pregunta de recuperacion no puede estar vacia.',
        code: AuthErrorCode.validation,
      );
    }
    if (clean.length < 10) {
      throw AuthException(
        'La pregunta de recuperacion debe tener minimo 10 caracteres.',
        code: AuthErrorCode.validation,
      );
    }
  }

  void _validateRecoveryAnswer(String answer) {
    final clean = answer.trim();
    if (clean.isEmpty) {
      throw AuthException(
        'La respuesta de recuperacion no puede estar vacia.',
        code: AuthErrorCode.validation,
      );
    }
    if (clean.length < 2) {
      throw AuthException(
        'La respuesta de recuperacion debe tener minimo 2 caracteres.',
        code: AuthErrorCode.validation,
      );
    }
  }

  String _displayName(String? displayName, String username) {
    final clean = displayName?.trim();
    if (clean != null && clean.isNotEmpty) return clean;
    return username[0].toUpperCase() + username.substring(1);
  }

  String _newSalt() {
    final bytes = List<int>.generate(16, (_) => _random.nextInt(256));
    return base64Url.encode(bytes);
  }

  String _hashPassword(String password, String salt) {
    List<int> bytes = utf8.encode('$salt:$password');
    final saltBytes = utf8.encode(salt);
    for (var i = 0; i < 12000; i++) {
      bytes = sha256.convert([...bytes, ...saltBytes]).bytes;
    }
    return base64Url.encode(bytes);
  }

  bool _constantTimeEquals(String a, String b) {
    final left = utf8.encode(a);
    final right = utf8.encode(b);
    if (left.length != right.length) return false;
    var diff = 0;
    for (var i = 0; i < left.length; i++) {
      diff |= left[i] ^ right[i];
    }
    return diff == 0;
  }
}

enum AuthErrorCode {
  validation,
  duplicateUser,
  invalidCredentials,
  invalidRecoveryAnswer,
  recoveryUnavailable,
  storage,
  sessionStorage,
  unknown,
}

class AuthException implements Exception {
  AuthException(
    this.message, {
    this.code = AuthErrorCode.unknown,
    this.cause,
  });

  final String message;
  final AuthErrorCode code;
  final Object? cause;

  @override
  String toString() => cause == null ? message : '$message ($cause)';
}
