import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'

const wasmDir = resolve(__dirname, 'node_modules/sql.js/dist')
const publicWasm = resolve(__dirname, 'public/sql-wasm.wasm')

try {
  mkdirSync(resolve(__dirname, 'public'), { recursive: true })
  copyFileSync(resolve(wasmDir, 'sql-wasm.wasm'), publicWasm)
} catch {
  // si sql.js no está instalado aún, se copia en prepara/install
}

const desktopRoot = resolve(__dirname, '../desktop')

export default defineConfig({
  base: '/nora-os/web/',
  plugins: [react()],
  server: {
    fs: {
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/recharts/') || id.includes('/d3-') || id.includes('/victory-vendor/') || id.includes('recharts-')) return 'charts'
          if (id.includes('/react-markdown/') || id.includes('/remark-') || id.includes('/mdast-') || id.includes('/unist-') || id.includes('/micromark/')) return 'markdown'
          if (id.includes('/sql.js/') || id.includes('/dexie/')) return 'sql'
          if (id.includes('/lucide-react/')) return 'icons'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router') || id.includes('/zustand/')) return 'react'
          return 'vendor'
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(desktopRoot, 'src'),
      '@core': resolve(desktopRoot, 'src/core'),
      '@plugins': resolve(desktopRoot, 'src/plugins'),
      '@spike': resolve(__dirname, 'src/spike'),
    },
  },
})
