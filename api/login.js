const { safeEq, makeSession, sessionCookie, body, send, isAuthed, rateHit, rateCount, rateReset } = require('./_lib');

const MAX_FAILS = 5;        // wrong passwords allowed...
const WINDOW_SEC = 15 * 60; // ...per visitor in this many seconds, then the visitor must wait

module.exports = async (req, res) => {
  if (req.method === 'GET') return send(res, 200, { authed: isAuthed(req) });
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', sessionCookie('', 0));
    return send(res, 200, { ok: true });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SECRET) return send(res, 500, { error: 'Admin is not configured yet' });

  // Too many wrong passwords from this visitor: stop checking and ask them to wait.
  if ((await rateCount(req, 'login')) >= MAX_FAILS) {
    res.setHeader('Retry-After', String(WINDOW_SEC));
    return send(res, 429, { error: 'Too many wrong passwords. Please wait 15 minutes and try again.' });
  }

  const { password } = body(req);
  if (typeof password !== 'string' || password.length > 200 || !safeEq(password, process.env.ADMIN_PASSWORD)) {
    await rateHit(req, 'login', WINDOW_SEC);
    await new Promise((r) => setTimeout(r, 700)); // slow down guessing
    return send(res, 401, { error: 'Wrong password' });
  }
  await rateReset(req, 'login');
  res.setHeader('Set-Cookie', sessionCookie(makeSession(), 12 * 3600));
  return send(res, 200, { ok: true });
};
