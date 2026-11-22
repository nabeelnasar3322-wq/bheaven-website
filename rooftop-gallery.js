/* The Rooftop gallery: each tile swaps its photo every 3s (staggered, never the same photo twice on screen)
   with a 3D scroll / pointer / idle-drift parallax. Pauses when off-screen or the tab is hidden. */
(function () {
  var grid = document.getElementById('rgGrid');
  if (!grid) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var POOL = [
    ['BHVNterrace-1', 'Terrace'], ['rooftop-night', 'Dome at night'], ['restaurant-lounge', 'Lounge'],
    ['terrace-lounge', 'Seating'], ['bar-counter', 'Bar'], ['cocktails', 'Cocktails'],
    ['pool-day', 'Poolside'], ['live-guitar-neon', 'Live nights'], ['hero-2', 'Sunset'],
    ['barcelofacade', 'Barceló Al Jaddaf'], ['rooftop-flag', 'Garden terrace'],
    ['live-sax-pool', 'Sax by the pool'], ['wine-cheese-plate', 'Wine & bites']
  ];
  var ALT = {
    'BHVNterrace-1': 'Rooftop terrace at B·Heaven with a green pergola, pale blue sofas and the Dubai skyline',
    'rooftop-night': 'The B·Heaven dome pavilion and glowing sign at night',
    'restaurant-lounge': 'Indoor dining lounge at B·Heaven, Barceló Al Jaddaf',
    'terrace-lounge': 'Terrace lounge seating at B·Heaven',
    'bar-counter': 'The bar at B·Heaven rooftop lounge',
    'cocktails': 'Signature cocktails at B·Heaven rooftop bar',
    'pool-day': 'Poolside lounge at B·Heaven by day',
    'live-guitar-neon': 'Live guitar night at B·Heaven rooftop',
    'hero-2': 'Sunset on the B·Heaven rooftop, Al Jaddaf',
    'barcelofacade': 'Barceló Al Jaddaf hotel exterior',
    'rooftop-flag': 'B·Heaven flag and garden terrace with the Dubai skyline behind',
    'live-sax-pool': 'Live saxophonist playing by the B·Heaven pool',
    'wine-cheese-plate': 'A glass of red wine with a cheese and fruit plate at B·Heaven'
  };
  var POS = { 'rooftop-night': '50% 46%', 'rooftop-flag': '50% 50%', 'live-sax-pool': '40% 40%', 'live-guitar-neon': '70% 50%' };
  var EXT = { 'rooftop-night': '.webp?v=2', 'rooftop-flag': '.webp?v=2' };
  function url(n) { return '/' + n + (EXT[n] || '.webp'); }
  var tiles = [].slice.call(grid.querySelectorAll('.rg-t')).map(function (el, k) {
    var img = el.querySelector('img');
    var name = (img.getAttribute('src').match(/([^\/?]+)\.webp/) || [])[1];
    var idx = 0;
    POOL.forEach(function (p, i) { if (p[0] === name) idx = i; });
    img.classList.add('on');
    return { el: el, cap: el.querySelector('.rg-cap'), cur: img, idx: idx };
  });
  var shown = tiles.map(function (t) { return t.idx; });
  var interval = 3000, visible = true, timers = [], lbOpen = false;

  function swap(k) {
    if (!visible || document.hidden || tiles[k].hold || lbOpen) return;
    var free = [];
    for (var i = 0; i < POOL.length; i++) if (shown.indexOf(i) < 0) free.push(i);
    var idx = free[Math.floor(Math.random() * free.length)], t = tiles[k], p = POOL[idx];
    var img = new Image();
    img.alt = ALT[p[0]] || p[1]; if (POS[p[0]]) img.style.objectPosition = POS[p[0]];
    img.onload = function () {
      t.el.insertBefore(img, t.cap);
      requestAnimationFrame(function () { requestAnimationFrame(function () { img.classList.add('on'); }); });
      var old = t.cur; old.classList.remove('on');
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 1200);
      t.cur = img; shown[k] = idx;
      t.cap.innerHTML = '<b>0' + (k + 1) + '</b>' + p[1];
    };
    img.src = url(p[0]);
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
          ? Math.max(0, Math.min(1, (vh * .98 - top - k * 6) / (vh * .14)))
          : Math.max(0, Math.min(1, (vh * .97 - top - k * 8) / (vh * .18))),
        e = rv * rv * (3 - 2 * rv), u = 1 - e;
      tl.el.style.opacity = e.toFixed(3);
      if (reduce || tl.tilting) return;
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
  /* photos change every 3s, one tile at a time (staggered); layout stays fixed */
  var started = false;
  function go() { if (started) return; started = true; POOL.forEach(function (p) { new Image().src = url(p[0]); }); start(); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) go(); }, { rootMargin: '0px' }).observe(grid);
  } else go();

  /* if a photo ever fails to load (patchy mobile network), quietly retry so no broken icon is left */
  Array.prototype.forEach.call(grid.querySelectorAll('img'), function (im) {
    var base = im.getAttribute('src'), tries = 0;
    function retry() { if (tries++ < 4) setTimeout(function () { im.src = base + (base.indexOf('?') < 0 ? '?' : '&') + 'r=' + tries; }, 700 * tries); }
    im.addEventListener('error', retry);
    if (im.complete && im.naturalWidth === 0 && im.getAttribute('src')) retry();
  });

  /* interactive: 3D tilt + light sheen follow the cursor / finger, photo rotation pauses while you hold a tile */
  var fine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
  tiles.forEach(function (tl, k) {
    var el = tl.el;
    tl.move = function (x, y, cx, cy) {
      el.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      if (reduce) return;
      tl.tilting = true;
      el.style.transform = 'perspective(900px) rotateX(' + ((.5 - y) * 9).toFixed(2) + 'deg) rotateY(' + ((x - .5) * 11).toFixed(2) + 'deg) scale(1.025)';
      el.style.zIndex = 3;
    };
    tl.leave = function () {
      tl.hold = false; el.classList.remove('hot');
      if (tl.tilting) { tl.tilting = false; el.style.transform = 'none'; el.style.zIndex = ''; }
    };
    el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Open photo');
    el.addEventListener('click', function () { openLb(POOL.indexOf(POOL.filter(function (p) { return url(p[0]) === (tl.cur.getAttribute('src') || '').replace(/(\?|&)r=\d+/, ''); })[0])); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
  });

  var over = null;
  grid.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var g = grid.getBoundingClientRect(), x = e.clientX - g.left, y = e.clientY - g.top, hit = null;
    tiles.forEach(function (tl) {
      var el = tl.el, l = el.offsetLeft - grid.offsetLeft, t = el.offsetTop - grid.offsetTop;
      if (x >= l && x <= l + el.offsetWidth && y >= t && y <= t + el.offsetHeight) hit = { tl: tl, fx: (x - l) / el.offsetWidth, fy: (y - t) / el.offsetHeight };
    });
    if (over && (!hit || hit.tl !== over)) { over.leave(); over = null; }
    if (hit) { over = hit.tl; over.hold = true; over.el.classList.add('hot'); over.move(hit.fx, hit.fy); }
  });
  grid.addEventListener('pointerleave', function () { if (over) { over.leave(); over = null; } });

  /* lightbox: tap any tile to open the photo full screen; swipe, arrow keys or buttons to browse all the photos */
  var lb, lbImg, lbCap, lbN, cur = 0, sx = 0;
  function build() {
    lb = document.createElement('div'); lb.className = 'rg-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Rooftop photo gallery');
    lb.innerHTML = '<button class="rg-x" aria-label="Close">&times;</button><button class="rg-p" aria-label="Previous">&#8249;</button><button class="rg-n" aria-label="Next">&#8250;</button><figure><img alt=""><figcaption></figcaption></figure>';
    document.body.appendChild(lb);
    lbImg = lb.querySelector('img'); lbCap = lb.querySelector('figcaption');
    lb.querySelector('.rg-x').onclick = closeLb; lb.querySelector('.rg-p').onclick = function (e) { e.stopPropagation(); step(-1); };
    lb.querySelector('.rg-n').onclick = function (e) { e.stopPropagation(); step(1); };
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.tagName === 'FIGURE') closeLb(); });
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { var d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 45) step(d < 0 ? 1 : -1); }, { passive: true });
  }
  function show(i, dir) {
    cur = (i + POOL.length) % POOL.length; var p = POOL[cur];
    lbImg.classList.remove('in'); lbImg.style.setProperty('--dx', (dir || 0) * 40 + 'px');
    var im = new Image(); im.onload = function () {
      lbImg.src = im.src; lbImg.alt = ALT[p[0]] || p[1]; lbCap.innerHTML = '<b>' + (cur + 1) + ' / ' + POOL.length + '</b>' + p[1];
      requestAnimationFrame(function () { requestAnimationFrame(function () { lbImg.classList.add('in'); }); });
    }; im.src = url(p[0]);
  }
  function step(d) { show(cur + d, d); }
  function onKey(e) { if (e.key === 'Escape') closeLb(); else if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); }
  function openLb(i) {
    if (i < 0) i = 0; if (!lb) build(); lbOpen = true; lb.classList.add('open'); document.documentElement.style.overflow = 'hidden';
    addEventListener('keydown', onKey); show(i, 0); lb.querySelector('.rg-x').focus();
  }
  function closeLb() { lbOpen = false; lb.classList.remove('open'); document.documentElement.style.overflow = ''; removeEventListener('keydown', onKey); }
})();
