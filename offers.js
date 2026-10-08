/* B-Heaven app: current offers and offer alerts (push notifications).
   Loaded by pwa.js only when the site runs as the installed app. Offers come from /api/offers
   (edited in /admin); notifications use the phone's own push service. */
(function () {
  'use strict';

  var T = {
    en: { offers: 'Offers', title: 'Offers', until: 'Valid until', book: 'Book a table', close: 'Close', fresh: 'New offer', view: 'View',
          on: 'Offer alerts are on · turn off', off: 'Get offer alerts', busy: 'One moment…', blocked: 'Notifications are blocked in your phone settings.' },
    es: { offers: 'Ofertas', title: 'Ofertas', until: 'Válido hasta', book: 'Reservar mesa', close: 'Cerrar', fresh: 'Nueva oferta', view: 'Ver',
          on: 'Avisos de ofertas activados · desactivar', off: 'Recibir avisos de ofertas', busy: 'Un momento…', blocked: 'Las notificaciones están bloqueadas en los ajustes del teléfono.' },
    ar: { offers: 'العروض', title: 'العروض', until: 'ساري حتى', book: 'احجز طاولة', close: 'إغلاق', fresh: 'عرض جديد', view: 'عرض',
          on: 'تنبيهات العروض مفعّلة · إيقاف', off: 'تلقَّ تنبيهات العروض', busy: 'لحظة…', blocked: 'الإشعارات محظورة من إعدادات الهاتف.' }
  };
  function lang() {
    var l = (document.documentElement.lang || '').slice(0, 2);
    return T[l] ? l : 'en';
  }
  function pick(o) { return (o && (o[lang()] || o.en)) || ''; }
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {}
    return null;
  }
  function idle(fn) { if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 3000 }); else setTimeout(fn, 1200); }

  var offers = [];
  var linkOffers = null, linkAlerts = null;
  var QUIET = 'display:block!important;margin-top:10px!important;font-size:.76rem!important;font-weight:600!important;letter-spacing:.14em!important;opacity:.78!important;text-decoration:underline!important;text-underline-offset:5px!important;text-align:center!important;text-transform:none!important';

  /* ---------- styles ---------- */
  function css() {
    if (document.getElementById('bhOffCss')) return;
    var s = document.createElement('style');
    s.id = 'bhOffCss';
    s.textContent =
      '#bhOff{position:fixed;inset:0;z-index:2147482900;display:flex;align-items:flex-end;justify-content:center;background:rgba(15,28,31,.55);opacity:0;transition:opacity .22s;font-family:Montserrat,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
      '#bhOff.on{opacity:1}' +
      '#bhOff .sh{position:relative;width:100%;max-width:460px;max-height:88vh;max-height:88dvh;overflow:auto;background:#F5F5F3;color:#1F2A33;border-radius:24px 24px 0 0;padding:22px 22px calc(22px + env(safe-area-inset-bottom));transform:translateY(24px);transition:transform .25s ease;box-shadow:0 -20px 50px -20px rgba(0,0,0,.45)}' +
      '#bhOff.on .sh{transform:none}' +
      '@media(min-width:620px){#bhOff{align-items:center}#bhOff .sh{border-radius:24px}}' +
      '#bhOff h2{margin:0 0 14px;font-size:1.35rem;font-weight:600;padding-inline-end:44px;color:#1F2A33}' +
      '#bhOff .x{position:absolute;top:10px;inset-inline-end:12px;width:44px;height:44px;border:0;background:none;font-size:1.7rem;line-height:1;color:#1F2A33;cursor:pointer}' +
      '#bhOff .card{background:#fff;border:1.5px solid #dfe3e2;border-radius:18px;padding:16px;margin-bottom:12px}' +
      '#bhOff .card h3{margin:0 0 6px;font-size:1.05rem;font-weight:600;color:#1F2A33;line-height:1.3}' +
      '#bhOff .card p{margin:0;font-size:.92rem;line-height:1.55;color:#3d4850;white-space:pre-line}' +
      '#bhOff .card .until{display:inline-block;margin-top:10px;font-size:.7rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#376C71}' +
      '#bhOff .card button.bk{display:block;width:100%;margin-top:14px;min-height:46px;border:0;border-radius:999px;background:#1E474C;color:#fff;font:inherit;font-size:.74rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;cursor:pointer}' +
      '#bhOffToast{position:fixed;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:2147482800;max-width:436px;margin:0 auto;display:flex;align-items:center;gap:10px;background:#1E474C;color:#fff;border-radius:18px;padding:12px 14px;font-family:Montserrat,system-ui,sans-serif;font-size:.85rem;line-height:1.35;box-shadow:0 14px 34px -12px rgba(0,0,0,.5);transform:translateY(20px);opacity:0;transition:.3s}' +
      '#bhOffToast.on{transform:none;opacity:1}' +
      '#bhOffToast b{display:block;font-size:.66rem;letter-spacing:.16em;text-transform:uppercase;color:#EADFCB;margin-bottom:2px}' +
      '#bhOffToast .tx{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}' +
      '#bhOffToast button{flex:none;border:0;border-radius:999px;font:inherit;font-weight:600;cursor:pointer}' +
      '#bhOffToast .v{background:#EADFCB;color:#1E474C;padding:9px 14px;font-size:.74rem;letter-spacing:.1em;text-transform:uppercase}' +
      '#bhOffToast .z{background:none;color:#fff;font-size:1.3rem;width:36px;height:36px;opacity:.8}';
    document.head.appendChild(s);
  }

  /* ---------- offers sheet ---------- */
  function fmtDate(iso) {
    var d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return iso;
    var loc = { en: 'en-GB', es: 'es-ES', ar: 'ar-AE' }[lang()];
    try { return d.toLocaleDateString(loc, { day: 'numeric', month: 'long' }); } catch (e) { return iso; }
  }
  function markSeen() { store('bh-offers-seen', offers.map(function (o) { return o.id; }).join(',')); updateLink(); }

  function openSheet() {
    if (document.getElementById('bhOff') || !offers.length) return;
    css();
    var t = T[lang()], last = document.activeElement;
    var root = document.createElement('div');
    root.id = 'bhOff';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'bhOffT');
    var sh = document.createElement('div'); sh.className = 'sh';
    var h = document.createElement('h2'); h.id = 'bhOffT'; h.textContent = t.title;
    var x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.textContent = '×'; x.setAttribute('aria-label', t.close);
    sh.appendChild(h); sh.appendChild(x);
    offers.forEach(function (o) {
      var c = document.createElement('div'); c.className = 'card';
      var h3 = document.createElement('h3'); h3.textContent = pick(o.title);
      var p = document.createElement('p'); p.textContent = pick(o.text);
      c.appendChild(h3); c.appendChild(p);
      if (o.end) { var u = document.createElement('span'); u.className = 'until'; u.textContent = t.until + ' ' + fmtDate(o.end); c.appendChild(u); }
      var b = document.createElement('button'); b.type = 'button'; b.className = 'bk'; b.textContent = t.book;
      b.addEventListener('click', function () {
        close();
        if (window.__bhBooking) window.__bhBooking.open({ kind: 'offer', label: pick(o.title) });
      });
      c.appendChild(b);
      sh.appendChild(c);
    });
    root.appendChild(sh);
    document.body.appendChild(root);
    var prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    function close() {
      document.removeEventListener('keydown', onKey, true);
      root.classList.remove('on');
      document.documentElement.style.overflow = prev;
      setTimeout(function () { root.remove(); }, 220);
      try { if (last && last.focus) last.focus(); } catch (e) {}
    }
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    document.addEventListener('keydown', onKey, true);
    x.addEventListener('click', close);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    requestAnimationFrame(function () { root.classList.add('on'); x.focus({ preventScroll: true }); });
    markSeen();
    removeToast();
  }

  /* ---------- menu entry + "new offer" toast ---------- */
  function unseen() {
    var seen = (store('bh-offers-seen') || '').split(',');
    return offers.filter(function (o) { return seen.indexOf(o.id) < 0; });
  }
  function updateLink() {
    var nav = document.getElementById('mnav');
    if (!nav) return;
    if (!offers.length) { if (linkOffers) { linkOffers.remove(); linkOffers = null; } return; }
    if (!linkOffers) {
      linkOffers = document.createElement('a');
      linkOffers.href = '#offers';
      linkOffers.setAttribute('role', 'button');
      linkOffers.addEventListener('click', function (e) { e.preventDefault(); openSheet(); }); // the page closes the menu itself
      var ev = nav.querySelector('a[href="#events"]');
      if (ev) nav.insertBefore(linkOffers, ev); else nav.appendChild(linkOffers);
    }
    var n = unseen().length;
    linkOffers.textContent = T[lang()].offers + (n ? ' · ' + n : '');
  }
  function removeToast() { var t = document.getElementById('bhOffToast'); if (t) t.remove(); }
  function toast() {
    var fresh = unseen();
    if (!fresh.length || document.getElementById('bhOff') || document.getElementById('bhBook')) return;
    css();
    var t = T[lang()];
    var el = document.createElement('div');
    el.id = 'bhOffToast'; el.setAttribute('role', 'status');
    var tx = document.createElement('div'); tx.className = 'tx';
    var b = document.createElement('b'); b.textContent = t.fresh;
    tx.appendChild(b); tx.appendChild(document.createTextNode(pick(fresh[0].title)));
    var v = document.createElement('button'); v.type = 'button'; v.className = 'v'; v.textContent = t.view;
    var z = document.createElement('button'); z.type = 'button'; z.className = 'z'; z.textContent = '×'; z.setAttribute('aria-label', t.close);
    el.appendChild(tx); el.appendChild(v); el.appendChild(z);
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('on'); });
    v.addEventListener('click', openSheet);
    z.addEventListener('click', function () { markSeen(); removeToast(); });
    setTimeout(function () { var e2 = document.getElementById('bhOffToast'); if (e2) { e2.classList.remove('on'); setTimeout(function () { e2.remove(); }, 400); } }, 10000);
  }

  function setOffers(list) {
    offers = Array.isArray(list) ? list : [];
    updateLink();
    if (/[?&]offers=1\b/.test(location.search)) openSheet();
    else if (!/[?&]book=1\b/.test(location.search)) setTimeout(toast, 1500);
  }
  function loadOffers() {
    fetch('/api/offers', { credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { store('bh-offers', JSON.stringify(j.offers || [])); setOffers(j.offers); })
      .catch(function () { // offline: show what we had last time
        try { setOffers(JSON.parse(store('bh-offers') || '[]')); } catch (e) {}
      });
  }

  /* ---------- offer alerts (push) ---------- */
  var vapidKey = null;
  function keyBytes(b64) {
    var s = (b64 + '===='.slice(b64.length % 4)).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(s), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function post(body) {
    return fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); });
  }
  function currentSub() {
    return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription().then(function (s) { return { reg: reg, sub: s }; }); });
  }
  function alertsLabel(state, msg) {
    if (!linkAlerts) return;
    var t = T[lang()];
    linkAlerts.textContent = msg || (state === 'on' ? t.on : t.off);
    linkAlerts.setAttribute('data-state', state);
  }
  function mountAlerts() {
    var nav = document.getElementById('mnav');
    if (!nav || linkAlerts) return;
    linkAlerts = document.createElement('a');
    linkAlerts.href = '#alerts';
    linkAlerts.id = 'bhAlerts';
    linkAlerts.setAttribute('role', 'button');
    linkAlerts.style.cssText = QUIET;
    nav.appendChild(linkAlerts);
    linkAlerts.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation(); // keep the menu open so the result is visible
      toggleAlerts();
    });
  }
  function toggleAlerts() {
    var t = T[lang()];
    if (linkAlerts.getAttribute('data-state') === 'busy') return;
    var was = linkAlerts.getAttribute('data-state');
    alertsLabel('busy', t.busy);
    if (was === 'on') {
      currentSub().then(function (c) {
        var ep = c.sub && c.sub.endpoint;
        return (c.sub ? c.sub.unsubscribe() : Promise.resolve()).then(function () { return ep ? post({ action: 'unsubscribe', endpoint: ep }) : null; });
      }).then(function () { alertsLabel('off'); }, function () { alertsLabel('on'); });
      return;
    }
    // the permission prompt must start from this tap
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') { alertsLabel('off', perm === 'denied' ? t.blocked : null); return; }
      return currentSub().then(function (c) {
        return c.sub || c.reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey) });
      }).then(function (sub) { return post({ action: 'subscribe', sub: sub.toJSON(), lang: lang() }); })
        .then(function () { alertsLabel('on'); });
    }).catch(function () { alertsLabel('off'); });
  }
  function initAlerts() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
    fetch('/api/push', { credentials: 'omit' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.enabled || !j.key) return;
      vapidKey = j.key;
      if (Notification.permission === 'denied') return;
      mountAlerts();
      currentSub().then(function (c) {
        if (c.sub && Notification.permission === 'granted') {
          alertsLabel('on');
          post({ action: 'subscribe', sub: c.sub.toJSON(), lang: lang() }).catch(function () {}); // keeps language and address current
        } else alertsLabel('off');
      });
      navigator.serviceWorker.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'push-resubscribe' && Notification.permission === 'granted') {
          currentSub().then(function (c) { return c.sub || c.reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey) }); })
            .then(function (sub) { return post({ action: 'subscribe', sub: sub.toJSON(), lang: lang() }); }).catch(function () {});
        }
      });
    }).catch(function () {});
  }

  idle(function () { loadOffers(); initAlerts(); });
})();
