import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_controller.dart';
import '../storage/local_store.dart';
import 'pulso_repository.dart';

final pulsoRepositoryProvider = Provider<PulsoRepository>((ref) {
  return PulsoRepository(noraLocalStore);
});

final pulsoControllerProvider =
    StateNotifierProvider<PulsoController, AsyncValue<PulsoSnapshot>>((ref) {
  final ownerId = ref.watch(authControllerProvider).user?.id;
  return PulsoController(ref.watch(pulsoRepositoryProvider), ownerId);
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
