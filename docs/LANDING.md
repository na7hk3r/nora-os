# Landing Page

Sitio web público de Nora OS, deployado en GitHub Pages:

🌐 **https://na7hk3r.github.io/nora-os/**

Stack: **Vite + React 19 + TypeScript + TailwindCSS**, sin backend.

---

## Estructura

```
landing/
  package.json
  vite.config.ts
  tsconfig.json
  tailwind.config.ts
  postcss.config.js
  index.html
  public/
    favicon.svg
    og-image.svg
    robots.txt
    sitemap.xml
    screenshots/         # PNGs de la app (dashboard, plugins, auditor)
  src/
    main.tsx
    App.tsx
    components/          # Button, Section, DownloadButton, ThemeToggle
    sections/            # Hero, Features, Plugins, Screenshots, Download, FAQ, Footer, FeedbackPage
    data/                # features, plugins, faq (datos estáticos)
    hooks/               # useLatestRelease, useDetectOS, usePageTelemetry
    utils/               # telemetry
    styles/index.css     # tokens y reset
    test/                # vitest specs
```

---

## Desarrollo local

```bash
cd landing
npm install
npm run dev          # http://localhost:5173/nora-os/
```

> El sitio usa `base: '/nora-os/'` para GitHub Pages, por eso la URL local incluye el prefijo.

### Variables de entorno

El landing puede correr sin estas variables, pero algunas funciones quedan en no-op o muestran estado no configurado.

| Variable | Uso | Ejemplo |
| --- | --- | --- |
| `VITE_FEEDBACK_ENDPOINT` | Endpoint HTTP del formulario beta. Se usa desde `#feedback` para enviar opiniones por email. | `https://formsubmit.co/elmathi7@gmail.com` |
| `VITE_GOATCOUNTER_ENDPOINT` | Endpoint de GoatCounter para visitas y eventos de descarga. | `https://noraos.goatcounter.com/count` |

Para desarrollo local, copiá `landing/.env.example` a `landing/.env`.

### Otros scripts

| Script | Qué hace |
| --- | --- |
| `npm run build` | Genera el sitio estático en `landing/dist/`. |
| `npm run preview` | Sirve el build local para verificar. |
| `npm run typecheck` | Corre `tsc --noEmit`. |
| `npm test` | Corre vitest (tests de Hero, DownloadButton, useLatestRelease, detectOS). |

---

## Deploy

El deploy es **automático** vía GitHub Actions. Cualquier push a `main` que toque `landing/**` (o el propio workflow) dispara `.github/workflows/landing.yml`, que:

1. Instala dependencias en `landing/`.
2. Corre `typecheck` + `test`.
3. Construye con `npm run build`, inyectando `VITE_FEEDBACK_ENDPOINT` y `VITE_GOATCOUNTER_ENDPOINT`.
4. Sube `landing/dist/` como artifact de Pages.
5. Despliega en `github-pages`.

El primer deploy requiere habilitar Pages manualmente:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Mergear cualquier cambio a `main` que toque `landing/`.
3. La URL final aparece en la pestaña **Actions** del repo.

También se puede disparar manualmente con **Run workflow** desde la pestaña Actions.

### Configuración requerida en GitHub

- **Settings → Pages → Build and deployment → Source:** `GitHub Actions`.
- **Settings → Secrets and variables → Actions → Repository secrets:**
  - `GOATCOUNTER_ENDPOINT=https://noraos.goatcounter.com/count`

El endpoint de feedback está definido directamente en el workflow porque es temporal:
`https://formsubmit.co/elmathi7@gmail.com`. FormSubmit puede pedir autorización una vez por origen (`localhost` y `na7hk3r.github.io`).

---

## Feedback beta

La ruta `#feedback` muestra un formulario simple para usuarios no técnicos:

```
https://na7hk3r.github.io/nora-os/#feedback
```

- No abre GitHub ni cliente de correo.
- Envía por `POST` a `VITE_FEEDBACK_ENDPOINT` usando un iframe oculto.
- Recibe contexto opcional desde query params enviados por la app desktop (`version`, `route`, `theme`, `activePlugins`, `platform`, `recentEvents`).
- Si el endpoint falta, el formulario muestra un aviso y no envía.

La app desktop abre esta ruta usando `VITE_FEEDBACK_FORM_URL`, configurado en `.github/workflows/release.yml`.

---

## Telemetría

La landing usa GoatCounter de forma liviana y sin SDK externo:

- `usePageTelemetry()` registra visitas de página al cargar y al cambiar hash.
- `DownloadButton` registra eventos de descarga al clickear el CTA.
- Si `VITE_GOATCOUNTER_ENDPOINT` no está configurado, la telemetría queda desactivada sin romper la UI.

Los paths esperados en GoatCounter son:

| Dato | Path/evento |
| --- | --- |
| Visita a landing | `/` |
| Visita a feedback | `/feedback` |
| Descarga Windows | `download-windows-{version}` |
| Descarga Linux | `download-linux-{version}` |
| Descarga macOS | `download-mac-{version}` |

Los datos se ven en:

```
https://noraos.goatcounter.com
```

GoatCounter marca las descargas como eventos (`e=true`); el path del evento funciona como nombre del evento.

---

## Cómo agregar capturas

1. Exportá la captura como PNG (1600×1000 px recomendado, 16:10).
2. Guardala en `landing/public/screenshots/` con nombre estable (`dashboard.png`, `plugins.png`, `auditor.png`).
3. Si querés agregar capturas nuevas (no las tres por defecto), editá `landing/src/sections/Screenshots.tsx` y agregá un objeto al array `shots`.

Si una captura falta, la grilla muestra un placeholder discreto en su lugar (no rompe el build).

---

## Cómo agregar plugins a la landing

Los plugins se listan estáticamente en `landing/src/data/plugins.ts`. Para agregar uno:

```ts
{
  id: 'mi-plugin',
  name: 'Mi Plugin',
  description: 'Una línea.',
  domain: 'productivity',
  domainLabel: 'Productividad',
  icon: Briefcase,           // de lucide-react
  accent: 'from-purple-500/30 to-fuchsia-500/10',
}
```

> El array de la landing es independiente del manifest del plugin en el app — se duplica deliberadamente para que la landing pueda buildearse sin depender del workspace principal.

---

## Cómo agregar features

Editá `landing/src/data/features.ts` y agregá un objeto con `title`, `description` e `icon` (lucide-react). La grilla es responsiva (1 / 2 / 4 columnas).

---

## SEO

- `<title>`, `<meta description>`, OpenGraph y Twitter Card configurados en `index.html`.
- `favicon.svg` (128 px) y `og-image.svg` (1200×630).
- `robots.txt` permite todo + apunta al sitemap.
- `sitemap.xml` mínimo (URL raíz).

Para mejorar el OG image en redes que no parsean SVG, generá un `og-image.png` y reemplazá las referencias en `index.html`.

---

## Hook `useLatestRelease`

Consulta `https://api.github.com/repos/na7hk3r/nora-os/releases/latest` y:

- Cachea la respuesta en `sessionStorage` por **10 minutos**.
- Clasifica los assets por SO/tipo (`windows`, `windowsPortable`, `linuxAppImage`, `linuxDeb`, `macDmg`).
- Si la API falla, `error` se setea y el `DownloadButton` cae al fallback `https://github.com/.../releases`.

El componente `DownloadButton` autodetecta el SO con `navigator.userAgent` (vía `useDetectOS`) y enlaza al asset correspondiente. En tests se puede forzar con `forceOS="windows" | "mac" | "linux" | "unknown"`.

---

## Tests

```bash
cd landing
npm test
```

Cobertura:

- `Hero.test.tsx` — render del título, subtítulo y CTAs.
- `DownloadButton.test.tsx` — selección de asset por SO, fallback, detección de userAgent.
- `useLatestRelease.test.ts` — fetch, cache en sessionStorage, manejo de errores, clasificación de assets.
- `FeedbackPage.test.tsx` — formulario beta, contexto oculto y estados de envío.
- `telemetry.test.ts` — pageviews, eventos de descarga y no-op sin endpoint.

---

## Validación

Antes de mergear cambios significativos:

```bash
cd landing
npm install
npm run typecheck
npm test
npm run build
```

Verificar que `landing/dist/index.html` contenga rutas con prefijo `/nora-os/`.

### Lighthouse

Objetivo: **≥ 90** en Performance, Accessibility, Best Practices y SEO. Para correr local:

```bash
npm install -g @lhci/cli
cd landing
npm run build && npx serve dist
# en otra terminal
lhci autorun --collect.url=http://localhost:3000/nora-os/
```
