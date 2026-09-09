import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/core/plugins/plugin_manager.dart';
import 'package:nora_mobile/core/plugins/plugin_manifest.dart';
import 'package:nora_mobile/core/plugins/plugin_metrics.dart';

void main() {
  test('setCurrentOwner resetea el runtime al cerrar sesión o cambiar de owner',
      () async {
    final manager = PluginManager.instance;
    manager.register(_loudManifest);
    addTearDown(() => manager.setCurrentOwner(null));

    // Arranque con user-1: plugin activo, páginas colectadas y métricas vivas.
    manager.setCurrentOwner('user-1');
    await manager.initPlugin('loud');
    expect(manager.getStatus('loud'), PluginStatus.active);
    expect(manager.getActivePages().map((p) => p.id), contains('loud-page'));
    expect(PluginMetricsRegistry.instance.get('loud.test_metric'), 1);

    // Logout: el runtime debe quedar limpio para el próximo usuario.
    manager.setCurrentOwner(null);
    expect(manager.getStatus('loud'), PluginStatus.inactive,
        reason: 'al cerrar sesión el plugin debe volver a inactivo');
    expect(manager.getActivePages(), isEmpty,
        reason: 'el registro de páginas no debe sobrevivir al logout');
    expect(manager.getActiveNavItems(), isEmpty,
        reason: 'el registro de nav items no debe sobrevivir al logout');
    expect(PluginMetricsRegistry.instance.list(), isEmpty,
        reason: 'las métricas del owner anterior deben limpiarse');

    // Cambio de owner: mismo reset, y el nuevo owner puede reactivar plugins.
    manager.setCurrentOwner('user-2');
    expect(manager.getStatus('loud'), PluginStatus.inactive,
        reason: 'el estado activo de user-1 no debe filtrarse a user-2');
    expect(manager.getActivePages(), isEmpty);
    await manager.initPlugin('loud');
    expect(manager.getStatus('loud'), PluginStatus.active);
    expect(manager.getActivePages().map((p) => p.id), contains('loud-page'));
  });
}

class _DummyPage extends StatelessWidget {
  const _DummyPage();

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}

/// Manifest sin migraciones (evita sqflite en host) cuyo init publica una
/// métrica para verificar el ciclo de vida del runtime.
final _loudManifest = PluginManifest(
  id: 'loud',
  name: 'Loud',
  version: '1.0.0',
  description: 'Plugin de test del ciclo de vida.',
  icon: 'Star',
  domain: 'test',
  migrations: const [],
  pages: [
    PluginPageDef(
      id: 'loud-page',
      pluginId: 'loud',
      path: '',
      title: 'Loud',
      icon: 'Star',
      builder: (_) => const _DummyPage(),
      order: 99,
    ),
  ],
  navItems: [
    PluginNavItemDef(
      id: 'loud-nav',
      pluginId: 'loud',
      label: 'Loud',
      icon: 'Star',
      path: '',
      order: 99,
    ),
  ],
  init: (api) async {
    api.metrics.publish('loud.test_metric', 1);
  },
);