// Replace one food dish's photo. The browser sends a transparent-background WebP (already resized);
// we validate it, commit it to menu/img/<hash>.webp, then point that dish at it in MENU_PHOTOS.
const crypto = require('crypto');
const { isAuthed, body, send, readMenuFile, gh, MENU_FILE } = require('./_lib');

const RE_M = /^const M = (\{.*\});$/m;
const RE_PH = /^const MENU_PHOTOS = (\{.*\});$/m;
const MAX_BYTES = 300 * 1024;
const BRANCH = () => process.env.GITHUB_BRANCH || 'main';

// Returns {w,h,alpha} for a WebP buffer, or null if unsupported.
function webpInfo(b) {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const t = b.toString('ascii', 12, 16);
  if (t === 'VP8X') {
    return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3), alpha: !!(b[20] & 0x10) };
  }
  if (t === 'VP8L' && b[20] === 0x2f) {
    const bits = b.readUInt32LE(21);
    return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >> 14) & 0x3fff), alpha: !!((bits >> 28) & 1) };
  }
  return null;
}

module.exports = async (req, res) => {
  if (!isAuthed(req)) return send(res, 401, { error: 'Sign in required' });
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!process.env.GITHUB_TOKEN) return send(res, 500, { error: 'GITHUB_TOKEN is not set' });
  try {
    const { name, image } = body(req);
    if (typeof name !== 'string' || typeof image !== 'string') return send(res, 400, { error: 'Missing dish or image' });
    const buf = Buffer.from(image.replace(/^data:image\/webp;base64,/, ''), 'base64');
    if (!buf.length || buf.length > MAX_BYTES) return send(res, 400, { error: 'Image must be under 300 KB after resizing' });
    const info = webpInfo(buf);
    if (!info || !info.alpha) return send(res, 400, { error: 'Image needs a transparent background (a cutout)' });
    if (info.w > 1400 || info.h > 1400 || info.w < 200 || info.h < 200) return send(res, 400, { error: 'Image size must be between 200 and 1400 px' });

    // check the dish exists before anything is committed
    {
      const { text } = await readMenuFile();
      const m = text.match(RE_M);
      if (!m) return send(res, 500, { error: 'Could not find the menu data' });
      if (!Object.values(JSON.parse(m[1])).flat().some((d) => d.n === name)) return send(res, 400, { error: 'Unknown dish' });
    }

    const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
    const path = `menu/img/${hash}.webp`;
    const rel = `img/${hash}.webp`;

    // 1) upload the image file (a repeat of the same file is fine)
    const up = await gh(path, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Menu photo: ${name} (image) via dashboard`, content: buf.toString('base64'), branch: BRANCH() }),
    });
    if (!up.ok && up.status !== 422) return send(res, 502, { error: 'GitHub rejected the image (' + up.status + ')' });

    // 2) point the dish at it (retry once if the menu file moved underneath us)
    for (let attempt = 0; attempt < 2; attempt++) {
      const { text, sha } = await readMenuFile();
      const m = text.match(RE_M), p = text.match(RE_PH);
      if (!m || !p) return send(res, 500, { error: 'Could not find the menu data' });
      const dishes = new Set(Object.values(JSON.parse(m[1])).flat().map((d) => d.n));
      if (!dishes.has(name)) return send(res, 400, { error: 'Unknown dish' });
      const photos = JSON.parse(p[1]);
      photos[name] = rel;
      const out = text.replace(RE_PH, () => 'const MENU_PHOTOS = ' + JSON.stringify(photos) + ';');
      if (!RE_PH.test(out) || !RE_M.test(out)) return send(res, 500, { error: 'Safety check failed' });
      const r = await gh(MENU_FILE, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Menu photo: ${name} via dashboard`, content: Buffer.from(out, 'utf8').toString('base64'), sha, branch: BRANCH() }),
      });
      if (r.ok) { const j = await r.json(); return send(res, 200, { ok: true, photo: rel, sha: j.content.sha }); }
      if (r.status !== 409 && r.status !== 422) return send(res, 502, { error: 'GitHub rejected the save (' + r.status + ')' });
    }
    return send(res, 409, { error: 'The menu was changed somewhere else. Reload and try again.' });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
};
