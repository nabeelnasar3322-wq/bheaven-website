// GET /api/stats?days=7 — aggregated analytics for the dashboard. Requires the shared password.
const crypto = require('crypto');
const { pipeline, dubaiDate } = require('./_redis');

function same(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}
function pairs(arr) {
  const o = {};
  for (let i = 0; arr && i < arr.length; i += 2) o[arr[i]] = Number(arr[i + 1]);
  return o;
}
function add(into, obj) {
  for (const key in obj) into[key] = (into[key] || 0) + obj[key];
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const pass = process.env.DASHBOARD_PASSWORD;
  if (!pass) return res.status(500).json({ error: 'DASHBOARD_PASSWORD is not set in Vercel' });
  if (!same(req.headers['x-dash-key'] || '', pass)) {
    await new Promise((r) => setTimeout(r, 600));
    return res.status(401).json({ error: 'Wrong password' });
  }

  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
  const dates = [];
  for (let i = days - 1; i >= 0; i--) dates.push(dubaiDate(i));

  const cmds = [];
  for (const d of dates) {
    const k = (s) => `a:${d}:${s}`;
    cmds.push(
      ['HGETALL', k('pv')], ['PFCOUNT', k('uv')], ['HGETALL', k('hr')], ['HGETALL', k('dev')],
      ['HGETALL', k('geo')], ['HGETALL', k('src')], ['ZRANGE', k('dish'), 0, -1, 'WITHSCORES'], ['HGETALL', k('ev')]
    );
  }
  cmds.push(['PFCOUNT', ...dates.map((d) => `a:${d}:uv`)]);

  let r;
  try { r = await pipeline(cmds); } catch (e) { return res.status(502).json({ error: e.message }); }

  const out = { days, from: dates[0], to: dates[dates.length - 1], daily: [], pages: {}, hours: {}, devices: {}, countries: {}, sources: {}, dishes: {}, events: {} };
  dates.forEach((d, i) => {
    const s = r.slice(i * 8, i * 8 + 8);
    const pv = pairs(s[0]);
    const views = Object.values(pv).reduce((a, b) => a + b, 0);
    const ev = pairs(s[7]);
    out.daily.push({ date: d, views, visitors: Number(s[1]) || 0, dish: ev.dish || 0, whatsapp: ev.whatsapp || 0 });
    add(out.pages, pv); add(out.hours, pairs(s[2])); add(out.devices, pairs(s[3]));
    add(out.countries, pairs(s[4])); add(out.sources, pairs(s[5])); add(out.dishes, pairs(s[6])); add(out.events, ev);
  });
  out.visitors = Number(r[r.length - 1]) || 0;
  out.views = out.daily.reduce((a, b) => a + b.views, 0);
  res.status(200).json(out);
};
