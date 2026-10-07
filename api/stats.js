const { isAuthed, send, kvPipeline, dubaiDay } = require('./_lib');

const TYPES = ['dish_open', 'pick_add', 'picks_send', 'cat_view', 'lang', 'mode', 'visit'];

module.exports = async (req, res) => {
  if (!isAuthed(req)) return send(res, 401, { error: 'Sign in required' });
  const days = Math.min(Math.max(parseInt(req.query && req.query.days, 10) || 14, 1), 90);
  try {
    const dates = Array.from({ length: days }, (_, i) => dubaiDay(-(days - 1 - i)));
    const cmds = [];
    dates.forEach((d) => { TYPES.forEach((t) => cmds.push(['HGETALL', `bh:${d}:${t}`])); cmds.push(['PFCOUNT', `bh:${d}:users`]); });
    const out = await kvPipeline(cmds);
    const per = TYPES.length + 1;
    const daily = [];
    const totals = {};
    TYPES.forEach((t) => (totals[t] = {}));
    dates.forEach((d, i) => {
      const row = { date: d, visitors: Number(out[i * per + TYPES.length]) || 0 };
      TYPES.forEach((t, j) => {
        const flat = out[i * per + j] || [];
        let sum = 0;
        for (let k = 0; k < flat.length; k += 2) {
          const n = Number(flat[k + 1]) || 0;
          sum += n;
          totals[t][flat[k]] = (totals[t][flat[k]] || 0) + n;
        }
        row[t] = sum;
      });
      daily.push(row);
    });
    return send(res, 200, { days, daily, totals });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
};
