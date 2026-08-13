import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_controller.dart';
import '../storage/local_store.dart';
import 'plugin_manager.dart';
import 'plugin_manifest.dart';
import 'plugin_registry.dart';
import 'plugin_storage.dart';

/// Estado de runtime de plugins expuesto a la UI.
class PluginUiState {
  const PluginUiState({
    this.statuses = const {},
    this.activePluginIds = const [],
    this.uiVersion = 0,
    this.loading = true,
  });

  final Map<String, PluginStatus> statuses;
  final List<String> activePluginIds;

  /// Se incrementa tras el bootstrap y tras cada enable/disable para que el
  /// router y el shell se reconstruyan desde el registry (única fuente de
  /// verdad).
  final int uiVersion;
  final bool loading;

  bool isActive(String pluginId) => statuses[pluginId] == PluginStatus.active;

  PluginUiState copyWith({
    Map<String, PluginStatus>? statuses,
    List<String>? activePluginIds,
    int? uiVersion,
    bool? loading,
  }) {
    return PluginUiState(
      statuses: statuses ?? this.statuses,
      activePluginIds: activePluginIds ?? this.activePluginIds,
      uiVersion: uiVersion ?? this.uiVersion,
      loading: loading ?? this.loading,
    );
  }
}

final pluginControllerProvider =
    StateNotifierProvider<PluginController, PluginUiState>((ref) {
  final ownerId = ref.watch(authControllerProvider).user?.id;
  return PluginController(ownerId: ownerId)..bootstrap();
});

class PluginController extends StateNotifier<PluginUiState> {
  PluginController({required String? ownerId})
      : _ownerId = ownerId,
        super(const PluginUiState());

  final PluginManager _manager = PluginManager.instance;
  final String? _ownerId;

  /// Carga la lista persistida de plugins activos, activa esos y marca el
  /// resto como inactivos. Los fallos se aíslan por plugin: uno roto pasa a
  /// `error` y el boot continúa.
  Future<void> bootstrap() async {
    _manager.setCurrentOwner(_ownerId);
    final activeIds = await _loadActiveIds();

    final statuses = <String, PluginStatus>{};
    for (final manifest in PluginRegistry.instance.all) {
      if (activeIds.contains(manifest.id)) {
        statuses[manifest.id] = PluginStatus.initializing;
        try {
          await _manager.initPlugin(manifest.id);
          statuses[manifest.id] = PluginStatus.active;
        } catch (_) {
          statuses[manifest.id] = PluginStatus.error;
        }
      } else {
        statuses[manifest.id] = PluginStatus.inactive;
      }
    }

    state = PluginUiState(
      statuses: statuses,
      activePluginIds: List.unmodifiable(activeIds),
      uiVersion: state.uiVersion + 1,
      loading: false,
    );
  }

  /// Flujo unificado enable/disable. Devuelve 'active', 'inactive' o 'error'
  /// para que la UI reaccione.
  Future<String> setPluginEnabled(String pluginId, bool enabled) async {
    try {
      if (enabled) {
        await _manager.initPlugin(pluginId);
      } else {
        await _manager.deactivatePlugin(pluginId);
      }
    } catch (_) {
      await _persistActiveIds();
      _refreshState();
      return 'error';
    }

    await _persistActiveIds();
    _refreshState();
    return enabled ? 'active' : 'inactive';
  }

  void _refreshState() {
    final statuses = <String, PluginStatus>{};
    final active = <String>[];
    for (final entry in _manager.getPlugins()) {
      statuses[entry.manifest.id] = entry.status;
      if (entry.status == PluginStatus.active) {
        active.add(entry.manifest.id);
      }
    }
    state = PluginUiState(
      statuses: statuses,
      activePluginIds: List.unmodifiable(active),
      uiVersion: state.uiVersion + 1,
      loading: false,
    );
  }

  Future<List<String>> _loadActiveIds() async {
    final owner = _ownerId;
    if (owner == null) return const [];
    String? raw;
    try {
      raw = await noraLocalStore.getSetting(
        owner,
        PluginStorage.coreKey('activePlugins'),
      );
    } catch (_) {
      // Storage no disponible (p.ej. tests sin sqflite): caer a defaults.
      raw = null;
    }
    if (raw == null || raw.isEmpty) {
      // Primera ejecución: activar los plugins `recommended`. Después manda
      // lo que toggleó el usuario.
      return PluginRegistry.instance.all
          .where((manifest) => manifest.recommended)
          .map((manifest) => manifest.id)
          .toList();
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.whereType<String>().toList();
      }
    } catch (_) {
      // Settings corruptas: caer a defaults en vez de crashear.
    }
    return PluginRegistry.instance.all
        .where((manifest) => manifest.recommended)
        .map((manifest) => manifest.id)
        .toList();
  }

  Future<void> _persistActiveIds() async {
    final owner = _ownerId;
    if (owner == null) return;
    await noraLocalStore.setSetting(
      owner,
      PluginStorage.coreKey('activePlugins'),
      jsonEncode(state.activePluginIds),
    );
  }
}
