/* SplitText heading reveal for the inner pages (menu, shisha, business lunch, privacy, terms, thank-you, 404).
   Same motion as the homepage section titles: each line is masked and its words rise in
   (y 100, fade in, 0.05s stagger, 1s, power4.out), once, when the heading scrolls into view.
   Repeated titles (menu/business-lunch categories .ch, shisha cards .card) get a lighter rise: y 40, 0.6s, 0.03s stagger.
   - Headings already on screen when the page opens stay still (no flash, no delay to the first paint).
   - GSAP + SplitText (/vendor) load only when a heading below the fold needs them.
   - English only. The EN/ES/AR switch translates text node by node, so a heading goes back to plain
     text as soon as its words land, and any heading still waiting is put back the moment the language changes.
   - Headings the page adds later (menu categories, drinks mode) are picked up.
   - Off for reduced motion and Data Saver. Opt a heading out with class="no-split". */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  if (!window.Promise || !window.requestAnimationFrame) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.connection || {}).saveData) return;

  var EXCL = '[aria-hidden="true"], .no-split, noscript, template';
  var LIGHT = '.ch, .card, .light-split';
  var list = [], libs = null, raf = 0;

  function english() { return (html.lang || 'en').slice(0, 2).toLowerCase() === 'en'; }
  function load(src) { return new Promise(function (ok, no) { var s = doc.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; doc.head.appendChild(s); }); }
  function getLibs() {
    if (!libs) libs = (window.gsap ? Promise.resolve() : load('/vendor/gsap.min.js'))
      .then(function () { return window.SplitText ? 0 : load('/vendor/SplitText.min.js'); })
      .then(function () { gsap.registerPlugin(SplitText); });
    return libs;
  }

  function ok(h) {
    return !h.__sh && !h.closest(EXCL) && h.textContent.trim() && !h.querySelector('img,svg,video,input,button,select,textarea');
  }
  function scan(root, first) {
    if (!root || root.nodeType !== 1) return;
    var hs = root.matches('h1,h2') ? [root] : [].slice.call(root.querySelectorAll('h1,h2'));
    hs.forEach(function (h) {
      if (!ok(h)) return;
      h.__sh = { s: 'new' }; list.push(h);
      /* on screen when the page opens (or when it is added in view): leave it still */
      var r = h.getBoundingClientRect();
      if (r.height && r.top < innerHeight * 0.9 && (first || r.bottom > 0)) h.__sh.s = 'done';
    });
    check();
  }

  /* put a heading back to its own text, fully visible */
  function settle(h) {
    var st = h.__sh; if (!st) return;
    if (st.split) { st.split.revert(); st.split = null; st.t = null; }
    st.s = 'done';
  }

  function prepare(h) {
    var st = h.__sh; st.s = 'loading';
    getLibs().then(function () {
      var r = h.getBoundingClientRect();
      /* scrolled past while GSAP was loading, or no longer English: leave it as it is */
      if (st.s !== 'loading' || !english() || !h.isConnected || r.top < innerHeight * 0.9) { st.s = 'done'; return; }
      st.s = 'ready';
      st.split = SplitText.create(h, {
        type: 'lines, words',
        mask: 'lines',
        autoSplit: true,
        onSplit: function (self) {
          /* section titles get the full rise; repeated titles (menu categories, shisha cards) a lighter, quicker one */
          var light = !!h.closest(LIGHT);
          var t = gsap.from(self.words, {
            duration: light ? 0.6 : 1, y: light ? 40 : 100, autoAlpha: 0, stagger: light ? 0.03 : 0.05, ease: 'power4.out', paused: true,
            onComplete: function () { requestAnimationFrame(function () { settle(h); }); }
          });
          st.t = t;
          if (st.s === 'playing') t.play();
          return t;
        }
      });
      check();
    }).catch(function () { st.s = 'done'; });
  }

  /* one pass over the headings still to do: read positions only */
  function pass() {
    raf = 0;
    var vh = innerHeight, en = english();
    list = list.filter(function (h) {
      var st = h.__sh;
      if (!h.isConnected) { if (st.split) settle(h); return false; }
      if (st.s === 'done') return false;
      if (!en) { settle(h); return false; }
      var r = h.getBoundingClientRect();
      if (!r.height) return true; /* hidden (other tab): wait */
      if (st.s === 'new' && r.top < vh * 2) prepare(h);              /* one screen ahead: split, words hidden */
      else if (st.s === 'ready' && r.top < vh * 0.88) { st.s = 'playing'; if (st.t) st.t.play(); }  /* in view (or passed): play */
      return true;
    });
    if (!list.length) { removeEventListener('scroll', check); removeEventListener('resize', check); }
  }
  function check() { if (!raf) raf = requestAnimationFrame(pass); }

  function init() {
    addEventListener('scroll', check, { passive: true });
    addEventListener('resize', check);
    scan(doc.body, true);

    var q = [], tick = 0;
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) q.push(n); }); });
      if (!tick) tick = requestAnimationFrame(function () {
        tick = 0; var a = q; q = [];
        a.forEach(function (n) { if (n.isConnected) scan(n, false); });
        if (list.length) { addEventListener('scroll', check, { passive: true }); addEventListener('resize', check); }
      });
    }).observe(doc.body, { childList: true, subtree: true });

    /* language switched away from English: every heading still waiting goes back to plain text */
    new MutationObserver(function () {
      if (english()) return;
      list.forEach(settle); list = [];
    }).observe(html, { attributes: true, attributeFilter: ['lang'] });
  }

  var go = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(init); };
  doc.readyState === 'complete' ? go() : addEventListener('load', go);
})();
