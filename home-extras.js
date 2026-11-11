/* Homepage extras: sticky Reserve/Call bar (phones) and cookie-free tap counting.
   Counting uses the same private /api/track collector as the menu, shisha and business-lunch pages. */
(function () {
  'use strict';

  /* ---- tap counting ---- */
  var sid;
  try { sid = sessionStorage.getItem('bh_sid'); if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('bh_sid', sid); } } catch (e) { sid = ''; }
  function send(t, l) {
    try {
      var p = JSON.stringify({ s: sid, e: [{ t: t, l: String(l).slice(0, 60) }] });
      if (!(navigator.sendBeacon && navigator.sendBeacon('/api/track', new Blob([p], { type: 'application/json' })))) {
        fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: p, keepalive: true }).catch(function () {});
      }
    } catch (e) {}
  }
  window.__bhTrack = send;
  try { if (!sessionStorage.getItem('bh_p_Home')) { sessionStorage.setItem('bh_p_Home', '1'); send('page', 'Home'); } } catch (e) {}

  function where(el) {
    if (el.closest('#mbar')) return 'sticky bar';
    if (el.closest('#header')) return 'header';
    if (el.closest('#mnav')) return 'mobile menu';
    if (el.closest('#hero')) return 'hero';
    if (el.closest('.footer')) return 'footer';
    if (el.closest('#visit')) return 'visit section';
    return 'page';
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a,button');
    if (!el) return;
    var href = el.getAttribute('href') || '';
    if (el.id === 'waFab') return send('book', 'WhatsApp chat widget (Home)');
    if (href.indexOf('tel:') === 0) return send('book', 'Call from Home (' + where(el) + ')');
    if (href.indexOf('api.whatsapp.com/send') > -1) return send('book', 'Book on WhatsApp (Home, ' + where(el) + ')');
    if (href === '#reserve') return send('book', 'Reserve tap (Home, ' + where(el) + ')');
    if (/^\/(menu|shisha|business-lunch)\//.test(href)) return send('page', 'Home to ' + href.split('/')[1]);
  }, true);

  /* ---- sticky Reserve / Call bar: phones only; hidden while the hero buttons or the Reserve section are on screen ---- */
  var bar = document.getElementById('mbar');
  if (!bar || !('IntersectionObserver' in window)) return;
  var covered = { hero: true, reserve: false };
  function update() { var show = !covered.hero && !covered.reserve; bar.classList.toggle('on', show); document.body.classList.toggle('has-mbar', show); }
  var heroActions = document.querySelector('.hero-actions'), reserve = document.getElementById('reserve');
  if (heroActions) new IntersectionObserver(function (en) { covered.hero = en[0].isIntersecting; update(); }).observe(heroActions);
  if (reserve) new IntersectionObserver(function (en) { covered.reserve = en[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(reserve);
})();

/* Google reviews carousel arrows */
(()=>{const t=document.getElementById('rvTrack');if(!t)return;const step=d=>t.scrollBy({left:d*(t.firstElementChild.offsetWidth+18),behavior:'smooth'});
const p=document.getElementById('rvP'),n=document.getElementById('rvN');if(p)p.onclick=()=>step(-1);if(n)n.onclick=()=>step(1)})();

/* Festive: live countdown to the New Year's Eve party (8 PM, Dubai time). Hidden once the night has started. */
(function () {
  'use strict';
  var box = document.getElementById('festiveCd'), out = document.getElementById('festiveCdT');
  if (!box || !out) return;
  var target = Date.parse('2026-12-31T20:00:00+04:00');
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var ms = target - Date.now();
    if (ms <= 0) { box.hidden = true; return false; }
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    out.textContent = d + (d === 1 ? ' day ' : ' days ') + pad(h) + ' h ' + pad(m) + ' min ' + pad(s % 60) + ' s';
    box.hidden = false;
    return true;
  }
  if (!tick()) return;
  var id = setInterval(function () { if (!tick()) clearInterval(id); }, 1000);
})();

/* Festive strip (interactive). Each night's card disappears once that night is over; the whole strip goes when
   both have (Dubai time). Package + guests give a live total and a pre-filled WhatsApp booking message. */
(function () {
  'use strict';
  var sec = document.getElementById('festive');
  if (!sec) return;
  var cards = sec.querySelectorAll('.fs-card'), left = 0, now = Date.now(), i;
  for (i = 0; i < cards.length; i++) {
    var until = Date.parse(cards[i].getAttribute('data-until'));
    if (until && now >= until) cards[i].remove(); else left++;
  }
  if (!left) { sec.remove(); return; }

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = function (n) { return 'AED ' + n.toLocaleString('en-US'); };
  var WA = 'https://wa.me/971506129150?text=';

  /* per-card: guests, package, total, WhatsApp link, countdown */
  Array.prototype.forEach.call(sec.querySelectorAll('.fs-card'), function (card) {
    var n = 2, shown = 0, raf = 0;
    var out = card.querySelector('.fs-n'), sum = card.querySelector('.fs-sum'), cta = card.querySelector('.fs-cta'), cd = card.querySelector('.fs-count');
    var target = Date.parse(card.getAttribute('data-until'));
    function opt() { return card.querySelector('input:checked'); }
    function total() { return n * Number(opt().getAttribute('data-price')); }
    function paint() {
      var t = total(), from = shown, t0 = performance.now();
      cancelAnimationFrame(raf);
      sum.classList.remove('bump'); void sum.offsetWidth; sum.classList.add('bump');
      if (reduce) { shown = t; sum.textContent = fmt(t); return; }
      (function step(ts) {
        var p = Math.min(1, (ts - t0) / 450), e = 1 - Math.pow(1 - p, 3);
        shown = Math.round(from + (t - from) * e); sum.textContent = fmt(shown);
        if (p < 1) raf = requestAnimationFrame(step);
      })(t0);
    }
    function link() {
      var o = opt(), msg = "Hi B-Heaven, I'd like to book " + card.getAttribute('data-event') + ' on ' + card.getAttribute('data-day') +
        ' for ' + n + (n === 1 ? ' guest' : ' guests') + ' – ' + o.value + ' package (' + fmt(total()) + ').';
      cta.href = WA + encodeURIComponent(msg);
    }
    function update() { out.textContent = n; paint(); link(); }
    card.addEventListener('click', function (e) {
      var b = e.target.closest('.fs-step'); if (!b) return;
      n = Math.max(1, Math.min(20, n + Number(b.getAttribute('data-d')))); update();
    });
    card.addEventListener('change', function (e) { if (e.target.name) update(); });
    shown = total(); sum.textContent = fmt(shown); link();

    function countdown() {
      var ms = target - Date.now(); if (ms <= 0) { cd.hidden = true; return; }
      var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5);
      cd.textContent = d > 0 ? 'Starts in ' + d + (d === 1 ? ' day ' : ' days ') + h + ' h' : 'Tonight';
      cd.hidden = false;
    }
    countdown(); setInterval(countdown, 60000);

    /* Book button opens/closes this night's booking panel (falls back to a plain WhatsApp link without JS) */
    var tog = card.querySelector('.fz-toggle');
    tog.setAttribute('role', 'button'); tog.setAttribute('aria-expanded', 'false');
    tog.addEventListener('click', function (e) {
      e.preventDefault();
      var open = !card.classList.contains('open');
      Array.prototype.forEach.call(sec.querySelectorAll('.fz-row.open'), function (r) {
        r.classList.remove('open'); var b = r.querySelector('.fz-toggle'); b.setAttribute('aria-expanded', 'false'); b.textContent = 'Book';
      });
      if (open) { card.classList.add('open'); tog.setAttribute('aria-expanded', 'true'); tog.textContent = 'Close'; }
    });
  });

  /* sparkles + shimmer + slow zoom only run while the strip is on screen */
  if (!reduce) {
    var box = sec.querySelector('.fs-sparks'), sp = matchMedia('(max-width:760px)').matches ? 10 : 18, html = '';
    for (i = 0; i < sp; i++) {
      html += '<span class="fs-sp" style="--x:' + (Math.random() * 100).toFixed(1) + '%;--s:' + (8 + Math.random() * 12).toFixed(0) + 'px;--d:' +
        (7 + Math.random() * 8).toFixed(1) + 's;--dl:-' + (Math.random() * 12).toFixed(1) + 's;--dx:' + (Math.random() * 60 - 30).toFixed(0) + 'px">✦</span>';
    }
    box.innerHTML = html;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { sec.classList.toggle('fs-live', es[0].isIntersecting); }, { rootMargin: '10% 0px' }).observe(sec);
    } else sec.classList.add('fs-live');
  }
})();

/* Festive photo slider: arrows, drag/swipe (native scroll), gentle auto-advance while visible, tap-to-enlarge. */
(function () {
  'use strict';
  var gal = document.querySelector('#festive .fz-gal');
  if (!gal) return;
  var track = gal.querySelector('.fz-track'), prev = gal.querySelector('.fz-prev'), next = gal.querySelector('.fz-next');
  var imgs = [].slice.call(track.querySelectorAll('img')), paused = false, visible = false;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function step() { var s = track.querySelector('.fz-slide'); return s ? s.getBoundingClientRect().width + 14 : 240; }
  function edges() { prev.disabled = track.scrollLeft < 4; next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4; }
  prev.addEventListener('click', function () { track.scrollBy({ left: -step() * 2 }); });
  next.addEventListener('click', function () { track.scrollBy({ left: step() * 2 }); });
  track.addEventListener('scroll', edges, { passive: true }); edges();
  ['mouseenter', 'focusin', 'touchstart'].forEach(function (e) { gal.addEventListener(e, function () { paused = true; }, { passive: true }); });
  ['mouseleave', 'focusout'].forEach(function (e) { gal.addEventListener(e, function () { paused = false; }); });
  if (!reduce) setInterval(function () {
    if (paused || !visible || document.hidden || document.querySelector('.fz-lb.on')) return;
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) track.scrollTo({ left: 0 }); else track.scrollBy({ left: step() });
  }, 3500);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(gal); else visible = true;

  var lb, lbImg, cur = 0, sx = 0;
  function build() {
    lb = document.createElement('div'); lb.className = 'fz-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML = '<button type="button" class="x" aria-label="Close">&times;</button><button type="button" class="p" aria-label="Previous photo">&#8249;</button><img alt=""><button type="button" class="n" aria-label="Next photo">&#8250;</button>';
    lbImg = lb.querySelector('img'); document.body.appendChild(lb);
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.className === 'x') close(); else if (e.target.className === 'p') go(-1); else if (e.target.className === 'n') go(1); });
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { var d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 50) go(d < 0 ? 1 : -1); });
  }
  function show(n) { cur = (n + imgs.length) % imgs.length; lbImg.src = imgs[cur].currentSrc || imgs[cur].src; lbImg.alt = imgs[cur].alt; }
  function go(d) { show(cur + d); }
  function open(n) { if (!lb) build(); show(n); lb.classList.add('on'); document.documentElement.style.overflow = 'hidden'; lb.querySelector('.x').focus(); }
  function close() { lb.classList.remove('on'); document.documentElement.style.overflow = ''; }
  track.addEventListener('click', function (e) { var b = e.target.closest('.fz-open'); if (b) open(imgs.indexOf(b.querySelector('img'))); });
  document.addEventListener('keydown', function (e) {
    if (!lb || !lb.classList.contains('on')) return;
    if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
  });
})();

/* scroll-bend for the festive slider */
(function () {
  'use strict';
  var track = document.querySelector('#festive .fz-track');
  if (!track || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var slides = [].slice.call(track.querySelectorAll('.fz-slide')), last = track.scrollLeft, vel = 0, raf = 0, vis = false;
  function frame() {
    var x = track.scrollLeft, dv = x - last; last = x;
    vel += (dv - vel) * 0.25;
    var r = track.getBoundingClientRect(), cx = r.left + r.width / 2, sk = Math.max(-9, Math.min(9, -vel * 0.35));
    for (var i = 0; i < slides.length; i++) {
      var b = slides[i].getBoundingClientRect(), d = (b.left + b.width / 2 - cx) / (r.width / 2);
      d = Math.max(-1.3, Math.min(1.3, d));
      slides[i].style.setProperty('--ry', (-d * 20).toFixed(2) + 'deg');
      slides[i].style.setProperty('--sc', (1 - Math.abs(d) * 0.07).toFixed(3));
      slides[i].style.setProperty('--sk', sk.toFixed(2) + 'deg');
    }
    raf = (vis && (Math.abs(vel) > 0.05 || true)) ? requestAnimationFrame(frame) : 0;
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
    vis = es[0].isIntersecting; if (vis && !raf) raf = requestAnimationFrame(frame);
  }).observe(track);
  else { vis = true; raf = requestAnimationFrame(frame); }
})();
