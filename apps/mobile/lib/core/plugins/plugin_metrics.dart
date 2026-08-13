/// Registro de métricas en memoria. Permite que un plugin publique KPIs de su
/// dominio (ej. racha actual, tasa de cumplimiento) que otros plugins o el
/// core pueden leer. Es puramente en memoria.
class MetricValue {
  const MetricValue({
    required this.name,
    required this.value,
    this.unit,
    this.domain,
  });

  final String name;
  final Object value;
  final String? unit;
  final String? domain;
}

class PluginMetricsRegistry {
  PluginMetricsRegistry._();

  static final PluginMetricsRegistry instance = PluginMetricsRegistry._();

  final Map<String, MetricValue> _metrics = {};

  void publish(String name, Object value, {String? unit, String? domain}) {
    _metrics[name] =
        MetricValue(name: name, value: value, unit: unit, domain: domain);
  }

  Object? get(String name) => _metrics[name]?.value;

  List<MetricValue> list() => List.unmodifiable(_metrics.values);

  void clear() => _metrics.clear();
}
