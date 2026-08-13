import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_controller.dart';
import '../storage/local_store.dart';
import 'plugin_storage.dart';

/// Acceso a [PluginStorage] desde la UI de un plugin, scopeado al owner
/// autenticado actual.
///
/// El manager construye un [PluginStorage] idéntico para el ciclo de vida
/// (CoreAPI); este provider permite que las páginas/controllers del plugin
/// usen la MISMA clase de bridge sin depender del manager. La regla de
/// scoping por `owner_id` se aplica igual en ambos caminos.
final pluginStorageProvider =
    Provider.family<PluginStorage, String>((ref, pluginId) {
  final ownerId = ref.watch(authControllerProvider).user?.id;
  return PluginStorage(
    store: noraLocalStore,
    pluginId: pluginId,
    ownerId: () => ownerId,
  );
});
