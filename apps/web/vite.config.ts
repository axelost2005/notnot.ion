import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const API_URL = 'http://localhost:3001'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png', 'robots.txt'],
      manifest: {
        name: 'notnot.ion',
        short_name: 'notnot',
        description: 'Tableros por cliente y notas rápidas que se vuelven tareas.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#fcfcfd',
        background_color: '#fcfcfd',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Nueva nota',
            short_name: 'Nota',
            description: 'Abre General para escribir una nota',
            url: '/?nueva-nota',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // Solo el shell: la API va siempre por red (no hay offline en el MVP).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // Las librerías van aparte: cambian poco, así un deploy solo baja de nuevo el código de la app.
    // React y compañía pesan más de 500 kB: el aviso no aplica a ese chunk.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [{ name: 'vendor', test: /node_modules/ }] },
      },
    },
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
