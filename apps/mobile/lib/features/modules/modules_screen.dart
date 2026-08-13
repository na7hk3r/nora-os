import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/design/nora_colors.dart';
import '../../core/design/nora_spacing.dart';
import '../../core/design/widgets/nora_card.dart';
import '../../core/plugins/plugin_controller.dart';
import '../../core/plugins/plugin_icon_mapper.dart';
import '../../core/plugins/plugin_manifest.dart';
import '../../core/plugins/plugin_registry.dart';

/// Gestión de plugins: lista todos los registrados con su estado y un toggle
/// para activar/desactivar. Al cambiar, el PluginController reconstruye el
/// router y el shell desde el registry (única fuente de verdad).
class ModulesScreen extends ConsumerWidget {
  const ModulesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(pluginControllerProvider);

    if (state.loading) {
      return const Center(
        child: CircularProgressIndicator(color: NoraColors.accent),
      );
    }

    final plugins = PluginRegistry.instance.all;
    if (plugins.isEmpty) {
      return const Center(
        child: Text(
          'No hay plugins registrados.',
          style: TextStyle(color: NoraColors.muted),
        ),
      );
    }

    return ListView(
      children: [
        Text(
          'Módulos',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: NoraSpacing.xs),
        Text(
          'Activá plugins para extender Nora. El sistema de datos y la navegación se adaptan al instante.',
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: NoraColors.muted),
        ),
        const SizedBox(height: NoraSpacing.lg),
        NoraCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              for (var i = 0; i < plugins.length; i++) ...[
                _PluginRow(manifest: plugins[i], state: state),
                if (i != plugins.length - 1)
                  Divider(
                      height: 1,
                      color: NoraColors.border.withValues(alpha: 0.44)),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _PluginRow extends ConsumerWidget {
  const _PluginRow({required this.manifest, required this.state});

  final PluginManifest manifest;
  final PluginUiState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pluginStatus = state.statuses[manifest.id] ?? PluginStatus.inactive;
    final enabled = state.isActive(manifest.id);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: enabled
                  ? NoraColors.accent.withValues(alpha: 0.18)
                  : NoraColors.surfaceLighter.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(13),
              border: Border.all(
                color: enabled
                    ? NoraColors.accentLight.withValues(alpha: 0.5)
                    : NoraColors.border,
              ),
            ),
            child: Icon(
              PluginIconMapper.resolve(manifest.icon),
              size: 20,
              color: enabled ? NoraColors.accentLight : NoraColors.muted,
            ),
          ),
          const SizedBox(width: NoraSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        manifest.name,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                    ),
                    if (manifest.recommended) ...[
                      const SizedBox(width: NoraSpacing.xs),
                      _MiniBadge(text: 'Recomendado', color: NoraColors.info),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  manifest.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: NoraColors.muted),
                ),
                const SizedBox(height: 4),
                Text(
                  'v${manifest.version} · ${_statusLabel(pluginStatus)}',
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: NoraColors.muted),
                ),
              ],
            ),
          ),
          const SizedBox(width: NoraSpacing.sm),
          Switch(
            value: enabled,
            activeThumbColor: NoraColors.accent,
            onChanged: (value) => _toggle(context, ref, value),
          ),
        ],
      ),
    );
  }

  Future<void> _toggle(
      BuildContext context, WidgetRef ref, bool enabled) async {
    final result = await ref
        .read(pluginControllerProvider.notifier)
        .setPluginEnabled(manifest.id, enabled);
    if (!context.mounted) return;
    if (result == 'error') {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              'No se pudo ${enabled ? 'activar' : 'desactivar'} ${manifest.name}.'),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content:
              Text('${manifest.name} ${enabled ? 'activado' : 'desactivado'}.'),
        ),
      );
    }
  }

  String _statusLabel(PluginStatus status) {
    switch (status) {
      case PluginStatus.active:
        return 'Activo';
      case PluginStatus.error:
        return 'Error';
      case PluginStatus.initializing:
        return 'Inicializando...';
      case PluginStatus.registered:
      case PluginStatus.inactive:
        return 'Inactivo';
    }
  }
}

class _MiniBadge extends StatelessWidget {
  const _MiniBadge({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 10, color: color),
      ),
    );
  }
}
