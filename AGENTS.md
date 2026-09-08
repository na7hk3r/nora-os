# AGENTS.md

Nora OS — monorepo (Electron desktop + web PWA + landing + Flutter mobile). Docs are in Spanish (`docs/*.md`); commit messages use conventional commits in Spanish (`feat(scope):`, `fix(scope):`, `ci:`, `docs:`). Only `main` branch exists.

## Repo shape (no npm workspaces)

- The **desktop app is the root package**: Electron deps live in root `package.json` + root lockfile, installed in root `node_modules`. `apps/desktop/package.json` just proxies the root scripts.
- `apps/web`, `apps/landing`, `apps/mobile` are **independent packages** with their own `package.json`, `package-lock.json`, and `node_modules`. Install with `npm ci` per-surface (same as CI does). Do not add a root `workspaces` field.
- Each TS surface ships its **own self-contained eslint config** (`.eslintrc.json` in `apps/web` and `apps/landing`; root `.eslintrc.json` for desktop). They must NOT `extends` each other — eslint resolves parser/plugins relative to the config file, and CI installs only per-surface deps (so sharing would break isolated linting). Keep the `rules` block in sync across them. Lint scripts pass `--resolve-plugins-relative-to .`.
- Desktop, web, and landing all run Node 24 (`.nvmrc`).
- `npm ci` triggers `postinstall`: `electron-rebuild -f -w better-sqlite3` (needs native toolchain: VS Build Tools / Xcode CLT / build-essential).

## Verification matrix

| Surface | Command | Notes |
| --- | --- | --- |
| Desktop | `npm run typecheck && npm run lint && npm test` | `lint` only covers `apps/desktop/{src,electron}`. Tests are Vitest (jsdom); `apps/desktop/vitest.config.ts` + `src/test/setup.ts`. Config files (`*.config.ts`) are eslint-ignored. |
| Web | `(cd apps/web && npm run typecheck && npm run lint && npm test && npm run build)` | Root proxies: `web:typecheck`, `web:test`, `web:build`, `web:lint`. |
| Landing | `(cd apps/landing && npm run typecheck && npm run lint && npm test && npm run build)` | Lint added in Fase 2. |
| Smoke pack | `npm run pack` (CI runs on Windows) | `desktop:build` + `electron-builder --dir`. |
| Plugin scaffold | `npm run create-plugin -- <id>` | Generates under `apps/desktop/src/plugins/<id>`. |

Run the full desktop suite for any change; see `ci.yml` — everything gates on push/PR to `main`.

## Desktop ↔ Web share the same renderer

- `apps/web` runs the **desktop renderer unchanged**: it aliases `@`/`@core`/`@plugins` to `../desktop/src` and boots the desktop `<App />`. Changes to `apps/desktop/src/core|plugins` **affect the web PWA** and must also pass `web:typecheck`, `web:test`, `web:build`. Touching `apps/desktop/src/**` triggers a Pages deploy (landing.yml).
- Renderer is Electron-agnostic: it talks only to typed bridges on `window.*` (`storage`, `auth`, `backup`, … declared in `src/core/types.ts`). All Electron/Node code lives in `apps/desktop/electron/**` (main, preload, `services/`).
- Feature that can't work in a browser must degrade honestly when `window.__NORA_WEB__` is set (by `apps/web/src/bridge/bootstrap.ts`) — never break the desktop when the flag is absent. Examples: `OllamaSection.tsx`, `ScheduledBackupSection.tsx`, `Shell.tsx`, `WorkDashboard.tsx`.
- Web crypto/format interop is bit-for-bit compatible with Electron (`POS1`, `POS-BAK1`, `POS-PRF1` scrypt formats) — preserve `apps/web/src/spike/crypto-electron.ts` behavior.

## Platform plumbing quirks

- `__APP_VERSION__` is injected only into the desktop renderer build (electron.vite.config.ts). The `define` is a stringified JSON string; dereference it (`JSON.parse(__APP_VERSION__)`) if you need a string.
- `better-sqlite3` is externalized from the main bundle and asar-unpacked (electron-builder.yml). Never import it from renderer code.
- Unit tests for Electron-side services are placed under `apps/desktop/src/test/` (e.g. `updater.test.ts`) and import from `../../electron/**`; mock `electron` with `vi.mock`. Platform-neutral unit tests live colocated next to source (`*.test.ts(x)`).
- Root `tsconfig.json` includes desktop src + electron (aliases `@`/`@core`/`@plugins`). Each app keeps its own tsconfig. No shared npm package exists (`packages/` was removed — surfaces are self-contained).

## Plugins

- Plugins live in `apps/desktop/src/plugins/<id>/` and follow `docs/PLUGIN_BASE_STRUCTURE.md` strictly: manifest contract, table prefix `<id>_*`, event prefix `<PLUGIN>_*`, store `use<Name>Store`, access core only via `CoreAPI` (never internals). Registrations go through the bootstrap in `apps/desktop/src/App.tsx`.
- Every plugin auto-joins the web PWA (shared renderer) and the AI context (opt-in via `registerAIContextProvider`). Keep schemas serializable.

## Conventions & gotchas

- Copy: i18n ES/EN via `core:i18n:language`; AI prompts in rioplatense Spanish with **no emojis**. Destructive operations need explicit confirm + undo toast.
- Release: bump version in root `package.json`, `apps/desktop/package.json`, and `apps/landing/package.json` (keep all three in sync — currently `1.18.1`; `docs/RELEASES.md` callout only lists `apps/landing`), update `CHANGELOG.md`, push tag `vX.Y.Z`. The tag only triggers Windows + Linux builders in `release.yml` (macOS job disabled via `if: false`); the web PWA deploys independently on every `main` push. No code signing today — SmartScreen warns.
- Read `docs/RELEASES.md`, `docs/PLUGIN_API.md`, `docs/ARCHITECTURE.md`, `docs/WEB_PORT.md`, `docs/MONOREPO.md` before large work.