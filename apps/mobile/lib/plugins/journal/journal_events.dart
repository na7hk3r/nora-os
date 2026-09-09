/// Eventos del plugin Journal.
abstract final class JournalEvents {
  static const entryCreated = 'JOURNAL_ENTRY_CREATED';
  static const entryUpdated = 'JOURNAL_ENTRY_UPDATED';
  static const entryDeleted = 'JOURNAL_ENTRY_DELETED';
  static const entryRestored = 'JOURNAL_ENTRY_RESTORED';
  static const moodLogged = 'JOURNAL_MOOD_LOGGED';
  static const promptUsed = 'JOURNAL_PROMPT_USED';

  static const List<String> all = [
    entryCreated,
    entryUpdated,
    entryDeleted,
    entryRestored,
    moodLogged,
    promptUsed,
  ];
}
