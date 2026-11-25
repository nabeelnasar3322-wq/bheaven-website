/* Page-wide scroll animation, driven by GSAP ScrollTrigger.
   Same depth effect the CSS in scroll3d.css describes (translate / rotate / scale from two variables),
   but one engine for the whole page: each section container gets a scrubbed ScrollTrigger that writes
     --s  position through the viewport: +1 just below the screen, 0 centred, -1 just above
     --a  |--s|
   on itself, so it runs the same in Chrome, Safari and Firefox and moves in step with the pinned
   tunnel gate and Lenis smooth scroll (flight.js). flight.js calls window.__bhGsapScroll() once GSAP is
   loaded and the gate is created. Skipped for reduced-motion and Data Saver (the page stays as it was). */
(function () {
  'use strict';
  var root = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if ((navigator.connection || {}).saveData) return;

  var SEL_FULL = '.about-photos,.features,.band,.reserve,.menu-cat-grid,.gal-grid,.loc,.head,.about-grid>div:first-child,.rvw,.faq,.ft-grid,.events,.gallery,.visit,.section.about,.scatter,.dgrid,.cards,.cat';
  var SEL_LITE = '.band,.reserve';
  var lite = matchMedia('(max-width: 899px), (hover: none)');
  var made = [], started = false;

  /* the Reserve section is big (form, concierge): write the variables onto its background layer only */
  function targetOf(el) { return el.classList.contains('reserve') ? (el.querySelector('.res-bg') || el) : el; }

  function build() {
    var i, els = document.querySelectorAll(lite.matches ? SEL_LITE : SEL_FULL);
    for (i = 0; i < made.length; i++) { made[i].tween.kill(); made[i].el.classList.remove('s3d-on'); delete made[i].el.__gs; }
    made = [];
    for (i = 0; i < els.length; i++) {
      (function (el) {
        var tg = targetOf(el), proxy = { s: 1 }, last = '';
        var tween = gsap.to(proxy, {
          s: -1, ease: 'none',
          scrollTrigger: {
            trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.5, invalidateOnRefresh: true,
            onToggle: function (st) { el.classList.toggle('s3d-on', st.isActive); }
          },
          onUpdate: function () {
            var sv = proxy.s.toFixed(3);
            if (sv === last) return;
            last = sv;
            tg.style.setProperty('--s', sv);
            tg.style.setProperty('--a', Math.abs(proxy.s).toFixed(3));
          }
        });
        el.__gs = true;
        made.push({ el: el, tween: tween });
      })(els[i]);
    }
  }

  window.__bhGsapScroll = function () {
    if (started || !window.gsap || !window.ScrollTrigger) return;
    started = true;
    gsap.registerPlugin(ScrollTrigger);
    /* hand the movement over from the CSS scroll timeline / the JS fallback to GSAP */
    if (window.__s3dStop) window.__s3dStop();
    root.classList.remove('s3d-native');
    root.classList.add('s3d-gsap');
    build();
    if (lite.addEventListener) lite.addEventListener('change', function () { build(); ScrollTrigger.refresh(); });

    /* menu / gallery / review cards are filled in by other scripts: re-measure when the page height changes */
    var h = document.documentElement.scrollHeight, t = 0;
    function check() {
      var n = document.documentElement.scrollHeight;
      if (Math.abs(n - h) > 2) { h = n; ScrollTrigger.refresh(); }
    }
    if ('ResizeObserver' in window) new ResizeObserver(function () { clearTimeout(t); t = setTimeout(check, 250); }).observe(document.body);
    addEventListener('load', function () { ScrollTrigger.refresh(); });
  };
})();
