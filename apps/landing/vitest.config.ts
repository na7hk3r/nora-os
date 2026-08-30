import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  root: here,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [resolve(here, 'src/test/setup.ts')],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.ts',
        '**/*.config.js',
        '**/src/test/**',
      ],
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 45,
        lines: 50,
      },
    },
  },
})
