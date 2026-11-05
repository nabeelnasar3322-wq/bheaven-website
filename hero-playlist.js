/* Hero video playlist: three clips, 6 seconds each, cross-fading into one another.
   The next clip is buffered in a hidden twin <video> while the current one plays.
   Skipped (single clip stays) for Data Saver and reduced-motion visitors. */
(function () {
  'use strict';
  var a = document.getElementById('heroVid'); if (!a) return;
  var conn = navigator.connection || {};
  if (conn.saveData || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var CLIPS = ['/bhvn.mp4', '/bhvn888.mp4', '/bheaven-clouds.mp4'], HOLD = 6000, FADE = 1300, idx = 0;

  var b = a.cloneNode(false);
  b.removeAttribute('id'); b.removeAttribute('poster'); b.removeAttribute('src'); b.removeAttribute('autoplay');
  b.setAttribute('preload', 'auto'); b.muted = true; b.defaultMuted = true; b.classList.add('off');
  a.parentNode.insertBefore(b, a.nextSibling);

  var cur = a, nxt = b, timer;
  function preload() { idx = (idx + 1) % CLIPS.length; nxt.src = CLIPS[idx]; nxt.load(); }
  function swap() {
    var go = function () {
      nxt.currentTime = 0;
      var p = nxt.play(); if (p && p.catch) p.catch(function () {});
      nxt.classList.add('top'); nxt.classList.remove('off');
      var old = cur; cur = nxt; nxt = old;
      setTimeout(function () { old.pause(); old.classList.add('off'); old.classList.remove('top'); preload(); }, FADE + 100);
      timer = setTimeout(swap, HOLD);
    };
    if (nxt.readyState >= 3) go();
    else { var done = false, f = function () { if (done) return; done = true; go(); }; nxt.addEventListener('canplay', f, { once: true }); setTimeout(f, 2500); }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) clearTimeout(timer); else { clearTimeout(timer); timer = setTimeout(swap, 800); if (cur.paused) cur.play().catch(function () {}); }
  });
  function begin() { preload(); timer = setTimeout(swap, HOLD); }
  if (document.readyState === 'complete') setTimeout(begin, 800); else addEventListener('load', function () { setTimeout(begin, 800); }, { once: true });
})();
