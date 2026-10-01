import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

// Íconos de la PWA a partir de public/icon.svg: `pnpm --filter @notnot/web icons`.
const background = '#1d2027'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { background } },
    apple: { ...preset.apple, resizeOptions: { background } },
  },
  images: ['public/icon.svg'],
})
