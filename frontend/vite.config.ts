import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
  base: '/',
  build: {
    outDir: resolve(__dirname, '../dist/frontend/client'),
    sourcemap: true,
    target: 'es2015',
    emptyOutDir: true,
  },
})
