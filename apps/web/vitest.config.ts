import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

const desktopRoot = resolve(__dirname, '../desktop')

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(desktopRoot, 'src'),
      '@core': resolve(desktopRoot, 'src/core'),
      '@plugins': resolve(desktopRoot, 'src/plugins'),
      '@spike': resolve(__dirname, 'src/spike'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.ts',
        '**/*.config.js',
        '**/src/test/**',
        '**/src/spike/**/*.test.ts',
        '**/types.ts',
      ],
      thresholds: {
        statements: 45,
        branches: 55,
        functions: 60,
        lines: 45,
      },
    },
  },
})
