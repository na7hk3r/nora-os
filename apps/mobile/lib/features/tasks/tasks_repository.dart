import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/nora_models.dart';
import '../../core/storage/local_store.dart';

final tasksRepositoryProvider = Provider<TasksRepository>((ref) {
  return TasksRepository(noraLocalStore);
});

class TasksRepository {
  TasksRepository(this._store);

  final NoraLocalStore _store;

  Future<List<TaskItem>> list(String ownerId) => _store.listTasks(ownerId);

  Future<void> save(TaskItem item) => _store.upsertTask(item);

  Future<void> delete(String ownerId, String itemId) => _store.deleteTask(ownerId, itemId);
}
