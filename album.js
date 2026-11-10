/* About photo album: --ap (0..1) = how far the block has travelled through the viewport; each photo drifts by it. */
(function () {
  var box = document.querySelector('.about-photos'); if (!box) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  box.classList.add('am-ready');
  var raf = 0;
  function upd() {
    raf = 0; var r = box.getBoundingClientRect(), vh = innerHeight || 800;
    var p = (vh - r.top) / (vh + r.height); p = p < 0 ? 0 : p > 1 ? 1 : p;
    box.style.setProperty('--ap', p.toFixed(4));
  }
  function kick() { if (!raf) raf = requestAnimationFrame(upd); }
  addEventListener('scroll', kick, { passive: true }); addEventListener('resize', kick, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en, o) { if (en[0].isIntersecting) { box.classList.add('am-in'); o.disconnect(); } }, { threshold: .2 }).observe(box);
  } else box.classList.add('am-in');
  upd();
})();
