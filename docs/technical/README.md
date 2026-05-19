# Technical

Technical implementation notes for Nora OS.

Use this directory for cross-cutting engineering notes that are not product
roadmap or public architecture. Current production references:

- CI/CD: [`../../infrastructure/ci/README.md`](../../infrastructure/ci/README.md)
- Deployment: [`../../infrastructure/deployment/README.md`](../../infrastructure/deployment/README.md)
- Monorepo rules: [`../MONOREPO.md`](../MONOREPO.md)

NPM is the production package manager. Any future workspace or build-pipeline
change should update this directory and the GitHub workflows in the same PR.
