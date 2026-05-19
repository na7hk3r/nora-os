import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version: string }
const APP_VERSION = JSON.stringify(pkg.version)
const desktopRoot = resolve(__dirname, 'apps/desktop')

export default defineConfig({
  main: {
    build: {
      outDir: resolve(__dirname, 'out/main'),
      lib: {
        entry: resolve(desktopRoot, 'electron/main.ts'),
        fileName: () => 'index.js',
      },
      rollupOptions: {
        external: ['better-sqlite3'],
        output: {
          entryFileNames: 'index.js',
        },
      },
    },
  },
  preload: {
    build: {
      outDir: resolve(__dirname, 'out/preload'),
      lib: {
        entry: resolve(desktopRoot, 'electron/preload.ts'),
        fileName: () => 'index.js',
      },
      rollupOptions: {
        output: {
          entryFileNames: 'index.js',
        },
      },
    },
  },
  renderer: {
    root: desktopRoot,
    base: './',
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      emptyOutDir: false,
      rollupOptions: {
        input: resolve(desktopRoot, 'index.html'),
      },
    },
    resolve: {
      alias: {
        '@': resolve(desktopRoot, 'src'),
        '@core': resolve(desktopRoot, 'src/core'),
        '@plugins': resolve(desktopRoot, 'src/plugins'),
        '@shared': resolve(desktopRoot, 'src/shared'),
      },
    },
    define: {
      __APP_VERSION__: APP_VERSION,
    },
    plugins: [react()],
  },
})
