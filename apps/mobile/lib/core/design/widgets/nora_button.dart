import 'package:flutter/material.dart';

import '../nora_colors.dart';

enum NoraButtonVariant { primary, secondary, ghost }

class NoraButton extends StatelessWidget {
  const NoraButton({
    required this.label,
    required this.onPressed,
    super.key,
    this.icon,
    this.variant = NoraButtonVariant.primary,
    this.expand = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final NoraButtonVariant variant;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final isPrimary = variant == NoraButtonVariant.primary;
    final isGhost = variant == NoraButtonVariant.ghost;
    final foreground = isPrimary ? Colors.white : NoraColors.text;
    final background = isPrimary
        ? NoraColors.accent
        : isGhost
            ? Colors.transparent
            : NoraColors.surfaceLight;

    final child = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 18),
          const SizedBox(width: 8),
        ],
        Flexible(
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );

    return SizedBox(
      width: expand ? double.infinity : null,
      height: 48,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: background,
          foregroundColor: foreground,
          disabledBackgroundColor: NoraColors.surfaceLighter.withValues(alpha: 0.45),
          disabledForegroundColor: NoraColors.muted,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
              color: isGhost ? NoraColors.border.withValues(alpha: 0.6) : Colors.transparent,
            ),
          ),
        ),
        child: child,
      ),
    );
  }
}
