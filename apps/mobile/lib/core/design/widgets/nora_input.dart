import 'package:flutter/material.dart';

class NoraInput extends StatelessWidget {
  const NoraInput({
    required this.controller,
    super.key,
    this.label,
    this.hint,
    this.icon,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.maxLines = 1,
    this.onChanged,
    this.suffixIcon,
    this.autofillHints,
  });

  final TextEditingController controller;
  final String? label;
  final String? hint;
  final IconData? icon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final int maxLines;
  final ValueChanged<String>? onChanged;
  final Widget? suffixIcon;
  final Iterable<String>? autofillHints;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      maxLines: obscureText ? 1 : maxLines,
      onChanged: onChanged,
      autofillHints: autofillHints,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: icon == null ? null : Icon(icon, size: 19),
        suffixIcon: suffixIcon,
      ),
    );
  }
}
