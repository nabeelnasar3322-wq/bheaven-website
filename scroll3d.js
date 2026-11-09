/* Page-wide 3D depth scroll. For each section container on screen, writes two CSS variables:
     --s  position through the viewport: +1 just below the screen, 0 centred, -1 just above
     --a  |--s|
   scroll3d.css turns them into translate / rotate / scale. One passive scroll listener and one
   requestAnimationFrame loop that only touches containers currently on screen and stops when
   everything has settled. Skipped for reduced-motion and Data Saver (the page stays as it was). */
(function () {
  'use strict';
  var root = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var conn = navigator.connection || {};
  if (conn.saveData) return;

  var lite = matchMedia('(max-width: 899px), (hover: none)');
  function setMode() {
    root.classList.add('s3d');
    root.classList.toggle('s3d-lite', lite.matches);
    root.classList.toggle('s3d-full', !lite.matches);
  }
  setMode();
  /* Chrome / Edge / Safari 26+: the CSS runs the movement itself (animation-timeline: view()),
     so no per-frame JavaScript is needed. Firefox falls back to the loop below. */
  var native = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'view()'));
  if (native) root.classList.add('s3d-native');
  if (lite.addEventListener) lite.addEventListener('change', function () { setMode(); if (!native) { collect(); kick(); } });

  /* containers whose children carry the effect (the hero is not included: hero-3d.js owns it).
     Phones only get the two cheapest effects (band zoom / float); the rest is desktop. */
  var SEL_FULL = '.about-photos,.features,.band,.reserve,.menu-cat-grid,.gal-grid,.loc,.head';
  var SEL_LITE = '.band,.reserve';
  var items = [], raf = 0, io = null;
  /* the Reserve section is big (form, concierge): write the variables onto its background layer
     only, so the browser does not re-style the whole form on every scroll frame */
  function targetOf(el) { return el.classList.contains('reserve') ? (el.querySelector('.res-bg') || el) : el; }

  function clamp(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }

  function frame() {
    raf = 0;
    /* while the hero clip is seeking, let that finish first */
    if (window.__skyBusy) { raf = requestAnimationFrame(frame); return; }
    var vh = innerHeight, moving = false, i, it, act = [];
    /* read everything first, then write: no layout thrash between sections */
    for (i = 0; i < items.length; i++) {
      it = items[i];
      if (!it.on) continue;
      var r = it.el.getBoundingClientRect();
      var h = it.el.offsetHeight || r.height;
      it.t = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + h / 2));
      act.push(it);
    }
    for (i = 0; i < act.length; i++) {
      it = act[i];
      it.s += (it.t - it.s) * 0.22;
      if (Math.abs(it.t - it.s) > 0.002) moving = true; else it.s = it.t;
      var sv = it.s.toFixed(3);
      if (sv === it.last) continue;
      it.last = sv;
      var tg = it.tg;
      tg.style.setProperty('--s', sv);
      tg.style.setProperty('--a', Math.abs(it.s).toFixed(3));
    }
    if (moving) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function collect() {
    var els = document.querySelectorAll(lite.matches ? SEL_LITE : SEL_FULL);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.__s3d) continue;
      var it = { el: el, tg: targetOf(el), s: 0, t: 0, last: '', on: false };
      el.__s3d = it; items.push(it);
      if (io) io.observe(el);
      else it.on = true;
    }
  }

  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        for (var i = 0; i < items.length; i++) {
          if (items[i].el === e.target) {
            items[i].on = e.isIntersecting;
            /* will-change only while on screen */
            e.target.classList.toggle('s3d-on', e.isIntersecting);
            if (e.isIntersecting) items[i].s = 0;
            break;
          }
        }
      });
      kick();
    }, { rootMargin: '25% 0px 25% 0px' });
  }

  if (native) return;
  collect();
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  addEventListener('load', function () { collect(); kick(); });
  /* menu / gallery / review cards are filled in by other scripts */
  if ('MutationObserver' in window) {
    var t = 0;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { collect(); kick(); }, 150); })
      .observe(document.body, { childList: true, subtree: true });
  }
  kick();
})();
