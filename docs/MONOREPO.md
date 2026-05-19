# Nora OS Monorepo

## Objetivo

Nora OS queda organizado como un ecosistema multiplataforma:

- `apps/desktop`: Electron app actual. Sus comandos historicos siguen expuestos desde la raiz.
- `apps/landing`: sitio publico y marketing.
- `apps/mobile`: app Flutter.
- `apps/docs`: workspace reservado para documentacion futura.
- `packages/*`: paquetes compartidos sin logica de negocio de app.
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
- `npm run mobile:analyze`, `npm run mobile:test`.
- `npm run pack`, `npm run dist:win`, `npm run release`.

No hay workspace pnpm/Turborepo activo en produccion. Si se reintroduce, debe
venir con lockfile, scripts y workflows propios en el mismo cambio.

## Reglas

- Las apps deben ser independientes entre si.
- La logica compartida vive en `packages/` solo cuando ya tiene mas de un consumidor claro.
- `packages/ui` contiene tokens y fundamentos visuales, no negocio.
- `packages/shared-types` contiene contratos serializados, no estado de UI.
- `packages/api-client` sera la frontera HTTP/auth/error handling para sync o APIs futuras.
- `buildResources/`, `electron-builder.yml` y los scripts root de release se mantienen en raiz para no romper el pipeline desktop.
- Los artefactos generados (`out/`, `release/`, `dist/`, builds Flutter,
  caches y coverage) no se versionan.

## CI/CD

La matriz de produccion vive en `.github/workflows/ci.yml`:

- Desktop: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`.
- Landing: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`.
- Mobile: Flutter `3.44.0`, `flutter pub get`, `flutter analyze`,
  `flutter test`.
- Pack smoke: Windows, `npm ci`, `npm run pack`.

Deploy de landing: `.github/workflows/landing.yml`.
Release de binarios Windows: `.github/workflows/release.yml`.

## Migracion Segura

1. Mantener comandos root compatibles: `npm run dev`, `npm run build`, `npm run pack`, `npm run release`.
2. Migrar imports compartibles desde `apps/desktop/src` hacia `packages/*` de forma incremental.
3. Conectar Flutter a contratos equivalentes en `packages/shared-types` mediante generacion o documentacion de schemas.
4. Solo despues de validar CI/CD, evaluar mover `buildResources` a infraestructura o a `apps/desktop`.
