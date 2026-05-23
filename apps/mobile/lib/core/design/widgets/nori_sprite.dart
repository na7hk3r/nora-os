import 'package:flutter/material.dart';

import '../../pulso/nora_pulso.dart';

class NoriSprite extends StatelessWidget {
  const NoriSprite({
    required this.level,
    super.key,
    this.size = 72,
  });

  final int level;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      getNoriSpriteAsset(level),
      width: size,
      height: size,
      fit: BoxFit.contain,
      errorBuilder: (context, error, stackTrace) {
        return Image.asset(
          'assets/brand/nora-isotipo-original.png',
          width: size,
          height: size,
          fit: BoxFit.contain,
        );
      },
    );
  }
}
