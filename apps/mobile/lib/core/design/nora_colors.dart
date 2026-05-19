import 'package:flutter/material.dart';

class NoraColors {
  const NoraColors._();

  static const base = Color(0xFF0B0B12);
  static const baseDeep = Color(0xFF07060D);
  static const surface = Color(0xFF1B1B1F);
  static const surfaceLight = Color(0xFF26262E);
  static const surfaceLighter = Color(0xFF363640);
  static const accent = Color(0xFF6A39F6);
  static const accentLight = Color(0xFFDEBFD8);
  static const text = Color(0xFFF5F4FF);
  static const muted = Color(0xFFA8A2C4);
  static const border = Color(0xFF3C375A);
  static const success = Color(0xFF20C997);
  static const warning = Color(0xFFF5B84B);
  static const info = Color(0xFF4C8DFF);
  static const danger = Color(0xFFEF476F);

  static const LinearGradient appGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF1D0E3D),
      Color(0xFF110A24),
      Color(0xFF07060D),
    ],
    stops: [0, 0.44, 1],
  );

  static const LinearGradient cardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0x3326262E),
      Color(0x1A6A39F6),
    ],
  );
}
