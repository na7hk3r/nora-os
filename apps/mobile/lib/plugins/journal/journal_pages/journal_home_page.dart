import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/design/nora_colors.dart';
import '../../../core/design/nora_spacing.dart';
import '../../../core/design/widgets/nora_button.dart';
import '../../../core/design/widgets/nora_card.dart';
import '../../../core/design/widgets/nora_input.dart';
import '../journal_controller.dart';
import '../journal_models.dart';

/// Página principal del plugin Journal: entrada de hoy + entradas recientes.
class JournalHomePage extends ConsumerWidget {
  const JournalHomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(journalControllerProvider);

    return state.when(
      loading: () => const Center(
        child: CircularProgressIndicator(color: NoraColors.accent),
      ),
      error: (error, _) => Center(
        child: Text('No se pudo cargar el diario.',
            style: Theme.of(context).textTheme.bodyMedium),
      ),
      data: (data) {
        final today = _todayKey();
        final todayEntry = data.entryFor(today);
        final recent =
            data.entries.where((entry) => entry.date != today).take(5).toList();
        return ListView(
          padding: EdgeInsets.zero,
          children: [
            _StatsStrip(entries: data.entries),
            const SizedBox(height: NoraSpacing.lg),
            _TodayEntryCard(entry: todayEntry),
            if (recent.isNotEmpty) ...[
              const SizedBox(height: NoraSpacing.xl),
              Text('Recientes', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: NoraSpacing.md),
              for (final entry in recent) ...[
                _RecentTile(entry: entry),
                const SizedBox(height: NoraSpacing.sm),
              ],
            ],
            const SizedBox(height: NoraSpacing.sm),
            NoraButton(
              label: 'Ver historial completo',
              variant: NoraButtonVariant.secondary,
              expand: true,
              icon: Icons.history_rounded,
              onPressed: () => context.go('/plugins/journal/history'),
            ),
          ],
        );
      },
    );
  }

  String _todayKey() {
    final now = DateTime.now();
    return '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }
}

class _StatsStrip extends StatelessWidget {
  const _StatsStrip({required this.entries});

  final List<JournalEntry> entries;

  @override
  Widget build(BuildContext context) {
    final stats = computeJournalStats(entries);
    return Row(
      children: [
        _StatChip(
            icon: Icons.local_fire_department_outlined,
            value: '${stats.currentStreak}',
            label: 'racha'),
        const SizedBox(width: NoraSpacing.sm),
        _StatChip(
            icon: Icons.article_outlined,
            value: '${stats.totalEntries}',
            label: 'entradas'),
        const SizedBox(width: NoraSpacing.sm),
        _StatChip(
          icon: Icons.mood_outlined,
          value:
              stats.avgMood == null ? '—' : stats.avgMood!.toStringAsFixed(1),
          label: 'mood',
        ),
      ],
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip(
      {required this.icon, required this.value, required this.label});

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: NoraCard(
        padding: const EdgeInsets.symmetric(
            vertical: NoraSpacing.md, horizontal: NoraSpacing.sm),
        child: Column(
          children: [
            Icon(icon, size: 18, color: NoraColors.accentLight),
            const SizedBox(height: 4),
            Text(value, style: Theme.of(context).textTheme.titleMedium),
            Text(
              label,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: NoraColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}

class _TodayEntryCard extends ConsumerStatefulWidget {
  const _TodayEntryCard({required this.entry});

  final JournalEntry? entry;

  @override
  ConsumerState<_TodayEntryCard> createState() => _TodayEntryCardState();
}

class _TodayEntryCardState extends ConsumerState<_TodayEntryCard> {
  late final TextEditingController _contentController;
  int? _mood;
  BuiltinPrompt? _activePrompt;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _contentController =
        TextEditingController(text: widget.entry?.content ?? '');
    _mood = widget.entry?.mood;
    _pickPrompt();
  }

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  void _pickPrompt() {
    if (kBuiltinPrompts.isEmpty) return;
    final random = math.Random().nextInt(kBuiltinPrompts.length);
    _activePrompt = kBuiltinPrompts[random];
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final content = _contentController.text.trim();
    final prompt = _activePrompt;
    final controller = ref.read(journalControllerProvider.notifier);
    await controller.saveEntry(
      content: content,
      mood: _mood,
      promptId: prompt?.id,
    );
    if (prompt != null) {
      await controller.usePrompt(prompt.id, prompt.text);
    }
    if (mounted) {
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Entrada guardada')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasContent = _contentController.text.trim().isNotEmpty;
    final saved = widget.entry;

    return NoraCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('Hoy', style: Theme.of(context).textTheme.titleLarge),
              const Spacer(),
              if (saved != null && saved.content.isNotEmpty)
                Text(
                  'Guardado ✓',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: NoraColors.success),
                ),
            ],
          ),
          const SizedBox(height: NoraSpacing.md),
          Row(
            children: [
              for (var mood = 1; mood <= 5; mood++) ...[
                _MoodButton(
                  value: mood,
                  selected: _mood == mood,
                  onTap: () => setState(() => _mood = mood),
                ),
                if (mood < 5) const SizedBox(width: 4),
              ],
            ],
          ),
          const SizedBox(height: NoraSpacing.lg),
          Row(
            children: [
              Expanded(
                child: Text(
                  _activePrompt?.text ?? '',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: NoraColors.accentLight,
                      fontStyle: FontStyle.italic),
                ),
              ),
              IconButton(
                tooltip: 'Cambiar prompt',
                onPressed: () => setState(_pickPrompt),
                icon: const Icon(Icons.shuffle_rounded, size: 20),
              ),
            ],
          ),
          const SizedBox(height: NoraSpacing.sm),
          NoraInput(
            controller: _contentController,
            hint: 'Escribí lo que quieras recordar de hoy...',
            maxLines: 5,
            icon: Icons.edit_note_rounded,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: NoraSpacing.md),
          NoraButton(
            label: hasContent ? 'Guardar entrada' : 'Guardar solo mood',
            expand: true,
            onPressed: _saving ? null : _save,
          ),
        ],
      ),
    );
  }
}

class _MoodButton extends StatelessWidget {
  const _MoodButton(
      {required this.value, required this.selected, required this.onTap});

  final int value;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 40,
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected
              ? NoraColors.accent.withValues(alpha: 0.5)
              : NoraColors.surfaceLight,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? NoraColors.accentLight : NoraColors.border,
          ),
        ),
        child: Text(
          kMoodEmoji[value - 1],
          style: const TextStyle(fontSize: 18),
        ),
      ),
    );
  }
}

class _RecentTile extends StatelessWidget {
  const _RecentTile({required this.entry});

  final JournalEntry entry;

  @override
  Widget build(BuildContext context) {
    return NoraCard(
      padding: const EdgeInsets.all(NoraSpacing.md),
      onTap: () => showJournalEntrySheet(context, entry),
      child: Row(
        children: [
          if (entry.mood != null)
            Text(kMoodEmoji[entry.mood! - 1],
                style: const TextStyle(fontSize: 20))
          else
            const Icon(Icons.edit_note_rounded,
                color: NoraColors.muted, size: 20),
          const SizedBox(width: NoraSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.title.isEmpty ? _friendlyDate(entry.date) : entry.title,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                Text(
                  _excerpt(entry.content),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: NoraColors.muted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Sheet de detalle/edición de una entrada existente (reutilizada por el
/// historial).
void showJournalEntrySheet(BuildContext context, JournalEntry entry) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: NoraColors.surface,
    builder: (_) => _EntryDetailSheet(entry: entry),
  );
}

class _EntryDetailSheet extends ConsumerStatefulWidget {
  const _EntryDetailSheet({required this.entry});

  final JournalEntry entry;

  @override
  ConsumerState<_EntryDetailSheet> createState() => _EntryDetailSheetState();
}

class _EntryDetailSheetState extends ConsumerState<_EntryDetailSheet> {
  late final TextEditingController _contentController;

  @override
  void initState() {
    super.initState();
    _contentController = TextEditingController(text: widget.entry.content);
  }

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final entry = widget.entry;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          NoraSpacing.lg,
          NoraSpacing.lg,
          NoraSpacing.lg,
          NoraSpacing.lg + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(_friendlyDate(entry.date),
                    style: Theme.of(context).textTheme.titleLarge),
                const Spacer(),
                if (entry.mood != null)
                  Text(kMoodEmoji[entry.mood! - 1],
                      style: const TextStyle(fontSize: 22)),
              ],
            ),
            const SizedBox(height: NoraSpacing.lg),
            NoraInput(
              controller: _contentController,
              maxLines: 6,
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: NoraSpacing.md),
            Row(
              children: [
                Expanded(
                  child: NoraButton(
                    label: 'Guardar',
                    onPressed: () async {
                      await ref
                          .read(journalControllerProvider.notifier)
                          .saveEntry(
                            content: _contentController.text.trim(),
                            date: entry.date,
                            title: entry.title,
                          );
                      if (context.mounted) Navigator.of(context).pop();
                    },
                  ),
                ),
                const SizedBox(width: NoraSpacing.sm),
                IconButton(
                  tooltip: 'Eliminar entrada',
                  onPressed: () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (dialogContext) => AlertDialog(
                        title: const Text('¿Eliminar entrada?'),
                        content:
                            const Text('La entrada se borrará permanentemente.'),
                        actions: [
                          TextButton(
                            onPressed: () =>
                                Navigator.pop(dialogContext, false),
                            child: const Text('Cancelar'),
                          ),
                          FilledButton(
                            style: FilledButton.styleFrom(
                                backgroundColor: NoraColors.danger),
                            onPressed: () =>
                                Navigator.pop(dialogContext, true),
                            child: const Text('Eliminar'),
                          ),
                        ],
                      ),
                    );
                    if (confirmed != true) return;
                    final controller =
                        ref.read(journalControllerProvider.notifier);
                    final snapshot = widget.entry;
                    await controller.deleteEntry(snapshot.id);
                    if (!context.mounted) return;
                    Navigator.of(context).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: const Text('Entrada eliminada'),
                        action: SnackBarAction(
                          label: 'Deshacer',
                          onPressed: () =>
                              controller.restoreEntry(snapshot),
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.delete_outline,
                      color: NoraColors.danger),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

const kMoodEmoji = ['😖', '😕', '😐', '🙂', '😄'];

String _excerpt(String content) {
  final clean = content.trim().replaceAll(RegExp(r'\s+'), ' ');
  return clean.length > 60 ? '${clean.substring(0, 60)}…' : clean;
}

String _friendlyDate(String dateKey) {
  final parts = dateKey.split('-');
  final date =
      DateTime(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  return '${date.day} ${months[date.month - 1]} ${date.year}';
}
