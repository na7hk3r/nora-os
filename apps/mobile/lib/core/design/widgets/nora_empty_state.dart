import 'package:flutter/material.dart';

import '../nora_colors.dart';
import '../nora_spacing.dart';
import 'nora_button.dart';
import 'nora_card.dart';

class NoraEmptyState extends StatelessWidget {
  const NoraEmptyState({
    required this.icon,
    required this.title,
    required this.message,
    super.key,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return NoraCard(
      glass: false,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: NoraColors.muted, size: 28),
          const SizedBox(height: NoraSpacing.sm),
          Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: NoraSpacing.xs),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: NoraSpacing.lg),
            NoraButton(
              label: actionLabel!,
              icon: Icons.add_rounded,
              variant: NoraButtonVariant.secondary,
              onPressed: onAction,
            ),
          ],
        ],
      ),
    );
  }
}
