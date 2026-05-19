import 'package:flutter/material.dart';

import 'nora_colors.dart';

class NoraTypography {
  const NoraTypography._();

  static TextTheme textTheme() {
    return const TextTheme(
      displaySmall: TextStyle(fontSize: 34, fontWeight: FontWeight.w700, height: 1.05),
      headlineMedium: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, height: 1.12),
      titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, height: 1.2),
      titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, height: 1.25),
      bodyLarge: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, height: 1.45),
      bodyMedium: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, height: 1.35),
      labelLarge: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, height: 1.2),
      labelMedium: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, height: 1.2),
    ).apply(
      bodyColor: NoraColors.text,
      displayColor: NoraColors.text,
      decorationColor: NoraColors.accent,
    );
  }
}
