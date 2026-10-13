// Build step: writes the full menu as plain text (inside <noscript>) into menu/index.html,
// so crawlers that do not run JavaScript can read every dish and price.
// Always safe: on any problem it leaves the page untouched and exits 0.
const fs = require('fs'), vm = require('vm'), path = require('path');
const file = path.join(__dirname, '..', 'menu', 'index.html');
const START = '<!--SEO-MENU-START-->', END = '<!--SEO-MENU-END-->';
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
try {
  let html = fs.readFileSync(file, 'utf8');
  const a = html.indexOf(START), b = html.indexOf(END);
  if (a < 0 || b < a) { console.log('seo-menu: markers not found, skipped'); process.exit(0); }
  const lines = html.split('\n');
  const i = lines.findIndex(l => l.startsWith('const M = {'));
  const j = lines.findIndex((l, n) => n > i && l.startsWith('const catOf'));
  if (i < 0 || j < 0) { console.log('seo-menu: data block not found, skipped'); process.exit(0); }
  const code = lines.slice(i, j).join('\n') + '\n;({M,DM,CATS,DCATS})';
  const { M, DM, CATS, DCATS } = vm.runInNewContext(code, {}, { timeout: 5000 });
  const sec = (cats, src, label) => cats.filter(c => src[c.k] && src[c.k].length).map(c => {
    const items = src[c.k].filter(d => d && d.n).map(d =>
      '<li><strong>' + esc(d.n) + '</strong>' + (d.d ? ' – ' + esc(d.d) : '') + (d.p ? ' – ' + esc(d.p) : '') + '</li>').join('');
    return '<h3>' + esc(c.t) + '</h3>' + (c.d ? '<p>' + esc(c.d) + '</p>' : '') + '<ul>' + items + '</ul>';
  }).join('');
  const food = sec(CATS, M), drinks = sec(DCATS, DM);
  if (!food || !drinks) { console.log('seo-menu: empty menu, skipped'); process.exit(0); }
  const block = START + '<noscript><section id="menu-text"><h2>B-Heaven by Barceló menu, Al Jaddaf, Dubai</h2><p>Prices in AED.</p><h2>Food</h2>' +
    food + '<h2>Drinks</h2>' + drinks + '</section></noscript>' + END;
  html = html.slice(0, a) + block + html.slice(b + END.length);
  fs.writeFileSync(file, html);
  console.log('seo-menu: wrote ' + (block.length / 1024).toFixed(1) + ' KB');
} catch (e) { console.log('seo-menu: skipped (' + e.message + ')'); }

// Business Lunch set menu
try {
  const f2 = path.join(__dirname, '..', 'business-lunch', 'index.html');
  let h = fs.readFileSync(f2, 'utf8');
  const a = h.indexOf(START), b = h.indexOf(END);
  const L = h.split('\n');
  const i = L.findIndex(l => l.startsWith('const IMG='));
  const j = L.findIndex((l, n) => n > i && l.startsWith('const SEC='));
  if (a >= 0 && b > a && i >= 0 && j > i) {
    const { D } = vm.runInNewContext(L.slice(i, j).join('\n') + '\n;({D})', {}, { timeout: 5000 });
    const part = (t, k) => '<h3>' + t + '</h3><ul>' + D[k].map(d => '<li><strong>' + esc(d.n) + '</strong>' + (d.d ? ' – ' + esc(d.d) : '') + '</li>').join('') + '</ul>';
    if (D.starters && D.mains && D.sweets) {
      const blk = START + '<noscript><section id="menu-text"><h2>Business Lunch menu at B-Heaven by Barceló, Al Jaddaf, Dubai</h2><p>Monday to Friday, 12:30 – 3:30 PM. 2 courses AED 89, 3 courses AED 105.</p>' +
        part('Starters', 'starters') + part("Chef's Mains", 'mains') + part('Sweet Finish', 'sweets') + '</section></noscript>' + END;
      h = h.slice(0, a) + blk + h.slice(b + END.length);
      fs.writeFileSync(f2, h);
      console.log('seo-menu: business-lunch ok');
    }
  }
} catch (e) { console.log('seo-menu: business-lunch skipped (' + e.message + ')'); }
process.exit(0);
