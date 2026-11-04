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
    bar.className = 'gal-chips'; bar.id = 'galChips'; bar.setAttribute('role', 'tablist');
    bar.innerHTML = CATS.map(([k, l], i) => {
      const n = k === 'all' ? tiles().length : tiles().filter(t => t.dataset.cat === k).length;
      return n ? `<button type="button" class="${i ? '' : 'on'}" data-cat="${k}">${l}<i>${n}</i></button>` : '';
    }).join('');
    grid.before(bar);
    bar.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      bar.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
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
        grid.classList.remove('gx-swap');
      }, 260);
    });
  };
  setup();
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
