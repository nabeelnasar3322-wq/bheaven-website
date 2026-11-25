/* GSAP scroll layer for the homepage (see gsap-scroll.css).
   Takes over the page-wide scroll motion once GSAP + ScrollTrigger are loaded (flight.js loads them
   when the page is idle and fires `bh:gsap`). From then on every section below the hero is scrubbed
   to the scroll position, so it plays as you scroll down and rewinds as you scroll up:
     - gold reading-progress line across the top
     - section titles: eyebrow slides in, the words of the heading rise one by one, the intro follows
     - event carousel glides in, menu cards rise in a fanned wave, photo band opens out
     - gallery tiles rise by column, reviews sweep in from the side, booking form and map lift in
     - FAQ rows and footer columns stack in
   The hero, the tunnel gate, the festive strip and the rooftop photo grid keep their own motion.
   Off for reduced-motion and Data Saver, and switched off again if the battery-saver guard in
   flight.js drops the page to its lightest level (html.perf-2). */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if ((navigator.connection || {}).saveData) return;
  var started = false, mm = null, bar = null;

  function $$(s, r) { return [].slice.call((r || doc).querySelectorAll(s)); }
  var NEUTRAL = { '--gsx': '0px', '--gsy': '0px', '--gss': 1, '--gsr': '0deg', '--gso': 1 };
  function to(from) { var o = {}; for (var k in from) if (k in NEUTRAL) o[k] = NEUTRAL[k]; return o; }

  /* one scrubbed tween: elements go from `from` to rest while the trigger crosses start → end */
  function scrub(els, from, st, extra) {
    els = (Array.isArray(els) ? els : [els]).filter(Boolean);
    if (!els.length) return null;
    els.forEach(function (e) { e.classList.add('gs-t'); });
    var vars = to(from); vars.ease = 'none';
    for (var k in extra) vars[k] = extra[k];
    vars.scrollTrigger = { trigger: st.trigger || els[0], start: st.start || 'top 92%', end: st.end || 'top 58%', scrub: st.scrub == null ? .7 : st.scrub, toggleClass: { targets: els, className: 'gs-live' } };
    return gsap.fromTo(els, from, vars);
  }

  /* section title: eyebrow, heading words, then everything else listed in `rest` */
  function title(box, k, rest) {
    if (!box) return;
    var eb = box.querySelector('.eyebrow'), h = box.querySelector('h2');
    var words = h ? $$('.wd', h) : [];
    if (h && h.matches('.split') && window.SplitText) words = [];
    else if (h && !words.length) words = [h];
    var after = rest ? $$(rest, box) : [];
    var all = [eb].concat(words, after).filter(Boolean);
    var tl = gsap.timeline({ scrollTrigger: { trigger: box, start: 'top 94%', end: 'top 52%', scrub: .7, toggleClass: { targets: all, className: 'gs-live' } } });
    all.forEach(function (e) { e.classList.add('gs-t'); });
    if (eb) tl.fromTo(eb, { '--gsx': -44 * k + 'px', '--gso': 0 }, { '--gsx': '0px', '--gso': 1, ease: 'none', duration: .5 }, 0);
    if (words.length) tl.fromTo(words, { '--gsy': '95%', '--gsr': 7 * k + 'deg', '--gso': 0 }, { '--gsy': '0%', '--gsr': '0deg', '--gso': 1, ease: 'none', duration: .6, stagger: .09 }, .12);
    if (after.length) tl.fromTo(after, { '--gsy': 34 * k + 'px', '--gso': 0 }, { '--gsy': '0px', '--gso': 1, ease: 'none', duration: .5, stagger: .06 }, .4);
  }

  function build(ctx) {
    var D = ctx.conditions.desk, k = D ? 1 : .6;

    /* 1. reading progress */
    bar = doc.createElement('div'); bar.className = 'gs-bar'; bar.setAttribute('aria-hidden', 'true'); doc.body.appendChild(bar);
    gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .25 } });

    /* 2. section titles */
    title(doc.querySelector('.rg-head'), k, '.rg-feat li, .rg-lead');
    $$('#events .head, #menus .head, .gallery .head, #reserve .head').forEach(function (b) { title(b, k, '.lead'); });
    title(doc.querySelector('.rvHead'), k, '.rvScore');
    title(doc.querySelector('.faq .container'), k, '');
    title(doc.querySelector('.loc-info'), k, '.loc-facts li, .loc-actions .btn');

    /* 3. what's on: the carousel glides in from the right */
    scrub(doc.querySelector('#events .shows'), { '--gsx': 14 * k + 'vw', '--gso': 0 }, { start: 'top 98%', end: 'top 60%' });

    /* 4. menu cards: a fanned wave, outer columns tilt in */
    var cards = $$('#menuCatGrid .tcard'), cols = D ? 4 : 2;
    cards.forEach(function (c, i) {
      var col = i % cols, off = (col - (cols - 1) / 2);
      scrub(c, { '--gsy': (150 + Math.abs(off) * 50) * k + 'px', '--gss': .86, '--gsr': (D ? off * 3.5 : 0) + 'deg', '--gso': 0 },
        { trigger: '#menuCatGrid', start: 'top ' + (100 - col * 3) + '%', end: 'top ' + (52 - col * 3) + '%' });
    });
    scrub(doc.querySelector('.menu-foot'), { '--gsy': '24px', '--gso': 0 }, { start: 'top 98%', end: 'top 80%' });

    /* 5. photo band opens out, its words float up through it */
    var band = doc.querySelector('.band-2');
    if (band) {
      scrub(band, { '--gss': D ? .88 : .94 }, { start: 'top bottom', end: 'top 25%' });
      scrub($$('.band-inner > *', band), { '--gsy': 90 * k + 'px', '--gso': 0 }, { trigger: band, start: 'top 85%', end: 'top 20%' }, { stagger: .12 });
    }

    /* 6. gallery tiles rise by column (the feed can arrive late, so new tiles are picked up) */
    var gal = doc.getElementById('gallery'), seen = [];
    function galTiles() {
      var added = 0;
      $$('.ph', gal).forEach(function (t, i) {
        if (seen.indexOf(t) > -1) return; seen.push(t); added++;
        var col = i % (D ? 4 : 2);
        scrub(t, { '--gsy': (110 + col * 40) * k + 'px', '--gss': .84, '--gso': 0 }, { trigger: t, start: 'top 104%', end: 'top ' + (70 - col * 4) + '%' });
      });
      if (added) ScrollTrigger.refresh();
    }
    if (gal) {
      galTiles();
      var gt = 0; new MutationObserver(function () { clearTimeout(gt); gt = setTimeout(galTiles, 120); }).observe(gal, { childList: true });
    }
    scrub(doc.querySelector('.gal-cta'), { '--gsy': '30px', '--gso': 0 }, { start: 'top 98%', end: 'top 80%' });

    /* 7. reviews sweep in from the side */
    var rv = $$('.rvCard');
    if (rv.length) scrub(rv, { '--gsx': 180 * k + 'px', '--gsr': (D ? 3 : 0) + 'deg', '--gso': 0 }, { trigger: '#rvTrack', start: 'top 96%', end: 'top 50%' }, { stagger: .08 });
    scrub(doc.querySelector('.rvBtns'), { '--gsy': '26px', '--gso': 0 }, { start: 'top 98%', end: 'top 82%' });

    /* 8. booking form lifts out of the photo, map card scales in */
    scrub(doc.getElementById('resForm'), { '--gsy': 110 * k + 'px', '--gss': .95, '--gso': 0 }, { start: 'top 100%', end: 'top 60%' });
    scrub(doc.querySelector('#visit .loc'), { '--gsy': 70 * k + 'px', '--gss': .9, '--gso': .2 }, { start: 'top 100%', end: 'top 50%' });
    scrub(doc.querySelector('#visit .loc-map'), { '--gsx': 60 * k + 'px', '--gso': 0 }, { trigger: '#visit .loc', start: 'top 85%', end: 'top 40%' });

    /* 9. FAQ rows and footer stack in */
    scrub($$('.faq-list > details'), { '--gsy': 44 * k + 'px', '--gso': 0 }, { trigger: '.faq-list', start: 'top 96%', end: 'top 50%' }, { stagger: .1 });
    scrub($$('.ft-grid > *'), { '--gsy': 60 * k + 'px', '--gso': 0 }, { trigger: '.ft-grid', start: 'top 100%', end: 'bottom bottom' }, { stagger: .12 });

    return function () { if (bar) { bar.remove(); bar = null; } $$('.gs-t').forEach(function (e) { e.classList.remove('gs-t'); }); };
  }

  /* h2.split: SplitText masks each line and the words rise into it, once, when the heading scrolls into view.
     autoSplit re-splits after font loads and width changes; a heading that already played is not replayed. */
  var splits = [], played = typeof WeakSet === 'function' ? new WeakSet() : null;
  function splitHeadings() {
    if (!window.SplitText) return;
    gsap.registerPlugin(SplitText);
    $$('h2.split').forEach(function (h) {
      splits.push(SplitText.create(h, {
        type: 'lines, words',
        mask: 'lines',
        wordsClass: 'sw',
        autoSplit: true,
        onSplit: function (self) {
          if (played && played.has(h)) return;
          return gsap.from(self.words, {
            duration: 1,
            y: 100,
            autoAlpha: 0,
            stagger: 0.05,
            scrollTrigger: { trigger: h, start: 'top 88%', once: true, onEnter: function () { if (played) played.add(h); } }
          });
        }
      }));
    });
  }

  function start() {
    if (started || !window.gsap || !window.ScrollTrigger || html.classList.contains('perf-2')) return;
    started = true;
    gsap.registerPlugin(ScrollTrigger);
    /* hand the page over: the CSS depth scroll and the one-shot fade-ins stand down (content shown) */
    html.classList.add('gs');
    html.classList.remove('s3d', 's3d-full', 's3d-lite', 's3d-native');
    $$('[data-r], .ri, h2').forEach(function (e) { e.classList.add('in'); });
    splitHeadings();
    mm = gsap.matchMedia();
    mm.add({ desk: '(min-width: 900px)', mob: '(max-width: 899px)' }, build);
    ScrollTrigger.refresh();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    /* battery saver dropped the page to its lightest level: put everything back at rest */
    new MutationObserver(function () {
      if (mm && html.classList.contains('perf-2')) { mm.revert(); mm = null; html.classList.remove('gs'); splits.forEach(function (x) { x.revert(); }); splits = []; }
    }).observe(html, { attributes: true, attributeFilter: ['class'] });
  }

  doc.addEventListener('bh:gsap', start);
  start();
})();
