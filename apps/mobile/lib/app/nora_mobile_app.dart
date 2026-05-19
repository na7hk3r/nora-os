import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router/app_router.dart';
import 'theme/nora_theme.dart';

class NoraMobileApp extends ConsumerWidget {
  const NoraMobileApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'Nora OS',
      debugShowCheckedModeBanner: false,
      theme: NoraTheme.dark(),
      routerConfig: router,
    );
  }
}
