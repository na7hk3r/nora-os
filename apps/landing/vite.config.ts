import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// La app se sirve desde https://na7hk3r.github.io/nora-os/
export default defineConfig({
  plugins: [react()],
  base: '/nora-os/',
  resolve: {
    alias: {
      '@docs': resolve(__dirname, '../docs'),
    },
  },
  // Permitimos a Vite leer la carpeta /docs ubicada fuera del root del landing
  // para poder importar los .md con ?raw desde Docs.tsx.
  server: {
    fs: {
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
