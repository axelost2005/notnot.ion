import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// El código del candado (APP_SECRET) sale del .env de la raíz.
const rootEnv = new URL('../../.env', import.meta.url)
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const devURL = 'http://localhost:5173'
// Build de producción servido en local (con service worker): para probar la PWA.
const previewURL = 'http://localhost:4173'

export default defineConfig({
  testDir: './e2e',
  // Los tests comparten la base de dev: de a uno para que no se pisen.
  workers: 1,
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      testIgnore: /pwa\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: devURL },
    },
    {
      name: 'pwa',
      testMatch: /pwa\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: previewURL },
    },
  ],
  webServer: [
    {
      command: 'pnpm --dir ../.. dev',
      url: `${devURL}/api/health`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      // La preview usa la API de dev (Vite proxea /api igual que en dev).
      command: 'pnpm build && pnpm preview',
      url: previewURL,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
})
