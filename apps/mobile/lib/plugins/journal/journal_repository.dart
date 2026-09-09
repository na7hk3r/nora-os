import 'dart:convert';

import '../../core/plugins/plugin_storage.dart';
import 'journal_models.dart';

/// Repositorio del plugin Journal sobre [PluginStorage] (mismo bridge que
/// `api.storage`). Todo filtrado por `owner_id` — contrato de Mobile.
class JournalRepository {
  JournalRepository(this._storage);

  final PluginStorage _storage;

  Future<List<JournalEntry>> listEntries(String ownerId) async {
    final rows = await _storage.query(
      'SELECT * FROM journal_entries WHERE owner_id = ? ORDER BY date DESC, created_at DESC',
      [ownerId],
    );
    return rows.map(JournalEntry.fromRow).toList();
  }

  Future<void> saveEntry(JournalEntry entry) async {
    await _storage.execute(
      '''INSERT OR REPLACE INTO journal_entries
         (id, owner_id, date, mood, prompt_id, title, content, tags, word_count, pinned, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
      [
        entry.id,
        entry.ownerId,
        entry.date,
        entry.mood,
        entry.promptId,
        entry.title,
        entry.content,
        jsonEncode(entry.tags),
        entry.wordCount,
        entry.pinned ? 1 : 0,
        entry.createdAt.toIso8601String(),
      ],
    );
  }

  Future<void> deleteEntry(String id) async {
    await _storage.execute('DELETE FROM journal_entries WHERE id = ?', [id]);
  }

  Future<List<JournalPrompt>> listPrompts(String ownerId) async {
    final rows = await _storage.query(
      'SELECT * FROM journal_prompts WHERE owner_id = ? ORDER BY times_used DESC, created_at ASC',
      [ownerId],
    );
    return rows.map(JournalPrompt.fromRow).toList();
  }

  Future<void> savePrompt(JournalPrompt prompt) async {
    await _storage.execute(
      '''INSERT OR REPLACE INTO journal_prompts
         (id, owner_id, text, is_custom, created_at, used_at, times_used)
         VALUES (?, ?, ?, ?, ?, ?, ?)''',
      [
        prompt.id,
        prompt.ownerId,
        prompt.text,
        prompt.isCustom ? 1 : 0,
        prompt.createdAt.toIso8601String(),
        prompt.usedAt?.toIso8601String(),
        prompt.timesUsed,
      ],
    );
  }
}
