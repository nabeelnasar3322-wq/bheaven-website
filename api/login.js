const { safeEq, makeSession, sessionCookie, body, send, isAuthed } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'GET') return send(res, 200, { authed: isAuthed(req) });
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', sessionCookie('', 0));
    return send(res, 200, { ok: true });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SECRET) return send(res, 500, { error: 'Admin is not configured yet' });
  const { password } = body(req);
  if (typeof password !== 'string' || !safeEq(password, process.env.ADMIN_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 700)); // slow down guessing
    return send(res, 401, { error: 'Wrong password' });
  }
  res.setHeader('Set-Cookie', sessionCookie(makeSession(), 12 * 3600));
  return send(res, 200, { ok: true });
};
