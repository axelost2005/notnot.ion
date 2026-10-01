import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'shared', include: ['packages/shared/src/**/*.test.ts'] } },
      {
        test: {
          name: 'api',
          include: ['apps/api/src/**/*.test.ts'],
          // Los tests de la API no tocan la base: alcanza con valores de mentira.
          env: {
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
            APP_SECRET: 'caballo bateria grapa correcta',
            SESSION_SECRET: 'test-session-secret-con-mas-de-32-caracteres',
            BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_test_token',
          },
        },
      },
    ],
  },
})
