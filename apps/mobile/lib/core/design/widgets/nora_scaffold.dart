import 'package:flutter/material.dart';

import '../nora_colors.dart';
import '../nora_spacing.dart';

class NoraScaffold extends StatelessWidget {
  const NoraScaffold({
    required this.child,
    super.key,
    this.title,
    this.subtitle,
    this.actions = const [],
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.padding = const EdgeInsets.fromLTRB(20, 12, 20, 20),
  });

  final String? title;
  final String? subtitle;
  final List<Widget> actions;
  final Widget child;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      backgroundColor: NoraColors.base,
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: NoraColors.appGradient),
        child: SafeArea(
          bottom: bottomNavigationBar == null,
          child: Column(
            children: [
              if (title != null || actions.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 10, 14, 4),
                  child: Row(
                    children: [
                      if (title != null)
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                title!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                              if (subtitle != null) ...[
                                const SizedBox(height: NoraSpacing.xs),
                                Text(
                                  subtitle!,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(color: NoraColors.muted),
                                ),
                              ],
                            ],
                          ),
                        )
                      else
                        const Spacer(),
                      ...actions,
                    ],
                  ),
                ),
              Expanded(
                child: Padding(
                  padding: padding,
                  child: child,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
