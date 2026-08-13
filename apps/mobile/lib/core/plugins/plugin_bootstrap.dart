import '../../plugins/habits/habits_index.dart' show registerHabitsPlugin;
import '../../plugins/journal/journal_index.dart' show registerJournalPlugin;

/// Registra los plugins bundled. Se llama una vez al arrancar la app; el
/// registro es un side-effect, la activación la decide el PluginController
/// tras el login.
void registerBundledPlugins() {
  registerHabitsPlugin();
  registerJournalPlugin();
}
