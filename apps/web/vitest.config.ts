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
  },
})
