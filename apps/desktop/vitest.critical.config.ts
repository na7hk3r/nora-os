import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * Gate selectivo de cobertura para plataforma crítica (auth, cifrado, sandbox SQL,
 * backups, cifrado de DB). Correr SOLO estos tests con thresholds estrictos:
 *   npm run desktop:test:critical-coverage
 *
 * No cubre plugins ni renderer: la cobertura global sigue siendo opcional ahí.
 */
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@plugins': path.resolve(__dirname, 'src/plugins'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'src/test/encryption-critical.test.ts',
      'src/test/auth-critical.test.ts',
      'src/test/storage-ipc-critical.test.ts',
      'src/test/backup-ipc-critical.test.ts',
      'src/test/db-encryption-ipc-critical.test.ts',
    ],
    setupFiles: [path.resolve(__dirname, 'src/test/setup.ts')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        // Solo los módulos críticos: perFile exige los umbrales a CADA uno.
        'electron/services/auth.ts',
        'electron/services/encryption.ts',
        'electron/services/storage-ipc.ts',
        'electron/services/backup-ipc.ts',
        'electron/services/db-encryption-ipc.ts',
        'electron/services/passphrase.ts',
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/out/**',
        '**/*.config.ts',
        '**/*.config.js',
        '**/src/test/**',
        '**/types.ts',
        '**/index.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
        perFile: true,
      },
    },
  },
})