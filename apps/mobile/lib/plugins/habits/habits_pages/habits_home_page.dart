import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/design/nora_colors.dart';
import '../../../core/design/nora_spacing.dart';
import '../../../core/design/widgets/nora_button.dart';
import '../../../core/design/widgets/nora_card.dart';
import '../../../core/design/widgets/nora_empty_state.dart';
import '../../../core/design/widgets/nora_error_state.dart';
import '../../../core/design/widgets/nora_panel.dart';
import '../../../core/design/widgets/nora_section_header.dart';
import '../../habits/habits_controller.dart';
import '../../habits/habits_models.dart';
import '../../habits/habits_utils.dart';

class HabitsHomePage extends ConsumerWidget {
  const HabitsHomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncState = ref.watch(habitsControllerProvider);

    return asyncState.when(
      loading: () => const Center(
        child: CircularProgressIndicator(color: NoraColors.accent),
      ),
      error: (error, _) => Center(
        child: NoraErrorState(
          title: 'No se pudieron cargar los hábitos',
          message: 'Hubo un problema al leer los hábitos. Intentá de nuevo.',
          onRetry: () => ref.read(habitsControllerProvider.notifier).load(),
        ),
      ),
      data: (state) {
        final active =
            state.definitions.where((d) => !d.archived).toList();
        final doneToday = active.where((habit) {
          final stats = computeHabitStats(habit, state.logsFor(habit.id));
          return stats.completedThisPeriod;
        }).length;

        return ListView(
          children: [
            if (active.isNotEmpty) ...[
              _TodaySummary(done: doneToday, total: active.length),
              const SizedBox(height: NoraSpacing.xl),
            ],
            NoraSectionHeader(
              title: 'Mis hábitos',
              subtitle: 'Toca para registrar el día',
              actionLabel: 'Administrar',
              onAction: () => context.go('/plugins/habits/manage'),
            ),
            const SizedBox(height: NoraSpacing.sm),
            if (active.isEmpty)
              NoraEmptyState(
                icon: Icons.repeat_rounded,
                title: 'Aún no hay hábitos',
                message:
                    'Crea tu primer hábito diario o semanal y Nora te ayuda a sostener la racha.',
                actionLabel: 'Crear hábito',
                onAction: () => _showCreateDialog(context, ref),
              )
            else ...[
              for (final habit in active) ...[
                _HabitCard(habit: habit),
                const SizedBox(height: NoraSpacing.sm),
              ],
              const SizedBox(height: NoraSpacing.sm),
              NoraButton(
                label: 'Nuevo hábito',
                icon: Icons.add_rounded,
                variant: NoraButtonVariant.secondary,
                expand: true,
                onPressed: () => _showCreateDialog(context, ref),
              ),
            ],
          ],
        );
      },
    );
  }

  Future<void> _showCreateDialog(BuildContext context, WidgetRef ref) async {
    final nameController = TextEditingController();
    var kind = HabitKind.positive;
    var period = HabitPeriod.daily;
    var target = 1;

    final created = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setState) => AlertDialog(
          title: const Text('Nuevo hábito'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  autofocus: true,
                  decoration: const InputDecoration(
                      labelText: 'Nombre', hintText: 'Ej. Meditar 10 min'),
                ),
                const SizedBox(height: NoraSpacing.md),
                SegmentedButton<HabitKind>(
                  segments: const [
                    ButtonSegment(
                        value: HabitKind.positive,
                        label: Text('Positivo'),
                        icon: Icon(Icons.add_circle_outline_rounded)),
                    ButtonSegment(
                        value: HabitKind.negative,
                        label: Text('Evitar'),
                        icon: Icon(Icons.remove_circle_outline_rounded)),
                  ],
                  selected: {kind},
                  onSelectionChanged: (selection) =>
                      setState(() => kind = selection.first),
                ),
                const SizedBox(height: NoraSpacing.md),
                SegmentedButton<HabitPeriod>(
                  segments: const [
                    ButtonSegment(
                        value: HabitPeriod.daily, label: Text('Diario')),
                    ButtonSegment(
                        value: HabitPeriod.weekly, label: Text('Semanal')),
                  ],
                  selected: {period},
                  onSelectionChanged: (selection) =>
                      setState(() => period = selection.first),
                ),
                const SizedBox(height: NoraSpacing.md),
                Row(
                  children: [
                    Text('Meta por período:'),
                    const Spacer(),
                    IconButton(
                      onPressed:
                          target > 1 ? () => setState(() => target--) : null,
                      icon: const Icon(Icons.remove_circle_outline_rounded),
                    ),
                    Text('$target',
                        style: Theme.of(context).textTheme.titleMedium),
                    IconButton(
                      onPressed: () => setState(() => target++),
                      icon: const Icon(Icons.add_circle_outline_rounded),
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: const Text('Cancelar')),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Crear'),
            ),
          ],
        ),
      ),
    );

    if (created == true) {
      await ref.read(habitsControllerProvider.notifier).createHabit(
            name: nameController.text,
            kind: kind,
            period: period,
            target: target,
            color: fallbackHabitColor(nameController.text.trim()),
          );
    }
  }
}

class _TodaySummary extends StatelessWidget {
  const _TodaySummary({required this.done, required this.total});

  final int done;
  final int total;

  @override
  Widget build(BuildContext context) {
    final percent = total == 0 ? 0.0 : done / total;
    return NoraPanel(
      title: 'Hoy',
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$done de $total cumplidos',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(color: NoraColors.accentLight),
                ),
                const SizedBox(height: 4),
                Text(
                  'Consistencia de hoy',
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: NoraColors.muted),
                ),
              ],
            ),
          ),
          SizedBox(
            width: 72,
            height: 72,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 64,
                  height: 64,
                  child: CircularProgressIndicator(
                    value: percent,
                    strokeWidth: 7,
                    backgroundColor: NoraColors.surfaceLighter,
                    color: NoraColors.accent,
                  ),
                ),
                Text('${(percent * 100).round()}%',
                    style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HabitCard extends ConsumerWidget {
  const _HabitCard({required this.habit});

  final HabitDefinition habit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(habitsControllerProvider).valueOrNull;
    final habitLogs = state?.logsFor(habit.id) ?? const [];
    final stats = computeHabitStats(habit, habitLogs);
    final color =
        habitHexToColor(habit.color ?? fallbackHabitColor(habit.name));
    final completed = stats.completedThisPeriod;

    final icon = habit.target > 1
        ? (stats.countThisPeriod >= habit.target
            ? Icons.check_rounded
            : Icons.add_rounded)
        : (completed ? Icons.check_rounded : Icons.add_rounded);
    final badgeText =
        habit.target > 1 ? '${stats.countThisPeriod}/${habit.target}' : null;

    return NoraCard(
      onTap: () =>
          ref.read(habitsControllerProvider.notifier).toggleToday(habit.id),
      padding:
          const EdgeInsets.symmetric(vertical: 14, horizontal: NoraSpacing.md),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: completed ? 1 : 0.2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: color.withValues(alpha: 0.4)),
            ),
            child: Center(
              child: badgeText != null && !completed
                  ? Text(
                      badgeText,
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: completed ? Colors.white : NoraColors.text,
                          ),
                    )
                  : Icon(icon,
                      size: 18,
                      color: completed ? Colors.white : NoraColors.text),
            ),
          ),
          const SizedBox(width: NoraSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(habit.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text(
                  _periodLabel(),
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: NoraColors.muted),
                ),
              ],
            ),
          ),
          if (stats.streak >= 3) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
              decoration: BoxDecoration(
                color: NoraColors.warning.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(99),
                border: Border.all(
                    color: NoraColors.warning.withValues(alpha: 0.3)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.local_fire_department_outlined,
                      size: 13, color: NoraColors.warning),
                  const SizedBox(width: 3),
                  Text(
                    '${stats.streak}',
                    style: Theme.of(context)
                        .textTheme
                        .labelMedium
                        ?.copyWith(color: NoraColors.warning),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _periodLabel() {
    final parts = <String>[
      habit.period == HabitPeriod.daily ? 'Diario' : 'Semanal',
      if (habit.target > 1) 'meta ${habit.target}',
      if (habit.kind == HabitKind.negative) 'evitar',
    ];
    return parts.join(' · ');
  }
}
