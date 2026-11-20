// Cross-platform wrapper: activate D1-backed Astro SSR for this build only.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const bin = resolve(root, 'node_modules', '.bin', process.platform === 'win32' ? 'astro.cmd' : 'astro');
const result = spawnSync(bin, ['build', '--config', 'cloudflare/live-site/astro.config.mjs'], {
  cwd: root,
  env: { ...process.env, PUBLIC_EASON_LIVE: 'true' },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
