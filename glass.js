/* Pointer-following specular light on glass panes. Fine pointers only, no layout reads except one rect per hover. */
(function(){
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  var SEL='.rev-card,.vibe-card,.vibe-concierge,.rbook,.form,.soundTeaser,.chips li,.sky-perks li,.hero-tag,.btn-line,.vibe-chip,.rb-seats button';
  var cur=null,rect=null,raf=0,px=0,py=0;
  function paint(){raf=0;if(!cur||!rect)return;
    cur.style.setProperty('--gx',(px-rect.left)+'px');cur.style.setProperty('--gy',(py-rect.top)+'px');}
  function leave(){if(cur){cur.classList.remove('is-lit');cur=null;rect=null;}}
  document.addEventListener('pointermove',function(e){
    if(e.pointerType!=='mouse')return;
    var t=e.target&&e.target.closest?e.target.closest(SEL):null;
    if(t!==cur){leave();if(t){cur=t;rect=t.getBoundingClientRect();t.classList.add('is-lit');}}
    px=e.clientX;py=e.clientY;
    if(cur&&!raf)raf=requestAnimationFrame(paint);
  },{passive:true});
  document.addEventListener('pointerleave',leave);
  addEventListener('scroll',function(){rect=cur?cur.getBoundingClientRect():null;},{passive:true});
})();
