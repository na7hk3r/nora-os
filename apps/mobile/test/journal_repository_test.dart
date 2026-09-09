import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/core/plugins/plugin_storage.dart';
import 'package:nora_mobile/core/storage/local_store.dart';
import 'package:nora_mobile/plugins/journal/journal_models.dart';
import 'package:nora_mobile/plugins/journal/journal_repository.dart';

void main() {
  test('saveEntry serializa tags como JSON string, no como List', () async {
    final storage = _RecordingStorage();
    final repository = JournalRepository(storage);

    await repository.saveEntry(
      JournalEntry(
        id: 'jrn-1',
        ownerId: 'user-1',
        date: '2026-09-09',
        mood: 4,
        promptId: 'p-zen',
        title: 'Titulo',
        content: 'Contenido',
        tags: const ['tag1', 'tag 2'],
        wordCount: 2,
        pinned: false,
        createdAt: DateTime(2026, 9, 9),
      ),
    );

    expect(storage.executes, hasLength(1));
    final params = storage.executes.single.parameters;
    expect(params[7], isA<String>(),
        reason: 'el binding SQL de tags debe ser un String JSON, no una List');
    final tagsParam = params[7] as String;
    expect(tagsParam, '["tag1","tag 2"]');
    expect(jsonDecode(tagsParam), ['tag1', 'tag 2']);
  });

  test('listEntries decodifica tags desde un String JSON', () async {
    final storage = _RecordingStorage(rows: [
      {
        'id': 'jrn-1',
        'owner_id': 'user-1',
        'date': '2026-09-09',
        'mood': 4,
        'prompt_id': null,
        'title': 'Titulo',
        'content': 'Contenido',
        'tags': '["tag1","tag 2"]',
        'word_count': 2,
        'pinned': 0,
        'created_at': '2026-09-09T10:00:00.000',
      },
    ]);
    final repository = JournalRepository(storage);

    final entries = await repository.listEntries('user-1');

    expect(entries, hasLength(1));
    expect(entries.single.tags, ['tag1', 'tag 2']);
  });
}

/// Extiende [PluginStorage] sin tocar sqflite en host: sobreescribe
/// `query`/`execute` para capturar argumentos y servir filas simuladas.
class _RecordingStorage extends PluginStorage {
  _RecordingStorage({this.rows = const []})
      : super(
          store: noraLocalStore,
          pluginId: 'journal-test',
          ownerId: () => 'user-1',
        );

  final List<Map<String, Object?>> rows;
  final List<_Executed> executes = [];

  @override
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> parameters = const [],
  ]) async {
    return rows;
  }

  @override
  Future<int> execute(String sql, [List<Object?> parameters = const []]) async {
    executes.add(_Executed(sql, parameters));
    return 1;
  }
}

class _Executed {
  _Executed(this.sql, this.parameters);

  final String sql;
  final List<Object?> parameters;
}