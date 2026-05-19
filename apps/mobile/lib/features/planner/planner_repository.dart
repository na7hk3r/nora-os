import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/nora_models.dart';
import '../../core/storage/local_store.dart';

final plannerRepositoryProvider = Provider<PlannerRepository>((ref) {
  return PlannerRepository(noraLocalStore);
});

class PlannerRepository {
  PlannerRepository(this._store);

  final NoraLocalStore _store;

  Future<List<PlannerItem>> list(String ownerId) => _store.listPlanner(ownerId);

  Future<void> save(PlannerItem item) => _store.upsertPlanner(item);

  Future<void> delete(String ownerId, String itemId) => _store.deletePlanner(ownerId, itemId);
}
