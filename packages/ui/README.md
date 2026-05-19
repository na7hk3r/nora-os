# Nora UI

Shared design-system foundation for Nora surfaces.

This package owns cross-platform visual tokens, palette decisions, spacing, radii,
and UI principles. Concrete widgets can remain platform-specific while the
ecosystem converges on these tokens.

Current consumers:

- Desktop/Electron: `apps/desktop`
- Landing: `apps/landing`
- Mobile/Flutter: `apps/mobile` uses equivalent Dart constants during the
  migration phase.

Token changes should be validated across desktop, landing and mobile because
all three surfaces are covered by production CI.
