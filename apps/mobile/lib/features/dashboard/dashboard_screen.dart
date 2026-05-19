import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/nora_colors.dart';
import '../../core/design/nora_spacing.dart';
import '../../core/design/widgets/nora_button.dart';
import '../../core/design/widgets/nora_card.dart';
import '../../core/design/widgets/nora_panel.dart';
import '../../core/models/nora_models.dart';
import '../auth/auth_controller.dart';
import '../notifications/notifications_controller.dart';
import '../planner/planner_controller.dart';
import '../tasks/tasks_controller.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    final planner = ref.watch(plannerControllerProvider).valueOrNull ?? [];
    final tasks = ref.watch(tasksControllerProvider).valueOrNull ?? [];
    final notifications = ref.watch(notificationsControllerProvider).valueOrNull ?? [];
    final today = noraDateKey(DateTime.now());
    final todayPlanner = planner.where((item) => item.date == today).toList();
    final completedToday = todayPlanner.where((item) => item.isCompleted).length;
    final progress = todayPlanner.isEmpty ? 0.0 : completedToday / todayPlanner.length;
    final pendingTasks = tasks.where((task) => !task.isCompleted).length;
    final unread = notifications.where((notice) => !notice.isRead).length;

    return ListView(
      children: [
        Text(
          'Hola, ${user?.displayName ?? 'Nora'}',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: NoraSpacing.xs),
        Text(
          'Lo importante de tu dia, sin ruido.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
        ),
        const SizedBox(height: NoraSpacing.lg),
        NoraCard(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              const Icon(Icons.search_rounded, color: NoraColors.muted, size: 20),
              const SizedBox(width: NoraSpacing.sm),
              Expanded(
                child: Text(
                  'Buscar tareas, notas o rutas...',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
                ),
              ),
              IconButton(
                tooltip: 'Filtros',
                onPressed: () {},
                icon: const Icon(Icons.tune_rounded, color: NoraColors.text),
              ),
            ],
          ),
        ),
        const SizedBox(height: NoraSpacing.xl),
        Row(
          children: [
            Text('Acciones rapidas', style: Theme.of(context).textTheme.titleMedium),
            const Spacer(),
            TextButton(onPressed: () => context.go('/tasks'), child: const Text('Ver todo')),
          ],
        ),
        const SizedBox(height: NoraSpacing.sm),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _QuickAction(icon: Icons.calendar_month_outlined, label: 'Planner', onTap: () => context.go('/planner')),
              _QuickAction(icon: Icons.check_circle_outline_rounded, label: 'Tareas', onTap: () => context.go('/tasks')),
              _QuickAction(icon: Icons.notifications_none_rounded, label: 'Alertas', onTap: () => context.go('/notifications')),
              _QuickAction(icon: Icons.person_outline_rounded, label: 'Perfil', onTap: () => context.go('/profile')),
            ],
          ),
        ),
        const SizedBox(height: NoraSpacing.xl),
        NoraPanel(
          title: 'Tareas del dia',
          child: Row(
            children: [
              Expanded(
                child: Column(
                  children: [
                    _MetricTile(value: '${todayPlanner.length}', label: 'Bloques hoy', color: NoraColors.info),
                    const SizedBox(height: NoraSpacing.sm),
                    _MetricTile(value: '$pendingTasks', label: 'Tareas activas', color: NoraColors.warning),
                  ],
                ),
              ),
              const SizedBox(width: NoraSpacing.lg),
              SizedBox(
                width: 96,
                height: 96,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 88,
                      height: 88,
                      child: CircularProgressIndicator(
                        value: progress,
                        strokeWidth: 8,
                        backgroundColor: NoraColors.surfaceLighter,
                        color: NoraColors.accent,
                      ),
                    ),
                    Text('${(progress * 100).round()}%', style: Theme.of(context).textTheme.titleLarge),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: NoraSpacing.xl),
        NoraCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text('Actividad reciente', style: Theme.of(context).textTheme.titleMedium),
                  const Spacer(),
                  if (unread > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                      decoration: BoxDecoration(
                        color: NoraColors.accent.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text('$unread nuevas'),
                    ),
                ],
              ),
              const SizedBox(height: NoraSpacing.md),
              ...tasks.take(3).map((task) => _ActivityRow(task: task)),
              if (tasks.isEmpty)
                Text(
                  'No hay actividad reciente.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
                ),
              const SizedBox(height: NoraSpacing.md),
              NoraButton(
                label: 'Abrir tareas',
                icon: Icons.arrow_forward_rounded,
                variant: NoraButtonVariant.secondary,
                expand: true,
                onPressed: () => context.go('/tasks'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: SizedBox(
        width: 86,
        child: NoraCard(
          onTap: onTap,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
          child: Column(
            children: [
              Icon(icon, color: NoraColors.accentLight),
              const SizedBox(height: NoraSpacing.sm),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelMedium,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.value,
    required this.label,
    required this.color,
  });

  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: NoraColors.surfaceLight.withValues(alpha: 0.62),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(color: color)),
          const SizedBox(height: 2),
          Text(label, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted)),
        ],
      ),
    );
  }
}

class _ActivityRow extends StatelessWidget {
  const _ActivityRow({required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(
            task.isCompleted ? Icons.check_circle_rounded : Icons.circle_outlined,
            color: task.isCompleted ? NoraColors.success : NoraColors.accentLight,
          ),
          const SizedBox(width: NoraSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(task.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                if (task.note != null)
                  Text(
                    task.note!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
