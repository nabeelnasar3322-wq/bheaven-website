// Offers shown inside the installed app. Stored in Vercel KV (key bh:offers), so changes go live
// straight away with no redeploy.
//   GET            public: offers that are active today (Dubai time)
//   GET ?all=1     admin: every offer, including expired and switched-off ones
//   POST           admin: replace the whole list
const crypto = require('crypto');
const { isAuthed, body, send, kvPipeline, dubaiDay } = require('./_lib');

const LANGS = ['en', 'es', 'ar'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function tri(o, max) {
  const out = {};
  for (const l of LANGS) {
    const v = o && typeof o[l] === 'string' ? o[l].trim() : '';
    if (v) out[l] = v.slice(0, max);
  }
  return out;
}

async function load() {
  const [raw] = await kvPipeline([['GET', 'bh:offers']]);
  try { const a = JSON.parse(raw || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const all = req.query && req.query.all;
      if (all) {
        if (!isAuthed(req)) return send(res, 401, { error: 'Sign in required' });
        return send(res, 200, { offers: await load() });
      }
      let list = [];
      try { list = await load(); } catch (e) { /* storage not connected: the app just shows no offers */ }
      const today = dubaiDay();
      const live = list.filter((o) => o.active !== false && (!o.start || o.start <= today) && (!o.end || o.end >= today));
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
      return res.end(JSON.stringify({ offers: live.map((o) => ({ id: o.id, title: o.title, text: o.text, end: o.end || '' })) }));
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!isAuthed(req)) return send(res, 401, { error: 'Sign in required' });
    const b = body(req);
    if (!Array.isArray(b.offers) || b.offers.length > 30) return send(res, 400, { error: 'Up to 30 offers' });

    const seen = new Set();
    const out = [];
    for (const o of b.offers) {
      const title = tri(o && o.title, 70), text = tri(o && o.text, 400);
      if (!title.en) return send(res, 400, { error: 'Every offer needs an English title' });
      if (!text.en) return send(res, 400, { error: `"${title.en}" needs an English description` });
      const start = o.start && DATE.test(o.start) ? o.start : '';
      const end = o.end && DATE.test(o.end) ? o.end : '';
      if (start && end && end < start) return send(res, 400, { error: `"${title.en}": the end date is before the start date` });
      let id = typeof o.id === 'string' && /^[\w-]{6,40}$/.test(o.id) && !seen.has(o.id) ? o.id : crypto.randomBytes(5).toString('hex');
      seen.add(id);
      out.push({ id, title, text, start, end, active: o.active !== false });
    }
    await kvPipeline([['SET', 'bh:offers', JSON.stringify(out)]]);
    return send(res, 200, { ok: true, offers: out });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
};
