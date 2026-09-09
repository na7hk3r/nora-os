import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/nora_models.dart' show newLocalId, noraDateKey;
import '../../core/plugins/plugin_event_bus.dart';
import '../../core/plugins/plugin_storage.dart';
import '../../core/plugins/plugin_storage_provider.dart';
import '../../features/auth/auth_controller.dart';
import 'journal_events.dart';
import 'journal_models.dart';
import 'journal_repository.dart';

class JournalState {
  const JournalState({this.entries = const [], this.prompts = const []});

  final List<JournalEntry> entries;
  final List<JournalPrompt> prompts;

  JournalEntry? entryFor(String date) {
    for (final entry in entries) {
      if (entry.date == date) return entry;
    }
    return null;
  }
}

final journalControllerProvider =
    StateNotifierProvider<JournalController, AsyncValue<JournalState>>((ref) {
  final ownerId = ref.watch(authControllerProvider).user?.id;
  final storage = ref.watch<PluginStorage>(pluginStorageProvider('journal'));
  return JournalController(JournalRepository(storage), ownerId)..load();
});

/// Controller del plugin Journal. Una entrada por día, prompts con uso
/// trackeado, eventos al guardar/borrar/usar prompt para que el init (XP +
/// métricas) reaccione.
class JournalController extends StateNotifier<AsyncValue<JournalState>> {
  JournalController(this._repository, this._ownerId)
      : super(const AsyncValue.loading());

  final JournalRepository _repository;
  final String? _ownerId;

  Future<void> load() async {
    final ownerId = _ownerId;
    if (ownerId == null) {
      state = const AsyncValue.data(JournalState());
      return;
    }
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final entries = await _repository.listEntries(ownerId);
      final prompts = await _repository.listPrompts(ownerId);
      return JournalState(entries: entries, prompts: prompts);
    });
  }

  /// Guarda (inserta o actualiza) la entrada de la fecha dada. Una por día.
  Future<JournalEntry?> saveEntry({
    required String content,
    String? date,
    int? mood,
    String? promptId,
    String? title,
  }) async {
    final ownerId = _ownerId;
    if (ownerId == null) return null;
    final dateKey = date ?? noraDateKey(DateTime.now());
    final normalizedTitle = title?.trim() ?? '';
    final now = DateTime.now();

    final current = state.valueOrNull ?? const JournalState();
    final existing = current.entryFor(dateKey);
    final wasNew = existing == null;
    final hadMood = existing?.mood != null;

    final entry = existing == null
        ? JournalEntry(
            id: newLocalId('jrn'),
            ownerId: ownerId,
            date: dateKey,
            mood: mood,
            promptId: promptId,
            title: normalizedTitle,
            content: content,
            tags: const [],
            wordCount: content.trim().isEmpty
                ? 0
                : content.trim().split(RegExp(r'\s+')).length,
            pinned: false,
            createdAt: now,
          )
        : existing.copyWith(
            mood: mood ?? existing.mood,
            promptId: promptId ?? existing.promptId,
            title: normalizedTitle.isEmpty ? existing.title : normalizedTitle,
            content: content,
          );

    await _repository.saveEntry(entry);
    final updated = wasNew
        ? [entry, ...current.entries]
        : [
            for (final e in current.entries)
              if (e.id == entry.id) entry else e,
          ];
    state = AsyncValue.data(
        JournalState(entries: updated, prompts: current.prompts));

    _emit(wasNew ? JournalEvents.entryCreated : JournalEvents.entryUpdated,
        {'id': entry.id, 'date': dateKey});
    if (mood != null && !hadMood) {
      _emit(JournalEvents.moodLogged,
          {'id': entry.id, 'date': dateKey, 'mood': mood});
    }
    return entry;
  }

  Future<void> deleteEntry(String id) async {
    final current = state.valueOrNull;
    if (current == null) return;
    await _repository.deleteEntry(id);
    state = AsyncValue.data(
      JournalState(
        entries: current.entries.where((e) => e.id != id).toList(),
        prompts: current.prompts,
      ),
    );
    _emit(JournalEvents.entryDeleted, {'id': id});
  }

  /// Restaura una entrada borrada (undo): re-guarda el registro completo con
  /// su id original para mantener fecha, tags, pinned y createdAt intactos.
  /// No otorga XP (ya otorgada antes del borrado) pero sí refresca métricas vía
  /// [JournalEvents.entryRestored].
  Future<void> restoreEntry(JournalEntry entry) async {
    final current = state.valueOrNull;
    if (current == null) return;
    await _repository.saveEntry(entry);
    final entries = [...current.entries, entry]
      ..sort((a, b) {
        final byDate = b.date.compareTo(a.date);
        return byDate != 0 ? byDate : b.createdAt.compareTo(a.createdAt);
      });
    state = AsyncValue.data(
      JournalState(entries: entries, prompts: current.prompts),
    );
    _emit(JournalEvents.entryRestored, {'id': entry.id, 'date': entry.date});
  }

  /// Registra el uso de un prompt (lo persiste y emite `JOURNAL_PROMPT_USED`).
  /// El id se scopea por owner (`<owner>:<promptId>`) para que el PK global
  /// de `journal_prompts` no colisione entre usuarios locales.
  Future<void> usePrompt(String promptId, String text) async {
    final ownerId = _ownerId;
    final current = state.valueOrNull;
    if (ownerId == null || current == null) return;

    final scopedId = '$ownerId:$promptId';
    JournalPrompt? existing;
    for (final prompt in current.prompts) {
      if (prompt.id == scopedId) {
        existing = prompt;
        break;
      }
    }
    final prompt = existing == null
        ? JournalPrompt(
            id: scopedId,
            ownerId: ownerId,
            text: text,
            isCustom: false,
            createdAt: DateTime.now(),
            usedAt: DateTime.now(),
            timesUsed: 1,
          )
        : existing.copyWith(
            usedAt: DateTime.now(), timesUsed: existing.timesUsed + 1);

    await _repository.savePrompt(prompt);
    state = AsyncValue.data(
      JournalState(
        entries: current.entries,
        prompts: [
          for (final p in current.prompts)
            if (p.id == scopedId) prompt else p,
          if (existing == null) prompt,
        ],
      ),
    );
    _emit(JournalEvents.promptUsed, {'promptId': promptId});
  }

  void _emit(String event, Map<String, Object?> payload) {
    NoraEventBus.instance.emit(event, payload, source: 'journal');
  }
}
