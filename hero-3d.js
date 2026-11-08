/* Hero 3D scroll: the uploaded skyline clip (Poolside Day -> Golden Sunset -> Starlit Night) is
   scrubbed by scroll position while the frame scales and drifts, giving a sense of depth as you
   scroll. Runs only where the inline check in index.html set window.__skyOn (desktop, hover,
   no reduced motion, no Data Saver). */
(function () {
  'use strict';
  if (!window.__skyOn) return;
  var hero = document.getElementById('hero'), v = document.getElementById('heroVid');
  if (!hero || !v) return;
  var pan = hero.querySelector('.pan'), stick = hero.querySelector('.sky-stick');
  if (!pan || !stick) return;

  var dur = 0, ready = false, goal = 0, cur = 0, raf = 0, lastPart = -1, start = 0, range = 1;
  /* the content that used to live in the "One rooftop, three moods" section, now surfaced
     here as you scroll through each stage of the hero clip */
  var PARTS = [
    { key: 'day', label: 'Poolside day', when: 'From 9 AM', title: 'Poolside days',
      desc: 'Sun loungers, fresh juices and a dedicated pool menu. Pool access passes are available for daytime visitors.',
      perks: ['Pool pass available', 'Fresh juices', 'Sun loungers'],
      cta: 'Book Pool Pass', href: 'https://wa.me/971506129150?text=Hi%20B%C2%B7Heaven%2C%20I%20would%20like%20to%20book%20a%20Poolside%20Day%20pass.' },
    { key: 'sunset', label: 'Golden sunset', when: 'Golden hour', title: 'Sunset & cocktails',
      desc: 'Watch the skyline turn gold with a signature cocktail in hand and the pool glowing below.',
      perks: ['Sunset Happy Hour', '180° Skyline views', 'Signature serves'],
      cta: 'Book Sunset Table', href: 'https://wa.me/971506129150?text=Hi%20B%C2%B7Heaven%2C%20I%20would%20like%20to%20reserve%20a%20Sunset%20table.' },
    { key: 'night', label: 'Starlit night', when: 'Until 2 AM', title: 'Nights above the city',
      desc: 'Modern Levant sharing plates, premium shisha and live entertainment under the stars.',
      perks: ['Live music & singer', 'Premium shisha', 'Charcoal Levant dining'],
      cta: 'Book Evening Lounge', href: 'https://wa.me/971506129150?text=Hi%20B%C2%B7Heaven%2C%20I%20would%20like%20to%20reserve%20an%20Evening%20table.' }
  ];
  var label = document.getElementById('daypartLabel');
  /* a fixed panel that names the stage and surfaces its details as you scroll (the hero text
     fades out early in the scroll; this panel fades in to replace it) */
  var cap = document.createElement('div');
  /* not aria-hidden: unlike the old label/dots-only version, this panel now carries the
     actual booking content moved out of the removed "day to night" section */
  cap.className = 'sky-cap';
  cap.innerHTML =
    '<div class="sky-top" aria-hidden="true"><span class="sky-n">01</span><span class="sky-when"></span><span class="sky-dots"><b></b><b></b><b></b></span></div>' +
    '<h3 class="sky-title"></h3>' +
    '<p class="sky-desc"></p>' +
    '<ul class="sky-perks"></ul>' +
    '<a class="sky-cta" target="_blank" rel="noopener"></a>';
  stick.appendChild(cap);
  var capN = cap.querySelector('.sky-n'), capWhen = cap.querySelector('.sky-when'), capD = cap.querySelectorAll('.sky-dots b'),
    capTitle = cap.querySelector('.sky-title'), capDesc = cap.querySelector('.sky-desc'),
    capPerks = cap.querySelector('.sky-perks'), capCta = cap.querySelector('.sky-cta');
  /* the clip must not run on its own: it is driven only by the scroll position */
  v.loop = false; v.autoplay = false;
  v.addEventListener('play', function () { v.pause(); });
  function measure() {
    var r = hero.getBoundingClientRect();
    start = r.top + window.pageYOffset;
    range = Math.max(1, hero.offsetHeight - stick.offsetHeight);
  }
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function setPart(idx) {
    var name = PARTS[idx].key;
    if (name === lastPart) return; lastPart = name;
    var d = PARTS[idx];
    document.documentElement.setAttribute('data-daypart', name);
    if (label) { label.style.opacity = '0'; setTimeout(function () { label.textContent = d.label; label.style.opacity = ''; }, 200); }
    capN.textContent = '0' + (idx + 1); capWhen.textContent = d.when;
    capTitle.textContent = d.title; capDesc.textContent = d.desc;
    capPerks.innerHTML = d.perks.map(function (t) { return '<li>' + t + '</li>'; }).join('');
    capCta.textContent = d.cta; capCta.href = d.href;
    for (var i = 0; i < capD.length; i++) capD[i].className = i === idx ? 'on' : '';
  }
  function apply(p) {
    var e = ease(p), root = hero.style;
    root.setProperty('--sk-s', (1.16 - 0.16 * e).toFixed(4));
    root.setProperty('--sk-y', ((1 - e) * -3.5).toFixed(2) + 'vh');
    var op = 1 - ease((p - 0.02) / 0.14);
    root.setProperty('--sk-op', op.toFixed(3));
    root.setProperty('--sk-cy', (p * -90).toFixed(1) + 'px');
    var part = p < 0.34 ? 0 : p < 0.67 ? 1 : 2;
    setPart(part);
  }
  function progress() {
    return Math.max(0, Math.min(1, (window.pageYOffset - start) / range));
  }
  function tick() {
    raf = 0;
    window.__skyBusy = true; /* tells hero-fx.js to skip its own parallax/bokeh work this
      frame, so that loop doesn't compete with the video-seek cost below for frame budget */
    var p = progress();
    apply(p);
    goal = p * (dur || 0);
    if (ready) {
      cur += (goal - cur) * 0.2;
      if (!v.seeking && Math.abs(goal - cur) > 0.012) { try { v.currentTime = cur; } catch (_) {} }
      if (Math.abs(goal - cur) > 0.012) { raf = requestAnimationFrame(tick); return; }
    }
    window.__skyBusy = false;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  function onMeta() {
    dur = v.duration || 10; ready = true; measure(); kick();
  }
  if (v.readyState >= 1) onMeta(); else v.addEventListener('loadedmetadata', onMeta, { once: true });
  v.addEventListener('seeked', kick);
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', function () { measure(); kick(); }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  setTimeout(measure, 600);
  apply(0);
})();
