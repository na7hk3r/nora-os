# Infrastructure

Operational infrastructure for Nora OS: CI helpers, release/deployment support,
Docker experiments, and production scripts.

GitHub workflow entrypoints stay in `.github/workflows` because GitHub requires
that location.

Production automation currently uses npm and Flutter directly:

- CI matrix: `.github/workflows/ci.yml`
- Landing deploy: `.github/workflows/landing.yml`
- Release publishing: `.github/workflows/release.yml`

Keep generated outputs out of this directory. Build artifacts belong in ignored
folders such as `out/`, `release/`, `dist/` and Flutter `build/`.
