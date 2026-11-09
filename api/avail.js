// Table availability shown on the website's reserve form. Staff set it per day in the admin
// ("Tables" tab); it is a guide for guests, the team still confirms every booking on WhatsApp.
//   GET   public: the next 30 days that are not fully open  {days:{"2026-11-14":{l:"o",s:"f",e:"x"}}}
//   POST  admin:  {date, l, s, e}  (l = lunch, s = sunset, e = evening; o = open, f = few left, x = full)
const { isAuthed, body, send, kvPipeline, dubaiDay } = require('./_lib');

const KEY = 'bh:avail';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const OK = { o: 1, f: 1, x: 1 };
const clean = (v) => (OK[v] ? v : 'o');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const [flat] = await kvPipeline([['HGETALL', KEY]]);
      const today = dubaiDay(), last = dubaiDay(30);
      const days = {};
      for (let i = 0; i < (flat || []).length; i += 2) {
        const d = flat[i];
        if (!DATE.test(d) || d < today || d > last) continue;
        try { const v = JSON.parse(flat[i + 1]); days[d] = { l: clean(v.l), s: clean(v.s), e: clean(v.e) }; } catch (e) { /* skip */ }
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
      return res.end(JSON.stringify({ days }));
    }
    if (req.method === 'POST') {
      if (!isAuthed(req)) return send(res, 401, { error: 'Sign in required' });
      const b = body(req);
      if (!DATE.test(String(b.date || ''))) return send(res, 400, { error: 'Pick a valid date' });
      const v = { l: clean(b.l), s: clean(b.s), e: clean(b.e) };
      if (v.l === 'o' && v.s === 'o' && v.e === 'o') await kvPipeline([['HDEL', KEY, b.date]]);
      else await kvPipeline([['HSET', KEY, b.date, JSON.stringify(v)]]);
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return send(res, 500, { error: 'Storage error' });
  }
};
