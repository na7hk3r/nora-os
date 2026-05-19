import 'dart:math';

import 'package:flutter/material.dart';

final Random _idRandom = Random.secure();

String noraDateKey(DateTime date) {
  final normalized = DateTime(date.year, date.month, date.day);
  final year = normalized.year.toString().padLeft(4, '0');
  final month = normalized.month.toString().padLeft(2, '0');
  final day = normalized.day.toString().padLeft(2, '0');
  return '$year-$month-$day';
}

DateTime noraDateFromKey(String value) {
  final parts = value.split('-').map(int.parse).toList();
  return DateTime(parts[0], parts[1], parts[2]);
}

int minutesFromTimeOfDay(TimeOfDay time) => time.hour * 60 + time.minute;

String formatMinutes(int? minutes) {
  if (minutes == null) return '';
  final hour = (minutes ~/ 60).toString().padLeft(2, '0');
  final minute = (minutes % 60).toString().padLeft(2, '0');
  return '$hour:$minute';
}

String newLocalId(String prefix) {
  final entropy = _idRandom.nextInt(1 << 32).toRadixString(16).padLeft(8, '0');
  return '$prefix-${DateTime.now().microsecondsSinceEpoch}-$entropy';
}

enum NoraPriority {
  low,
  medium,
  high;

  String get label {
    switch (this) {
      case NoraPriority.low:
        return 'Baja';
      case NoraPriority.medium:
        return 'Media';
      case NoraPriority.high:
        return 'Alta';
    }
  }

  static NoraPriority fromName(String? value) {
    return NoraPriority.values.firstWhere(
      (priority) => priority.name == value,
      orElse: () => NoraPriority.medium,
    );
  }
}

enum TaskStatus {
  pending,
  inProgress,
  completed;

  String get label {
    switch (this) {
      case TaskStatus.pending:
        return 'Pendientes';
      case TaskStatus.inProgress:
        return 'En progreso';
      case TaskStatus.completed:
        return 'Completadas';
    }
  }

  static TaskStatus fromName(String? value) {
    return TaskStatus.values.firstWhere(
      (status) => status.name == value,
      orElse: () => TaskStatus.pending,
    );
  }
}

enum PlannerKind {
  task,
  event,
  focus;

  String get label {
    switch (this) {
      case PlannerKind.task:
        return 'Tarea';
      case PlannerKind.event:
        return 'Evento';
      case PlannerKind.focus:
        return 'Foco';
    }
  }

  static PlannerKind fromName(String? value) {
    return PlannerKind.values.firstWhere(
      (kind) => kind.name == value,
      orElse: () => PlannerKind.task,
    );
  }
}

enum NoraNotificationKind {
  mention,
  task,
  project,
  reminder;

  String get label {
    switch (this) {
      case NoraNotificationKind.mention:
        return 'Mencion';
      case NoraNotificationKind.task:
        return 'Tarea';
      case NoraNotificationKind.project:
        return 'Proyecto';
      case NoraNotificationKind.reminder:
        return 'Recordatorio';
    }
  }

  static NoraNotificationKind fromName(String? value) {
    return NoraNotificationKind.values.firstWhere(
      (kind) => kind.name == value,
      orElse: () => NoraNotificationKind.reminder,
    );
  }
}

class NoraUser {
  const NoraUser({
    required this.id,
    required this.username,
    required this.displayName,
    required this.createdAt,
    this.lastLoginAt,
  });

  final String id;
  final String username;
  final String displayName;
  final DateTime createdAt;
  final DateTime? lastLoginAt;

  factory NoraUser.fromMap(Map<String, Object?> map) {
    return NoraUser(
      id: map['id'] as String,
      username: map['username'] as String,
      displayName: map['display_name'] as String? ?? map['username'] as String,
      createdAt: DateTime.parse(map['created_at'] as String),
      lastLoginAt: map['last_login_at'] == null
          ? null
          : DateTime.parse(map['last_login_at'] as String),
    );
  }
}

class PlannerItem {
  const PlannerItem({
    required this.id,
    required this.ownerId,
    required this.title,
    required this.date,
    required this.kind,
    required this.category,
    required this.status,
    required this.priority,
    required this.createdAt,
    required this.updatedAt,
    this.startMinute,
    this.endMinute,
    this.note,
  });

  final String id;
  final String ownerId;
  final String title;
  final String date;
  final int? startMinute;
  final int? endMinute;
  final PlannerKind kind;
  final String category;
  final TaskStatus status;
  final NoraPriority priority;
  final String? note;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isCompleted => status == TaskStatus.completed;

  PlannerItem copyWith({
    String? title,
    String? date,
    int? startMinute,
    int? endMinute,
    PlannerKind? kind,
    String? category,
    TaskStatus? status,
    NoraPriority? priority,
    String? note,
    DateTime? updatedAt,
  }) {
    return PlannerItem(
      id: id,
      ownerId: ownerId,
      title: title ?? this.title,
      date: date ?? this.date,
      startMinute: startMinute ?? this.startMinute,
      endMinute: endMinute ?? this.endMinute,
      kind: kind ?? this.kind,
      category: category ?? this.category,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      note: note ?? this.note,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, Object?> toMap() {
    return {
      'id': id,
      'owner_id': ownerId,
      'title': title,
      'date': date,
      'start_minute': startMinute,
      'end_minute': endMinute,
      'kind': kind.name,
      'category': category,
      'status': status.name,
      'priority': priority.name,
      'note': note,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory PlannerItem.fromMap(Map<String, Object?> map) {
    return PlannerItem(
      id: map['id'] as String,
      ownerId: map['owner_id'] as String,
      title: map['title'] as String,
      date: map['date'] as String,
      startMinute: map['start_minute'] as int?,
      endMinute: map['end_minute'] as int?,
      kind: PlannerKind.fromName(map['kind'] as String?),
      category: map['category'] as String? ?? 'personal',
      status: TaskStatus.fromName(map['status'] as String?),
      priority: NoraPriority.fromName(map['priority'] as String?),
      note: map['note'] as String?,
      createdAt: DateTime.parse(map['created_at'] as String),
      updatedAt: DateTime.parse(map['updated_at'] as String),
    );
  }
}

class TaskItem {
  const TaskItem({
    required this.id,
    required this.ownerId,
    required this.title,
    required this.status,
    required this.priority,
    required this.createdAt,
    required this.updatedAt,
    this.dueDate,
    this.note,
    this.completedAt,
  });

  final String id;
  final String ownerId;
  final String title;
  final TaskStatus status;
  final NoraPriority priority;
  final String? dueDate;
  final String? note;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? completedAt;

  bool get isCompleted => status == TaskStatus.completed;

  TaskItem copyWith({
    String? title,
    TaskStatus? status,
    NoraPriority? priority,
    String? dueDate,
    String? note,
    DateTime? updatedAt,
    DateTime? completedAt,
  }) {
    return TaskItem(
      id: id,
      ownerId: ownerId,
      title: title ?? this.title,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      dueDate: dueDate ?? this.dueDate,
      note: note ?? this.note,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      completedAt: completedAt ?? this.completedAt,
    );
  }

  Map<String, Object?> toMap() {
    return {
      'id': id,
      'owner_id': ownerId,
      'title': title,
      'status': status.name,
      'priority': priority.name,
      'due_date': dueDate,
      'note': note,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'completed_at': completedAt?.toIso8601String(),
    };
  }

  factory TaskItem.fromMap(Map<String, Object?> map) {
    return TaskItem(
      id: map['id'] as String,
      ownerId: map['owner_id'] as String,
      title: map['title'] as String,
      status: TaskStatus.fromName(map['status'] as String?),
      priority: NoraPriority.fromName(map['priority'] as String?),
      dueDate: map['due_date'] as String?,
      note: map['note'] as String?,
      createdAt: DateTime.parse(map['created_at'] as String),
      updatedAt: DateTime.parse(map['updated_at'] as String),
      completedAt: map['completed_at'] == null
          ? null
          : DateTime.parse(map['completed_at'] as String),
    );
  }
}

class NoraNotification {
  const NoraNotification({
    required this.id,
    required this.ownerId,
    required this.kind,
    required this.title,
    required this.body,
    required this.createdAt,
    this.readAt,
    this.deepLink,
  });

  final String id;
  final String ownerId;
  final NoraNotificationKind kind;
  final String title;
  final String body;
  final DateTime createdAt;
  final DateTime? readAt;
  final String? deepLink;

  bool get isRead => readAt != null;

  NoraNotification copyWith({
    DateTime? readAt,
  }) {
    return NoraNotification(
      id: id,
      ownerId: ownerId,
      kind: kind,
      title: title,
      body: body,
      createdAt: createdAt,
      readAt: readAt ?? this.readAt,
      deepLink: deepLink,
    );
  }

  Map<String, Object?> toMap() {
    return {
      'id': id,
      'owner_id': ownerId,
      'kind': kind.name,
      'title': title,
      'body': body,
      'created_at': createdAt.toIso8601String(),
      'read_at': readAt?.toIso8601String(),
      'deep_link': deepLink,
    };
  }

  factory NoraNotification.fromMap(Map<String, Object?> map) {
    return NoraNotification(
      id: map['id'] as String,
      ownerId: map['owner_id'] as String,
      kind: NoraNotificationKind.fromName(map['kind'] as String?),
      title: map['title'] as String,
      body: map['body'] as String? ?? '',
      createdAt: DateTime.parse(map['created_at'] as String),
      readAt: map['read_at'] == null ? null : DateTime.parse(map['read_at'] as String),
      deepLink: map['deep_link'] as String?,
    );
  }
}
