// Serves /ar/<page>/ and /es/<page>/ (see vercel.json rewrites).
// It fetches the normal English page and swaps in what search engines read first:
// <html lang/dir>, title, descriptions, canonical, social tags and internal links.
// The visible translation is still done by each page's own script, which reads
// window.__BH_LANG. Because it works from the live page, menu edits made in /admin
// show up here automatically.
const ORIGIN = 'https://bheavendubai.com';
const LOCALE = { ar: 'ar_AE', es: 'es_ES' };
const PAGES = { menu: ['ar', 'es'], 'business-lunch': ['ar', 'es'], shisha: ['ar'] };

const T = {
  menu: {
    ar: {
      title: 'B-Heaven by Barceló — مطعم شامي عصري على السطح في دبي',
      desc: 'بي-هيفن من برشلونة — مطعم شامي عصري على سطح برشلونة الجداف في دبي. مأكولات شامية حديثة من مطبخ الفحم، كوكتيلات مميزة وإطلالات على أفق المدينة.',
    },
    es: {
      title: 'B-Heaven by Barceló — Restaurante levantino en la azotea, Dubái',
      desc: 'B-Heaven by Barceló — restaurante levantino en la azotea del Barceló Al Jaddaf, Dubái. Cocina levantina moderna de una cocina a la brasa, cócteles de autor y vistas al skyline.',
    },
  },
  'business-lunch': {
    ar: {
      title: 'غداء الأعمال · B-Heaven by Barceló',
      desc: 'قائمة غداء أعمال ثابتة في بي-هيفن من برشلونة، الجداف، دبي. من الاثنين إلى الجمعة، 12:30 – 3:30 مساءً. طبقان بـ 89 درهماً وثلاثة أطباق بـ 105 دراهم.',
    },
    es: {
      title: 'Almuerzo de negocios · B-Heaven by Barceló',
      desc: 'Menú de almuerzo de negocios en B-Heaven by Barceló, Al Jaddaf, Dubái. De lunes a viernes, de 12:30 a 15:30. 2 platos por 89 AED, 3 platos por 105 AED.',
    },
  },
  shisha: {
    ar: {
      title: 'الشيشة · B-Heaven by Barceló',
      desc: 'قائمة الشيشة في بي-هيفن من برشلونة، الجداف، دبي — نكهات فردية، خلطات، أصناف مميزة وكوكتيلات نوفا.',
    },
  },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function transform(html, page, lang) {
  const t = T[page][lang];
  const url = `${ORIGIN}/${lang}/${page}/`;
  const title = esc(t.title), desc = esc(t.desc);
  let out = html;

  out = out.replace(/<html lang="en">/, `<html lang="${lang}"${lang === 'ar' ? ' dir="rtl"' : ''}>`);
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  out = out.replace(/(<meta name="description" content=")[^"]*(")/, `$1${desc}$2`);
  out = out.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`);
  out = out.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${desc}$2`);
  out = out.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`);
  out = out.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${desc}$2`);
  out = out.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  out = out.replace(/(<meta property="og:type"[^>]*>)/, `$1<meta property="og:locale" content="${LOCALE[lang]}">`);
  // structured data: point at this language's URL
  out = out.replace(new RegExp(`"url":"${ORIGIN}/${page}/"`), `"url":"${url}","inLanguage":"${lang}"`);

  // tell the page script which language this URL is for (runs before the page script)
  out = out.replace('<head>', `<head>\n<script>window.__BH_LANG='${lang}'</script>`);

  // the page lives one level deeper now, so relative image paths need a root
  out = out.replace(/(["'(`])img\//g, '$1/menu/img/');
  // the menu page's idle image preloader scans its own script text for image paths
  out = out.split('/img\\/[0-9a-f]{12}\\.webp/g').join('/\\/menu\\/img\\/[0-9a-f]{12}\\.webp/g');

  // keep visitors inside their language where that page exists in it
  for (const [p, langs] of Object.entries(PAGES)) {
    if (!langs.includes(lang)) continue;
    out = out.replace(new RegExp(`href="/${p}/(?!img/)`, 'g'), `href="/${lang}/${p}/`);
    out = out.split(`'/${p}/'`).join(`'/${lang}/${p}/'`);
  }
  return out;
}

module.exports = async (req, res) => {
  const { page, lang } = req.query || {};
  if (!PAGES[page] || !PAGES[page].includes(lang)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Not found');
  }
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'bheavendubai.com';
    let r = await fetch(`https://${host}/${page}/`, { headers: { 'x-bh-i18n': '1' } });
    if (!r.ok) r = await fetch(`${ORIGIN}/${page}/`);
    if (!r.ok) throw new Error('source page ' + r.status);
    const html = transform(await r.text(), page, lang);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400');
    res.setHeader('X-Robots-Tag', 'all');
    res.end(html);
  } catch (e) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Temporarily unavailable');
  }
};

module.exports.transform = transform;
