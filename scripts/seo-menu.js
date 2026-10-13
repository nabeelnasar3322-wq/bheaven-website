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
process.exit(0);
