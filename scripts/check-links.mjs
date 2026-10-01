/**
 * Internal link checker for the built site.
 *
 *   npm run build && node scripts/check-links.mjs
 *   BASE_PATH=/owt-website npm run build && BASE_PATH=/owt-website node scripts/check-links.mjs
 *
 * Walks every HTML file in dist/, collects href/src values that point inside
 * the site and verifies that the target file exists and that #anchors exist
 * on the target page. Exits with code 1 if anything is broken.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'dist');

// Sub-path the site is served from (GitHub Pages), e.g. '/owt-website'.
const base = (process.env.BASE_PATH ?? '').replace(/\/+$/, '');

const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(root);

const pageUrl = (file) => base + '/' + path.relative(root, file).replace(/index\.html$/, '').replace(/\\/g, '/');
const idsCache = new Map();
function idsOf(file) {
  if (!idsCache.has(file)) {
    const html = fs.readFileSync(file, 'utf8');
    idsCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idsCache.get(file);
}
function resolveTarget(urlPath) {
  let clean = decodeURIComponent(urlPath.split('?')[0]);
  if (base) {
    // every internal URL must live under the base path
    if (clean !== base && !clean.startsWith(base + '/')) return undefined;
    clean = clean.slice(base.length) || '/';
  }
  const candidates = clean.endsWith('/')
    ? [path.join(root, clean, 'index.html')]
    : [path.join(root, clean), path.join(root, clean, 'index.html'), path.join(root, clean + '.html')];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
}

const problems = [];
let checked = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const from = pageUrl(file);
  // skip redirect stubs generated for legacy URLs
  if (/http-equiv="refresh"/.test(html)) continue;
  const refs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|viber:|tg:|data:|javascript:)/.test(ref)) continue;
    checked++;
    const [pathPart, hash] = ref.split('#');
    let targetFile;
    if (pathPart === '' ) targetFile = file;
    else {
      const abs = pathPart.startsWith('/') ? pathPart : path.posix.join(from, pathPart);
      targetFile = resolveTarget(abs);
      if (!targetFile) {
        problems.push(`${from}  →  ${ref}  (no such page/file)`);
        continue;
      }
    }
    if (hash && targetFile.endsWith('.html') && hash !== 'top' && !idsOf(targetFile).has(hash)) {
      problems.push(`${from}  →  ${ref}  (missing #${hash})`);
    }
  }
}

console.log(`Pages: ${htmlFiles.length}, internal references checked: ${checked}`);
if (problems.length) {
  console.log(`Broken: ${problems.length}`);
  for (const p of [...new Set(problems)]) console.log('  ' + p);
  process.exit(1);
}
console.log('No broken internal links.');
