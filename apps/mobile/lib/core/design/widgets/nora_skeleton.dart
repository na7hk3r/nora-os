import 'package:flutter/material.dart';

import '../nora_colors.dart';

class NoraSkeleton extends StatelessWidget {
  const NoraSkeleton({
    super.key,
    this.height = 120,
    this.radius = 20,
  });

  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Cargando',
      child: Container(
        height: height,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(radius),
          border: Border.all(color: NoraColors.border.withValues(alpha: 0.42)),
          gradient: LinearGradient(
            colors: [
              NoraColors.surfaceLight.withValues(alpha: 0.42),
              NoraColors.surfaceLighter.withValues(alpha: 0.28),
            ],
          ),
        ),
      ),
    );
  }
}
