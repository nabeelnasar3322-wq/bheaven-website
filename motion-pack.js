/* Motion pack (see motion-pack.css). One rAF-throttled passive scroll listener; nothing runs when the tab is hidden. */
(function () {
  'use strict';
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var save = !!(navigator.connection && navigator.connection.saveData);
  if (rm || save) return;
  var doc = document, html = doc.documentElement;
  var $ = function (s, r) { return (r || doc).querySelector(s); };

  /* ---------- section list ---------- */
  var DEF = [
    ['#hero', 'Home', 'day'], ['#about', 'Rooftop', 'day'], ['#events', 'Events', 'sunset'],
    ['#menus', 'Menus', 'sunset'], ['.section.gallery', 'Gallery', 'sunset'], ['#reviews', 'Reviews', 'night'],
    ['#reserve', 'Reserve', 'night'], ['#visit', 'Visit', 'night']
  ];
  var secs = [];
  DEF.forEach(function (d) { var el = $(d[0]); if (el) secs.push({ el: el, label: d[1], sky: d[2], top: 0, h: 0 }); });
  if (secs.length < 3) return;

  /* ---------- build rail + sky ---------- */
  var rail = doc.createElement('ul'); rail.className = 'mp-rail'; rail.setAttribute('aria-label', 'Page sections');
  secs.forEach(function (s, i) {
    var li = doc.createElement('li'), a = doc.createElement('a');
    a.href = '#'; a.setAttribute('aria-label', s.label); a.innerHTML = '<span>' + s.label + '</span>';
    a.addEventListener('click', function (e) { e.preventDefault(); s.el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    li.appendChild(a); rail.appendChild(li); s.a = a;
  });
  doc.body.appendChild(rail);
  var sky = doc.createElement('div'); sky.className = 'mp-sky'; sky.setAttribute('aria-hidden', 'true'); sky.innerHTML = '<i></i><i></i><i></i>';
  doc.body.appendChild(sky);
  html.classList.add('mp-on');

  /* ---------- menu cards + count-up ---------- */
  var cards = [].slice.call(doc.querySelectorAll('#menuCatGrid .tcard'));
  var lead = $('#menus .head .lead'), numEl = null, counted = false;
  if (lead) {
    var m = lead.innerHTML.match(/(^|[^\d])(\d{2,3})(\s+dishes)/);
    if (m) { lead.innerHTML = lead.innerHTML.replace(m[0], m[1] + '<span class="mp-num" data-to="' + m[2] + '">' + m[2] + '</span>' + m[3]); numEl = $('.mp-num', lead); lead.setAttribute('aria-label', lead.textContent); numEl.textContent = '0'; }
  }
  function countUp() {
    if (!numEl || counted) return; counted = true;
    var to = +numEl.dataset.to, t0 = performance.now(), D = 1400;
    (function tick(t) { var k = Math.min(1, (t - t0) / D); numEl.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); else numEl.textContent = to; })(t0);
  }

  /* ---------- measurement + frame ---------- */
  function measure() { var y = scrollY; secs.forEach(function (s) { var r = s.el.getBoundingClientRect(); s.top = r.top + y; s.h = r.height; }); }
  var cur = -1, raf = 0, curSky = '';
  function frame() {
    raf = 0;
    var y = scrollY, vh = innerHeight, mid = y + vh * 0.45, idx = 0;
    for (var i = 0; i < secs.length; i++) if (secs[i].top <= mid) idx = i;
    if (idx !== cur) {
      if (cur > -1) secs[cur].a.classList.remove('on');
      secs[idx].a.classList.add('on'); cur = idx;
      if (secs[idx].sky !== curSky) { curSky = secs[idx].sky; html.setAttribute('data-mp-sky', curSky); }
    }
    var max = Math.max(1, html.scrollHeight - vh);
    rail.style.setProperty('--mp-p', Math.min(1, y / max).toFixed(4));
    for (var c = 0; c < cards.length; c++) {
      var b = cards[c].getBoundingClientRect();
      if (b.bottom < -60 || b.top > vh + 60) continue;
      var s = Math.max(-1, Math.min(1, (b.top + b.height / 2 - vh / 2) / (vh / 2)));
      cards[c].style.setProperty('--mp-s', s.toFixed(3));
      if (!counted && numEl && b.top < vh * 0.85) countUp();
    }
  }
  function onScroll() { if (!raf && !doc.hidden) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', function () { measure(); onScroll(); }, { passive: true });
  addEventListener('load', function () { measure(); frame(); });
  measure(); frame();
  if (window.ResizeObserver) new ResizeObserver(function () { measure(); }).observe(doc.body);

  /* ---------- festive carousel: tap a side photo to centre it; viewer grows out of the photo ---------- */
  var ftrack = $('#festive .fz-track');
  function flyImg(src, from, to, dur, fade, done) {
    var im = doc.createElement('img'); im.className = 'mp-fly'; im.src = src; im.alt = '';
    im.style.cssText += 'left:' + to.left + 'px;top:' + to.top + 'px;width:' + to.width + 'px;height:' + to.height + 'px;';
    doc.body.appendChild(im);
    var a = im.animate([
      { transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + (from.width / to.width) + ',' + (from.height / to.height) + ')', opacity: fade[0] },
      { transform: 'none', opacity: fade[1] }
    ], { duration: dur, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
    a.onfinish = a.oncancel = function () { im.remove(); if (done) done(); };
  }
  if (ftrack) {
    var ftile = null;
    ftrack.addEventListener('click', function (e) {
      var sl = e.target.closest('.fz-slide'); if (!sl) return;
      var r = ftrack.getBoundingClientRect(), b = sl.getBoundingClientRect();
      var off = (b.left + b.width / 2) - (r.left + r.width / 2);
      if (Math.abs(off) > b.width * 0.35) {
        e.stopPropagation(); e.preventDefault();
        ftrack.scrollBy({ left: off, behavior: 'smooth' });
      } else { ftile = sl.querySelector('img'); }
    }, true);
    var fopen = false, fobs = null, lastFr = null;
    function grow(lbx) {
      var img = $('img', lbx), t = ftile; if (!img || !t || !img.animate) return;
      var tr = t.getBoundingClientRect(), fr = img.getBoundingClientRect(); if (!fr.width) return;
      lastFr = { left: fr.left, top: fr.top, width: fr.width, height: fr.height, src: img.src };
      img.style.visibility = 'hidden';
      flyImg(img.src, tr, fr, 600, [0.9, 1], function () { img.style.visibility = ''; });
    }
    function shrink() {
      var t = ftile; if (!t || !lastFr) return;
      var tr = t.getBoundingClientRect();
      if (tr.bottom > 0 && tr.top < innerHeight) flyImg(lastFr.src, lastFr, tr, 500, [1, 0.15]);
    }
    function watch(lbx) {
      fobs = new MutationObserver(function () {
        var open = lbx.classList.contains('on');
        if (open === fopen) return; fopen = open;
        if (open) grow(lbx); else shrink();
      });
      fobs.observe(lbx, { attributes: true, attributeFilter: ['class'] });
    }
    /* the viewer is built on first open: attach right after the page's own click handler has run */
    ftrack.addEventListener('click', function () {
      if (fobs) return;
      setTimeout(function () {
        var lbx = $('.fz-lb'); if (!lbx) return;
        watch(lbx);
        if (lbx.classList.contains('on')) { fopen = true; grow(lbx); }
      }, 0);
    });
  }

  /* ---------- gallery: grow from tile / fly back ---------- */
  var grid = $('#gallery'), lb = $('#lb'), lbImg = lb && $('img', lb), tile = null;
  if (!grid || !lbImg) return;
  var EASE = 'cubic-bezier(.22,1,.36,1)';
  grid.addEventListener('click', function (e) { var t = e.target.closest('.ph.has-img'); if (t && !e.target.closest('.ig')) tile = t; }, true);
  function tileFor(src) {
    var all = [].slice.call(grid.querySelectorAll('.ph.has-img'));
    for (var i = 0; i < all.length; i++) { var im = all[i].querySelector('img'); if (im && im.src === src) return all[i]; }
    return tile;
  }
  function fly(src, from, to, dur, fade, done) {
    var im = doc.createElement('img'); im.className = 'mp-fly'; im.src = src; im.alt = '';
    im.style.cssText += 'left:' + to.left + 'px;top:' + to.top + 'px;width:' + to.width + 'px;height:' + to.height + 'px;';
    doc.body.appendChild(im);
    var sx = from.width / to.width, sy = from.height / to.height;
    var a = im.animate([
      { transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + sx + ',' + sy + ')', opacity: fade[0] },
      { transform: 'none', opacity: fade[1] }
    ], { duration: dur, easing: EASE, fill: 'both' });
    a.onfinish = a.oncancel = function () { im.remove(); if (done) done(); };
    return im;
  }
  var wasOpen = false;
  new MutationObserver(function () {
    var open = lb.classList.contains('open');
    if (open === wasOpen) return; wasOpen = open;
    var src = lbImg.src, t = tile && tileFor(src);
    if (!t || !lbImg.animate) return;
    var tr = t.getBoundingClientRect();
    if (open) {
      var go = function () {
        var fr = lbImg.getBoundingClientRect();
        if (!fr.width) return;
        lbImg.style.visibility = 'hidden';
        fly(src, tr, fr, 620, [0.9, 1], function () { lbImg.style.visibility = ''; });
      };
      requestAnimationFrame(go);
    } else {
      var fr2 = lbImg.getBoundingClientRect();
      if (fr2.width && tr.bottom > 0 && tr.top < innerHeight) fly(src, fr2, tr, 520, [1, 0.15]);
    }
  }).observe(lb, { attributes: true, attributeFilter: ['class'] });
})();
