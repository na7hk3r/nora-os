# Nora ESLint Config

Shared ESLint rules for Nora TypeScript apps.

The root production lint still calls ESLint directly against
`apps/desktop/{src,electron}`. Promote rules here only when they are shared by
more than one app or package.
