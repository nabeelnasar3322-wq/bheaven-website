// Build step: writes Spanish and Arabic plain-text versions of each page's content
// (menu/seo-es.html, menu/seo-ar.html, business-lunch/seo-es.html, ...).
// api/page.js puts the right one into /es/... and /ar/... pages so crawlers that do not run
// JavaScript can read real Spanish / Arabic text. Uses the pages' own translation dictionaries.
// Always safe: on any problem it skips that file and exits 0.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dec = (s) => String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
const UI = {
  es: { menu: 'Carta de B-Heaven by Barceló, Al Jaddaf, Dubái', lunch: 'Menú de almuerzo de negocios de B-Heaven by Barceló, Al Jaddaf, Dubái', prices: 'Precios en AED.', food: 'Comida', drinks: 'Bebidas', lunchInfo: 'De lunes a viernes, de 12:30 a 15:30. 2 platos por 89 AED, 3 platos por 105 AED.', starters: 'Entrantes', mains: 'Platos principales', sweet: 'Postre' },
  ar: { menu: 'قائمة B-Heaven by Barceló، الجداف، دبي', lunch: 'قائمة غداء الأعمال في B-Heaven by Barceló، الجداف، دبي', prices: 'الأسعار بالدرهم الإماراتي (AED).', food: 'الطعام', drinks: 'المشروبات', lunchInfo: 'من الاثنين إلى الجمعة، 12:30 – 3:30 مساءً. طبقان بسعر 89 درهماً، وثلاثة أطباق بسعر 105 دراهم.', starters: 'المقبلات', mains: 'الأطباق الرئيسية', sweet: 'الحلويات' },
};

// plain text of the static page, one entry per heading / paragraph-like element
function staticSegments(html) {
  const body = html.slice(html.indexOf('<body'));
  const out = []; let skip = 0, head = null, buf = '';
  const VOID = /^(br|img|input|meta|link|hr|source|path|circle|rect|use|area|base|col|embed|track|wbr)$/i;
  const flush = () => { const t = dec(buf).replace(/\s+/g, ' ').trim(); buf = ''; if (t && t.length > 2) out.push({ t, h: head }); };
  for (const m of body.matchAll(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g)) {
    const tok = m[0];
    if (tok.startsWith('<!--')) continue;
    if (tok[0] === '<') {
      const mm = tok.match(/^<(\/?)([a-zA-Z0-9]+)/); if (!mm) continue;
      const close = mm[1] === '/', name = mm[2].toLowerCase();
      if (/^(script|style|noscript|svg|template|select)$/.test(name)) { skip += close ? -1 : 1; if (skip < 0) skip = 0; if (!close) flush(); continue; }
      if (skip) continue;
      if (/^h[1-4]$/.test(name)) { if (close) { flush(); head = null; } else { flush(); head = name; } continue; }
      if (!head && !VOID.test(name)) flush(); // block-ish boundary
      continue;
    }
    if (!skip) buf += tok;
  }
  flush();
  return out;
}

function tryRun(code, ctx) { return vm.runInNewContext(code, ctx || {}, { timeout: 5000 }); }

function build({ file, outBase, kind }) {
  const f = path.join(ROOT, file, 'index.html');
  const html = fs.readFileSync(f, 'utf8');
  const lines = html.split('\n');
  const res = {};
  for (const lang of ['es', 'ar']) {
    try {
      let dict, ctx = {};
      if (kind === 'menu') {
        const L = lines.find((l) => l.startsWith('const ' + lang.toUpperCase() + '='));
        if (!L) continue;
        dict = tryRun('(' + L.replace(/^const [A-Z]+=/, '').replace(/;\s*$/, '') + ')');
        const C = lines.find((l) => l.startsWith('const ' + (lang === 'es' ? 'CTXE' : 'CTXA') + '='));
        if (C) ctx = tryRun('(' + C.replace(/^const [A-Z]+=/, '').replace(/;\s*$/, '') + ')');
      } else {
        const L = lines.find((l) => l.startsWith('const I18N='));
        if (!L) continue;
        dict = tryRun('(' + L.replace(/^const I18N=/, '').replace(/;\s*$/, '') + ')')[lang];
      }
      if (!dict) continue;
      const T = (s) => (s != null && Object.prototype.hasOwnProperty.call(dict, s) ? dict[s] : s);
      const heading = (t) => {
        if (dict[t]) return dict[t];
        const c = ctx[t]; if (c) return t.split(' ').map((w) => (Object.prototype.hasOwnProperty.call(c, w) ? c[w] : w)).filter(Boolean).join(' ');
        return null;
      };
      // 1) static text of the page that has a translation
      let page = '';
      const seen = new Set();
      for (const s of staticSegments(html)) {
        if (seen.has(s.t)) continue;
        const tr = s.h ? heading(s.t) : dict[s.t];
        if (!tr || tr === s.t) continue;
        seen.add(s.t);
        page += s.h ? `<${s.h === 'h1' ? 'h2' : s.h}>${esc(tr)}</${s.h === 'h1' ? 'h2' : s.h}>` : `<p>${esc(tr)}</p>`;
      }
      // 2) the menu itself
      let menu = '';
      if (kind === 'menu') {
        const i = lines.findIndex((l) => l.startsWith('const M = {'));
        const j = lines.findIndex((l, n) => n > i && l.startsWith('const catOf'));
        const { M, DM, CATS, DCATS } = tryRun(lines.slice(i, j).join('\n') + '\n;({M,DM,CATS,DCATS})');
        const sec = (cats, src) => cats.filter((c) => src[c.k] && src[c.k].length).map((c) =>
          '<h3>' + esc(T(c.t)) + '</h3>' + (c.d ? '<p>' + esc(T(c.d)) + '</p>' : '') + '<ul>' +
          src[c.k].filter((d) => d && d.n).map((d) => '<li><strong>' + esc(T(d.n)) + '</strong>' + (d.d ? ' – ' + esc(T(d.d)) : '') + (d.p ? ' – ' + esc(d.p) : '') + '</li>').join('') + '</ul>').join('');
        const u = UI[lang];
        menu = '<h2>' + esc(u.menu) + '</h2><p>' + esc(u.prices) + '</p><h2>' + esc(u.food) + '</h2>' + sec(CATS, M) +
          '<h2>' + esc(u.drinks) + '</h2>' + (lang === 'ar' ? '<div lang="en" dir="ltr">' + sec(DCATS, DM) + '</div>' : sec(DCATS, DM));
      } else {
        const i = lines.findIndex((l) => l.startsWith('const IMG='));
        const j = lines.findIndex((l, n) => n > i && l.startsWith('const SEC='));
        const { D } = tryRun(lines.slice(i, j).join('\n') + '\n;({D})');
        const u = UI[lang];
        const part = (t, k) => '<h3>' + esc(t) + '</h3><ul>' + D[k].map((d) => '<li><strong>' + esc(T(d.n)) + '</strong>' + (d.d ? ' – ' + esc(T(d.d)) : '') + '</li>').join('') + '</ul>';
        menu = '<h2>' + esc(u.lunch) + '</h2><p>' + esc(u.lunchInfo) + '</p>' + part(u.starters, 'starters') + part(u.mains, 'mains') + part(u.sweet, 'sweets');
      }
      if (!menu) continue;
      const dir = lang === 'ar' ? ' dir="rtl"' : '';
      const frag = '<!--SEO-MENU-START--><noscript><section id="menu-text" lang="' + lang + '"' + dir + '>' + menu + (page ? '<section id="page-text">' + page + '</section>' : '') + '</section></noscript><!--SEO-MENU-END-->';
      fs.writeFileSync(path.join(ROOT, file, 'seo-' + lang + '.html'), frag);
      res[lang] = (frag.length / 1024).toFixed(1) + ' KB';
    } catch (e) { console.log('seo-i18n: ' + file + ' ' + lang + ' skipped (' + e.message + ')'); }
  }
  console.log('seo-i18n: ' + file, JSON.stringify(res));
}

try { build({ file: 'menu', kind: 'menu' }); } catch (e) { console.log('seo-i18n: menu skipped (' + e.message + ')'); }
try { build({ file: 'business-lunch', kind: 'lunch' }); } catch (e) { console.log('seo-i18n: business-lunch skipped (' + e.message + ')'); }
process.exit(0);
