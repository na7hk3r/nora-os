import 'dart:math';

import '../models/nora_models.dart';

const noriLevelThresholds = <int>[
  0,
  120,
  280,
  480,
  730,
  1030,
  1380,
  1780,
  2230,
  2730,
  3280,
  3880,
  4530,
  5230,
  5980,
];

class NoriProgress {
  const NoriProgress({
    required this.level,
    required this.points,
    required this.levelStartXp,
    required this.nextLevelXp,
    required this.xpRemaining,
    required this.percent,
  });

  final int level;
  final int points;
  final int levelStartXp;
  final int nextLevelXp;
  final int xpRemaining;
  final double percent;
}

int getNoriLevel(int points) {
  final safePoints = max(0, points);
  for (var index = noriLevelThresholds.length - 1; index >= 0; index--) {
    if (safePoints >= noriLevelThresholds[index]) return index + 1;
  }
  return 1;
}

NoriProgress getNoriProgress(int points, {int? visibleLevel}) {
  final computedLevel = getNoriLevel(points);
  final safeVisible = visibleLevel == null ? computedLevel : visibleLevel.clamp(1, noriLevelThresholds.length);
  final level = max(computedLevel, safeVisible);
  final levelStartXp = noriLevelThresholds[level - 1];
  final nextLevelXp = level >= noriLevelThresholds.length
      ? noriLevelThresholds.last
      : noriLevelThresholds[level];
  final span = max(1, nextLevelXp - levelStartXp);
  final earned = (points - levelStartXp).clamp(0, span);
  final percent = level >= noriLevelThresholds.length ? 1.0 : earned / span;
  final xpRemaining = level >= noriLevelThresholds.length ? 0 : max(0, nextLevelXp - points);

  return NoriProgress(
    level: level,
    points: points,
    levelStartXp: levelStartXp,
    nextLevelXp: nextLevelXp,
    xpRemaining: xpRemaining,
    percent: percent,
  );
}

int plannerCompletionXp(NoraPriority priority) {
  switch (priority) {
    case NoraPriority.low:
      return 5;
    case NoraPriority.medium:
      return 10;
    case NoraPriority.high:
      return 16;
  }
}

int taskCompletionXp(NoraPriority priority) => 10;

String getNoriSpriteAsset(int level) {
  final safeLevel = level.clamp(1, noriLevelThresholds.length).toString().padLeft(2, '0');
  return 'assets/nora-evo/nori-$safeLevel.png';
}
