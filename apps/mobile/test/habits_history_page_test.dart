import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/app/theme/nora_theme.dart';
import 'package:nora_mobile/core/models/nora_models.dart' show noraDateKey;
import 'package:nora_mobile/core/plugins/plugin_storage.dart';
import 'package:nora_mobile/core/storage/local_store.dart';
import 'package:nora_mobile/plugins/habits/habits_controller.dart';
import 'package:nora_mobile/plugins/habits/habits_models.dart';
import 'package:nora_mobile/plugins/habits/habits_pages/habits_history_page.dart';
import 'package:nora_mobile/plugins/habits/habits_repository.dart';

void main() {
  HabitDefinition habit({
    String id = 'hbt-1',
    String name = 'Meditar',
    int target = 1,
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
      archived: false,
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

  Widget harness(HabitsController controller) {
    return ProviderScope(
      overrides: [
        habitsControllerProvider.overrideWith((ref) => controller),
      ],
      child: MaterialApp(
        theme: NoraTheme.dark(),
        home: const Scaffold(body: HabitsHistoryPage()),
      ),
    );
  }

  testWidgets('muestra el estado vacío cuando no hay hábitos activos',
      (tester) async {
    final controller = HabitsController(
      HabitRepository(_FakeHabitsStorage(const [], const [])),
      'user-1',
    );
    await controller.load();

    await tester.pumpWidget(harness(controller));
    await tester.pumpAndSettle();

    expect(find.text('Sin hábitos activos todavía'), findsOneWidget);
    expect(find.text('Historial 30 días'), findsNothing);
  });

  testWidgets(
      'fila con celdas: intensidad por count/target, %30d y racha visibles',
      (tester) async {
    final now = DateTime.now();
    final todayKey = noraDateKey(now);
    final yesterdayKey = noraDateKey(now.subtract(const Duration(days: 1)));
    final emptyDayKey = noraDateKey(now.subtract(const Duration(days: 10)));

    final controller = HabitsController(
      HabitRepository(_FakeHabitsStorage(
        [habit(id: 'hbt-1', name: 'Meditar', target: 2)],
        [
          log('hlg-1', 'hbt-1', todayKey, count: 2),
          log('hlg-2', 'hbt-1', yesterdayKey, count: 1),
        ],
      )),
      'user-1',
    );
    await controller.load();

    await tester.pumpWidget(harness(controller));
    await tester.pumpAndSettle();

    // Nombre, cabeceras de columna final, %30d y racha.
    expect(find.text('Meditar'), findsOneWidget);
    expect(find.text('30d'), findsOneWidget);
    expect(find.text('Racha'), findsOneWidget);
    expect(find.text('3%'), findsOneWidget,
        reason: 'solo hoy cumplido → 1/30 ≈ 3%');
    expect(find.text('1d'), findsOneWidget,
        reason: 'hoy cumplido (2/2), ayer parcial no suma racha');

    // count >= target → color pleno.
    final fullCell = tester.widget<Container>(
      find.byKey(ValueKey('heatmap-cell-hbt-1-$todayKey')),
    );
    final fullColor = (fullCell.decoration as BoxDecoration).color;
    expect(fullColor, const Color(0xFF60A5FA).withValues(alpha: 1));

    // 0 < count < target → intensidad 0.45.
    final partialCell = tester.widget<Container>(
      find.byKey(ValueKey('heatmap-cell-hbt-1-$yesterdayKey')),
    );
    final partialColor = (partialCell.decoration as BoxDecoration).color;
    expect(partialColor, const Color(0xFF60A5FA).withValues(alpha: 0.45));

    // count = 0 → transparente.
    final emptyCell = tester.widget<Container>(
      find.byKey(ValueKey('heatmap-cell-hbt-1-$emptyDayKey')),
    );
    final emptyColor = (emptyCell.decoration as BoxDecoration).color;
    expect(emptyColor, Colors.transparent);

    // Semantics por celda: 'habito, fecha, count de target' (aria de Desktop).
    final semantics = tester.ensureSemantics();
    expect(
      find.bySemanticsLabel('Meditar, $todayKey, 2 de 2'),
      findsOneWidget,
    );
    expect(
      find.bySemanticsLabel('Meditar, $yesterdayKey, 1 de 2'),
      findsOneWidget,
    );
    semantics.dispose();
  });

  testWidgets('error con Reintentar recarga y muestra los datos',
      (tester) async {
    final storage = _FakeHabitsStorage(
      [habit(id: 'hbt-1', name: 'Meditar')],
      const [],
    )..throwOnQuery = true;
    final controller = HabitsController(HabitRepository(storage), 'user-1');
    await controller.load();

    await tester.pumpWidget(harness(controller));
    await tester.pump();

    expect(find.text('No se pudo cargar el historial'), findsOneWidget);
    expect(find.text('Reintentar'), findsOneWidget);

    storage.throwOnQuery = false;
    await tester.tap(find.text('Reintentar'));
    await tester.pump();
    await tester.pump();

    expect(find.text('Historial 30 días'), findsOneWidget);
    expect(find.text('Meditar'), findsOneWidget);
  });

  testWidgets('muestra el estado de carga antes de tener datos',
      (tester) async {
    final controller = HabitsController(
      HabitRepository(_FakeHabitsStorage(const [], const [])),
      'user-1',
    );

    await tester.pumpWidget(harness(controller));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await controller.load();
    await tester.pumpAndSettle();

    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.text('Sin hábitos activos todavía'), findsOneWidget);
  });
}

/// [PluginStorage] concreto sin DB: sobreescribe query/execute para no tocar
/// sqflite (mismo patrón que _NoopStorage de habits_controller_test).
class _FakeHabitsStorage extends PluginStorage {
  _FakeHabitsStorage(this.definitions, this.logs)
      : super(
          store: noraLocalStore,
          pluginId: 'habits-test',
          ownerId: () => 'user-1',
        );

  final List<HabitDefinition> definitions;
  final List<HabitLog> logs;
  bool throwOnQuery = false;

  @override
  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> parameters = const [],
  ]) async {
    if (throwOnQuery) throw StateError('db caída');
    if (sql.contains('habits_definitions')) {
      return definitions.map((definition) => definition.toRow()).toList();
    }
    if (sql.contains('habits_logs')) {
      return logs.map((log) => log.toRow()).toList();
    }
    return const [];
  }

  @override
  Future<int> execute(
    String sql, [
    List<Object?> parameters = const [],
  ]) async {
    return 1;
  }
}