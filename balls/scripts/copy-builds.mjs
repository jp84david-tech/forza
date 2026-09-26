/**
 * Runs after `vite build`. Puts two ready-to-open copies at the top of the repo:
 * - app/        the hosted app, installable (manifest, icons, offline service worker)
 * - balls.html  the same app as one file to download or send, with its icons inlined
 */
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const app = new URL('../../app/', import.meta.url);
const single = new URL('../../balls.html', import.meta.url);

rmSync(app, { recursive: true, force: true });
cpSync(dist, app, { recursive: true });

const dataUri = (file, type) => `data:${type};base64,${readFileSync(new URL(file, dist)).toString('base64')}`;
let html = readFileSync(new URL('index.html', dist), 'utf8');
for (const [file, type] of [
  ['icons/favicon.svg', 'image/svg+xml'],
  ['icons/favicon-32.png', 'image/png'],
  ['icons/apple-touch-icon.png', 'image/png'],
]) {
  if (!html.includes(`href="${file}"`)) throw new Error(`index.html no longer links ${file}`);
  html = html.replace(`href="${file}"`, `href="${dataUri(file, type)}"`);
}
// A single file can't be installed, so it doesn't link the manifest.
html = html.replace(/\s*<link rel="manifest"[^>]*>/, '');
writeFileSync(single, html);

console.log('Copied build to app/ and balls.html');
