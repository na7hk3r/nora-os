# Deployment

Reserved for release, distribution, and deployment automation that is not tied
to GitHub workflow syntax.

Current production deployment paths:

- Landing: GitHub Pages deploy from `apps/landing/dist` through
  `.github/workflows/landing.yml`.
- Desktop Windows: GitHub Release assets through `.github/workflows/release.yml`
  and `npm run release`.
- Mobile: no app-store release pipeline yet; `apps/mobile` is validated in CI
  with analyze and tests only.
