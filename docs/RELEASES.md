# Releases — Nora OS

Como cortar un release publico de Nora OS y publicar binarios firmables
en GitHub Releases con auto-update via `electron-updater`.

## TL;DR

```bash
# 1. Validar local
npm run lint && npm run typecheck && npm test
npm run landing:typecheck && npm run landing:test && npm run landing:build
npm run mobile:analyze && npm run mobile:test
npm run pack

# 2. Bump de version + tag
npm version patch --no-git-tag-version          # o minor / major
(cd apps/landing && npm version patch --no-git-tag-version)
git commit -am "chore(release): prepare vX.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin main vX.Y.Z

# 3. CI hace el resto:
#    - Empaqueta NSIS + portable
#    - Sube .exe + latest.yml al GitHub Release
#    - Las apps instaladas detectan el update via latest.yml
```

## Requisitos

- Node 20+, npm 9+ (ver `.nvmrc`).
- Flutter 3.44.0 si vas a validar o publicar cambios de `apps/mobile`.
- En Windows: VS Build Tools si vas a empaquetar local (better-sqlite3).
- Repo configurado con `publish.provider: github` apuntando a `na7hk3r/nora-os`
  (ver [`electron-builder.yml`](../electron-builder.yml)).

## Scripts npm

| Script           | Que hace                                                              |
| ---------------- | --------------------------------------------------------------------- |
| `npm run pack`   | Build + empaqueta a `release/<platform>-unpacked/` sin instalador.    |
| `npm run dist`   | Build + genera instalador local (NSIS para tu plataforma).            |
| `npm run dist:win` | Forza target Windows (NSIS + portable).                             |
| `npm run release`  | Build + publica al GitHub Release del tag actual (`--publish always`). |

`release` requiere `GH_TOKEN` con permiso `contents:write` (en CI lo provee
`secrets.GITHUB_TOKEN`).

## Flujo completo

### 1. Preparar el release

1. Mergeá todo a `main`.
2. Actualizá `CHANGELOG.md` con la version nueva.
3. Si la landing acompaña el release, sincronizá tambien `apps/landing/package.json`
   y `apps/landing/package-lock.json`.
4. Validá local:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run landing:typecheck
   npm run landing:test
   npm run landing:build
   npm run mobile:analyze
   npm run mobile:test
   npm run pack   # smoke test del empaquetado
   ```

### 2. Bump + tag

```bash
npm version patch --no-git-tag-version          # 1.8.0 -> 1.8.1
# o:
npm version minor --no-git-tag-version          # 1.8.0 -> 1.9.0
npm version major --no-git-tag-version          # 1.8.0 -> 2.0.0

cd apps/landing
npm version 1.8.1 --no-git-tag-version          # usar la misma version
cd ../..

git add package.json package-lock.json apps/landing/package.json apps/landing/package-lock.json CHANGELOG.md
git commit -m "chore(release): prepare v1.8.1"
git tag -a v1.8.1 -m "v1.8.1"
git push origin main v1.8.1
```

El push del tag `vX.Y.Z` dispara el workflow
[`release.yml`](../.github/workflows/release.yml). Usamos
`--no-git-tag-version` para poder agrupar docs, landing y versionado en el
commit de release antes de crear el tag anotado manualmente.

### 3. CI publica

El job `build-windows` corre en `windows-latest`:

1. `npm ci` (con rebuild de `better-sqlite3`).
2. `npm run lint && npm run typecheck && npm test`.
3. `npm run release` -> sube `Nora OS-<version>-win-x64.exe` (NSIS),
   `Nora OS-<version>-portable.exe` y `latest.yml` al GitHub Release.
4. La app instalada en clientes detecta el nuevo `latest.yml` en el proximo
   check (boot + cada 6h) y muestra el banner de update.

Los jobs `build-linux` y `build-mac` estan apagados con `if: false`. Activarlos
quitando ese flag cuando se quiera publicar esos targets.

El workflow de CI general corre tambien landing y mobile antes de mergear:

- Landing: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`.
- Mobile: Flutter `3.44.0`, `flutter pub get`, `flutter analyze`,
  `flutter test`.

## Code signing

### Windows (Authenticode)

1. Conseguir un cert `.pfx` (DigiCert, Sectigo, etc.) o uno EV en HSM.
2. En el repo de GitHub, agregar:
   - `WIN_CSC_LINK` -> contenido base64 del `.pfx` (o URL HTTPS).
   - `WIN_CSC_KEY_PASSWORD` -> password del cert.
3. Descomentar las lineas `CSC_LINK` y `CSC_KEY_PASSWORD` en
   `.github/workflows/release.yml`.

Sin firma, Windows SmartScreen muestra "Editor desconocido" la primera vez.

### macOS (Developer ID + notarizacion)

1. Cert Developer ID Application desde Apple Developer.
2. Secrets:
   - `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`
   - `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`
3. Descomentar el bloque correspondiente en `release.yml` y quitar `if: false`
   del job `build-mac`.

## Auto-update en runtime

- Configurado por `electron-updater` (ver `apps/desktop/electron/services/app-update-ipc.ts`
  y `apps/desktop/electron/updater.ts`).
- En **dev** (`!app.isPackaged`) el scheduler esta deshabilitado.
- En **prod** dispara un primer check 10s despues del boot y luego cada 6h.
- El usuario puede chequear / instalar manualmente desde Control Center
  (seccion "Auto-update") o desde el banner que aparece cuando hay update.

El feed se sirve desde el GitHub Release; `latest.yml` es el manifest que
electron-updater consulta. **No hay que hostear nada extra.**

Si el check falla por DNS, red o feed roto, la app debe ocultar el error
tecnico y mostrar una salida manual: descargar la ultima version desde
`https://na7hk3r.github.io/nora-os/#download`.

## Compatibilidad del feed

- No borrar tags, Releases publicados, `latest.yml` ni assets `.blockmap` de
  versiones ya publicadas.
- Si cambia el repo, dominio, provider o layout del feed, publicar primero una
  version puente que sepa leer el destino nuevo.
- Una version ya instalada con el updater roto no puede corregirse remotamente;
  esos usuarios deben bajar manualmente la ultima version desde el sitio
  oficial.

## Troubleshooting

| Sintoma                                       | Causa probable                            | Fix                                                                                       |
| --------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `Cannot find module 'electron-updater'`       | Falto `npm ci` post-update de deps        | `npm ci`                                                                                  |
| `update.exe is not signed`                    | Build sin code signing                    | Configurar `CSC_LINK` o documentar al usuario que ignore SmartScreen                      |
| El banner no aparece nunca                    | Estas en dev (`!app.isPackaged`)          | Probar con la app instalada (`npm run dist` -> instalar el .exe)                          |
| `404` al chequear updates                     | El Release no tiene `latest.yml`          | Revisar el job `build-windows` en GitHub Actions; reintentar con `workflow_dispatch`      |
| `net::ERR_NAME_NOT_RESOLVED` o `ENOTFOUND`    | DNS/red/feed no disponible                | La UI debe mostrar el fallback manual al sitio oficial; revisar que el feed siga estable  |
| Better-sqlite3 ABI mismatch al iniciar la app | Rebuild contra Node, no contra Electron   | Borrar `node_modules` y `npm ci` (postinstall corre `electron-rebuild`)                   |
| Tag pusheado pero CI no corre                 | Tag no matchea `v*.*.*`                   | Los tags deben ser `vX.Y.Z` (ej `v1.8.1`)                                                 |

## Rollback

GitHub Releases no tiene "delete + republish" automatico. Para retirar una
version mala:

1. Marcar el Release como **draft** o **pre-release** (no aparece en `latest`).
2. Crear un release nuevo con la version siguiente con el fix.
3. Las apps instaladas auto-actualizan al fix en el proximo check.

**Nunca** borres el tag git de un release publicado: rompe los apps que ya lo
descargaron y queres reproducir el bug.
