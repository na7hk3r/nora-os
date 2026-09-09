# Roadmap

Nora OS hoy: desktop + web PWA en producción (8 plugins, paridad crypto entre
surfaces) y móvil Android en **early access** (núcleo + plugins Habits y
Journal). Este documento registra decisiones de producto; los planes de
implementación viven en `docs/technical/` o en el README de cada app.

## Principio rector

- **Local-first**: sin cuentas, sin servidores, sin telemetría. Toda idea se valida contra esto.
- **La paridad de superficies no es un objetivo en sí**: cada superficie sirve al caso de uso donde aporta valor. El móvil es captura rápida; el desktop es trabajo pesado.
- **Calidad sobre cantidad**: portar un plugin no justifica duplicar su complejidad.

## Estado actual (2026-09)

| Superficie | Estado | Notas |
| --- | --- | --- |
| Desktop | Producción (v1.19.x) | 8 plugins, auto-update, cifrado en reposo, backups |
| Web PWA | Producción | Mismo renderer desktop, local-first (sql.js + IndexedDB) |
| Mobile (Android) | Early access | Núcleo completo + Habits + Journal |
| iOS | No iniciado | Se evalúa cuando el port móvil madure |

## Cerca (1-2 releases)

| Ítem | Decisión | Por qué |
| --- | --- | --- |
| Cobertura selectiva en plata crítica (desktop) | Subir thresholds de crypto/auth/backup/DB | CI hoy pasa con `statements: 20`; perder datos o seguridad no debería pasar inadvertido |
| Móvil: historial + heatmap de Hábitos | Port acotado | Completa la feature existente sin abrir plugins nuevos |
| Móvil: tema claro + i18n ES/EN | Paridad de core UX | Hoy solo dark mode y copy fija |
| Móvil: port de Tiempo (captura rápida) | A demanda, si el uso lo justifica | El time tracking en el momento es un caso móvil natural |
| Móvil: notificaciones con acción | Mark-read y navegación profunda | Hoy son solo lectura |

## Medio (2-4 releases)

| Ítem | Decisión | Por qué |
| --- | --- | --- |
| Code signing (Windows/macOS) | Habilitar cuando la adopción lo justifique | SmartScreen hoy frena la instalación |
| Release con versionado sincronizado | Mecanizar bump root/desktop/landing + CHANGELOG | Hoy es manual y propenso a desincronización |
| Sincronización entre dispositivos | E2E, sin servidor (empezar por export/import con archivo o QR) | Los formatos POS-BAK1/POS-PRF1 ya son compartidos entre surfaces |

## Lejano / abierto

| Ítem | Estado |
| --- | --- |
| Portar Work / Finance / Knowledge a móvil | **No por paridad**: solo si un caso de uso móvil real lo pide |
| Cuentas cloud / SaaS | Descartado (contradice la filosofía local-first) |
| Galería de temas + theme builder | Sigue en backlog de desktop |
| Calendario externo (.ics) | Sigue en backlog, integrado al plugin Tiempo |

## Cómo se decide

1. Un ítem entra al roadmap por decisión explícita (issue o entrada en changelog).
2. Cada ítem declara: por qué importa, para quién, y qué se descarta con él.
3. Si no se puede validar contra el principio rector, se descarta.