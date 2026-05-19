import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/core/models/nora_models.dart';

void main() {
  test('planner items serialize with stable mobile fields', () {
    final now = DateTime.utc(2026, 5, 18, 12);
    final item = PlannerItem(
      id: 'planner-1',
      ownerId: 'user-1',
      title: 'Plan mobile MVP',
      date: '2026-05-18',
      startMinute: 9 * 60,
      endMinute: 10 * 60,
      kind: PlannerKind.focus,
      category: 'Trabajo',
      status: TaskStatus.pending,
      priority: NoraPriority.high,
      note: 'Timeline tactil',
      createdAt: now,
      updatedAt: now,
    );

    final restored = PlannerItem.fromMap(item.toMap());

    expect(restored.id, 'planner-1');
    expect(restored.kind, PlannerKind.focus);
    expect(restored.priority, NoraPriority.high);
    expect(restored.startMinute, 540);
  });

  test('date keys are normalized for local grouping', () {
    expect(noraDateKey(DateTime(2026, 5, 18, 23, 59)), '2026-05-18');
  });
}
