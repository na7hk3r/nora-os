import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/design/nora_colors.dart';
import '../../core/design/nora_spacing.dart';
import '../../core/design/widgets/nora_card.dart';
import '../../core/design/widgets/nora_fab.dart';
import '../../core/models/nora_models.dart';
import '../create/create_sheet.dart';
import 'tasks_controller.dart';

class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> {
  TaskStatus _status = TaskStatus.pending;

  @override
  Widget build(BuildContext context) {
    final tasksState = ref.watch(tasksControllerProvider);

    return Stack(
      children: [
        tasksState.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stackTrace) => const Center(child: Text('No se pudieron cargar tareas.')),
          data: (tasks) {
            final filtered = tasks.where((task) => task.status == _status).toList();
            final groups = _groupTasks(filtered);

            return ListView(
              children: [
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: TaskStatus.values.map((status) {
                      final count = tasks.where((task) => task.status == status).length;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          selected: _status == status,
                          label: Text('${status.label} $count'),
                          onSelected: (_) => setState(() => _status = status),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: NoraSpacing.lg),
                if (filtered.isEmpty)
                  const _TasksEmpty()
                else
                  ...groups.entries.map((entry) {
                    return _TaskGroup(title: entry.key, tasks: entry.value);
                  }),
                const SizedBox(height: 108),
              ],
            );
          },
        ),
        Positioned(
          right: 4,
          bottom: 18,
          child: NoraFAB(
            tooltip: 'Crear tarea',
            onPressed: () => showNoraCreateSheet(context),
          ),
        ),
      ],
    );
  }

  Map<String, List<TaskItem>> _groupTasks(List<TaskItem> tasks) {
    final today = noraDateKey(DateTime.now());
    final tomorrow = noraDateKey(DateTime.now().add(const Duration(days: 1)));
    final map = <String, List<TaskItem>>{};

    for (final task in tasks) {
      final key = task.dueDate == today
          ? 'Hoy'
          : task.dueDate == tomorrow
              ? 'Manana'
              : task.dueDate == null
                  ? 'Sin fecha'
                  : 'Proximas';
      map.putIfAbsent(key, () => []).add(task);
    }

    return map;
  }
}

class _TaskGroup extends StatelessWidget {
  const _TaskGroup({
    required this.title,
    required this.tasks,
  });

  final String title;
  final List<TaskItem> tasks;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: NoraSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(title, style: Theme.of(context).textTheme.titleMedium),
          ),
          ...tasks.map((task) => _TaskTile(task: task)),
        ],
      ),
    );
  }
}

class _TaskTile extends ConsumerWidget {
  const _TaskTile({required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Dismissible(
      key: ValueKey(task.id),
      background: _DismissBackground(
        alignment: Alignment.centerLeft,
        icon: Icons.check_rounded,
        label: 'Completar',
        color: NoraColors.success,
      ),
      secondaryBackground: _DismissBackground(
        alignment: Alignment.centerRight,
        icon: Icons.delete_outline_rounded,
        label: 'Eliminar',
        color: NoraColors.danger,
      ),
      confirmDismiss: (direction) async {
        if (direction == DismissDirection.startToEnd) {
          await ref.read(tasksControllerProvider.notifier).setStatus(task, TaskStatus.completed);
          return false;
        }
        await ref.read(tasksControllerProvider.notifier).delete(task);
        return true;
      },
      child: Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: NoraCard(
          padding: const EdgeInsets.fromLTRB(12, 12, 10, 12),
          child: Row(
            children: [
              SizedBox(
                width: 44,
                height: 44,
                child: IconButton(
                  tooltip: task.isCompleted ? 'Marcar pendiente' : 'Completar',
                  onPressed: () {
                    ref.read(tasksControllerProvider.notifier).setStatus(
                          task,
                          task.isCompleted ? TaskStatus.pending : TaskStatus.completed,
                        );
                  },
                  icon: Icon(
                    task.isCompleted ? Icons.check_circle_rounded : Icons.circle_outlined,
                    color: task.isCompleted ? NoraColors.success : NoraColors.accentLight,
                    size: 26,
                  ),
                ),
              ),
              const SizedBox(width: NoraSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            decoration: task.isCompleted ? TextDecoration.lineThrough : null,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 7,
                      children: [
                        _MiniChip(label: task.priority.label, color: _priorityColor(task.priority)),
                        if (task.note != null) _MiniChip(label: task.note!, color: NoraColors.info),
                        if (task.dueDate != null) _MiniChip(label: task.dueDate!, color: NoraColors.muted),
                      ],
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Mover estado',
                onPressed: () {
                  final next = task.status == TaskStatus.pending
                      ? TaskStatus.inProgress
                      : task.status == TaskStatus.inProgress
                          ? TaskStatus.completed
                          : TaskStatus.pending;
                  ref.read(tasksControllerProvider.notifier).setStatus(task, next);
                },
                icon: const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: NoraColors.muted),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _priorityColor(NoraPriority priority) {
    switch (priority) {
      case NoraPriority.high:
        return NoraColors.danger;
      case NoraPriority.medium:
        return NoraColors.warning;
      case NoraPriority.low:
        return NoraColors.success;
    }
  }
}

class _MiniChip extends StatelessWidget {
  const _MiniChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(color: color),
      ),
    );
  }
}

class _DismissBackground extends StatelessWidget {
  const _DismissBackground({
    required this.alignment,
    required this.icon,
    required this.label,
    required this.color,
  });

  final Alignment alignment;
  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: alignment,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.22),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _TasksEmpty extends StatelessWidget {
  const _TasksEmpty();

  @override
  Widget build(BuildContext context) {
    return NoraCard(
      child: Column(
        children: [
          const Icon(Icons.checklist_rounded, color: NoraColors.muted),
          const SizedBox(height: NoraSpacing.sm),
          Text('Sin tareas en esta vista', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: NoraSpacing.xs),
          Text(
            'Crea una tarea para empezar.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
          ),
        ],
      ),
    );
  }
}
