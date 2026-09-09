# Plugin System — Nora Mobile (espejo del Desktop)

> Estado: **early access (Android) — diseño + implementación base + 2 plugins portados (Habits, Journal).**

Este documento describe cómo el modelo de plugins de **Nora OS Desktop** se
refleja en **Nora Mobile**, qué se conserva idéntico y qué se adapta por
plataforma. Es la fuente de verdad del port, no una reescritura.

> **Estado: early access (Android).** El núcleo y los plugins `habits` y
> `journal` son ports completos. El resto de plugins del desktop NO está
> portado por decisión de producto (móvil = captura rápida, no paridad).
> Roadmap: [`roadmap/README.md`](./roadmap/README.md).

---

## 1. Principio rector

**El mismo plugin conceptual en ambas plataformas.**

Desktop y Mobile comparten el modelo: *identidad + capacidades (páginas,
navegación, eventos) + estado (migraciones) + ciclo de vida
(init/activate/deactivate)*. La única diferencia real es el runtime: React en
Desktop, Flutter en Mobile. Por eso el `PluginManifest` es un espejo, y lo que
cambia es la forma de declarar *componentes* (React component ↔ Flutter
`WidgetBuilder`) y el *render* de la navegación (sidebar/paneles ↔ GoRouter).

## 2. Mapeo Desktop → Mobile

| Concepto Desktop | Ubicación Desktop | Espejo Mobile |
| --- | --- | --- |
| `PluginManifest` | `apps/desktop/src/core/types.ts` | `apps/mobile/lib/core/plugins/plugin_manifest.dart` |
| `PluginStatus` / `PluginEntry` | `apps/desktop/src/core/types.ts` | `apps/mobile/lib/core/plugins/plugin_manifest.dart` |
| `PluginRegistry` (registro estático) | `apps/desktop/src/core/plugins/PluginRegistry.ts` | `apps/mobile/lib/core/plugins/plugin_registry.dart` |
| `PluginManager` (lifecycle + CoreAPI) | `apps/desktop/src/core/plugins/PluginManager.ts` | `apps/mobile/lib/core/plugins/plugin_manager.dart` |
| `CoreAPI` (storage/events/ui/gamification/metrics) | `apps/desktop/src/core/types.ts` | `apps/mobile/lib/core/plugins/core_api.dart` |
| `api.storage` (SQLite + `migrate`) | `apps/desktop/src/core/storage/StorageAPI.ts` | `apps/mobile/lib/core/plugins/plugin_storage.dart` |
| `api.events` (`emit/on/off`) | `apps/desktop/src/core/events/EventBus.ts` | `apps/mobile/lib/core/plugins/plugin_event_bus.dart` |
| `api.metrics` (`publish/get/list`) | `apps/desktop/src/core/services/metricsRegistry.ts` | `apps/mobile/lib/core/plugins/plugin_metrics.dart` |
| `activePlugins` + `pluginUiVersion` + `setPluginEnabled` | `apps/desktop/src/core/state/coreStore.ts` | `apps/mobile/lib/core/plugins/plugin_controller.dart` |
| Rutas derivadas del registry | `apps/desktop/src/core/ui/workspaceRoutes.tsx` | rutas GoRouter en `app/router/app_router.dart` |
| Boot: `import './plugins/habits'` (side-effect de registro) | `apps/desktop/src/App.tsx` | `lib/core/plugins/plugin_bootstrap.dart` importado en `main.dart` |
| `api.gamification.addPoints(amount, reason, source)` | Desktop | `api.pulso.addExperience(...)` (XP → Pulso Nora) |
| `api.getProfile()` | Desktop | `api.getOwnerId()` + storage scoped por `owner_id` |

## 3. El manifiesto

```dart
PluginManifest(
  id: 'habits',                 // kebab-case; prefijo de tablas SQL
  name: 'Hábitos',
  version: '1.0.0',
  description: 'Hábitos diarios y semanales con racha y heatmap.',
  icon: 'Repeat',               // resuelto por PluginIconMapper → IconData
  domain: 'habits',             // dominio de consistencia (mismo concepto Desktop)
  domainKeywords: ['routine', 'streak', 'daily'],
  migrations: [PluginMigration(version: 1, up: 'CREATE TABLE ...')],
  pages: [PluginPageDef(id, pluginId, path, title, builder, icon, order)],
  navItems: [PluginNavItemDef(id, pluginId, label, path, icon, order, parentId)],
  events: { emits: [...], listens: [...] },   // diagnóstico
  init: (api) async {...},
  activate: (api) async {...},
  deactivate: (api) async {...},
)
```

Los plugins se auto-registran al importar (side-effect), igual que Desktop:

```dart
// plugins/habits/index.dart
final habitsPlugin = PluginManifest(/* ... */);
void registerHabitsPlugin() => PluginManager.instance.register(habitsPlugin);
```

`plugin_bootstrap.dart` los importa y registra:

```dart
// core/plugins/plugin_bootstrap.dart
void registerBundledPlugins() {
  registerHabitsPlugin();
  registerJournalPlugin();
}
```

## 4. Diferencias de plataforma (conscientes y justificadas)

1. **Componentes**: Desktop declara React components (`component`); Mobile declara
   `WidgetBuilder` (función `Widget Function(BuildContext)`). Es la única
   diferencia de tipos en el manifiesto.
2. **Multi-usuario local**: la DB de Mobile tiene `owner_id` en todas las
   tablas. Los plugins heredan ese contrato: sus tablas creadas por migración
   incluyen `owner_id`, y las consultas se escopean con `api.ownerId`. Desktop
   es single-user y no lo necesita.
3. **Gamificación → Pulso**: Desktop expone `api.gamification.addPoints`;
   Mobile expone `api.pulso.addExperience(...)`, que entrega XP a Nori (el
   mismo sistema de niveles/racha, ya existente en Mobile).
4. **Persistencia de `activePlugins`**: Desktop guarda en `settings(key='activePlugins')`
   global. Mobile guarda **por owner** (la tabla `settings` ya es
   `PRIMARY KEY(owner_id, key)`), con la clave `mobile:plugins:activePlugins`.
5. **Primera ejecución**: Desktop guía la activación por onboarding. Mobile no
   tiene onboarding: los plugins marcados `recommended: true` se activan por
   defecto solo si aún no existe estado persistido (después de eso manda lo que
   togglee el usuario).
6. **`widgets` (dashboard)** y **i18n (`nameKey`/`titleKey`)** no se portan aún:
   Mobile no renderiza widgets de plugins en su dashboard y no tiene sistema de
   i18n. Se agregan cuando exista el consumidor. `navItems` existe en el modelo
   pero Mobile hoy navega por GoRouter; quedan como metadata de navegación
   interna (páginas hijas) y para futuros menús.
7. **IA / `registerAIContextProvider`**: no existe en Mobile (sin Ollama local).
   Los `events` del manifiesto documentan emisión/escucha para diagnóstico.

## 5. Ciclo de vida (mirror de PluginManager)

```
register(manifest)
   ↓  (bootstrap, después de login: PluginController.bootstrap)
initPlugin(id)
   ├─ apply migrations (api.storage.migrate → tabla plugin_migrations)
   ├─ manifest.init(api)     → carga datos, registra listeners, publica métricas
   ├─ manifest.activate(api)
   ├─ status = active        → recoge pages/navItems activos
   └─ emit CORE_PLUGIN_ACTIVATED
deactivatePlugin(id)
   ├─ manifest.deactivate(api) → cleanup
   ├─ remueve pages/navItems
   ├─ status = inactive → emit CORE_PLUGIN_DEACTIVATED
```

Fallos aislados: si `init` falla, el plugin queda en `error` y el resto de Nora
sigue funcionando (el controller de UI lo expone y permite reintentar).

## 6. Storage por plugin

- Cada plugin declara migraciones `[PluginMigration(version, up)]`.
- El manager las aplica automáticamente antes de `init` (idempotente) y las
  registra en la tabla `plugin_migrations` (`plugin_id`, `version`, `applied_at`)
  — espejo de `_migrations` de Desktop.
- `api.storage` expone `query(sql, params)`, `execute(sql, params)`,
  `getSetting/setSetting` (namespaced `mobile:plugins:<pluginId>:<key>`),
  `logEvent(...)` y `migrate(manifest)`.
- Regla de oro: **toda tabla de plugin incluye `owner_id`** y toda consulta se
  filtra con `owner_id = api.ownerId`.

## 7. Eventos

`api.events` (sobre `NoraEventBus`, mirror de `EventBus`):
- `emit(event, payload, {source, persist})` — persiste a `events_log` si hay
  owner (mismo contrato que Desktop: persistencia best-effort que nunca rompe
  la emisión).
- `on(event, handler) → unsubscribe`, `off(event, handler)`.
- `CoreEvents.pluginActivated/deactivated/error` existen igual que en Desktop.

## 8. Navegación derivada del registry

El router (`appRouterProvider`) observa `pluginControllerProvider`:

```dart
final appRouterProvider = Provider<GoRouter>((ref) {
  ref.watch(pluginControllerProvider); // rebuild al togglear plugins
  // rutas core + GoRoute por cada PluginPageDef activo bajo
  //   /plugins/<pluginId>/<path>
});
```

Cada página de plugin se monta dentro del `ShellRoute` (conserva la barra
inferior y el header de `NoraShell`). Título/subtítulo del header se resuelven
desde el `PluginPageDef` (igual que Desktop deriva título desde el page def).

## 9. UX de gestión (Módulos)

- **Entrada**: tile "Módulos" en el Dashboard y fila en Perfil.
- **Pantalla**: lista de plugins con icono, nombre, descripción, estado
  (Activo/Inactivo/Error) y un `Switch` para activar/desactivar (UX móvil
  directa; Desktop usa botón + persistencia, el mismo flujo `setPluginEnabled`).
- **Error**: estado con mensaje y botón "Reintentar" (vuelve a `initPlugin`).
- Al togglear se persiste `activePlugins` y se reconstruye el router.

## 10. Estructura de carpetas

```
lib/core/plugins/
  plugin_manifest.dart      # PluginManifest, PluginPageDef, PluginNavItemDef,
                            # PluginMigration, PluginStatus, PluginEntry
  plugin_registry.dart      # registro estático (mirror PluginRegistry)
  plugin_manager.dart       # lifecycle + CoreAPI builder (mirror PluginManager)
  plugin_controller.dart    # Riverpod: activePlugins + uiVersion + setPluginEnabled
  core_api.dart             # CoreAPI + CoreEventsApi + CoreMetricsApi + CorePulsoApi
  plugin_storage.dart       # bridge storage/migraciones (mirror api.storage)
  plugin_event_bus.dart     # NoraEventBus + CoreEvents (mirror EventBus)
  plugin_metrics.dart       # registro de métricas (mirror metricsRegistry)
  plugin_bootstrap.dart     # importa y registra los plugins bundled
  plugin_icon_mapper.dart   # iconos 'Repeat'/'BookOpen' → IconData (fallback)
lib/plugins/
  habits/                   # port completo (espejo de desktop/src/plugins/habits)
    index.dart              # manifest + registerHabitsPlugin
    models.dart / repository.dart / store.dart
    pages/…
  journal/                  # port completo (espejo de desktop/src/plugins/journal)
lib/features/modules/       # pantalla de gestión (UX Módulos)
  modules_screen.dart
```

## 11. Cómo agregar un plugin (guía corta)

1. Crear `lib/plugins/<id>/` con un `index.dart` que construya un
   `PluginManifest` (id, nombre, icono, dominio, migraciones con `owner_id`,
   páginas, eventos, `init/activate/deactivate`).
2. `init`: cargar datos → `api.events.on(...)` → `api.pulso.addExperience(...)`
   → `api.metrics.publish(...)`. Regla: todo filtrado por `api.ownerId`.
3. Registrar en `plugin_bootstrap.dart`.
4. Si querés que se active por defecto en la primera ejecución: `recommended: true`.
5. El router y la pantalla Módulos lo integran solos (sin tocar core).

## 12. Verificación

- `flutter analyze` y `flutter test` en `apps/mobile` sin nuevos issues.
- Desktop: `npm run typecheck`, `npm run test`, `npm run lint` sin regresiones
  (no se modifica código Desktop en este port).
