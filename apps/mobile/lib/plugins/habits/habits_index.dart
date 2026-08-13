import '../../core/plugins/core_api.dart';
import '../../core/plugins/plugin_manager.dart';
import '../../core/plugins/plugin_manifest.dart';
import 'habits_events.dart';
import 'habits_models.dart';
import 'habits_pages/habits_home_page.dart';
import 'habits_pages/habits_manage_page.dart';
import 'habits_utils.dart';

/// Plugin Hábitos. Captura rápida de hábitos diarios/semanales con racha.
/// Sin objetivos de vida, sin gamificación pesada: solo tildes y consistencia.
/// La XP se otorga vía `api.pulso` y las métricas se publican para consumo
/// cross-plugin.
final habitsPlugin = PluginManifest(
  id: 'habits',
  name: 'Hábitos',
  version: '1.0.0',
  description: 'Hábitos diarios y semanales con racha y heatmap.',
  icon: 'Repeat',
  domain: 'habits',
  domainKeywords: const ['routine', 'streak', 'daily'],
  recommended: true,
  migrations: const [
    PluginMigration(
      version: 1,
      up: '''
        CREATE TABLE IF NOT EXISTS habits_definitions (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          name TEXT NOT NULL,
          icon TEXT,
          color TEXT,
          kind TEXT NOT NULL DEFAULT 'positive',
          period TEXT NOT NULL DEFAULT 'daily',
          target INTEGER NOT NULL DEFAULT 1,
          archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS habits_logs (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          habit_id TEXT NOT NULL,
          date TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 1,
          note TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE (owner_id, habit_id, date)
        );
        CREATE INDEX IF NOT EXISTS idx_habits_defs_owner ON habits_definitions(owner_id);
        CREATE INDEX IF NOT EXISTS idx_habits_logs_owner_habit_date ON habits_logs(owner_id, habit_id, date);
        CREATE INDEX IF NOT EXISTS idx_habits_logs_owner_date ON habits_logs(owner_id, date);
      ''',
    ),
  ],
  pages: [
    PluginPageDef(
      id: 'habits-dashboard',
      pluginId: 'habits',
      path: '',
      title: 'Hábitos',
      icon: 'Repeat',
      builder: (_) => const HabitsHomePage(),
      order: 40,
    ),
    PluginPageDef(
      id: 'habits-manage',
      pluginId: 'habits',
      path: 'manage',
      title: 'Administrar',
      icon: 'Settings',
      builder: (_) => const HabitsManagePage(),
      order: 42,
    ),
  ],
  navItems: [
    PluginNavItemDef(
      id: 'habits-nav',
      pluginId: 'habits',
      label: 'Hábitos',
      icon: 'Repeat',
      path: '',
      order: 40,
    ),
    PluginNavItemDef(
      id: 'habits-manage-nav',
      pluginId: 'habits',
      label: 'Administrar',
      icon: 'Settings',
      path: 'manage',
      order: 42,
      parentId: 'habits-nav',
    ),
  ],
  events: {'emits': HabitsEvents.all, 'listens': []},
  init: (api) async {
    await _publishHabitsMetrics(api);

    api.events.on(HabitsEvents.logged, (_) => _publishHabitsMetrics(api));
    api.events.on(HabitsEvents.unlogged, (_) => _publishHabitsMetrics(api));
    api.events.on(HabitsEvents.goalMet, (_) => _publishHabitsMetrics(api));

    api.events.on(
      HabitsEvents.logged,
      (_) => _grantXp(api, 2,
          reason: 'Hábito registrado', sourceEvent: 'MOBILE_HABIT_LOGGED'),
    );
    api.events.on(
      HabitsEvents.goalMet,
      (_) => _grantXp(api, 5,
          reason: 'Meta de hábito cumplida',
          sourceEvent: 'MOBILE_HABIT_GOAL_MET'),
    );
  },
);

/// Publica métricas cross-plugin (consumidas por futuros Goals/OKRs).
Future<void> _publishHabitsMetrics(CoreAPI api) async {
  try {
    final ownerId = api.ownerId;
    if (ownerId == null) {
      api.metrics.publish('habits.top_streak', 0);
      api.metrics.publish('habits.completion_rate_30d', 0);
      return;
    }
    final definitionRows = await api.storage.query(
      'SELECT * FROM habits_definitions WHERE owner_id = ?',
      [ownerId],
    );
    final logRows = await api.storage.query(
      'SELECT * FROM habits_logs WHERE owner_id = ?',
      [ownerId],
    );
    final active = definitionRows
        .map(HabitDefinition.fromRow)
        .where((definition) => !definition.archived)
        .toList();
    if (active.isEmpty) {
      api.metrics.publish('habits.top_streak', 0);
      api.metrics.publish('habits.completion_rate_30d', 0);
      return;
    }
    final logs = logRows.map(HabitLog.fromRow).toList();
    var topStreak = 0;
    var rateSum = 0.0;
    for (final habit in active) {
      final habitLogs = logs.where((log) => log.habitId == habit.id).toList();
      final stats = computeHabitStats(habit, habitLogs);
      if (stats.streak > topStreak) topStreak = stats.streak;
      rateSum += stats.rate30d;
    }
    api.metrics.publish('habits.top_streak', topStreak);
    api.metrics.publish(
        'habits.completion_rate_30d', (rateSum / active.length * 100).round());
  } catch (error) {
    // Las métricas nunca deben romper el ciclo de vida del plugin.
    // ignore: avoid_print
    print('[habits] No se pudieron publicar métricas: $error');
  }
}

void _grantXp(
  CoreAPI api,
  int amount, {
  required String reason,
  required String sourceEvent,
}) {
  api.pulso
      .addExperience(
    amount,
    reason: reason,
    source: 'habits',
    sourceEvent: sourceEvent,
  )
      .catchError((Object error) {
    // ignore: avoid_print
    print('[habits] No se pudo otorgar XP: $error');
  });
}

void registerHabitsPlugin() => PluginManager.instance.register(habitsPlugin);
