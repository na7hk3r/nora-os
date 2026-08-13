import 'package:flutter/widgets.dart';

import 'core_api.dart';

/// Identidad + metadatos + capacidades (páginas, navegación, eventos) +
/// estado (migraciones) + ciclo de vida (init/activate/deactivate). Las
/// páginas declaran un `WidgetBuilder` (Flutter).
///
/// Ver `docs/PLUGIN_SYSTEM_MOBILE.md` para el modelo completo del sistema.
class PluginManifest {
  const PluginManifest({
    required this.id,
    required this.name,
    required this.version,
    required this.description,
    required this.icon,
    this.domain,
    this.domainKeywords = const [],
    this.recommended = false,
    this.pages = const [],
    this.navItems = const [],
    this.events = const {},
    this.migrations = const [],
    this.init,
    this.activate,
    this.deactivate,
  });

  /// kebab-case único; también es el prefijo de tablas SQL del plugin.
  final String id;
  final String name;
  final String version;
  final String description;

  /// Nombre de icono (estilo Lucide: 'Repeat', 'BookOpen'...). Se resuelve con
  /// `PluginIconMapper` y cae a un icono por defecto si no se conoce.
  final String icon;

  /// Dominio de consistencia (ej. 'productivity', 'fitness').
  final String? domain;
  final List<String> domainKeywords;

  /// Recomendado en primera ejecución. Solo aplica cuando aún no hay estado
  /// persistido.
  final bool recommended;

  final List<PluginPageDef> pages;
  final List<PluginNavItemDef> navItems;

  /// `{ 'emits': [...], 'listens': [...] }` — documentación/diagnóstico.
  final Map<String, List<String>> events;

  /// Migraciones de esquema aplicadas una vez por (plugin, versión), trackeadas
  /// en `plugin_migrations`.
  final List<PluginMigration> migrations;

  /// Llamado al activarse el plugin.
  final Future<void> Function(CoreAPI api)? init;

  /// Llamado después de [init].
  final Future<void> Function(CoreAPI api)? activate;

  /// Llamado al desactivar (cleanup).
  final Future<void> Function(CoreAPI api)? deactivate;
}

/// Migración de esquema. Se ejecuta dentro de una transacción y se registra
/// en `plugin_migrations` para no repetirla.
class PluginMigration {
  const PluginMigration({required this.version, required this.up});

  final int version;

  /// SQL DDL/DML idempotente (usa `CREATE TABLE IF NOT EXISTS`, etc.).
  final String up;
}

/// Página del plugin. Se monta como ruta GoRouter bajo
/// `/plugins/<pluginId>/<path>` dentro del `ShellRoute`.
class PluginPageDef {
  const PluginPageDef({
    required this.id,
    required this.pluginId,
    required this.path,
    required this.title,
    required this.builder,
    this.icon,
    this.order = 0,
  });

  final String id;
  final String pluginId;

  /// Path relativo dentro del namespace del plugin (ej. 'habits' o 'history').
  final String path;
  final String title;
  final WidgetBuilder builder;
  final String? icon;
  final int order;
}

/// Ruta GoRouter completa de una página de plugin, bajo `/plugins/<pluginId>`.
/// Única fuente de verdad usada por router y shell.
extension PluginPagePath on PluginPageDef {
  String get fullPath {
    final normalized =
        path.isEmpty ? '' : '/${path.replaceAll(RegExp(r'^/+|/+$'), '')}';
    return '/plugins/$pluginId$normalized';
  }
}

/// Item de navegación del plugin. En Mobile la navegación real la resuelve
/// GoRouter; estos items documentan jerarquía (páginas hijas vía [parentId])
/// para futuros menús.
class PluginNavItemDef {
  const PluginNavItemDef({
    required this.id,
    required this.pluginId,
    required this.label,
    required this.path,
    required this.icon,
    this.order,
    this.parentId,
  });

  final String id;
  final String pluginId;
  final String label;
  final String path;
  final String icon;
  final int? order;
  final String? parentId;
}

/// Estado de ciclo de vida del plugin.
enum PluginStatus { registered, initializing, active, inactive, error }

/// Entrada de runtime del manager.
class PluginEntry {
  PluginEntry({required this.manifest, required this.status});

  /// Mutable: re-registrar un plugin actualiza el manifiesto en el lugar.
  PluginManifest manifest;
  PluginStatus status;
  Object? error;
}
