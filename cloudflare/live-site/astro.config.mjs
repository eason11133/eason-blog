// Separate Cloudflare SSR build. The default astro.config.mjs and Vercel
// build remain unchanged until the Cloudflare version is verified end to end.
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import base from '../../astro.config.mjs';

export default defineConfig({
  ...base,
  site: 'https://eason-blog-web-live.eason456h.workers.dev',
  output: 'server',
  outDir: './dist-cloudflare',
  adapter: cloudflare({ imageService: 'compile', prerenderEnvironment: 'node' }),
});
