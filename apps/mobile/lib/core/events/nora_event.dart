class NoraEventLogEntry {
  const NoraEventLogEntry({
    required this.id,
    required this.ownerId,
    required this.eventType,
    required this.source,
    required this.payload,
    required this.createdAt,
  });

  final int id;
  final String ownerId;
  final String eventType;
  final String source;
  final Map<String, Object?> payload;
  final DateTime createdAt;
}
