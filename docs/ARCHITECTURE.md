# Arquitectura del sistema

## Visión general

Nora OS sigue una arquitectura de **kernel + plugins** donde un núcleo (`core/`) provee servicios compartidos y los plugins se registran en tiempo de build para extender la funcionalidad.

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                │
│  ┌─────────────────┐   ┌──────────────────────────────┐ │
│  │ DatabaseService │   │    Storage IPC Handlers      │ │
│  │  (SQLite WAL)   │◄──│  query / execute / migrate   │ │
│  └─────────────────┘   └──────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────┘
                    IPC (context bridge)
┌───────────────────────────────▼─────────────────────────┐
│                  Renderer Process (React)                │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │                     CORE                        │   │
│  │  EventBus ◄─── PluginManager ────► CoreAPI      │   │
│  │     │               │                │          │   │
│  │  coreStore    Plugin Registry   StorageAPI      │   │
│  │  gamifStore       Shell UI                      │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │                   PLUGINS                       │   │
│  │   fitness/       work/       (futuros…)         │   │
│  │   store.ts       store.ts                       │   │
│  │   index.ts       index.ts                       │   │
│  │   components/    components/                    │   │
│  │   pages/         pages/                         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Proceso de arranque

```
App.tsx
  1. authStore.initializeSession()  → valida sesión; si la DB del usuario está cifrada, queda lockeada
  2. UnlockScreen (si corresponde) → setActiveUser(userId, passphrase)
  3. loadFromStorage()              → carga perfil, ajustes, plugins activos desde SQLite
  4. gamificationStore.loadFromStorage() → restaura puntos, nivel, racha, historial y logros
  5. Import de los 8 plugins        → registra manifests en PluginRegistry
  6. pluginManager.initPlugin(id)   por cada plugin activo
       → runMigrations
       → builds CoreAPI con scope
       → plugin.init(api)
           → carga inicial vía api.storage.query / Repository
           → registra listeners (api.events.on)
           → registra context provider de IA (registerAIContextProvider)
           → publica métricas iniciales (api.metrics.publish)
  7. notificationsService.processQueue() → entrega notificaciones encoladas
  8. runAudit()                     → Consistency Auditor (10 reglas)
  9. setReady(true)  → renderiza Shell + rutas
```

## Capas del sistema

### 1. Proceso principal (Electron Main)

- `main.ts` — Crea la BrowserWindow, inicia `DatabaseService`, registra todos los IPC.
- `preload.ts` — Expone 10 bridges vía `contextBridge`: `storage`, `auth`, `backup`, `profile`, `ollama`, `notifications`, `diagnostic`, `appUpdate`, `scheduledBackup`, `dbEncryption`. No expone ninguna otra API de Node.
- `services/database.ts` — Singleton `DatabaseService`. Maneja `auth.db` global + `personal-os-user-{userId}.db` por usuario, activa WAL y foreign keys, crea el schema core. Soporta cifrado AES-256-GCM en reposo (opt-in): `setActiveUser(userId, passphrase)` descifra; `clearActiveUser()` y `close()` re-cifran. Si el archivo del usuario activo está cifrado y aún no se proveó passphrase, la sesión queda **lockeada** (`isLocked()`) sin abrir conexión.
- `services/storage-ipc.ts` — Tres handlers IPC con validación estricta de SQL. Toda operación debe pasar el filtro de tipo (SELECT-only para query, INSERT/UPDATE/DELETE para execute).
- `services/auth-ipc.ts` — 6 canales: `register`, `login`, `logout`, `me`, `get-recovery-question`, `reset-password-with-recovery`. Ver [AUTH.md](AUTH.md).
- `services/backup-ipc.ts` — 4 canales: export/import plain y encrypted (DB completa del usuario activo).
- `services/profile-ipc.ts` — 4 canales: export/import plain y encrypted del **snapshot de perfil** (perfil + settings whitelisted + activePlugins + gamificación). Formato `.posprof.json` o `.posprof` con magic header `POS-PRF1`.
- `services/ollama-ipc.ts` — `health`, `list-models`, `generate` contra `http://127.0.0.1:11434` vía Electron `net` (sin CORS).
- `services/notifications-ipc.ts` — `supported`, `show` (notificaciones nativas del SO).
- `services/diagnostic-ipc.ts` — `export` genera JSON local con versión, plataforma, conteos de tablas y últimos eventos.
- `services/app-update-ipc.ts` — `get-status`, `check`, `download`, `quit-and-install` + evento `status` (banner global). Usa `electron-updater`.
- `services/scheduled-backup.ts` + `scheduled-backup` IPC — backup automático diario / semanal / mensual a destino local; passphrase persistido en `safeStorage` del SO.
- `services/db-encryption-ipc.ts` — `status`, `enable`, `disable`, `check-strength`, `unlock` para el cifrado opt-in de la DB de usuario.

### 2. Core — EventBus

`EventBus` es un singleton pub/sub en memoria con las siguientes características:

- Registro de handlers por nombre de evento.
- Historial en memoria de los últimos 100 eventos.
- Callback de persistencia configurable: cuando PluginManager conecta el EventBus al `events_log` de SQLite, cada `emit()` se persiste automáticamente.
- Inferencia de `source` por prefijo (`FITNESS_`, `WORK_`, `CORE_`, `GAMIFICATION_`) cuando el emisor no lo especifica manualmente.
- Devuelve función de cleanup (`UnsubscribeFn`) en cada `on()`.

```typescript
eventBus.emit('WORK_TASK_CREATED', { taskId: '…' })
const unsub = eventBus.on('WORK_TASK_CREATED', (payload) => { … })
unsub()  // cleanup
```

### 3. Core — PluginManager

Responsable de:

1. **Registrar** manifests (`register(manifest)`).
2. **Inicializar** plugins: ejecuta migraciones, construye `CoreAPI` con scope del plugin, llama `plugin.init(api)`.
3. **Registrar UI**: widgets, páginas y nav items que los plugins declaran en su manifest.
4. **Desactivar** plugins: remueve UI registrada, llama `plugin.deactivate?.()`.
5. **Proveer listas activas**: `getActiveWidgets()`, `getActivePages()`, `getActiveNavItems()`.

### 4. Core — CoreAPI

Interfaz inyectada en cada plugin al hacer `init(api)`. Provee:

```typescript
interface CoreAPI {
  storage: {
    query<T>(sql, params?): Promise<T[]>
    execute(sql, params?): Promise<{ changes, lastInsertRowid }>
    migrate(pluginId, migrations): Promise<void>
  }
  events: {
    emit(event, payload): void
    on(event, handler): UnsubscribeFn
    off(event, handler): void
  }
  ui: {
    registerWidget(def: WidgetDefinition): void
    registerPage(def: PageDefinition): void
    registerNavItem(def: NavItemDefinition): void
  }
  metrics: {
    publish(metricId: string, value: number, meta?: Record<string, unknown>): void
    get(metricId: string): MetricSnapshot | undefined
    list(): MetricSnapshot[]
  }
  getProfile(): UserProfile  // { name, height, age, startDate, weightGoal, bigGoal? }
  gamification: {
    addPoints(amount: number, reason: string): void
    checkAchievement(stats): void
  }
}
```

Además, los plugins pueden importar directamente:

- `registerAIContextProvider(id, provider)` desde `@core/services/aiContextRegistry` para aportar su slice al snapshot global de IA.
- `defineRepository<TEntity, TRow>({ table, mapRow, toRow })` desde `@core/storage/Repository` para evitar SQL crudo manteniendo la allowlist.

### 5. Core — Estado global (Zustand)

#### `coreStore`
- Perfil de usuario (`name`, `height`, `age`, `startDate`, `weightGoal`, `bigGoal`).
- Ajustes (`theme`, `sidebarCollapsed`).
- Lista de plugins activos.
- Flag `onboardingComplete`.
- Persistencia a/desde SQLite.
- Soporte de configuración centralizada para módulos vía tabla `settings` (ej. `pluginSettings:fitness`, `pluginSettings:work`, `pluginSettings:finance`, `corePlannerTasksV1`).
- Esta lista de plugins activos también condiciona la UI del `ControlCenter` (secciones por plugin visibles solo cuando el plugin está activo) y dispara `runAudit()` en cada toggle.

#### `gamificationStore`
- Puntos totales, nivel calculado (puntos / 100 + 1), racha de días.
- Historial de transacciones de puntos.
- Logros desbloqueados.
- Persistencia del snapshot en `settings.gamificationState`.
- `addPoints(amount, reason)` actualiza nivel, emite eventos y guarda el snapshot persistido.

### 6. Storage API + Repository

`StorageAPI` es un wrapper de conveniencia sobre `window.storage` que:

- Valida que la tabla esté en el allowlist.
- Valida que las columnas en INSERT/UPDATE estén en el allowlist de esa tabla.
- Limita lecturas a 500 filas como máximo.
- Provee helpers: `getAll`, `getById`, `insert`, `update`, `deleteRow`, `logEvent`, `getRecentEvents`.

`defineRepository<TEntity, TRow>` (en `@core/storage/Repository`) construye un repositorio tipado por encima del mismo allowlist:

- API: `find`, `findOne`, `findById`, `count`, `create`, `update`, `delete`, `deleteWhere` con `WhereClause` (`= != < <= > >= LIKE IS IS NOT IN`).
- `deleteWhere` exige `where` no vacío para impedir borrados full-table accidentales.
- Usado hoy por **Habits**, **Journal**, **Knowledge** y **Time** para mapear snake_case ↔ camelCase y serializar booleanos / JSON.

### 7. Plugins

Cada plugin es un módulo TypeScript que exporta un `PluginManifest`. Internamente los plugins pueden tener:

- `store.ts` — Zustand store local (datos en memoria, cargados desde SQLite en `init`).
- `types.ts` — Tipos de dominio.
- `events.ts` — Constantes de eventos con prefijo del plugin.
- `components/` — Componentes React de UI.
- `pages/` — Páginas completas montadas por el router.
- Las páginas de plugins usan una capa visual premium definida en `index.css` (`plugin-shell`, `plugin-shell-fitness`, `plugin-shell-work`, `plugin-shell-finance`, `plugin-panel`, etc.) para diferenciar cada dominio sin romper integración temática. Los plugins más nuevos (Habits, Journal, Goals, Knowledge, Tiempo) reutilizan `plugin-shell` + `plugin-panel` con tokens neutros.
- Cada plugin puede declarar `domain` (`finance`, `fitness`, `productivity`, `habits`, `knowledge`, `time`, …) y `iconography: { primary, gallery? }` en su manifest. El **Consistency Auditor** valida que la iconografía sea coherente con el dominio (regla R6).

### 8. Shell y navegación

`Sidebar` agrupa las páginas de plugins por `parentId` bajo **Módulos**. La preferencia visual se guarda en `settings.sidebarNavState:v1`: orden de módulos, bloqueo de reordenamiento y plugins con submenú colapsado.

- El candado del título de **Módulos** bloquea o desbloquea el reordenamiento por drag and drop.
- Solo se reordenan módulos activos; Principal, Herramientas y footer mantienen orden estable.
- En modo sidebar colapsado, los submenús siempre se ocultan.

### 9. Capa de dashboard

El dashboard principal combina componentes del core y widgets de plugins:

- `SystemStatusHero` y `SystemSuggestions` consumen una lógica compartida (`systemGuidance.ts`) para derivar estado, próximo paso y situación `todo activo y OK`.
- `RecentActivityFeed` consulta `events_log` y se refresca con eventos persistidos del sistema.
- Los widgets principales del dashboard pueden reordenarse condicionalmente para optimizar distribución visual.
- Cada plugin puede aportar widgets (`HabitsSummaryWidget`, `KnowledgeSummaryWidget`, `TimeSummaryWidget`, etc.) vía `api.ui.registerWidget`.
- El colapso de widgets de plugins se resuelve en el layout core, no en los plugins.
- El XP y nivel se muestran en el header del Shell y en `GlobalProgress` (panel expandido del Dashboard); ya no existe el componente legacy `GamificationBar`.

### 10. Planner core (no plugin)

`src/core/ui/pages/PlannerPage.tsx` implementa agenda diaria/calenadario como parte del core:

- To-do por categoría (`domestica`, `recordatorio`, `trabajo`, `personal`).
- Complejidad por tarea (`baja`, `media`, `alta`) con XP asociado.
- Vistas mensual y semanal con filtros.
- Reprogramación de tareas por drag and drop entre días.
- Persistencia en `settings` bajo `corePlannerTasksV1`.

Cuando se completa una tarea por primera vez, emite `CORE_PLANNER_TASK_COMPLETED` y dispara flujo de gamificación.

## Flujo de datos típico

```
Usuario interactúa (ej. drag card a columna "Hecho")
  │
  ▼
KanbanBoard.handleDragEnd()
  ├─ store.moveCard(cardId, toColumnId, position)    [estado Zustand]
  ├─ window.storage.execute('UPDATE work_cards …')   [SQLite]
  ├─ eventBus.emit(WORK_EVENTS.TASK_MOVED, {…})      [EventBus]
  └─ if isDoneColumn → eventBus.emit(WORK_EVENTS.TASK_COMPLETED, {…})
                           │
                           ▼
                     PluginManager persistence callback
                           │
                           ▼
                     INSERT INTO events_log
                           │
                           ▼
                     Listener en index.ts
                           │
                           ▼
                     api.gamification.addPoints(10, '…')
                           │
                           ▼
                     gamificationStore.addPoints()
                           │
                           ▼
                     UI del header / GlobalProgress re-renderiza
```

## Temas visuales

El sistema soporta 5 temas configurados con CSS variables en `src/index.css`:

| Clave | Descripción |
|-------|-------------|
| `default` | Oscuro con acentos violeta/azul |
| `light` | Claro |
| `cyberpunk` | Neón amarillo sobre negro |
| `calma` | Tonos suaves azul/verde |
| `bosque` | Verdes naturales |

El tema se aplica via atributo `data-theme` en el elemento raíz y `Shell.tsx` lo sincroniza con el `coreStore`.

## Seguridad del IPC

Todos los datos que fluyen entre el renderer y el main process pasan por validación en `storage-ipc.ts`:

1. **Tipo de SQL**: query solo acepta SELECT/WITH/PRAGMA; execute solo INSERT/UPDATE/DELETE.
2. **Statement único**: se rechaza SQL con múltiples sentencias.
3. **Parámetros tipados**: deben ser array de primitivos.
4. **PluginId**: solo alfanumérico + guiones + underscores.
5. **Versiones de migración**: enteros positivos.

El renderer nunca puede ejecutar SQL arbitrario ni acceder al filesystem directamente.
