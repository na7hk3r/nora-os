# CI

Shared CI notes live here.

Workflow definitions remain in `.github/workflows`.

## Production Matrix

- Desktop: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`.
- Landing: `npm ci`, `npm run typecheck`, `npm test`, `npm run build` inside
  `apps/landing`.
- Mobile: Flutter `3.44.0`, `flutter pub get`, `flutter analyze`,
  `flutter test` inside `apps/mobile`.
- Pack smoke: Windows `npm run pack`, which runs the Electron production build
  and `electron-builder --dir` without publishing an installer.

Do not use `--ignore-scripts` for desktop CI or release jobs; native dependencies
must be rebuilt for Electron.
