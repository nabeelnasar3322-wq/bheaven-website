/* B-Heaven app: table request form.
   Loaded by pwa.js only when the site runs as the installed app. The "Book a table" buttons
   open a small form; sending it opens WhatsApp with the details already written, so the team
   keeps taking bookings exactly as they do today. The website itself is not changed. */
(function () {
  'use strict';
  var PHONE = '971506129150';
  var WA = 'https://api.whatsapp.com/send/?phone=' + PHONE + '&text=';

  var T = {
    en: { title: 'Book a table', sub: 'We confirm on WhatsApp.', name: 'Your name', date: 'Date', time: 'Time', guests: 'Guests', note: 'Occasion or request (optional)', send: 'Send on WhatsApp', close: 'Close', more: 'For groups of more than 12, please call', pick: 'Select', less: 'Fewer guests', plus: 'More guests', ev: 'Event', offer: 'Offer' },
    es: { title: 'Reservar mesa', sub: 'Confirmamos por WhatsApp.', name: 'Tu nombre', date: 'Fecha', time: 'Hora', guests: 'Personas', note: 'Ocasión o petición (opcional)', send: 'Enviar por WhatsApp', close: 'Cerrar', more: 'Para grupos de más de 12, por favor llama', pick: 'Elegir', less: 'Menos personas', plus: 'Más personas', ev: 'Evento', offer: 'Oferta' },
    ar: { title: 'احجز طاولة', sub: 'نؤكد الحجز عبر واتساب.', name: 'اسمك', date: 'التاريخ', time: 'الوقت', guests: 'عدد الضيوف', note: 'مناسبة أو طلب (اختياري)', send: 'أرسل عبر واتساب', close: 'إغلاق', more: 'للمجموعات الأكثر من 12 شخصًا، يرجى الاتصال', pick: 'اختر', less: 'ضيوف أقل', plus: 'ضيوف أكثر', ev: 'الفعالية', offer: 'العرض' }
  };
  function lang() {
    var l = (document.documentElement.lang || '').slice(0, 2);
    return T[l] ? l : 'en';
  }

  // What the guest wanted when they tapped: a normal table, a business lunch or one of the events.
  function context(href) {
    var text = '';
    try { text = decodeURIComponent((href.split('text=')[1] || '').replace(/\+/g, ' ')); } catch (e) {}
    if (!/\bbook\b/i.test(text)) return null; // other WhatsApp links (sending picks, etc.) stay as they are
    var m = text.match(/book for (.+)$/i);
    if (m) return { kind: 'event', label: m[1].trim() };
    if (/business lunch/i.test(text)) return { kind: 'lunch', label: 'Business lunch' };
    return { kind: 'table', label: '' };
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function slots() {
    // open daily 9 AM - 2 AM, last seating 1:30 AM
    var out = [];
    for (var m = 9 * 60; m <= 25 * 60 + 30; m += 30) {
      var h = Math.floor(m / 60) % 24, mi = m % 60, ap = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12;
      out.push(h12 + ':' + pad(mi) + ' ' + ap);
    }
    return out;
  }

  function css() {
    if (document.getElementById('bhBookCss')) return;
    var s = document.createElement('style');
    s.id = 'bhBookCss';
    s.textContent =
      '#bhBook{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(15,28,31,.55);opacity:0;transition:opacity .22s;font-family:Montserrat,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent}' +
      '#bhBook.on{opacity:1}' +
      '#bhBook .sh{width:100%;max-width:460px;max-height:92vh;max-height:92dvh;overflow:auto;background:#F5F5F3;color:#1F2A33;border-radius:24px 24px 0 0;padding:22px 22px calc(22px + env(safe-area-inset-bottom));transform:translateY(24px);transition:transform .25s ease;box-shadow:0 -20px 50px -20px rgba(0,0,0,.45)}' +
      '#bhBook.on .sh{transform:none}' +
      '@media(min-width:620px){#bhBook{align-items:center}#bhBook .sh{border-radius:24px}}' +
      '#bhBook h2{margin:0;font-size:1.35rem;font-weight:600;letter-spacing:.01em;color:#1F2A33}' +
      '#bhBook .sub{margin:4px 0 0;font-size:.85rem;color:#5B656C}' +
      '#bhBook .ctx{display:inline-block;margin-top:12px;padding:6px 12px;border-radius:999px;background:#EADFCB;color:#1E474C;font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase}' +
      '#bhBook .x{position:absolute;top:10px;inset-inline-end:12px;width:44px;height:44px;border:0;background:none;font-size:1.7rem;line-height:1;color:#1F2A33;cursor:pointer}' +
      '#bhBook .hd{position:relative;padding-inline-end:40px}' +
      '#bhBook form{margin-top:18px;display:grid;gap:14px}' +
      '#bhBook label{display:block;font-size:.68rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#376C71;margin-bottom:6px}' +
      '#bhBook input,#bhBook select,#bhBook textarea{width:100%;box-sizing:border-box;font:inherit;font-size:1rem;color:#1F2A33;background:#fff;border:1.5px solid #cfd4d3;border-radius:14px;padding:13px 14px;min-height:48px;-webkit-appearance:none;appearance:none}' +
      '#bhBook select{background-image:linear-gradient(45deg,transparent 50%,#376C71 50%),linear-gradient(135deg,#376C71 50%,transparent 50%);background-position:calc(100% - 20px) 50%,calc(100% - 14px) 50%;background-size:6px 6px;background-repeat:no-repeat;padding-inline-end:36px}' +
      '[dir=rtl] #bhBook select{background-position:14px 50%,20px 50%}' +
      '#bhBook textarea{min-height:76px;resize:vertical}' +
      '#bhBook input:focus,#bhBook select:focus,#bhBook textarea:focus{outline:none;border-color:#1E474C;box-shadow:0 0 0 3px rgba(55,108,113,.25)}' +
      '#bhBook .bhRow{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
      '#bhBook .step{display:flex;align-items:center;justify-content:space-between;background:#fff;border:1.5px solid #cfd4d3;border-radius:14px;min-height:48px;padding:4px}' +
      '#bhBook .step button{width:44px;height:40px;border:0;border-radius:10px;background:#ECECE9;color:#1E474C;font-size:1.3rem;font-weight:600;cursor:pointer}' +
      '#bhBook .step output{font-size:1.05rem;font-weight:600}' +
      '#bhBook .hint{margin:6px 0 0;font-size:.8rem;color:#5B656C;display:none}' +
      '#bhBook .hint a{color:#1E474C;font-weight:600}' +
      '#bhBook .go{margin-top:4px;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:52px;border:0;border-radius:999px;background:#1E474C;color:#fff;font:inherit;font-size:.78rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;cursor:pointer}' +
      '#bhBook .go:active{background:#376C71}';
    document.head.appendChild(s);
  }

  var lastFocus = null;

  function open(ctx) {
    if (document.getElementById('bhBook')) return;
    css();
    var t = T[lang()], guests = 2;
    var root = document.createElement('div');
    root.id = 'bhBook';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'bhBookT');
    lastFocus = document.activeElement;

    var ctxHtml = ctx.kind === 'table' ? '' : '<span class="ctx"></span>';
    root.innerHTML =
      '<div class="sh"><div class="hd"><h2 id="bhBookT"></h2><p class="sub"></p>' + ctxHtml +
      '<button type="button" class="x" aria-label=""></button></div>' +
      '<form novalidate>' +
      '<div><label for="bhN"></label><input id="bhN" name="name" autocomplete="name" required></div>' +
      '<div class="bhRow"><div><label for="bhD"></label><input id="bhD" type="date" required></div>' +
      '<div><label for="bhT"></label><select id="bhT" required></select></div></div>' +
      '<div><label id="bhGL"></label><div class="step" role="group" aria-labelledby="bhGL"><button type="button" data-d="-1"></button><output aria-live="polite">2</output><button type="button" data-d="1"></button></div>' +
      '<p class="hint"></p></div>' +
      '<div><label for="bhO"></label><textarea id="bhO" rows="2"></textarea></div>' +
      '<button class="go" type="submit"></button></form></div>';
    document.body.appendChild(root);

    var q = function (s) { return root.querySelector(s); };
    q('#bhBookT').textContent = t.title;
    q('.sub').textContent = t.sub;
    var cx = q('.ctx'); if (cx) cx.textContent = ctx.kind === 'event' ? t.ev + ': ' + ctx.label : (ctx.kind === 'offer' ? t.offer + ': ' + ctx.label : ctx.label);
    q('.x').setAttribute('aria-label', t.close);
    q('label[for=bhN]').textContent = t.name;
    q('label[for=bhD]').textContent = t.date;
    q('label[for=bhT]').textContent = t.time;
    q('#bhGL').textContent = t.guests;
    q('label[for=bhO]').textContent = t.note;
    q('.go').textContent = t.send;
    q('[data-d="-1"]').textContent = '−'; q('[data-d="-1"]').setAttribute('aria-label', t.less);
    q('[data-d="1"]').textContent = '+'; q('[data-d="1"]').setAttribute('aria-label', t.plus);
    var hint = q('.hint');
    hint.innerHTML = t.more + ' <a href="tel:+' + PHONE + '">+971 50 612 9150</a>';

    var dateEl = q('#bhD'); dateEl.min = today(); dateEl.value = today();
    var sel = q('#bhT');
    sel.innerHTML = '<option value="">' + t.pick + '</option>' + slots().map(function (s) { return '<option>' + s + '</option>'; }).join('');
    var out = q('output');
    function setG(n) { guests = Math.max(1, Math.min(13, n)); out.textContent = guests > 12 ? '12+' : guests; hint.style.display = guests > 12 ? 'block' : 'none'; }
    root.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-d]');
      if (b) setG(guests + parseInt(b.getAttribute('data-d'), 10));
    });

    function close() {
      document.removeEventListener('keydown', onKey, true);
      root.classList.remove('on');
      document.documentElement.style.overflow = prevOverflow;
      setTimeout(function () { root.remove(); }, 220);
      try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) {}
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = root.querySelectorAll('button,input,select,textarea,a[href]');
      f = Array.prototype.filter.call(f, function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    q('.x').addEventListener('click', close);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    document.addEventListener('keydown', onKey, true);
    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    q('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var nameEl = q('#bhN'), bad = null;
      [nameEl, dateEl, sel].forEach(function (el) {
        var empty = !el.value.trim();
        el.setAttribute('aria-invalid', empty ? 'true' : 'false');
        el.style.borderColor = empty ? '#b3402f' : '';
        if (empty && !bad) bad = el;
      });
      if (bad) { bad.focus(); return; }
      var d = new Date(dateEl.value + 'T12:00:00');
      var dateTxt = isNaN(d) ? dateEl.value : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      var what = ctx.kind === 'event' ? 'a table for ' + ctx.label : (ctx.kind === 'offer' ? 'a table for the offer "' + ctx.label + '"' : (ctx.kind === 'lunch' ? 'a business lunch table' : 'a table'));
      var msg = "Hi B-Heaven, I'd like to book " + what + '.\n' +
        'Name: ' + nameEl.value.trim() + '\n' +
        'Date: ' + dateTxt + '\n' +
        'Time: ' + sel.value + '\n' +
        'Guests: ' + (guests > 12 ? '12+' : guests);
      var note = q('#bhO').value.trim();
      if (note) msg += '\nNote: ' + note;
      var url = WA + encodeURIComponent(msg);
      close();
      var w = null;
      try { w = window.open(url, '_blank', 'noopener'); } catch (err) {}
      if (!w) location.href = url;
    });

    requestAnimationFrame(function () { root.classList.add('on'); q('#bhN').focus({ preventScroll: true }); });
  }

  // capture phase: runs before the page's own handlers and before the link is followed
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="api.whatsapp.com/send"]');
    if (!a || a.href.indexOf('phone=' + PHONE) < 0) return;
    var ctx = context(a.href);
    if (!ctx) return;
    e.preventDefault();
    open(ctx);
  }, true);

  window.__bhBooking = { open: function (c) { open(c || { kind: 'table', label: '' }); } };

  // home-screen shortcut "Book a table" lands here with ?book=1
  if (/[?&]book=1\b/.test(location.search)) open({ kind: 'table', label: '' });
})();
