/* PIXEL-NET Mobile Play Mode v1
   - Auto-detect coarse pointer + width
   - Converts side panels into a bottom sheet (How to Play / Leaderboard)
   - Locks scroll so swipe-heavy games work
   - Optional landscape requirement: set <body data-require-landscape="true">
*/
(function(){
  const mq = window.matchMedia('(pointer: coarse) and (max-width: 900px)');
  const isPortrait = () => window.innerHeight > window.innerWidth;

  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  function findPanels(){
    // Most wrappers use .layout and two .panel elements (instructions + leaderboard)
    const layout = qs('.layout');
    if(!layout) return {layout:null, how:null, lb:null};

    const panels = qsa('.panel', layout);
    if(panels.length === 0) return {layout, how:null, lb:null};

    let how = null, lb = null;
    for(const p of panels){
      const t = (p.textContent || '').toUpperCase();
      if(!how && t.includes('HOW TO PLAY')) how = p;
      else if(!lb && (t.includes('LEADER') || t.includes('TOP 10') || t.includes('TOP')) ) lb = p;
    }
    // fallback: first is how, last is lb
    if(!how) how = panels[0] || null;
    if(!lb) lb = panels[panels.length-1] || null;
    if(how === lb) lb = null;
    return {layout, how, lb};
  }

  function ensureSheets(){
    if(qs('.px-sheet-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'px-sheet-wrap';
    wrap.innerHTML = `
      <div class="px-sheet-backdrop" data-px-close="1"></div>
      <div class="px-sheet" role="dialog" aria-modal="true">
        <div class="px-sheet-head">
          <div class="px-sheet-title" id="pxSheetTitle">PANEL</div>
          <button class="px-sheet-close" type="button" data-px-close="1">CLOSE</button>
        </div>
        <div class="px-sheet-body" id="pxSheetBody"></div>
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.addEventListener('click', (e)=>{
      const el = e.target;
      if(el && el.getAttribute && el.getAttribute('data-px-close') === '1'){
        closeSheet();
      }
    });
  }

  function openSheet(title, node){
    ensureSheets();
    const wrap = qs('.px-sheet-wrap');
    const body = qs('#pxSheetBody');
    const head = qs('#pxSheetTitle');

    head.textContent = title;
    body.innerHTML = '';
    if(node){
      // move the node into the sheet to keep it live (leaderboard auto-refresh etc.)
      body.appendChild(node);
      node.style.display = 'block';
    }else{
      body.innerHTML = `<div style="color:rgba(233,236,255,.75);font:500 13px/1.5 system-ui,sans-serif">Not available.</div>`;
    }
    wrap.style.display = 'block';
    document.body.classList.add('px-sheet-open');
  }

  function closeSheet(){
    const wrap = qs('.px-sheet-wrap');
    if(!wrap) return;

    // move panels back into layout (hidden by CSS on mobile, but keeps DOM sane)
    const sheetBody = qs('#pxSheetBody');
    const movedPanels = qsa('.panel', sheetBody);
    if(movedPanels.length){
      const layout = qs('.layout');
      for(const p of movedPanels){
        layout && layout.insertBefore(p, layout.firstChild);
      }
    }
    wrap.style.display = 'none';
    document.body.classList.remove('px-sheet-open');
  }

  function ensureMobileBar(how, lb){
    if(qs('.px-mobilebar')) return;
    const topbar = qs('.topbar') || qs('header') || document.body.firstElementChild;
    const bar = document.createElement('div');
    bar.className = 'px-mobilebar';
    bar.innerHTML = `
      <button type="button" class="px-mobilebtn px-primary" data-px-open="how">HOW TO PLAY</button>
      <button type="button" class="px-mobilebtn" data-px-open="lb">LEADERBOARD</button>
    `;
    // insert after topbar
    if(topbar && topbar.parentNode){
      topbar.parentNode.insertBefore(bar, topbar.nextSibling);
    }else{
      document.body.insertBefore(bar, document.body.firstChild);
    }

    bar.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-px-open]');
      if(!btn) return;
      const which = btn.getAttribute('data-px-open');
      if(which === 'how') openSheet('HOW TO PLAY', how);
      if(which === 'lb') openSheet('LEADERBOARD', lb);
    });
  }

  function lockSwipe(){
    // Prevent page scroll on swipe over the game area
    const targets = qsa('canvas, iframe, .gamebox');
    for(const t of targets){
      t.addEventListener('touchmove', (e)=>{ e.preventDefault(); }, {passive:false});
    }
  }

  function ensureRotateOverlay(){
    if(qs('.px-rotate')) return;
    const rot = document.createElement('div');
    rot.className = 'px-rotate';
    rot.innerHTML = `
      <div class="box">
        <h2>ROTATE DEVICE</h2>
        <p>This game plays best in landscape. Rotate your phone, then continue.</p>
        <button class="px-mobilebtn px-primary" type="button" id="pxTryFullscreen">ENTER FULLSCREEN</button>
      </div>
    `;
    document.body.appendChild(rot);

    const fsBtn = qs('#pxTryFullscreen', rot);
    fsBtn.addEventListener('click', async ()=>{
      try{
        const el = qs('.gamebox') || document.documentElement;
        if(el.requestFullscreen) await el.requestFullscreen();
        // Orientation lock is best-effort; supported on some browsers after fullscreen
        if(screen.orientation && screen.orientation.lock){
          try{ await screen.orientation.lock('landscape'); }catch(_e){}
        }
      }catch(_e){}
    });
  }

  function applyMode(){
    const wantMobile = mq.matches;
    document.body.classList.toggle('px-mobile-play', wantMobile);

    if(wantMobile){
      const {how, lb} = findPanels();
      ensureMobileBar(how, lb);
      lockSwipe();

      const requireLandscape = (document.body.getAttribute('data-require-landscape') || '').toLowerCase() === 'true';
      if(requireLandscape){
        ensureRotateOverlay();
        const rot = qs('.px-rotate');
        rot.style.display = isPortrait() ? 'flex' : 'none';
      }else{
        const rot = qs('.px-rotate');
        if(rot) rot.style.display = 'none';
      }
    }else{
      closeSheet();
    }
  }

  mq.addEventListener ? mq.addEventListener('change', applyMode) : mq.addListener(applyMode);
  window.addEventListener('resize', applyMode);
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeSheet(); });

  // init
  window.addEventListener('DOMContentLoaded', applyMode);
})();
