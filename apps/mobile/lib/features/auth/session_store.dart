import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final sessionStoreProvider = Provider<SessionStore>((ref) {
  return SecureSessionStore(
    const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
    ),
  );
});

abstract class SessionStore {
  Future<String?> readUserId();
  Future<void> writeUserId(String userId);
  Future<void> clear();
}

class SecureSessionStore implements SessionStore {
  const SecureSessionStore(this._storage);

  static const _sessionUserKey = 'nora_mobile.session_user_id';

  final FlutterSecureStorage _storage;

  @override
  Future<String?> readUserId() => _storage.read(key: _sessionUserKey);

  @override
  Future<void> writeUserId(String userId) {
    return _storage.write(key: _sessionUserKey, value: userId);
  }

  @override
  Future<void> clear() => _storage.delete(key: _sessionUserKey);
}
