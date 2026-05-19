import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/nora_colors.dart';
import '../../core/design/nora_spacing.dart';
import '../../core/design/widgets/nora_button.dart';
import '../../core/design/widgets/nora_card.dart';
import '../auth/auth_controller.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth.user;

    return ListView(
      children: [
        NoraCard(
          child: Row(
            children: [
              Container(
                width: 62,
                height: 62,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: NoraColors.accent.withValues(alpha: 0.2),
                  border: Border.all(color: NoraColors.accentLight.withValues(alpha: 0.42)),
                ),
                child: Center(
                  child: Text(
                    (user?.displayName.isNotEmpty ?? false) ? user!.displayName[0].toUpperCase() : 'N',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
              ),
              const SizedBox(width: NoraSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(user?.displayName ?? 'Nora', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 4),
                    Text(
                      user?.username ?? 'local',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: NoraColors.accent.withValues(alpha: 0.22),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: const Text('Local only'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: NoraSpacing.xl),
        _Section(
          title: 'Cuenta',
          children: const [
            _SettingsRow(icon: Icons.person_outline_rounded, label: 'Mi perfil'),
            _SettingsRow(icon: Icons.settings_outlined, label: 'Ajustes'),
            _SettingsRow(icon: Icons.storage_outlined, label: 'Datos locales'),
          ],
        ),
        const SizedBox(height: NoraSpacing.lg),
        _Section(
          title: 'Preferencias',
          children: const [
            _SettingsRow(icon: Icons.dark_mode_outlined, label: 'Tema', trailing: 'Oscuro'),
            _SettingsRow(icon: Icons.notifications_none_rounded, label: 'Alertas'),
            _SettingsRow(icon: Icons.sync_disabled_rounded, label: 'Modo de datos', trailing: 'Local'),
          ],
        ),
        const SizedBox(height: NoraSpacing.lg),
        _Section(
          title: 'Soporte',
          children: const [
            _SettingsRow(icon: Icons.help_outline_rounded, label: 'Documentacion'),
          ],
        ),
        const SizedBox(height: NoraSpacing.xl),
        NoraButton(
          label: auth.loading ? 'Cerrando...' : 'Cerrar sesion',
          icon: Icons.logout_rounded,
          variant: NoraButtonVariant.secondary,
          expand: true,
          onPressed: auth.loading
              ? null
              : () async {
                  await ref.read(authControllerProvider.notifier).logout();
                  if (context.mounted) context.go('/auth');
                },
        ),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(title, style: Theme.of(context).textTheme.titleMedium),
        ),
        NoraCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              for (var i = 0; i < children.length; i++) ...[
                children[i],
                if (i != children.length - 1)
                  Divider(height: 1, color: NoraColors.border.withValues(alpha: 0.44)),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _SettingsRow extends StatelessWidget {
  const _SettingsRow({
    required this.icon,
    required this.label,
    this.trailing,
  });

  final IconData icon;
  final String label;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
        child: Row(
          children: [
            Icon(icon, color: NoraColors.text, size: 20),
            const SizedBox(width: NoraSpacing.md),
            Expanded(child: Text(label)),
            if (trailing != null)
              Text(
                trailing!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NoraColors.muted),
              ),
            const SizedBox(width: NoraSpacing.sm),
            const Icon(Icons.chevron_right_rounded, color: NoraColors.muted),
          ],
        ),
      ),
    );
  }
}
