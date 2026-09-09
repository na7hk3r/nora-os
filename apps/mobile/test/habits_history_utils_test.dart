import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/core/models/nora_models.dart' show noraDateKey;
import 'package:nora_mobile/plugins/habits/habits_models.dart';
import 'package:nora_mobile/plugins/habits/habits_utils.dart';

void main() {
  final today = DateTime(2026, 9, 9);

  HabitDefinition habit({
    String id = 'hbt-1',
    String name = 'Meditar',
    int target = 1,
    bool archived = false,
  }) {
    return HabitDefinition(
      id: id,
      ownerId: 'user-1',
      name: name,
      icon: null,
      color: '#60a5fa',
      kind: HabitKind.positive,
      period: HabitPeriod.daily,
      target: target,
      archived: archived,
      createdAt: DateTime(2026, 1, 1),
    );
  }

  HabitLog log(String id, String habitId, String date, {int count = 1}) {
    return HabitLog(
      id: id,
      ownerId: 'user-1',
      habitId: habitId,
      date: date,
      count: count,
      note: null,
      createdAt: DateTime(2026, 1, 1),
    );
  }

  group('last30DayKeys', () {
    test('devuelve 30 días hasta hoy inclusive, de más viejo a más nuevo',
        () {
      final keys = last30DayKeys(today);

      expect(keys, hasLength(30));
      expect(keys.first, noraDateKey(DateTime(2026, 8, 11)));
      expect(keys.last, '2026-09-09');
      expect(keys.toSet(), hasLength(30),
          reason: 'no debe haber fechas repetidas');
      for (var i = 0; i < keys.length - 1; i++) {
        expect(keys[i].compareTo(keys[i + 1]), lessThan(0),
            reason: 'orden ascendente, hoy al final');
      }
    });

    test('cruza el límite de mes correctamente', () {
      final keys = last30DayKeys(DateTime(2026, 3, 1));
      expect(keys.first, '2026-01-31');
      expect(keys.last, '2026-03-01');
    });
  });

  group('HabitHistoryCell intensity', () {
    test('espeja Desktop: count>=target → 1, 0<count<target → 0.45, 0 → 0',
        () {
      const full = HabitHistoryCell(date: '2026-09-09', count: 2, target: 2);
      const partial =
          HabitHistoryCell(date: '2026-09-08', count: 1, target: 2);
      const empty = HabitHistoryCell(date: '2026-09-07', count: 0, target: 2);

      expect(full.intensity, 1.0);
      expect(full.completed, isTrue);
      expect(partial.intensity, 0.45);
      expect(partial.partial, isTrue);
      expect(empty.intensity, 0);
      expect(empty.completed, isFalse);
      expect(empty.partial, isFalse);
    });

    test('semanticsLabel sigue el formato del aria-label de Desktop', () {
      const cell = HabitHistoryCell(date: '2026-09-09', count: 2, target: 3);
      expect(cell.semanticsLabel('Meditar'), 'Meditar, 2026-09-09, 2 de 3');
    });
  });

  group('computeHistoryRows', () {
    test('filtra hábitos archivados y arma una fila por hábito activo', () {
      final rows = computeHistoryRows(
        [habit(), habit(id: 'hbt-2', name: 'Leer', archived: true)],
        const [],
        today: today,
      );

      expect(rows, hasLength(1));
      expect(rows.single.habit.name, 'Meditar');
      expect(rows.single.cells, hasLength(30));
    });

    test('mapea count por fecha y completa con 0 los días sin logs', () {
      final rows = computeHistoryRows(
        [habit(target: 2)],
        [
          log('hlg-1', 'hbt-1', '2026-09-09', count: 2),
          log('hlg-2', 'hbt-1', '2026-09-08', count: 1),
        ],
        today: today,
      );

      final cells = rows.single.cells;
      expect(cells.last.date, '2026-09-09');
      expect(cells.last.count, 2);
      expect(cells.last.intensity, 1.0);

      final partial = cells.firstWhere((cell) => cell.date == '2026-09-08');
      expect(partial.count, 1);
      expect(partial.intensity, 0.45);

      final empty = cells.firstWhere((cell) => cell.date == '2026-09-07');
      expect(empty.count, 0);
      expect(empty.intensity, 0);
    });

    test('expone %30d y racha desde computeHabitStats (misma semántica)', () {
      final rows = computeHistoryRows(
        [habit(target: 2)],
        [
          log('hlg-1', 'hbt-1', '2026-09-09', count: 2),
          log('hlg-2', 'hbt-1', '2026-09-08', count: 1),
        ],
        today: today,
      );

      final stats = rows.single.stats;
      expect(stats.streak, 1,
          reason: 'hoy cumplido (2/2), ayer parcial no suma');
      expect((stats.rate30d * 100).round(), 3,
          reason: 'solo hoy cuenta como hit → 1/30');
    });
  });
}