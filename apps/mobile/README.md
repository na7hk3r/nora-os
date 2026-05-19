# Nora OS Mobile

Flutter mobile client for Nora OS, built as a native mobile-first app inside the Nora monorepo.

## Current Scope

- Local offline auth
- Persistent bottom navigation
- Dashboard
- Planner timeline
- Mobile task list
- Notifications center
- Profile/settings
- Reusable Nora OS mobile design system

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

The MVP stores local data on-device through SQLite and keeps the session token in secure storage.

Generated Flutter state is intentionally ignored: `.dart_tool/`, build outputs,
plugin registrants, local properties, IDE files and coverage should not be
committed.
