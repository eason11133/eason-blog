// Separate Cloudflare SSR build. The default astro.config.mjs and Vercel
// build remain unchanged until the Cloudflare version is verified end to end.
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import base from '../../astro.config.mjs';
import { COMMENT_PUBLIC_SITE_ORIGIN } from '../site-config.mjs';

export default defineConfig({
  ...base,
  site: COMMENT_PUBLIC_SITE_ORIGIN,
  output: 'server',
  outDir: './dist-cloudflare',
  adapter: cloudflare({ imageService: 'compile', prerenderEnvironment: 'node' }),
});
