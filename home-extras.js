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

    /* pointer tilt + moving highlight (mouse only) */
    if (!reduce && matchMedia('(hover:hover) and (pointer:fine)').matches) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', ((x - .5) * 6).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((.5 - y) * 5).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    }
  });

  /* sparkles + animated borders only run while the strip is on screen */
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

/* festive photo lightbox: tap a card photo to view all its photos full size */
(function () {
  var sec = document.getElementById('festive');
  if (!sec) return;
  var box, img, cap, list = [], idx = 0, lastFocus, x0 = null;
  function big(src) { return src.replace('/festive/', '/festive/L/'); }
  function show(i) {
    idx = (i + list.length) % list.length;
    img.src = big(list[idx].getAttribute('src')); img.alt = list[idx].alt;
    cap.textContent = (idx + 1) + ' / ' + list.length;
  }
  function close() { if (!box) return; box.hidden = true; document.documentElement.classList.remove('fs-lb-open'); document.removeEventListener('keydown', key); if (lastFocus) lastFocus.focus(); }
  function key(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(idx + 1);
    else if (e.key === 'ArrowLeft') show(idx - 1);
  }
  function build() {
    box = document.createElement('div');
    box.className = 'fs-lb'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Photos');
    box.innerHTML = '<button type="button" class="fs-lb-x" aria-label="Close">×</button><button type="button" class="fs-lb-p" aria-label="Previous photo">‹</button><img alt=""><button type="button" class="fs-lb-n" aria-label="Next photo">›</button><p class="fs-lb-c"></p>';
    document.body.appendChild(box);
    img = box.querySelector('img'); cap = box.querySelector('.fs-lb-c');
    box.querySelector('.fs-lb-x').onclick = close;
    box.querySelector('.fs-lb-p').onclick = function () { show(idx - 1); };
    box.querySelector('.fs-lb-n').onclick = function () { show(idx + 1); };
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) { if (x0 === null) return; var d = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(d) > 40) show(idx + (d < 0 ? 1 : -1)); });
  }
  function open(card, start, from) {
    if (!box) build();
    list = [].slice.call(card.querySelectorAll('.fs-photo img'));
    lastFocus = from; box.hidden = false; document.documentElement.classList.add('fs-lb-open');
    show(start); document.addEventListener('keydown', key);
    box.querySelector('.fs-lb-x').focus();
  }
  [].forEach.call(sec.querySelectorAll('.fs-card'), function (card) {
    var top = card.querySelector('.fs-top'); if (!top) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'fs-zoom'; b.setAttribute('aria-label', 'View photos larger'); b.innerHTML = '<span aria-hidden="true">⤢</span> Photos';
    top.appendChild(b);
    top.addEventListener('click', function (e) {
      if (e.target.closest('.fs-count')) return;
      var imgs = [].slice.call(card.querySelectorAll('.fs-photo img')), cur = 0, i;
      for (i = 0; i < imgs.length; i++) if (parseFloat(getComputedStyle(imgs[i]).opacity) > 0.5) { cur = i; break; }
      open(card, cur, b);
    });
  });
})();

/* festive card frame: glowing travelling border + noise + click pulse (CSS recreation of an animated frame-border look) */
(function () {
  var sec = document.getElementById('festive');
  if (!sec) return;
  [].forEach.call(sec.querySelectorAll('.fs-card'), function (card) {
    var fx = document.createElement('span');
    fx.className = 'fs-fx'; fx.setAttribute('aria-hidden', 'true');
    fx.innerHTML = '<span class="fs-in"><span class="fs-glow"></span><span class="fs-noise"></span><span class="fs-ring"></span></span>';
    card.insertBefore(fx, card.firstChild);
    var inner = fx.firstChild;
    card.addEventListener('pointerdown', function (e) {
      if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
      var r = card.getBoundingClientRect(), rip = document.createElement('span');
      rip.className = 'fs-rip'; rip.style.left = (e.clientX - r.left) + 'px'; rip.style.top = (e.clientY - r.top) + 'px';
      inner.appendChild(rip); setTimeout(function () { rip.remove(); }, 1000);
      inner.classList.remove('fs-flash'); void inner.offsetWidth; inner.classList.add('fs-flash');
    });
  });
})();

/* festive twisting gallery: photos tilt + twist in 3D as the column moves (page scroll + slow drift + mouse drag) */
(function () {
  var sec = document.getElementById('festive'), grid = sec && sec.querySelector('.fs-grid');
  if (!grid) return;
  var photos = [
    ['xmas-1', 'Christmas table under the B-Heaven sign'], ['nye-4', 'DJ hands on the decks'], ['xmas-3', 'Golden reindeer and red berries'],
    ['nye-1', 'New Year table with disco balls'], ['xmas-2', 'Festive centrepiece with candles'], ['nye-2', 'DJ at the B-Heaven party'],
    ['nye-3', 'DJ with the Dubai skyline'], ['nye-5', 'DJ playing under fairy lights']
  ];
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches, fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  var gal = document.createElement('aside');
  gal.className = 'fs-gal'; gal.setAttribute('aria-label', 'Festive photo gallery');
  var tiles = photos.map(function (p) {
    var t = document.createElement('div'); t.className = 'fs-tile';
    t.innerHTML = '<img src="/festive/' + p[0] + '.webp" alt="' + p[1] + '" loading="lazy" decoding="async">';
    gal.appendChild(t); return t;
  });
  grid.insertBefore(gal, grid.firstChild);
  var seed = 7; function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  var cfg = tiles.map(function () { return { tilt: (rnd() * 2 - 1) * 9, roll: (rnd() * 2 - 1) * 8, twist: 120 + rnd() * 60 }; });
  var first = true, W = 0, H = 0, tw = 0, th = 0, step = 0, total = 0, cur = 0, tgt = 0, auto = 0, drag = 0, speed = 0, last = 0, raf = 0, hover = false, vis = false, dragging = false, dx = 0;
  function measure() {
    W = gal.clientWidth; H = gal.clientHeight; tw = Math.min(220, W * 0.78); th = tw / 0.8; step = th + 36; total = step * tiles.length;
    tiles.forEach(function (t) { t.style.width = tw + 'px'; t.style.height = th + 'px'; t.style.marginLeft = (-tw / 2) + 'px'; });
  }
  function render() {
    var sp = Math.min(Math.max(speed - 8, 0) / 40, 1);
    for (var i = 0; i < tiles.length; i++) {
      var p = (((i * step - cur) % total) + total) % total; if (p > total - step) p -= total;
      var t = tiles[i], c = (p + th / 2 - H / 2) / (H / 2 + th / 2);
      if (p > H + 20 || p < -th - 20) { t.style.visibility = 'hidden'; continue; }
      t.style.visibility = 'visible';
      var a = Math.min(Math.abs(c), 1.3), sx = Math.sin(p / H * 2.2) * W * 0.12, z = -150 * (1 - Math.min(a, 1)), g = Math.min(0.9, 0.15 + a * 0.8) * (1 - sp * 0.4) + sp * 0.3;
      t.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + p.toFixed(1) + 'px,' + z.toFixed(0) + 'px) rotateX(' + (cfg[i].tilt).toFixed(1) + 'deg) rotateY(' + (c * cfg[i].twist / 2).toFixed(1) + 'deg) rotateZ(' + (cfg[i].roll).toFixed(1) + 'deg)';
      t.style.filter = 'grayscale(' + g.toFixed(2) + ')' + (sp > 0.05 ? ' blur(' + (sp * 3).toFixed(1) + 'px)' : '');
      t.style.zIndex = Math.round((1 - Math.min(a, 1)) * 10);
    }
  }
  function frame(now) {
    if (first) { first = false; cur = auto + window.scrollY * 0.45 + drag; }
    var dt = Math.min(now - last, 50) / 1000; last = now;
    if (!hover || dragging) { /* drift pauses while hovering */ }
    if (!hover && !dragging) auto += 26 * dt;
    tgt = auto + window.scrollY * 0.45 + drag;
    var prev = cur; cur += (tgt - cur) * 0.1;
    speed = speed * 0.85 + Math.abs(cur - prev) * 0.15 * 3;
    render();
    raf = vis ? requestAnimationFrame(frame) : 0;
  }
  function start() { if (!raf && !reduce) { first = true; last = performance.now(); raf = requestAnimationFrame(frame); } }
  gal.classList.add('on');
  measure(); cur = tgt = 120; render();
  if (reduce) return;
  addEventListener('resize', function () { measure(); render(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) start(); }, { rootMargin: '10% 0px' }).observe(gal);
  } else { vis = true; start(); }
  if (fine) {
    gal.addEventListener('mouseenter', function () { hover = true; });
    gal.addEventListener('mouseleave', function () { hover = false; });
  }
  gal.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') return; dragging = true; dx = e.clientY; gal.setPointerCapture(e.pointerId); gal.classList.add('grab'); });
  gal.addEventListener('pointermove', function (e) { if (!dragging) return; drag -= (e.clientY - dx) * 1.5; dx = e.clientY; });
  function up() { dragging = false; gal.classList.remove('grab'); }
  gal.addEventListener('pointerup', up); gal.addEventListener('pointercancel', up);
})();
