import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/nora_models.dart';
import 'auth_repository.dart';

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.watch(authRepositoryProvider));
});

class AuthState {
  const AuthState({
    required this.checking,
    required this.loading,
    this.user,
    this.error,
    this.hasLocalUsers,
  });

  const AuthState.checking()
      : checking = true,
        loading = false,
        user = null,
        error = null,
        hasLocalUsers = null;

  final bool checking;
  final bool loading;
  final NoraUser? user;
  final String? error;
  final bool? hasLocalUsers;

  bool get isAuthenticated => user != null;

  AuthState copyWith({
    bool? checking,
    bool? loading,
    NoraUser? user,
    String? error,
    bool? hasLocalUsers,
    bool clearUser = false,
    bool clearError = false,
  }) {
    return AuthState(
      checking: checking ?? this.checking,
      loading: loading ?? this.loading,
      user: clearUser ? null : user ?? this.user,
      error: clearError ? null : error ?? this.error,
      hasLocalUsers: hasLocalUsers ?? this.hasLocalUsers,
    );
  }
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repository) : super(const AuthState.checking()) {
    _restore();
  }

  final AuthRepository _repository;

  Future<void> _restore() async {
    try {
      final user = await _repository.restoreSession();
      final hasLocalUsers = user != null ? true : await _repository.hasAnyUser();
      state = AuthState(
        checking: false,
        loading: false,
        user: user,
        hasLocalUsers: hasLocalUsers,
      );
    } catch (error) {
      debugPrint('[AuthController] restore failed: $error');
      state = AuthState(
        checking: false,
        loading: false,
        error: _readableError(error),
        hasLocalUsers: true,
      );
    }
  }

  Future<void> login(String username, String password) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final user = await _repository.login(username: username, password: password);
      state = AuthState(checking: false, loading: false, user: user, hasLocalUsers: true);
    } catch (error) {
      debugPrint('[AuthController] login failed: $error');
      state = state.copyWith(loading: false, error: _readableError(error), hasLocalUsers: true);
      rethrow;
    }
  }

  Future<void> register({
    required String username,
    required String password,
    required String recoveryQuestion,
    required String recoveryAnswer,
  }) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final user = await _repository.register(
        username: username,
        password: password,
        recoveryQuestion: recoveryQuestion,
        recoveryAnswer: recoveryAnswer,
      );
      state = AuthState(checking: false, loading: false, user: user, hasLocalUsers: true);
    } catch (error) {
      debugPrint('[AuthController] register failed: $error');
      final createdButSessionFailed =
          error is AuthException && error.code == AuthErrorCode.sessionStorage;
      state = state.copyWith(
        loading: false,
        error: _readableError(error),
        hasLocalUsers: createdButSessionFailed ? true : state.hasLocalUsers,
      );
      rethrow;
    }
  }

  Future<String?> getRecoveryQuestion(String username) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final question = await _repository.getRecoveryQuestion(username);
      state = state.copyWith(loading: false, clearError: true);
      return question;
    } catch (error) {
      debugPrint('[AuthController] get recovery question failed: $error');
      state = state.copyWith(loading: false, error: _readableError(error));
      rethrow;
    }
  }

  Future<void> resetPasswordWithRecovery({
    required String username,
    required String recoveryAnswer,
    required String newPassword,
  }) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      await _repository.resetPasswordWithRecovery(
        username: username,
        recoveryAnswer: recoveryAnswer,
        newPassword: newPassword,
      );
      state = state.copyWith(loading: false, clearError: true, clearUser: true);
    } catch (error) {
      debugPrint('[AuthController] reset password failed: $error');
      state = state.copyWith(loading: false, error: _readableError(error));
      rethrow;
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState(checking: false, loading: false);
  }

  void clearError() {
    if (state.error == null) return;
    state = state.copyWith(clearError: true);
  }

  void setValidationError(String message) {
    state = state.copyWith(error: message);
  }

  String _readableError(Object error) {
    if (error is AuthException) return error.message;
    return 'Ocurrio un error inesperado.';
  }
}
