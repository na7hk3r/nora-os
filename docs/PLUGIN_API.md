# Plugin API — Nora OS

Esta guía documenta la superficie del CoreAPI que reciben los plugins en su `init(api)`.

> Ultima actualizacion: v1.18.0

## 1. Manifiesto

Cada plugin exporta un `PluginManifest` (ver `apps/desktop/src/core/types.ts`):

```ts
export const myPlugin: PluginManifest = {
  id: 'mi-plugin',          // kebab-case, único, prefijo de tablas SQLite
  name: 'Mi Plugin',
  nameKey: 'plugins.meta.mi-plugin.name',
  version: '1.0.0',
  description: '…',
  descriptionKey: 'plugins.meta.mi-plugin.description',
  icon: 'Boxes',            // nombre de un ícono Lucide

  // — Campos opcionales para el Consistency Auditor (v1.10.0+) —
  domain: 'productivity',   // uno de los 20 dominios soportados
  domainKeywords: ['kanban', 'tasks'],
  iconography: {
    primary: 'Boxes',                       // debe pertenecer al catálogo del dominio o a NEUTRAL_ICONS
    gallery: ['CheckSquare', 'ListTodo'],
  },

  navItems: [{ id, label, labelKey, path, icon }],
  pages: [{ id, path, component, title, titleKey, pluginId }],
  widgets: [{ id, title, titleKey, component }],
  events: { emits: [...], listens: [...] },
  migrations: [...],

  async init(api) { /* registro de listeners, providers de IA, métricas, etc. */ },
  async deactivate(api) { /* cleanup opcional */ },
}
```

Los campos `nameKey`, `descriptionKey`, `labelKey` y `titleKey` son opcionales
desde v1.18.0. Si existen, el shell intenta resolverlos contra el catalogo i18n
activo; si faltan o no hay traduccion, usa `name`, `description`, `label` o
`title` como fallback.

## 2. Storage (SQLite local)

`api.storage` (alias de `window.storage`) expone:

| Método | Descripción |
| --- | --- |
| `query<T>(sql, params?)` | SELECT, devuelve filas tipadas |
| `execute(sql, params?)` | INSERT/UPDATE/DELETE |
| `migrate(pluginId, sqlBatch)` | Aplica DDL. **Debe** prefijarse con `<pluginId>_` |
| `getSetting(key)` / `setSetting(key, value)` | Settings clave/valor |
| `getRecentEvents(limit?)` | Eventos persistidos del EventBus |

Reglas:

- Las tablas del plugin se llaman `<pluginId>_<tabla>` (ej. `finanzas_movimientos`).
- Para tablas core (`core_*`) usá los servicios listados en §6, no SQL crudo.
- El allowlist de columnas se aplica solo a helpers; `query/execute` aceptan SQL parametrizado.

## 3. EventBus

`api.events` (`eventBus`) provee pub/sub global con persistencia opcional:

```ts
const off = api.events.on('FITNESS_WORKOUT_COMPLETED', (payload) => { /* … */ })
api.events.emit('MI_EVENTO', { foo: 1 }, { source: 'mi-plugin', persist: true })
```

Eventos core: ver `apps/desktop/src/core/events/events.ts` (`CORE_EVENTS`, `GAMIFICATION_EVENTS`).

Convención: nombres `MAYUS_CON_GUION_BAJO`. Si el evento es del plugin, prefijalo (`FINANZAS_*`).

## 4. UI — Navegación y páginas

Se registran vía manifiesto. Para inyectar widgets en el dashboard u otras zonas, usar `api.ui.registerWidget`. Cada nav item soporta `parentId` para anidamiento visual.

## 4.5 Métricas (`api.metrics`) — v1.10.0+

Registro en memoria que permite a un plugin **publicar KPIs** y a otros plugins **consumirlos sin acoplarse**. Usado hoy por:

- **Goals**: `syncMetricBackedKRs` actualiza el `current_value` de los Key Results cuyo `source` apunta a un `metricId` registrado.
- **Dashboard**: widgets agregados leen las métricas vivas.

```ts
// Publicar (en init o en un listener):
api.metrics.publish('habits.completion_rate_30d', 0.82, { period: '30d' })
api.metrics.publish('time.tracked_week_sec', 134_200)

// Consumir desde otro plugin:
const snapshot = api.metrics.get('habits.completion_rate_30d')
const all = api.metrics.list()
```

Convención del `metricId`: `<pluginId>.<nombre>` (ej. `knowledge.flashcards_due`, `finance.budget_remaining_month`).

## 4.6 Proveedores de contexto de IA

Cada plugin puede aportar su slice al snapshot global que `aiContextService` entrega al LLM, sin que el core conozca al plugin:

```ts
import { registerAIContextProvider } from '@core/services/aiContextRegistry'

registerAIContextProvider('mi-plugin', async () => ({
  // Sólo agregados; nunca contenido sensible.
  totalItems: 42,
  lastActivity: '2026-05-01',
}))
```

El provider corre on-demand cuando alguien pide el snapshot. Privacidad: los plugins **deben** devolver agregados, no contenido literal del usuario (Journal lo hace por diseño).

## 4.7 Patrón Repository (sobre `StorageAPI`)

Para evitar SQL crudo manteniendo intacto el sandbox y la allowlist:

```ts
import { defineRepository } from '@core/storage/Repository'

const habitDefinitionsRepo = defineRepository<HabitDefinition, HabitDefinitionRow>({
  table: 'habits_definitions',
  primaryKey: 'id',
  mapRow: (row) => ({ id: row.id, name: row.name, archived: Boolean(row.archived) }),
  toRow: (entity) => ({ id: entity.id, name: entity.name, archived: entity.archived ? 1 : 0 }),
})

await habitDefinitionsRepo.find({ where: { archived: 0 }, orderBy: 'created_at DESC' })
await habitDefinitionsRepo.create({ id, name, archived: false })
await habitDefinitionsRepo.deleteWhere({ archived: 1 }) // exige where no vacío
```

Operadores soportados en `WhereClause`: `= != < <= > >= LIKE IS IS NOT IN`. La validación de tabla y columnas reusa el allowlist de `StorageAPI`.

## 5. Gamificación

```ts
import { useGamificationStore } from '@core/gamification/gamificationStore'
useGamificationStore.getState().addPoints(25, 'mi-acción')
```

Eventos gamificados se distribuyen por reglas en `apps/desktop/src/core/gamification/gamificationUtils.ts`.

## 6. Servicios core

| Servicio | Import | Para qué |
| --- | --- | --- |
| `tagsService` | `@core/services/tagsService` | Tags globales y links polimórficos a entidades de cualquier plugin |
| `templatesService` | `@core/services/templatesService` | Plantillas reusables (notas, mails, briefs) por plugin + kind |
| `automationsService` | `@core/services/automationsService` | If‑this‑then‑that sobre el EventBus (notify, add_xp, emit_event, log) |
| `notificationsService` | `@core/services/notificationsService` | Notificaciones nativas + cola programable + horas de silencio + filtro por plugin inactivo |
| `ollamaService` | `@core/services/ollamaService` | Llamadas a Ollama local con settings (modelo, prompt, temperatura) |
| `aiContextRegistry` | `@core/services/aiContextRegistry` | `registerAIContextProvider` para aportar slices al snapshot |
| `aiContextService` | `@core/services/aiContextService` | Snapshot agregado del usuario listo para LLM |
| `aiSuggestionsService` | `@core/services/aiSuggestionsService` | Tareas predefinidas: dailyCoach, weeklyReview, focusNudge |
| `copilotChatService` | `@core/services/copilotChatService` | Chat persistente con el copiloto local |
| `dailyBriefService` | `@core/services/dailyBriefService` | Brief diario cacheado con fallback determinístico |
| `dailyScoreService` | `@core/services/dailyScoreService` | Pantalla de score diaria al primer login del día |
| `calendarAggregator` | `@core/services/calendarAggregator` | Eventos unificados (planner, work, fitness, focus) por rango |
| `metricsRegistry` | `@core/services/metricsRegistry` | Registro en memoria de métricas publicadas (subyace a `api.metrics`) |

## 7. Backup y perfil

- `window.backup` ofrece `exportPlain`, `exportEncrypted`, `importPlain`, `importEncrypted` sobre **toda la base de datos** del usuario activo. Cifrado opcional con AES-256-GCM y derivación scrypt.
- `window.profile` (v1.9.0+) ofrece export/import del **snapshot de perfil** — perfil + settings whitelisted + activePlugins + gamificación. Formato `.posprof.json` (plain) o `.posprof` (encrypted, magic header `POS-PRF1`). Nunca incluye `password_hash`, sesiones, recovery ni datos de plugins.
- `window.dbEncryption` controla el cifrado opt-in de la DB de usuario en reposo (`status`, `enable`, `disable`, `check-strength`, `unlock`).
- `window.scheduledBackup` controla backups automáticos diarios / semanales / mensuales con destino local elegido por el usuario.

## 8. Crear un plugin nuevo

```bash
npm run create-plugin -- mi-plugin
```

El script genera la estructura mínima en `apps/desktop/src/plugins/<id>/`. Acordate de:

1. Importarlo en `apps/desktop/src/App.tsx`: `import './plugins/<id>'`
2. Registrarlo en `apps/desktop/src/core/plugins/PluginRegistry.ts`
3. Definir migraciones SQL con prefijo `<id>_` antes de leer/escribir.

## 9. Buenas prácticas

- **Nunca** hardcodees rutas de filesystem; usá `window.storage` o `window.backup`.
- **Validá inputs** antes de persistir (regex, rangos numéricos, longitudes máx).
- **Emití eventos** ante cambios relevantes — habilita gamificación, automations y review semanal.
- **No bloqueés el render** con I/O síncrono pesado; siempre `async`.
- **Respeta el idioma**: toda la UI debe estar en español rioplatense.
