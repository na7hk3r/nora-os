import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/core/models/nora_models.dart';
import 'package:nora_mobile/core/pulso/nora_pulso.dart';

void main() {
  test('nori level follows the desktop Pulso Nora thresholds', () {
    expect(getNoriLevel(0), 1);
    expect(getNoriLevel(119), 1);
    expect(getNoriLevel(120), 2);
    expect(getNoriLevel(1029), 5);
    expect(getNoriLevel(1030), 6);
    expect(getNoriLevel(5980), 15);
    expect(getNoriLevel(9000), 15);
  });

  test('progress preserves a higher visible level while still counting xp', () {
    final progress = getNoriProgress(120, visibleLevel: 4);

    expect(progress.level, 4);
    expect(progress.levelStartXp, 480);
    expect(progress.nextLevelXp, 730);
    expect(progress.percent, 0);
    expect(progress.xpRemaining, 610);
  });

  test('planner completion xp matches Nora OS complexity rewards', () {
    expect(plannerCompletionXp(NoraPriority.low), 5);
    expect(plannerCompletionXp(NoraPriority.medium), 10);
    expect(plannerCompletionXp(NoraPriority.high), 16);
  });
}
