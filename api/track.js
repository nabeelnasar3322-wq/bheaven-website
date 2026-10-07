// POST /api/track — records one anonymous guest event. No cookies, no raw IPs stored.
const crypto = require('crypto');
const { pipeline, dubaiDate, dubaiHour } = require('./_redis');

const PAGES = new Set(['menu', 'shisha', 'business-lunch']);
const EVENTS = /^(whatsapp|call|email|directions|instagram|pick|lang:(en|es|ar)|mode:(food|drinks))$/;
const TTL = 60 * 60 * 24 * 400; // keep ~13 months

function clean(s, n) {
  return String(s || '').replace(/[\u0000-\u001f]/g, '').slice(0, n);
}
function source(ref) {
  try {
    const h = new URL(ref).hostname.replace(/^www\./, '').replace(/^l\.|^lm\.|^m\./, '');
    if (!h || /bheavendubai\.com$|vercel\.app$/.test(h)) return '';
    if (/google\./.test(h)) return 'Google';
    if (/instagram\.com/.test(h)) return 'Instagram';
    if (/facebook\.com|fb\.com/.test(h)) return 'Facebook';
    if (/tripadvisor\./.test(h)) return 'Tripadvisor';
    if (/tiktok\.com/.test(h)) return 'TikTok';
    if (/bing\.com/.test(h)) return 'Bing';
    return h.slice(0, 60);
  } catch (e) {
    return 'Direct / QR';
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const ua = req.headers['user-agent'] || '';
  if (/bot|crawl|spider|preview|headless/i.test(ua)) return res.status(204).end();

  let b = req.body;
  try { if (typeof b === 'string') b = JSON.parse(b); } catch (e) { return res.status(400).end(); }
  if (!b || typeof b !== 'object') {
    try {
      const chunks = []; for await (const c of req) chunks.push(c);
      b = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch (e) { return res.status(400).end(); }
  }

  const page = PAGES.has(b.p) ? b.p : 'menu';
  const day = dubaiDate();
  const k = (s) => `a:${day}:${s}`;
  const cmds = [];

  if (b.t === 'pv') {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const visitor = crypto.createHash('sha256').update(day + ip + ua).digest('hex').slice(0, 16);
    const country = clean(req.headers['x-vercel-ip-country'], 2) || '??';
    const src = b.r ? source(b.r) : 'Direct / QR';
    cmds.push(
      ['HINCRBY', k('pv'), page, 1],
      ['PFADD', k('uv'), visitor],
      ['HINCRBY', k('hr'), String(dubaiHour()), 1],
      ['HINCRBY', k('dev'), b.m === 'mobile' ? 'mobile' : 'desktop', 1],
      ['HINCRBY', k('geo'), country, 1]
    );
    if (src) cmds.push(['HINCRBY', k('src'), src, 1]);
  } else if (b.t === 'dish' && b.d && b.d.n) {
    const member = clean(b.d.k, 30) + '|' + clean(b.d.n, 80);
    cmds.push(['ZINCRBY', k('dish'), 1, member], ['HINCRBY', k('ev'), 'dish', 1]);
  } else if (b.t === 'ev' && EVENTS.test(b.d)) {
    cmds.push(['HINCRBY', k('ev'), b.d, 1]);
  } else {
    return res.status(204).end();
  }

  ['pv', 'uv', 'hr', 'dev', 'geo', 'src', 'dish', 'ev'].forEach((s) => cmds.push(['EXPIRE', k(s), TTL]));
  try { await pipeline(cmds); } catch (e) { console.error(e.message); }
  res.setHeader('Cache-Control', 'no-store');
  res.status(204).end();
};
