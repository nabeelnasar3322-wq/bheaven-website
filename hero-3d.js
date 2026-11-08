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
  var PARTS = [['day', 'Poolside day'], ['sunset', 'Golden sunset'], ['night', 'Starlit night']];
  var label = document.getElementById('daypartLabel');
  /* a fixed caption that names the stage as you scroll (the hero text fades out during the scroll) */
  var cap = document.createElement('div');
  cap.className = 'sky-cap'; cap.setAttribute('aria-hidden', 'true');
  cap.innerHTML = '<span class="sky-n">01</span><span class="sky-t"></span><span class="sky-dots"><b></b><b></b><b></b></span>';
  stick.appendChild(cap);
  var capN = cap.querySelector('.sky-n'), capT = cap.querySelector('.sky-t'), capD = cap.querySelectorAll('.sky-dots b');



  /* the clip must not run on its own: it is driven only by the scroll position */
  v.loop = false; v.autoplay = false;
  v.addEventListener('play', function () { v.pause(); });
  function measure() {
    var r = hero.getBoundingClientRect();
    start = r.top + window.pageYOffset;
    range = Math.max(1, hero.offsetHeight - stick.offsetHeight);
  }
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function setPart(name, text) {
    if (name === lastPart) return; lastPart = name;
    document.documentElement.setAttribute('data-daypart', name);
    if (label) { label.style.opacity = '0'; setTimeout(function () { label.textContent = text; label.style.opacity = ''; }, 200); }
    var idx = PARTS.findIndex(function (q) { return q[0] === name; });
    capN.textContent = '0' + (idx + 1); capT.textContent = text;
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
    setPart(PARTS[part][0], PARTS[part][1]);
  }
  function progress() {
    return Math.max(0, Math.min(1, (window.pageYOffset - start) / range));
  }
  function tick() {
    raf = 0;
    var p = progress();
    apply(p);
    goal = p * (dur || 0);
    if (ready) {
      cur += (goal - cur) * 0.2;
      if (!v.seeking && Math.abs(goal - cur) > 0.012) { try { v.currentTime = cur; } catch (_) {} }
      if (Math.abs(goal - cur) > 0.012) raf = requestAnimationFrame(tick);
    }
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
