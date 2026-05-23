import 'dart:convert';
import 'dart:math';

import '../events/nora_event.dart';
import 'nora_pulso.dart';

abstract class PulsoLocalStore {
  Future<String?> getSetting(String ownerId, String key);
  Future<void> setSetting(String ownerId, String key, String value);
  Future<void> logEvent({
    required String ownerId,
    required String eventType,
    required String source,
    required Map<String, Object?> payload,
  });
  Future<List<NoraEventLogEntry>> listRecentEvents(String ownerId, {int limit = 30});
}

class XpEntry {
  const XpEntry({
    required this.amount,
    required this.reason,
    required this.source,
    required this.createdAt,
  });

  final int amount;
  final String reason;
  final String source;
  final DateTime createdAt;

  Map<String, Object?> toMap() {
    return {
      'amount': amount,
      'reason': reason,
      'source': source,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory XpEntry.fromMap(Map<String, Object?> map) {
    return XpEntry(
      amount: map['amount'] as int? ?? 0,
      reason: map['reason'] as String? ?? '',
      source: map['source'] as String? ?? 'mobile',
      createdAt: DateTime.tryParse(map['createdAt'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

class PulsoSnapshot {
  const PulsoSnapshot({
    required this.points,
    required this.level,
    required this.streak,
    required this.history,
    required this.updatedAt,
  });

  factory PulsoSnapshot.empty() {
    return PulsoSnapshot(
      points: 0,
      level: 1,
      streak: 0,
      history: const [],
      updatedAt: DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  final int points;
  final int level;
  final int streak;
  final List<XpEntry> history;
  final DateTime updatedAt;

  NoriProgress get progress => getNoriProgress(points, visibleLevel: level);

  Map<String, Object?> toMap() {
    return {
      'points': points,
      'level': level,
      'streak': streak,
      'history': history.map((entry) => entry.toMap()).toList(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  String toJsonString() => jsonEncode(toMap());

  factory PulsoSnapshot.fromJsonString(String value) {
    final decoded = jsonDecode(value);
    if (decoded is! Map<String, Object?>) return PulsoSnapshot.empty();
    final points = decoded['points'] as int? ?? 0;
    final visibleLevel = decoded['level'] as int?;
    final level = getNoriProgress(points, visibleLevel: visibleLevel).level;
    final historyRaw = decoded['history'];
    final history = historyRaw is List
        ? historyRaw
            .whereType<Map>()
            .map((entry) => XpEntry.fromMap(Map<String, Object?>.from(entry)))
            .toList()
        : <XpEntry>[];

    return PulsoSnapshot(
      points: max(0, points),
      level: level,
      streak: decoded['streak'] as int? ?? 0,
      history: history,
      updatedAt: DateTime.tryParse(decoded['updatedAt'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  PulsoSnapshot copyWith({
    int? points,
    int? level,
    int? streak,
    List<XpEntry>? history,
    DateTime? updatedAt,
  }) {
    return PulsoSnapshot(
      points: points ?? this.points,
      level: level ?? this.level,
      streak: streak ?? this.streak,
      history: history ?? this.history,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class PulsoRepository {
  PulsoRepository(this._store);

  static const settingsKey = 'mobile:pulso:v1';
  static const xpAddedEvent = 'PULSO_XP_ADDED';

  final PulsoLocalStore _store;

  Future<PulsoSnapshot> load(String ownerId) async {
    final raw = await _store.getSetting(ownerId, settingsKey);
    if (raw == null || raw.trim().isEmpty) return PulsoSnapshot.empty();
    try {
      return PulsoSnapshot.fromJsonString(raw);
    } catch (_) {
      return PulsoSnapshot.empty();
    }
  }

  Future<PulsoSnapshot> addExperience({
    required String ownerId,
    required int amount,
    required String reason,
    required String source,
    required String sourceEvent,
  }) async {
    final current = await load(ownerId);
    final nextPoints = max(0, current.points + amount);
    final progress = getNoriProgress(nextPoints, visibleLevel: current.level);
    final entry = XpEntry(
      amount: amount,
      reason: reason,
      source: source,
      createdAt: DateTime.now(),
    );
    final snapshot = current.copyWith(
      points: nextPoints,
      level: progress.level,
      history: [entry, ...current.history].take(50).toList(),
      updatedAt: DateTime.now(),
    );

    await _store.setSetting(ownerId, settingsKey, snapshot.toJsonString());
    await _store.logEvent(
      ownerId: ownerId,
      eventType: sourceEvent,
      source: source,
      payload: {'amount': amount, 'reason': reason},
    );
    await _store.logEvent(
      ownerId: ownerId,
      eventType: xpAddedEvent,
      source: 'pulso',
      payload: {
        'amount': amount,
        'reason': reason,
        'points': snapshot.points,
        'level': snapshot.level,
      },
    );

    return snapshot;
  }
}
