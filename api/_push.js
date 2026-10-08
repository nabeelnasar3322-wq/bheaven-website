// Web Push without dependencies: VAPID (RFC 8292) + aes128gcm payload encryption (RFC 8291 / RFC 8188).
// Uses only Node's built-in crypto and fetch.
const crypto = require('crypto');

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// Only real push services. The endpoint is supplied by the browser, so never POST to anything else.
const ENDPOINT_OK = /^https:\/\/(?:[a-z0-9-]+\.)*(?:googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)\//i;

function configured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}
function subject() {
  return process.env.VAPID_SUBJECT || 'https://bheavendubai.com';
}

function vapidPrivateKey() {
  const pub = fromB64u(process.env.VAPID_PUBLIC_KEY);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID_PUBLIC_KEY must be an uncompressed P-256 key');
  return crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)), d: process.env.VAPID_PRIVATE_KEY },
    format: 'jwk',
  });
}

// "Authorization: vapid t=<jwt>, k=<public key>" for one push service
function vapidAuth(endpoint, key) {
  const aud = new URL(endpoint).origin;
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject() }));
  const sig = crypto.sign('sha256', Buffer.from(head + '.' + claims), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${head}.${claims}.${b64u(sig)}, k=${process.env.VAPID_PUBLIC_KEY}`;
}

// RFC 8291 section 3: encrypt one message for a subscription (single record)
function encrypt(sub, plaintext) {
  const uaPublic = fromB64u(sub.keys.p256dh);
  const authSecret = fromB64u(sub.keys.auth);
  if (uaPublic.length !== 65 || uaPublic[0] !== 4 || authSecret.length !== 16) throw new Error('Bad subscription keys');

  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey(); // 65 bytes, uncompressed
  const shared = ecdh.computeSecret(uaPublic);

  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, authSecret, keyInfo, 32));

  const salt = crypto.randomBytes(16);
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));

  const data = Buffer.concat([Buffer.from(plaintext), Buffer.from([2])]); // 0x02 = last record
  const rs = 4096;
  if (data.length + 16 > rs) throw new Error('Notification is too long');
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()]);

  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(rs, 16);
  header[20] = asPublic.length;
  return Buffer.concat([header, asPublic, body]);
}

// Resolves { status } — 201 means accepted; 404/410 means the subscription is gone.
async function sendPush(sub, payload, opts = {}) {
  if (!ENDPOINT_OK.test(sub.endpoint)) return { status: 400, error: 'endpoint not allowed' };
  const key = opts.key || vapidPrivateKey();
  const body = encrypt(sub, JSON.stringify(payload));
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: vapidAuth(sub.endpoint, key),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(body.length),
      TTL: String(opts.ttl || 86400),
      Urgency: opts.urgency || 'normal',
    },
    body,
    signal: AbortSignal.timeout(8000),
  });
  return { status: r.status };
}

module.exports = { configured, vapidPrivateKey, sendPush, encrypt, vapidAuth, ENDPOINT_OK, b64u, fromB64u };
