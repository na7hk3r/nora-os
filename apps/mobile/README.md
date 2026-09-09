# Nora OS Mobile

Flutter mobile client for Nora OS, built as a native mobile-first app inside the Nora monorepo.

> **Estado: early access (Android).** El núcleo local (auth, dashboard,
> planner, tareas, notificaciones) y los plugins **Habits** y **Journal** están
> completos. Los 6 plugins restantes del desktop no están portados por decisión
> de producto (el móvil prioriza captura rápida; el port es a demanda según uso
> real). Roadmap y decisiones: [`docs/roadmap/README.md`](../../docs/roadmap/README.md).

## Alcance actual

| Área | Estado |
| --- | --- |
| Núcleo (auth offline, shell, dashboard, planner, tareas, notificaciones, perfil) | Listo |
| Plugins: Habits y Journal | Listos (ports completos, eventos/XP/métricas espejo del desktop) |
| Plugins: Work, Finance, Fitness, Goals, Knowledge, Tiempo | No portados — decisión de producto, port a demanda |
| iOS | No iniciado — Android primero |

## Scope del núcleo (portado)

- Local offline auth
- Persistent bottom navigation
- Dashboard
- Planner timeline
- Mobile task list
- Notifications center
- Profile/settings
- Reusable Nora OS mobile design system
- Plugins integrados: Habits y Journal (ports completos, ver arriba).

## Setup

Requires Flutter `3.44.0` on the stable channel.

```powershell
cd apps/mobile
flutter pub get
flutter analyze
flutter test
flutter run
```

From the repository root, production checks are also exposed as:

```powershell
npm run mobile:analyze
npm run mobile:test
```

## Build

For the Android release APK from the repository root:

```powershell
npm run mobile:build:apk
```

The APK is generated at:

```text
apps/mobile/build/app/outputs/flutter-apk/app-release.apk
```

For a Google Play/App Bundle release:

```powershell
npm run mobile:build:appbundle
```

The AAB is generated at:

```text
apps/mobile/build/app/outputs/bundle/release/app-release.aab
```

Equivalent direct Flutter commands from `apps/mobile` are `flutter build apk --release`
and `flutter build appbundle --release`.

Release signing: el job `build-mobile` de CI (tag `vX.Y.Z`) compila el APK/AAB
y los sube al GitHub Release. Si los secrets `ANDROID_KEYSTORE_BASE64` (+
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`) están
presentes, firma con el keystore real; si no, cae a las claves debug (válido
para pruebas internas, no para la Play Store). Para un keystore local, creá
`android/key.properties` con `storeFile`, `storePassword`, `keyAlias` y
`keyPassword` (gitignored). Flujo completo en `docs/RELEASES.md` → "Release
mobile (Android APK/AAB)".

The MVP stores local data on-device through SQLite and keeps the session token in secure storage.

Generated Flutter state is intentionally ignored: `.dart_tool/`, build outputs,
plugin registrants, local properties, IDE files and coverage should not be
committed.
