# Tooling

Internal developer tooling for Nora OS.

- `generators/`: scaffolding tools.
- `automation/`: local automation helpers.
- `devtools/`: debugging and developer-experience utilities.

Tooling must be callable from root npm scripts when it is part of production
validation. Keep helper outputs in ignored build/cache folders.
