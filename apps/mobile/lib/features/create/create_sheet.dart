import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/nora_colors.dart';
import '../../core/design/nora_spacing.dart';
import '../../core/design/widgets/nora_button.dart';
import '../../core/design/widgets/nora_input.dart';
import '../../core/models/nora_models.dart';
import '../planner/planner_controller.dart';
import '../tasks/tasks_controller.dart';

Future<void> showNoraCreateSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => const _CreateSheetContent(),
  );
}

enum _CreateMode { task, planner }

class _CreateSheetContent extends ConsumerStatefulWidget {
  const _CreateSheetContent();

  @override
  ConsumerState<_CreateSheetContent> createState() => _CreateSheetContentState();
}

class _CreateSheetContentState extends ConsumerState<_CreateSheetContent> {
  final _titleController = TextEditingController();
  final _noteController = TextEditingController();
  _CreateMode _mode = _CreateMode.task;
  NoraPriority _priority = NoraPriority.medium;

  @override
  void dispose() {
    _titleController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: NoraColors.border,
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
          const SizedBox(height: NoraSpacing.lg),
          Text('Crear en Nora OS', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: NoraSpacing.md),
          SegmentedButton<_CreateMode>(
            segments: const [
              ButtonSegment(
                value: _CreateMode.task,
                label: Text('Tarea'),
                icon: Icon(Icons.check_circle_outline_rounded),
              ),
              ButtonSegment(
                value: _CreateMode.planner,
                label: Text('Planner'),
                icon: Icon(Icons.calendar_month_outlined),
              ),
            ],
            selected: {_mode},
            onSelectionChanged: (value) => setState(() => _mode = value.first),
          ),
          const SizedBox(height: NoraSpacing.lg),
          NoraInput(
            controller: _titleController,
            label: 'Titulo',
            hint: _mode == _CreateMode.task ? 'Ej: revisar feedback' : 'Ej: bloque de foco',
            icon: Icons.edit_note_rounded,
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: NoraSpacing.md),
          NoraInput(
            controller: _noteController,
            label: 'Nota',
            hint: 'Contexto breve para tu sistema',
            icon: Icons.subject_rounded,
            maxLines: 2,
          ),
          const SizedBox(height: NoraSpacing.md),
          Wrap(
            spacing: 8,
            children: NoraPriority.values.map((priority) {
              return ChoiceChip(
                label: Text(priority.label),
                selected: _priority == priority,
                onSelected: (_) => setState(() => _priority = priority),
              );
            }).toList(),
          ),
          const SizedBox(height: NoraSpacing.xl),
          NoraButton(
            label: _mode == _CreateMode.task ? 'Crear tarea' : 'Crear en Planner',
            icon: Icons.add_rounded,
            expand: true,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;

    final today = noraDateKey(DateTime.now());
    if (_mode == _CreateMode.task) {
      await ref.read(tasksControllerProvider.notifier).addTask(
            title: title,
            priority: _priority,
            dueDate: today,
            note: _noteController.text,
          );
      if (!mounted) return;
      context.pop();
      context.go('/tasks');
      return;
    }

    await ref.read(plannerControllerProvider.notifier).addItem(
          title: title,
          date: today,
          kind: PlannerKind.task,
          category: 'Personal',
          priority: _priority,
          startMinute: 9 * 60,
          endMinute: 10 * 60,
          note: _noteController.text,
        );
    if (!mounted) return;
    context.pop();
    context.go('/planner');
  }
}
