import 'package:flutter/material.dart';

import '../nora_colors.dart';
import '../nora_spacing.dart';

class NoraPanel extends StatelessWidget {
  const NoraPanel({
    required this.child,
    super.key,
    this.title,
    this.trailing,
    this.padding = const EdgeInsets.all(NoraSpacing.lg),
  });

  final String? title;
  final Widget? trailing;
  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: NoraColors.surface.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: NoraColors.border.withValues(alpha: 0.52)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null || trailing != null) ...[
            Row(
              children: [
                if (title != null)
                  Expanded(
                    child: Text(
                      title!,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                if (trailing != null) trailing!,
              ],
            ),
            const SizedBox(height: NoraSpacing.md),
          ],
          child,
        ],
      ),
    );
  }
}
