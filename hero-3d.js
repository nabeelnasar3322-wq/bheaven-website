/* Hero 3D scroll: the skyline sequence (Poolside Day -> Golden Sunset -> Starlit Night) is 273
   pre-rendered frames drawn on a <canvas> and driven by scroll position (the same technique as the
   Apple product pages), while the frame scales and drifts for a sense of depth. Frames load
   coarse-to-fine (every 32nd, then 16th ... then all) so scrubbing works almost immediately, and the
   nearest loaded frame is shown until the exact one arrives. Runs only where the inline check in
   index.html set window.__skyOn (hover/any size, no reduced motion, no Data Saver, not 2G). */
(function () {
  'use strict';
  if (!window.__skyOn) return;
  var hero = document.getElementById('hero'), cv = document.getElementById('heroSeq'), cfg = window.__skySeq;
  if (!hero || !cv || !cfg) return;
  var pan = hero.querySelector('.pan'), stick = hero.querySelector('.sky-stick');
  if (!pan || !stick) return;

  var raf = 0, lastPart = -1, start = 0, range = 1;
  /* the content that used to live in the "One rooftop, three moods" section, now surfaced
     here as you scroll through each stage of the hero clip */
  var PARTS = [
    { key: 'day', label: 'Poolside day', when: 'Pool access', title: 'Poolside days',
      desc: 'Pool passes are fully redeemable on food and drinks at B·Heaven.',
      perks: ['Weekdays AED 99', 'Weekends AED 149'],
      cta: 'Book Pool Pass', href: 'https://wa.me/971506129150?text=Hi%20B%C2%B7Heaven%2C%20I%27d%20like%20to%20book%20a%20pool%20pass.' },
    { key: 'sunset', label: 'Golden sunset', when: 'Golden hour', title: 'Sunset & cocktails',
      desc: 'Watch the skyline turn gold with a signature cocktail in hand and the pool glowing below.',
      perks: ['Sunset Happy Hour', '180° Skyline views', 'Signature serves'],
      cta: 'Book Sunset Table', href: 'https://wa.me/971506129150?text=Hi%20B%C2%B7Heaven%2C%20I%20would%20like%20to%20reserve%20a%20Sunset%20table.' },
    { key: 'night', label: 'Starlit night', when: 'Until 2 AM', title: 'Nights above the city',
      desc: 'Modern Levant sharing plates, premium shisha and live entertainment under the stars.',
      perks: ['Live music & singer', 'Premium shisha', 'Charcoal Levant dining'],
      cta: 'Book Evening Lounge', href: 'https://wa.me/971506129150?text=Hi%20B%C2%B7Heaven%2C%20I%20would%20like%20to%20reserve%20an%20Evening%20table.' }
  ];
  var label = document.getElementById('daypartLabel');
  /* a fixed panel that names the stage and surfaces its details as you scroll (the hero text
     fades out early in the scroll; this panel fades in to replace it) */
  var cap = document.createElement('div');
  /* not aria-hidden: unlike the old label/dots-only version, this panel now carries the
     actual booking content moved out of the removed "day to night" section */
  cap.className = 'sky-cap';
  cap.innerHTML =
    '<span class="sky-eyebrow"></span>' +
    '<h3 class="sky-title"></h3>' +
    '<p class="sky-desc"></p>' +
    '<ul class="sky-perks"></ul>' +
    '<a class="sky-cta" target="_blank" rel="noopener"></a>' +
    '<span class="sky-rail" aria-hidden="true"><b></b><b></b><b></b></span>';
  stick.appendChild(cap);
  /* the step counter ("01 FROM 9 AM" + dots) sits top right of the stage, clear of the header,
     and fades in with the panel */
  var top = document.createElement('div');
  top.className = 'sky-top';
  top.setAttribute('aria-hidden', 'true');
  top.innerHTML = '<span class="sky-n">01</span><span class="sky-when"></span><span class="sky-dots"><b></b><b></b><b></b></span>';
  stick.appendChild(top);
  var capN = top.querySelector('.sky-n'), capWhen = top.querySelector('.sky-when'), capD = top.querySelectorAll('.sky-dots b'),
    capTitle = cap.querySelector('.sky-title'), capDesc = cap.querySelector('.sky-desc'),
    capPerks = cap.querySelector('.sky-perks'), capCta = cap.querySelector('.sky-cta'),
    capEy = cap.querySelector('.sky-eyebrow'), capRail = cap.querySelectorAll('.sky-rail b');
  function measure() {
    var r = hero.getBoundingClientRect();
    start = r.top + window.pageYOffset;
    range = Math.max(1, hero.offsetHeight - stick.offsetHeight);
  }
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function setPart(idx) {
    var name = PARTS[idx].key;
    if (name === lastPart) return; lastPart = name;
    var d = PARTS[idx];
    document.documentElement.setAttribute('data-daypart', name);
    if (label) { label.style.opacity = '0'; setTimeout(function () { label.textContent = d.label; label.style.opacity = ''; }, 200); }
    capN.textContent = '0' + (idx + 1); capWhen.textContent = d.when;
    capTitle.textContent = d.title; capDesc.textContent = d.desc;
    capPerks.innerHTML = d.perks.map(function (t) { return '<li>' + t + '</li>'; }).join('');
    capCta.textContent = d.cta; capCta.href = d.href;
    for (var i = 0; i < capD.length; i++) capD[i].className = i === idx ? 'on' : '';
    capEy.textContent = d.when;
    for (var j = 0; j < capRail.length; j++) capRail[j].className = j === idx ? 'on' : '';
    cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
  }
  function apply(p) {
    var e = ease(p), root = hero.style;
    root.setProperty('--sk-s', (1.16 - 0.16 * e).toFixed(4));
    root.setProperty('--sk-y', ((1 - e) * -3.5).toFixed(2) + 'vh');
    var op = 1 - ease((p - 0.02) / 0.14);
    root.setProperty('--sk-op', op.toFixed(3));
    root.setProperty('--sk-cy', (p * -90).toFixed(1) + 'px');
    /* switch points follow the frames: day -> sunset at about frame 66, sunset -> night at about frame 165 of 273 */
    var part = p < 0.25 ? 0 : p < 0.60 ? 1 : 2;
    setPart(part);
  }
  function progress() {
    return Math.max(0, Math.min(1, (window.pageYOffset - start) / range));
  }
  /* ---------- frame sequence on canvas ---------- */
  var N = cfg.n, blob = new Array(N), ok = new Array(N), bmp = new Array(N), pend = {}, edge = new Array(N);
  var ctx = cv.getContext('2d', { alpha: false });
  var BG = [30, 31, 33];                 /* page background #1E1F21 */
  var PORTRAIT_FIT = 0.58;               /* portrait phones: zoom out so the whole sign + dome stays in view */
  var AHEAD = cfg.mobile ? 8 : 10, BACK = 3;
  var probe = document.createElement('canvas'); probe.width = 4; probe.height = 1;
  var pctx = probe.getContext('2d', { willReadFrequently: true });
  var cw = 0, ch = 0, dpr = 1, shown = -1, force = true, dirn = 1, cur = 0, goal = 0;
  function pad(n) { return ('000' + n).slice(-4); }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, cfg.mobile ? 1.5 : 2);   /* phones: the frames are only 1024px wide, so more canvas pixels add cost, not detail */
    var w = Math.max(1, Math.round(cv.clientWidth * dpr)), h = Math.max(1, Math.round(cv.clientHeight * dpr));
    var cap = cfg.mobile ? 2200 : 1920;  /* no point exceeding the source resolution */
    if (w > cap) { h = Math.round(h * cap / w); w = cap; }
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    cw = w; ch = h;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = cfg.mobile ? 'low' : 'high';   /* 'high' resampling is costly per frame on phones */
    force = true;
  }

  /* average colour of the top / bottom strip of a frame: extends the picture on portrait screens */
  function edgesOf(i) {
    if (edge[i]) return edge[i];
    var img = bmp[i], out = [BG, BG];
    try {
      var iw = img.width, ih = img.height, hh = Math.round(ih * 0.03);
      [0, ih - hh].forEach(function (sy, k) {
        pctx.clearRect(0, 0, 4, 1); pctx.drawImage(img, 0, sy, iw, hh, 0, 0, 4, 1);
        var d = pctx.getImageData(0, 0, 4, 1).data;
        out[k] = [(d[0] + d[4] + d[8] + d[12]) >> 2, (d[1] + d[5] + d[9] + d[13]) >> 2, (d[2] + d[6] + d[10] + d[14]) >> 2];
      });
    } catch (e) {}
    return (edge[i] = out);
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  function draw(i, alpha) {
    var over = alpha !== undefined, img = bmp[i], iw = img.width, ih = img.height;
    if (!iw || !ih || !cw) return;
    var portrait = cw / ch < 0.9, fx, fit = 1;
    if (portrait) {
      /* the last frames push in close; pull back a little so the sign never clips */
      var t = Math.min(1, Math.max(0, (i - 170) / 103));
      var base = Math.min(1, Math.max(PORTRAIT_FIT, 1.125 * cw / ch));   /* tablets: near full-bleed; phones keep the zoom-out */
      fit = base - 0.2 * t * t * (3 - 2 * t);
      fx = 0.5 + 0.17 * Math.max(0, 1 - i / 90);   /* pavilion starts right of centre, eases to centre */
    } else fx = 0.64;                              /* same anchor the video had (object-position 64% 50%) */
    var sc = Math.max(cw / iw, (ch / ih) * fit), dw = iw * sc, dh = ih * sc, dx = (cw - dw) * fx, dy = (ch - dh) * 0.5, g, e;
    var bands = dh < ch - 1;
    if (bands) e = edgesOf(i);
    if (bands && !over) {
      g = ctx.createLinearGradient(0, 0, 0, dy); g.addColorStop(0, rgba(BG, 1)); g.addColorStop(1, rgba(e[0], 1));
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, Math.ceil(dy) + 1);
      g = ctx.createLinearGradient(0, dy + dh, 0, ch); g.addColorStop(0, rgba(e[1], 1)); g.addColorStop(1, rgba(BG, 1));
      ctx.fillStyle = g; ctx.fillRect(0, Math.floor(dy + dh) - 1, cw, ch - Math.floor(dy + dh) + 1);
    }
    if (over) ctx.globalAlpha = alpha;
    ctx.drawImage(img, dx, dy, dw, dh);
    if (over) ctx.globalAlpha = 1;
    if (bands) {                                   /* feather the seams (also on the cross-faded frame, at its alpha) */
      if (over) ctx.globalAlpha = alpha;
      var f = Math.min(dh * 0.14, 90 * dpr);
      g = ctx.createLinearGradient(0, dy, 0, dy + f); g.addColorStop(0, rgba(e[0], 1)); g.addColorStop(1, rgba(e[0], 0));
      ctx.fillStyle = g; ctx.fillRect(0, dy, cw, f);
      g = ctx.createLinearGradient(0, dy + dh - f, 0, dy + dh); g.addColorStop(0, rgba(e[1], 0)); g.addColorStop(1, rgba(e[1], 1));
      ctx.fillStyle = g; ctx.fillRect(0, dy + dh - f, cw, f);
      if (over) ctx.globalAlpha = 1;
    }
  }

  /* the nearest frame that is ready to draw (decoded) */
  function nearest(f) {
    if (bmp[f]) return f;
    for (var d = 1; d < N; d++) {
      if (f - d >= 0 && bmp[f - d]) return f - d;
      if (f + d < N && bmp[f + d]) return f + d;
    }
    return -1;
  }

  /* Decoding happens off the main thread: frames are fetched as raw files (blobs) and turned into
     ImageBitmaps by createImageBitmap(blob), which decodes on a worker. Only a small window around
     the scroll position is kept decoded (a few MB per frame); everything outside it is closed, so
     memory stays small and drawing a frame while scrolling is a plain copy. */
  function wantBmp(j) {
    if (bmp[j] || pend[j] || !blob[j]) return;
    pend[j] = 1;
    createImageBitmap(blob[j]).then(function (b) {
      pend[j] = 0;
      var c = Math.round(cur);
      if (j !== 0 && (j < c - AHEAD - 6 || j > c + AHEAD + 6)) { b.close(); return; }
      bmp[j] = b;
      var fl = Math.floor(cur);
      if (j === 0 || shown < 0 || j === fl || j === fl + 1 || Math.abs(j - c) < Math.abs(shown - c)) kick();   /* redraw whenever this beats what is on screen */
    }, function () { pend[j] = 0; });
  }
  function warm(f) {
    var j, k, lo = dirn > 0 ? f - BACK - 1 : f - AHEAD - 2, hi = dirn > 0 ? f + AHEAD + 2 : f + BACK + 1;
    for (k = 0; k <= AHEAD; k++) { j = f + dirn * k; if (j >= 0 && j < N) wantBmp(j); }
    for (k = 1; k <= BACK; k++) { j = f - dirn * k; if (j >= 0 && j < N) wantBmp(j); }
    for (j = 0; j < N; j++) if (bmp[j] && j !== 0 && j !== shown && (j < lo || j > hi)) { bmp[j].close(); bmp[j] = null; }   /* keep the frame on screen until a closer one is decoded */
  }
  /* fl is fractional: between two decoded frames the next one is cross-faded in (6 steps), so a slow
     scroll glides instead of stepping one frame at a time */
  var shownKey = -1;
  function render(fl) {
    var f = Math.round(fl); warm(f);
    var a = Math.floor(fl), q = cfg.mobile ? 0 : Math.round((fl - a) * 6);   /* phones: no cross-fade, one canvas draw per frame (touch momentum already moves fast) */
    if (q === 6) { a++; q = 0; }
    if (a >= N - 1) { a = N - 1; q = 0; }
    var use = nearest(a);
    if (shown >= 0 && bmp[shown] && (use < 0 || Math.abs(shown - a) <= Math.abs(use - a))) use = shown;   /* never fall back to frame 0 while the shown frame is as close */
    if (use < 0) return;
    var blend = q > 0 && use === a && !!bmp[a + 1], key = use * 8 + (blend ? q : 0);
    if (key === shownKey && !force) return;
    force = false; draw(use); if (blend) draw(a + 1, q / 6); shown = use; shownKey = key;
    if (!cv.classList.contains('on')) cv.classList.add('on');
  }

  /* loading: first frame at once, the rest coarse-to-fine after the page has settled */
  function load(k, done) {
    fetch(cfg.dir + pad(k + 1) + '.' + cfg.ext, { priority: k === 0 ? 'high' : 'low' })
      .then(function (r) { if (!r.ok) throw 0; return r.blob(); })
      .then(function (b) { blob[k] = b; ok[k] = true; if (done) done(); if (k === 0) wantBmp(0); else warm(Math.round(cur)); }, function () { if (done) done(); });
  }
  function order() {
    var seen = {}, out = [0], strides = cfg.coarse ? [32, 16, 8, 4] : [32, 16, 8, 4, 2, 1];
    seen[0] = 1;
    strides.forEach(function (st) { for (var i = 0; i < N; i += st) if (!seen[i]) { seen[i] = 1; out.push(i); } });
    if (!seen[N - 1]) out.push(N - 1);
    return out;
  }
  /* Two phases: the coarse frames (every 16th, ~18 files) start as soon as the HTML is parsed, so a
     visitor who scrolls straight away sees the sequence move instead of sitting frozen on frame 1
     until the whole page has finished loading; the remaining frames follow after the load event. */
  var lq = order(), li = 1, lactive = 0, LMAX = cfg.mobile ? 3 : 6, lcap = Math.min(lq.length, 20);
  function pump() {
    while (lactive < LMAX && li < lcap) { lactive++; load(lq[li++], function () { lactive--; pump(); }); }
  }
  function startEarly() { pump(); }
  function startLoading() { lcap = lq.length; pump(); }

  /* Scrub: the frame index chases the scroll position with frame-rate-independent smoothing, so it
     glides the same on 60 and 120 Hz screens. Only whole frames are drawn, and only when the frame
     changes. The first and last slice of the scroll hold on the first/last frame so the ends feel
     settled. */
  var lastT = 0, HOLD_A = 0.012, HOLD_B = 0.982;
  function vidProgress(p) { return Math.max(0, Math.min(1, (p - HOLD_A) / (HOLD_B - HOLD_A))); }
  function tick(now) {
    raf = 0;
    window.__skyBusy = true; /* tells hero-fx.js / scroll3d.js to skip their own parallax work while
      this loop is still gliding, so they don't compete for the frame budget */
    var p = progress();
    apply(p);
    var dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0.016;
    lastT = now;
    goal = vidProgress(p) * (N - 1);
    if (goal !== cur) dirn = goal > cur ? 1 : -1;
    cur += (goal - cur) * (1 - Math.exp(-dt / 0.06));
    if (Math.abs(goal - cur) < 0.08) cur = goal;
    render(cur);
    if (cur !== goal) { raf = requestAnimationFrame(tick); return; }
    lastT = 0;
    window.__skyBusy = false;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  size();
  load(0, null);
  if (document.readyState !== 'loading') setTimeout(startEarly, 0);
  else document.addEventListener('DOMContentLoaded', function () { setTimeout(startEarly, 0); }, { once: true });
  if (document.readyState === 'complete') setTimeout(startLoading, 150);
  else window.addEventListener('load', function () { setTimeout(startLoading, 150); }, { once: true });
  measure(); kick();
  if ('ResizeObserver' in window) new ResizeObserver(function () { size(); kick(); }).observe(cv);
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', function () { size(); measure(); kick(); }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  setTimeout(measure, 600);
  apply(0);
})();
