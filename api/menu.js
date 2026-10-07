// Read and update the food menu data inside menu/index.html via the GitHub API.
// v1 scope: existing dishes can have their description, price, allergens and Spanish text edited.
// Names, categories and order are locked because photos, daily picks and ingredient stories key off them.
const { isAuthed, body, send, readMenuFile, gh, MENU_FILE } = require('./_lib');

const RE_M = /^const M = (\{.*\});$/m;
const RE_ES = /^const ES=(\{.*\});$/m;
const RE_PH = /^const MENU_PHOTOS = (\{.*\});$/m;
const ALLERGENS = ['C', 'G', 'D', 'S', 'N', 'F', 'E', 'M', 'P', 'SE', 'SO', 'SUL', 'V'];
const ser = (o) => JSON.stringify(o).replace(/<\//g, '<\\/');

function parse(text) {
  const m = text.match(RE_M), e = text.match(RE_ES);
  if (!m || !e) throw new Error('Could not find the menu data in menu/index.html');
  return { menu: JSON.parse(m[1]), es: JSON.parse(e[1]) };
}

module.exports = async (req, res) => {
  if (!isAuthed(req)) return send(res, 401, { error: 'Sign in required' });
  if (!process.env.GITHUB_TOKEN) return send(res, 500, { error: 'GITHUB_TOKEN is not set' });
  try {
    if (req.method === 'GET') {
      const { text, sha } = await readMenuFile();
      const { menu, es } = parse(text);
      const spanish = {};
      Object.values(menu).forEach((ds) => ds.forEach((d) => { if (es[d.d]) spanish[d.d] = es[d.d]; }));
      const ph = text.match(RE_PH);
      return send(res, 200, { menu, spanish, sha, allergens: ALLERGENS, photos: ph ? JSON.parse(ph[1]) : {} });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

    const { menu: next, spanish = {}, sha: baseSha } = body(req);
    const { text, sha } = await readMenuFile();
    if (baseSha !== sha) return send(res, 409, { error: 'The menu was changed somewhere else. Reload and try again.' });
    const { menu: cur, es } = parse(text);

    // validate: structure and names must match; only d / p / t may change
    const catKeys = Object.keys(cur);
    if (!next || typeof next !== 'object' || Object.keys(next).join('|') !== catKeys.join('|')) return send(res, 400, { error: 'Categories cannot be changed here' });
    let changed = 0;
    for (const k of catKeys) {
      if (!Array.isArray(next[k]) || next[k].length !== cur[k].length) return send(res, 400, { error: `Dish list in "${k}" cannot be added to or removed here` });
      for (let i = 0; i < cur[k].length; i++) {
        const a = cur[k][i], b = next[k][i];
        if (!b || b.n !== a.n) return send(res, 400, { error: `Dish names are locked (${a.n})` });
        if (typeof b.d !== 'string' || b.d.length > 420) return send(res, 400, { error: `Description too long for ${a.n}` });
        if (typeof b.p !== 'string' || !/^AED \d{1,4}$/.test(b.p)) return send(res, 400, { error: `Price for ${a.n} must look like "AED 55"` });
        if (!Array.isArray(b.t) || b.t.some((t) => !ALLERGENS.includes(t))) return send(res, 400, { error: `Bad allergen code on ${a.n}` });
        const clean = { n: a.n, d: b.d.trim(), p: b.p, t: [...new Set(b.t)] };
        if (clean.d !== a.d || clean.p !== a.p || clean.t.join() !== a.t.join()) changed++;
        // carry through any extra fields untouched
        cur[k][i] = { ...a, ...clean };
      }
    }
    // Spanish text: only for descriptions that exist in the submitted menu
    const descs = new Set(Object.values(cur).flat().map((d) => d.d));
    let esChanged = 0;
    for (const [en, sp] of Object.entries(spanish)) {
      if (!descs.has(en) || typeof sp !== 'string' || sp.length > 600) continue;
      if (sp.trim() && es[en] !== sp.trim()) { es[en] = sp.trim(); esChanged++; }
    }
    if (!changed && !esChanged) return send(res, 200, { ok: true, unchanged: true, sha });

    let out = text.replace(RE_M, () => 'const M = ' + ser(cur) + ';').replace(RE_ES, () => 'const ES=' + ser(es) + ';');
    parse(out); // refuse to commit anything that no longer parses

    const r = await gh(MENU_FILE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Menu: update ${changed} dish${changed === 1 ? '' : 'es'}${esChanged ? ` and ${esChanged} Spanish line${esChanged === 1 ? '' : 's'}` : ''} via dashboard`,
        content: Buffer.from(out, 'utf8').toString('base64'),
        sha,
        branch: process.env.GITHUB_BRANCH || 'main',
      }),
    });
    if (!r.ok) return send(res, 502, { error: 'GitHub rejected the save (' + r.status + ')' });
    const j = await r.json();
    return send(res, 200, { ok: true, changed, esChanged, sha: j.content.sha });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
};
