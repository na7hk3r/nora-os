import 'package:flutter/material.dart';

/// Resuelve nombres de icono (estilo Lucide: 'Repeat', 'BookOpen', 'Flame'...)
/// a [IconData] de Material. Si el nombre no se conoce, cae a un icono por
/// defecto para no romper la UI.
class PluginIconMapper {
  const PluginIconMapper._();

  static const fallback = Icons.widgets_outlined;

  static const Map<String, IconData> _icons = {
    // Hábitos (Desktop: habits)
    'Repeat': Icons.repeat_rounded,
    'CalendarDays': Icons.calendar_month_outlined,
    'CheckCircle2': Icons.check_circle_outline_rounded,
    'Flame': Icons.local_fire_department_outlined,
    'Target': Icons.adjust_rounded,
    'Sparkles': Icons.auto_awesome_outlined,
    // Journal (Desktop: journal)
    'BookOpen': Icons.menu_book_outlined,
    'NotebookPen': Icons.edit_note_rounded,
    'Notebook': Icons.book_outlined,
    'History': Icons.history_rounded,
    'Bookmark': Icons.bookmark_border_rounded,
    // Trabajo (Desktop: work)
    'BriefcaseBusiness': Icons.work_outline_rounded,
    'ListTodo': Icons.format_list_bulleted_rounded,
    'Timer': Icons.timer_outlined,
    'Check': Icons.check_rounded,
    // Fitness (Desktop: fitness)
    'Dumbbell': Icons.fitness_center_rounded,
    'Activity': Icons.monitor_heart_outlined,
    'LineChart': Icons.show_chart_rounded,
    'Weight': Icons.scale_outlined,
    // Finanzas (Desktop: finance)
    'Wallet': Icons.account_balance_wallet_outlined,
    'PiggyBank': Icons.savings_outlined,
    'TrendingUp': Icons.trending_up_rounded,
    'Receipt': Icons.receipt_long_outlined,
    // Metas / conocimiento / tiempo
    'Goal': Icons.flag_outlined,
    'GraduationCap': Icons.school_outlined,
    'Brain': Icons.psychology_outlined,
    'Clock': Icons.schedule_rounded,
    'Layers': Icons.layers_outlined,
    'Puzzle': Icons.extension_outlined,
  };

  static IconData resolve(String? name) {
    if (name == null || name.isEmpty) return fallback;
    return _icons[name] ?? fallback;
  }
}
