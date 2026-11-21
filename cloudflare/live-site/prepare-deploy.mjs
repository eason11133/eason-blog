// Astro 6 generates compiled Worker code and deployment config at build time.
// Use its generated entry.mjs; the source adapter entry imports virtual Vite modules.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'dist-cloudflare', 'server');
const filename = path.join(dir, 'wrangler.json');
if (!fs.existsSync(filename)) throw new Error('Missing generated Wrangler config. Run the Cloudflare Astro build first.');
const cfg = JSON.parse(fs.readFileSync(filename, 'utf8'));
if (typeof cfg.main !== 'string' || !cfg.main.endsWith('entry.mjs')) throw new Error('Unexpected generated entrypoint. Refusing to deploy.');
if (!fs.existsSync(path.resolve(dir, cfg.main))) throw new Error('Compiled Worker entry file not found.');
if (!fs.existsSync(path.resolve(dir, '../client'))) throw new Error('Compiled client assets not found.');
cfg.name = 'eason-blog-web-live';
cfg.workers_dev = true;
cfg.compatibility_date = '2026-11-20';
cfg.compatibility_flags = [...new Set([...(cfg.compatibility_flags || []), 'nodejs_compat', 'global_fetch_strictly_public'])];
cfg.assets = { ...(cfg.assets || {}), directory: '../client', binding: 'ASSETS' };
cfg.observability = { ...(cfg.observability || {}), enabled: true };
fs.writeFileSync(filename, JSON.stringify(cfg, null, 2) + '\n');
process.stdout.write(`Ready: ${cfg.name}, entry=${cfg.main}, assets=${cfg.assets.directory}\n`);
