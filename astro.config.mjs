import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://windery.github.io',
  output: 'static',
  trailingSlash: 'always',
  markdown: { shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, wrap: true } },
});
