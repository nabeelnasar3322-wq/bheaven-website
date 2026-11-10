/* Cookie choice for every page.
   Google Analytics (GA4) loads only after the visitor taps Accept. Declining keeps the site
   fully working: the first-party, cookie-free counters in /api/track still run as before.
   The measurement ID is read from the data-ga attribute on this script tag. */
(function () {
  'use strict';
  var KEY = 'bh_consent';
  var me = document.currentScript || document.querySelector('script[src$="consent.js"]');
  var GA = (me && me.getAttribute('data-ga')) || '';
  var lang = (document.documentElement.lang || 'en').slice(0, 2);
  var T = {
    en: { text: 'We use analytics cookies, only if you accept.', more: 'Privacy policy', yes: 'Accept', no: 'Decline' },
    es: { text: 'Usamos cookies de analítica, solo si aceptas.', more: 'Política de privacidad', yes: 'Aceptar', no: 'Rechazar' },
    ar: { text: 'نستخدم ملفات تعريف الارتباط للتحليل، فقط إذا وافقت.', more: 'سياسة الخصوصية', yes: 'قبول', no: 'رفض' }
  };
  var S = T[lang] || T.en;

  // Queue calls (for example gtag('event', ...) on a tel: tap) until, and unless, the visitor accepts.
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  function loadGA() {
    if (!GA || window.__bhGA) return;
    window.__bhGA = true;
    window.gtag('js', new Date());
    window.gtag('config', GA);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA);
    document.head.appendChild(s);
  }

  function banner() {
    if (document.querySelector('.ck')) return;
    var d = document.createElement('div');
    d.className = 'ck';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-label', S.text);
    d.innerHTML = '<p>' + S.text + ' <a href="/privacy/">' + S.more + '</a></p>' +
      '<div class="ck-b"><button type="button" class="ck-no">' + S.no + '</button>' +
      '<button type="button" class="ck-yes">' + S.yes + '</button></div>';
    document.body.appendChild(d);
    function choose(v) {
      try { localStorage.setItem(KEY, v); } catch (e) {}
      d.parentNode && d.parentNode.removeChild(d);
      if (v === 'granted') loadGA();
    }
    d.querySelector('.ck-yes').addEventListener('click', function () { choose('granted'); });
    d.querySelector('.ck-no').addEventListener('click', function () { choose('denied'); });
    d.querySelector('.ck-yes').focus({ preventScroll: true });
  }

  var css = '.ck{position:fixed;left:0;right:0;bottom:0;z-index:100;' +
    'background:#fff;color:#1F2A33;box-shadow:0 -8px 28px rgba(0,0,0,.2);padding:12px 16px calc(12px + env(safe-area-inset-bottom));' +
    'font:14px/1.5 Montserrat,system-ui,sans-serif;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}' +
    '.ck p{margin:0;flex:1 1 260px;max-width:1040px}.ck a{color:#1E474C}' +
    '@media (max-width:600px){.ck{padding:9px 14px calc(9px + env(safe-area-inset-bottom));gap:8px;font-size:13px;line-height:1.4}.ck p{flex:1 1 180px}.ck-b{gap:6px}.ck button{padding:8px 14px;font-size:12px}}' +
    '.ck-b{display:flex;gap:8px}' +
    '.ck button{font:600 13px Montserrat,system-ui,sans-serif;border-radius:999px;padding:10px 18px;cursor:pointer;border:1px solid #1E474C}' +
    '.ck-yes{background:#1E474C;color:#fff}.ck-no{background:#fff;color:#1E474C}' +
    '.ck button:focus-visible,.ck a:focus-visible{outline:2px solid #3E7479;outline-offset:3px}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved === 'granted') loadGA();
  else if (saved === null) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', banner);
    else banner();
  }

  // Lets the privacy page reopen the choice.
  window.bhCookieSettings = function () { banner(); };
})();
