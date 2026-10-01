// Empaqueta la API (con `shared` y el cliente de Prisma adentro) en un solo archivo para Vercel.
import { build } from 'esbuild'

await build({
  entryPoints: ['src/vercel.ts'],
  outfile: 'dist/index.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: 'linked',
  // Express y otras dependencias son CommonJS y usan require() de módulos de Node.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
})
