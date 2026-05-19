# Branding

Brand and visual identity documentation for Nora OS.

Canonical brand assets live in `packages/assets/brand-kit/`. App-local copies
exist only when a build tool needs assets inside its own public or asset folder:

- Desktop: `apps/desktop/public/brand/`
- Landing: `apps/landing/public/brand/`
- Mobile: `apps/mobile/assets/brand/`

Shared visual tokens belong in `packages/ui`. If a token changes, update the
consumer docs and run the relevant desktop, landing and mobile checks.
