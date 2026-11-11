/* Scroll-in intro animation for everything on the main pages. Tags section content (and the items inside grids/lists)
   with .ri; each fades/rises in once as it scrolls into view. Skips the hero, the pinned 3D gate, anything that already
   has its own reveal ([data-r]) or transform, and does nothing for reduced-motion or when IntersectionObserver is missing. */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var st = document.createElement('style');
  st.textContent = '.js .ri{opacity:0;transform:translate3d(0,30px,0) scale(.985);transition:opacity .9s cubic-bezier(.2,.7,.2,1),transform .9s cubic-bezier(.2,.7,.2,1);transition-delay:calc(var(--ri,0)*80ms);will-change:opacity,transform}.js .ri.in{opacity:1;transform:none;will-change:auto}';
  document.head.appendChild(st);
  var SKIP = '.pre,.scatter,.sq,.plate,.hero,#hero,.gate,#festive,.festive-strip,header,.header,nav,.cookie,#consent,[data-r],[data-tilt],[aria-hidden="true"],script,style,link,template';
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -2% 0px', threshold: 0.01 });
  function scroller(el) {
    for (var a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      var o = getComputedStyle(a); if (/(auto|scroll)/.test(o.overflowX) || /(auto|scroll)/.test(o.overflowY) && a.scrollHeight > a.clientHeight + 4) return true;
    } return false;
  }
  function ok(el) {
    if (el.nodeType !== 1 || el.classList.contains('ri') || el.closest(SKIP) || scroller(el)) return false;
    var cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.position !== 'fixed' && cs.position !== 'sticky' && cs.position !== 'absolute' && cs.transform === 'none' && el.offsetHeight > 8;
  }
  function tag(el, i) { el.classList.add('ri'); el.style.setProperty('--ri', Math.min(i, 6)); io.observe(el); }
  function group(el) { var d = getComputedStyle(el).display; return el.tagName === 'UL' || el.tagName === 'OL' || d === 'grid' || d === 'flex' || d === 'inline-grid'; }
  function scan() {
    var roots = document.querySelectorAll('main, body > section, body > .section, body > footer, body > div > section, body > div > footer');
    [].forEach.call(roots, function (root) {
      if (root.closest(SKIP) && !root.matches('main')) return;
      var kids = root.matches('main') ? [].slice.call(root.children) : [root];
      kids.forEach(function (sec) {
        if (sec.closest(SKIP)) return;
        // wrappers (container/wrap) -> look one level deeper
        var lvl1 = [].slice.call(sec.children);
        if (lvl1.length === 1 && lvl1[0].children.length > 1) lvl1 = [].slice.call(lvl1[0].children);
        lvl1.forEach(function (c, i) {
          if (c.closest(SKIP)) return;
          if (group(c) && c.children.length > 1 && c.children.length < 40) {
            [].forEach.call(c.children, function (g, j) { if (ok(g)) tag(g, j); });
          } else if (ok(c)) tag(c, i);
        });
      });
    });
  }
  var t;
  function later() { clearTimeout(t); t = setTimeout(scan, 250); }
  function go() { scan(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
