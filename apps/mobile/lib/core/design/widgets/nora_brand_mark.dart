import 'package:flutter/material.dart';

import '../nora_colors.dart';

class NoraBrandMark extends StatelessWidget {
  const NoraBrandMark({
    super.key,
    this.size = 56,
    this.showGlow = true,
  });

  final double size;
  final bool showGlow;

  static const asset = 'assets/brand/nora-isotipo-original.png';

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: NoraColors.surface.withValues(alpha: 0.62),
        boxShadow: showGlow
            ? [
                BoxShadow(
                  color: NoraColors.accent.withValues(alpha: 0.32),
                  blurRadius: size * 0.42,
                  spreadRadius: size * 0.03,
                ),
              ]
            : null,
      ),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: EdgeInsets.all(size * 0.12),
        child: Image.asset(
          asset,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
        ),
      ),
    );
  }
}
