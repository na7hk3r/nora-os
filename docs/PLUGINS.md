# Sistema de Plugins

Guía complementaria obligatoria:
- [PLUGIN_BASE_STRUCTURE.md](PLUGIN_BASE_STRUCTURE.md) para plantilla base estandarizada e integración end-to-end.

## Estructura de un plugin

Un plugin es un objeto que implementa `PluginManifest` exportado desde `src/plugins/<nombre>/index.ts`.

```typescript
import type { PluginManifest } from '@core/types'

export const myPlugin: PluginManifest = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: 'Descripción breve',
  icon: 'Boxes',                 // nombre del ícono Lucide

  migrations: [
    {
      version: 1,
      up: `CREATE TABLE IF NOT EXISTS my_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );`,
    },
  ],

  widgets: [
    {
      id: 'my-widget',
      name: 'Mi widget',
      component: MyWidget,
    },
  ],

  pages: [
    {
      path: '/my-plugin',
      component: MyPage,
      label: 'Mi Plugin',
    },
  ],

  navItems: [
    {
      label: 'My Plugin',
      path: '/my-plugin',
      icon: 'Boxes',
      pluginId: 'my-plugin',
      order: 20,
    },
  ],

  events: {
    emits: ['MY_PLUGIN_ITEM_CREATED'],
    listens: ['CORE_PROFILE_UPDATED'],
  },

  async init(api) {
    // 1. Cargar datos desde SQLite
    const rows = await api.storage.query('SELECT * FROM my_items') as any[]
    useMyStore.getState().setItems(rows)

    // 2. Escuchar eventos
    api.events.on('MY_PLUGIN_ITEM_CREATED', () => {
      api.gamification.addPoints(5, 'Item creado')
    })
  },
}
```

## Registrar el plugin

En `src/App.tsx`, importar el manifest y llamar a `pluginManager.register()` antes de `initPlugin()`:

```typescript
import { myPlugin } from './plugins/my-plugin'

// dentro del useEffect de bootstrap:
pluginManager.register(myPlugin)
await pluginManager.initPlugin('my-plugin')
```

## CoreAPI de referencia

El objeto `api` disponible en `init()`:

### `api.storage`

| Método | Descripción |
|--------|-------------|
| `query<T>(sql, params?)` | SELECT. Devuelve `T[]` |
| `execute(sql, params?)` | INSERT / UPDATE / DELETE |
| `migrate(pluginId, migrations)` | Aplicar migraciones pendientes |

Las tablas y columnas accesibles deben estar declaradas en el allowlist de `StorageAPI.ts`.

### `api.events`

| Método | Descripción |
|--------|-------------|
| `emit(event, payload)` | Emite evento (persiste en events_log) |
| `on(event, handler)` | Suscribirse. Devuelve función de cleanup |
| `off(event, handler)` | Desuscribirse manualmente |

Los eventos se persisten automáticamente en la tabla `events_log`.

### `api.ui`

| Método | Descripción |
|--------|-------------|
| `registerWidget(def)` | Añade widget al Dashboard |
| `registerPage(def)` | Añade ruta al router |
| `registerNavItem(def)` | Añade ítem a la Sidebar |

### `api.gamification`

| Método | Descripción |
|--------|-------------|
| `addPoints(amount, reason)` | Suma/resta XP al usuario |
| `checkAchievement(stats)` | Verifica si corresponde desbloquear logros |

### `api.metrics`

Registro de métricas en memoria para exponer KPIs entre plugins (consumido por Goals para sincronizar Key Results y por widgets del Dashboard).

| Método | Descripción |
|--------|-------------|
| `publish(metricId, value, meta?)` | Publica una métrica con timestamp |
| `get(metricId)` | Snapshot puntual |
| `list()` | Todos los snapshots actuales |

Convención del `metricId`: `<pluginId>.<nombre>` (ej. `habits.completion_rate_30d`, `time.tracked_week_sec`).

### `api.getProfile()`

Devuelve el `UserProfile` actual: `{ name, height, age, startDate, weightGoal, bigGoal? }`.

### Imports complementarios (no expuestos en `api`)

- `registerAIContextProvider(id, provider)` desde `@core/services/aiContextRegistry` — cada plugin aporta su slice al snapshot global de IA (sin exponer datos crudos al LLM).
- `defineRepository<TEntity, TRow>({ table, mapRow, toRow })` desde `@core/storage/Repository` — patrón Repository tipado sobre el mismo allowlist de `StorageAPI`. Lo usan Habits, Journal, Knowledge y Tiempo.

## Convenciones de nombres

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Plugin ID | kebab-case | `my-plugin` |
| Tablas SQL | snake_case con prefijo | `my_plugin_items` |
| Eventos | SCREAMING_SNAKE con prefijo | `MY_PLUGIN_ITEM_CREATED` |
| Store Zustand | `useMyPluginStore` | `useMyStore` |
| Archivos de eventos | `events.ts` en raíz del plugin | `MY_EVENTS.ITEM_CREATED` |

## Migraciones

Las migraciones son **idempotentes** — se aplican una sola vez y se trackean en `_migrations(plugin_id, version)`.

```typescript
migrations: [
  { version: 1, up: 'CREATE TABLE …' },
  { version: 2, up: 'ALTER TABLE my_items ADD COLUMN priority INTEGER DEFAULT 0' },
]
```

- `version` debe ser entero positivo creciente.
- Solo se ejecutan versiones no aplicadas previamente.
- Se ejecutan en transacción — si falla, se hace rollback.
- El SQL de `up` puede contener múltiples statements separados por `;`.

## Añadir columnas al allowlist de StorageAPI

Para que `StorageAPI` permita acceso a la nueva tabla, añadir la entrada en `src/core/storage/StorageAPI.ts`:

```typescript
const ALLOWED_TABLES: Record<string, Set<string>> = {
  // … tablas existentes …
  my_plugin_items: new Set(['id', 'title', 'priority', 'created_at']),
}
```

## Plugins incluidos

Hoy hay **8 plugins oficiales** distribuidos por dominio. Cada uno declara `domain` + `iconography` para el [Consistency Auditor](CONSISTENCY_AUDITOR.md).

### fitness — `domain: fitness`
- **Tablas**: `fitness_daily_entries`, `fitness_measurements`
- **Páginas**: `/fitness`, `/fitness/tracking`, `/fitness/measurements`
- **Eventos emitidos**: `WEIGHT_RECORDED`, `MEAL_LOGGED`, `WORKOUT_COMPLETED`, `DAILY_ENTRY_SAVED`, `MEASUREMENT_SAVED` (ver [EVENTS.md](EVENTS.md#fitness))
- **Configuración core**: `pluginSettings:fitness` (entrenos/sem, sueño objetivo, comidas, recordatorio mediciones y seguimiento opcional para dejar de fumar)
- **AI Provider**: no
- **Gamificación**: +5 entrada diaria, +25 entrenamiento

### work — `domain: productivity`
- **Tablas**: `work_boards`, `work_columns`, `work_cards`, `work_notes`, `work_links`, `work_focus_sessions`
- **Páginas**: `/work`, `/work/notes`
- **Eventos emitidos**: 14 eventos `TASK_*`, `FOCUS_*`, `NOTE_CREATED` (ver [EVENTS.md](EVENTS.md#work))
- **Focus Engine 2.0**: sesión activa global con `pause`/`resume` reales (`paused_at`, `paused_total`), switch limpio (<1 min descarta sin XP penalty), cleanup automático de sesiones zombie (>8h), Pomodoro configurable con notificación nativa y mini timer flotante always-on-top.
- **Tarjetas enriquecidas** (v7): `priority`, `estimate_minutes`, `checklist` (JSON), `archived` para archivo manual de completadas, acentos visuales por prioridad y tags con color determinístico.
- **Columnas**: edición inline + `wip_limit`.
- **Configuración core**: `pluginSettings:work` (duración foco/break, alerta vencimiento, WIP, vista predeterminada).
- **Quick action**: escucha `core:focus-request` desde la barra global del Core.
- **AI Provider**: opcional para Note → Task
- **Gamificación**: +10 tarea completada, +5 foco completado, −2 foco interrumpido, +3 nota creada

### finance — `domain: finance`
- **Tablas**: `finance_accounts`, `finance_categories`, `finance_transactions`, `finance_recurring`, `finance_budgets`, `finance_merchant_aliases`
- **Páginas**: `/finance`, `/finance/accounts`, `/finance/transactions`, `/finance/budgets`, `/finance/recurring`, `/finance/insights`
- **Eventos emitidos**: 17 eventos `ACCOUNT_*`, `CATEGORY_*`, `TRANSACTION_*`, `TRANSFER_CREATED`, `RECURRING_*`, `BUDGET_*`, `ANOMALY_DETECTED`
- **Servicios internos**: `runRecurringEngine` (RRULE-light), `detectAnomaly`, `financeAIProvider`
- **Configuración core**: `pluginSettings:finance` (moneda default, presupuesto auto)
- **AI Provider**: sí (insights mensuales, sugerencia de presupuestos, gastos inusuales)
- **Gamificación**: +2 transacción, +5 recurrente creado, +5 presupuesto creado

### habits — `domain: habits`
- **Tablas**: `habits_definitions`, `habits_logs` (índices por `habit_id` + `date`)
- **Páginas**: `/habits`, `/habits/history`, `/habits/manage`
- **Eventos emitidos**: `HABIT_CREATED|UPDATED|ARCHIVED|LOGGED|UNLOGGED|GOAL_MET|STREAK_BROKEN`
- **Métricas publicadas**: `habits.top_streak`, `habits.completion_rate_30d`
- **Repository**: `habitDefinitionsRepo`, `habitLogsRepo`
- **AI Provider**: sí (total, completados hoy, top streaks, en riesgo)
- **Gamificación**: +2 log, +5 meta cumplida

### journal — `domain: knowledge`
- **Tablas**: `journal_entries`, `journal_prompts` (seed v2 con 7 prompts builtin)
- **Páginas**: `/journal`, `/journal/history`
- **Eventos emitidos**: `ENTRY_CREATED|UPDATED|DELETED|PINNED`, `MOOD_LOGGED`
- **Repository**: `journalEntriesRepo`, `journalPromptsRepo`
- **AI Provider**: sí, **privacy-first** (sólo agregados: total, últimos 7 días, mood promedio 7d, top tags, escribió hoy). Nunca el contenido literal.
- **Gamificación**: +5 entrada nueva, +2 update, +1 mood

### goals — `domain: productivity`
- **Tablas**: `goals_objectives`, `goals_key_results`, `goals_milestones` (con índices por `goal_id`, `kr_id`, `(year, period)`)
- **Páginas**: `/goals`
- **Eventos emitidos**: `GOAL_CREATED|UPDATED|COMPLETED|ARCHIVED`, `KR_CREATED|UPDATED|PROGRESS|COMPLETED|DELETED`, `MILESTONE_ADDED`
- **Servicios internos**: `syncMetricBackedKRs` lee `metricsRegistry` y actualiza el `current_value` de los KR cuyo `source` apunta a una métrica registrada (`fitness.weight`, `habits.top_streak`, `time.tracked_week_sec`, etc.).
- **AI Provider**: sí (progreso por período, KR críticos)
- **Gamificación**: +20 KR completado, +100 Objective completado

### knowledge — `domain: knowledge`
- **Tablas**: `knowledge_resources` (book/course/paper/article/video), `knowledge_highlights` (FK con cascade), `knowledge_flashcards` (campos SM-2: `ease`, `interval`, `repetitions`, `next_review`), `knowledge_reviews`
- **Páginas**: `/knowledge`, `/knowledge/resources`, `/knowledge/highlights`, `/knowledge/review`
- **Eventos emitidos**: 11 eventos `RESOURCE_*`, `HIGHLIGHT_*`, `FLASHCARD_*`, `STUDY_SESSION_*`
- **Algoritmo SM-2** completo en `sm2Schedule`; floor de ease en 1.3, secuencia 1d → 6d → ease·interval, reset a 0 con quality < 3.
- **Métricas publicadas**: `knowledge.resources_finished`, `resources_finished_month`, `resources_in_progress`, `flashcards_due`, `flashcards_mastered`, `highlights_total`
- **Widget**: `KnowledgeSummaryWidget` 1×1 con due hoy + recursos en progreso
- **AI Provider**: sí (total, terminados, due, mastered, top tags)
- **Gamificación**: +3 highlight, +2 flashcard repasada, +15 recurso terminado

### time — `domain: time`
- **Tablas**: `time_projects` (cliente, `hourly_rate`, color), `time_entries` (FK a proyecto con `ON DELETE SET NULL`, `source` = `'manual'` | `'focus'`, `billable`)
- **Páginas**: `/time`, `/time/projects`, `/time/timesheet`
- **Eventos emitidos**: `PROJECT_CREATED|UPDATED|DELETED`, `ENTRY_STARTED|STOPPED|CREATED|UPDATED|DELETED`
- **Eventos escuchados**: `WORK_FOCUS_COMPLETED` → crea `time_entry` con `source='focus'` y `durationMin` del payload (auto-entries).
- **Single-running guard**: `startEntry` detiene cualquier entrada en curso antes de crear una nueva.
- **Widget**: `TimeSummaryWidget` 1×1 con total de hoy + start/stop in-place
- **Métricas publicadas**: `time.tracked_today_sec`, `tracked_week_sec`, `billable_week_sec`, `billable_week_revenue`, `active_running`
- **AI Provider**: sí (horas hoy/semana, facturable, ingresos proyectados)
- **Gamificación**: +2 al detener una entrada de ≥5 min

## Configuración por plugin desde el core

Desde `Control Center`, el core permite guardar preferencias por plugin sin modificar código del plugin:

- `pluginSettings:fitness`: entrenos/semana, sueño objetivo, objetivo de comidas, recordatorio de mediciones y `smokingCessationEnabled` para mostrar el seguimiento de cigarrillos solo si el usuario lo activa.
- `pluginSettings:work`: duración de foco y break, alerta de vencimiento, límite WIP, vista predeterminada de tablero.
- `pluginSettings:finance`: moneda default, opciones de presupuesto e insights.

Estas preferencias se guardan en `settings` y pueden ser consumidas por componentes/plugins para ajustar su comportamiento.

Regla de visibilidad en `Control Center`:

- Si un plugin está desactivado, su bloque de configuración no se renderiza.
- Si no hay plugins activos con configuración, la sección completa desaparece.

## Capa visual premium de plugins

Las páginas de plugins comparten una base visual premium desde `src/index.css`:

- `plugin-shell`: contenedor con animación de entrada (común a los 8 plugins).
- `plugin-shell-fitness`, `plugin-shell-work`, `plugin-shell-finance`: atmósferas visuales específicas con tokens de color por dominio.
- `plugin-panel`: paneles con hover y transición consistentes.
- Los plugins más nuevos (Habits, Journal, Goals, Knowledge, Tiempo) usan `plugin-shell` + `plugin-panel` con tokens neutros del tema activo.
