/* Camera flight: next-night countdown, 3D event ring, tunnel gate (GSAP ScrollTrigger), Lenis smooth scroll. */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var save = !!(navigator.connection && navigator.connection.saveData);
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- 1. Countdown to the next weekly night (Asia/Dubai, UTC+4, no DST) ---------- */
  (function countdown() {
    var box = $('#nextCd'); if (!box || typeof EVENTS === 'undefined') return;
    var DUR = { grape: 4, jazz: 3, layali: 4, ibiza: 4 };
    var els = {}; box.querySelectorAll('.cd-n').forEach(function (n) { els[n.dataset.u] = n; });
    var pre = $('#cdPre'), nm = $('#cdName'), last = {};
    var DAY = 864e5, HR = 36e5;
    function pick() {
      var now = Date.now() + 4 * HR, d = new Date(now), best = null;
      EVENTS.forEach(function (e) {
        if (e.key === 'happy') return;
        var dur = (DUR[e.key] || 3) * HR;
        var st = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), e.startHour) + ((e.weekday - d.getUTCDay() + 7) % 7) * DAY;
        var prev = st - 7 * DAY;
        if (prev <= now && prev + dur > now) st = prev;
        else if (st + dur <= now) st += 7 * DAY;
        var live = st <= now, rem = live ? st + dur - now : st - now;
        if (!best || (live && !best.live) || (live === best.live && rem < best.rem)) best = { e: e, live: live, rem: rem };
      });
      return best;
    }
    function set(u, v) {
      var t = v < 10 ? '0' + v : '' + v;
      if (last[u] === t) return; last[u] = t; els[u].textContent = t;
      if (!rm && els[u].animate) els[u].animate([{ transform: 'rotateX(-80deg)', opacity: .15 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
    }
    function tick() {
      if (doc.hidden) return;
      var b = pick(); if (!b) return;
      var s = Math.max(0, Math.floor(b.rem / 1000));
      var txt = b.live ? 'Live now · ends in' : 'Next up';
      if (pre.textContent !== txt) pre.textContent = txt;
      if (nm.textContent !== b.e.title) nm.textContent = b.e.title;
      set('d', Math.floor(s / 86400)); set('h', Math.floor(s % 86400 / 3600)); set('m', Math.floor(s % 3600 / 60)); set('s', s % 60);
      box.hidden = false;
    }
    tick(); setInterval(tick, 1000);
  })();

  /* ---------- 1b. Hero: perks + CTA move out of the caption into a dock over the pool (desktop + iPad) ---------- */
  (function dock() {
    var mq = matchMedia('(min-width:900px)'), tries = 0, d = null, cap, perks, cta;
    function place() {
      if (!d) return;
      if (mq.matches) { d.appendChild(perks); d.appendChild(cta); d.hidden = false; }
      else { cap.appendChild(perks); cap.appendChild(cta); d.hidden = true; }
    }
    function init() {
      cap = $('.sky-cap'); perks = cap && $('.sky-perks', cap); cta = cap && $('.sky-cta', cap);
      if (!cap || !perks || !cta) { if (++tries < 25) setTimeout(init, 200); return; }
      d = doc.createElement('div'); d.className = 'sky-dock'; cap.parentNode.appendChild(d);
      mq.addEventListener ? mq.addEventListener('change', place) : mq.addListener(place);
      place();
    }
    init();
  })();

  if (rm || save) return;

  /* ---------- 2. 3D event ring (cylinder with inertia + depth-of-field) ---------- */
  function ring() {
    var track = $('#showTrack'), wrap = $('.shows');
    if (!track || !wrap || !track.children.length) return;
    var cards = [].slice.call(track.children), N = cards.length;
    var pos = window.__showCur || 0, target = pos, vel = 0, raf = 0, last = 0;
    var mqFan = matchMedia('(min-width:768px)'), fan = mqFan.matches;
    var dragging = false, moved = false, sx = 0, p0 = 0, lx = 0, lt = 0, v = 0, W = 300, R = 300, inView = false, blurOn = fine;
    html.classList.add('fl-ring');
    function measure() { fan = mqFan.matches; html.classList.toggle('fl-fan', fan); W = cards[0].offsetWidth || 300; R = Math.round(W * .5 / Math.tan(Math.PI / N) * 1.12 + 30); render(); }
    function render() {
      var step = 360 / N;
      for (var i = 0; i < N; i++) {
        var o = i - pos; o -= N * Math.round(o / N);
        if (fan) { /* wide arc fan: desktop + iPad */
          var ao = Math.abs(o), f = cards[i].style;
          f.transform = 'translate3d(' + (o * W * .82).toFixed(1) + 'px,' + (o * o * 16).toFixed(1) + 'px,' + (-ao * 90).toFixed(1) + 'px) rotateZ(' + (o * 5).toFixed(2) + 'deg) rotateY(' + (-o * 12).toFixed(2) + 'deg) scale(' + Math.max(.5, 1 - ao * .07).toFixed(3) + ')';
          f.opacity = ao > 2.6 ? 0 : Math.max(0, 1 - ao * .2 - Math.max(0, ao - 2) * .6).toFixed(3);
          f.filter = blurOn && ao > .6 ? 'blur(' + (Math.min(3, (ao - .5) * 1.6) * 2 | 0) / 2 + 'px)' : 'none';
          f.pointerEvents = ao > 2.2 ? 'none' : '';
          f.zIndex = 100 - Math.round(ao * 10);
          continue;
        }
        cards[i].style.zIndex = '';
        var ang = o * step, a = Math.abs(ang), c = cards[i], st = c.style;
        st.transform = 'translateZ(' + (-R) + 'px) rotateY(' + ang.toFixed(2) + 'deg) translateZ(' + R + 'px)';
        st.opacity = (1 - Math.min(1, a / 150) * .6).toFixed(3);
        st.filter = blurOn && a > 20 ? 'blur(' + (Math.min(4, (a - 20) / 20) * 2 | 0) / 2 + 'px)' : 'none';
        st.pointerEvents = a > 80 ? 'none' : '';
      }
    }
    function mod(x) { return ((Math.round(x) % N) + N) % N; }
    function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function frame(t) {
      raf = 0;
      var dt = Math.min(.05, (t - last) / 1000) || .016; last = t;
      if (!dragging) {
        pos += (target - pos) * (1 - Math.pow(1 - .085, dt * 60));
        if (Math.abs(target - pos) < .0008) {
          pos = target; render();
          var idx = mod(target);
          if (idx !== window.__showCur && window.__showGo) window.__showGo(idx);
          return;
        }
      }
      render(); raf = requestAnimationFrame(frame);
    }
    addEventListener('show:layout', function (e) {
      if (dragging) return;
      var d = (((e.detail.current - pos) % N) + N) % N; if (d > N / 2) d -= N;
      if (Math.abs(d) > 1e-4 && Math.abs(target - pos) < .01) target = pos + d; else if (Math.abs(d) > 1e-4) target = pos + d;
      kick();
    });
    wrap.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('a,button')) return;
      e.stopPropagation(); /* stop the flat carousel's own drag */
      dragging = true; moved = false; sx = lx = e.clientX; p0 = pos; v = 0; lt = performance.now();
      try { track.setPointerCapture(e.pointerId); } catch (_) {}
      track.classList.add('dragging');
    }, true);
    function mv(e) {
      if (!dragging) return;
      var dx = e.clientX - sx; if (Math.abs(dx) > 6) moved = true;
      pos = p0 - dx / (W * (fan ? .82 : .9));
      var now = performance.now(), dt = Math.max(1, now - lt);
      v = .6 * v + .4 * ((lx - e.clientX) / (W * (fan ? .82 : .9))) / dt * 16; lx = e.clientX; lt = now;
      render();
    }
    function up() {
      if (!dragging) return; dragging = false; track.classList.remove('dragging');
      target = Math.round(pos + v * 10); kick();
    }
    addEventListener('pointermove', mv, { passive: true });
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    wrap.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    /* vertical scroll nudges the ring while it is on screen */
    var sy = scrollY;
    addEventListener('scroll', function () {
      var dy = scrollY - sy; sy = scrollY;
      if (!inView || dragging || !dy) return;
      pos += Math.max(-80, Math.min(80, dy)) / 1100; target = Math.round(pos); kick();
    }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { inView = en[0].isIntersecting; }, { threshold: .15 }).observe(track);
    addEventListener('resize', measure);
    measure(); kick();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { setTimeout(ring, 0); }); else setTimeout(ring, 0);

  /* ---------- 3. Tunnel gate + Lenis (libraries load after the page is idle) ---------- */
  function load(src) { return new Promise(function (ok, no) { var s = doc.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; doc.head.appendChild(s); }); }
  function setup() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    var lenis = null;
    if (fine && window.Lenis) {
      lenis = new Lenis({ lerp: .1, wheelMultiplier: .95, smoothWheel: true, anchors: true, prevent: function (n) { return !!(n.closest && n.closest('[data-lenis-prevent],.lb,.wa-card,[role=dialog]')); } });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      var lock = function () { (html.style.overflow === 'hidden' || doc.body.style.overflow === 'hidden') ? lenis.stop() : lenis.start(); };
      new MutationObserver(lock).observe(html, { attributes: true, attributeFilter: ['style'] });
      new MutationObserver(lock).observe(doc.body, { attributes: true, attributeFilter: ['style'] });
    }
    var gate = $('#gate'); if (!gate) return;
    html.classList.add('fl-gate');
    var frame = $('.gate-frame', gate), deck = $('.gate-deck', gate), cap = $('.gate-cap', gate), sub = $('.gate-sub', gate);
    var tl = gsap.timeline({ scrollTrigger: { trigger: gate, start: 'top top', end: function () { return '+=' + Math.round(innerHeight * 1.25); }, pin: true, scrub: .6, anticipatePin: 1, invalidateOnRefresh: true } });
    tl.fromTo(frame, { scale: 1 }, { scale: function () { return Math.max(innerWidth / frame.offsetWidth, innerHeight / frame.offsetHeight) * 1.5; }, ease: 'power2.in', duration: 1 }, 0)
      .fromTo(deck, { scale: 1.18 }, { scale: 1, ease: 'none', duration: 1 }, 0)
      .fromTo(cap, { opacity: 0, y: 34, scale: .9 }, { opacity: 1, y: 0, scale: 1, ease: 'power2.out', duration: .35 }, .12)
      .fromTo(sub, { opacity: 0, y: 20 }, { opacity: 1, y: 0, ease: 'power2.out', duration: .3 }, .22)
      .to(cap, { opacity: 0, scale: 1.25, ease: 'power1.in', duration: .25 }, .72)
      .to(sub, { opacity: 0, ease: 'power1.in', duration: .22 }, .74);
    ScrollTrigger.refresh();
    addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    setTimeout(function () { ScrollTrigger.refresh(); }, 1200);
  }
  function boot() {
    load('/vendor/gsap.min.js').then(function () { return load('/vendor/ScrollTrigger.min.js'); })
      .then(function () { return fine ? load('/vendor/lenis.min.js').catch(function () {}) : 0; })
      .then(setup).catch(function () {});
  }
  var go = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 300); })(boot); };
  doc.readyState === 'complete' ? go() : addEventListener('load', go);
})();
