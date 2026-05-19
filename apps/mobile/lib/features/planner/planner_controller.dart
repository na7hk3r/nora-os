import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/nora_models.dart';
import '../auth/auth_controller.dart';
import 'planner_repository.dart';

final plannerControllerProvider =
    StateNotifierProvider<PlannerController, AsyncValue<List<PlannerItem>>>((ref) {
  final ownerId = ref.watch(authControllerProvider).user?.id;
  return PlannerController(ref.watch(plannerRepositoryProvider), ownerId);
});

class PlannerController extends StateNotifier<AsyncValue<List<PlannerItem>>> {
  PlannerController(this._repository, this._ownerId) : super(const AsyncValue.loading()) {
    load();
  }

  final PlannerRepository _repository;
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

  Future<void> addItem({
    required String title,
    required String date,
    required PlannerKind kind,
    required String category,
    required NoraPriority priority,
    int? startMinute,
    int? endMinute,
    String? note,
  }) async {
    final ownerId = _ownerId;
    final cleanTitle = title.trim();
    if (ownerId == null || cleanTitle.isEmpty) return;
    final now = DateTime.now();
    await _repository.save(
      PlannerItem(
        id: newLocalId('planner'),
        ownerId: ownerId,
        title: cleanTitle,
        date: date,
        startMinute: startMinute,
        endMinute: endMinute,
        kind: kind,
        category: category.trim().isEmpty ? 'Personal' : category.trim(),
        status: TaskStatus.pending,
        priority: priority,
        note: note?.trim().isEmpty ?? true ? null : note?.trim(),
        createdAt: now,
        updatedAt: now,
      ),
    );
    await load();
  }

  Future<void> toggleComplete(PlannerItem item) async {
    final ownerId = _ownerId;
    if (ownerId == null) return;
    await _repository.save(
      item.copyWith(
        status: item.isCompleted ? TaskStatus.pending : TaskStatus.completed,
        updatedAt: DateTime.now(),
      ),
    );
    await load();
  }

  Future<void> delete(PlannerItem item) async {
    final ownerId = _ownerId;
    if (ownerId == null) return;
    await _repository.delete(ownerId, item.id);
    await load();
  }
}
