/// Tipos del plugin Hábitos.
///
/// Filosofía:
///  - Un hábito = una acción concreta repetible. No "objetivo de vida".
///  - kind = positive (querés hacerlo) o negative (querés evitarlo).
///  - period = daily o weekly. Sin cron, sin recurrencias complejas.
///  - target = cuántas veces por período. Default 1.
library;

enum HabitKind { positive, negative }

extension HabitKindLabel on HabitKind {
  String get name {
    switch (this) {
      case HabitKind.positive:
        return 'positive';
      case HabitKind.negative:
        return 'negative';
    }
  }

  static HabitKind fromName(String? value) =>
      value == 'negative' ? HabitKind.negative : HabitKind.positive;
}

enum HabitPeriod { daily, weekly }

extension HabitPeriodLabel on HabitPeriod {
  String get name {
    switch (this) {
      case HabitPeriod.daily:
        return 'daily';
      case HabitPeriod.weekly:
        return 'weekly';
    }
  }

  static HabitPeriod fromName(String? value) =>
      value == 'weekly' ? HabitPeriod.weekly : HabitPeriod.daily;
}

class HabitDefinition {
  const HabitDefinition({
    required this.id,
    required this.ownerId,
    required this.name,
    required this.icon,
    required this.color,
    required this.kind,
    required this.period,
    required this.target,
    required this.archived,
    required this.createdAt,
  });

  final String id;
  final String ownerId;
  final String name;
  final String? icon;
  final String? color;
  final HabitKind kind;
  final HabitPeriod period;
  final int target;
  final bool archived;
  final DateTime createdAt;

  HabitDefinition copyWith({
    String? name,
    String? icon,
    String? color,
    HabitKind? kind,
    HabitPeriod? period,
    int? target,
    bool? archived,
  }) {
    return HabitDefinition(
      id: id,
      ownerId: ownerId,
      name: name ?? this.name,
      icon: icon ?? this.icon,
      color: color ?? this.color,
      kind: kind ?? this.kind,
      period: period ?? this.period,
      target: target ?? this.target,
      archived: archived ?? this.archived,
      createdAt: createdAt,
    );
  }

  Map<String, Object?> toRow() {
    return {
      'id': id,
      'owner_id': ownerId,
      'name': name,
      'icon': icon,
      'color': color,
      'kind': kind.name,
      'period': period.name,
      'target': target,
      'archived': archived ? 1 : 0,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory HabitDefinition.fromRow(Map<String, Object?> row) {
    return HabitDefinition(
      id: row['id'] as String,
      ownerId: row['owner_id'] as String,
      name: row['name'] as String,
      icon: row['icon'] as String?,
      color: row['color'] as String?,
      kind: HabitKindLabel.fromName(row['kind'] as String?),
      period: HabitPeriodLabel.fromName(row['period'] as String?),
      target: (row['target'] as int?) ?? 1,
      archived: ((row['archived'] as int?) ?? 0) == 1,
      createdAt: DateTime.tryParse(row['created_at'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

class HabitLog {
  const HabitLog({
    required this.id,
    required this.ownerId,
    required this.habitId,
    required this.date,
    required this.count,
    required this.note,
    required this.createdAt,
  });

  final String id;
  final String ownerId;
  final String habitId;

  /// YYYY-MM-DD.
  final String date;
  final int count;
  final String? note;
  final DateTime createdAt;

  HabitLog copyWith({int? count, String? note}) {
    return HabitLog(
      id: id,
      ownerId: ownerId,
      habitId: habitId,
      date: date,
      count: count ?? this.count,
      note: note ?? this.note,
      createdAt: createdAt,
    );
  }

  Map<String, Object?> toRow() {
    return {
      'id': id,
      'owner_id': ownerId,
      'habit_id': habitId,
      'date': date,
      'count': count,
      'note': note,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory HabitLog.fromRow(Map<String, Object?> row) {
    return HabitLog(
      id: row['id'] as String,
      ownerId: row['owner_id'] as String,
      habitId: row['habit_id'] as String,
      date: row['date'] as String,
      count: (row['count'] as int?) ?? 1,
      note: row['note'] as String?,
      createdAt: DateTime.tryParse(row['created_at'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

class HabitStats {
  const HabitStats({
    required this.streak,
    required this.bestStreak,
    required this.completedThisPeriod,
    required this.countThisPeriod,
    required this.rate30d,
  });

  /// Días/semanas consecutivos cumplidos (incluye el actual si está cumplido).
  final int streak;
  final int bestStreak;
  final bool completedThisPeriod;
  final int countThisPeriod;

  /// % de cumplimiento últimos 30 días (0..1).
  final double rate30d;
}
