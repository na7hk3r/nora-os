/// Tipos del plugin Journal.
///
/// Filosofía:
///  - Una entrada por día, como un diario real.
///  - Mood opcional (1..5, 1 = pésimo, 5 = excelente).
///  - Tags libres. Sin catálogos cerrados.
///  - Prompts: preguntas orientadoras (definidas por el plugin y el usuario).
library;

class JournalEntry {
  const JournalEntry({
    required this.id,
    required this.ownerId,
    required this.date,
    required this.mood,
    required this.promptId,
    required this.title,
    required this.content,
    required this.tags,
    required this.wordCount,
    required this.pinned,
    required this.createdAt,
  });

  final String id;
  final String ownerId;

  /// YYYY-MM-DD. Una entrada por día por owner (UNIQUE(owner_id, date)).
  final String date;
  final int? mood;
  final String? promptId;
  final String title;
  final String content;
  final List<String> tags;
  final int wordCount;
  final bool pinned;
  final DateTime createdAt;

  JournalEntry copyWith({
    int? mood,
    String? promptId,
    String? title,
    String? content,
    List<String>? tags,
    bool? pinned,
  }) {
    final newContent = content ?? this.content;
    return JournalEntry(
      id: id,
      ownerId: ownerId,
      date: date,
      mood: mood ?? this.mood,
      promptId: promptId ?? this.promptId,
      title: title ?? this.title,
      content: newContent,
      tags: tags ?? this.tags,
      wordCount: newContent.trim().isEmpty
          ? 0
          : newContent.trim().split(RegExp(r'\s+')).length,
      pinned: pinned ?? this.pinned,
      createdAt: createdAt,
    );
  }

  Map<String, Object?> toRow() {
    return {
      'id': id,
      'owner_id': ownerId,
      'date': date,
      'mood': mood,
      'prompt_id': promptId,
      'title': title,
      'content': content,
      'tags': _encodeTags(tags),
      'word_count': wordCount,
      'pinned': pinned ? 1 : 0,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory JournalEntry.fromRow(Map<String, Object?> row) {
    final content = row['content'] as String? ?? '';
    return JournalEntry(
      id: row['id'] as String,
      ownerId: row['owner_id'] as String,
      date: row['date'] as String,
      mood: row['mood'] as int?,
      promptId: row['prompt_id'] as String?,
      title: row['title'] as String? ?? '',
      content: content,
      tags: _decodeTags(row['tags'] as String?),
      wordCount: (row['word_count'] as int?) ?? 0,
      pinned: ((row['pinned'] as int?) ?? 0) == 1,
      createdAt: DateTime.tryParse(row['created_at'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  static String _encodeTags(List<String> tags) {
    final buffer = StringBuffer('[');
    for (var i = 0; i < tags.length; i++) {
      if (i > 0) buffer.write(',');
      buffer.write('"${tags[i].replaceAll('"', '\\"')}"');
    }
    buffer.write(']');
    return buffer.toString();
  }

  static List<String> _decodeTags(String? raw) {
    if (raw == null || raw.isEmpty || raw == '[]') return const [];
    return raw
        .replaceAll('[', '')
        .replaceAll(']', '')
        .split(',')
        .map((t) => t.trim().replaceAll('"', ''))
        .where((t) => t.isNotEmpty)
        .toList();
  }
}

class JournalPrompt {
  const JournalPrompt({
    required this.id,
    required this.ownerId,
    required this.text,
    required this.isCustom,
    required this.createdAt,
    required this.usedAt,
    required this.timesUsed,
  });

  final String id;
  final String ownerId;
  final String text;
  final bool isCustom;
  final DateTime createdAt;
  final DateTime? usedAt;
  final int timesUsed;

  JournalPrompt copyWith({DateTime? usedAt, int? timesUsed}) {
    return JournalPrompt(
      id: id,
      ownerId: ownerId,
      text: text,
      isCustom: isCustom,
      createdAt: createdAt,
      usedAt: usedAt ?? this.usedAt,
      timesUsed: timesUsed ?? this.timesUsed,
    );
  }

  Map<String, Object?> toRow() {
    return {
      'id': id,
      'owner_id': ownerId,
      'text': text,
      'is_custom': isCustom ? 1 : 0,
      'created_at': createdAt.toIso8601String(),
      'used_at': usedAt?.toIso8601String(),
      'times_used': timesUsed,
    };
  }

  factory JournalPrompt.fromRow(Map<String, Object?> row) {
    return JournalPrompt(
      id: row['id'] as String,
      ownerId: row['owner_id'] as String,
      text: row['text'] as String,
      isCustom: ((row['is_custom'] as int?) ?? 0) == 1,
      createdAt: DateTime.tryParse(row['created_at'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      usedAt: DateTime.tryParse(row['used_at'] as String? ?? ''),
      timesUsed: (row['times_used'] as int?) ?? 0,
    );
  }
}

/// Prompt built-in del plugin. No se persisten hasta que el usuario los usa.
class BuiltinPrompt {
  const BuiltinPrompt(
      {required this.id, required this.category, required this.text});

  final String id;
  final String category;
  final String text;
}

const List<BuiltinPrompt> kBuiltinPrompts = [
  BuiltinPrompt(id: 'p-zen', category: 'mind', text: '¿Qué me trajo paz hoy?'),
  BuiltinPrompt(
      id: 'p-journal', category: 'mind', text: '¿Qué quiero recordar de hoy?'),
  BuiltinPrompt(
      id: 'p-stream',
      category: 'stream',
      text: '¿Qué me está ocupando la cabeza?'),
  BuiltinPrompt(
      id: 'p-gratitude-3',
      category: 'gratitude',
      text: '¿Qué 3 cosas agradezco hoy?'),
  BuiltinPrompt(id: 'p-lesson', category: 'learn', text: '¿Qué aprendí hoy?'),
  BuiltinPrompt(
      id: 'p-tomorrow', category: 'plan', text: '¿Qué quiero lograr mañana?'),
  BuiltinPrompt(
      id: 'p-focus', category: 'focus', text: '¿Dónde puse mi atención hoy?'),
  BuiltinPrompt(
      id: 'p-mood',
      category: 'mind',
      text: '¿Cómo estuvo mi energía hoy de 1 a 5?'),
  BuiltinPrompt(
      id: 'p-rest', category: 'selfcare', text: '¿Cómo cuidé mi descanso hoy?'),
  BuiltinPrompt(
      id: 'p-friction', category: 'learn', text: '¿Qué me costó hoy?'),
  BuiltinPrompt(
      id: 'p-best',
      category: 'mind',
      text: '¿Cuál fue el mejor momento de hoy?'),
  BuiltinPrompt(
      id: 'p-tiny',
      category: 'gratitude',
      text: '¿Qué cosa chica salió bien hoy?'),
  BuiltinPrompt(
      id: 'p-learning',
      category: 'learn',
      text: '¿Qué idea me dejó pensando hoy?'),
  BuiltinPrompt(
      id: 'p-satisfaction',
      category: 'mind',
      text: '¿Qué tan satisfecho estuve hoy con mi día?'),
  BuiltinPrompt(
      id: 'p-release', category: 'selfcare', text: '¿De qué me quiero soltar?'),
  BuiltinPrompt(
      id: 'p-energy', category: 'selfcare', text: '¿Qué me dio energía hoy?'),
  BuiltinPrompt(id: 'p-blocker', category: 'stream', text: '¿Qué me bloquea?'),
  BuiltinPrompt(
      id: 'p-recharge',
      category: 'selfcare',
      text: '¿Qué voy a hacer para recargar?'),
  BuiltinPrompt(id: 'p-progress', category: 'plan', text: '¿Qué avancé hoy?'),
  BuiltinPrompt(
      id: 'p-blocks',
      category: 'plan',
      text: '¿Qué pensé/decidí en mis bloques de foco?'),
  BuiltinPrompt(
      id: 'p-share',
      category: 'social',
      text: '¿A quién quiero contarle algo hoy?'),
  BuiltinPrompt(
      id: 'p-honesty', category: 'mind', text: '¿Qué no me estoy diciendo?'),
  BuiltinPrompt(
      id: 'p-window', category: 'mind', text: '¿Qué abrí y qué cerré hoy?'),
  BuiltinPrompt(
      id: 'p-discipline',
      category: 'mind',
      text: '¿Dónde usé disciplina y dónde fluí?'),
  BuiltinPrompt(
      id: 'p-plan-check',
      category: 'plan',
      text: '¿Qué haría distinto mañana?'),
  BuiltinPrompt(
      id: 'p-pattern', category: 'learn', text: '¿Qué patrón noté hoy?'),
  BuiltinPrompt(
      id: 'p-courage',
      category: 'mind',
      text: '¿Qué momento de coraje tuve hoy?'),
  BuiltinPrompt(id: 'p-identity', category: 'mind', text: '¿Quién fui hoy?'),
  BuiltinPrompt(
      id: 'p-still', category: 'mind', text: '¿Cuándo estuve quieto hoy?'),
  BuiltinPrompt(
      id: 'p-build', category: 'plan', text: '¿Qué estoy construyendo?'),
];

class JournalStats {
  const JournalStats({
    required this.totalEntries,
    required this.currentStreak,
    required this.bestStreak,
    required this.totalWords,
    required this.avgMood,
  });

  final int totalEntries;
  final int currentStreak;
  final int bestStreak;
  final int totalWords;
  final double? avgMood;
}

/// Calcula estadísticas del Journal.
JournalStats computeJournalStats(List<JournalEntry> entries,
    {DateTime? today}) {
  if (entries.isEmpty) {
    return const JournalStats(
      totalEntries: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalWords: 0,
      avgMood: null,
    );
  }
  final dates = entries.map((e) => e.date).toSet();
  final reference = today ?? DateTime.now();
  final todayKey =
      '${reference.year.toString().padLeft(4, '0')}-${reference.month.toString().padLeft(2, '0')}-${reference.day.toString().padLeft(2, '0')}';

  var current = 0;
  var cursor = DateTime(reference.year, reference.month, reference.day);
  if (!dates.contains(todayKey)) {
    cursor = cursor.subtract(const Duration(days: 1));
  }
  while (true) {
    final key =
        '${cursor.year.toString().padLeft(4, '0')}-${cursor.month.toString().padLeft(2, '0')}-${cursor.day.toString().padLeft(2, '0')}';
    if (!dates.contains(key)) break;
    current += 1;
    cursor = cursor.subtract(const Duration(days: 1));
    if (current > 3650) break;
  }

  var best = 0;
  var run = 0;
  DateTime? prev;
  final sortedDates = dates.toList()..sort();
  for (final key in sortedDates) {
    final parts = key.split('-');
    final date =
        DateTime(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
    if (prev != null && date.difference(prev).inDays == 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = date;
  }

  var totalWords = 0;
  var moodSum = 0.0;
  var moodCount = 0;
  for (final entry in entries) {
    totalWords += entry.wordCount;
    final mood = entry.mood;
    if (mood != null) {
      moodSum += mood;
      moodCount += 1;
    }
  }

  return JournalStats(
    totalEntries: entries.length,
    currentStreak: current,
    bestStreak: best,
    totalWords: totalWords,
    avgMood: moodCount == 0 ? null : moodSum / moodCount,
  );
}
