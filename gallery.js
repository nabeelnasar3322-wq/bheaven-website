/* Gallery: filter chips, photo count and a counter in the full-size viewer */
(function () {
  const grid = document.getElementById('gallery');
  if (!grid) return;
  const CATS = [
    ['all', 'All'],
    ['pool', 'Pool & days'],
    ['nights', 'Sunset & nights'],
    ['drinks', 'Food & drinks'],
    ['lounge', 'Lounge']
  ];
  const guess = label => {
    const t = (label || '').toLowerCase();
    if (/pool|day/.test(t)) return 'pool';
    if (/night|sunset|skyline|shisha/.test(t)) return 'nights';
    if (/cocktail|bar|drink|lunch|food|mixology/.test(t)) return 'drinks';
    return 'lounge';
  };
  const tiles = () => [...grid.querySelectorAll('.ph')];
  const setup = () => {
    if (grid.classList.contains('ig-grid') || document.getElementById('galChips')) return;
    tiles().forEach((el, i) => {
      const g = (typeof SITE !== 'undefined' && SITE.gallery[i]) || {};
      el.dataset.cat = g.cat || guess(g.label);
    });
    const bar = document.createElement('div');
    bar.className = 'gal-chips'; bar.id = 'galChips'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Gallery categories');
    bar.innerHTML = CATS.map(([k, l], i) => {
      const n = k === 'all' ? tiles().length : tiles().filter(t => t.dataset.cat === k).length;
      return n ? `<button type="button" role="tab" aria-selected="${i ? 'false' : 'true'}" class="${i ? '' : 'on'}" data-cat="${k}">${l}<i>${n}</i></button>` : '';
    }).join('');
    grid.before(bar);
    bar.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      bar.querySelectorAll('button').forEach(x => {
        const on = x === b;
        x.classList.toggle('on', on);
        x.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      const c = b.dataset.cat;
      grid.classList.add('gx-swap');
      setTimeout(() => {
        tiles().forEach(t => {
          const show = c === 'all' || t.dataset.cat === c;
          t.classList.toggle('gx-hide', !show);
          if (!show && t.classList.contains('has-img')) { t.classList.remove('has-img'); t.dataset.hadImg = '1'; }
          if (show && t.dataset.hadImg) { t.classList.add('has-img'); delete t.dataset.hadImg; }
          t.classList.add('in');
        });
        grid.classList.toggle('gx-filtered', c !== 'all');
        fill();
        grid.classList.remove('gx-swap');
      }, 260);
    });
  };

  /* No empty cells: pack the visible tiles the way the grid does, stretch tiles into leftover gaps, and if a gap
     still remains, flatten the last tall / wide tiles one by one until the grid is a perfect rectangle. */
  const fill = () => {
    if (grid.classList.contains('ig-grid')) return;
    const vis = tiles().filter(t => !t.classList.contains('gx-hide'));
    vis.forEach(t => { t.style.gridColumn = ''; t.style.gridRow = ''; });
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    if (!cols || !vis.length) return;
    const flat = grid.classList.contains('gx-filtered');  /* filtered view shows every photo as a single tile */
    const pref = vis.map(t => ({ w: flat ? 1 : Math.min(cols, t.classList.contains('wide') ? 2 : 1), h: flat ? 1 : (t.classList.contains('tall') ? 2 : 1) }));
    const pack = sz => {
      const occ = [], box = [];
      const at = (r, c) => (occ[r] || [])[c];
      const put = (k, r, c, w, h) => { for (let y = r; y < r + h; y++) { occ[y] = occ[y] || []; for (let x = c; x < c + w; x++) occ[y][x] = k; } };
      const free = (r, c, w, h) => { for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (at(y, x) !== undefined) return false; return true; };
      sz.forEach((s, k) => {
        let r = 0, c = 0, done = false;
        for (r = 0; !done; r++) for (c = 0; c + s.w <= cols; c++) if (free(r, c, s.w, s.h)) { done = true; break; }
        r--; box[k] = { r, c, w: s.w, h: s.h }; put(k, r, c, s.w, s.h);
      });
      for (let pass = 0; pass < 12; pass++) {
        let moved = false;
        for (let k = sz.length - 1; k >= 0; k--) {
          const b = box[k]; let ex = 0;
          while (b.c + b.w + ex < cols && free(b.r, b.c + b.w + ex, 1, b.h)) ex++;
          if (ex) { put(k, b.r, b.c + b.w, ex, b.h); b.w += ex; moved = true; }
        }
        if (!moved) break;
      }
      let holes = 0;
      for (let y = 0; y < occ.length; y++) for (let x = 0; x < cols; x++) if (at(y, x) === undefined) holes++;
      return { box, holes };
    };
    let sz = pref.map(p => ({ w: p.w, h: p.h })), res = pack(sz);
    for (const prop of ['h', 'w']) {
      for (let k = sz.length - 1; k >= 0 && res.holes; k--) {
        if (sz[k][prop] > 1) { sz[k][prop] = 1; res = pack(sz); }
      }
    }
    vis.forEach((t, k) => {
      const b = res.box[k];
      if (b.w !== (!flat && t.classList.contains('wide') ? Math.min(cols, 2) : 1)) t.style.gridColumn = 'span ' + b.w;
      if (b.h === 1 && !flat && t.classList.contains('tall')) t.style.gridRow = 'span 1';
    });
  };
  window.addEventListener('resize', () => { clearTimeout(fill.t); fill.t = setTimeout(fill, 150); });
  setup(); fill();
  new MutationObserver(setup).observe(grid, { attributes: true, attributeFilter: ['class'] });

  /* "3 / 12" counter in the full-size viewer */
  const lb = document.getElementById('lb');
  const img = lb && lb.querySelector('img');
  if (!img) return;
  const cnt = document.createElement('span'); cnt.className = 'lb-count';
  lb.querySelector('figure').append(cnt);
  const upd = () => {
    const list = [...grid.querySelectorAll('.ph.has-img')];
    const i = list.findIndex(t => { const im = t.querySelector('img'); return im && im.src === img.src; });
    cnt.textContent = i >= 0 ? (i + 1) + ' / ' + list.length : '';
  };
  new MutationObserver(upd).observe(img, { attributes: true, attributeFilter: ['src'] });
})();
