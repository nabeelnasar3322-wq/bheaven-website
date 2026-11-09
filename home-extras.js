/* Homepage extras: sticky Reserve/Call bar (phones) and cookie-free tap counting.
   Counting uses the same private /api/track collector as the menu, shisha and business-lunch pages. */
(function () {
  'use strict';

  /* ---- tap counting ---- */
  var sid;
  try { sid = sessionStorage.getItem('bh_sid'); if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('bh_sid', sid); } } catch (e) { sid = ''; }
  function send(t, l) {
    try {
      var p = JSON.stringify({ s: sid, e: [{ t: t, l: String(l).slice(0, 60) }] });
      if (!(navigator.sendBeacon && navigator.sendBeacon('/api/track', new Blob([p], { type: 'application/json' })))) {
        fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: p, keepalive: true }).catch(function () {});
      }
    } catch (e) {}
  }
  try { if (!sessionStorage.getItem('bh_p_Home')) { sessionStorage.setItem('bh_p_Home', '1'); send('page', 'Home'); } } catch (e) {}

  function where(el) {
    if (el.closest('#mbar')) return 'sticky bar';
    if (el.closest('#header')) return 'header';
    if (el.closest('#mnav')) return 'mobile menu';
    if (el.closest('#hero')) return 'hero';
    if (el.closest('.footer')) return 'footer';
    if (el.closest('#visit')) return 'visit section';
    return 'page';
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a,button');
    if (!el) return;
    var href = el.getAttribute('href') || '';
    if (el.id === 'waFab') return send('book', 'WhatsApp chat widget (Home)');
    if (href.indexOf('tel:') === 0) return send('book', 'Call from Home (' + where(el) + ')');
    if (href.indexOf('api.whatsapp.com/send') > -1) return send('book', 'Book on WhatsApp (Home, ' + where(el) + ')');
    if (href === '#reserve') return send('book', 'Reserve tap (Home, ' + where(el) + ')');
    if (/^\/(menu|shisha|business-lunch)\//.test(href)) return send('page', 'Home to ' + href.split('/')[1]);
  }, true);

  /* ---- sticky Reserve / Call bar: phones only; hidden while the hero buttons or the Reserve section are on screen ---- */
  var bar = document.getElementById('mbar');
  if (!bar || !('IntersectionObserver' in window)) return;
  var covered = { hero: true, reserve: false };
  function update() { var show = !covered.hero && !covered.reserve; bar.classList.toggle('on', show); document.body.classList.toggle('has-mbar', show); }
  var heroActions = document.querySelector('.hero-actions'), reserve = document.getElementById('reserve');
  if (heroActions) new IntersectionObserver(function (en) { covered.hero = en[0].isIntersecting; update(); }).observe(heroActions);
  if (reserve) new IntersectionObserver(function (en) { covered.reserve = en[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(reserve);
})();

/* Google reviews carousel arrows */
(()=>{const t=document.getElementById('rvTrack');if(!t)return;const step=d=>t.scrollBy({left:d*(t.firstElementChild.offsetWidth+18),behavior:'smooth'});
const p=document.getElementById('rvP'),n=document.getElementById('rvN');if(p)p.onclick=()=>step(-1);if(n)n.onclick=()=>step(1)})();
