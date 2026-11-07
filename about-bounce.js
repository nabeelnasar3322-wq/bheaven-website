/* Mounts BounceCards in the About section using the real site photos
   already defined in content.js (SITE.photos), instead of placeholder
   images. Scales the design down on narrow screens so it never
   overflows the card. */
(function () {
  const mount = document.getElementById('aboutBounce');
  if (!mount || !window.BounceCards || typeof SITE === 'undefined') return;

  const BASE = {
    containerWidth: 500,
    containerHeight: 320,
    cardSize: 260,
    spread: 150,
    rotation: 8,
    arc: 35,
    pushDistance: 160,
    borderWidth: 4,
    radius: 8
  };

  const PHOTOS = [
    { key: 'rooftop', alt: 'The rooftop at B·Heaven' },
    { key: 'pool', alt: 'Poolside lounge at B·Heaven' },
    { key: 'lounge', alt: 'Indoor lounge at B·Heaven' },
    { key: 'terrace', alt: 'Terrace seating at B·Heaven' },
    { key: 'bar', alt: 'The bar at B·Heaven' }
  ];

  let instance = null;
  let pending = false;

  function build() {
    pending = false;
    // Scale against the fan's actual unscaled footprint (how far the outer
    // cards sit from center), not just the nominal containerWidth - the fan
    // spreads well past that box, and in this layout's narrower photo
    // column (next to the text block) it would otherwise spill over the
    // text and off the edge of the viewport.
    const middle = (PHOTOS.length - 1) / 2;
    const fanWidth = 2 * middle * BASE.spread + BASE.cardSize;
    const wrapWidth = mount.parentElement.clientWidth || BASE.containerWidth;
    const scale = Math.min(1, (wrapWidth * 0.94) / fanWidth);

    const images = PHOTOS.map(p => ({ src: SITE.photos[p.key], alt: p.alt }));

    if (instance) instance.destroy();
    instance = BounceCards.init(mount, {
      images: images,
      containerWidth: Math.round(BASE.containerWidth * scale),
      containerHeight: Math.round(BASE.containerHeight * scale),
      cardSize: Math.round(BASE.cardSize * scale),
      spread: Math.round(BASE.spread * scale),
      rotation: BASE.rotation,
      arc: Math.round(BASE.arc * scale),
      pushDistance: Math.round(BASE.pushDistance * scale),
      hoverScale: 1.06,
      bounciness: 0.1,
      animationDelay: 1.1,
      animationStagger: 0.21,
      borderWidth: Math.max(2, Math.round(BASE.borderWidth * scale)),
      borderColor: '#ffffff',
      radius: Math.round(BASE.radius * scale),
      shadow: true,
      enableHover: true
    });
  }

  build();

  window.addEventListener('resize', () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(build);
  });
})();
