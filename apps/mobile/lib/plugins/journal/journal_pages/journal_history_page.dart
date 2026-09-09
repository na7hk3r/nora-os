import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/design/nora_colors.dart';
import '../../../core/design/nora_spacing.dart';
import '../../../core/design/widgets/nora_card.dart';
import '../../../core/design/widgets/nora_empty_state.dart';
import '../journal_controller.dart';
import '../journal_models.dart';
import 'journal_home_page.dart' show kMoodEmoji, showJournalEntrySheet;

/// Historial de entradas del Journal, ordenado por fecha desc.
class JournalHistoryPage extends ConsumerWidget {
  const JournalHistoryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(journalControllerProvider);

    return state.when(
      loading: () => const Center(
        child: CircularProgressIndicator(color: NoraColors.accent),
      ),
      error: (error, _) => Center(
        child: Text('No se pudo cargar el historial.',
            style: Theme.of(context).textTheme.bodyMedium),
      ),
      data: (data) {
        if (data.entries.isEmpty) {
          return const NoraEmptyState(
            icon: Icons.article_outlined,
            title: 'Sin entradas todavía',
            message:
                'Cuando escribas tu primer día, el historial va a aparecer acá.',
          );
        }
        return ListView.separated(
          padding: EdgeInsets.zero,
          itemCount: data.entries.length,
          separatorBuilder: (_, __) => const SizedBox(height: NoraSpacing.sm),
          itemBuilder: (context, index) {
            final entry = data.entries[index];
            return _HistoryTile(entry: entry);
          },
        );
      },
    );
  }
}

class _HistoryTile extends StatelessWidget {
  const _HistoryTile({required this.entry});

  final JournalEntry entry;

  @override
  Widget build(BuildContext context) {
    return NoraCard(
      padding: const EdgeInsets.all(NoraSpacing.md),
      onTap: () => showJournalEntrySheet(context, entry),
      child: Row(
        children: [
          if (entry.mood != null)
            Text(_moodEmoji(entry.mood!), style: const TextStyle(fontSize: 22))
          else
            const Icon(Icons.edit_note_rounded,
                color: NoraColors.muted, size: 22),
          const SizedBox(width: NoraSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _friendlyDate(entry.date),
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                Text(
                  _excerpt(entry.content),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: NoraColors.muted),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: NoraColors.muted),
        ],
      ),
    );
  }
}

String _moodEmoji(int mood) => kMoodEmoji[mood.clamp(1, 5) - 1];

String _excerpt(String content) {
  final clean = content.trim().replaceAll(RegExp(r'\s+'), ' ');
  return clean.length > 80 ? '${clean.substring(0, 80)}…' : clean;
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
