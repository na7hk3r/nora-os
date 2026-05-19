# Estructura base de plugins e integración

Esta guía define la estructura base obligatoria para cualquier plugin nuevo en Nora OS y el procedimiento correcto para integrarlo.

## Objetivo

- Mantener consistencia técnica entre plugins.
- Reducir deuda de integración y errores de runtime.
- Hacer predecible el ciclo: diseño, persistencia, UI, eventos y gamificación.

## Estructura base recomendada

Ruta base: `apps/desktop/src/plugins/<plugin-id>/`

```text
apps/desktop/src/plugins/my-plugin/
  index.ts
  events.ts
  types.ts
  store.ts
  pages/
    MyPluginDashboard.tsx
  components/
    MyWidget.tsx
```

## Responsabilidad de cada archivo

- `index.ts`
  - Exporta `PluginManifest`.
  - Declara migraciones SQL, widgets, páginas y nav items.
  - Ejecuta `init(api)` con carga inicial de datos y listeners.

- `events.ts`
  - Define constantes de eventos prefijadas por plugin.
  - Ejemplo: `MY_PLUGIN_ITEM_CREATED`, `MY_PLUGIN_ITEM_UPDATED`.

- `types.ts`
  - Modelos de dominio tipados.
  - Evita `any` en payloads y estado.

- `store.ts`
  - Store Zustand para estado en memoria.
  - Acciones de actualización local.

- `pages/*`
  - Páginas completas registrables en router.
  - Deben usar la capa visual premium de plugin.

- `components/*`
  - UI reutilizable del plugin.

## Contrato mínimo del manifest

Todo plugin debe declarar:

- `id` (kebab-case)
- `name`
- `version`
- `description`
- `icon`
- `init(api)`

Opcionales pero recomendados:

- `domain` — uno de los 20 dominios soportados (`finance`, `fitness`,
  `productivity`, `habits`, `knowledge`, …). Habilita la auditoría de
  iconografía (regla R6 del [Consistency Auditor](./CONSISTENCY_AUDITOR.md)).
- `domainKeywords` — palabras clave usadas por la búsqueda y AI context.
- `iconography` — `{ primary: LucideIconName, gallery?: LucideIconName[] }`.
  El `primary` debe pertenecer al catálogo del dominio o a `NEUTRAL_ICONS`.
- `migrations`
- `widgets`
- `pages`
- `navItems`
- `events`

## Convenciones obligatorias

- Prefijo de tablas SQL por plugin: `my_plugin_*`.
- Prefijo de eventos por plugin: `MY_PLUGIN_*`.
- Nombres de store: `use<PluginName>Store`.
- No acoplar plugin a detalles internos del core fuera de `CoreAPI`.

## Integración correcta paso a paso

1. Crear carpeta base del plugin con la estructura anterior.
2. Definir `types.ts` y `events.ts` primero.
3. Implementar `store.ts` con estado y acciones mínimas.
4. Declarar migraciones en `index.ts`.
5. Implementar `init(api)`:
   - cargar datos (`api.storage.query`),
   - popular store,
   - registrar listeners (`api.events.on`).
6. Registrar UI en manifest:
   - `widgets`,
   - `pages`,
   - `navItems`.
7. Registrar plugin en bootstrap de `App.tsx` (import + init).
8. Validar flujo de datos completo:
   - UI -> store -> SQLite -> eventos -> UI.
9. Conectar gamificación si aplica (`api.gamification.addPoints`).
10. Añadir documentación del plugin y eventos emitidos.

## Checklist de integración

- [ ] Migraciones idempotentes y versionadas.
- [ ] Carga inicial desde SQLite en `init(api)`.
- [ ] Eventos con prefijo correcto.
- [ ] Rutas y nav visibles solo cuando plugin activo.
- [ ] Configuración del plugin en `settings` (si aplica).
- [ ] Páginas con clase visual premium (`plugin-shell-*`).
- [ ] Sin errores de TypeScript/diagnóstico.

## Errores comunes a evitar

- Emitir eventos sin prefijo del plugin.
- Persistir datos en memoria sin guardado SQLite.
- Usar acceso directo a internals del core en lugar de `CoreAPI`.
- Omitir migraciones para nuevas tablas/columnas.
- No documentar eventos y payloads.

## Integración visual premium

Para mantener identidad por plugin sin romper consistencia global:

- Fitness: `plugin-shell plugin-shell-fitness`
- Work: `plugin-shell plugin-shell-work`
- Paneles internos: `plugin-panel`

Estas clases viven en `apps/desktop/src/index.css`.
