# Releases — Nora OS

Como cortar un release publico de Nora OS y publicar binarios firmables
en GitHub Releases con auto-update via `electron-updater`.

## TL;DR

```bash
# 1. Validar local
npm run lint && npm run typecheck && npm test
npm run landing:typecheck && npm run landing:test && npm run landing:build
npm run web:typecheck && npm run web:test && npm run web:build
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
#    - Compila el APK/AAB Android (firmado con el keystore real via secrets)
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
   npm run web:typecheck
   npm run web:test
   npm run web:build
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

Los jobs `build-windows` y `build-linux` corren en cada tag `vX.Y.Z`:

1. `npm ci` (con rebuild de `better-sqlite3`).
2. Linux instala `libcrypt1`, requerida por `fpm` para generar `.deb`.
3. `npm run lint && npm run typecheck && npm test`.
4. Windows ejecuta `npm run release` y sube `Nora OS-<version>-win-x64.exe` (NSIS),
   `Nora OS-<version>-portable.exe` y `latest.yml` al GitHub Release.
5. Linux ejecuta `npm run release:linux` y sube `Nora OS-<version>-linux-x86_64.AppImage`,
   `Nora OS-<version>-linux-amd64.deb` y `latest-linux.yml` al mismo GitHub Release.
6. `build-mobile` compila el `app-release.apk` y `app-release.aab` (Android),
   y los sube al mismo GitHub Release (ver "Release mobile (Android)"). Sin
   `ANDROID_KEYSTORE_BASE64` el APK/AAB se firma con claves debug (válido para
   pruebas internas; no publicable a la Play Store).
7. La app instalada en clientes detecta el nuevo feed de update en el proximo
   check (boot + cada 6h) y muestra el banner de update.

El job `build-mac` sigue apagado con `if: false`. Activarlo quitando ese flag
cuando se quiera publicar ese target.

El workflow de CI general corre tambien landing y mobile antes de mergear:

- Landing: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`.
- Web: `npm ci` en `apps/web`, `npm run typecheck`, `npm run lint`, `npm test`,
  `npm run build`.
- Mobile: Flutter `3.44.0`, `flutter pub get`, `flutter analyze`,
  `flutter test`.

> La **versión web** no depende de los tags: se publica en GitHub Pages en cada
> push a `main` que toque `apps/landing`, `apps/web`, `apps/desktop/src` o
> `.github/workflows/landing.yml` (ver `docs/LANDING.md`). Un release corta
> binarios desktop; la web se actualiza sola.

## Code signing

> **Estado actual**: sin firma. Los binarios se publican sin certificar, por lo
> que Windows SmartScreen muestra "Editor desconocido" (y macOS Gatekeeper lo
> bloquearía, aunque macOS no se publica hoy). La infraestructura de firma ya
> esta preparada: `electron-builder` firma automaticamente cuando detecta las
> variables `CSC_LINK`/`CSC_KEY_PASSWORD` en el entorno. Ver el anexo al final
> (Activacion de firma) para el checklist exacto.

### Windows (Authenticode)

1. Conseguir un cert `.pfx` (DigiCert, Sectigo, etc.) o uno EV en HSM.
2. En el repo de GitHub, agregar:
   - `WIN_CSC_LINK` -> contenido base64 del `.pfx` (o URL HTTPS).
   - `WIN_CSC_KEY_PASSWORD` -> password del cert.
3. Descomentar las lineas `CSC_LINK` y `CSC_KEY_PASSWORD` en
   `.github/workflows/release.yml`.

Sin firma, Windows SmartScreen muestra "Editor desconocido" la primera vez.

### macOS (Developer ID + notarizacion)

1. Cert Developer ID Application desde Apple Developer ($99/año).
2. Secrets:
   - `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`
   - `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`
3. Descomentar el bloque correspondiente en `release.yml` y quitar `if: false`
   del job `build-mac`.

## Release mobile (Android APK/AAB)

En cada tag `vX.Y.Z` el job `build-mobile` de `release.yml` compila y sube al
mismo GitHub Release los artefactos Android:

- `app-release.apk` — instalable directo (sideload, testing, distribución).
- `app-release.aab` — App Bundle para Google Play Console.

Así se genera / actualiza la **huella SHA-1** que Play Console pide for
Google Sign-In y Firebase, y se mantiene la versión sincronizada con el release.

### Keystore real (paso a paso)

La app se firma con un keystore Android. **Nunca se versiona el keystore ni sus
passwords** (`android/key.properties`, `**/*.keystore`, `**/*.jks` están en
`apps/mobile/android/.gitignore`).

1. Generá el keystore localmente (una sola vez; guardá copias de seguridad):

   ```bash
   keytool -genkey -v -keystore <ruta>/release-keystore.jks \
     -alias nora_release -keyalg RSA -keysize 2048 -validity 10000
   ```

   Anotá las passwords y el alias (`nora_release` o el que uses).

2. Agregá los secrets en GitHub → Settings → Secrets and variables → Actions:

   - `ANDROID_KEYSTORE_BASE64` → `base64 -w0 <ruta>/release-keystore.jks`
   - `ANDROID_KEYSTORE_PASSWORD` → password del keystore.
   - `ANDROID_KEY_ALIAS` → alias (`nora_release`).
   - `ANDROID_KEY_PASSWORD` → password de la key.

3. El job `build-mobile` decodifica `ANDROID_KEYSTORE_BASE64` a
   `android/release-keystore.jks` y escribe `android/key.properties` desde esos
   secrets; `build.gradle.kts` firma `release` con ese keystore.

4. Subí un tag `vX.Y.Z` y verificá el artefacto en el GitHub Release
   (`app-release.apk` firmado → `jarsigner -verify -certs app-release.apk`
   muestra `CN=...` con tu cert, no `CN=Android Debug`).

> Sin los secrets, el release Android igual se compila pero **firmado con las
> claves debug**: sirve para bakeos internos, no para subir a la Play Store
> (Play rechaza la firma debug). Generá y guardá el keystore antes de publicar
> oficialmente; Google exige conservar la misma firma entre actualizaciones.

### Versión de la app Android

`apps/mobile/pubspec.yaml` lleva su propia `version: X.Y.Z+code` (hoy `0.1.0+1`).
Al cortar un release, sincronizá el `X.Y.Z` con la raíz (p.ej. `1.18.1+11801`).
La web PWA y el desktop no dependen de esto: cada superficie versiona por
separado, pero conviene alinearlas para trazabilidad.



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

---

## Anexo: activacion de firma (checklist)

La infraestructura quedo **lista para activar** sin cambios de codigo. Este
checklist documenta exactamente que tocar cuando tengas los certificados. Todo
se hace por secrets de GitHub + descomentar dos bloques; no se paga nada ni se
modifica codigo de la app.

### 1. Windows (cert `.pfx`, tipo OV ~$100-300/año, o EV con HSM)

1. Agrega en GitHub → Settings → Secrets and variables → Actions:
   - `WIN_CSC_LINK`: contenido **base64** del `.pfx`
     (`base64 -w0 cert.pfx`), o una URL HTTPS de descarga de Microsoft.
   - `WIN_CSC_KEY_PASSWORD`: password del cert.
2. En `.github/workflows/release.yml`, job `build-windows`, descomenta las dos
   lineas:
   ```yaml
   CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
   CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
   ```
3. Sube un tag `vX.Y.Z` nuevo y verifica en los artifact del job que el
   instalador quede firmado (electron-builder lo reporta al empaquetar) y que
   `SmartScreen` ya no marque "Editor desconocido".

> Mantener el cert fuera del repo: los secrets nunca se versionan.

### 2. macOS (Developer ID + notarizacion, $99/año)

1. Agrega los secrets: `MAC_CSC_LINK` (`.p12` en base64),
   `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`.
2. En `release.yml`, job `build-mac`:
   - Descomenta las cuatro lineas de secrets (bloque `env`).
   - Quita la linea `if: ${{ false }}` para habilitar el job.
3. Notarizacion: electron-builder la ejecuta automaticamente cuando detecta
   `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` (requiere `hardenedRuntime: true`,
   ya seteado en `electron-builder.yml`).
4. Verifica que el `.dmg` firmado pase Gatekeeper y que la landing ya muestre
   el link de descarga macOS (el clasificador `useLatestRelease` ya reconoce el
   asset `macDmg`).

### 3. Verificacion de que el build quedo firmado

- Windows: `signtool verify /pa "release/Nora OS-<version>-win-x64.exe"` o revisa
  el log del job: electron-builder muestra "signing" de cada artefacto.
- macOS: `codesign -dv --verbose=4 "app"` muestra `Signature=adhoc` solo si NO
  firmo (fallo); con firma real aparece el Developer ID. `spctl -a` para gatekeeper.
- La presencia de `update.exe` firmado elimina el aviso "update.exe is not
  signed" del troubleshooting.

### Recordatorio de costo/privacidad

- La firma **no es gratis**: certificado OV/EV anualmente + (si se publica
  macOS) la cuenta de desarrollador Apple. El resto del pipeline se mantiene en
  el free tier de GitHub.
- Los secrets solo existen en el entorno de Actions; localmente se puede firmar
  exportando estas variables en el shell.
