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
  /* parallax */
  var SP = [.4, .8, 1.2, 1.6, 2], DP = [0, 1, 2, 3, 4], PX = 0, PY = 0, TX = 0, TY = 0, raf = 0;
  function par(now) {
    if (!visible) { raf = 0; return; }
    var t = now / 1000, r = grid.getBoundingClientRect(), vh = innerHeight;
    var c = ((vh - r.top) / (vh + r.height)) - .5;
    c = Math.max(-.7, Math.min(.7, c));
    var mob = innerWidth < 820, m = mob ? .3 : 1;
    PX += (TX - PX) * .08; PY += (TY - PY) * .08;
    var dx = Math.sin(t * .7), dy = Math.cos(t * .5);
    tiles.forEach(function (tl, k) {
      var top = r.top + tl.el.offsetTop,
        rv = Math.max(0, Math.min(1, (vh * .92 - top - k * 28) / (vh * .3))),
        e = rv * rv * (3 - 2 * rv), u = 1 - e,
        d = k % 2 ? 1 : -1,
        y = (-c * SP[k] * 260 + Math.sin(t * .9 + k * 1.3) * 18) * m + u * (mob ? 50 : 110),
        z = (DP[k] * 26 + Math.sin(t * .8 + k) * 45) * m,
        rx = (-c * 26 + PY * -9 + dy * 8) * m + u * (mob ? 14 : 28),
        ry = (d * c * 18 + PX * 12 + dx * 13 + d * 4) * m,
        s = (1 - Math.abs(c) * .08) * (.86 + .14 * e);
      tl.el.style.opacity = e.toFixed(3);
      if (reduce) return; /* gentle mode: fades only, no 3D movement */
      tl.el.style.transform = 'translate3d(' + (PX * DP[k] * 6).toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(0) + 'px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
    });
    raf = requestAnimationFrame(par);
  }
  function aim(x, y) { TX = (x / innerWidth - .5) * 2; TY = (y / innerHeight - .5) * 2; }
  addEventListener('pointermove', function (e) { aim(e.clientX, e.clientY); }, { passive: true });
  addEventListener('touchmove', function (e) { var q = e.touches[0]; if (q) aim(q.clientX, q.clientY); }, { passive: true });
  function setVisible(v) {
    visible = v;
    if (v && !raf) raf = requestAnimationFrame(par);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { setVisible(es[0].isIntersecting); }, { rootMargin: '200px 0px' }).observe(grid);
  } else { raf = requestAnimationFrame(par); }
  POOL.forEach(function (p) { var i = new Image(); i.src = '/' + p[0] + '.webp'; });
  start();
})();
