import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/design/nora_colors.dart';
import '../../../core/design/nora_spacing.dart';
import '../../../core/design/widgets/nora_card.dart';
import '../../../core/design/widgets/nora_empty_state.dart';
import '../../../core/design/widgets/nora_error_state.dart';
import '../../../core/design/widgets/nora_panel.dart';
import '../../habits/habits_controller.dart';
import '../../habits/habits_models.dart';
import '../../habits/habits_utils.dart';

/// Historial 30 días: heatmap por hábito activo, espejo móvil del Desktop.
///
/// Una fila por hábito activo, con nombre, 30 celdas (día por día, hoy al
/// final), %30d y racha. El área de celdas scrollea horizontalmente dentro de
/// cada fila para no romper el layout en pantallas angostas.
class HabitsHistoryPage extends ConsumerWidget {
  const HabitsHistoryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncState = ref.watch(habitsControllerProvider);

    return asyncState.when(
      loading: () => const Center(
        child: CircularProgressIndicator(color: NoraColors.accent),
      ),
      error: (error, _) => Center(
        child: NoraErrorState(
          title: 'No se pudo cargar el historial',
          message: 'Hubo un problema al leer los hábitos. Intentá de nuevo.',
          onRetry: () => ref.read(habitsControllerProvider.notifier).load(),
        ),
      ),
      data: (state) {
        final rows = computeHistoryRows(state.definitions, state.logs);
        if (rows.isEmpty) {
          return const NoraEmptyState(
            icon: Icons.calendar_view_month_rounded,
            title: 'Sin hábitos activos todavía',
            message:
                'Cuando registres tus hábitos, acá vas a ver el cumplimiento de los últimos 30 días.',
          );
        }
        return ListView(
          padding: EdgeInsets.zero,
          children: [
            NoraPanel(
              title: 'Historial 30 días',
              child: Text(
                'Cada celda es un día. Más opaco = más cumplimiento.',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: NoraColors.muted),
              ),
            ),
            const SizedBox(height: NoraSpacing.md),
            for (final row in rows) ...[
              _HeatmapRowCard(row: row),
              const SizedBox(height: NoraSpacing.sm),
            ],
          ],
        );
      },
    );
  }
}

class _HeatmapRowCard extends StatelessWidget {
  const _HeatmapRowCard({required this.row});

  final HabitHistoryRow row;

  @override
  Widget build(BuildContext context) {
    final habit = row.habit;
    final color =
        habitHexToColor(habit.color ?? fallbackHabitColor(habit.name));
    final rate = (row.stats.rate30d * 100).round();

    return NoraCard(
      padding: const EdgeInsets.all(NoraSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration:
                    BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              const SizedBox(width: NoraSpacing.sm),
              Expanded(
                child: Text(
                  habit.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
              const SizedBox(width: NoraSpacing.md),
              _Stat(value: '$rate%', label: '30d'),
              const SizedBox(width: NoraSpacing.md),
              _Stat(value: '${row.stats.streak}d', label: 'Racha'),
            ],
          ),
          const SizedBox(height: NoraSpacing.md),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final cell in row.cells)
                  _HeatmapCell(habit: habit, cell: cell, color: color),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeatmapCell extends StatelessWidget {
  const _HeatmapCell({
    required this.habit,
    required this.cell,
    required this.color,
  });

  final HabitDefinition habit;
  final HabitHistoryCell cell;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final day = cell.date.length >= 8 ? cell.date.substring(8) : cell.date;
    final background = cell.intensity > 0
        ? color.withValues(alpha: cell.intensity)
        : Colors.transparent;

    return Semantics(
      label: cell.semanticsLabel(habit.name),
      excludeSemantics: true,
      child: SizedBox(
        width: 20,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              day,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontSize: 9,
                    color: NoraColors.muted,
                  ),
            ),
            const SizedBox(height: 4),
            Container(
              key: ValueKey('heatmap-cell-${habit.id}-${cell.date}'),
              width: 16,
              height: 16,
              decoration: BoxDecoration(
                color: background,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(
                    color: NoraColors.border.withValues(alpha: 0.4)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(value, style: Theme.of(context).textTheme.titleSmall),
        Text(
          label,
          style: Theme.of(context)
              .textTheme
              .labelSmall
              ?.copyWith(color: NoraColors.muted),
        ),
      ],
    );
  }
}