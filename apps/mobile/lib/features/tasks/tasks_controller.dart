import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/nora_models.dart';
import '../auth/auth_controller.dart';
import 'tasks_repository.dart';

final tasksControllerProvider =
    StateNotifierProvider<TasksController, AsyncValue<List<TaskItem>>>((ref) {
  final ownerId = ref.watch(authControllerProvider).user?.id;
  return TasksController(ref.watch(tasksRepositoryProvider), ownerId);
});

class TasksController extends StateNotifier<AsyncValue<List<TaskItem>>> {
  TasksController(this._repository, this._ownerId) : super(const AsyncValue.loading()) {
    load();
  }

  final TasksRepository _repository;
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

  Future<void> addTask({
    required String title,
    required NoraPriority priority,
    String? dueDate,
    String? note,
  }) async {
    final ownerId = _ownerId;
    final cleanTitle = title.trim();
    if (ownerId == null || cleanTitle.isEmpty) return;
    final now = DateTime.now();
    await _repository.save(
      TaskItem(
        id: newLocalId('task'),
        ownerId: ownerId,
        title: cleanTitle,
        status: TaskStatus.pending,
        priority: priority,
        dueDate: dueDate,
        note: note?.trim().isEmpty ?? true ? null : note?.trim(),
        createdAt: now,
        updatedAt: now,
      ),
    );
    await load();
  }

  Future<void> setStatus(TaskItem item, TaskStatus status) async {
    final completedAt = status == TaskStatus.completed ? DateTime.now() : null;
    await _repository.save(
      item.copyWith(
        status: status,
        completedAt: completedAt,
        updatedAt: DateTime.now(),
      ),
    );
    await load();
  }

  Future<void> delete(TaskItem item) async {
    final ownerId = _ownerId;
    if (ownerId == null) return;
    await _repository.delete(ownerId, item.id);
    await load();
  }
}
