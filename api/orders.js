// Table orders: guests send from /order (public), kitchen and floor staff work them from /staff (PIN).
// Storage: one JSON record per order plus a sorted set of open order ids, both in Vercel KV.
// Statuses: new -> checked -> preparing -> ready -> served. Cancelled is allowed before ready.
const crypto = require('crypto');
const { body, send, kvPipeline, safeEq, rateHit, rateCount } = require('./_lib');

const OPEN = 'bh:ord:open';
const RECORD_TTL = 60 * 60 * 24 * 2;     // order records expire after 2 days
const OPEN_WINDOW_MS = 24 * 3600e3;      // anything still open after 24h is dropped from the board
const NEXT = { new: ['checked', 'cancelled'], checked: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'], ready: ['served'] };
const MAX_PIN_FAILS = 10, PIN_WINDOW = 15 * 60;
const MAX_ORDERS = 15, ORDER_WINDOW = 10 * 60;
const key = (id) => 'bh:ord:' + id;

async function checkStaff(req, res) {
  if (!process.env.STAFF_PIN) { send(res, 500, { error: 'Staff screen is not set up yet (STAFF_PIN is missing).' }); return false; }
  if ((await rateCount(req, 'staff')) >= MAX_PIN_FAILS) {
    res.setHeader('Retry-After', String(PIN_WINDOW));
    send(res, 429, { error: 'Too many wrong PINs. Wait 15 minutes and try again.' });
    return false;
  }
  if (!safeEq(String(req.headers['x-staff-pin'] || ''), process.env.STAFF_PIN)) {
    await rateHit(req, 'staff', PIN_WINDOW);
    send(res, 401, { error: 'Wrong PIN' });
    return false;
  }
  return true;
}

async function listOpen() {
  const [ids] = await kvPipeline([['ZRANGE', OPEN, 0, 199]]);
  if (!ids || !ids.length) return [];
  const [vals] = await kvPipeline([['MGET', ...ids.map(key)]]);
  return (vals || []).filter(Boolean).map((v) => JSON.parse(v));  // oldest first
}

function isStaffPin(req) {
  return !!process.env.STAFF_PIN && safeEq(String(req.headers['x-staff-pin'] || ''), process.env.STAFF_PIN);
}

async function createOrder(req, b, res) {
  // Waiters send with the staff PIN and are not counted against the guest order limit.
  if (!isStaffPin(req) && (await rateHit(req, 'order', ORDER_WINDOW)) > MAX_ORDERS) {
    return send(res, 429, { error: 'Too many orders from this device in a short time. Please ask your waiter.' });
  }
  const table = String(b.table || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{1,6}$/.test(table)) return send(res, 400, { error: 'Please enter a valid table number.' });
  // s = chair number at the table (1-8); 0 means the order is not tied to a chair.
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 60).map((i) => {
    const s = Math.floor(Number(i && i.s));
    return {
      n: String((i && i.n) || '').trim().slice(0, 80),
      q: Math.floor(Number(i && i.q)),
      s: s >= 1 && s <= 8 ? s : 0,
    };
  }).filter((i) => i.n && i.q >= 1 && i.q <= 20);
  if (!items.length) return send(res, 400, { error: 'Your order is empty.' });
  const note = String(b.note || '').trim().slice(0, 300);
  const now = Date.now();
  const id = crypto.randomBytes(5).toString('hex');
  const order = { id, table, items, note, status: 'new', createdAt: now, updatedAt: now, readyAt: null };
  await kvPipeline([
    ['SET', key(id), JSON.stringify(order), 'EX', RECORD_TTL],
    ['ZADD', OPEN, now, id],
    ['ZREMRANGEBYSCORE', OPEN, 0, now - OPEN_WINDOW_MS],
  ]);
  return send(res, 201, { id, table });
}

async function updateStatus(b, res) {
  const id = String(b.id || '');
  const to = String(b.status || '');
  if (!/^[a-f0-9]{10}$/.test(id) || !['checked', 'preparing', 'ready', 'served', 'cancelled'].includes(to)) {
    return send(res, 400, { error: 'Invalid order update.' });
  }
  const [raw] = await kvPipeline([['GET', key(id)]]);
  if (!raw) return send(res, 404, { error: 'Order not found. It may have expired.' });
  const order = JSON.parse(raw);
  if (!(NEXT[order.status] || []).includes(to)) {
    return send(res, 409, { error: `This order is already ${order.status}.`, order });
  }
  const now = Date.now();
  order.status = to;
  order.updatedAt = now;
  if (to === 'ready') order.readyAt = now;
  const cmds = [['SET', key(id), JSON.stringify(order), 'EX', RECORD_TTL]];
  if (to === 'served' || to === 'cancelled') cmds.push(['ZREM', OPEN, id]);
  await kvPipeline(cmds);
  return send(res, 200, { order });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  try {
    if (req.method === 'GET') {
      if (!(await checkStaff(req, res))) return;
      return send(res, 200, { orders: await listOpen(), now: Date.now() });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const b = body(req);
    if (b.action === 'status') {
      if (!(await checkStaff(req, res))) return;
      return updateStatus(b, res);
    }
    return createOrder(req, b, res);
  } catch (e) {
    return send(res, 500, { error: 'Something went wrong. Please ask your waiter.' });
  }
};
