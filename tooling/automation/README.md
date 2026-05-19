# Automation

Local automation helpers.

- `flutter-app.mjs`: runs Flutter commands from `apps/mobile` while keeping
  root npm scripts stable (`npm run mobile:analyze`, `npm run mobile:test`).
  On Windows it invokes Flutter's Dart snapshot directly to avoid nested
  PowerShell/cmd hangs; run mobile commands sequentially.

Automation used by CI should avoid shell-specific behavior unless the workflow
explicitly requires that shell.
