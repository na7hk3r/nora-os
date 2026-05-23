import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nora_mobile/app/theme/nora_theme.dart';
import 'package:nora_mobile/core/design/widgets/nora_empty_state.dart';
import 'package:nora_mobile/core/design/widgets/nora_metric_tile.dart';
import 'package:nora_mobile/core/design/widgets/nora_scaffold.dart';
import 'package:nora_mobile/core/design/widgets/nora_section_header.dart';

void main() {
  testWidgets('empty state exposes action and accessible copy', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      MaterialApp(
        theme: NoraTheme.dark(),
        home: Scaffold(
          body: NoraEmptyState(
            icon: Icons.calendar_today_outlined,
            title: 'Dia vacio',
            message: 'Agrega una tarea o bloque de foco.',
            actionLabel: 'Crear',
            onAction: () => tapped = true,
          ),
        ),
      ),
    );

    expect(find.text('Dia vacio'), findsOneWidget);
    expect(find.text('Agrega una tarea o bloque de foco.'), findsOneWidget);
    await tester.tap(find.text('Crear'));
    expect(tapped, isTrue);
  });

  testWidgets('section header and metric tile render compact dashboard primitives', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: NoraTheme.dark(),
        home: const Scaffold(
          body: Column(
            children: [
              NoraSectionHeader(title: 'Hoy', actionLabel: 'Ver todo'),
              NoraMetricTile(value: '4', label: 'Tareas activas', icon: Icons.check_rounded),
            ],
          ),
        ),
      ),
    );

    expect(find.text('Hoy'), findsOneWidget);
    expect(find.text('Ver todo'), findsOneWidget);
    expect(find.text('4'), findsOneWidget);
    expect(find.text('Tareas activas'), findsOneWidget);
  });

  testWidgets('scaffold header uses the Nora white wordmark as its title', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: NoraTheme.dark(),
        home: const NoraScaffold(
          title: 'Title',
          subtitle: 'Header subtitle',
          child: SizedBox.shrink(),
        ),
      ),
    );

    final image = tester.widget<Image>(find.byType(Image));
    final provider = image.image as AssetImage;

    expect(provider.assetName, 'assets/brand/nora-white.png');
    expect(find.text('Title'), findsNothing);
    expect(find.text('Header subtitle'), findsOneWidget);
  });
}
