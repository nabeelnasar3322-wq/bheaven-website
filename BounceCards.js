/* =====================================================================
   BounceCards — vanilla JS/CSS port of the React Bits component
   (https://reactbits.dev/components/bounce-cards), ported from the
   JS-CSS variant so it drops into a plain static site with no React/
   build step. Physics logic (spring stepping, hover push, click pop,
   reduced-motion, pointer + keyboard handling) is a 1:1 translation
   of the original.

   Usage:
     BounceCards.init(document.getElementById('aboutBounce'), {
       images: [{ src: '/photo.webp', alt: 'Caption' }, ...],
       containerWidth: 500,
       containerHeight: 320,
       cardSize: 260,
       spread: 150,
       rotation: 8,
       arc: 35,
       pushDistance: 160,
       hoverScale: 1.06,
       bounciness: 0.1,
       animationDelay: 1.1,
       animationStagger: 0.21,
       borderWidth: 4,
       borderColor: '#ffffff',
       radius: 8,
       shadow: true,
       enableHover: true,
       onCardClick: (i) => {}
     });
   ===================================================================== */
(function (global) {
  'use strict';

  const PATTERN = [1, 0.5, -0.3, -1, 0.2, 0.75, -0.6, 0.35, -0.85, 0.1];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const toCard = item =>
    typeof item === 'string' ? { src: item, alt: '' } : { src: item && item.src, alt: (item && item.alt) || '' };

  function init(root, opts) {
    if (!root) return null;
    opts = opts || {};

    const images = opts.images || [];
    const cards = images.map(toCard);
    const count = cards.length;
    const middle = (count - 1) / 2;
    const reach = Math.max(1, middle);

    const settings = {
      containerWidth: opts.containerWidth || 400,
      containerHeight: opts.containerHeight || 400,
      cardSize: Math.max(10, opts.cardSize || 200),
      spread: opts.spread != null ? opts.spread : 85,
      rotation: opts.rotation != null ? opts.rotation : 10,
      arc: opts.arc || 0,
      delay: Math.max(0, opts.animationDelay != null ? opts.animationDelay : 0.5),
      stagger: Math.max(0, opts.animationStagger != null ? opts.animationStagger : 0.06),
      bounciness: clamp(opts.bounciness != null ? opts.bounciness : 0.6, 0, 1),
      enableHover: opts.enableHover !== false,
      pushDistance: opts.pushDistance != null ? opts.pushDistance : 160,
      hoverScale: clamp(opts.hoverScale != null ? opts.hoverScale : 1.06, 0.5, 2),
      borderWidth: Math.max(0, opts.borderWidth != null ? opts.borderWidth : 5),
      borderColor: opts.borderColor || '#ffffff',
      radius: Math.max(0, opts.radius != null ? opts.radius : 25),
      shadow: opts.shadow !== false,
      clickable: typeof opts.onCardClick === 'function'
    };

    const slots = cards.map((_, i) => {
      const offset = i - middle;
      return {
        x: offset * settings.spread,
        y: settings.arc * Math.pow(offset / reach, 2),
        rotate: settings.rotation * PATTERN[i % PATTERN.length]
      };
    });

    // --- build DOM ---
    root.innerHTML = '';
    root.classList.add('bounce-cards');
    if (opts.className) root.classList.add(opts.className);
    root.style.width = settings.containerWidth + 'px';
    root.style.height = settings.containerHeight + 'px';
    root.style.setProperty('--bounce-cards-size', settings.cardSize + 'px');
    root.style.setProperty('--bounce-cards-border', settings.borderWidth + 'px');
    root.style.setProperty('--bounce-cards-border-color', settings.borderColor);
    root.style.setProperty('--bounce-cards-radius', settings.radius + 'px');
    root.style.setProperty(
      '--bounce-cards-shadow',
      settings.shadow ? '0 1px 2px rgba(0,0,0,.12), 0 10px 28px -6px rgba(0,0,0,.32)' : 'none'
    );
    root.style.setProperty(
      '--bounce-cards-shadow-active',
      settings.shadow ? '0 2px 4px rgba(0,0,0,.14), 0 22px 44px -10px rgba(0,0,0,.42)' : 'none'
    );

    const cardEls = cards.map((card, i) => {
      const el = document.createElement('div');
      el.className = 'bounce-cards__card' + (settings.clickable ? ' bounce-cards__card--clickable' : '');
      el.style.zIndex = String(i + 1);
      if (settings.clickable) {
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', card.alt || 'Card ' + (i + 1));
      }
      if (card.src) {
        const img = document.createElement('img');
        img.src = card.src;
        img.alt = card.alt;
        img.loading = 'lazy';
        img.draggable = false;
        el.appendChild(img);
      }
      root.appendChild(el);
      return el;
    });

    // --- physics state ---
    const reduce = (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) || false;
    const bodies = [];
    const state = { hovered: -1, time: 0, layer: -1 };
    let raf = 0;
    let last = performance.now();
    let alive = true;

    const body = i => {
      if (!bodies[i]) {
        const slot = slots[i] || { x: 0, y: 0, rotate: 0 };
        bodies[i] = {
          x: slot.x,
          y: slot.y,
          rotate: slot.rotate,
          scale: reduce ? 1 : 0,
          vx: 0,
          vy: 0,
          vr: 0,
          vs: 0,
          born: state.time
        };
      }
      return bodies[i];
    };

    const step = (value, velocity, target, stiffness, damping, dt) => {
      const next = velocity + ((target - value) * stiffness - velocity * damping) * dt;
      return [value + next * dt, next];
    };

    function frame(now) {
      raf = 0;
      if (!alive) return;
      const dt = Math.min(1 / 30, Math.max(1 / 240, (now - last) / 1000));
      last = now;
      state.time += dt;

      const hovered = settings.enableHover ? state.hovered : -1;
      const popStiffness = 170;
      const popDamping = 2 * (1 - 0.85 * settings.bounciness) * Math.sqrt(popStiffness);
      const moveStiffness = 210;
      const moveDamping = 2 * (reduce ? 1 : 0.72) * Math.sqrt(moveStiffness);
      const substeps = Math.ceil(dt / (1 / 240));
      const h = dt / substeps;
      let moving = 0;

      for (let i = 0; i < slots.length; i++) {
        const el = cardEls[i];
        if (!el) continue;
        const card = body(i);
        const slot = slots[i];
        const appeared = reduce || state.time - card.born >= settings.delay + i * settings.stagger;
        let targetX = slot.x;
        let targetY = slot.y;
        let targetRotate = slot.rotate;
        let targetScale = appeared ? 1 : 0;
        if (hovered >= 0 && appeared) {
          if (i === hovered) {
            targetY = slot.y - settings.cardSize * 0.04;
            targetRotate = 0;
            targetScale = settings.hoverScale;
          } else {
            targetX = slot.x + Math.sign(i - hovered) * settings.pushDistance;
          }
        }
        for (let k = 0; k < substeps; k++) {
          [card.x, card.vx] = step(card.x, card.vx, targetX, moveStiffness, moveDamping, h);
          [card.y, card.vy] = step(card.y, card.vy, targetY, moveStiffness, moveDamping, h);
          [card.rotate, card.vr] = step(card.rotate, card.vr, targetRotate, moveStiffness, moveDamping, h);
          if (reduce) {
            card.scale = targetScale;
            card.vs = 0;
          } else {
            [card.scale, card.vs] = step(card.scale, card.vs, targetScale, popStiffness, popDamping, h);
          }
        }
        moving +=
          Math.abs(card.vx) +
          Math.abs(card.vy) +
          Math.abs(card.vr) +
          Math.abs(card.vs) * 100 +
          Math.abs(targetX - card.x) +
          Math.abs(targetY - card.y) +
          Math.abs(targetRotate - card.rotate) +
          Math.abs(targetScale - card.scale) * 100 +
          (appeared ? 0 : 1);
        el.style.transform =
          'translate(-50%, -50%) translate3d(' +
          card.x.toFixed(2) +
          'px, ' +
          card.y.toFixed(2) +
          'px, 0) rotate(' +
          card.rotate.toFixed(3) +
          'deg) scale(' +
          Math.max(0, card.scale).toFixed(4) +
          ')';
      }

      if (state.layer !== hovered) {
        state.layer = hovered;
        cardEls.forEach((el, i) => {
          el.style.zIndex = i === hovered ? String(slots.length + 1) : String(i + 1);
          if (i === hovered) el.setAttribute('data-active', '');
          else el.removeAttribute('data-active');
        });
      }

      if (moving > 0.02) raf = requestAnimationFrame(frame);
    }

    function wake() {
      if (raf || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function pick(event) {
      const rect = root.getBoundingClientRect();
      const px = event.clientX - rect.left - rect.width / 2;
      const py = event.clientY - rect.top - rect.height / 2;
      let best = -1;
      let distance = Infinity;
      slots.forEach((slot, i) => {
        const gap = Math.abs(px - slot.x);
        if (gap < distance) {
          distance = gap;
          best = i;
        }
      });
      if (best < 0) return -1;
      const slot = slots[best];
      const half = settings.cardSize / 2;
      if (Math.abs(py - slot.y) > half + 12 || distance > half + 12) return -1;
      if (state.hovered >= 0 && state.hovered !== best) {
        const current = slots[state.hovered];
        if (current && Math.abs(px - current.x) - distance < 6) return state.hovered;
      }
      return best;
    }

    function onMove(event) {
      const next = pick(event);
      if (next !== state.hovered) {
        state.hovered = next;
        wake();
      }
    }
    function onLeave() {
      if (state.hovered !== -1) {
        state.hovered = -1;
        wake();
      }
    }
    function onClick(event) {
      const index = pick(event);
      if (index < 0) return;
      const card = bodies[index];
      if (card && !reduce) card.vs -= 2.2;
      wake();
      if (opts.onCardClick) opts.onCardClick(index);
    }
    function onFocus(event) {
      const index = cardEls.indexOf(event.target);
      if (index >= 0) {
        state.hovered = index;
        wake();
      }
    }
    function onKey(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const index = cardEls.indexOf(event.target);
      if (index < 0 || !settings.clickable) return;
      event.preventDefault();
      if (bodies[index] && !reduce) bodies[index].vs -= 2.2;
      wake();
      if (opts.onCardClick) opts.onCardClick(index);
    }

    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerdown', onMove);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('click', onClick);
    root.addEventListener('focusin', onFocus);
    root.addEventListener('focusout', onLeave);
    root.addEventListener('keydown', onKey);
    wake();

    return {
      destroy() {
        alive = false;
        cancelAnimationFrame(raf);
        root.removeEventListener('pointermove', onMove);
        root.removeEventListener('pointerdown', onMove);
        root.removeEventListener('pointerleave', onLeave);
        root.removeEventListener('click', onClick);
        root.removeEventListener('focusin', onFocus);
        root.removeEventListener('focusout', onLeave);
        root.removeEventListener('keydown', onKey);
        root.innerHTML = '';
      }
    };
  }

  global.BounceCards = { init };
})(window);
