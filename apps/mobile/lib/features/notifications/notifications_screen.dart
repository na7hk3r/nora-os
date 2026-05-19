import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/nora_colors.dart';
import '../../core/design/nora_spacing.dart';
import '../../core/design/widgets/nora_button.dart';
import '../../core/design/widgets/nora_card.dart';
import '../../core/models/nora_models.dart';
import 'notifications_controller.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationsControllerProvider);

    return state.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stackTrace) => const Center(child: Text('No se pudieron cargar avisos.')),
      data: (items) {
        final today = noraDateKey(DateTime.now());
        final yesterday = noraDateKey(DateTime.now().subtract(const Duration(days: 1)));
        final unread = items.where((item) => !item.isRead).length;
        final groups = <String, List<NoraNotification>>{
          'Hoy': items.where((item) => noraDateKey(item.createdAt) == today).toList(),
          'Ayer': items.where((item) => noraDateKey(item.createdAt) == yesterday).toList(),
          'Anteriores': items
              .where((item) {
                final key = noraDateKey(item.createdAt);
                return key != today && key != yesterday;
              })
              .toList(),
        };

        return ListView(
          children: [
            NoraCard(
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      unread == 0 ? 'Todo al dia' : '$unread alertas sin leer',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  NoraButton(
                    label: 'Limpiar',
                    icon: Icons.done_all_rounded,
                    variant: NoraButtonVariant.ghost,
                    onPressed: unread == 0
                        ? null
                        : () => ref.read(notificationsControllerProvider.notifier).markAllRead(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: NoraSpacing.lg),
            if (items.isEmpty)
              const _NotificationsEmpty()
            else
              ...groups.entries.where((entry) => entry.value.isNotEmpty).map((entry) {
                return _NotificationGroup(title: entry.key, items: entry.value);
              }),
          ],
        );
      },
    );
  }
}

class _NotificationGroup extends StatelessWidget {
  const _NotificationGroup({
    required this.title,
    required this.items,
  });

  final String title;
  final List<NoraNotification> items;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: NoraSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(title, style: Theme.of(context).textTheme.titleMedium),
          ),
          NoraCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (var i = 0; i < items.length; i++) ...[
                  _NotificationTile(item: items[i]),
                  if (i != items.length - 1)
                    Divider(height: 1, color: NoraColors.border.withValues(alpha: 0.44)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item});

  final NoraNotification item;

  @override
  Widget build(BuildContext context) {
    final color = _kindColor(item.kind);

    return InkWell(
      onTap: item.deepLink == null ? null : () => context.go(item.deepLink!),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color.withValues(alpha: 0.16),
              ),
              child: Icon(_kindIcon(item.kind), color: color, size: 20),
            ),
            const SizedBox(width: NoraSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      ),
                      if (!item.isRead)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: NoraColors.accent,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    item.body,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
                  ),
                ],
              ),
            ),
            if (item.deepLink != null)
              const Icon(Icons.chevron_right_rounded, color: NoraColors.muted),
          ],
        ),
      ),
    );
  }

  IconData _kindIcon(NoraNotificationKind kind) {
    switch (kind) {
      case NoraNotificationKind.mention:
        return Icons.alternate_email_rounded;
      case NoraNotificationKind.task:
        return Icons.check_circle_outline_rounded;
      case NoraNotificationKind.project:
        return Icons.workspaces_outline;
      case NoraNotificationKind.reminder:
        return Icons.notifications_none_rounded;
    }
  }

  Color _kindColor(NoraNotificationKind kind) {
    switch (kind) {
      case NoraNotificationKind.mention:
        return NoraColors.accentLight;
      case NoraNotificationKind.task:
        return NoraColors.success;
      case NoraNotificationKind.project:
        return NoraColors.info;
      case NoraNotificationKind.reminder:
        return NoraColors.warning;
    }
  }
}

class _NotificationsEmpty extends StatelessWidget {
  const _NotificationsEmpty();

  @override
  Widget build(BuildContext context) {
    return NoraCard(
      child: Column(
        children: [
          const Icon(Icons.notifications_paused_outlined, color: NoraColors.muted),
          const SizedBox(height: NoraSpacing.sm),
          Text('Sin notificaciones', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: NoraSpacing.xs),
          Text(
            'Nora OS mostrara aca solo lo relevante.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
          ),
        ],
      ),
    );
  }
}
