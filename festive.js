/* Festive glow for the homepage hero: a swag of twinkling string lights, a warm light bloom and a few sparkles.
   Colours stay inside the B·Heaven palette (gold, cream, lagoon) plus one soft coral accent. Honours reduced motion. */
(function () {
  'use strict';
  var hero = document.getElementById('hero'); if (!hero) return;
  var wrap = document.createElement('div'); wrap.className = 'fest-lights'; wrap.setAttribute('aria-hidden', 'true');
  hero.appendChild(wrap);
  var COL = ['#FFD98A', '#FBF7E2', '#9AB6BA', '#FFB36B', '#F29B9B', '#FFE9B8'];

  function build() {
    var W = hero.clientWidth, small = W < 700, span = small ? 190 : 300, n = Math.max(2, Math.round(W / span)), sw = W / n;
    var sag = small ? 30 : 42, H = sag + 34, out = '', bulbs = '', i = 0, step = small ? 40 : 52;
    out += '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg"><defs>' +
      COL.map(function (c, n) { return '<radialGradient id="fg' + n + '"><stop offset="0" stop-color="' + c + '" stop-opacity=".95"/><stop offset=".4" stop-color="' + c + '" stop-opacity=".35"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></radialGradient>'; }).join('') + '</defs>';
    for (var s = 0; s < n; s++) {
      var x0 = s * sw, x1 = x0 + sw, cx = x0 + sw / 2, y0 = 4, cy = y0 + sag * 2;
      out += '<path d="M' + x0 + ' ' + y0 + ' Q' + cx + ' ' + cy + ' ' + x1 + ' ' + y0 + '" fill="none" stroke="rgba(14,15,16,.85)" stroke-width="1.6"/>';
      var cnt = Math.max(3, Math.round(sw / step));
      for (var k = 1; k <= cnt; k++) {
        var t = k / (cnt + 1), x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y0;
        var c = COL[i % COL.length], d = ((i * 0.37) % 2.6).toFixed(2), dur = (2.2 + (i % 4) * 0.5).toFixed(1);
        var r = small ? 3.1 : 3.8;
        bulbs += '<g class="fb" style="animation-delay:-' + d + 's;animation-duration:' + dur + 's">' +
          '<circle cx="' + x.toFixed(1) + '" cy="' + (y + 7).toFixed(1) + '" r="' + (r * 4.6).toFixed(1) + '" fill="url(#fg' + (i % COL.length) + ')"/>' +
          '<rect x="' + (x - 1.4).toFixed(1) + '" y="' + (y - 0.5).toFixed(1) + '" width="2.8" height="4" rx="1" fill="rgba(30,31,33,.7)"/>' +
          '<ellipse cx="' + x.toFixed(1) + '" cy="' + (y + 7).toFixed(1) + '" rx="' + r + '" ry="' + (r * 1.35).toFixed(1) + '" fill="' + c + '"/><ellipse cx="' + (x - r * 0.3).toFixed(1) + '" cy="' + (y + 5.6).toFixed(1) + '" rx="' + (r * 0.35).toFixed(1) + '" ry="' + (r * 0.5).toFixed(1) + '" fill="#fff" opacity=".8"/></g>';
        i++;
      }
    }
    wrap.innerHTML = out + bulbs + '</svg>';
  }
  build();
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 200); }, { passive: true });

  /* a few slow, soft sparkles drifting around the headline */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (var j = 0; j < 7; j++) {
      var sp = document.createElement('i'); sp.className = 'fest-sp'; sp.setAttribute('aria-hidden', 'true');
      sp.style.cssText = 'left:' + (6 + Math.random() * 86).toFixed(1) + '%;top:' + (22 + Math.random() * 52).toFixed(1) + '%;animation-delay:-' + (Math.random() * 6).toFixed(1) + 's;animation-duration:' + (3.5 + Math.random() * 3).toFixed(1) + 's';
      hero.appendChild(sp);
    }
  }
})();
