# Nora OS Monorepo

## Objetivo

Nora OS queda organizado como un ecosistema multiplataforma:

- `apps/desktop`: Electron app actual. Sus comandos historicos siguen expuestos desde la raiz.
- `apps/landing`: sitio publico y marketing.
- `apps/web`: PWA local-first con el mismo renderer que desktop (ver `docs/WEB_PORT.md`).
- `apps/mobile`: app Flutter.
- `apps/docs`: workspace reservado para documentacion futura.
- `infrastructure/*`: scripts y carpetas de infraestructura.
- `tooling/*`: generadores, automatizacion y herramientas internas.
- `docs/architecture`, `docs/branding`, `docs/roadmap`, `docs/technical`:
  categorias destino para migrar la documentacion plana actual.

## Gestor y comandos

NPM es la ruta estable para produccion. Los comandos root siguen siendo la
interfaz canonica para CI/CD y release:

- `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`,
  `npm test`.
- `npm run landing:typecheck`, `npm run landing:test`, `npm run landing:build`.
- `npm run web:typecheck`, `npm run web:test`, `npm run web:build`.
- `npm run mobile:analyze`, `npm run mobile:test`.
- `npm run pack`, `npm run dist:win`, `npm run release`.

No hay workspace pnpm/Turborepo activo en produccion. Si se reintroduce, debe
venir con lockfile, scripts y workflows propios en el mismo cambio.

## Reglas

- Las apps deben ser independientes entre si.
- No hay paquete npm compartido: cada superficie es autocontenida y duplica
  los helpers/tokens que necesite (coherente con la regla "sin workspaces").
- Los recursos de identidad (brand-kit) viven en `buildResources/brand-kit/`,
  junto al empaquetado, y los consumen el build de electron-builder y
  `infrastructure/scripts/build-icon.ps1`.
- `buildResources/`, `electron-builder.yml` y los scripts root de release se mantienen en raiz para no romper el pipeline desktop.
- Los artefactos generados (`out/`, `release/`, `dist/`, builds Flutter,
  caches y coverage) no se versionan.

## CI/CD

La matriz de produccion vive en `.github/workflows/ci.yml`:

- Desktop: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`.
- Landing: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`.
- Web: `npm ci` en `apps/web`, `npm run typecheck`, `npm run lint`, `npm test`,
  `npm run build` (sirve `sql-wasm.wasm` en `dist/`).
- Mobile: Flutter `3.44.0`, `flutter pub get`, `flutter analyze`,
  `flutter test`.
- Pack smoke: Windows, `npm ci`, `npm run pack`.

Deploy de landing + web: `.github/workflows/landing.yml` (arma un solo sitio
Pages con la landing y la web en `/web/`, ver `docs/LANDING.md`).
Release de binarios Windows: `.github/workflows/release.yml`.

## Migracion Segura

1. Mantener comandos root compatibles: `npm run dev`, `npm run build`, `npm run pack`, `npm run release`.
2. Si surge logica compartida con dos o mas consumidores reales, evaluar extraerla
   a un paquete npm dedicado (con lockfile, scripts y workflows propios) en un cambio aparte.
3. Los contratos expresados formalmente en Modelo y tipos del sistema se mantienen
   duplicados de forma intencional por superficie (TS/JS en desktop-web-landing,
   Dart en mobile), documentados como contrato logico compartido.
4. Solo despues de validar CI/CD, evaluar mover `buildResources` a infraestructura o a `apps/desktop`.
