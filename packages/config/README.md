# Nora Config

Shared configuration conventions for the monorepo.

This package is intentionally config-only. Add reusable TypeScript, Vite,
Tailwind, Prettier, environment, and alias conventions here when at least two
apps or packages need the same rule.

Root CI currently uses npm scripts directly. Add shared config here only after
at least two consumers need the same production rule.
