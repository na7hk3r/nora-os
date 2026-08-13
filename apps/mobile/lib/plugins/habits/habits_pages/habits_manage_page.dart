import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/design/nora_colors.dart';
import '../../../core/design/nora_spacing.dart';
import '../../../core/design/widgets/nora_card.dart';
import '../../../core/design/widgets/nora_empty_state.dart';
import '../../../core/design/widgets/nora_section_header.dart';
import '../../habits/habits_controller.dart';
import '../../habits/habits_models.dart';
import '../../habits/habits_utils.dart';

class HabitsManagePage extends ConsumerWidget {
  const HabitsManagePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncState = ref.watch(habitsControllerProvider);
    final state = asyncState.valueOrNull;
    final habits = state?.definitions ?? const [];

    return ListView(
      children: [
        NoraSectionHeader(
          title: 'Hábitos',
          subtitle: '${habits.length} definidos',
          actionLabel: 'Nuevo',
          onAction: () => _showCreateDialog(context, ref),
        ),
        const SizedBox(height: NoraSpacing.sm),
        if (habits.isEmpty)
          const NoraEmptyState(
            icon: Icons.repeat_rounded,
            title: 'Sin hábitos',
            message: 'Crea tu primer hábito para empezar a medir consistencia.',
          )
        else
          NoraCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (var i = 0; i < habits.length; i++) ...[
                  _ManageRow(habit: habits[i]),
                  if (i != habits.length - 1)
                    Divider(
                        height: 1,
                        color: NoraColors.border.withValues(alpha: 0.44)),
                ],
              ],
            ),
          ),
      ],
    );
  }

  Future<void> _showCreateDialog(BuildContext context, WidgetRef ref) async {
    final created = await showDialog<HabitDraft>(
      context: context,
      builder: (_) => const _HabitFormDialog(title: 'Nuevo hábito'),
    );
    if (created == null) return;
    await ref.read(habitsControllerProvider.notifier).createHabit(
          name: created.name,
          kind: created.kind,
          period: created.period,
          target: created.target,
          color: fallbackHabitColor(created.name),
        );
  }
}

class _ManageRow extends ConsumerWidget {
  const _ManageRow({required this.habit});

  final HabitDefinition habit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.read(habitsControllerProvider.notifier);
    final color =
        habitHexToColor(habit.color ?? fallbackHabitColor(habit.name));

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: color.withValues(alpha: 0.35)),
            ),
            child: Icon(Icons.repeat_rounded, size: 16, color: color),
          ),
          const SizedBox(width: NoraSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  habit.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: habit.archived
                      ? TextStyle(
                          color: NoraColors.muted,
                          decoration: TextDecoration.lineThrough)
                      : null,
                ),
                Text(
                  '${habit.period.name} · meta ${habit.target}',
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: NoraColors.muted),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Editar',
            icon: const Icon(Icons.edit_outlined, size: 19),
            onPressed: () async {
              final updated = await showDialog<HabitDraft>(
                context: context,
                builder: (_) => _HabitFormDialog(
                  title: 'Editar hábito',
                  initial: HabitDraft(
                    name: habit.name,
                    kind: habit.kind,
                    period: habit.period,
                    target: habit.target,
                  ),
                ),
              );
              if (updated == null) return;
              await controller.updateHabit(
                habit.id,
                name: updated.name,
                kind: updated.kind,
                period: updated.period,
                target: updated.target,
              );
            },
          ),
          IconButton(
            tooltip: habit.archived ? 'Restaurar' : 'Archivar',
            icon: Icon(
              habit.archived
                  ? Icons.unarchive_outlined
                  : Icons.archive_outlined,
              size: 19,
            ),
            onPressed: () async {
              await controller.archiveHabit(habit.id,
                  archived: !habit.archived);
            },
          ),
        ],
      ),
    );
  }
}

class HabitDraft {
  const HabitDraft({
    required this.name,
    required this.kind,
    required this.period,
    required this.target,
  });

  final String name;
  final HabitKind kind;
  final HabitPeriod period;
  final int target;
}

class _HabitFormDialog extends StatefulWidget {
  const _HabitFormDialog({required this.title, this.initial});

  final String title;
  final HabitDraft? initial;

  @override
  State<_HabitFormDialog> createState() => _HabitFormDialogState();
}

class _HabitFormDialogState extends State<_HabitFormDialog> {
  late final TextEditingController _name;
  late HabitKind _kind;
  late HabitPeriod _period;
  late int _target;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _name = TextEditingController(text: initial?.name ?? '');
    _kind = initial?.kind ?? HabitKind.positive;
    _period = initial?.period ?? HabitPeriod.daily;
    _target = initial?.target ?? 1;
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _name,
              autofocus: true,
              decoration: const InputDecoration(
                  labelText: 'Nombre', hintText: 'Ej. Meditar 10 min'),
            ),
            const SizedBox(height: NoraSpacing.md),
            SegmentedButton<HabitKind>(
              segments: const [
                ButtonSegment(
                    value: HabitKind.positive, label: Text('Positivo')),
                ButtonSegment(value: HabitKind.negative, label: Text('Evitar')),
              ],
              selected: {_kind},
              onSelectionChanged: (selection) =>
                  setState(() => _kind = selection.first),
            ),
            const SizedBox(height: NoraSpacing.md),
            SegmentedButton<HabitPeriod>(
              segments: const [
                ButtonSegment(value: HabitPeriod.daily, label: Text('Diario')),
                ButtonSegment(
                    value: HabitPeriod.weekly, label: Text('Semanal')),
              ],
              selected: {_period},
              onSelectionChanged: (selection) =>
                  setState(() => _period = selection.first),
            ),
            const SizedBox(height: NoraSpacing.md),
            Row(
              children: [
                const Text('Meta por período:'),
                const Spacer(),
                IconButton(
                  onPressed:
                      _target > 1 ? () => setState(() => _target--) : null,
                  icon: const Icon(Icons.remove_circle_outline_rounded),
                ),
                Text('$_target',
                    style: Theme.of(context).textTheme.titleMedium),
                IconButton(
                  onPressed: () => setState(() => _target++),
                  icon: const Icon(Icons.add_circle_outline_rounded),
                ),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar')),
        FilledButton(
          onPressed: () => Navigator.pop(
            context,
            HabitDraft(
                name: _name.text.trim(),
                kind: _kind,
                period: _period,
                target: _target),
          ),
          child: const Text('Guardar'),
        ),
      ],
    );
  }
}
