// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://pan11123.github.io',
  base: '/the-model-archive',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  vite: {
    resolve: {
      alias: { '@': new URL('./src', import.meta.url).pathname },
    },
  },
});
