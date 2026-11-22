/* The Rooftop gallery: each tile swaps its photo every 3s (staggered, never the same photo twice on screen)
   with a 3D scroll / pointer / idle-drift parallax. Pauses when off-screen or the tab is hidden. */
(function () {
  var grid = document.getElementById('rgGrid');
  if (!grid) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var POOL = [
    ['BHVNterrace-1', 'Terrace'], ['dome-night', 'Dome at night'], ['restaurant-lounge', 'Lounge'],
    ['terrace-lounge', 'Seating'], ['bar-counter', 'Bar'], ['cocktails', 'Cocktails'],
    ['pool-day', 'Poolside'], ['live-guitar-neon', 'Live nights'], ['hero-2', 'Sunset'],
    ['barcelofacade', 'Barceló Al Jaddaf']
  ];
  var ALT = {
    'BHVNterrace-1': 'Rooftop terrace at B·Heaven with a green pergola, pale blue sofas and the Dubai skyline',
    'dome-night': 'The B·Heaven dome pavilion beside the pool at night',
    'restaurant-lounge': 'Indoor dining lounge at B·Heaven, Barceló Al Jaddaf',
    'terrace-lounge': 'Terrace lounge seating at B·Heaven',
    'bar-counter': 'The bar at B·Heaven rooftop lounge',
    'cocktails': 'Signature cocktails at B·Heaven rooftop bar',
    'pool-day': 'Poolside lounge at B·Heaven by day',
    'live-guitar-neon': 'Live guitar night at B·Heaven rooftop',
    'hero-2': 'Sunset on the B·Heaven rooftop, Al Jaddaf',
    'barcelofacade': 'Barceló Al Jaddaf hotel exterior'
  };
  var tiles = [].slice.call(grid.querySelectorAll('.rg-t')).map(function (el, k) {
    var img = el.querySelector('img');
    var name = (img.getAttribute('src').match(/([^\/]+)\.webp/) || [])[1];
    var idx = 0;
    POOL.forEach(function (p, i) { if (p[0] === name) idx = i; });
    img.classList.add('on');
    return { el: el, cap: el.querySelector('.rg-cap'), cur: img, idx: idx };
  });
  var shown = tiles.map(function (t) { return t.idx; });
  var interval = 3000, visible = true, timers = [];

  function swap(k) {
    if (!visible || document.hidden) return;
    var free = [];
    for (var i = 0; i < POOL.length; i++) if (shown.indexOf(i) < 0) free.push(i);
    var idx = free[Math.floor(Math.random() * free.length)], t = tiles[k], p = POOL[idx];
    var img = new Image();
    img.alt = ALT[p[0]] || p[1];
    img.onload = function () {
      t.el.insertBefore(img, t.cap);
      requestAnimationFrame(function () { requestAnimationFrame(function () { img.classList.add('on'); }); });
      var old = t.cur; old.classList.remove('on');
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 1200);
      t.cur = img; shown[k] = idx;
      t.cap.innerHTML = '<b>0' + (k + 1) + '</b>' + p[1];
    };
    img.src = '/' + p[0] + '.webp';
  }
  function start() {
    tiles.forEach(function (t, k) {
      timers.push(setTimeout(function () {
        timers.push(setInterval(function () { swap(k); }, interval));
      }, k * (interval / tiles.length)));
    });
  }
  /* entrance only: each tile glides in one by one as you scroll down, then sits fixed in the grid */
  var ticking = false, mob = innerWidth < 820;
  function par() {
    ticking = false;
    var r = grid.getBoundingClientRect(), vh = innerHeight;
    mob = innerWidth < 820;
    tiles.forEach(function (tl, k) {
      var top = r.top + tl.el.offsetTop,
        rv = mob
          ? Math.max(0, Math.min(1, (vh * .98 - (top + tl.el.offsetHeight * .5) - k * 10) / (vh * .16)))
          : Math.max(0, Math.min(1, (vh * .92 - top - k * 28) / (vh * .3))),
        e = rv * rv * (3 - 2 * rv), u = 1 - e;
      tl.el.style.opacity = e.toFixed(3);
      if (reduce) return;
      tl.el.style.transform = u < .002 ? 'none' :
        'translate3d(0,' + (u * (mob ? 50 : 110)).toFixed(1) + 'px,0) rotateX(' + (u * (mob ? 14 : 28)).toFixed(2) + 'deg) scale(' + (.86 + .14 * e).toFixed(3) + ')';
    });
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(par); } }
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  par();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { rootMargin: '200px 0px' }).observe(grid);
  }
  /* photos are fixed: no automatic swapping (start() intentionally not called) */
})();
