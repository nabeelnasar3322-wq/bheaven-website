// Minimal Upstash Redis REST client (no dependencies).
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function pipeline(cmds) {
  if (!URL_ || !TOKEN) throw new Error('Redis env vars missing');
  if (!cmds.length) return [];
  const r = await fetch(URL_ + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error('Redis ' + r.status);
  const out = await r.json();
  return out.map((x) => x.result);
}

// Calendar date in Dubai (UTC+4, no DST)
function dubaiDate(offsetDays = 0) {
  const d = new Date(Date.now() + 4 * 3600e3 - offsetDays * 864e5);
  return d.toISOString().slice(0, 10);
}
function dubaiHour() {
  return new Date(Date.now() + 4 * 3600e3).getUTCHours();
}

module.exports = { pipeline, dubaiDate, dubaiHour };
