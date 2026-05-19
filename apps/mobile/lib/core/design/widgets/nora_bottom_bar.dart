import 'package:flutter/material.dart';

import '../nora_colors.dart';

class NoraBottomBarItem {
  const NoraBottomBarItem({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;
}

class NoraBottomBar extends StatelessWidget {
  const NoraBottomBar({
    required this.currentIndex,
    required this.onSelected,
    super.key,
  });

  final int currentIndex;
  final ValueChanged<int> onSelected;

  static const items = [
    NoraBottomBarItem(icon: Icons.home_outlined, label: 'Inicio'),
    NoraBottomBarItem(icon: Icons.calendar_month_outlined, label: 'Planner'),
    NoraBottomBarItem(icon: Icons.add_rounded, label: 'Crear'),
    NoraBottomBarItem(icon: Icons.notifications_none_rounded, label: 'Alertas'),
    NoraBottomBarItem(icon: Icons.person_outline_rounded, label: 'Perfil'),
  ];

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
        child: Container(
          height: 72,
          decoration: BoxDecoration(
            color: NoraColors.surface.withValues(alpha: 0.9),
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: NoraColors.border.withValues(alpha: 0.58)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.34),
                blurRadius: 24,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          child: Row(
            children: List.generate(items.length, (index) {
              final item = items[index];
              final selected = currentIndex == index;
              final isCreate = index == 2;
              return Expanded(
                child: _BottomBarButton(
                  item: item,
                  selected: selected,
                  isCreate: isCreate,
                  onTap: () => onSelected(index),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _BottomBarButton extends StatelessWidget {
  const _BottomBarButton({
    required this.item,
    required this.selected,
    required this.isCreate,
    required this.onTap,
  });

  final NoraBottomBarItem item;
  final bool selected;
  final bool isCreate;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? NoraColors.accentLight : NoraColors.muted;

    return Semantics(
      button: true,
      selected: selected,
      label: item.label,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: Center(
          child: isCreate
              ? Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: NoraColors.surfaceLighter,
                    border: Border.all(color: NoraColors.accentLight.withValues(alpha: 0.62)),
                  ),
                  child: const Icon(Icons.add_rounded, color: NoraColors.text),
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(item.icon, color: color, size: 23),
                    const SizedBox(height: 4),
                    Text(
                      item.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: color,
                        fontSize: 10,
                        fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
