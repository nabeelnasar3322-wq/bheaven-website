/* Hero effects: light that follows the finger/pointer, depth parallax, floating bokeh lights,
   a light sweep and rolling counter on every slide change, tap ripples, magnetic buttons, swipe to change slide. */
(function () {
  'use strict';
  var hero = document.getElementById('hero');
  if (!hero) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---- swipe left/right on the hero to change photo (works with reduced motion too) ---- */
  var sx = 0, sy = 0, st = 0;
  hero.addEventListener('touchstart', function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, { passive: true });
  hero.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - st < 700) {
      try { if (typeof showSlide === 'function') showSlide(hs + (dx < 0 ? 1 : -1)); } catch (_) {}
    }
  }, { passive: true });

  var vid = hero.querySelector('video.hero-video');
  if (reduce) { if (vid) { try { vid.pause(); } catch (_) {} } return; }

  /* ---- build the extra layers ---- */
  var shade = hero.querySelector('.hero-shade');
  function add(tag, cls) { var el = document.createElement(tag); el.className = cls; hero.insertBefore(el, shade ? shade.nextSibling : hero.firstChild); return el; }
  var glow = add('div', 'hero-fx-glow'); glow.setAttribute('aria-hidden', 'true');
  var sweep = add('div', 'hero-sweep'); sweep.setAttribute('aria-hidden', 'true');
  var cv = add('canvas', 'hero-bokeh'); cv.setAttribute('aria-hidden', 'true');
  var ctx = cv.getContext('2d');

  var count = document.createElement('div');
  count.className = 'hero-count'; count.setAttribute('aria-hidden', 'true');
  count.innerHTML = '<span class="n"><b>01</b></span><i></i><span class="t">01</span>';
  hero.appendChild(count);
  var nEl = count.querySelector('.n b'), tEl = count.querySelector('.t');

  /* ---- pointer / touch tracking ---- */
  var tx = 0, ty = 0, cx = 0, cy = 0, gx = 0, gy = 0, mxp = -999, myp = -999, glowOn = false, glowTimer;
  var btns = [].slice.call(hero.querySelectorAll('.hero-actions .btn'));
  var bs = btns.map(function () { return { x: 0, y: 0 }; });
  function point(e) {
    var r = hero.getBoundingClientRect();
    mxp = e.clientX; myp = e.clientY;
    tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    gx = e.clientX - r.left; gy = e.clientY - r.top;
    glow.style.setProperty('--gx', gx + 'px'); glow.style.setProperty('--gy', gy + 'px');
    if (!glowOn) { glowOn = true; glow.classList.add('on'); }
    clearTimeout(glowTimer);
  }
  function release(delay) {
    clearTimeout(glowTimer);
    glowTimer = setTimeout(function () { glowOn = false; glow.classList.remove('on'); tx = 0; ty = 0; mxp = myp = -999; }, delay);
  }
  hero.addEventListener('pointermove', point, { passive: true });
  hero.addEventListener('pointerdown', function (e) {
    point(e);
    var b = e.target.closest && e.target.closest('.hero-actions .btn');
    if (b) {
      var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, s = document.createElement('span');
      s.className = 'fx-ripple'; s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
      b.appendChild(s); setTimeout(function () { s.remove(); }, 700);
    }
  }, { passive: true });
  hero.addEventListener('pointerup', function (e) { release(e.pointerType === 'mouse' ? 1500 : 900); }, { passive: true });
  hero.addEventListener('pointercancel', function () { release(300); }, { passive: true });
  hero.addEventListener('pointerleave', function () { release(250); }, { passive: true });

  /* ---- floating bokeh lights ---- */
  var W = 0, H = 0, dpr = 1, parts = [];
  var COLORS = [[255, 236, 190], [251, 247, 226], [154, 182, 186], [255, 205, 140]];
  function make(init) {
    var c = COLORS[(Math.random() * COLORS.length) | 0];
    return { x: Math.random() * W, y: init ? Math.random() * H : H + 20, r: (2 + Math.random() * 7) * dpr, v: (0.12 + Math.random() * 0.32) * dpr,
      sw: 0.4 + Math.random() * 0.9, ph: Math.random() * 6.28, tw: 0.6 + Math.random() * 1.4, a: 0.25 + Math.random() * 0.45, c: c };
  }
  function resize() {
    var r = hero.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.width = Math.round(r.width * dpr); H = cv.height = Math.round(r.height * dpr);
    var n = r.width < 700 ? 12 : 22; parts = []; for (var i = 0; i < n; i++) parts.push(make(true));
  }
  var t0 = performance.now();
  function draw(now) {
    var t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]; p.y -= p.v; p.x += Math.sin(t * p.sw + p.ph) * 0.35 * dpr;
      if (p.y < -30) parts[i] = p = make(false);
      var edge = Math.min(1, Math.min(p.y, H - p.y) / (H * 0.18)); if (edge < 0) edge = 0;
      var al = p.a * (0.55 + 0.45 * Math.sin(t * p.tw + p.ph)) * edge;
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      g.addColorStop(0, 'rgba(' + p.c + ',' + al + ')'); g.addColorStop(0.35, 'rgba(' + p.c + ',' + al * 0.5 + ')'); g.addColorStop(1, 'rgba(' + p.c + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, 6.2832); ctx.fill();
    }
  }

  /* ---- one loop: smooth parallax + magnetic buttons + bokeh, only while the hero is on screen ---- */
  var visible = true, raf = 0;
  function frame(now) {
    raf = 0; if (!visible || document.hidden) return;
    cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
    hero.style.setProperty('--fx-px', (-cx * 16).toFixed(2) + 'px'); hero.style.setProperty('--fx-py', (-cy * 11).toFixed(2) + 'px');
    hero.style.setProperty('--fx-cx', (cx * 7).toFixed(2) + 'px'); hero.style.setProperty('--fx-cy', (cy * 5).toFixed(2) + 'px');
    hero.style.setProperty('--fx-bx', (-cx * 26).toFixed(2) + 'px'); hero.style.setProperty('--fx-by', (-cy * 18).toFixed(2) + 'px');
    if (fine) btns.forEach(function (b, i) {
      var r = b.getBoundingClientRect(), dx = mxp - (r.left + r.width / 2), dy = myp - (r.top + r.height / 2), d = Math.sqrt(dx * dx + dy * dy), s = bs[i];
      var gxm = d < 120 ? Math.max(-9, Math.min(9, dx * 0.22)) : 0, gym = d < 120 ? Math.max(-6, Math.min(6, dy * 0.28)) : 0;
      s.x += (gxm - s.x) * 0.18; s.y += (gym - s.y) * 0.18; b.style.translate = s.x.toFixed(2) + 'px ' + s.y.toFixed(2) + 'px';
    });
    draw(now); raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf) raf = requestAnimationFrame(frame); }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }).observe(hero);
  document.addEventListener('visibilitychange', start);
  addEventListener('resize', function () { resize(); }, { passive: true });
  resize(); start();

  /* ---- on every slide change: light sweep + rolling counter ---- */
  var pan = hero.querySelector('.pan'), lastIdx = -1;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function sync() {
    var slides = [].slice.call(pan.querySelectorAll('video.slide, img.slide')), idx = slides.findIndex(function (i) { return i.classList.contains('on'); });
    if (!slides.length) { count.remove(); return; }
    if (idx < 0) return;
    tEl.textContent = pad(slides.length);
    if (idx !== lastIdx) {
      nEl.textContent = pad(idx + 1); nEl.classList.remove('roll'); void nEl.offsetWidth; nEl.classList.add('roll');
      if (lastIdx !== -1) { sweep.classList.remove('go'); void sweep.offsetWidth; sweep.classList.add('go'); }
      lastIdx = idx;
    }
  }
  if (pan) { new MutationObserver(sync).observe(pan, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] }); sync(); }
})();
