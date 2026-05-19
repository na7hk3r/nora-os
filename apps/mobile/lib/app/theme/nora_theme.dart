import 'package:flutter/material.dart';

import '../../core/design/nora_colors.dart';
import '../../core/design/nora_typography.dart';

class NoraTheme {
  const NoraTheme._();

  static ThemeData dark() {
    const colorScheme = ColorScheme.dark(
      primary: NoraColors.accent,
      secondary: NoraColors.accentLight,
      surface: NoraColors.surface,
      error: NoraColors.danger,
      onPrimary: Colors.white,
      onSecondary: NoraColors.base,
      onSurface: NoraColors.text,
      onError: Colors.white,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: NoraColors.base,
      colorScheme: colorScheme,
      textTheme: NoraTypography.textTheme(),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: NoraColors.text,
        centerTitle: false,
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: NoraColors.surface,
        modalBackgroundColor: NoraColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: NoraColors.surfaceLight.withValues(alpha: 0.76),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: NoraColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: NoraColors.border.withValues(alpha: 0.7)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: NoraColors.accent, width: 1.4),
        ),
        hintStyle: const TextStyle(color: NoraColors.muted),
        labelStyle: const TextStyle(color: NoraColors.muted),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: NoraColors.surface.withValues(alpha: 0.86),
        indicatorColor: NoraColors.accent.withValues(alpha: 0.16),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            color: states.contains(WidgetState.selected)
                ? NoraColors.accentLight
                : NoraColors.muted,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
