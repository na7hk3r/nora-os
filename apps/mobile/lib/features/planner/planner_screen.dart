import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/design/nora_colors.dart';
import '../../core/design/nora_spacing.dart';
import '../../core/design/widgets/nora_card.dart';
import '../../core/design/widgets/nora_fab.dart';
import '../../core/design/widgets/nora_panel.dart';
import '../../core/models/nora_models.dart';
import '../create/create_sheet.dart';
import 'planner_controller.dart';

class PlannerScreen extends ConsumerStatefulWidget {
  const PlannerScreen({super.key});

  @override
  ConsumerState<PlannerScreen> createState() => _PlannerScreenState();
}

class _PlannerScreenState extends ConsumerState<PlannerScreen> {
  late DateTime _selectedDate;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedDate = DateTime(now.year, now.month, now.day);
  }

  @override
  Widget build(BuildContext context) {
    final plannerState = ref.watch(plannerControllerProvider);

    return Stack(
      children: [
        plannerState.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stackTrace) => Center(child: Text('No se pudo cargar el planner.')),
          data: (items) {
            final selectedKey = noraDateKey(_selectedDate);
            final selectedItems = items.where((item) => item.date == selectedKey).toList()
              ..sort((a, b) => (a.startMinute ?? 9999).compareTo(b.startMinute ?? 9999));

            return ListView(
              children: [
                _WeekStrip(
                  selectedDate: _selectedDate,
                  onSelected: (date) => setState(() => _selectedDate = date),
                ),
                const SizedBox(height: NoraSpacing.lg),
                NoraPanel(
                  title: _longDateLabel(_selectedDate),
                  trailing: TextButton(
                    onPressed: () {
                      final today = DateTime.now();
                      setState(() => _selectedDate = DateTime(today.year, today.month, today.day));
                    },
                    child: const Text('Hoy'),
                  ),
                  child: selectedItems.isEmpty
                      ? const _PlannerEmpty()
                      : Column(
                          children: selectedItems.map((item) {
                            return _TimelineItem(item: item);
                          }).toList(),
                        ),
                ),
                const SizedBox(height: 108),
              ],
            );
          },
        ),
        Positioned(
          right: 4,
          bottom: 18,
          child: NoraFAB(
            tooltip: 'Crear en Planner',
            onPressed: () => showNoraCreateSheet(context),
          ),
        ),
      ],
    );
  }

  String _longDateLabel(DateTime date) {
    const weekdays = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return '${weekdays[date.weekday - 1]} ${date.day} de ${months[date.month - 1]}';
  }
}

class _WeekStrip extends StatelessWidget {
  const _WeekStrip({
    required this.selectedDate,
    required this.onSelected,
  });

  final DateTime selectedDate;
  final ValueChanged<DateTime> onSelected;

  @override
  Widget build(BuildContext context) {
    final start = selectedDate.subtract(Duration(days: selectedDate.weekday - 1));
    final days = List.generate(7, (index) => start.add(Duration(days: index)));
    const labels = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];

    return SizedBox(
      height: 86,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: days.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final day = days[index];
          final selected = noraDateKey(day) == noraDateKey(selectedDate);
          return GestureDetector(
            onTap: () => onSelected(day),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 56,
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: selected ? NoraColors.accent : NoraColors.surfaceLight.withValues(alpha: 0.72),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: selected ? NoraColors.accentLight.withValues(alpha: 0.42) : NoraColors.border,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    labels[index],
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: selected ? Colors.white : NoraColors.muted,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${day.day}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _TimelineItem extends ConsumerWidget {
  const _TimelineItem({required this.item});

  final PlannerItem item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final color = _priorityColor(item.priority);

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 54,
            child: Padding(
              padding: const EdgeInsets.only(top: 18),
              child: Text(
                formatMinutes(item.startMinute).isEmpty ? '--:--' : formatMinutes(item.startMinute),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
              ),
            ),
          ),
          Container(
            width: 2,
            height: 94,
            margin: const EdgeInsets.only(right: 12),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          Expanded(
            child: NoraCard(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                decoration: item.isCompleted ? TextDecoration.lineThrough : null,
                              ),
                        ),
                      ),
                      IconButton(
                        tooltip: item.isCompleted ? 'Marcar pendiente' : 'Completar',
                        onPressed: () => ref.read(plannerControllerProvider.notifier).toggleComplete(item),
                        icon: Icon(
                          item.isCompleted ? Icons.check_circle_rounded : Icons.circle_outlined,
                          color: item.isCompleted ? NoraColors.success : NoraColors.muted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: NoraSpacing.xs),
                  Text(
                    '${formatMinutes(item.startMinute)} - ${formatMinutes(item.endMinute)}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
                  ),
                  const SizedBox(height: NoraSpacing.sm),
                  Wrap(
                    spacing: 8,
                    children: [
                      _Tag(label: item.category, color: NoraColors.info),
                      _Tag(label: item.kind.label, color: NoraColors.accentLight),
                      _Tag(label: item.priority.label, color: color),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _priorityColor(NoraPriority priority) {
    switch (priority) {
      case NoraPriority.high:
        return NoraColors.danger;
      case NoraPriority.medium:
        return NoraColors.accent;
      case NoraPriority.low:
        return NoraColors.success;
    }
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(color: color),
      ),
    );
  }
}

class _PlannerEmpty extends StatelessWidget {
  const _PlannerEmpty();

  @override
  Widget build(BuildContext context) {
    return NoraCard(
      glass: false,
      child: Column(
        children: [
          const Icon(Icons.calendar_today_outlined, color: NoraColors.muted),
          const SizedBox(height: NoraSpacing.sm),
          Text('Dia vacio', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: NoraSpacing.xs),
          Text(
            'Agrega una tarea o bloque de foco al planner.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
          ),
        ],
      ),
    );
  }
}
