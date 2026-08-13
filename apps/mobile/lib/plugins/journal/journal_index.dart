import '../../core/plugins/core_api.dart';
import '../../core/plugins/plugin_manager.dart';
import '../../core/plugins/plugin_manifest.dart';
import 'journal_events.dart';
import 'journal_models.dart';
import 'journal_pages/journal_history_page.dart';
import 'journal_pages/journal_home_page.dart';

/// Plugin Journal. Diario personal con mood tracking y prompts. Una entrada
/// por día. La XP se otorga por escribir (+5 creada, +2 actualizada, +1 mood)
/// y las métricas (`total_entries`, `current_streak`, `avg_mood`) se publican
/// para consumo cross-plugin.
final journalPlugin = PluginManifest(
  id: 'journal',
  name: 'Journal',
  version: '1.0.0',
  description: 'Diario personal con mood tracking y prompts.',
  icon: 'BookOpen',
  domain: 'knowledge',
  domainKeywords: const ['journal', 'diary', 'mood', 'reflection'],
  recommended: true,
  migrations: const [
    PluginMigration(
      version: 1,
      up: '''
        CREATE TABLE IF NOT EXISTS journal_entries (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          date TEXT NOT NULL,
          mood INTEGER,
          prompt_id TEXT,
          title TEXT NOT NULL DEFAULT '',
          content TEXT NOT NULL,
          tags TEXT NOT NULL DEFAULT '[]',
          word_count INTEGER NOT NULL DEFAULT 0,
          pinned INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE (owner_id, date)
        );
        CREATE TABLE IF NOT EXISTS journal_prompts (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          text TEXT NOT NULL,
          is_custom INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          used_at TEXT,
          times_used INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_journal_entries_owner_date ON journal_entries(owner_id, date);
      ''',
    ),
  ],
  pages: [
    PluginPageDef(
      id: 'journal-dashboard',
      pluginId: 'journal',
      path: '',
      title: 'Journal',
      icon: 'BookOpen',
      builder: (_) => const JournalHomePage(),
      order: 50,
    ),
    PluginPageDef(
      id: 'journal-history',
      pluginId: 'journal',
      path: 'history',
      title: 'Historial',
      icon: 'History',
      builder: (_) => const JournalHistoryPage(),
      order: 51,
    ),
  ],
  navItems: [
    PluginNavItemDef(
      id: 'journal-nav',
      pluginId: 'journal',
      label: 'Journal',
      icon: 'BookOpen',
      path: '',
      order: 50,
    ),
    PluginNavItemDef(
      id: 'journal-history-nav',
      pluginId: 'journal',
      label: 'Historial',
      icon: 'History',
      path: 'history',
      order: 51,
      parentId: 'journal-nav',
    ),
  ],
  events: {'emits': JournalEvents.all, 'listens': []},
  init: (api) async {
    await _publishJournalMetrics(api);

    api.events
        .on(JournalEvents.entryCreated, (_) => _publishJournalMetrics(api));
    api.events
        .on(JournalEvents.entryUpdated, (_) => _publishJournalMetrics(api));
    api.events
        .on(JournalEvents.entryDeleted, (_) => _publishJournalMetrics(api));
    api.events.on(JournalEvents.moodLogged, (_) => _publishJournalMetrics(api));

    // XP.
    api.events.on(
      JournalEvents.entryCreated,
      (_) => _grantXp(api, 5,
          reason: 'Entrada de journal creada',
          sourceEvent: 'MOBILE_JOURNAL_ENTRY_CREATED'),
    );
    api.events.on(
      JournalEvents.entryUpdated,
      (_) => _grantXp(api, 2,
          reason: 'Entrada de journal actualizada',
          sourceEvent: 'MOBILE_JOURNAL_ENTRY_UPDATED'),
    );
    api.events.on(
      JournalEvents.moodLogged,
      (_) => _grantXp(api, 1,
          reason: 'Mood registrado', sourceEvent: 'MOBILE_JOURNAL_MOOD_LOGGED'),
    );
  },
);

/// Publica métricas cross-plugin del Journal.
Future<void> _publishJournalMetrics(CoreAPI api) async {
  try {
    final ownerId = api.ownerId;
    if (ownerId == null) {
      _publishZeros(api);
      return;
    }
    final rows = await api.storage.query(
      'SELECT * FROM journal_entries WHERE owner_id = ?',
      [ownerId],
    );
    if (rows.isEmpty) {
      _publishZeros(api);
      return;
    }
    final entries = rows.map(JournalEntry.fromRow).toList();
    final stats = computeJournalStats(entries);
    api.metrics.publish('journal.total_entries', stats.totalEntries);
    api.metrics.publish('journal.current_streak', stats.currentStreak);
    api.metrics.publish('journal.best_streak', stats.bestStreak);
    api.metrics.publish('journal.avg_mood', stats.avgMood ?? 0);
  } catch (error) {
    // Las métricas nunca deben romper el ciclo de vida del plugin.
    // ignore: avoid_print
    print('[journal] No se pudieron publicar métricas: $error');
  }
}

void _publishZeros(CoreAPI api) {
  api.metrics.publish('journal.total_entries', 0);
  api.metrics.publish('journal.current_streak', 0);
  api.metrics.publish('journal.best_streak', 0);
  api.metrics.publish('journal.avg_mood', 0);
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
    source: 'journal',
    sourceEvent: sourceEvent,
  )
      .catchError((Object error) {
    // ignore: avoid_print
    print('[journal] No se pudo otorgar XP: $error');
  });
}

void registerJournalPlugin() => PluginManager.instance.register(journalPlugin);
