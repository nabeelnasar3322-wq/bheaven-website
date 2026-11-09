/**
 * B·Heaven Dubai — High-End Interactive Feature Suite
 * 1. Interactive Day-to-Night Mood Switcher
 * 2. Procedural Web Audio Rooftop Jazz Synthesizer (Tonight's Soundtrack)
 * 3. Interactive "Curate Your Vibe" Concierge & Reservation Form Auto-Sync
 * 4. Micro-Cursor Spotlight Physics across Cards
 */
(function () {
  'use strict';

  /* =====================================================================
     1. Interactive Day-to-Night Mood Switcher
     ===================================================================== */
  function initMoodSwitcher() {
    const tabs = document.querySelectorAll('.mood-tab');
    const cards = document.querySelectorAll('.times .time');
    if (!tabs.length || !cards.length) return;

    function setMood(moodKey) {
      tabs.forEach(t => {
        const match = t.dataset.mood === moodKey;
        t.classList.toggle('on', match);
        t.setAttribute('aria-selected', match ? 'true' : 'false');
      });

      cards.forEach(c => {
        const match = c.classList.contains(moodKey);
        c.classList.toggle('is-active', match);
        if (match && window.innerWidth <= 768) {
          c.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      });
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => setMood(tab.dataset.mood));
    });

    cards.forEach(card => {
      card.addEventListener('click', () => {
        const mood = ['day', 'sunset', 'night'].find(m => card.classList.contains(m));
        if (mood) setMood(mood);
      });
    });

    // Default to the current time of day in Dubai
    const hour = (function () {
      try {
        return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: 'numeric', hour12: false }).format(new Date()));
      } catch (e) {
        return new Date().getHours();
      }
    })();
    const initialMood = (hour >= 9 && hour < 16) ? 'day' : (hour >= 16 && hour < 19) ? 'sunset' : 'night';
    setMood(initialMood);
  }

  /* =====================================================================
     2. Tonight's Soundtrack: Web Audio Rooftop Jazz Synthesizer
     ===================================================================== */
  function initSoundtrackSynthesizer() {
    const btn = document.getElementById('soundTeaser');
    if (!btn) return;
    let actx = null, isPlaying = false, timer = null, master = null;
    const tag = document.getElementById('soundBtnTag');

    function stopAudio() {
      if (!isPlaying) return;
      isPlaying = false;
      clearTimeout(timer);
      btn.classList.remove('playing');
      if (tag) tag.textContent = 'Listen';
      if (master && actx) {
        try {
          master.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.3);
          setTimeout(() => { try { actx.close(); } catch (e) {} actx = null; }, 350);
        } catch (e) { actx = null; }
      }
    }

    btn.addEventListener('click', function () {
      if (isPlaying) { stopAudio(); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        actx = new AC();
        if (actx.state === 'suspended') actx.resume();

        master = actx.createGain();
        master.gain.setValueAtTime(0.0001, actx.currentTime);
        master.gain.exponentialRampToValueAtTime(0.28, actx.currentTime + 0.4);
        master.connect(actx.destination);

        function note(f, s, d, v) {
          if (!actx) return;
          const o1 = actx.createOscillator(), o2 = actx.createOscillator(), g = actx.createGain(), flt = actx.createBiquadFilter();
          o1.type = 'sine'; o1.frequency.value = f;
          o2.type = 'triangle'; o2.frequency.value = f;
          flt.type = 'lowpass'; flt.frequency.value = f * 3.2;
          g.gain.setValueAtTime(0.0001, s);
          g.gain.exponentialRampToValueAtTime((v || 0.6) * 0.14, s + 0.04);
          g.gain.exponentialRampToValueAtTime(0.0001, s + d);
          o1.connect(flt); o2.connect(flt); flt.connect(g); g.connect(master);
          o1.start(s); o2.start(s); o1.stop(s + d); o2.stop(s + d);
        }

        const now = actx.currentTime + 0.08;
        // Dm9
        note(73.4, now, 3.2, 0.8); note(349.2, now, 2.5); note(440, now + 0.05, 2.7); note(523.2, now + 0.1, 2.9); note(659.2, now + 0.15, 3.2);
        note(587.3, now + 1.5, 1.2);
        // G13
        const t2 = now + 3.6;
        note(98.0, t2, 3.2, 0.8); note(349.2, t2, 2.5); note(493.8, t2 + 0.05, 2.7); note(659.2, t2 + 0.1, 3.0);
        // Cmaj9
        const t3 = now + 7.2;
        note(65.4, t3, 3.2, 0.8); note(329.6, t3, 2.5); note(392, t3 + 0.05, 2.7); note(493.8, t3 + 0.1, 2.9); note(587.3, t3 + 0.15, 3.2);
        // A7alt
        const t4 = now + 10.8;
        note(110.0, t4, 3.8, 0.85); note(329.6, t4, 2.5); note(415.3, t4 + 0.05, 2.7); note(493.8, t4 + 0.1, 2.9); note(587.3, t4 + 0.15, 3.2);

        isPlaying = true;
        btn.classList.add('playing');
        if (tag) tag.textContent = 'Pause';
        timer = setTimeout(stopAudio, 15000);
      } catch (err) {
        stopAudio();
      }
    });
  }

  /* =====================================================================
     3. Interactive "Curate Your Vibe" Concierge & Form Auto-Sync
     ===================================================================== */
  const VIBES = {
    sunset: {
      title: "Sunset Golden Hour & Cocktails",
      tag: "5:00 PM – 8:00 PM · Daily",
      desc: "Watch Dubai's downtown skyline turn into glowing gold from an open-air terrace table, paired with our 2-for-1 Happy Hour creations.",
      table: "Terrace High-Top or Panoramic Rail Table",
      pairing: "Tito's Toasted Pineapple Mule + Levant Trio Dips",
      occasion: "Dinner",
      seating: "Outdoor",
      waText: "Hi B·Heaven! I'd like to reserve an outdoor sunset table for drinks & dinner."
    },
    jazz: {
      title: "Live Jazz Friday with Anetta",
      tag: "9:00 PM – Midnight · Every Friday",
      desc: "Intimate vocals, saxophonist harmonies, and late-night Levantine plates under warm lighting as the city skyline glimmers.",
      table: "Center Stage Dining Lounge Table",
      pairing: "Grape Selection + Smokehouse Beef Ribs",
      occasion: "Jazz Friday",
      seating: "Indoor",
      waText: "Hi B·Heaven! I'd like to book a table for Jazz Friday with Anetta."
    },
    shisha: {
      title: "Open-Air Shisha & Skyline Lounge",
      tag: "8:00 PM – 2:00 AM · Daily",
      desc: "Artisanal double-apple and citrus signature blends under the stars with Arabian breeze and late-night charcoal mezze.",
      table: "Low-Seating Poolside Cabana or Terrace Lounge",
      pairing: "Special Mint Shisha + Farmers Nectar Mocktail",
      occasion: "Shisha & drinks",
      seating: "Outdoor",
      waText: "Hi B·Heaven! I'd like to book a terrace lounge table for shisha and drinks."
    },
    brunch: {
      title: "Ibiza Sunday Pool Brunch",
      tag: "1:00 PM – 5:00 PM · Every Sunday",
      desc: "Unlimited live charcoal BBQ, refreshing poolside cocktails, pool pass access, and resident DJ tunes all afternoon.",
      table: "Poolside Daybed or Shaded Dining Cabana",
      pairing: "Live Grill Skewers + Frozen Berry Sangria",
      occasion: "Dinner",
      seating: "Poolside",
      waText: "Hi B·Heaven! I'd like to book packages for the Sunday Ibiza Brunch."
    }
  };

  function initVibeConcierge() {
    const chips = document.querySelectorAll('.vibe-chip');
    const cardEl = document.getElementById('vibeCard');
    if (!chips.length || !cardEl) return;

    const VIBE_MENU = { sunset: ['/menu/#d-signature-cocktails', 'Signature cocktails'], jazz: ['/menu/#d-wine-bubbles', 'Wine & bubbles'], shisha: ['/shisha/', 'Shisha menu'], brunch: ['/menu/#cat-sharers', 'Sharers'] };
    function renderVibe(key) {
      const v = VIBES[key];
      if (!v) return;

      chips.forEach(c => {
        const on = c.dataset.vibe === key;
        c.classList.toggle('on', on);
        c.setAttribute('aria-selected', on ? 'true' : 'false');
      });

      cardEl.innerHTML = `
        <div class="vibe-info">
          <p class="eyebrow" style="color:var(--lagoon);font-size:10px;margin-bottom:4px">${v.tag}</p>
          <h4 class="vibe-match-title">${v.title}</h4>
          <p class="vibe-match-desc">${v.desc}</p>
          <div class="vibe-details">
            <span><i><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 11V4h12v7M4 11h16v3H4zM6 14v6M18 14v6"/></svg> Seating:</i> <strong>${v.table}</strong></span>
            <span><i><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16l-8 9zM12 13v7M8 20h8"/></svg> Recommended:</i> <strong>${v.pairing}</strong></span>
          </div>
        </div>
        <div class="vibe-action" style="display:flex;flex-direction:column;gap:10px;align-items:stretch">
          <a class="btn btn-gold" href="https://wa.me/971506129150?text=${encodeURIComponent(v.waText)}" target="_blank" rel="noopener">
            Book on WhatsApp
          </a>
          <button type="button" class="btn btn-line btn-sm apply-form-btn" style="font-size:11px;min-height:38px">
            Select in Form ↓
          </button>
          ${VIBE_MENU[key] ? `<a class="btn btn-line btn-sm vibe-menu" href="${VIBE_MENU[key][0]}" style="font-size:11px;min-height:38px">See ${VIBE_MENU[key][1]} →</a>` : ''}
        </div>
      `;

      // Form auto-fill button
      const applyBtn = cardEl.querySelector('.apply-form-btn');
      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          const occSel = document.getElementById('occSel');
          if (occSel) {
            for (let i = 0; i < occSel.options.length; i++) {
              if (occSel.options[i].text.toLowerCase().includes(v.occasion.toLowerCase())) {
                occSel.selectedIndex = i;
                break;
              }
            }
          }
          const seatButtons = document.querySelectorAll('#seatSeg button');
          seatButtons.forEach(b => {
            const isMatch = b.textContent.trim().toLowerCase() === v.seating.toLowerCase();
            b.classList.toggle('on', isMatch);
          });
          const form = document.getElementById('resForm');
          if (form) {
            form.dispatchEvent(new Event('input', { bubbles: true }));
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      }
    }

    chips.forEach(chip => {
      chip.setAttribute('role', 'tab');
      chip.setAttribute('aria-selected', chip.classList.contains('on') ? 'true' : 'false');
      chip.addEventListener('click', () => { renderVibe(chip.dataset.vibe); window.__bhTrack && window.__bhTrack('cat_view', 'Vibe: ' + chip.dataset.vibe); });
    });

    renderVibe('sunset');
  }

  /* =====================================================================
     4. Interactive Cursor Spotlight Physics
     ===================================================================== */
  function initSpotlightPhysics() {
    // Add data-spotlight to interactive cards
    const targets = document.querySelectorAll('.feature, .time, .show, .tcard, .rq, .rbook, .vibe-concierge');
    targets.forEach(t => t.setAttribute('data-spotlight', ''));

    document.addEventListener('pointermove', e => {
      const card = e.target.closest('[data-spotlight]');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
      card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
    }, { passive: true });
  }

  /* Initialize on DOM Ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initMoodSwitcher();
      initSoundtrackSynthesizer();
      initVibeConcierge();
      initSpotlightPhysics();
    });
  } else {
    initMoodSwitcher();
    initSoundtrackSynthesizer();
    initVibeConcierge();
    initSpotlightPhysics();
  }
})();
