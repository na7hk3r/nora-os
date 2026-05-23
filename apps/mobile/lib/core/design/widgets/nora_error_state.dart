import 'package:flutter/material.dart';

import '../nora_colors.dart';
import '../nora_spacing.dart';
import 'nora_button.dart';
import 'nora_card.dart';

class NoraErrorState extends StatelessWidget {
  const NoraErrorState({
    required this.title,
    required this.message,
    super.key,
    this.onRetry,
  });

  final String title;
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return NoraCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline_rounded, color: NoraColors.danger, size: 30),
          const SizedBox(height: NoraSpacing.sm),
          Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: NoraSpacing.xs),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
          ),
          if (onRetry != null) ...[
            const SizedBox(height: NoraSpacing.lg),
            NoraButton(
              label: 'Reintentar',
              icon: Icons.refresh_rounded,
              variant: NoraButtonVariant.secondary,
              onPressed: onRetry,
            ),
          ],
        ],
      ),
    );
  }
}
