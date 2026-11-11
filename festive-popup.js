/* Festive welcome popup for the home page.
   Shows only when the visitor arrives from the Menu page, once per browser session,
   until the festive season ends (Dubai time). */
(function () {
  'use strict';
  var END = Date.parse('2027-01-06T00:00:00+04:00');          /* edit: last day of the festive season */
  if (Date.now() >= END) return;
  if (location.pathname !== '/' && location.pathname !== '/index.html') return;

  var fromMenu = false;
  try {
    var ref = new URL(document.referrer);
    fromMenu = ref.hostname === location.hostname && /^\/menu(\/|$)/.test(ref.pathname);
  } catch (e) {}
  if (!fromMenu) return;

  try {
    if (sessionStorage.getItem('bh_festive_pop')) return;
    sessionStorage.setItem('bh_festive_pop', '1');
  } catch (e) {}

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wrap = document.createElement('div');
  wrap.className = 'fp-wrap';
  wrap.innerHTML =
    '<div class="fp-card" role="dialog" aria-modal="true" aria-labelledby="fpTitle">' +
      '<button type="button" class="fp-x" aria-label="Close">&times;</button>' +
      '<span class="fp-orn" aria-hidden="true">✦</span>' +
      '<p class="fp-eyebrow">Festive season at B·Heaven</p>' +
      '<h2 id="fpTitle">Christmas Eve &amp; <span>New Year’s Eve</span></h2>' +
      '<p>Rooftop nights with the Dubai skyline. Choose your evening and book your table.</p>' +
      '<a class="fp-cta" href="#festive">See the festive nights</a>' +
    '</div>';
  document.body.appendChild(wrap);

  var card = wrap.querySelector('.fp-card');
  var closeBtn = wrap.querySelector('.fp-x');
  var returnTo = document.activeElement;

  function onKey(e) { if (e.key === 'Escape') close(); }
  function close() {
    if (!wrap.parentNode) return;
    wrap.classList.remove('on');
    document.removeEventListener('keydown', onKey, true);
    setTimeout(function () {
      wrap.remove();
      if (returnTo && returnTo.focus) returnTo.focus({ preventScroll: true });
    }, reduce ? 0 : 350);
  }

  wrap.addEventListener('click', function (e) {
    if (e.target === wrap || e.target.closest('.fp-x, .fp-cta')) close();
  });
  document.addEventListener('keydown', onKey, true);

  setTimeout(function () {
    wrap.classList.add('on');
    closeBtn.focus({ preventScroll: true });
  }, reduce ? 0 : 900);
})();
