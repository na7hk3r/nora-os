# Architecture

Architecture documentation for Nora OS.

Current source-of-truth documents still live at the repository `docs/` root
while the monorepo migration settles:

- [`../ARCHITECTURE.md`](../ARCHITECTURE.md): desktop architecture and runtime flow.
- [`../DATABASE.md`](../DATABASE.md): SQLite schema and storage notes.
- [`../EVENTS.md`](../EVENTS.md): event catalog.
- [`../PLUGIN_API.md`](../PLUGIN_API.md): plugin-facing CoreAPI.

Keep new architecture notes here when they describe cross-app or package-level
decisions. App-specific implementation notes should stay next to the app that
owns them.
