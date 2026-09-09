/// Helpers puros del plugin Hábitos. Sin IO, sin stores; testeables. Pasan
/// `today` explícito para no depender del clock.
library;

import 'package:flutter/material.dart';

import '../../core/models/nora_models.dart' show noraDateKey;
import 'habits_models.dart';

/// Número de semana ISO 8601 (lunes inicio). Devuelve "YYYY-Www".
String isoWeekKey(DateTime date) {
  final utc = DateTime.utc(date.year, date.month, date.day);
  final dayNum = utc.weekday == 7 ? 7 : utc.weekday;
  final target = utc.add(Duration(days: 4 - dayNum));
  final yearStart = DateTime.utc(target.year, 1, 1);
  final week = ((target.difference(yearStart).inDays) / 7).ceil() + 1;
  return '${target.year}-W${week.toString().padLeft(2, '0')}';
}

/// Clave de período para agrupar logs según el período del hábito.
String habitPeriodKey(HabitPeriod period, String dateStr) {
  if (period == HabitPeriod.daily) return dateStr;
  final parts = dateStr.split('-');
  final date =
      DateTime(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
  return isoWeekKey(date);
}

/// Calcula estadísticas para un hábito dado su lista de logs.
HabitStats computeHabitStats(
  HabitDefinition habit,
  List<HabitLog> logs, {
  DateTime? today,
}) {
  final reference = today ?? DateTime.now();
  final sorted = [...logs]..sort((a, b) => a.date.compareTo(b.date));

  final totalsByPeriod = <String, int>{};
  for (final log in sorted) {
    final key = habitPeriodKey(habit.period, log.date);
    totalsByPeriod.update(key, (value) => value + log.count,
        ifAbsent: () => log.count);
  }

  final todayStr = noraDateKey(reference);
  final currentKey = habitPeriodKey(habit.period, todayStr);
  final countThisPeriod = totalsByPeriod[currentKey] ?? 0;
  final completedThisPeriod = countThisPeriod >= habit.target;

  // Streak: contar períodos consecutivos cumplidos retrocediendo desde hoy.
  var streak = 0;
  final stepDays = habit.period == HabitPeriod.weekly ? 7 : 1;
  var cursor = reference;
  if (!completedThisPeriod) {
    cursor = cursor.subtract(Duration(days: stepDays));
  }
  while (true) {
    final key = habitPeriodKey(habit.period, noraDateKey(cursor));
    final total = totalsByPeriod[key] ?? 0;
    if (total < habit.target) break;
    streak += 1;
    cursor = cursor.subtract(Duration(days: stepDays));
    if (streak > 3650) break;
  }

  // Best streak: recorrer períodos en orden y calcular máxima racha.
  var bestStreak = 0;
  if (totalsByPeriod.isNotEmpty) {
    final keys = totalsByPeriod.keys.toList()..sort();
    int keyToOrdinal(String key) {
      if (habit.period == HabitPeriod.daily) {
        final parts = key.split('-');
        final date = DateTime(
            int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
        return date.difference(DateTime(1970, 1, 1)).inDays;
      }
      final index = key.indexOf('-W');
      final y = int.parse(key.substring(0, index));
      final w = int.parse(key.substring(index + 2));
      return y * 53 + w;
    }

    var run = 0;
    int? prevOrd;
    for (final key in keys) {
      final total = totalsByPeriod[key] ?? 0;
      final ord = keyToOrdinal(key);
      if (total >= habit.target) {
        run = (prevOrd != null && ord == prevOrd + 1) ? run + 1 : 1;
        if (run > bestStreak) bestStreak = run;
      } else {
        run = 0;
      }
      prevOrd = ord;
    }
  }

  // Rate 30d.
  var hits = 0;
  for (var i = 0; i < 30; i++) {
    final day = reference.subtract(Duration(days: i));
    final key = habitPeriodKey(habit.period, noraDateKey(day));
    final total = totalsByPeriod[key] ?? 0;
    if (total >= habit.target) hits += 1;
  }
  final rate30d = hits / 30;

  return HabitStats(
    streak: streak,
    bestStreak: bestStreak,
    completedThisPeriod: completedThisPeriod,
    countThisPeriod: countThisPeriod,
    rate30d: rate30d,
  );
}

/// Color por defecto si el usuario no eligió uno (hash del nombre), hex '#rrggbb'.
String fallbackHabitColor(String name) {
  const palette = [
    '#60a5fa',
    '#34d399',
    '#fbbf24',
    '#f472b6',
    '#a78bfa',
    '#f87171',
    '#22d3ee',
    '#fb923c'
  ];
  var h = 0;
  for (var i = 0; i < name.length; i++) {
    h = (h * 31 + name.codeUnitAt(i)) & 0xFFFFFFFF;
  }
  return palette[h % palette.length];
}

/// Convierte un color hex '#rrggbb' a un [Color] de Flutter.
Color habitHexToColor(String hex) {
  var clean = hex.replaceAll('#', '');
  if (clean.length == 6) clean = 'FF$clean';
  final value = int.tryParse(clean, radix: 16) ?? 0xFF8B5CF6;
  return Color(value);
}

/// Claves de fecha de los últimos 30 días hasta [today] inclusive, de más
/// viejo a más nuevo (hoy al final). Mismo criterio que Desktop.
List<String> last30DayKeys(DateTime today) {
  final reference = DateTime(today.year, today.month, today.day);
  final keys = <String>[];
  for (var i = 29; i >= 0; i--) {
    keys.add(noraDateKey(DateTime(reference.year, reference.month,
        reference.day - i)));
  }
  return keys;
}

/// Una celda del heatmap de historial para un hábito y fecha dados.
class HabitHistoryCell {
  const HabitHistoryCell({
    required this.date,
    required this.count,
    required this.target,
  });

  /// YYYY-MM-DD.
  final String date;

  /// Cantidad de logs del hábito en esa fecha.
  final int count;

  /// Meta del hábito por período.
  final int target;

  /// Intensidad de la celda, espejo del heatmap de Desktop:
  ///  - `count >= target` → 1.0 (color pleno);
  ///  - `0 < count < target` → 0.45 (progreso parcial);
  ///  - `count = 0` → 0 (transparente).
  double get intensity {
    if (count >= target) return 1.0;
    if (count > 0) return 0.45;
    return 0;
  }

  bool get completed => count >= target;

  bool get partial => count > 0 && count < target;

  /// Label de accesibilidad equivalente al tooltip/aria de Desktop:
  /// `'Meditar, 2026-09-09, 2 de 3'`.
  String semanticsLabel(String habitName) =>
      '$habitName, $date, $count de $target';
}

/// Fila del heatmap: un hábito activo con sus 30 celdas y sus estadísticas.
class HabitHistoryRow {
  const HabitHistoryRow({
    required this.habit,
    required this.cells,
    required this.stats,
  });

  final HabitDefinition habit;
  final List<HabitHistoryCell> cells;
  final HabitStats stats;
}

/// Matriz de historial: una fila por hábito activo (no archivado), con las
/// celdas de los últimos 30 días hasta [today] (hoy al final). Sin IO;
/// recibe los logs del owner ya cargados por el controller.
List<HabitHistoryRow> computeHistoryRows(
  List<HabitDefinition> definitions,
  List<HabitLog> logs, {
  DateTime? today,
}) {
  final reference = today ?? DateTime.now();
  final active = definitions.where((habit) => !habit.archived).toList();
  final keys = last30DayKeys(reference);
  return [
    for (final habit in active)
      _historyRowFor(habit, logs, keys, reference),
  ];
}

HabitHistoryRow _historyRowFor(
  HabitDefinition habit,
  List<HabitLog> logs,
  List<String> keys,
  DateTime reference,
) {
  final habitLogs = logs.where((log) => log.habitId == habit.id).toList();
  final countByDate = <String, int>{
    for (final log in habitLogs) log.date: log.count,
  };
  final cells = [
    for (final key in keys)
      HabitHistoryCell(
        date: key,
        count: countByDate[key] ?? 0,
        target: habit.target,
      ),
  ];
  return HabitHistoryRow(
    habit: habit,
    cells: cells,
    stats: computeHabitStats(habit, habitLogs, today: reference),
  );
}
