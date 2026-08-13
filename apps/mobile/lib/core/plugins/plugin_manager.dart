import 'core_api.dart';
import 'plugin_event_bus.dart';
import 'plugin_manifest.dart';
import 'plugin_metrics.dart';
import 'plugin_registry.dart';
import 'plugin_storage.dart';
import '../pulso/pulso_repository.dart';
import '../storage/local_store.dart';

/// Manager del ciclo de vida de plugins. Posee el estado de runtime de cada
/// plugin registrado (status + error), recoge páginas/nav items de los plugins
/// activos, construye un [CoreAPI] scopeado por plugin y aísla fallos: si un
/// plugin falla al inicializar pasa a `error` sin romper al resto de Nora.
class PluginManager {
  PluginManager._() {
    _eventBus.setPersistenceCallback(_persistEvent);
  }

  static final PluginManager instance = PluginManager._();

  final NoraEventBus _eventBus = NoraEventBus.instance;
  final PluginMetricsRegistry _metrics = PluginMetricsRegistry.instance;
  final Map<String, PluginEntry> _plugins = {};
  final Map<String, PluginPageDef> _pagesById = {};
  final Map<String, PluginNavItemDef> _navItemsById = {};

  String? _currentOwnerId;
  PulsoRepository? _pulsoRepository;

  /// Se setea en el bootstrap (post-login) y se limpia al hacer logout.
  void setCurrentOwner(String? ownerId) {
    _currentOwnerId = ownerId;
  }

  NoraEventBus get eventBus => _eventBus;

  // ─── Registro ────────────────────────────────────────────────────────────

  void register(PluginManifest manifest) {
    PluginRegistry.instance.register(manifest);
    final existing = _plugins[manifest.id];
    if (existing != null) {
      existing.manifest = manifest;
      return;
    }
    _plugins[manifest.id] =
        PluginEntry(manifest: manifest, status: PluginStatus.registered);
  }

  // ─── Ciclo de vida ───────────────────────────────────────────────────────

  Future<void> initPlugin(String pluginId) async {
    final entry = _plugins[pluginId];
    if (entry == null) {
      throw ArgumentError('Plugin "$pluginId" no está registrado');
    }
    if (entry.status == PluginStatus.active ||
        entry.status == PluginStatus.initializing) {
      return;
    }
    entry.status = PluginStatus.initializing;
    entry.error = null;
    try {
      final api = buildCoreApi(pluginId);
      // Aplicar migraciones de esquema antes del init para que las tablas
      // existan de entrada (idempotente).
      await api.storage.migrate(entry.manifest);
      await entry.manifest.init?.call(api);
      await entry.manifest.activate?.call(api);
      entry.status = PluginStatus.active;
      _collect(entry.manifest);
      _eventBus.emit(
        CoreEvents.pluginActivated,
        {'pluginId': pluginId},
        persist: false,
      );
    } catch (error) {
      entry.status = PluginStatus.error;
      entry.error = error;
      // ignore: avoid_print
      print('[PluginManager] Falló init del plugin "$pluginId": $error');
      _eventBus.emit(
        CoreEvents.pluginError,
        {'pluginId': pluginId, 'error': '$error'},
        persist: false,
      );
      rethrow;
    }
  }

  Future<void> deactivatePlugin(String pluginId) async {
    final entry = _plugins[pluginId];
    if (entry == null || entry.status != PluginStatus.active) return;
    try {
      final api = buildCoreApi(pluginId);
      await entry.manifest.deactivate?.call(api);
      _removeAllForPlugin(pluginId);
      entry.status = PluginStatus.inactive;
      _eventBus.emit(
        CoreEvents.pluginDeactivated,
        {'pluginId': pluginId},
        persist: false,
      );
    } catch (error) {
      entry.status = PluginStatus.error;
      entry.error = error;
      // ignore: avoid_print
      print('[PluginManager] Falló deactivate del plugin "$pluginId": $error');
      rethrow;
    }
  }

  /// Flujo unificado enable/disable.
  Future<void> setPluginStatus(String pluginId, PluginStatus status) async {
    final entry = _plugins[pluginId];
    if (entry == null) {
      throw ArgumentError('Plugin "$pluginId" no está registrado');
    }
    switch (status) {
      case PluginStatus.active:
        await initPlugin(pluginId);
        break;
      case PluginStatus.inactive:
        await deactivatePlugin(pluginId);
        break;
      default:
        entry.status = status;
    }
  }

  // ─── Consultas ───────────────────────────────────────────────────────────

  bool isPluginActive(String pluginId) =>
      _plugins[pluginId]?.status == PluginStatus.active;

  PluginStatus getStatus(String pluginId) =>
      _plugins[pluginId]?.status ?? PluginStatus.inactive;

  PluginManifest? getManifest(String pluginId) => _plugins[pluginId]?.manifest;

  List<PluginEntry> getPlugins() => List.unmodifiable(_plugins.values);

  List<PluginPageDef> getActivePages() {
    final pages = _pagesById.values
        .where((page) => isPluginActive(page.pluginId))
        .toList()
      ..sort((a, b) => a.order.compareTo(b.order));
    return pages;
  }

  List<PluginNavItemDef> getActiveNavItems() {
    final items = _navItemsById.values
        .where((item) => isPluginActive(item.pluginId))
        .toList();
    items.sort((a, b) => (a.order ?? 99).compareTo(b.order ?? 99));
    return items;
  }

  /// Construye el [CoreAPI] scopeado para [pluginId] con el owner actual.
  CoreAPI buildCoreApi(String pluginId) {
    return CoreAPI(
      pluginId: pluginId,
      storage: PluginStorage(
        store: noraLocalStore,
        pluginId: pluginId,
        ownerId: () => _currentOwnerId,
      ),
      events: CoreEventsApi(
        emit: (event, payload, {source, persist = true}) {
          _eventBus.emit(event, payload, source: source, persist: persist);
        },
        on: (event, handler) => _eventBus.on(event, handler),
        off: (event, handler) => _eventBus.off(event, handler),
      ),
      metrics: CoreMetricsApi(
        publish: (name, value, {unit, domain}) {
          _metrics.publish(name, value, unit: unit, domain: domain);
        },
        get: (name) => _metrics.get(name),
        list: () => _metrics.list(),
      ),
      pulso: CorePulsoApi(
        addExperience: (amount,
            {required reason, required source, required sourceEvent}) async {
          final owner = _currentOwnerId;
          if (owner == null) return;
          final repository =
              _pulsoRepository ??= PulsoRepository(noraLocalStore);
          await repository.addExperience(
            ownerId: owner,
            amount: amount,
            reason: reason,
            source: source,
            sourceEvent: sourceEvent,
          );
        },
      ),
      getOwnerId: () => _currentOwnerId,
    );
  }

  // ─── Internos ────────────────────────────────────────────────────────────

  void _collect(PluginManifest manifest) {
    for (final page in manifest.pages) {
      _pagesById[page.id] = page;
    }
    for (final navItem in manifest.navItems) {
      _navItemsById[navItem.id] = navItem;
    }
  }

  void _removeAllForPlugin(String pluginId) {
    _pagesById.removeWhere((_, page) => page.pluginId == pluginId);
    _navItemsById.removeWhere((_, item) => item.pluginId == pluginId);
  }

  void _persistEvent(String event, Object? payload, String source) {
    final owner = _currentOwnerId;
    if (owner == null) return;
    noraLocalStore
        .logEvent(
      ownerId: owner,
      eventType: event,
      source: source,
      payload: (payload as Map?)?.cast<String, Object?>() ?? const {},
    )
        .catchError((Object error) {
      // La persistencia nunca debe romper al emisor.
      // ignore: avoid_print
      print('[PluginManager] Falló persistir evento "$event": $error');
    });
  }
}
