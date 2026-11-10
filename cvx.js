/* Concave carousel: cards sit on an arc that curves toward the viewer. Click a side card, use the arrows,
   swipe/drag, or press the arrow keys. Loops. Slow autoplay that pauses on hover, focus and when off-screen. */
(function () {
  var root = document.getElementById('look'), stage = document.getElementById('cvxStage');
  if (!root || !stage) return;
  var cards = [].slice.call(root.querySelectorAll('.cvx-card')), N = cards.length;
  var tag = document.getElementById('cvxTag'), title = document.getElementById('cvxTitle');
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cur = 0, timer = 0, visible = false, hover = false, dragging = false;
  root.classList.add('cvx-on');

  function wrap(d) { d = ((d % N) + N) % N; return d > N / 2 ? d - N : d; }
  function layout() {
    var narrow = stage.clientWidth < 700;
    var R = narrow ? 420 : 760, step = (narrow ? 30 : 24) * Math.PI / 180, far = narrow ? 1 : stage.clientWidth > 1250 ? 3 : 2;
    cards.forEach(function (c, i) {
      var d = wrap(i - cur), a = d * step, ad = Math.abs(d), show = ad <= far;
      c.style.setProperty('--x', (R * Math.sin(a)).toFixed(1) + 'px');
      c.style.setProperty('--z', (R * (1 - Math.cos(a)) - ad * 10).toFixed(1) + 'px');
      c.style.setProperty('--r', (-a * 180 / Math.PI).toFixed(1) + 'deg');
      c.style.setProperty('--o', show ? (ad === 0 ? 1 : ad === 1 ? .95 : ad === 2 ? .8 : .6) : 0);
      c.style.setProperty('--b', ad === 0 ? 1 : (1 - Math.min(ad, 3) * .16).toFixed(2));
      c.style.zIndex = String(10 - ad);
      c.style.pointerEvents = show ? '' : 'none';
      c.classList.toggle('is-side', ad !== 0);
      c.setAttribute('aria-hidden', ad === 0 ? 'false' : 'true');
    });
    tag.textContent = cards[cur].dataset.tag; title.textContent = cards[cur].dataset.cap;
  }
  function go(n) { cur = ((n % N) + N) % N; layout(); restart(); }
  function next() { go(cur + 1); } function prev() { go(cur - 1); }
  function restart() {
    clearInterval(timer); if (rm) return;
    timer = setInterval(function () { if (visible && !hover && !dragging && !document.hidden) cur = (cur + 1) % N, layout(); }, 4800);
  }

  document.getElementById('cvxNext').addEventListener('click', next);
  document.getElementById('cvxPrev').addEventListener('click', prev);
  cards.forEach(function (c, i) { c.addEventListener('click', function () { if (!moved && i !== cur) go(i); }); });
  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  });
  stage.addEventListener('mouseenter', function () { hover = true; });
  stage.addEventListener('mouseleave', function () { hover = false; });
  stage.addEventListener('focusin', function () { hover = true; });
  stage.addEventListener('focusout', function () { hover = false; });

  /* swipe / drag */
  var sx = 0, moved = false, acc = 0;
  stage.addEventListener('pointerdown', function (e) { dragging = true; moved = false; sx = e.clientX; acc = 0; stage.classList.add('drag'); });
  window.addEventListener('pointermove', function (e) {
    if (!dragging) return; var dx = e.clientX - sx;
    if (Math.abs(dx) > 6) moved = true;
    if (Math.abs(dx) - acc > 70 || acc - Math.abs(dx) > 0) { /* noop: handled on release */ }
  });
  window.addEventListener('pointerup', function (e) {
    if (!dragging) return; dragging = false; stage.classList.remove('drag');
    var dx = e.clientX - sx;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
    setTimeout(function () { moved = false; }, 0);
  });
  window.addEventListener('pointercancel', function () { dragging = false; stage.classList.remove('drag'); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: .25 }).observe(root);
    new IntersectionObserver(function (en, o) { if (en[0].isIntersecting) { cards.forEach(function (c) { c.querySelector('img').loading = 'eager'; }); o.disconnect(); } }, { rootMargin: '900px 0px' }).observe(root);
  }
  else visible = true;
  window.addEventListener('resize', layout, { passive: true });
  layout(); restart();
})();
