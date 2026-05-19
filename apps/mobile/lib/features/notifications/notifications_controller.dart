import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/nora_models.dart';
import '../auth/auth_controller.dart';
import 'notifications_repository.dart';

final notificationsControllerProvider =
    StateNotifierProvider<NotificationsController, AsyncValue<List<NoraNotification>>>((ref) {
  final ownerId = ref.watch(authControllerProvider).user?.id;
  return NotificationsController(ref.watch(notificationsRepositoryProvider), ownerId);
});

class NotificationsController extends StateNotifier<AsyncValue<List<NoraNotification>>> {
  NotificationsController(this._repository, this._ownerId) : super(const AsyncValue.loading()) {
    load();
  }

  final NotificationsRepository _repository;
  final String? _ownerId;

  Future<void> load() async {
    final ownerId = _ownerId;
    if (ownerId == null) {
      state = const AsyncValue.data([]);
      return;
    }
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _repository.list(ownerId));
  }

  Future<void> markAllRead() async {
    final ownerId = _ownerId;
    if (ownerId == null) return;
    await _repository.markAllRead(ownerId);
    await load();
  }
}
