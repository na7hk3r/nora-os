/// Eventos del plugin Hábitos.
abstract final class HabitsEvents {
  static const created = 'HABITS_HABIT_CREATED';
  static const updated = 'HABITS_HABIT_UPDATED';
  static const archived = 'HABITS_HABIT_ARCHIVED';
  static const logged = 'HABITS_HABIT_LOGGED';
  static const unlogged = 'HABITS_HABIT_UNLOGGED';
  static const goalMet = 'HABITS_HABIT_GOAL_MET';
  static const streakBroken = 'HABITS_HABIT_STREAK_BROKEN';

  static const List<String> all = [
    created,
    updated,
    archived,
    logged,
    unlogged,
    goalMet,
    streakBroken,
  ];
}
