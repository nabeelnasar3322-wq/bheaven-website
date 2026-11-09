/* Interactive depth layer on top of the 3D scroll (desktop mouse only, skipped for reduced motion / Data Saver).
   1. Pointer tilt: cards, gallery tiles, about photos, features and the map lean toward the cursor.
   2. Scroll velocity: the same blocks lean a little with scroll speed and settle when you stop.
   Both write CSS variables on the element itself, only while it is hovered / moving, and the CSS
   uses the separate `transform` property, so it stacks on top of the scroll animation without fighting it. */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if ((navigator.connection || {}).saveData) return;
  if (!matchMedia('(min-width:900px) and (hover:hover) and (pointer:fine)').matches) return;
  var root = document.documentElement;
  var SEL = '.menu-cat-grid .tcard,.gal-grid .ph,.about-photos .ph,.features .feature,.loc .loc-map';
  var CONT = '.menu-cat-grid,.gal-grid,.about-photos,.features';
  var live = new Set(), raf = 0;

  /* ---- pointer tilt: spring each hovered card toward the cursor, then back to flat ---- */
  function onMove(e) {
    var el = e.target.closest && e.target.closest(SEL);
    if (!el || root.classList.contains('perf-1') || root.classList.contains('perf-2')) return;
    var r = el.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    var st = el.__t || (el.__t = { x: 0, y: 0, tx: 0, ty: 0 });
    st.tx = px; st.ty = py; st.on = true;
    el.classList.add('tilt-on');
    live.add(el); kick();
  }
  function onLeave(e) {
    var el = e.target.closest && e.target.closest(SEL);
    if (!el || !el.__t) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    el.__t.tx = 0; el.__t.ty = 0; el.__t.on = false;
    kick();
  }
  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerout', onLeave, { passive: true });

  /* ---- scroll velocity ---- */
  var lastY = scrollY, vel = 0, shown = 0, conts = [], vis = new Set();
  function collect() {
    conts = [].slice.call(document.querySelectorAll(CONT));
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (x) { x.isIntersecting ? vis.add(x.target) : vis.delete(x.target); });
      }, { rootMargin: '10% 0px' });
      conts.forEach(function (c) { io.observe(c); });
    } else conts.forEach(function (c) { vis.add(c); });
  }
  collect();
  addEventListener('load', function () { setTimeout(collect, 600); });
  addEventListener('scroll', kick, { passive: true });

  function kick() { if (!raf) raf = requestAnimationFrame(tick); }
  function tick() {
    raf = 0;
    var busy = false;
    /* velocity: pixels per frame, smoothed, clamped to a gentle +-1 */
    var y = scrollY, d = y - lastY; lastY = y;
    vel += (Math.max(-60, Math.min(60, d)) / 60 - vel) * .18;
    if (Math.abs(vel) < .002 && d === 0) vel = 0;
    var v = Math.round(vel * 1000) / 1000;
    if (v !== shown) {
      shown = v;
      vis.forEach(function (c) { c.style.setProperty('--vel', v); });
    }
    if (v !== 0) busy = true;
    /* tilt springs */
    live.forEach(function (el) {
      var s = el.__t;
      s.x += (s.tx - s.x) * .16; s.y += (s.ty - s.y) * .16;
      var done = !s.on && Math.abs(s.x) < .002 && Math.abs(s.y) < .002;
      if (done) {
        s.x = s.y = 0;
        el.style.removeProperty('--ix'); el.style.removeProperty('--iy');
        el.classList.remove('tilt-on'); live.delete(el); return;
      }
      el.style.setProperty('--ix', (-s.y * 9).toFixed(2) + 'deg');
      el.style.setProperty('--iy', (s.x * 11).toFixed(2) + 'deg');
      busy = true;
    });
    if (busy) raf = requestAnimationFrame(tick);
  }
})();
