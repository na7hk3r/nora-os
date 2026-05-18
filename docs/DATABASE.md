# Esquema de base de datos

Base de datos SQLite con WAL mode. Archivo: `{userData}/data/personal-os.db`.

> **Nota**: los nombres de archivo `personal-os.db` y `personal-os-user-{userId}.db` se mantienen por compatibilidad con instalaciones existentes. Renombrarlos requeriría una migración de datos. La marca de la app es **Nora OS**.

## Tablas del core

### `profile`

Perfil del usuario. Siempre existe la fila con `id = 1`.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK | Siempre 1 |
| `name` | TEXT | Nombre del usuario |
| `height` | REAL | Altura en cm |
| `age` | INTEGER | Edad |
| `start_date` | TEXT | Fecha de inicio (ISO 8601) |
| `weight_goal` | REAL | Peso objetivo en kg |
| `created_at` | TEXT | Timestamp de creación |
| `updated_at` | TEXT | Timestamp de última actualización |

### `settings`

Pares clave-valor para configuración persistida.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `key` | TEXT PK | Clave de la configuración |
| `value` | TEXT | Valor serializado (JSON si es complejo) |

**Claves conocidas:**

| Clave | Tipo de valor | Descripción |
|-------|---------------|-------------|
| `theme` | string | Tema visual activo |
| `sidebarCollapsed` | `"true"` / `"false"` | Estado del sidebar |
| `onboardingComplete` | `"true"` / `"false"` | Si completó el onboarding |
| `activePlugins` | JSON array | IDs de plugins activos |
| `gamificationState` | JSON object | Snapshot persistido de gamificacion (`points`, `level`, `streak`, `history`, `unlockedIds`). `points` y `level` se preservan como fuente de verdad; la curva de XP solo puede subir el nivel visible, no bajarlo. |

Durante el arranque de Nora OS, si la instalacion actual no tiene datos o si
Pulso Nora quedo con menos progreso que una instalacion legacy, se recupera el
snapshot de gamificacion desde `{userData}/../Personal OS/data` o
`{userData}/../personal-os/data` sin borrar ni sobrescribir datos actuales.

### `events_log`

Registro inmutable de todos los eventos emitidos con persistencia activa.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK AUTOINCREMENT | ID del evento |
| `event_type` | TEXT NOT NULL | Nombre del evento (ej. `WORK_TASK_COMPLETED`) |
| `source` | TEXT NOT NULL | Plugin o sistema de origen |
| `payload` | TEXT | JSON con datos del evento |
| `created_at` | TEXT | Timestamp de emisión |

### `plugin_state`

Estado genérico clave-valor por plugin. Clave compuesta `(plugin_id, key)`.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `plugin_id` | TEXT NOT NULL | ID del plugin |
| `key` | TEXT NOT NULL | Clave del estado |
| `value` | TEXT | Valor serializado |

### `_migrations`

Tracking de migraciones aplicadas. Clave compuesta `(plugin_id, version)`.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `plugin_id` | TEXT NOT NULL | ID del plugin |
| `version` | INTEGER NOT NULL | Número de versión de la migración |
| `applied_at` | TEXT | Timestamp de aplicación |

### `core_tags`

Catalogo global de tags compartidos por modulos.

| Columna | Tipo | DescripciÃ³n |
|---------|------|-------------|
| `id` | INTEGER PK AUTOINCREMENT | ID del tag |
| `name` | TEXT UNIQUE NOT NULL | Nombre normalizado en minusculas |
| `color` | TEXT | Color opcional `#RRGGBB` |
| `created_at` | TEXT | Timestamp de creaciÃ³n |

### `core_tag_links`

Relacion entre tags globales y entidades de la app.

| Columna | Tipo | DescripciÃ³n |
|---------|------|-------------|
| `tag_id` | INTEGER NOT NULL | FK a `core_tags.id` |
| `entity_type` | TEXT NOT NULL | Tipo estable (`work_note`, `work_card`, `planner_task`) |
| `entity_id` | TEXT NOT NULL | ID de la entidad enlazada |
| `created_at` | TEXT | Timestamp de creaciÃ³n |

La clave unica logica es `(tag_id, entity_type, entity_id)`. Los arrays legacy
`work_notes.tags`, `work_cards.labels` y `PlannerTask.tags` se mantienen como
espejo de nombres para compatibilidad y busquedas existentes.

### `core_automations`

Automatizaciones creadas desde Config, tanto desde recetas simples como desde
modo avanzado.

| Columna | Tipo | DescripciÃ³n |
|---------|------|-------------|
| `id` | TEXT PK | ID de la automatizacion |
| `name` | TEXT NOT NULL | Nombre visible |
| `enabled` | INTEGER | 1 activa, 0 pausada |
| `trigger_event` | TEXT NOT NULL | Evento que dispara la automatizacion |
| `condition` | TEXT | JSON opcional de condicion |
| `action_type` | TEXT NOT NULL | Accion (`notify`, `xp`, `emit`) |
| `action_payload` | TEXT | JSON de payload |
| `last_run_at` | TEXT | Ultima ejecucion |
| `run_count` | INTEGER | Cantidad de ejecuciones |
| `created_at` | TEXT | Timestamp de creaciÃ³n |

---

## Tablas del plugin Fitness

### `fitness_daily_entries`

Una fila por día de registro.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK AUTOINCREMENT | ID del registro |
| `date` | TEXT UNIQUE NOT NULL | Fecha YYYY-MM-DD |
| `day_name` | TEXT | Nombre del día (ej. "Lunes") |
| `weight` | REAL | Peso en kg (nullable) |
| `breakfast` | INTEGER DEFAULT 0 | 1 si desayunó, 0 si no |
| `lunch` | INTEGER DEFAULT 0 | 1 si almorzó, 0 si no |
| `snack` | INTEGER DEFAULT 0 | 1 si meriendó, 0 si no |
| `dinner` | INTEGER DEFAULT 0 | 1 si cenó, 0 si no |
| `workout` | TEXT | `'A'`, `'B'`, `'R'` (descanso) o `''` |
| `cigarettes` | INTEGER DEFAULT 0 | Cantidad de cigarrillos |
| `sleep` | REAL | Horas de sueño |
| `notes` | TEXT | Notas libres |
| `created_at` | TEXT | Timestamp de creación |

### `fitness_measurements`

Medidas corporales. Una fila por fecha (UNIQUE en date).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK AUTOINCREMENT | ID del registro |
| `date` | TEXT UNIQUE NOT NULL | Fecha YYYY-MM-DD |
| `weight` | REAL | Peso en kg (nullable) |
| `arm_relaxed` | REAL | Bíceps relajado en cm |
| `arm_flexed` | REAL | Bíceps contraído en cm |
| `chest` | REAL | Pecho en cm |
| `waist` | REAL | Cintura en cm |
| `leg` | REAL | Pierna en cm |
| `created_at` | TEXT | Timestamp de creación |

---

## Tablas del plugin Work

### `work_boards`

Tableros Kanban.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID o identificador |
| `name` | TEXT NOT NULL | Nombre del tablero |

**Dato semilla (migración v2):** `id='default', name='Principal'`

### `work_columns`

Columnas dentro de un tablero.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `board_id` | TEXT NOT NULL | FK a `work_boards.id` |
| `name` | TEXT NOT NULL | Nombre de la columna |
| `position` | INTEGER DEFAULT 0 | Orden de izquierda a derecha |
| `wip_limit` | INTEGER | Límite WIP (nullable). Añadido en v7. |

**Columnas semilla (migración v2):**

| id | name | position |
|----|------|----------|
| `col-backlog` | Backlog | 0 |
| `col-todo` | Por hacer | 1 |
| `col-progress` | En progreso | 2 |
| `col-done` | Hecho | 3 |

### `work_cards`

Tarjetas / tareas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `column_id` | TEXT NOT NULL | FK a `work_columns.id` |
| `title` | TEXT NOT NULL | Título de la tarea |
| `description` | TEXT DEFAULT '' | Descripción breve |
| `content` | TEXT DEFAULT '' | Contenido extendido (Markdown). Añadido en v3. |
| `labels` | TEXT DEFAULT '[]' | JSON array de strings |
| `due_date` | TEXT | Fecha límite ISO 8601 (nullable) |
| `position` | INTEGER DEFAULT 0 | Orden dentro de la columna |
| `priority` | TEXT | `low` / `medium` / `high` / `urgent` (nullable). Añadido en v7. |
| `estimate_minutes` | INTEGER | Estimación en minutos (nullable). Añadido en v7. |
| `checklist` | TEXT DEFAULT '[]' | JSON array de `{ id, text, done }`. Añadido en v7. |
| `archived` | INTEGER DEFAULT 0 | 1 si fue archivada manualmente desde la columna completada. Añadido en v7. |
| `archived_at` | INTEGER | Timestamp en ms del archivado. Añadido en v7. |

### `work_notes`

Notas de trabajo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `title` | TEXT NOT NULL | Título |
| `content` | TEXT DEFAULT '' | Contenido (Markdown) |
| `tags` | TEXT DEFAULT '[]' | JSON array de strings |
| `created_at` | TEXT | Timestamp de creación |
| `updated_at` | TEXT | Timestamp de última edición |
| `pinned` | INTEGER DEFAULT 0 | 1 si está fijada en la lista. Añadido en v6. |

### `work_links`

Bookmarks de trabajo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `title` | TEXT NOT NULL | Nombre del enlace |
| `url` | TEXT NOT NULL | URL completa |
| `category` | TEXT DEFAULT '' | Categoría libre |

### `work_focus_sessions`

Sesiones de foco del motor de ejecución. Creada en migración v4.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID de la sesión |
| `task_id` | TEXT | FK a `work_cards.id` (nullable — foco libre) |
| `start_time` | INTEGER NOT NULL | Timestamp inicio en ms (Unix epoch) |
| `end_time` | INTEGER | Timestamp fin en ms (nullable si activa o pausada) |
| `duration` | INTEGER | Duración efectiva en ms (excluye pausas, nullable si activa) |
| `interrupted` | INTEGER DEFAULT 0 | 1 si fue interrumpida, 0 si completada |
| `paused_at` | INTEGER | Timestamp en ms del pause actual (nullable). Añadido en v5. |
| `paused_total` | INTEGER DEFAULT 0 | Tiempo total acumulado en pausas (ms). Añadido en v5. |

**Índices:**
- `idx_work_focus_sessions_task_id` — búsquedas por tarea
- `idx_work_focus_sessions_start_time` — ordenamiento cronológico y filtro por día

**Reglas de negocio:**
- Solo puede haber una sesión activa global (sin `end_time`) a la vez.
- `pause` no setea `end_time`; congela el tiempo registrando `paused_at` y acumulando en `paused_total` al hacer `resume`.
- `start` con sesión previa: si ésta tiene ≥1 min de tiempo efectivo se completa silenciosamente; si no, se descarta (DELETE) sin XP penalty.
- Al iniciar la app, sesiones sin `end_time` con más de 8h de antigüedad se cierran como interrumpidas con cap de 8h (cleanup zombie).

---

## Tablas del plugin Finance

### `finance_accounts`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `name` | TEXT NOT NULL | Nombre |
| `type` | TEXT | `cash` \| `bank` \| `card` \| `wallet` \| `other` |
| `currency` | TEXT NOT NULL | ISO-4217 |
| `initial_balance` | INTEGER DEFAULT 0 | Saldo inicial en centavos, expresado en la moneda de la cuenta |
| `color` | TEXT | Color opcional `#RRGGBB` para identificar la cuenta |
| `archived` | INTEGER DEFAULT 0 | 1 = archivada |
| `created_at` | TEXT | ISO datetime |

### `finance_categories`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `name` | TEXT NOT NULL | Nombre |
| `kind` | TEXT NOT NULL | `income` \| `expense` |
| `parent_id` | TEXT | FK opcional a otra categoría (jerarquía) |
| `color` | TEXT | Color sugerido para charts |

### `finance_transactions`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `account_id` | TEXT NOT NULL | FK `finance_accounts.id` |
| `category_id` | TEXT | FK `finance_categories.id` (nullable) |
| `kind` | TEXT NOT NULL | `income` \| `expense` \| `transfer` |
| `amount` | INTEGER NOT NULL | Monto positivo en centavos, en la moneda de la cuenta |
| `currency` | TEXT NOT NULL | ISO-4217 de la cuenta impactada |
| `original_amount` | INTEGER | Monto original ingresado por el usuario, en centavos |
| `original_currency` | TEXT | ISO-4217 del monto original |
| `base_amount` | INTEGER | Monto convertido a la moneda base para reportes, si hay tasa |
| `base_currency` | TEXT | Moneda base usada para `base_amount` |
| `exchange_rate` | REAL | Tasa manual usada para convertir desde `original_currency` |
| `occurred_at` | TEXT NOT NULL | ISO `YYYY-MM-DD` |
| `note` | TEXT | Texto libre |
| `recurring_id` | TEXT | FK opcional a `finance_recurring.id` |
| `transfer_pair_id` | TEXT | ID del otro lado de una transferencia |
| `transfer_group_id` | TEXT | UUID que agrupa los dos lados de una transferencia |
| `movement_subtype` | TEXT NOT NULL DEFAULT 'regular' | `regular` \| `withdrawal` |
| `created_at` | TEXT | ISO datetime |

### `finance_recurring`
Plantilla de transacciones recurrentes. Campos: `id`, `name`, `template` (JSON con movimiento base), `rrule`, `next_run`, `active`, `created_at`. El motor `runRecurringEngine` materializa ocurrencias en `finance_transactions`.

### `finance_budgets`
Campos: `id`, `category_id`, `period` (`monthly`), `limit_amount`, `currency`, `created_at`.

### `finance_merchant_aliases`
Mapeo `pattern → merchant` para normalizar descripciones al importar movimientos.

---

## Tablas del plugin Habits

### `habits_definitions`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `name` | TEXT NOT NULL | Nombre |
| `description` | TEXT | Texto libre |
| `frequency_type` | TEXT NOT NULL | `daily` \| `weekly` \| `monthly` |
| `target_per_period` | INTEGER DEFAULT 1 | Cuántas veces por período |
| `unit` | TEXT | Unidad opcional (`min`, `pages`, …) |
| `color` | TEXT | Color para chips |
| `archived` | INTEGER DEFAULT 0 | 1 = archivado |
| `created_at` | TEXT | ISO datetime |

### `habits_logs`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `habit_id` | TEXT NOT NULL | FK `habits_definitions.id` |
| `date` | TEXT NOT NULL | ISO `YYYY-MM-DD` |
| `value` | REAL DEFAULT 1 | Cantidad registrada |
| `note` | TEXT | Texto libre |
| `created_at` | TEXT | ISO datetime |

**Índices:** `idx_habits_logs_habit_id`, `idx_habits_logs_date`.

---

## Tablas del plugin Journal

### `journal_entries`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `date` | TEXT NOT NULL UNIQUE | ISO `YYYY-MM-DD` (1 entrada por día) |
| `title` | TEXT | Título opcional |
| `body` | TEXT | Markdown |
| `mood` | INTEGER | 1..5 |
| `tags` | TEXT | JSON array |
| `pinned` | INTEGER DEFAULT 0 | 1 = pinneado |
| `prompt_id` | TEXT | FK opcional `journal_prompts.id` |
| `created_at` | TEXT | ISO datetime |
| `updated_at` | TEXT | ISO datetime |

### `journal_prompts`
Catálogo de consignas. Seed v2 inserta 7 prompts builtin (`builtin = 1`). Campos: `id`, `text`, `category`, `builtin`.

---

## Tablas del plugin Goals

### `goals_objectives`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `title` | TEXT NOT NULL | Nombre del Objective |
| `description` | TEXT | Texto libre |
| `period` | TEXT NOT NULL | `Q1` \| `Q2` \| `Q3` \| `Q4` \| `H1` \| `H2` \| `Y` |
| `year` | INTEGER NOT NULL | Año del Objective |
| `status` | TEXT DEFAULT 'active' | `active` \| `completed` \| `archived` |
| `color` | TEXT | Color sugerido |
| `created_at` | TEXT | ISO datetime |

### `goals_key_results`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `goal_id` | TEXT NOT NULL | FK `goals_objectives.id` `ON DELETE CASCADE` |
| `name` | TEXT NOT NULL | Nombre del KR |
| `source` | TEXT | `metric:<metricId>` \| `manual` |
| `baseline` | REAL | Valor inicial |
| `target_value` | REAL NOT NULL | Valor objetivo |
| `current_value` | REAL DEFAULT 0 | Valor actual (sincronizado por `syncMetricBackedKRs` cuando `source` apunta a métrica) |
| `unit` | TEXT | Unidad |
| `direction` | TEXT DEFAULT 'up' | `up` \| `down` |
| `created_at` | TEXT | ISO datetime |

### `goals_milestones`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `kr_id` | TEXT NOT NULL | FK `goals_key_results.id` `ON DELETE CASCADE` |
| `value` | REAL NOT NULL | Valor alcanzado |
| `achieved_at` | TEXT NOT NULL | ISO datetime |
| `note` | TEXT | Texto libre |

**Índices:** `idx_goals_kr_goal`, `idx_goals_milestones_kr`, `idx_goals_objectives_year_period`.

---

## Tablas del plugin Knowledge

### `knowledge_resources`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `type` | TEXT NOT NULL | `book` \| `course` \| `paper` \| `article` \| `video` |
| `title` | TEXT NOT NULL | Título |
| `author` | TEXT | Autor |
| `url` | TEXT | URL fuente |
| `tags` | TEXT | JSON array |
| `progress` | INTEGER DEFAULT 0 | 0–100 |
| `status` | TEXT DEFAULT 'in_progress' | `pending` \| `in_progress` \| `finished` |
| `notes` | TEXT | Markdown |
| `created_at` | TEXT | ISO datetime |
| `finished_at` | TEXT | ISO datetime (cuando `status = finished`) |

### `knowledge_highlights`
Campos: `id`, `resource_id` (FK CASCADE), `text`, `note`, `location`, `created_at`.

### `knowledge_flashcards` (algoritmo SM-2)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `resource_id` | TEXT | FK opcional `knowledge_resources.id` |
| `front` | TEXT NOT NULL | Cara frontal |
| `back` | TEXT NOT NULL | Cara reverso |
| `ease` | REAL DEFAULT 2.5 | Factor de facilidad (mínimo 1.3) |
| `interval` | INTEGER DEFAULT 0 | Días hasta el próximo repaso |
| `repetitions` | INTEGER DEFAULT 0 | Cantidad de repasos exitosos consecutivos |
| `next_review` | TEXT | ISO `YYYY-MM-DD` |
| `created_at` | TEXT | ISO datetime |

**Algoritmo SM-2** (`sm2Schedule`): `quality < 3` → reset (`repetitions = 0`, `interval = 1`); `quality ≥ 3` → secuencia `1d → 6d → ease·interval`; `ease += 0.1 - (5 - quality)·(0.08 + (5 - quality)·0.02)`; floor `ease` en `1.3`.

### `knowledge_reviews`
Log de cada repaso: `id`, `flashcard_id` (FK CASCADE), `quality` (0–5), `reviewed_at`, `prev_interval`, `new_interval`.

---

## Tablas del plugin Tiempo

### `time_projects`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `name` | TEXT NOT NULL | Nombre |
| `client` | TEXT | Cliente opcional |
| `hourly_rate` | REAL | Tarifa por hora (moneda en settings) |
| `color` | TEXT | Color para chips/charts |
| `archived` | INTEGER DEFAULT 0 | 1 = archivado |
| `created_at` | TEXT | ISO datetime |

### `time_entries`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `project_id` | TEXT | FK `time_projects.id` `ON DELETE SET NULL` |
| `description` | TEXT | Texto libre |
| `start_time` | INTEGER NOT NULL | Timestamp en ms |
| `end_time` | INTEGER | Timestamp en ms (nullable si activa) |
| `duration_sec` | INTEGER | Duración en segundos (nullable si activa) |
| `source` | TEXT DEFAULT 'manual' | `manual` \| `focus` (auto-creada al recibir `WORK_FOCUS_COMPLETED`) |
| `billable` | INTEGER DEFAULT 0 | 1 = facturable |
| `tags` | TEXT | JSON array |
| `created_at` | TEXT | ISO datetime |

**Índices:** `idx_time_entries_project_id`, `idx_time_entries_start_time`.

**Reglas de negocio:**
- Single-running guard: `startEntry` cierra cualquier entrada en curso antes de iniciar otra.
- Cuando un proyecto se elimina, sus entries quedan con `project_id = NULL` (no se borran).

---

## Cifrado opcional de la DB de usuario

Cuando el usuario habilita cifrado en reposo (`window.dbEncryption.enable`), el archivo `personal-os-user-{id}.db` queda envuelto en un blob con layout binario:

```
MAGIC(4) | VERSION(1) | SALT(16) | IV(12) | TAG(16) | CIPHERTEXT
```

- Algoritmo: AES-256-GCM.
- Derivación de clave: scrypt sobre la passphrase del usuario + `SALT`.
- En cada open/save la DB se descifra a un archivo temporal y el plaintext nunca toca disco persistente sin protección.

---

## Notas sobre tipos de datos

- **Fechas en texto** (`TEXT`): formato ISO 8601 (`YYYY-MM-DD` o datetime completo). SQLite no tiene tipo DATE nativo.
- **Timestamps de foco** (`INTEGER`): milisegundos Unix (`Date.now()`), para aritmética de duración eficiente.
- **Booleans** (`INTEGER 0/1`): SQLite no tiene tipo BOOLEAN. Se mapea en TypeScript a `boolean` con `Boolean(row.interrupted)`.
- **Arrays JSON** (`TEXT`): etiquetas y tags se serializan como JSON. Se parsean con `JSON.parse(row.labels || '[]')`.
- **IDs de work**: `crypto.randomUUID()` — UUID v4.
- **IDs de fitness**: `INTEGER AUTOINCREMENT`.
