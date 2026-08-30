# Port: versión web de Nora OS

Documento de viabilidad y plan del port de la aplicación de escritorio de Nora OS
(Electron) a una **PWA local-first** (todo en el navegador, sin servidor).

> Estado: **Fase 3 completada** — PWA instalable/offline (manifest + Service
> Worker) y los 8 plugins del núcleo operando con datos reales (migraciones +
> hidratación) sobre sql.js en navegador. Renderer desktop corriendo sin cambios
> en `apps/web`.
> **Publicada en** `https://na7hk3r.github.io/nora-os/web/` (deploy conjunto con
> la landing en `.github/workflows/landing.yml`).
> Decisión de producto: PWA local-first · prioridad desktop/browser · IA postergada a v1 · alcance núcleo completo.

> **Estado de ejecución**
> - **Fase 0** (spike) ✅
> - **Fase 1** (puente storage+auth+boot, renderer en web) ✅
> - **Fase 2** (compatibilidad de datos + backup/profile/dbEncryption) ✅
> - **Fase 3** (PWA + núcleo completo) ✅
> - **Fase 4** (endurecimiento) pendiente

---

## Resultado del spike (Fase 0)

Se creó `apps/web` como app Vite + React + TS + Tailwind independiente (misma
estructura que `apps/landing`), con el objetivo de validar los dos pilares
técnicos del port sin tocar la app desktop.

### 1. SQLite en el navegador — ✅ validado

`apps/web/src/spike/sqlite-web.ts` + `storage-bridge.ts` implementan un puente
`StorageBridge` (el mismo contrato que `window.storage` de Electron) sobre
**sql.js** (SQLite compilado a WebAssembly) con persistencia en **IndexedDB**
(vía Dexie).

Probado contra el **schema core real** de `apps/desktop/electron/services/database.ts`:

- `CREATE TABLE` / `CREATE INDEX` del core (settings, events_log, core_tags, _migrations, …).
- SQL parametrizado (`?`) y `INSERT OR REPLACE`.
- `AUTOINCREMENT` + `last_insert_rowid()`.
- Migraciones de plugin (multi-sentencia, transacción `BEGIN/COMMIT/ROLLBACK`, idempotente).
- Foreign keys `ON DELETE CASCADE`.

**15/15 tests en verde** (`apps/web/src/spike/*.test.ts`, corre con `vitest run`).

**Hallazgo (schema quota quirk):** en sql.js el `PRAGMA foreign_keys` puede no
persistir a nivel conexión tras ciertas operaciones. Solución adoptada:
re-afirmar `PRAGMA foreign_keys = ON` antes de cada escritura (`execute`) y en
la apertura/rehidratación de cada conexión. Barato y correcto.

### 2. WebCrypto — ✅ validado

`apps/web/src/spike/crypto-web.ts` valida la API estándar del navegador:

- **Hashing/verificación de contraseñas**: PBKDF2 (SHA-256, formato
  `salt:iterations:digest`) replicando la interfaz `hashSecret`/`verifySecret`.
- **Cifrado en reposo**: AES-256-GCM con header propio (`WSEC`, análogo al
  `POS1` de Electron), redondo cifrado→descifrado, fail ante passphrase mala.

**Hallazgo importante (scrypt):** el backend actual de Electron usa **scrypt**
para los hashes (`scryptSync`) y para derivar la key de AES-GCM. **WebCrypto NO
implementa scrypt nativo** (solo PBKDF2/HKDF). Por lo tanto:

- Los datos **generados por la web** (formato PBKDF2) no son byte-compatibles
  con los **exportados por Electron** (scrypt) y viceversa.
- El spike valida el camino web (PBKDF2). Para **compatibilidad de migración**
  con datos existentes haría falta enchufar scrypt vía wasm/js (ej. `scrypt-js`),
  o correr una migración/export-import dedicada. Se documenta como punto de la
  Fase 2 de port.

---

## Viabilidad global

La arquitectura de Nora OS es **excepcionalmente favorable** al port:

- El renderer React (`apps/desktop/src/core/` + `plugins/`, ~toda la UI y la
  lógica) es agnóstico de Electron. Solo se comunica con el main process vía
  los 11 bridges tipados en `core/types.ts`.
- El storage ya está abstraído detrás de `StorageAPI`/`window.storage`/
  `Repository` con una interfaz SQL acotada.
- Ya existe una app web en el monorepo (`apps/landing`) como plantilla de build
  Vite + PWA.
- Los tests (vitest) y el sistema de builds se pueden reutilizar.

Solo la capa `apps/desktop/electron/services/*` depende de Electron/Node, y es
la que se sustituye por implementaciones web:

| Sistema Electron | Alternativa web |
|---|---|
| `database.ts` (better-sqlite3) | sql.js + IndexedDB (validado) |
| `auth.ts` (scrypt) | WebCrypto PBKDF2 / scrypt-wasm (validado PBKDF2) |
| `encryption.ts` (AES-GCM) | WebCrypto AES-GCM (validado) |
| `backup`/`profile` (filesystem) | Descarga/importa como Blob |
| `notifications` | Notification API del navegador |
| `scheduled-backup` | Service Worker / segundo plano |
| `app-update` | No aplica (se publica la PWA) |
| `work-focus-window` | Pestaña/popup o modo single-window |
| `ollama` | Postergado (v1); luego vía proxy local |

---

## Plan de ejecución

- **Fase 0 (spike)** — ✅ completada. Crear `apps/web`, validar sql.js+IndexedDB
  y WebCrypto con el schema real.
- **Fase 1 — Puente de almacenamiento web completo.** ✅ completada. Mismo shape
  `window.storage` → renderer sin cambios; auth + boot replicando el flujo de
  `ARCHITECTURE.md`.
- **Fase 2 — Reemplazo de bridges restantes + compatibilidad de datos.** ✅
  completada. Backup/Profile (POS-BAK1/POS-PRF1), cifrado DB (POS1), notificaciones,
  diagnóstico; scrypt implementado en JS puro (compatible bit a bit con Node)
  → la web lee/escribe los mismos archivos que Electron.
- **Fase 3 — PWA + núcleo completo.** ✅ completada. Service Worker + manifest
  (instalable/offline); los 8 plugins y módulos core operando con datos reales
  (migraciones + hidratación) sobre sql.js.
- **Fase 4 — Endurecimiento.** Migración de esquema, tests, typecheck, lint, docs.

### Fuera de alcance v1
- IA/Ollama (se deja la interfaz en el renderer, desconectada).
- Multi-dispositivo/sync (requeriría backend; queda como frontera futura).

---

## Arranque rápido del spike web

```bash
cd apps/web
npm ci
npm run test      # spike tests (sql.js + webcrypto)
npm run dev       # servidor Vite (copia sql-wasm.wasm a /public automáticamente)
npm run build     # build estático en dist/ (incluye sql-wasm.wasm)
npm run typecheck # tsc --noEmit
```

> Nota: `apps/web` es una app independiente (sin workspaces npm en el monorepo),
> igual que `apps/landing`.

---

## Fase 1 — Renderer desktop corriendo en el navegador ✅

El hito clave de Fase 1: **reutilizar el renderer completo del desktop sin
modificar `apps/desktop`**. Apps/web monta el `<App />` de
`apps/desktop/src/App.tsx` (el export nombrado via alias, junto a `I18nProvider`
y el CSS `@/index.css`), proveyendo en `window.*` los **mismos bridges** que
expone el preload de Electron.

### Cómo se reutiliza el renderer

En `apps/web/vite.config.ts` los alias del desktop se apuntan a `../desktop`:

```
@        → ../desktop/src
@core    → ../desktop/src/core
@plugins → ../desktop/src/plugins
@spike   → ./src/spike
```

Las dependencias de terceros del renderer (react-router, zustand, recharts,
lucide, date-fns, @dnd-kit, react-markdown…) se resuelven del **node_modules
raíz** (Vite sube el árbol), así que `apps/web` no duplica librerías.

### Bridges web implementados (`apps/web/src/bridge/`)

| Módulo | `window.*` | Notas |
|---|---|---|
| `storage.ts` | `window.storage` | DB sql.js por usuario, clave `user:{id}` en IndexedDB; escribe/lee/migra/exporta/importa bytes; `setActiveUser()` ligado al login. |
| `auth.ts` | `window.auth` | WebCrypto PBKDF2; `users`+`sessions` en DB `auth` (IndexedDB); sesión persistida; `register/login/logout/me/recovery` completos. Dispara el switch de DB del usuario vía callback. |
| `db-encryption.ts` | `window.dbEncryption` | Cifrado en reposo **POS1** (scrypt N=32768). `enable` cifra y borra el blob plano → `locked`; `unlock` descifra; `disable` quita `.enc`. |
| `backup.ts` | `window.backup` | Formato **POS-BAK1** (scrypt N=16384). Exporta/importa la DB completa: plano `.db` y cifrado `.posbak`. |
| `profile.ts` | `window.profile` | Formato **POS-PRF1** (scrypt N=16384). Snapshot (perfil+settings+plugins+gamificación) plano `.posprof.json` y cifrado `.posprof`. |
| `misc.ts` | `notifications`, `ollama`, `diagnostic`, `appUpdate`, `scheduledBackup`, `workFocusWindow` | notifications → Notification API; diagnostic → descarga Blob; ollama/appUpdate/scheduledBackup degradados (deshabilitados en v1); workFocusWindow no-op. Re-exporta los bridges funcionales. |
| `files.ts` | — | Helpers de descarga (`downloadBlob`) y selección de archivo (`pickFile`). |
| `bootstrap.ts` | — | `initBridges()`: inicia auth, wirea el callback de sesión→storage, restaura la DB del usuario si hay sesión, y monta todo en `window.*`. Debe correr antes de `<App/>`. |

### `main.tsx` web

Inicializa los bridges (con pantalla de arranque/esquema de error) y luego
monta exactamente lo que monta el desktop:

```tsx
<I18nProvider>
  <App />   {/* el App del desktop, sin tocar */}
</I18nProvider>
```

### Verificación

- **3 tests de integración de boot** (`src/bridge/boot.integration.test.ts`):
  registro → login/me → lectura de sesión → escritura/lectura aislada por
  usuario. En verde con el backend de memoria.
- **41/41 tests** en verde (`web:test`), `web:typecheck` limpio, `web:build` OK
  (sirve `sql-wasm.wasm` en `dist/`).
- **Smoke E2E en Chromium real** (`scripts/smoke-runner.mjs`): la pantalla de
  login de Nora se renderiza, `window.auth`/`window.storage`/`window.dbEncryption`
  quedan definidos, y un registro + `INSERT`/`SELECT` + `me()` completo corre
  sobre IndexedDB real. **0 errores de consola / 0 page errors.**

### Hallazgos de Fase 1

- **`vite preview` / build** ignoran la rama Node de `sqlite-web.ts`
  (`fs`/`path` vienen `import()`-eados solo en tests), así que el wasm se sirve
  por `public/`. Sin efectos en el navegador.
- **Bug de scope corregido:** `execute`/`query` deben operar SIEMPRE sobre el
  usuario ya seleccionado, no resetear a `default`; de lo contrario todos los
  datos van a la DB `default` y se pierde el aislamiento por usuario.
- **`Optional chaining` en fallback de storage:** `getSessionStorage` debe
  funcionar también fuera del navegador (tests) sin lanzar por `window`.

---

## Fase 2 — Compatibilidad de datos con Electron + bridges funcionales ✅

El bloqueo de compatibilidad era que Electron cifra con **scrypt** (WebCrypto
solo expone PBKDF2/HKDF) y usa tres formatos de archivo que la web debía poder
leer/escribir para migrar datos. Se resolvió implementando scrypt en JS puro y
reproduciendo byte-a-byte los formatos de Electron.

### scrypt en JS puro (`src/spike/scrypt-web.ts`)

RFC 7914 completo (PBKDF2-HMAC-SHA256 vía WebCrypto + Salsa20/8 ROMix propio),
compatible bit a bit con `crypto.scryptSync` de Node. Verificado en tests
contra Node para los parámetros exactos que usa Electron:

- **N=16384, r=8, p=1** (backup/perfil)
- **N=32768, r=8, p=1** (cifrado en reposo de la DB)
- Además del vector de test oficial del RFC 7914.

### Formatos de cifrado (`src/spike/crypto-electron.ts`)

AES-256-GCM + scrypt, reproduciendo la disposición exacta de Electron:

| Formato | Magic | N   | Layout |
|---|---|---|---|
| `POS1` (.db.enc) | `POS1` | 32768 | MAGIC(4) VERSION(1) SALT IV TAG CT |
| `POS-BAK1` (.posbak) | `POS-BAK1` | 16384 | MAGIC(8) SALT IV TAG CT |
| `POS-PRF1` (.posprof) | `POS-PRF1` | 16384 | MAGIC(8) SALT IV TAG CT |

Tests de interop (`crypto-electron.test.ts`) confirman round-trip bidireccional
con Node crypto: la web **descifra** archivos exportados por Electron (backup,
perfil y DB cifrada) y Electron **podría descifrar** lo que cifra la web.

### Bridges funcionales (`apps/web/src/bridge/`)

- **`db-encryption.ts`** — cifrado en reposo de la DB del usuario (POS1). `enable`
  cifra el blob plano y lo reemplaza por el `.enc` (bloqueo); `unlock(pass)`
  descifra; `disable` quita el `.enc`. `status()` refleja `locked`/`hasEncryptedAtRest`
  de forma persistente (sobrevive a recargas).
- **`backup.ts`** — exporta/importa la DB completa en formato POS-BAK1 (plano
  `.db` y cifrado `.posbak`) vía descarga/selector de archivo.
- **`profile.ts`** — exporta/importa el perfil (snapshot POS-PRF1: profile,
  settings permitidos, plugins activos, gamificación), igual que el desktop.
- **`storage.ts`** — expone `exportBytes()`/`importBytes()`/`getDbKey()` para
  alimentar backup y dbEncryption.
- **`files.ts`** — helpers de descarga y selección de archivo.

### Verificación de Fase 2

- **6 tests de interop** con Node crypto + **5 tests de integración** de los
  bridges (cifrado en reposo end-to-end con datos intactos, export/import de
  DB, snapshot de perfil). **41/41 tests** en verde.
- **Smoke E2E en Chromium** con IndexedDB real: ciclo completo `enable` →
  `locked` → `unlock` (con passphrase incorrecta → `BAD_PASSPHRASE`) → `disable`,
  y los datos sobreviven intactos. **0 errores de consola / 0 page errors.**

### Pendiente Fase 2→3

- Migrar la **auth DB** existente (`auth.db` de Electron, hashes scrypt) a la
  web: el flujo de "entrar usando la sesión/migración" queda como mejora (la
  web arranca con cuentas nuevas).

---

## Fase 3 — PWA + núcleo completo ✅

Cierra el alcance núcleo: la web es ahora una **PWA instalable y offline**, y se
verificó que los **8 plugins** (finance, fitness, goals, habits, journal,
knowledge, time, work) operan con **datos reales** sobre el backend sql.js.

### PWA instalable/offline

Se sirve bajo la subruta `/nora-os/web/` (Vite `base`), por eso todos los paths
del manifest y del Service Worker son **relativos/conscientes del scope**:

- **`public/manifest.webmanifest`** — name/description, `display: standalone`,
  `id`/`start_url`/`scope`/iconos con paths relativos (`./`) para resolver
  correctamente bajo la subruta, theme/background `#0b0b12`, iconos `any`
  (192/512) y `maskable` 512.
- **Iconos** (`public/icons/`) — generados desde `brand/nora-isotipo-original.png`
  (Pillow): `icon-192`, `icon-512`, `icon-maskable-512`, `apple-touch-icon`.
- **`public/sw.js`** — Service Worker **scope-aware** (deriva todo de
  `self.registration.scope`, sin URLs hardcodeadas):
  - `install`: precache de la shell (scope, `index.html`, `sql-wasm.wasm`,
    manifest, iconos).
  - `navigate`: red-first con fallback a la shell cacheada (offline).
  - `.wasm`: cache-first (inmutable).
  - resto same-origin GET: stale-while-revalidate. Cache versionado (`v1`),
    limpieza en `activate`.
- **`index.html`** — `<link rel=manifest>` y `apple-touch-icon` relativos
  (`./…`), metadatos `apple-mobile-web-app-*`/`mobile-web-app-capable`,
  `theme-color`, `viewport-fit=cover`.
- **`main.tsx`** — `registerServiceWorker('./sw.js')` solo en producción (tras `load`).

### Núcleo completo operando con datos reales

Todo el boot del renderer desktop corre sin cambios: al habilitar cada plugin
(Onboarding/ControlCenter) `PluginManager.initPlugin` ejecuta sus migraciones y
hidrata su store. La investigación confirmó que ni el core ni los plugins usan
Electron: todo va por `window.*` (bridges web ya montados) y las DB se crean
lazy por usuario. Riesgo principal (el puente `migrate` web vs las migraciones
de cada plugin) se cubrió con tests.

**Para poder testearlo en Node** se añadieron los alias `@core`/`@plugins`/`@`
al `vitest.config.ts` (igual que `vite.config.ts`).

### Endurecimiento de UI (degradación honesta en navegador)

Como el renderer es compartido 1:1 con el desktop, los componentes en que el bridge
web es un stub quedaban **deceptivos** (éxito falso) o **mudos**. Se introdujo una
marca de plataforma `window.__NORA_WEB__` (definida por `bootstrap.ts`) para que los
componentes compartidos degraden con honestidad cuando corren en la web:

- **OllamaSection** — al estar en web muestra "La IA local no está disponible en la
  versión web" y deshabilita el toggle (paridad de interfaz, sin IA). Además
  `ollamaService.pullModel` ahora lanza si el bridge responde `ok:false`, con lo que
  desaparece el falso "Modelo listo y seleccionado".
- **ScheduledBackupSection** — en web muestra el estado "no disponible" con referencia
  a exportar manualmente (el backup automático a carpeta local no aplica en navegador),
  en lugar de simular guardar/activar.
- **WorkDashboard "timer flotante"** — en web se usa el popup del navegador
  (`window.open` → `/work/focus-mini`, fallback que ya existía en el renderer) en vez
  de la ventana OS; el botón ahora sí abre el timer en una ventana separada.
- **diagnostic export** — el bridge web devuelve `{ ok: true, path }` (con bloque de
  entorno/UA), corrigiendo el falso "error al exportar" del GlobalErrorBoundary.

AppUpdate ya degradaba limpio ("Auto-update deshabilitado") y notifications usa la
Notification API como fallback legítimo. Tests nuevos de esta fase: `ollamaService.test.ts`,
`OllamaSection.web.test.tsx`, `ScheduledBackupSection.web.test.tsx`. El desktop no se
toca en comportamiento cuando `__NORA_WEB__` está ausente.

### Verificación de Fase 3

- **Nuevos tests de plugins** (`src/bridge/plugins.integration.test.ts`, 5):
  los 8 manifiestos se registran, `initPlugin` deja cada uno `active` sin error,
  las migraciones quedan en `_migrations`, las tablas representativas de cada
  plugin existen y son consultables, y pages/widgets/nav quedan registrados.
  **41/41 tests** en verde.
- **Smoke E2E en Chromium real** — además de auth/storage/dbEncryption,
  valida PWA: el manifest se sirve (name/start_url/display/iconos correctos) y
  el **Service Worker queda `activated`**. **0 errores de consola / 0 page
  errors.**

### Pendiente Fase 3→4

- Migración de la **auth DB** de Electron (hashes scrypt) → mejorar onboarding
  para usuarios existentes (queda como mejora; la web arranca con cuentas
  nuevas).

### Publicación (deploy)

La web se publica junto con la landing en GitHub Pages, como parte de
`.github/workflows/landing.yml` (un solo deploy para ambos):

- **URL:** `https://na7hk3r.github.io/nora-os/web/`
- **Base de Vite:** `/nora-os/web/` (assets con paths absolutos de subruta).
- **Estructura del artifact Pages:** la landing en la raíz, la web en `./web`.
- **Disparadores:** push a `main` que toque `apps/landing/**`, `apps/web/**`,
  `apps/desktop/src/**` (el renderer compartido) o el propio workflow; también
  `workflow_dispatch`.

Por el scope del Service Worker, la web solo puede controlar su propia subruta
(`/nora-os/web/`), algo que el scheme `self.registration.scope` ya respeta:
no interfiere con la landing.

### Web vs. desktop (tabla de capacidades)

| Capacidad | Web (PWA) | Desktop (Electron) |
|---|---|---|
| Núcleo + 8 plugins | ✅ mismo renderer sobre sql.js | ✅ nativo (better-sqlite3) |
| Datos | IndexedDB por usuario | SQLite en disco |
| Backup / perfil | ✅ export/import (POS-BAK1 / POS-PRF1) | ✅ export/import + automático a carpeta |
| Cifrado en reposo | ✅ POS1 / AES-GCM | ✅ POS1 / AES-GCM |
| Notificaciones | Notification API del navegador | ✅ nativas del SO |
| Actualización | PWA (la publica el deploy) | auto-update vía GitHub Releases |
| IA con Ollama | ⛔ no disponible (UI degradada) | ✅ opt-in |
| Backup programado | ⛔ no disponible (export manual) | ✅ diario/semanal/mensual |
| Auto-update (desktop) | — | ✅ |
| Offline / instalable | ✅ PWA | — |

### Comandos

```bash
cd apps/web
npm run dev          # dev server
npm test             # 41 tests (spike + boot + fase 2 + plugins)
npm run typecheck
npm run lint
npm run build
CHROME_PATH=... node scripts/smoke-runner.mjs   # smoke E2E (requiere build + chromium; navega a la base /nora-os/web/)
```
