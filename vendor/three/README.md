# three.js r187 (0.187.0), self-hosted

Copied from the official 0.187.0 release (byte-identical to npm `three@0.187.0`).
`build/` is minified with esbuild (imports unchanged); `addons/` is the release's `examples/jsm`, untouched.

Use on any page with an import map (put it before the first module script):

```html
<script type="importmap">
{ "imports": {
  "three": "/vendor/three/build/three.module.js",
  "three/webgpu": "/vendor/three/build/three.webgpu.js",
  "three/tsl": "/vendor/three/build/three.tsl.js",
  "three/addons/": "/vendor/three/addons/"
} }
</script>
<script type="module">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
</script>
```

Note: the site CSP has no 'wasm-unsafe-eval', so WASM decoders (Draco, Basis/KTX2, Meshopt WASM) are blocked until it is added in vercel.json.
r128-style global `THREE` + `examples/js` no longer exist; code written that way needs the module imports above.
