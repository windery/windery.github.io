import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://windery.github.io',
  output: 'static',
  trailingSlash: 'always',
  markdown: { shikiConfig: { theme: 'github-light', wrap: true } },
});
