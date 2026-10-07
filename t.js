/* B-Heaven guest analytics — tiny, cookie-free, fire-and-forget. */
(function () {
  if (navigator.webdriver || /bot|crawl|spider|preview|lighthouse/i.test(navigator.userAgent)) return;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
  var page = (location.pathname.split('/')[1] || 'menu').toLowerCase();
  var sent = {};
  function send(type, data) {
    var body = JSON.stringify({ t: type, p: page, d: data || null, r: document.referrer || '', m: matchMedia('(max-width: 820px)').matches ? 'mobile' : 'desktop' });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon('/api/track', body);
      else fetch('/api/track', { method: 'POST', body: body, keepalive: true });
    } catch (e) {}
  }
  function idle(f) { (window.requestIdleCallback || function (c) { setTimeout(c, 1) })(f); }

  idle(function () { send('pv'); });

  // dish / drink opened (menu page)
  if (typeof window.openDish === 'function' && typeof DATA === 'object') {
    var orig = window.openDish;
    window.openDish = function (k, i) {
      var r = orig.apply(this, arguments);
      try {
        var ds = DATA[k], d = ds && ds[(i + ds.length) % ds.length];
        if (d && d.n) {
          var key = k + '|' + d.n;
          if (!sent[key]) { sent[key] = 1; idle(function () { send('dish', { k: k, n: d.n }); }); }
        }
      } catch (e) {}
      return r;
    };
  }

  // taps on contact links, "Add to picks", language, Food/Drinks switch
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a,button,[data-l],[data-mode]');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (/wa\.me|whatsapp/i.test(h)) send('ev', 'whatsapp');
    else if (/^tel:/i.test(h)) send('ev', 'call');
    else if (/^mailto:/i.test(h)) send('ev', 'email');
    else if (/maps\.app|google\.[a-z.]+\/maps/i.test(h)) send('ev', 'directions');
    else if (/instagram\.com/i.test(h)) send('ev', 'instagram');
    else if (a.id === 'mdHeart') send('ev', 'pick');
    else if (a.dataset && a.dataset.l) send('ev', 'lang:' + a.dataset.l);
    else if (a.dataset && a.dataset.mode && a.tagName === 'BUTTON') send('ev', 'mode:' + a.dataset.mode);
  }, { passive: true, capture: true });
})();
