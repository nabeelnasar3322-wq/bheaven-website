/* Pause the wall's animation while it is off-screen (saves battery). */
(function () {
  var w = document.querySelector('.wall'); if (!w || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function (en) { w.classList.toggle('paused', !en[0].isIntersecting); }, { threshold: 0 }).observe(w);
})();
