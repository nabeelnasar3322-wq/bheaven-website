// Public endpoint used by the installed app: get the public key, subscribe or unsubscribe a phone.
// Subscriptions live in Vercel KV (hash bh:push). Nothing personal is stored: just the browser's push address.
const crypto = require('crypto');
const { body, send, kvPipeline, rateHit } = require('./_lib');
const { configured, ENDPOINT_OK, fromB64u } = require('./_push');

const LANGS = { en: 1, es: 1, ar: 1 };
const idOf = (endpoint) => crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 32);

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      return send(res, 200, { enabled: configured(), key: configured() ? process.env.VAPID_PUBLIC_KEY : null });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!configured()) return send(res, 503, { error: 'Notifications are not set up yet' });
    const b = body(req);

    // Public endpoint: stop one visitor from flooding it (generous for real phones).
    if (b.action === 'subscribe' || b.action === 'unsubscribe') {
      if ((await rateHit(req, 'push', 3600, { local: true })) > 30) return send(res, 429, { error: 'Too many requests. Try again later.' });
    }

    if (b.action === 'unsubscribe') {
      if (typeof b.endpoint !== 'string' || b.endpoint.length > 600) return send(res, 400, { error: 'Bad request' });
      await kvPipeline([['HDEL', 'bh:push', idOf(b.endpoint)]]);
      return send(res, 200, { ok: true });
    }

    if (b.action === 'subscribe') {
      const s = b.sub || {};
      const k = s.keys || {};
      if (typeof s.endpoint !== 'string' || s.endpoint.length > 600 || !ENDPOINT_OK.test(s.endpoint)) return send(res, 400, { error: 'Unsupported push service' });
      if (typeof k.p256dh !== 'string' || typeof k.auth !== 'string') return send(res, 400, { error: 'Bad subscription' });
      if (fromB64u(k.p256dh).length !== 65 || fromB64u(k.auth).length !== 16) return send(res, 400, { error: 'Bad subscription keys' });
      const lang = LANGS[b.lang] ? b.lang : 'en';
      const [count] = await kvPipeline([['HLEN', 'bh:push']]);
      const id = idOf(s.endpoint);
      if (Number(count) > 50000) return send(res, 503, { error: 'Too many subscribers' });
      const rec = JSON.stringify({ sub: { endpoint: s.endpoint, keys: { p256dh: k.p256dh, auth: k.auth } }, lang, t: Date.now() });
      await kvPipeline([['HSET', 'bh:push', id, rec]]);
      return send(res, 200, { ok: true });
    }
    return send(res, 400, { error: 'Unknown action' });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
};
