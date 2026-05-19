import 'package:flutter/material.dart';

import '../nora_colors.dart';
import '../nora_spacing.dart';

class NoraCard extends StatelessWidget {
  const NoraCard({
    required this.child,
    super.key,
    this.onTap,
    this.padding = const EdgeInsets.all(NoraSpacing.lg),
    this.margin,
    this.glass = true,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final bool glass;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: NoraColors.surfaceLight.withValues(alpha: glass ? 0.72 : 1),
        gradient: glass ? NoraColors.cardGradient : null,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: NoraColors.border.withValues(alpha: 0.58)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.24),
            blurRadius: 22,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: child,
    );

    if (onTap == null) return card;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: card,
      ),
    );
  }
}
