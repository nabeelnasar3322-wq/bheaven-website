/* Hero water ripples (plain WebGL, no library).
   Moving the cursor, or tapping / dragging on a touch screen, sends soft refractive rings across the
   pool in the hero video. How it works: a transparent canvas sits right on top of the hero <video>.
   While rings are alive it draws the current video frame with a small ripple distortion (and a faint
   specular glint on each ring); when the rings fade it fades itself out and stops drawing, so the page
   costs nothing at rest. Rings only bend the lower, watery part of the picture and fade away at night
   (no pool in that scene). Runs only with the scroll-driven hero (hero-3d.js, window.__skyOn): off for
   Reduce Motion, Data Saver, no WebGL, or a slow device. */
(function () {
  'use strict';
  if (!window.__skyOn) return;
  var hero = document.getElementById('hero'), vid = document.getElementById('heroVid');
  if (!hero || !vid || !vid.parentNode) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var MAXR = 12, LIFE = 3.2;
  var cv = document.createElement('canvas');
  cv.className = 'hero-ripple';
  cv.setAttribute('aria-hidden', 'true');
  var gl = null;
  try { gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power', preserveDrawingBuffer: false }); } catch (e) {}
  if (!gl) return;

  var VS = 'attribute vec2 p;varying vec2 vUv;void main(){vUv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision mediump float;',
    'uniform sampler2D uTex;uniform vec4 uR[' + MAXR + '];uniform vec2 uRes;uniform vec2 uMapS;uniform vec2 uMapO;uniform float uWater;',
    'varying vec2 vUv;',
    'void main(){',
    '  float asp=uRes.x/uRes.y;',
    '  vec2 p=vec2(vUv.x*asp,vUv.y);',
    '  vec2 off=vec2(0.);float spec=0.;',
    '  for(int i=0;i<' + MAXR + ';i++){',
    '    vec4 r=uR[i];',
    '    if(r.w>0.002){',
    '      vec2 dv=p-vec2(r.x*asp,r.y);float d=length(dv)+1e-4;',
    '      float x=d-r.z*0.30;',
    '      float env=exp(-x*x*120.)*r.w;',
    '      off+=(dv/d)*sin(x*64.)*env*0.014;',
    '      spec+=max(0.,cos(x*64.))*env;',
    '    }',
    '  }',
    '  vec2 t0=vUv*uMapS+uMapO;',
    /* only the lower, watery part of the picture bends, with a soft top edge */
    '  float w=smoothstep(0.42,0.60,t0.y)*uWater;',
    '  vec2 t=clamp((vUv+vec2(off.x/asp,off.y)*w)*uMapS+uMapO,0.001,0.999);',
    '  vec3 c=texture2D(uTex,t).rgb;',
    '  c+=spec*w*vec3(.50,.66,.78)*.22;',
    '  gl_FragColor=vec4(c,1.);',
    '}'
  ].join('\n');

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ['uTex', 'uR', 'uRes', 'uMapS', 'uMapO', 'uWater'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
  var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.uTex, 0);

  /* the canvas sits directly on top of the video and inherits the same scroll zoom / drift */
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity .22s ease';
  vid.parentNode.insertBefore(cv, vid.nextSibling);

  var rings = [], raf = 0, shown = false, dead = false, lastSpawn = 0, lx = -999, ly = -999, texDirty = true;
  var slow = 0, frames = 0, lastT = 0, lostCtx = false;

  function water() {
    var d = document.documentElement.getAttribute('data-daypart');
    return d === 'night' ? 0 : d === 'sunset' ? 0.7 : 1;
  }
  function size() {
    var W = cv.offsetWidth, H = cv.offsetHeight;
    if (!W || !H) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5, 2048 / Math.max(W, H));
    var pw = Math.max(2, Math.round(W * dpr)), ph = Math.max(2, Math.round(H * dpr));
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; gl.viewport(0, 0, pw, ph); }
    var vw = vid.videoWidth, vh = vid.videoHeight; if (!vw || !vh) return false;
    /* same crop as the video element: object-fit: cover; object-position: 64% 50% */
    var s = Math.max(W / vw, H / vh), dw = vw * s, dh = vh * s;
    gl.uniform2f(U.uRes, W, H);
    gl.uniform2f(U.uMapS, W / dw, H / dh);
    gl.uniform2f(U.uMapO, -((W - dw) * 0.64) / dw, -((H - dh) * 0.5) / dh);
    return true;
  }
  function upload() {
    try { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, vid); texDirty = false; return true; }
    catch (e) { return false; }
  }
  function draw(now) {
    raf = 0;
    if (dead) return;
    var t = now / 1000, data = new Float32Array(MAXR * 4), alive = 0, i;
    for (i = rings.length - 1; i >= 0; i--) {
      var r = rings[i], age = t - r.t0;
      if (age > LIFE) { rings.splice(i, 1); continue; }
      var st = r.s * Math.exp(-age * 1.55) * Math.min(1, age * 14);
      var k = alive * 4; data[k] = r.x; data[k + 1] = r.y; data[k + 2] = age; data[k + 3] = st; alive++;
      if (alive >= MAXR) break;
    }
    if (!alive) { cv.style.opacity = '0'; shown = false; return; }
    if (vid.readyState < 2 || !size()) { raf = requestAnimationFrame(draw); return; }
    if (texDirty && !upload()) { dead = true; return; }
    gl.uniform4fv(U.uR, data);
    gl.uniform1f(U.uWater, water());
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!shown) { shown = true; cv.style.opacity = '1'; }
    /* if the device cannot keep up, quietly switch the effect off for good */
    if (lastT) { slow += (now - lastT) > 45 ? 1 : -1; if (slow < 0) slow = 0; if (++frames > 24 && slow > 16) { dead = true; cv.style.opacity = '0'; return; } }
    lastT = now;
    raf = requestAnimationFrame(draw);
  }
  function spawn(cx, cy, strength) {
    if (dead || lostCtx || water() <= 0 || vid.readyState < 2) return;
    var b = cv.getBoundingClientRect(); if (!b.width || !b.height) return;
    var x = (cx - b.left) / b.width, y = (cy - b.top) / b.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    rings.push({ x: x, y: y, t0: performance.now() / 1000, s: strength });
    if (rings.length > MAXR) rings.shift();
    texDirty = true;
    lastT = 0;
    if (!raf) raf = requestAnimationFrame(draw);
  }

  /* the video is scrubbed by scroll: keep the picture in step while rings are showing */
  vid.addEventListener('seeked', function () { texDirty = true; });

  hero.addEventListener('pointermove', function (e) {
    var now = performance.now();
    if (now - lastSpawn < 70) return;
    var dx = e.clientX - lx, dy = e.clientY - ly, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 26) return;
    lastSpawn = now; lx = e.clientX; ly = e.clientY;
    spawn(e.clientX, e.clientY, Math.max(0.45, Math.min(1, dist / 90)));
  }, { passive: true });
  hero.addEventListener('pointerdown', function (e) {
    lastSpawn = performance.now(); lx = e.clientX; ly = e.clientY;
    spawn(e.clientX, e.clientY, 1);
  }, { passive: true });

  cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lostCtx = true; cv.style.opacity = '0'; });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { rings.length = 0; cv.style.opacity = '0'; shown = false; } });
})();
