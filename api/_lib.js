// Shared helpers for the B-Heaven admin API (Vercel Node functions, no dependencies).
const crypto = require('crypto');

const REPO = process.env.GITHUB_REPO || 'nabeelnasar3322-wq/bheaven-website';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const MENU_FILE = 'menu/index.html';
const COOKIE = 'bh_admin';
const SESSION_HOURS = 12;

function b64u(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function sign(payload) {
  return b64u(crypto.createHmac('sha256', process.env.ADMIN_SECRET || '').update(payload).digest());
}
function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function makeSession() {
  // Never sign a session with an empty key: that would let anyone forge an admin cookie.
  if (!process.env.ADMIN_SECRET) throw new Error('Admin is not configured');
  const payload = b64u(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600e3 }));
  return payload + '.' + sign(payload);
}
function readCookie(req, name) {
  const m = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : '';
}
function isAuthed(req) {
  if (!process.env.ADMIN_SECRET || !process.env.ADMIN_PASSWORD) return false;
  const tok = readCookie(req, COOKIE);
  const [payload, sig] = tok.split('.');
  if (!payload || !sig || !safeEq(sig, sign(payload))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64').toString()).exp > Date.now(); } catch (e) { return false; }
}
function sessionCookie(value, maxAge) {
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}
function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

// ---- GitHub (contents API) ----
async function gh(path, opts = {}) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}${opts.method === 'PUT' ? '' : '?ref=' + BRANCH}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'bheaven-admin',
      ...(opts.headers || {}),
    },
  });
  return r;
}
async function readMenuFile() {
  const r = await gh(MENU_FILE);
  if (!r.ok) throw new Error('GitHub read failed (' + r.status + ')');
  const j = await r.json();
  return { text: Buffer.from(j.content, 'base64').toString('utf8'), sha: j.sha };
}

// ---- Upstash Redis (REST) — Vercel KV ----
const KV_URL = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
async function kvPipeline(cmds) {
  if (!KV_URL() || !KV_TOKEN()) throw new Error('Storage not connected');
  const r = await fetch(KV_URL() + '/pipeline', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error('Storage error ' + r.status);
  return (await r.json()).map((x) => x.result);
}

// ---- Rate limiting (per visitor, counted in KV; falls back to this server's memory if KV is down) ----
const mem = new Map();
function clientIp(req) {
  const h = req.headers || {};
  return String(h['x-real-ip'] || String(h['x-forwarded-for'] || '').split(',')[0] || 'unknown').trim().slice(0, 64) || 'unknown';
}
function rlKey(req, name) {
  return `bh:rl:${name}:` + crypto.createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 16);
}
function memHit(key, windowSec) {
  const now = Date.now();
  let e = mem.get(key);
  if (!e || e.until <= now) e = { n: 0, until: now + windowSec * 1000 };
  e.n += 1;
  mem.set(key, e);
  if (mem.size > 5000) for (const [k, v] of mem) if (v.until <= now) mem.delete(k);
  return e.n;
}
function memCount(key) {
  const e = mem.get(key);
  return e && e.until > Date.now() ? e.n : 0;
}
// Count one event for this visitor; returns how many happened in the window (including this one).
async function rateHit(req, name, windowSec, opts = {}) {
  const key = rlKey(req, name);
  if (opts.local) return memHit(key, windowSec);
  try {
    const [n] = await kvPipeline([['INCR', key]]);
    if (Number(n) === 1) await kvPipeline([['EXPIRE', key, windowSec]]);
    return Number(n);
  } catch (e) { return memHit(key, windowSec); }
}
// How many events this visitor already has in the window (does not count a new one).
async function rateCount(req, name) {
  const key = rlKey(req, name);
  try {
    const [n] = await kvPipeline([['GET', key]]);
    return Math.max(Number(n) || 0, memCount(key));
  } catch (e) { return memCount(key); }
}
async function rateReset(req, name) {
  const key = rlKey(req, name);
  mem.delete(key);
  try { await kvPipeline([['DEL', key]]); } catch (e) { /* ignore */ }
}

// Dubai calendar day, YYYY-MM-DD
function dubaiDay(offsetDays = 0) {
  return new Date(Date.now() + 4 * 3600e3 + offsetDays * 86400e3).toISOString().slice(0, 10);
}

module.exports = { isAuthed, makeSession, sessionCookie, safeEq, body, send, readMenuFile, gh, MENU_FILE, kvPipeline, dubaiDay, rateHit, rateCount, rateReset };
