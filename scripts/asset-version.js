// Build step (Vercel): stamp every local .css / .js link in the site's pages with a short content hash,
// e.g. style.css -> style.css?v=3f9a1c2b. vercel.json caches stamped files for a year (immutable),
// so returning guests never re-check them, and any edit gets a new hash, so nobody sees a stale file.
// Safe to run more than once. Never fails the build: a file it cannot find is left as it was.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PAGES = [
  'index.html', '404.html', 'offline.html',
  'menu/index.html', 'shisha/index.html', 'business-lunch/index.html',
  'nye/index.html', 'xmas/index.html', 'thank-you/index.html', 'privacy/index.html', 'terms/index.html',
];
// The offline app keeps these under their plain names (see sw.js PRECACHE), so they stay unstamped.
const SKIP = new Set(['pwa.js', 'booking.js', 'offers.js', 'sw.js']);
const ATTR = /\b(href|src)="((?!https?:|\/\/|data:)[^"?#]+\.(?:css|js))(?:\?v=[^"#]*)?"/g;

const hashes = new Map();
function hashOf(file) {
  if (!hashes.has(file)) {
    hashes.set(file, fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10) : null);
  }
  return hashes.get(file);
}

let stamped = 0;
for (const page of PAGES) {
  const file = path.join(ROOT, page);
  if (!fs.existsSync(file)) continue;
  const dir = path.dirname(file);
  const html = fs.readFileSync(file, 'utf8');
  const out = html.replace(ATTR, (all, attr, ref) => {
    const target = ref.startsWith('/') ? path.join(ROOT, ref) : path.join(dir, ref);
    if (SKIP.has(path.basename(target)) || !target.startsWith(ROOT + path.sep)) return all;
    const h = hashOf(target);
    if (!h) return all;
    stamped++;
    return `${attr}="${ref}?v=${h}"`;
  });
  if (out !== html) fs.writeFileSync(file, out);
}
console.log(`asset-version: stamped ${stamped} links`);
