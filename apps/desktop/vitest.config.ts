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
  },
})
