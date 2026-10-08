// Public, cookie-free event collector for the menu page. Stores daily counters in Vercel KV (Upstash).
const { body, kvPipeline, dubaiDay, rateHit } = require('./_lib');

const TYPES = { dish_open: 1, pick_add: 1, picks_send: 1, cat_view: 1, lang: 1, mode: 1, visit: 1, page: 1 };
const TTL = 60 * 60 * 24 * 400;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
  try {
    // Public collector: ignore a visitor that sends far more than a real browser would.
    if ((await rateHit(req, 'track', 60, { local: true })) > 120) { res.statusCode = 429; return res.end(); }
    const b = body(req);
    const events = Array.isArray(b.e) ? b.e.slice(0, 25) : [];
    const sid = String(b.s || '').slice(0, 40);
    const day = dubaiDay();
    const cmds = [];
    for (const ev of events) {
      if (!ev || !TYPES[ev.t]) continue;
      const label = String(ev.l || '_').replace(/[^\w &'’.\-]/g, '').slice(0, 60) || '_';
      const key = `bh:${day}:${ev.t}`;
      cmds.push(['HINCRBY', key, label, 1], ['EXPIRE', key, TTL]);
    }
    if (sid && cmds.length) cmds.push(['PFADD', `bh:${day}:users`, sid], ['EXPIRE', `bh:${day}:users`, TTL]);
    if (cmds.length) await kvPipeline(cmds);
  } catch (e) { /* analytics must never break the menu */ }
  res.statusCode = 204;
  res.end();
};
