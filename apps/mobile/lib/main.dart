import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/nora_mobile_app.dart';
import 'core/plugins/plugin_bootstrap.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  registerBundledPlugins();
  runApp(const ProviderScope(child: NoraMobileApp()));
}
