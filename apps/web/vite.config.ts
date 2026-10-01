import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_URL = 'http://localhost:3001'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    strictPort: true,
    // Mismo origen en dev: la cookie del candado es first-party y no hace falta CORS.
    proxy: { '/api': API_URL },
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: { '/api': API_URL },
  },
})
