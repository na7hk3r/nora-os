import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/widgets/nora_bottom_bar.dart';
import '../../core/design/widgets/nora_scaffold.dart';
import '../../features/create/create_sheet.dart';

class NoraShell extends ConsumerWidget {
  const NoraShell({
    required this.location,
    required this.child,
    super.key,
  });

  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return NoraScaffold(
      title: _titleFor(location),
      subtitle: _subtitleFor(location),
      bottomNavigationBar: NoraBottomBar(
        currentIndex: _indexFor(location),
        onSelected: (index) {
          if (index == 2) {
            showNoraCreateSheet(context);
            return;
          }
          context.go(_pathFor(index));
        },
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 96),
      child: child,
    );
  }

  int _indexFor(String path) {
    if (path.startsWith('/planner')) return 1;
    if (path.startsWith('/notifications')) return 3;
    if (path.startsWith('/profile')) return 4;
    return 0;
  }

  String _pathFor(int index) {
    switch (index) {
      case 1:
        return '/planner';
      case 3:
        return '/notifications';
      case 4:
        return '/profile';
      default:
        return '/';
    }
  }

  String _titleFor(String path) {
    if (path.startsWith('/planner')) return 'Planner';
    if (path.startsWith('/tasks')) return 'Tareas';
    if (path.startsWith('/notifications')) return 'Notificaciones';
    if (path.startsWith('/profile')) return 'Perfil';
    return 'Nora OS';
  }

  String? _subtitleFor(String path) {
    if (path.startsWith('/planner')) return 'Tareas del dia y bloques de foco';
    if (path.startsWith('/tasks')) return 'Accionable y sin ruido';
    if (path.startsWith('/notifications')) return 'Solo alertas relevantes';
    if (path.startsWith('/profile')) return 'Cuenta local y preferencias';
    return 'Lo importante de tu dia';
  }
}
