# Nora Landing

Public Vite/React landing page for Nora OS.

Use the root scripts for production validation:

```powershell
npm run landing:typecheck
npm run landing:test
npm run landing:build
```

Local development from this folder:

```powershell
npm ci
npm run dev
```

GitHub Pages deploys `apps/landing/dist` through
`.github/workflows/landing.yml`. The `dist/` output is ignored.
