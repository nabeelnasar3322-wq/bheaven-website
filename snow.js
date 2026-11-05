/* Gentle, realistic snowfall: three depth layers (far = small, slow, faint; near = large, soft, quick),
   wind that gusts and eases, flakes that sway and tumble. Stays under the header, never blocks taps,
   pauses when the tab is hidden, and is skipped for visitors who ask for reduced motion. */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:40;pointer-events:none';
  document.body.appendChild(cv);
  var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, flakes = [], sprites = {};

  /* pre-rendered soft flake sprites: crisp core for far flakes, blurred glow for near ones */
  function sprite(blur) {
    var k = blur, s = sprites[k]; if (s) return s;
    var size = 64, c = document.createElement('canvas'); c.width = c.height = size;
    var g = c.getContext('2d'), r = size / 2, grad = g.createRadialGradient(r, r, 0, r, r, r);
    var core = 1 - blur * 0.55;
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(Math.max(0.05, core * 0.5), 'rgba(255,255,255,' + (0.95 - blur * 0.25) + ')');
    grad.addColorStop(Math.max(0.1, core * 0.8), 'rgba(235,244,255,' + (0.35 - blur * 0.1) + ')');
    grad.addColorStop(1, 'rgba(235,244,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, size, size);
    return (sprites[k] = c);
  }

  function make(initial) {
    var z = Math.random();                       /* 0 = far, 1 = near */
    var layer = z < 0.55 ? 0 : z < 0.88 ? 1 : 2;
    var base = [3, 5.5, 10.5][layer] * dpr, size = base * (0.75 + Math.random() * 0.6);
    return {
      x: Math.random() * (W + 200) - 100, y: initial ? Math.random() * H : -size * 2 - Math.random() * H * 0.2,
      s: size, layer: layer,
      vy: ([22, 42, 78][layer] + Math.random() * [14, 22, 34][layer]) * dpr,   /* px / second */
      sw: 0.5 + Math.random() * 1.1, ph: Math.random() * 6.283, amp: ([10, 18, 30][layer]) * dpr * (0.5 + Math.random()),
      a: [0.55, 0.75, 0.85][layer] * (0.7 + Math.random() * 0.3), spr: sprite([0, 0.35, 0.7][layer])
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.width = Math.round(innerWidth * dpr); H = cv.height = Math.round(innerHeight * dpr);
    var n = Math.round(Math.min(190, Math.max(55, innerWidth * innerHeight / 6800)));
    if (innerWidth < 700) n = Math.round(n * 0.7);
    flakes = []; for (var i = 0; i < n; i++) flakes.push(make(true));
  }

  var last = 0, running = true, t = 0;
  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; t += dt;
    /* slow wind: a steady drift plus gusts that rise and fall */
    var wind = (Math.sin(t * 0.18) * 0.6 + Math.sin(t * 0.47 + 1.3) * 0.4) * 22 * dpr + 10 * dpr;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i], k = [0.45, 0.8, 1.15][f.layer];
      f.y += f.vy * dt;
      f.x += (wind * k + Math.sin(t * f.sw + f.ph) * f.amp * 0.6) * dt;
      if (f.y - f.s > H || f.x > W + 120 || f.x < -160) { flakes[i] = f = make(false); if (f.x > W) f.x = Math.random() * W; }
      ctx.globalAlpha = f.a;
      var s = f.s * 2.2;
      ctx.drawImage(f.spr, f.x - s / 2, f.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', function () { if (document.hidden) running = false; else start(); });
  addEventListener('resize', resize, { passive: true });
  resize(); last = performance.now(); requestAnimationFrame(frame);
})();
