import 'plugin_manifest.dart';

/// Registro estático de plugins. Los plugins se auto-registran al importar su
/// `index.dart` (side-effect); el bootstrap los importa desde
/// `plugin_bootstrap.dart`.
class PluginRegistry {
  PluginRegistry._();

  static final PluginRegistry instance = PluginRegistry._();

  final List<PluginManifest> _plugins = [];

  /// Registra (o reemplaza) un manifiesto. Re-registrar actualiza el manifiesto
  /// pero conserva la posición original.
  void register(PluginManifest manifest) {
    final index = _plugins.indexWhere((p) => p.id == manifest.id);
    if (index == -1) {
      _plugins.add(manifest);
    } else {
      _plugins[index] = manifest;
    }
  }

  List<PluginManifest> get all => List.unmodifiable(_plugins);

  PluginManifest? byId(String id) {
    for (final plugin in _plugins) {
      if (plugin.id == id) return plugin;
    }
    return null;
  }

  /// Para tests: limpia el registro y vuelve a registrar los [manifests].
  void reset({List<PluginManifest> manifests = const []}) {
    _plugins.clear();
    for (final manifest in manifests) {
      register(manifest);
    }
  }
}
