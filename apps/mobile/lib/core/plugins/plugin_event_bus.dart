/// Pub/sub core. Mantiene un historial acotado en memoria y persiste eventos
/// vía callback (conectado al store local). Un fallo de persistencia o de un
/// listener nunca rompe la emisión.
class NoraEventBus {
  NoraEventBus._();

  static final NoraEventBus instance = NoraEventBus._();

  final Map<String, Set<void Function(Object? payload)>> _listeners = {};
  final List<HistoryEvent> _history = [];
  static const _maxHistory = 100;

  void Function(String event, Object? payload, String source)? _persistFn;

  void setPersistenceCallback(
    void Function(String event, Object? payload, String source) fn,
  ) {
    _persistFn = fn;
  }

  void emit(
    String event,
    Object? payload, {
    String? source,
    bool persist = true,
  }) {
    _history.add(
      HistoryEvent(
        event: event,
        payload: payload,
        timestamp: DateTime.now().millisecondsSinceEpoch,
      ),
    );
    if (_history.length > _maxHistory) {
      _history.removeAt(0);
    }

    final resolvedSource = source ?? _inferEventSource(event);
    if (persist && resolvedSource != null && _persistFn != null) {
      try {
        _persistFn!(event, payload, resolvedSource);
      } catch (error) {
        // La persistencia nunca debe romper la emisión.
        // ignore: avoid_print
        print('[NoraEventBus] Failed to persist event "$event": $error');
      }
    }

    final handlers = _listeners[event];
    if (handlers == null || handlers.isEmpty) return;
    for (final handler in List.of(handlers)) {
      try {
        handler(payload);
      } catch (error) {
        // Un listener fallido no debe impedir que corran los demás.
        // ignore: avoid_print
        print('[NoraEventBus] Listener error for "$event": $error');
      }
    }
  }

  /// Devuelve una función de desuscripción.
  void Function() on(String event, void Function(Object? payload) handler) {
    final handlers =
        _listeners.putIfAbsent(event, () => <void Function(Object?)>{});
    handlers.add(handler);
    return () => off(event, handler);
  }

  void off(String event, void Function(Object? payload) handler) {
    _listeners[event]?.remove(handler);
  }

  /// Historial acotado (diagnóstico).
  List<HistoryEvent> get history => List.unmodifiable(_history);

  static String? _inferEventSource(String event) {
    if (event.startsWith('HABITS_')) return 'habits';
    if (event.startsWith('JOURNAL_')) return 'journal';
    if (event.startsWith('CORE_')) return 'core';
    if (event.startsWith('PULSO_')) return 'pulso';
    return null;
  }
}

class HistoryEvent {
  HistoryEvent({
    required this.event,
    required this.payload,
    required this.timestamp,
  });

  final String event;
  final Object? payload;
  final int timestamp;
}

/// Eventos emitidos por el core.
abstract final class CoreEvents {
  static const profileUpdated = 'CORE_PROFILE_UPDATED';
  static const pluginActivated = 'CORE_PLUGIN_ACTIVATED';
  static const pluginDeactivated = 'CORE_PLUGIN_DEACTIVATED';
  static const pluginError = 'CORE_PLUGIN_ERROR';
}
