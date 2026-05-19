# Nora Desktop

Electron desktop app for Nora OS.

Root npm scripts are the production interface for this app:

```powershell
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run pack
```

Source lives in `apps/desktop/src`; Electron main/preload code lives in
`apps/desktop/electron`. Production output is written to ignored root folders
such as `out/` and `release/`.
