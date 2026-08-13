import 'plugin_metrics.dart';
import 'plugin_storage.dart';

/// Servicios que recibe un plugin durante su ciclo de vida: storage + eventos
/// + servicios compartidos, scopeados por plugin. Las implementaciones
/// concretas se inyectan como clausuras desde [PluginManager] para que esta
/// clase sea testeable en Dart puro.
class CoreAPI {
  const CoreAPI({
    required this.pluginId,
    required this.storage,
    required this.events,
    required this.metrics,
    required this.pulso,
    this.getOwnerId,
  });

  final String pluginId;
  final PluginStorage storage;

  /// Superficie de eventos ligada al [NoraEventBus] compartido.
  final CoreEventsApi events;
  final CoreMetricsApi metrics;

  /// Puente a Pulso Nora (XP/niveles).
  final CorePulsoApi pulso;

  /// Owner actual autenticado, si existe (null si no hay sesión).
  final String? Function()? getOwnerId;

  String? get ownerId => getOwnerId?.call();
}

class CoreEventsApi {
  const CoreEventsApi({
    required this.emit,
    required this.on,
    required this.off,
  });

  final void Function(String event, Object? payload,
      {String? source, bool persist}) emit;
  final void Function() Function(
      String event, void Function(Object? payload) handler) on;
  final void Function(String event, void Function(Object? payload) handler) off;
}

class CoreMetricsApi {
  const CoreMetricsApi({
    required this.publish,
    required this.get,
    required this.list,
  });

  final void Function(String name, Object value, {String? unit, String? domain})
      publish;
  final Object? Function(String name) get;
  final List<MetricValue> Function() list;
}

class CorePulsoApi {
  const CorePulsoApi({required this.addExperience});

  /// Otorga experiencia a través de Pulso Nora.
  final Future<void> Function(
    int amount, {
    required String reason,
    required String source,
    required String sourceEvent,
  }) addExperience;
}
