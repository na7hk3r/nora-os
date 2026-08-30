import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

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
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: [path.resolve(__dirname, 'src/test/setup.ts')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
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
        statements: 20,
        branches: 50,
        functions: 30,
        lines: 20,
      },
    },
  },
})
