# Branding

Brand and visual identity documentation for Nora OS.

Canonical brand assets live in `buildResources/brand-kit/` (alongside the
Electron packaging). App-local copies exist only when a build tool needs
assets inside its own public or asset folder:

- Desktop: `apps/desktop/public/brand/`
- Landing: `apps/landing/public/brand/`
- Mobile: `apps/mobile/assets/brand/`

Visual tokens are defined per surface (the `default` theme CSS vars in the
desktop/web renderer and the landing, and the Dart design tokens in mobile).
If a token changes, update the consumer docs and run the relevant desktop,
landing and mobile checks.
