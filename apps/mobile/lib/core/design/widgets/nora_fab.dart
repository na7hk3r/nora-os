import 'package:flutter/material.dart';

import '../nora_colors.dart';

class NoraFAB extends StatelessWidget {
  const NoraFAB({
    required this.onPressed,
    super.key,
    this.icon = Icons.add_rounded,
    this.tooltip,
  });

  final VoidCallback onPressed;
  final IconData icon;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(
      tooltip: tooltip,
      onPressed: onPressed,
      backgroundColor: NoraColors.accent,
      foregroundColor: Colors.white,
      elevation: 10,
      shape: const CircleBorder(),
      child: Icon(icon),
    );
  }
}
