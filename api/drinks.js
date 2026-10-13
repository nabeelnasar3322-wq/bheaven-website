// Read and update the DRINKS part of the menu (menu/index.html) via the GitHub API.
// Drinks are built from several code lists, so the dashboard never edits those. It writes one line,
// `const DOV = {"edit":{},"add":[],"del":[]};`, which the page applies on top of the built-in list:
//   edit: price / description changes   add: new drinks   del: removed drinks
// Keys look like "Category|Group|Name" (Group is empty for cocktails).
const vm = require('vm');
const { isAuthed, body, send, readMenuFile, gh, MENU_FILE } = require('./_lib');

const RE_DOV = /^const DOV = (\{.*\});$/m;
const RE_ES = /^const ES=(\{.*\});$/m;
const ser = (o) => JSON.stringify(o).replace(/<\//g, '<\\/');
const PROTECTED = ['Heaven Mule', 'Paloma Picante']; // featured on the page, cannot be removed

// kind: how the price is edited. desc: description editable. es: Spanish editable.
const CATS = {
  'Signature cocktails': { kind: 'single', desc: true, es: true },
  'Clásico cocktails': { kind: 'pair', desc: true, es: true, labels: ['Glass', 'Bottle'] },
  'B-Good': { kind: 'single', desc: false },
  'Wine & bubbles': { kind: 'board', desc: true, labels: ['Glass', 'Bottle'] },
  Beers: { kind: 'beer', desc: true },
  Spirits: { kind: 'board', desc: false, labels: ['Glass', 'Bottle'] },
  'Coffee, tea & soft': { kind: 'soft', desc: false },
};
const kf = (k, d) => k + '|' + (d.grp || '') + '|' + d.n;
const isInt = (v) => Number.isInteger(v) && v >= 1 && v <= 99999;
const gb = (c1, c2) => (c1 != null && c2 != null ? `AED ${c1} glass · ${c2} bottle` : c1 != null ? `AED ${c1} glass` : `AED ${c2} bottle`);

function run(text, withOverrides) {
  const lines = (withOverrides ? text : text.replace(RE_DOV, 'const DOV = {"edit":{},"add":[],"del":[]};')).split('\n');
  const i = lines.findIndex((l) => l.startsWith('const M = {'));
  const j = lines.findIndex((l, n) => n > i && l.startsWith('const catOf'));
  if (i < 0 || j < 0) throw new Error('Could not find the drinks data in menu/index.html');
  return vm.runInNewContext(lines.slice(i, j).join('\n') + '\n;({DM,DOV,GPRE})', {}, { timeout: 5000 });
}

// turn one submitted price block into the fields the page needs, or throw a friendly error
function price(cat, n, x) {
  const m = CATS[cat], bad = (t) => { throw new Error(`${n}: ${t}`); };
  x = x || {};
  if (m.kind === 'single') { if (!isInt(x.c1)) bad('enter a price in AED (a whole number)'); return { p: `AED ${x.c1}` }; }
  if (m.kind === 'pair') { if (!isInt(x.c1) || !isInt(x.c2)) bad('enter both glass and bottle prices'); return { p: `AED ${x.c1} glass · ${x.c2} bottle` }; }
  if (m.kind === 'board') {
    const a = x.c1 == null || x.c1 === '' ? null : x.c1, b = x.c2 == null || x.c2 === '' ? null : x.c2;
    if ((a != null && !isInt(a)) || (b != null && !isInt(b)) || (a == null && b == null)) bad('enter a glass and/or bottle price');
    return { p: gb(a, b), c1: a, c2: b };
  }
  const s = String(x.c1 == null ? '' : x.c1).trim();
  if (m.kind === 'beer') { if (!/^\d{1,4}( \| \d{1,4})?$/.test(s)) bad('price like 45, or 40 | 55 for small | large'); return { p: 'AED ' + s, c1: s }; }
  if (!/^\d{1,4}$/.test(s)) bad('enter a price in AED (a whole number)'); // soft
  return { p: 'AED ' + s, c1: s };
}

function describe(DM, DOV) {
  const added = new Map((DOV.add || []).map((a) => [kf(a.k, a), a.glass]));
  const items = [];
  Object.keys(CATS).forEach((k) => (DM[k] || []).forEach((d) => {
    const key = kf(k, d), m = CATS[k];
    let c1 = d.c1, c2 = d.c2;
    if (m.kind === 'single') c1 = +(String(d.p).match(/\d+/) || [0])[0];
    if (m.kind === 'pair') { const mm = String(d.p).match(/(\d+)\D+glass\D+(\d+)/); c1 = mm ? +mm[1] : null; c2 = mm ? +mm[2] : null; }
    items.push({ key, k, grp: d.grp || '', n: d.n, d: d.d || '', c1: c1 == null ? null : c1, c2: c2 == null ? null : c2, added: added.has(key), glass: added.get(key) || '', canDelete: PROTECTED.indexOf(d.n) < 0 });
  }));
  return items;
}

module.exports = async (req, res) => {
  if (!isAuthed(req)) return send(res, 401, { error: 'Sign in required' });
  if (!process.env.GITHUB_TOKEN) return send(res, 500, { error: 'GITHUB_TOKEN is not set' });
  try {
    const { text, sha } = await readMenuFile();
    if (!RE_DOV.test(text) || !RE_ES.test(text)) throw new Error('Could not find the drinks data in menu/index.html');
    const es = JSON.parse(text.match(RE_ES)[1]);

    if (req.method === 'GET') {
      const cur = run(text, true), base = run(text, false);
      const groups = {};
      Object.keys(CATS).forEach((k) => { groups[k] = [...new Set((base.DM[k] || []).map((d) => d.grp).filter(Boolean))]; });
      const items = describe(cur.DM, cur.DOV);
      const spanish = {};
      items.forEach((i) => { if (CATS[i.k].es && es[i.d]) spanish[i.d] = es[i.d]; });
      return send(res, 200, { items, cats: CATS, groups, glass: Object.keys(cur.GPRE), spanish, dov: cur.DOV, sha });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

    const b = body(req);
    if (b.sha !== sha) return send(res, 409, { error: 'The menu was changed somewhere else. Reload and try again.' });
    const base = run(text, false);
    const baseByKey = {};
    Object.keys(CATS).forEach((k) => (base.DM[k] || []).forEach((d) => { baseByKey[kf(k, d)] = { k, d }; }));
    const inDov = b.dov || {};
    const edit = {}, add = [], del = [];
    let count = 0;

    for (const key of inDov.del || []) {
      if (!baseByKey[key]) continue;
      if (PROTECTED.indexOf(baseByKey[key].d.n) > -1) return send(res, 400, { error: `${baseByKey[key].d.n} is featured on the page and cannot be removed` });
      if (!del.includes(key)) del.push(key);
    }
    for (const [key, o] of Object.entries(inDov.edit || {})) {
      const bi = baseByKey[key];
      if (!bi || del.includes(key) || !o) continue;
      const m = CATS[bi.k], out = { ...price(bi.k, bi.d.n, o) };
      const p0 = bi.d;
      if (m.desc && typeof o.d === 'string') {
        if (o.d.length > 420) throw new Error(`${p0.n}: description is too long`);
        if (o.d.trim() !== (p0.d || '')) out.d = o.d.trim();
      }
      const same = out.p === p0.p && (out.d === undefined || out.d === p0.d);
      if (!same) { edit[key] = out; count++; }
    }
    const seen = new Set(Object.keys(baseByKey));
    for (const a of inDov.add || []) {
      const m = CATS[a && a.k];
      if (!m) throw new Error('Unknown drinks category');
      const n = String(a.n || '').trim();
      if (n.length < 2 || n.length > 60 || /[|<>"\\\n\r]/.test(n)) throw new Error('Drink name must be 2 to 60 letters (no | < > " or \\)');
      const grp = String(a.grp || '');
      const groups = [...new Set((base.DM[a.k] || []).map((d) => d.grp).filter(Boolean))];
      if (groups.length ? groups.indexOf(grp) < 0 : grp !== '') throw new Error(`${n}: choose a group`);
      const key = kf(a.k, { grp, n });
      if (seen.has(key)) throw new Error(`${n} already exists in that list`);
      seen.add(key);
      if (!base.GPRE[a.glass]) throw new Error(`${n}: choose a glass`);
      const rec = { k: a.k, grp: grp || undefined, n, glass: a.glass, ...price(a.k, n, a) };
      if (m.desc) { rec.d = String(a.d || '').trim(); if (rec.d.length > 420) throw new Error(`${n}: description is too long`); }
      else rec.d = grp; // boards without descriptions show the group name
      if (!rec.grp) delete rec.grp;
      add.push(rec); count++;
    }
    count += del.length;

    // Spanish for cocktail descriptions
    let esChanged = 0;
    const next = { edit, add, del };
    const merged = {};
    Object.keys(CATS).filter((k) => CATS[k].es).forEach((k) => {
      (base.DM[k] || []).forEach((d) => { if (!del.includes(kf(k, d))) merged[(edit[kf(k, d)] || {}).d !== undefined ? edit[kf(k, d)].d : d.d] = 1; });
      add.filter((a) => a.k === k).forEach((a) => { merged[a.d] = 1; });
    });
    for (const [en, sp] of Object.entries(b.spanish || {})) {
      if (!merged[en] || typeof sp !== 'string' || sp.length > 600) continue;
      if (sp.trim() && es[en] !== sp.trim()) { es[en] = sp.trim(); esChanged++; }
    }
    const oldDov = JSON.stringify(run(text, true).DOV);
    if (JSON.stringify(next) === oldDov && !esChanged) return send(res, 200, { ok: true, unchanged: true, sha });

    const out = text.replace(RE_DOV, () => 'const DOV = ' + ser(next) + ';').replace(RE_ES, () => 'const ES=' + ser(es) + ';');
    const chk = run(out, true); // refuse to commit anything that does not evaluate
    Object.keys(CATS).forEach((k) => { if (!chk.DM[k] || !chk.DM[k].length) throw new Error('A drinks list would end up empty'); });

    const r = await gh(MENU_FILE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Drinks: ${Object.keys(edit).length} edited, ${add.length} added, ${del.length} removed via dashboard`,
        content: Buffer.from(out, 'utf8').toString('base64'),
        sha,
        branch: process.env.GITHUB_BRANCH || 'main',
      }),
    });
    if (!r.ok) return send(res, 502, { error: 'GitHub rejected the save (' + r.status + ')' });
    const j = await r.json();
    return send(res, 200, { ok: true, edited: Object.keys(edit).length, added: add.length, removed: del.length, sha: j.content.sha });
  } catch (e) {
    return send(res, 400, { error: e.message });
  }
};
module.exports.run = run;
