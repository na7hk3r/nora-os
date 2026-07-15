import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/nora_colors.dart';
import '../../core/design/nora_spacing.dart';
import '../../core/design/widgets/nora_button.dart';
import '../../core/design/widgets/nora_card.dart';
import '../../core/design/widgets/nora_metric_tile.dart';
import '../../core/design/widgets/nora_panel.dart';
import '../../core/design/widgets/nora_section_header.dart';
import '../../core/design/widgets/nori_sprite.dart';
import '../../core/models/nora_models.dart';
import '../../core/pulso/pulso_controller.dart';
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
    final pulso = ref.watch(pulsoControllerProvider).valueOrNull;
    final today = noraDateKey(DateTime.now());
    final todayPlanner = planner.where((item) => item.date == today).toList();
    final completedToday = todayPlanner.where((item) => item.isCompleted).length;
    final progress = todayPlanner.isEmpty ? 0.0 : completedToday / todayPlanner.length;
    final pendingTasks = tasks.where((task) => !task.isCompleted).length;
    final unread = notifications.where((notice) => !notice.isRead).length;

    final companionMessage = todayPlanner.isEmpty
        ? 'Nora te sugiere planificar tu primer bloque de enfoque.'
        : 'Hoy hay ${todayPlanner.length} bloques y $pendingTasks tareas activas. Nora te acompaña en cada paso.';

    return ListView(
      children: [
        Text(
          'Hola, ${user?.displayName ?? 'Nora'}',
          style: Theme.of(context).textTheme.titleLarge,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: NoraSpacing.sm),
        Text(
          'Tu consola diaria de enfoque y pulso.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
        ),
        const SizedBox(height: NoraSpacing.xl),
        NoraCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Esto importa ahora', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: NoraSpacing.sm),
              Text(
                companionMessage,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
              ),
              const SizedBox(height: NoraSpacing.lg),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _DashboardChip(
                    icon: Icons.calendar_month_outlined,
                    label: 'Planner',
                    onTap: () => context.go('/planner'),
                  ),
                  _DashboardChip(
                    icon: Icons.checklist_rounded,
                    label: 'Focus',
                    onTap: () => context.go('/tasks'),
                  ),
                  _DashboardChip(
                    icon: Icons.notifications_none_rounded,
                    label: 'Nora',
                    onTap: () => context.go('/notifications'),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: NoraSpacing.xl),
        NoraCard(
          padding: const EdgeInsets.all(16),
          child: _PulsoNoraSummary(
            points: pulso?.points ?? 0,
            level: pulso?.level ?? 1,
            percent: pulso?.progress.percent ?? 0,
            xpRemaining: pulso?.progress.xpRemaining ?? 120,
          ),
        ),
        const SizedBox(height: NoraSpacing.xl),
        NoraSectionHeader(
          title: 'Navegar con Nora',
          actionLabel: 'Ver tareas',
          onAction: () => context.go('/tasks'),
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
          title: 'Hoy',
          child: Row(
            children: [
              Expanded(
                child: Column(
                  children: [
                    NoraMetricTile(
                      value: '${todayPlanner.length}',
                      label: 'Bloques hoy',
                      icon: Icons.calendar_today_outlined,
                      color: NoraColors.info,
                    ),
                    const SizedBox(height: NoraSpacing.sm),
                    NoraMetricTile(
                      value: '$pendingTasks',
                      label: 'Tareas activas',
                      icon: Icons.checklist_rounded,
                      color: NoraColors.warning,
                    ),
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
                  Text('Revisión rápida', style: Theme.of(context).textTheme.titleMedium),
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
                  'Nora no detecta actividad reciente. Usa el botón de crear para capturar tu próxima intención.',
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

class _PulsoNoraSummary extends StatelessWidget {
  const _PulsoNoraSummary({
    required this.points,
    required this.level,
    required this.percent,
    required this.xpRemaining,
  });

  final int points;
  final int level;
  final double percent;
  final int xpRemaining;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        NoriSprite(level: level, size: 70),
        const SizedBox(width: NoraSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Pulso Nora', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 3),
              Text(
                'Nori nivel $level - $points XP',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
              ),
              const SizedBox(height: NoraSpacing.sm),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: percent,
                  minHeight: 8,
                  backgroundColor: NoraColors.surfaceLighter,
                  color: NoraColors.accent,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                xpRemaining == 0 ? 'Nori sincronizado al maximo.' : '$xpRemaining XP para la proxima evolucion',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(color: NoraColors.accentLight),
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

class _DashboardChip extends StatelessWidget {
  const _DashboardChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
          decoration: BoxDecoration(
            color: NoraColors.surfaceLight.withValues(alpha: 0.88),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: NoraColors.border.withValues(alpha: 0.5)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: NoraColors.accentLight),
              const SizedBox(width: 8),
              Text(
                label,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(color: NoraColors.text),
              ),
            ],
          ),
        ),
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
