# Consistency Auditor

En la UI se presenta como **Salud del sistema**: resume si esta todo bien,
si conviene revisar ahora o si puede esperar. Los codigos tecnicos, ubicaciones
y payloads quedan plegados en "Ver detalle tecnico" para no cargar al usuario
no tecnico.

El **Consistency Auditor** es un sistema de validación cruzada que detecta
inconsistencias entre el core de Nora OS y los plugins instalados.
Se ejecuta automáticamente al iniciar la app y cada vez que se activa o
desactiva un plugin desde el Control Center.

> Fuente: [`src/core/audit/`](../src/core/audit/) — UI: [`src/core/ui/AuditPanel.tsx`](../src/core/ui/AuditPanel.tsx)

## ¿Para qué sirve?

A medida que un OS modular crece, aparecen "fugas" donde el core asume cosas
que un plugin desactivado ya no provee:

- Logros y misiones que apuntan a un plugin desinstalado.
- Notificaciones encoladas cuya fuente está apagada.
- Quick actions y rutas que llevan a una página inexistente.
- Iconos de un plugin que no representan su dominio (p. ej. una hoja en
  un plugin de finanzas).

El auditor genera un reporte estructurado (`AuditReport`) con `Finding`s
agrupados por severidad: **error**, **warn**, **info**.

## Reglas

| ID  | Severidad base | Descripción |
| --- | -------------- | ----------- |
| **R1** | warn  | Logros vinculados a un plugin inexistente o inactivo. |
| **R2** | warn  | Misiones cuyas dependencias (`requiredPlugins`) están inactivas. |
| **R3** | info  | `eventListeners` que escuchan eventos sin emisor en el sistema (excluye prefijos `CORE_*`, `GAMIFICATION_*`, `core:*`). |
| **R4** | error | Notificaciones en `core_notifications_queue` cuya `source` corresponde a un plugin conocido pero inactivo (filtradas en runtime por `notificationsService`). Excluye `core`, `instant`, `automations`. |
| **R5** | error | Plugin inactivo que sigue declarando `pages`, `navItems` o `widgets`. |
| **R6** | error / warn / info | Iconografía incoherente con `manifest.domain`. Error en el ícono primario, warn en secundarios, info si falta `iconography`. |
| **R7** | warn  | Listeners cruzados: plugin A escucha un evento que solo emite plugin B inactivo. |
| **R8** | error | Quick actions cuyo `path` apunta a una página de un plugin inactivo y no declaran `requiredPlugin`. |
| **R9** | info  | Plugin inactivo aún declara `onboarding`. |
| **R10** | info | Plugin inactivo aún tiene `migrations` o colecciones declaradas. |

## Fixes automáticos

Cuando un finding incluye `fix: AuditFix`, la UI ofrece el botón
**"Aplicar sugerencia"**. Hoy solo se soporta `kind: 'replaceIcon'`, que
muta el manifest en memoria (no se persiste en disco — el desarrollador
debe commitear el cambio manualmente). Los autofixes se generan únicamente
para los plugins oficiales (`fitness`, `work`, `finance`, `habits`,
`journal`).

## Catálogo de dominios e iconos

`DOMAIN_ICON_CATALOG` cubre 20 dominios (finance, health, fitness,
nutrition, nature, knowledge, reading, productivity, habits, social,
travel, creativity, music, gaming, spirituality, home, pets, weather,
time, utility). Cada dominio expone:

- `allowed: string[]` — íconos válidos del dominio.
- `forbidden?: string[]` — íconos explícitamente prohibidos (p. ej. `Leaf`
  en finanzas).
- `description: string` — usado en mensajes de error.

Los íconos en `NEUTRAL_ICONS` (Settings, Bell, Plus, Search…) son válidos
para cualquier dominio. El dominio especial `utility` acepta cualquier
ícono salvo los de `forbidden`.

### Cómo agregar un nuevo dominio

1. Editar [`src/core/types.ts`](../src/core/types.ts) y añadir el nuevo
   valor a `PluginDomain`.
2. Editar [`src/core/audit/domainIconCatalog.ts`](../src/core/audit/domainIconCatalog.ts)
   y agregar la entrada con `allowed`, `forbidden?` y `description`.
3. Actualizar el test `catalog covers all 20 expected domains`.

### Cómo agregar una nueva regla

1. Crear `src/core/audit/rules/RN_<nombre>.ts` exportando una función
   `(input: AuditInputs) => Finding[]`.
2. Importarla y registrarla en el array `RULES` de
   [`src/core/audit/index.ts`](../src/core/audit/index.ts).
3. Añadir su `RuleId` al union en `types.ts` y a `RULE_LABELS` en
   [`AuditPanel.tsx`](../src/core/ui/AuditPanel.tsx).
4. Cubrir la regla con tests en
   `src/core/audit/__tests__/audit.test.ts`.

## Disparadores

- **Boot:** [`src/App.tsx`](../src/App.tsx) ejecuta `runAudit()` después de
  inicializar `notificationsService`.
- **Toggle de plugin:** `setPluginEnabled` en
  [`src/core/state/coreStore.ts`](../src/core/state/coreStore.ts) re-corre
  el auditor.
- **Manual:** botón "Re-auditar" en el Audit Panel del Control Center.

## Integración con notificaciones

`notificationsService.processQueue()` filtra los items cuya `source` es un
plugin conocido pero inactivo: en lugar de entregar la notificación, la
marca como `dismissed_at` con motivo `inactive-plugin`. Las fuentes
`core`, `instant` y `automations` siempre se consideran válidas.
