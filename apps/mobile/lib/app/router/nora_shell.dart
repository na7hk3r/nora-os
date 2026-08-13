import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/widgets/nora_bottom_bar.dart';
import '../../core/design/widgets/nora_scaffold.dart';
import '../../core/plugins/plugin_manager.dart';
import '../../core/plugins/plugin_manifest.dart' show PluginPagePath;
import '../../features/create/create_sheet.dart';

class NoraShell extends ConsumerWidget {
  const NoraShell({
    required this.location,
    required this.child,
    super.key,
  });

  final String location;
  final Widget child;

  static const List<_ShellPage> _pages = [
    _ShellPage(
      pathPrefix: '/planner',
      title: 'Planner',
      subtitle: 'Bloques de foco y ritmo diario',
    ),
    _ShellPage(
      pathPrefix: '/tasks',
      title: 'Tareas',
      subtitle: 'Accionable, no abrumador',
    ),
    _ShellPage(
      pathPrefix: '/notifications',
      title: 'Notificaciones',
      subtitle: 'Solo lo que importa ahora',
    ),
    _ShellPage(
      pathPrefix: '/profile',
      title: 'Perfil',
      subtitle: 'Tu espacio de control',
    ),
    _ShellPage(
      pathPrefix: '/modules',
      title: 'Módulos',
      subtitle: 'Activá plugins y extendé Nora',
    ),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final page = _pageFor(location);
    return NoraScaffold(
      title: page.title,
      subtitle: page.subtitle,
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

  _ShellPage _pageFor(String path) {
    for (final page in _pages) {
      if (page.matches(path)) return page;
    }
    // Páginas de plugins activos: título y subtítulo salen del page def.
    final pluginPage = PluginManager.instance.getActivePages().where((p) {
      return path == p.fullPath ||
          (p.path.isNotEmpty && path.startsWith('${p.fullPath}/'));
    }).toList();
    if (pluginPage.isNotEmpty) {
      final match = pluginPage.reduce(
        (a, b) => a.fullPath.length >= b.fullPath.length ? a : b,
      );
      return _ShellPage(
        pathPrefix: match.fullPath,
        title: match.title,
        subtitle: 'Plugin · ${match.pluginId}',
      );
    }
    return const _ShellPage(
      pathPrefix: '/',
      title: 'Nora OS',
      subtitle: 'Tu sistema. Tu vida. Una sola IA.',
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
}

class _ShellPage {
  const _ShellPage({
    required this.pathPrefix,
    required this.title,
    required this.subtitle,
  });

  final String pathPrefix;
  final String title;
  final String subtitle;

  bool matches(String path) => path.startsWith(pathPrefix);
}
