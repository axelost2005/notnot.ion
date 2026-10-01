// Arma .vercel/output (Build Output API v3): la web como estático y la API como una sola función.
// Lo corre Vercel como build command (`pnpm build:vercel`), después de `pnpm build`.
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'

const out = '.vercel/output'
const fn = `${out}/functions/api.func`

await rm(out, { recursive: true, force: true })
await mkdir(fn, { recursive: true })

await cp('apps/web/dist', `${out}/static`, { recursive: true })
await cp('apps/api/dist/index.mjs', `${fn}/index.mjs`)

await writeFile(
  `${fn}/.vc-config.json`,
  JSON.stringify({
    runtime: 'nodejs24.x',
    handler: 'index.mjs',
    launcherType: 'Nodejs',
    shouldAddHelpers: false,
    supportsResponseStreaming: true,
  }),
)

await writeFile(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Que nadie la indexe (además de robots.txt y el meta noindex).
        { src: '/(.*)', headers: { 'X-Robots-Tag': 'noindex, nofollow' }, continue: true },
        // Los assets llevan hash en el nombre: se cachean para siempre.
        {
          src: '/assets/(.*)',
          headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        // Mismo origen: /api/* va a Express, que recibe el path original.
        { src: '/api/(.*)', dest: '/api' },
        { handle: 'filesystem' },
        // SPA: cualquier otra ruta la resuelve React Router.
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
)

console.log(`Build Output listo en ${out}`)
