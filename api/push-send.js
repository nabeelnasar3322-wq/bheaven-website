// Admin only: see how many phones have notifications on, and send one to all of them.
const { isAuthed, body, send, kvPipeline } = require('./_lib');
const { configured, sendPush, vapidPrivateKey } = require('./_push');

const LANGS = ['en', 'es', 'ar'];

function clean(o, max, required) {
  const out = {};
  for (const l of LANGS) {
    const v = o && typeof o[l] === 'string' ? o[l].trim() : '';
    if (v) out[l] = v.slice(0, max);
  }
  if (required && !out.en) return null;
  return out;
}

module.exports = async (req, res) => {
  if (!isAuthed(req)) return send(res, 401, { error: 'Sign in required' });
  try {
    if (req.method === 'GET') {
      if (!configured()) return send(res, 200, { enabled: false, total: 0, byLang: {}, last: null });
      const [flat, last] = await kvPipeline([['HGETALL', 'bh:push'], ['GET', 'bh:push:last']]);
      const byLang = { en: 0, es: 0, ar: 0 };
      let total = 0;
      for (let i = 1; i < (flat || []).length; i += 2) {
        try { const r = JSON.parse(flat[i]); byLang[r.lang] = (byLang[r.lang] || 0) + 1; total++; } catch (e) {}
      }
      return send(res, 200, { enabled: true, total, byLang, last: last ? JSON.parse(last) : null });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!configured()) return send(res, 503, { error: 'Notifications are not set up yet (VAPID keys missing)' });

    const b = body(req);
    const title = clean(b.title, 60, true), text = clean(b.body, 180, true);
    if (!title) return send(res, 400, { error: 'A title in English is required' });
    if (!text) return send(res, 400, { error: 'A message in English is required' });
    const url = typeof b.url === 'string' ? b.url : '/menu/?source=app';
    if (!/^\/(?!\/)[\w\-\/.?=&#%]*$/.test(url) || url.length > 200) return send(res, 400, { error: 'The link must be a page on this site' });

    const [flat] = await kvPipeline([['HGETALL', 'bh:push']]);
    const subs = [];
    for (let i = 0; i + 1 < (flat || []).length; i += 2) {
      try { const r = JSON.parse(flat[i + 1]); subs.push({ id: flat[i], sub: r.sub, lang: r.lang }); } catch (e) {}
    }
    if (!subs.length) return send(res, 200, { ok: true, sent: 0, failed: 0, removed: 0 });

    const key = vapidPrivateKey();
    const tag = 'bh-' + Date.now();
    let sent = 0, failed = 0;
    const dead = [];
    for (let i = 0; i < subs.length; i += 25) {
      await Promise.all(subs.slice(i, i + 25).map(async (s) => {
        const payload = { title: title[s.lang] || title.en, body: text[s.lang] || text.en, url, tag };
        try {
          const r = await sendPush(s.sub, payload, { key });
          if (r.status >= 200 && r.status < 300) sent++;
          else { failed++; if (r.status === 404 || r.status === 410) dead.push(s.id); }
        } catch (e) { failed++; }
      }));
    }
    const cmds = [['SET', 'bh:push:last', JSON.stringify({ t: Date.now(), title: title.en, sent, failed, removed: dead.length })]];
    if (dead.length) cmds.push(['HDEL', 'bh:push', ...dead]);
    await kvPipeline(cmds);
    return send(res, 200, { ok: true, sent, failed, removed: dead.length });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
};
