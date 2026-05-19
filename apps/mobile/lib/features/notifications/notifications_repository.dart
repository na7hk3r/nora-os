import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/nora_models.dart';
import '../../core/storage/local_store.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>((ref) {
  return NotificationsRepository(noraLocalStore);
});

class NotificationsRepository {
  NotificationsRepository(this._store);

  final NoraLocalStore _store;

  Future<List<NoraNotification>> list(String ownerId) => _store.listNotifications(ownerId);

  Future<void> save(NoraNotification notification) {
    return _store.upsertNotification(notification);
  }

  Future<void> markAllRead(String ownerId) => _store.markAllNotificationsRead(ownerId);
}
