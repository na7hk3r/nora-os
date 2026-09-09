import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_controller.dart';
import '../plugins/plugin_event_bus.dart';
import '../storage/local_store.dart';
import 'pulso_repository.dart';

final pulsoRepositoryProvider = Provider<PulsoRepository>((ref) {
  return PulsoRepository(noraLocalStore);
});

final pulsoControllerProvider =
    StateNotifierProvider<PulsoController, AsyncValue<PulsoSnapshot>>((ref) {
  final ownerId = ref.watch(authControllerProvider).user?.id;
  final controller =
      PulsoController(ref.watch(pulsoRepositoryProvider), ownerId);
  // La XP otorgada por plugins llega vía el bus compartido (desacople
  // plugins<->features): recargar para que el dashboard refleje el cambio.
  final unsubscribe = NoraEventBus.instance
      .on(PulsoRepository.xpAddedEvent, (_) => controller.load());
  ref.onDispose(unsubscribe);
  return controller;
});

class PulsoController extends StateNotifier<AsyncValue<PulsoSnapshot>> {
  PulsoController(this._repository, this._ownerId) : super(const AsyncValue.loading()) {
    load();
  }

  final PulsoRepository _repository;
  final String? _ownerId;

  Future<void> load() async {
    final ownerId = _ownerId;
    if (ownerId == null) {
      state = AsyncValue.data(PulsoSnapshot.empty());
      return;
    }
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _repository.load(ownerId));
  }
}
