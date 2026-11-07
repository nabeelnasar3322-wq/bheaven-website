/* Show script errors on screen when the page is opened with ?debug */
if (/[?&]debug/.test(location.search)) addEventListener('error', e => { const d = document.createElement('pre'); d.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;margin:0;padding:10px;background:#b00020;color:#fff;font:12px/1.4 monospace;white-space:pre-wrap'; d.textContent = 'Error: ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')'; document.body.append(d); });
/* Keep the animations on for every visitor, including phones with "Reduce motion" switched on (deferred so initial paint never hangs) */
setTimeout(() => {
  [...document.styleSheets].forEach(sh => { try { for (let i = sh.cssRules.length - 1; i >= 0; i--) { const r = sh.cssRules[i]; if (r.media && /reduced-motion/.test(r.media.mediaText)) sh.deleteRule(i); } } catch (e) {} });
}, 800);
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const wa = (t) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(t)}`;
const camera = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M8 5l1.5-2h5L16 5"/></svg>';

/* Contact links */
document.querySelectorAll('[data-link]').forEach(a => {
  const t = a.dataset.link;
  if (t === 'tel') { a.href = 'tel:' + SITE.phone.replace(/\s/g, ''); a.textContent = SITE.phone; }
  if (t === 'wa') { a.href = wa('Hi B·Heaven!'); a.textContent = SITE.phone; }
  if (t === 'wa-icon') a.href = wa('Hi B·Heaven!');
  if (t === 'email') { a.href = 'mailto:' + SITE.email; a.textContent = SITE.email; }
  if (t === 'email-icon') a.href = 'mailto:' + SITE.email;
});
$('#bandWa').href = wa('Hi B·Heaven, I would like to reserve a table.');
$('#yr').textContent = new Date().getFullYear();

/* Daypart theme: the homepage's hero mood matches the real time at B·Heaven right now
   (Asia/Dubai, UTC+4, no DST), reusing the day/sunset/night palettes already built for the
   "Day to night" section. Falls back to the visitor's own local hour if the Dubai timezone
   can't be read (very old browsers). */
(function () {
  let hour;
  try {
    hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: 'numeric', hour12: false }).format(new Date()));
  } catch (e) {
    hour = new Date().getHours();
  }
  let part, label;
  if (hour >= 9 && hour < 16) { part = 'day'; label = 'Poolside right now'; }
  else if (hour >= 16 && hour < 19) { part = 'sunset'; label = "The skyline's going gold"; }
  else { part = 'night'; label = 'Live music under the stars'; }
  document.documentElement.setAttribute('data-daypart', part);
  const tag = $('#daypartLabel');
  if (tag) tag.textContent = label;
})();

/* Logo image (optional) */
if (SITE.logo) document.querySelectorAll('[data-logo]').forEach(el => { el.innerHTML = `<img src="${esc(SITE.logo)}" alt="B·Heaven by Barceló">`; });

/* Photo slots: a photo only shows once it has loaded; otherwise the styled placeholder stays */
/* Any of .webp / .jpg / .jpeg / .png works for a photo name */
/* Big photos are resized and compressed by Vercel; the original file is the backup */
const optimise = (src, w) => w && location.protocol === 'https:' && /^https:\/\/cdn\.jsdelivr\.net\//.test(src) ? ['/_vercel/image?url=' + encodeURIComponent(src) + '&w=' + w + '&q=75'] : [];
const variants = (src, w) => { const m = src.match(/^(.*)\.(jpe?g|webp|png)$/i); return [...optimise(src, w), ...(m ? [...new Set([src, m[1] + '.webp', m[1] + '.jpg', m[1] + '.jpeg', m[1] + '.png'])] : [src])]; };
const loadImg = (src, ok, fail, w = 960) => {
  if (!src) return fail && fail();
  const list = variants(src, w);
  const tryN = k => { if (k >= list.length) return fail && fail(); const im = new Image(); im.onload = () => ok(im); im.onerror = () => tryN(k + 1); im.src = list[k]; };
  tryN(0);
};
function fillPhoto(el, src, alt, fallback) {
  const put = im => { im.alt = alt || ''; im.loading = 'lazy'; im.dataset.par = ''; el.prepend(im); el.classList.add('has-img'); requestAnimationFrame(parTick); };
  loadImg(src, put, () => fallback && loadImg(fallback, put));
}
const FB = SITE.fallbacks || {};
document.querySelectorAll('[data-photo]').forEach(el => fillPhoto(el, SITE.photos[el.dataset.photo], el.textContent.trim(), FB[el.dataset.photo]));
document.querySelectorAll('[data-bg]').forEach(el => {
  const set = src => { el.style.backgroundImage = `url("${src}")`; el.classList.add('on'); el.closest('.time,.pass-card')?.classList.add('has-photo'); };
  const w = el.classList.contains('band-bg') ? 1920 : 960;
  loadImg(SITE.photos[el.dataset.bg], im => set(im.src), () => FB[el.dataset.bg] && loadImg(FB[el.dataset.bg], im => set(im.src), null, w), w);
});
$('#gallery').innerHTML = SITE.gallery.map((g, i) =>
  `<div class="ph ${g.size || ''}" data-r data-gi="${i}" style="--i:${i % 4}"><div class="ph-label">${camera}${esc(g.label)}</div><span class="ph-cap">${esc(g.label)}</span></div>`).join('');
$('#gallery').querySelectorAll('.ph').forEach((el, i) => fillPhoto(el, SITE.gallery[i].src, SITE.gallery[i].label));

/* Instagram: the latest 14 posts replace the photo tiles once the feed is connected */
const igIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>';
fetch('/api/instagram').then(r => r.status === 200 ? r.json() : null).then(d => {
  if (!d || !d.posts || !d.posts.length) return;
  const g = $('#gallery'); g.classList.add('ig-grid');
  g.innerHTML = d.posts.map((p, i) => `<a class="ph ig has-img${i === 0 || i === 7 ? ' big' : ''}" href="${esc(p.link)}" target="_blank" rel="noopener" data-r style="--i:${i % 4}">
    <img src="${esc(p.img)}" alt="${esc(p.caption.slice(0, 100) || 'Instagram post')}" loading="lazy" data-par>
    ${p.type === 'VIDEO' ? '<i class="ig-badge">▶</i>' : p.type === 'CAROUSEL_ALBUM' ? '<i class="ig-badge">❐</i>' : ''}
    <span class="ig-ov">${igIcon}<span>${esc(p.caption.slice(0, 140))}</span></span></a>`).join('');
  const lead = $('.gallery .lead'); if (lead) lead.textContent = 'Fresh from our Instagram. Tap a post to open it.';
  requestAnimationFrame(parTick);
}).catch(() => {});

/* Menu category tiles: real photos linking straight to the full menu (only if on the page).
   Each tile carries its category as a class (cat-food/cat-drinks/cat-shisha/cat-pool) so its
   empty-photo state gets its own tint and icon instead of 4 identical gray boxes, and a number
   badge (01-04) for a bit of menu-like structure while real photos aren't uploaded yet. */
const CAT_ICON = {
  food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 11h16M6 11V8a6 6 0 0 1 12 0v3M5 11l1 9h12l1-9"/></svg>',
  drinks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3h8l-4 7zM12 10v8M8 21h8M4 3h16"/></svg>',
  shisha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 20c-2-1-2-3 0-4s0-3-2-4M13 20c-2-1-2-3 0-4s0-3-2-4"/><path d="M6 20h12M9 8c0-2 1.5-3 1.5-5M14 8c0-2-1.5-3-1.5-5"/><ellipse cx="12" cy="9" rx="5" ry="2"/></svg>',
  pool: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 17c2 0 2-1.5 4-1.5S8 17 10 17s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 21c2 0 2-1.5 4-1.5S8 21 10 21s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M8 13V5a2 2 0 0 1 4 0M16 13V5a2 2 0 0 0-4 0"/></svg>'
};
if ($('#menuCatGrid')) {
$('#menuCatGrid').innerHTML = TASTE.map((t, i) => `
  <a class="tcard ph cat-${t.tab}" href="/menu/" data-r data-tilt style="--i:${i}">
    <span class="tcard-num">0${i + 1}</span>
    <div class="ph-label">${CAT_ICON[t.tab] || camera}<span>${esc(t.title)}</span></div>
    <div class="tcard-body"><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p><span class="tcard-go">View menu <b>→</b></span></div>
  </a>`).join('');
$('#menuCatGrid').querySelectorAll('.tcard').forEach((el, i) => fillPhoto(el, TASTE[i].src, TASTE[i].title));
}

/* Ribbon */
const RIB = ['Modern Levant cuisine', 'Signature cocktails', 'Premium shisha', 'Poolside lounge', '180° skyline views', 'Live entertainment', 'Al Jaddaf’s hidden rooftop'];
$('#ribbon').innerHTML = [...RIB, ...RIB].map(t => `<span>${t}</span>`).join('');

/* Hero letters */
document.querySelectorAll('[data-split]').forEach(el => {
  const text = el.dataset.split, start = parseFloat(el.dataset.start || 0);
  let n = 0;
  el.innerHTML = text.split(' ').map(w => `<span class="w">${[...w].map(c => `<span class="ch" style="animation-delay:${(start + n++ * 0.035).toFixed(3)}s">${esc(c)}</span>`).join('')}</span>`).join(' ');
});

/* Hero video: Sunset Terrace Cabanas (bhvn.mp4) with iOS Low Power Mode assurance */
const pan = $('.pan'), heroDots = $('#heroDots');
const heroVid = pan ? pan.querySelector('video') : null;
if (heroVid) {
  if (heroDots) heroDots.innerHTML = '';
  heroVid.muted = true;
  heroVid.defaultMuted = true;

  const startPlayback = () => {
    const playPromise = heroVid.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        const onFirstInteraction = () => {
          heroVid.play().catch(() => {});
          window.removeEventListener('touchstart', onFirstInteraction);
          window.removeEventListener('touchend', onFirstInteraction);
          window.removeEventListener('scroll', onFirstInteraction);
          window.removeEventListener('click', onFirstInteraction);
        };
        window.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });
        window.addEventListener('touchend', onFirstInteraction, { once: true, passive: true });
        window.addEventListener('scroll', onFirstInteraction, { once: true, passive: true });
        window.addEventListener('click', onFirstInteraction, { once: true, passive: true });
      });
    }
  };

  startPlayback();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && heroVid.paused) {
      heroVid.play().catch(() => {});
    }
  });
}

const firstSlideImg = pan ? pan.querySelector('img') : null;
if (firstSlideImg) {
  /* Portrait phones get pre-cropped, lighter hero photos (hero-N-m.jpeg, centred on each photo's focus point) */
  const MOB = matchMedia('(max-width:820px) and (orientation:portrait)').matches;
  const HS = HERO_SLIDES.map(x => typeof x === 'string' ? { src: x } : x)
    .map(x => MOB && /^\/hero-\d\.jpeg$/.test(x.src) ? { ...x, src: x.src.replace('.jpeg', '-m.jpeg'), focus: '50% 50%' } : x);
  const slides = new Array(HS.length).fill(null);
  slides[0] = firstSlideImg; slides[0].classList.add('slide', 'on');
  /* the first photo ships inside a <picture> so phones download the small crop; flatten it so the slide logic can reorder images */
  if (slides[0].parentElement.tagName === 'PICTURE') { const pic = slides[0].parentElement; slides[0].src = slides[0].currentSrc || slides[0].src; pic.replaceWith(slides[0]); }
  if (HS[0].focus) slides[0].style.objectPosition = HS[0].focus;
  let hs = 0, hTimer;
  const liveSlides = () => slides.filter(Boolean);
  const showSlide = n => {
    const live = liveSlides(); if (live.length < 2) return;
    hs = (n + live.length) % live.length;
    live.forEach((im, i) => { im.classList.toggle('on', i === hs); if (i === hs) { im.style.animation = 'none'; im.offsetWidth; im.style.animation = ''; } });
    [...heroDots.children].forEach((d, i) => { const on = i === hs; d.classList.toggle('on', on); d.setAttribute('aria-current', on ? 'true' : 'false'); });
    clearTimeout(hTimer); hTimer = setTimeout(() => showSlide(hs + 1), 7000);
  };
  const renderHeroDots = () => {
    const live = liveSlides();
    heroDots.innerHTML = live.length > 1 ? live.map((_, i) => `<button type="button" class="${i === hs ? 'on' : ''}" aria-label="Slide ${i + 1}" aria-current="${i === hs ? 'true' : 'false'}"><i></i></button>`).join('') : '';
    [...heroDots.children].forEach((d, i) => d.addEventListener('click', () => showSlide(i)));
    if (live.length === 2 && !hTimer) hTimer = setTimeout(() => showSlide(1), 7000);
  };
  const loadExtraSlides = () => HS.slice(1).forEach((sl, k) => loadImg(sl.src, im => {
    im.className = 'slide'; im.alt = ''; slides[k + 1] = im;
    if (sl.focus) im.style.objectPosition = sl.focus;
    const rays = pan.querySelector('.rays'); liveSlides().forEach(x => pan.insertBefore(x, rays));
    hs = liveSlides().findIndex(x => x.classList.contains('on'));
    renderHeroDots();
  }, null, 1920));
  /* first photo loads straight away; the other slides wait until the page has finished loading (and skip on Data Saver) */
  if (!(navigator.connection && navigator.connection.saveData)) {
    const go = () => (window.requestIdleCallback ? requestIdleCallback(loadExtraSlides, { timeout: 3000 }) : setTimeout(loadExtraSlides, 1500));
    document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true });
  }
}

/* What's on: React Bits Pro Skewed Carousel of nights & offers */
const SHOWS = [...EVENTS.map(e => ({ ...e, type: 'Weekly night' })), ...OFFERS.map(e => ({ ...e, type: 'Daily offer' }))];
const track = $('#showTrack'), dotsEl = $('#showDots');
if (track && dotsEl) {
  track.innerHTML = SHOWS.map((e, i) => `
    <article class="show ${e.key}" tabindex="${i === 1 ? '0' : '-1'}" aria-label="${esc(e.title)}" aria-current="${i === 1 ? 'true' : 'false'}">
      <div class="show-art">
        ${[1,2,3,4,5].map(k => `<i class="spark" style="left:${10 + k * 16}%;top:${8 + (k * 29) % 40}%;animation-delay:${k * .4}s"></i>`).join('')}
        <div class="big">${esc(e.big)}<small>${esc(e.sub)}</small></div>
      </div>
      <div class="show-shine"></div>
      <span class="show-badge${e.type === 'Daily offer' ? ' offer' : ''}">${e.type}</span>
      <div class="show-info">
        <div class="show-meta"><span>${esc(e.day)}</span><span>${esc(e.time)}</span></div>
        <h3>${esc(e.title)}</h3>
        <span class="show-hint"><i>+</i>See details</span>
        <div class="show-more"><div>
          <ul>${e.perks.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
          ${e.price ? `<p class="price">${esc(e.price)}</p>` : ''}
          <a class="btn btn-gold btn-sm" href="${wa(`Hi B·Heaven, I would like to book a table for ${e.title}.`)}" target="_blank" rel="noopener">${esc(e.cta || 'Book ' + e.title.split(' ')[0])}</a>
        </div></div>
      </div>
    </article>`).join('');

  dotsEl.innerHTML = SHOWS.map((e, i) => `<button type="button" role="tab" aria-selected="${i === 1 ? 'true' : 'false'}" aria-label="${esc(e.title)}" class="${i === 1 ? 'on' : ''}"><i></i></button>`).join('');

  const cards = [...track.children], dots = [...dotsEl.children], N = cards.length;
  cards.forEach((c, i) => SHOWS[i].poster && loadImg(SHOWS[i].poster, im => { im.alt = SHOWS[i].title + ' poster'; c.querySelector('.show-art').append(im); }));

  let current = 1;
  const layout = () => {
    cards.forEach((c, i) => {
      let o = i - current;
      if (o > N / 2) o -= N;
      if (o < -N / 2) o += N;
      const prev = c.dataset.o === undefined ? o : +c.dataset.o;
      c.classList.toggle('jump', Math.abs(o - prev) > 1.5);
      c.dataset.o = o;
      c.style.setProperty('--o', o);
      c.style.setProperty('--a', Math.abs(o));
      c.style.zIndex = 10 - Math.abs(o);
      const isCenter = o === 0;
      c.classList.toggle('is-center', isCenter);
      c.setAttribute('tabindex', isCenter ? '0' : '-1');
      c.setAttribute('aria-current', isCenter ? 'true' : 'false');
    });
    dots.forEach((d, i) => {
      const on = i === current;
      d.classList.toggle('on', on);
      d.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    requestAnimationFrame(() => requestAnimationFrame(() => cards.forEach(c => c.classList.remove('jump'))));
  };

  const goTo = i => {
    current = (i + N) % N;
    cards.forEach(c => c.classList.remove('open'));
    layout();
  };

  const prevBtn = $('.show-nav.prev'), nextBtn = $('.show-nav.next');
  if (prevBtn) prevBtn.addEventListener('click', () => { goTo(current - 1); play(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { goTo(current + 1); play(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); play(); }));

  /* keyboard arrow navigation */
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); play(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); play(); }
  });

  /* drag / swipe with momentum */
  let dragX = null, dragDx = 0, moved = false;
  track.addEventListener('pointerdown', e => {
    if (e.target.closest('a')) return;
    dragX = e.clientX;
    dragDx = 0;
    moved = false;
  });
  addEventListener('pointermove', e => {
    if (dragX === null) return;
    dragDx = e.clientX - dragX;
    if (Math.abs(dragDx) > 6 && !moved) {
      moved = true;
      track.classList.add('dragging');
    }
    if (moved) track.style.setProperty('--dx', dragDx + 'px');
  }, { passive: true });
  addEventListener('pointerup', () => {
    if (dragX === null) return;
    track.classList.remove('dragging');
    track.style.setProperty('--dx', '0px');
    if (moved && Math.abs(dragDx) > 40) {
      goTo(current + (dragDx < 0 ? 1 : -1));
      play();
    }
    dragX = null;
  });

  cards.forEach((c, i) => c.addEventListener('click', e => {
    if (moved) { e.preventDefault(); return; }
    if (e.target.closest('a')) return;
    if (i !== current) {
      goTo(i);
      play();
      if (e.target.closest('.show-hint')) {
        setTimeout(() => c.classList.add('open'), 320);
      }
      return;
    }
    c.classList.toggle('open');
  }));

  /* auto-play only while the section is on screen */
  let hold = false, inView = false, timer;
  const play = () => {
    clearInterval(timer);
    timer = setInterval(() => {
      const anyOpen = cards.some(c => c.classList.contains('open'));
      if (!hold && inView && !document.hidden && !anyOpen) goTo(current + 1);
    }, 5500);
  };
  track.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hold = true; });
  track.addEventListener('pointerleave', () => { hold = false; });
  track.addEventListener('touchstart', () => { hold = true; }, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView) play(); else clearInterval(timer);
    }, { threshold: 0.2 }).observe(track);
  }
  layout();
}

/* Guest reviews */
const stars = n => '<span class="rev-stars" aria-label="' + n + ' out of 5">' + '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i></span>';
$('#revLink').href = REVIEW_LINK;
if (typeof GOOGLE_RATING !== 'undefined' && $('#revRating')) {
  $('#revRating').innerHTML = `${stars(5)} <strong>${esc(GOOGLE_RATING.value)}</strong> on Google · ${esc(GOOGLE_RATING.count)} reviews`;
  $('#revRating').removeAttribute('aria-hidden');
}
if (REVIEWS.length) {
  const initials = n => (n || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  $('#reviewsWrap').innerHTML = `
    <div class="rev-stage">
      <span class="rev-mark" aria-hidden="true">“</span>
      ${REVIEWS.map((r, i) => `
        <figure class="rev-slide${i === 0 ? ' is-active' : ''}" data-i="${i}">
          ${stars(Math.max(1, Math.min(5, r.rating || 5)))}
          <blockquote>${esc(r.text)}</blockquote>
          <figcaption><span class="rev-av">${esc(initials(r.name))}</span><span><strong>${esc(r.name)}</strong><small>${esc(r.source || 'Guest review')}</small></span></figcaption>
        </figure>`).join('')}
    </div>
    ${REVIEWS.length > 1 ? `<div class="rev-tabs" role="tablist" aria-label="Guest reviews">
      ${REVIEWS.map((r, i) => `
        <button class="rev-tab${i === 0 ? ' is-active' : ''}" type="button" role="tab" aria-selected="${i === 0}" data-i="${i}">
          <span class="rev-tab-av">${esc(initials(r.name))}</span>
          <span class="rev-tab-name">${esc(r.name)}</span>
        </button>`).join('')}
      <span class="rev-tab-bar" aria-hidden="true"></span>
    </div>` : ''}`;

  const stage = $('#reviewsWrap');
  const slides = [...stage.querySelectorAll('.rev-slide')];
  const tabs = [...stage.querySelectorAll('.rev-tab')];
  const bar = stage.querySelector('.rev-tab-bar');
  let active = 0, revTimer;

  const moveBar = () => {
    if (!bar || !tabs[active]) return;
    bar.style.width = tabs[active].offsetWidth + 'px';
    bar.style.transform = `translateX(${tabs[active].offsetLeft}px)`;
  };
  const show = i => {
    active = (i + REVIEWS.length) % REVIEWS.length;
    slides.forEach((s, k) => s.classList.toggle('is-active', k === active));
    tabs.forEach((t, k) => { t.classList.toggle('is-active', k === active); t.setAttribute('aria-selected', k === active); });
    moveBar();
  };
  const autoplay = () => { clearInterval(revTimer); revTimer = setInterval(() => show(active + 1), 6000); };
  tabs.forEach(t => t.addEventListener('click', () => { show(+t.dataset.i); autoplay(); }));
  if (REVIEWS.length > 1) { autoplay(); window.addEventListener('resize', moveBar); }
  moveBar();
} else {
  $('#reviewsWrap').innerHTML = `<div class="rev-empty">
    ${stars(5)}
    <h3>Share your B·Heaven moment</h3>
    <p>Enjoyed a sunset, a Jazz Friday or a lazy pool day with us? We’d love to hear about it. Your review helps other guests find our hidden rooftop.</p>
  </div>`;
}

/* Reservation form */
const telHref = 'tel:' + SITE.phone.replace(/\s/g, '');
$('#rqTel').href = telHref; $('#locTel').href = telHref;
$('#rqWa').href = wa('Hi B·Heaven, I would like to reserve a table.');
document.querySelectorAll('[data-fill="phone"]').forEach(el => { el.textContent = SITE.phone; });
const timeSel = $('#timeSel');
for (let h = 9; h <= 25; h++) for (const m of [0, 30]) {
  if (h === 25 && m) break;
  const hh = h % 24, ap = hh < 12 ? 'AM' : 'PM', h12 = ((hh + 11) % 12) + 1;
  const label = `${h12}:${m ? '30' : '00'} ${ap}`;
  timeSel.insertAdjacentHTML('beforeend', `<option${label === '8:00 PM' ? ' selected' : ''}>${label}</option>`);
}
const dateIn = $('input[name=date]'), guestIn = $('#guestIn');
const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
dateIn.min = today.toISOString().slice(0, 10); dateIn.value = dateIn.min;
document.querySelectorAll('.stepper button').forEach(b => b.addEventListener('click', () => {
  const v = Math.min(20, Math.max(1, (parseInt(guestIn.value) || 2) + +b.dataset.step));
  guestIn.value = v; guestIn.classList.remove('bump'); guestIn.offsetWidth; guestIn.classList.add('bump'); resSummary();
}));
document.querySelectorAll('.seg').forEach(seg => seg.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); resSummary();
}));
const fmtDate = v => { if (!v) return 'Pick a date'; const d = new Date(v + 'T12:00:00'); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); };
function resSummary() {
  const f = $('#resForm'), g = +guestIn.value;
  $('#rfSum').innerHTML = `<span>${fmtDate(f.elements.date.value)}</span><span>${f.elements.time.value}</span><span>${g} guest${g > 1 ? 's' : ''}</span><span>${$('#seatSeg .on span').textContent}</span><span>${esc(f.elements.occasion.value)}</span>`;
}
$('#resForm').addEventListener('input', resSummary); $('#resForm').addEventListener('change', resSummary); resSummary();
function bookingText() {
  const f = $('#resForm'), v = n => f.elements[n].value.trim();
  return `Hi B·Heaven, I'd like to request a reservation.\n\nName: ${v('name')}\nPhone: ${v('phone')}\nDate: ${v('date')}\nTime: ${v('time')}\nGuests: ${v('guests')}\nSeating: ${$('#seatSeg .on span').textContent}\nOccasion: ${v('occasion')}${v('notes') ? `\nNotes: ${v('notes')}` : ''}`;
}
const resValid = () => { const f = $('#resForm'); f.classList.add('tried'); return f.reportValidity(); };
$('#resForm').addEventListener('submit', e => { e.preventDefault(); if (resValid()) window.open(wa(bookingText()), '_blank', 'noopener'); });
$('#emailBtn').addEventListener('click', () => {
  if (!resValid()) return;
  location.href = `mailto:${SITE.email}?subject=${encodeURIComponent('Reservation request')}&body=${encodeURIComponent(bookingText())}`;
});

/* Header + mobile menu */
const header = $('#header'), burger = $('#burger'), mnav = $('#mnav');
const onScroll = () => header.classList.toggle('solid', scrollY > 30 || mnav.classList.contains('open'));
addEventListener('scroll', onScroll, { passive: true }); onScroll();
burger.addEventListener('click', () => {
  const open = !mnav.classList.contains('open');
  mnav.classList.toggle('open', open); burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : ''; onScroll();
});
mnav.addEventListener('click', e => { if (e.target.closest('a')) burger.click(); });

/* Hero parallax: scroll on all devices, mouse on desktop */
const hero = $('#hero');
if (!false) {
  let tick = false;
  const par = () => { tick = false; hero.style.setProperty('--sy', Math.min(scrollY, innerHeight * 1.2).toFixed(1)); };
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(par); } }, { passive: true });
  par();
  if (matchMedia('(pointer:fine)').matches) hero.addEventListener('pointermove', e => {
    hero.style.setProperty('--mx', (e.clientX / innerWidth - .5).toFixed(3));
    hero.style.setProperty('--my', (e.clientY / innerHeight - .5).toFixed(3));
  });
}

/* Headings: split into words that rise in on reveal */
document.querySelectorAll('.section h2, .band-title, .pass-card h2').forEach(h => {
  let n = 0; const out = [];
  h.childNodes.forEach(node => {
    if (node.nodeType === 3) node.textContent.split(/(\s+)/).forEach(t => out.push(/^\s*$/.test(t) ? document.createTextNode(t) : Object.assign(document.createElement('span'), { className: 'wd', textContent: t })));
    else { const w = document.createElement('span'); w.className = 'wd'; w.append(node.cloneNode(true)); out.push(w); }
  });
  h.replaceChildren(...out);
  h.querySelectorAll('.wd').forEach(w => w.style.setProperty('--w', n++));
  if (!h.closest('[data-r]')) h.classList.add('in');
});

/* Reveal on scroll */
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(x => {
  if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
}), { rootMargin: '0px 0px -8% 0px', threshold: .08 }) : null;
document.querySelectorAll('[data-r]').forEach(el => io ? io.observe(el) : el.classList.add('in'));
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && n.matches('[data-r]') && (io ? io.observe(n) : n.classList.add('in'))))).observe(document.body, { childList: true, subtree: true });

/* Soft floating light orbs in the background of each section */
document.querySelectorAll('.section').forEach((sec, i) => {
  sec.insertAdjacentHTML('afterbegin', `<i class="glow g1" data-par="-.25" style="--gx:${(i * 37) % 80}%"></i><i class="glow g2" data-par=".2" style="--gx:${(i * 53 + 40) % 90}%"></i>`);
});

/* Parallax across the whole page: positions are measured once, then every layer glides smoothly */
const reduce = false;
const prog = $('#progress');
let parEls = [], parRun = false, parT = 0;
const parMeasure = () => { const y = scrollY; parEls.forEach(p => { const r = p.ref.getBoundingClientRect(); p.top = r.top + y; p.h = r.height; }); };
const parCollect = () => {
  parEls = [...document.querySelectorAll('[data-par], .band-bg')].map(el => ({ el, ref: el.parentElement, kind: el.tagName === 'IMG' ? 'img' : el.classList.contains('band-bg') ? 'band' : 'par', k: parseFloat(el.dataset.par || 0), top: 0, h: 0, cur: parseFloat(el.style.getPropertyValue('--p')) || 0 }));
  parMeasure();
};
function parFrame() {
  const vh = innerHeight, y = scrollY; let moving = false;
  prog.style.transform = `scaleX(${(y / Math.max(1, document.documentElement.scrollHeight - vh)).toFixed(4)})`;
  for (const p of parEls) {
    const off = p.top + p.h / 2 - y - vh / 2;
    if (Math.abs(off) > vh + p.h) continue;
    const t = p.kind === 'img' ? Math.max(-1, Math.min(1, off / vh)) * p.h * -.07 : p.kind === 'band' ? off * -.2 : off * p.k;
    p.cur += (t - p.cur) * .16;
    if (Math.abs(t - p.cur) > .4) moving = true; else p.cur = t;
    p.el.style.setProperty('--p', p.cur.toFixed(1) + 'px');
  }
  parRun = moving; if (moving) requestAnimationFrame(parFrame);
}
const parKick = () => { if (!parRun) { parRun = true; requestAnimationFrame(parFrame); } };
function parTick() { clearTimeout(parT); parT = setTimeout(() => { parCollect(); parKick(); }, 120); }
addEventListener('scroll', parKick, { passive: true });
addEventListener('resize', () => { parMeasure(); parKick(); });
addEventListener('load', parTick);
if ('ResizeObserver' in window) new ResizeObserver(() => { parMeasure(); parKick(); }).observe(document.body);
parCollect(); parKick();

/* Interactive touches for mouse users: tilt + glare on cards and photos, magnetic buttons */
const fine = matchMedia('(pointer:fine)').matches && !reduce;
if (fine) {
  document.addEventListener('pointermove', e => {
    const card = e.target.closest('[data-tilt], .ph, .show');
    if (card && !card.classList.contains('show')) {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--rx', ((.5 - y) * 8).toFixed(2) + 'deg');
      card.style.setProperty('--ry', ((x - .5) * 10).toFixed(2) + 'deg');
      card.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      card.classList.add('tilting');
    }
    const btn = e.target.closest('.btn, .show-nav, .social a');
    if (btn) {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px');
      btn.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px');
    }
  }, { passive: true });
  document.addEventListener('pointerout', e => {
    const card = e.target.closest('[data-tilt], .ph');
    if (card && !card.contains(e.relatedTarget)) { card.classList.remove('tilting'); card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); }
    const btn = e.target.closest('.btn, .show-nav, .social a');
    if (btn && !btn.contains(e.relatedTarget)) { btn.style.setProperty('--bx', '0px'); btn.style.setProperty('--by', '0px'); }
  });
}
/* Ripple on every button tap */
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.btn, .tab, .seg button, .wa-quick a'); if (!b) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2;
  const s = document.createElement('span'); s.className = 'rip';
  s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  b.append(s); setTimeout(() => s.remove(), 700);
});

/* Gallery lightbox */
const lb = $('#lb'), lbImg = $('#lb img'), lbCap = $('#lb figcaption'), lbPlayBtn = $('.lb-play');
let lbList = [], lbI = 0;
const lbShow = i => { lbI = (i + lbList.length) % lbList.length; const el = lbList[lbI]; lbImg.src = el.querySelector('img').src; lbCap.textContent = el.querySelector('.ph-cap')?.textContent || ''; lb.classList.remove('swap'); lb.offsetWidth; lb.classList.add('swap'); };
$('#gallery').addEventListener('click', e => {
  if (e.target.closest('.ig')) return;
  const t = e.target.closest('.ph.has-img');
  if (!t) { if (e.target.closest('.ph')) window.open('https://instagram.com/bheavendubai', '_blank', 'noopener'); return; }
  lbList = [...$('#gallery').querySelectorAll('.ph.has-img')];
  lbShow(lbList.indexOf(t)); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
});
/* Slideshow autoplay: advances every 3.2s while on; any manual nav, swipe, or close stops it.
   The on/off icon is two static SVGs toggled by the .on class (see custom.css) rather than an
   innerHTML swap — mutating the button's children mid-click would detach the event's own target
   while the click is still bubbling to the .lb container's listener below. */
let lbTimer = null;
const lbStop = () => {
  if (!lbTimer) return;
  clearInterval(lbTimer); lbTimer = null;
  lbPlayBtn.classList.remove('on'); lbPlayBtn.setAttribute('aria-pressed', 'false'); lbPlayBtn.setAttribute('aria-label', 'Play slideshow');
};
const lbPlay = () => {
  if (lbList.length < 2) return;
  lbTimer = setInterval(() => lbShow(lbI + 1), 3200);
  lbPlayBtn.classList.add('on'); lbPlayBtn.setAttribute('aria-pressed', 'true'); lbPlayBtn.setAttribute('aria-label', 'Pause slideshow');
};
lbPlayBtn.addEventListener('click', () => { lbTimer ? lbStop() : lbPlay(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) lbStop(); });
const lbClose = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; lbStop(); };
lb.addEventListener('click', e => {
  if (e.target.closest('.lb-play')) return;
  if (e.target.closest('.lb-nav.prev')) { lbStop(); lbShow(lbI - 1); }
  else if (e.target.closest('.lb-nav.next')) { lbStop(); lbShow(lbI + 1); }
  else if (!e.target.closest('img')) lbClose();
});
let lbX = 0; lb.addEventListener('touchstart', e => { lbX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - lbX; if (Math.abs(dx) > 50) { lbStop(); lbShow(lbI + (dx < 0 ? 1 : -1)); } });

/* WhatsApp chat widget */
const waWrap = $('#waWrap'), waFab = $('#waFab');
const QUICK = [['Reserve a table', 'Hi B·Heaven, I would like to reserve a table.'], ['Pool pass', 'Hi B·Heaven, I would like to ask about daytime pool passes.'], ['Tonight’s event', 'Hi B·Heaven, what’s on tonight?'], ['Get the menu', 'Hi B·Heaven, could you send me your menu?']];
$('#waQuick').innerHTML = QUICK.map(([l, t], i) => `<a href="${wa(t)}" target="_blank" rel="noopener" style="--i:${i}">${l}<b>→</b></a>`).join('');
const waToggle = open => { waWrap.classList.toggle('open', open); waWrap.classList.remove('nudge'); waFab.setAttribute('aria-expanded', open); };
waFab.addEventListener('click', () => waToggle(!waWrap.classList.contains('open')));
$('#waX').addEventListener('click', () => waToggle(false));
$('#waBubble').addEventListener('click', () => waToggle(true));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { waToggle(false); lbClose(); } if (lb.classList.contains('open') && e.key === 'ArrowRight') lbShow(lbI + 1); if (lb.classList.contains('open') && e.key === 'ArrowLeft') lbShow(lbI - 1); });
/* Don't let the auto-nudge WhatsApp bubble sit over the reservation form — the bubble's
   corner position would otherwise cover the Name/Phone fields and submit button. This has to
   keep checking for the whole nudge window (not just once before it starts), because the
   visitor can scroll onto the form at any point while the bubble is showing. */
(function () {
  const form = $('#resForm');
  const formInView = () => { if (!form) return false; const r = form.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
  let nudgeWanted = false, checker = null;
  const tick = () => { waWrap.classList.toggle('nudge', nudgeWanted && !formInView() && !waWrap.classList.contains('open')); };
  setTimeout(() => { nudgeWanted = true; tick(); addEventListener('scroll', tick, { passive: true }); }, 6000);
  setTimeout(() => { nudgeWanted = false; tick(); removeEventListener('scroll', tick); }, 16000);
})();
