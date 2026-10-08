/* B-Heaven app layer: registers the service worker and offers "Install the app".
   Everything waits until the page has finished loading and the browser is idle,
   so it never competes with the scroll and animation work on the pages. */
(function () {
  'use strict';

  var standalone = false;
  try { standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; } catch (e) {}

  function idle(fn) {
    if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 4000 });
    else setTimeout(fn, 1500);
  }

  /* service worker */
  if ('serviceWorker' in navigator) {
    var reg = function () {
      idle(function () {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
        // once a worker is active, ask it to keep this page for offline use
        navigator.serviceWorker.ready.then(function (r) {
          if (r.active) r.active.postMessage({ type: 'cache-page', url: location.pathname });
        }).catch(function () {});
      });
    };
    if (document.readyState === 'complete') reg(); else addEventListener('load', reg, { once: true });
  }

  if (standalone) return; // already running as an app: no install prompt needed

  var T = {
    en: { install: 'Install the app', ios: 'Tap Share, then “Add to Home Screen”.' },
    es: { install: 'Instalar la app', ios: 'Toca Compartir y luego «Añadir a pantalla de inicio».' },
    ar: { install: 'ثبّت التطبيق', ios: 'اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية».' }
  };
  function lang() {
    var l = (document.documentElement.lang || '').slice(0, 2);
    if (!T[l]) { try { l = localStorage.getItem('bh-lang') || 'en'; } catch (e) { l = 'en'; } }
    return T[l] ? l : 'en';
  }

  var deferred = null, link = null, tip = null;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function mount() {
    if (link) return link;
    var nav = document.getElementById('mnav');
    if (!nav) return null;
    link = document.createElement('a');
    link.href = '#install';
    link.id = 'bhInstall';
    link.textContent = T[lang()].install;
    link.setAttribute('role', 'button');
    // a quiet secondary link at the very bottom of the menu, below the main links, Book button and socials
    link.style.cssText = 'display:block!important;margin-top:10px!important;font-size:.76rem!important;font-weight:600!important;letter-spacing:.16em!important;opacity:.78!important;text-decoration:underline!important;text-underline-offset:5px!important;text-align:center!important';
    nav.appendChild(link);
    link.addEventListener('click', onInstall);
    return link;
  }

  function onInstall(e) {
    e.preventDefault();
    e.stopPropagation(); // the pages close the menu on any link tap; keep it open so the iOS steps stay visible
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () {
        deferred = null;
        if (link) link.remove();
        link = null;
        var nav = document.getElementById('mnav');
        if (nav) nav.classList.remove('open');
      }, function () {});
    } else if (isIOS) {
      if (!tip) {
        tip = document.createElement('p');
        // take the colour from the link itself, so it reads on both the light and the dark pages
        tip.style.cssText = 'margin:10px auto 0;max-width:280px;padding:0 20px;text-align:center;font:500 .85rem/1.5 system-ui,sans-serif;text-transform:none;letter-spacing:0;opacity:.85;color:' + getComputedStyle(link).color;
        link.parentNode.insertBefore(tip, link.nextSibling);
      }
      tip.textContent = T[lang()].ios;
    }
  }

  addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    mount();
  });
  addEventListener('appinstalled', function () {
    deferred = null;
    if (link) { link.remove(); link = null; }
  });

  // iOS Safari never fires beforeinstallprompt: show the entry with the manual steps instead
  if (isIOS) {
    var show = function () { idle(mount); };
    if (document.readyState === 'complete') show(); else addEventListener('load', show, { once: true });
  }
})();
