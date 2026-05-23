import 'package:flutter/material.dart';

import '../nora_colors.dart';
import '../nora_spacing.dart';

class NoraMetricTile extends StatelessWidget {
  const NoraMetricTile({
    required this.value,
    required this.label,
    required this.icon,
    super.key,
    this.color = NoraColors.accentLight,
  });

  final String value;
  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: NoraColors.surfaceLight.withValues(alpha: 0.62),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: NoraColors.border.withValues(alpha: 0.42)),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withValues(alpha: 0.14),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: NoraSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(color: color)),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
