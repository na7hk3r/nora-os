import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/plugins/plugin_controller.dart';
import '../../core/plugins/plugin_manager.dart';
import '../../core/plugins/plugin_manifest.dart' show PluginPagePath;
import '../../features/auth/auth_controller.dart';
import '../../features/auth/auth_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/modules/modules_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/planner/planner_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/tasks/tasks_screen.dart';
import 'nora_shell.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  // Reconstruye el router únicamente cuando cambia el CONJUNTO de plugins
  // activos (bootstrap o toggle desde Módulos): las rutas salen del registry,
  // única fuente de verdad. Se observa vía `select` para que un cambio de
  // estado sin relación (p.ej. el form de auth) no resetee la navegación.
  ref.watch(
    pluginControllerProvider.select((state) => state.activePluginIds.join(';')),
  );

  final refresh = _AuthRouterRefresh(ref.read(authControllerProvider));
  ref
    ..listen<AuthState>(authControllerProvider, (previous, next) {
      refresh.update(next);
    })
    ..onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/auth',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final isAuthRoute = state.matchedLocation == '/auth';
      if (auth.checking) return null;
      if (!auth.isAuthenticated) return isAuthRoute ? null : '/auth';
      if (isAuthRoute) return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/auth',
        builder: (context, state) => const AuthScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) {
          return NoraShell(location: state.uri.path, child: child);
        },
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/planner',
            builder: (context, state) => const PlannerScreen(),
          ),
          GoRoute(
            path: '/tasks',
            builder: (context, state) => const TasksScreen(),
          ),
          GoRoute(
            path: '/notifications',
            builder: (context, state) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
          GoRoute(
            path: '/modules',
            builder: (context, state) => const ModulesScreen(),
          ),
          // Rutas dinámicas de plugins activos, bajo `/plugins/<pluginId>/...`,
          // siempre dentro del ShellRoute (conservan header y barra inferior).
          ..._pluginRoutes(),
        ],
      ),
    ],
  );
});

/// Un GoRoute por cada página activa de plugin (fuente: PluginManager).
List<RouteBase> _pluginRoutes() {
  return [
    for (final page in PluginManager.instance.getActivePages())
      GoRoute(
        path: page.fullPath,
        builder: (context, state) => page.builder(context),
      ),
  ];
}

class _AuthRouterRefresh extends ChangeNotifier {
  _AuthRouterRefresh(AuthState state)
      : _snapshot = _AuthRouteSnapshot.fromState(state);

  _AuthRouteSnapshot _snapshot;

  void update(AuthState state) {
    final next = _AuthRouteSnapshot.fromState(state);
    if (next == _snapshot) return;
    _snapshot = next;
    notifyListeners();
  }
}

class _AuthRouteSnapshot {
  const _AuthRouteSnapshot({
    required this.checking,
    required this.isAuthenticated,
  });

  factory _AuthRouteSnapshot.fromState(AuthState state) {
    return _AuthRouteSnapshot(
      checking: state.checking,
      isAuthenticated: state.isAuthenticated,
    );
  }

  final bool checking;
  final bool isAuthenticated;

  @override
  bool operator ==(Object other) {
    return other is _AuthRouteSnapshot &&
        other.checking == checking &&
        other.isAuthenticated == isAuthenticated;
  }

  @override
  int get hashCode => Object.hash(checking, isAuthenticated);
}
