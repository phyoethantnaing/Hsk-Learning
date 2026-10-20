// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages serves the site at https://phyoethantnaing.github.io/Hsk-Learning/
// (the path is case-sensitive and must match the repo name).
export default defineConfig({
  site: 'https://phyoethantnaing.github.io',
  base: '/Hsk-Learning',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
