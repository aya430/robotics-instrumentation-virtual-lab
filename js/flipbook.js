/* flipbook.js — page-turning viewer for the unit lecture slides.
   Pages are pre-rendered images: notes/unit-N/pNNN.webp (see RIL.notes in js/data/00-course.js).
   Features: unit tabs, page-turn animation, first/prev/next/last, page number and slider,
   thumbnails, zoom with panning, full screen, keyboard and swipe, deep links (#unit-2/p14). */
(function () {
  'use strict';
  const RIL = window.RIL;
  const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
  const pad = n => String(n).padStart(3, '0');

  RIL.flipbook = function (main) {
    const R = RIL.root, decks = RIL.notes || [];
    if (!decks.length) { main.innerHTML = '<p>No lecture slides configured.</p>'; return; }
    const src = (u, p) => `${R}notes/unit-${u}/p${pad(p)}.webp`;
    const st = { u: decks[0].n, p: 1, zoom: 1, busy: false, thumbs: false };
    const deck = () => decks.find(d => d.n === st.u);

    const fromHash = () => {
      const m = /unit-(\d+)(?:\/p(\d+))?/.exec(location.hash || '');
      if (m && decks.some(d => d.n === +m[1])) { st.u = +m[1]; st.p = Math.max(1, Math.min(deck().pages, +(m[2] || 1))); }
    };
    fromHash();

    main.innerHTML = `<div class="crumbs"><a href="${R}index.html">Home</a> / Lecture Slides</div>
      <header class="page-head"><h1>Lecture slides</h1>
        <p>Unit-wise slide decks of ${esc((window.RIL_CONFIG || {}).courseTitle || 'the course')}, presented as a flipbook. Click the right or left half of a page, swipe, or use the arrow keys to turn pages.</p>
        <p class="study-note" role="note"><b>For study purposes only.</b> These slides are provided to support learning in this course. Please do not copy, republish or redistribute them.</p></header>
      <div class="fb-tabs" role="tablist" aria-label="Unit">${decks.map(d => `<button role="tab" type="button" data-u="${d.n}"><b>Unit ${ROMAN[d.n] || d.n}</b><span>${esc(d.title.replace(/^Unit [IVX]+:\s*/, ''))}</span></button>`).join('')}</div>
      <div class="fb" tabindex="0" aria-label="Slide viewer">
        <div class="fb-stage"><div class="fb-book">
          <img class="fb-under" alt="" draggable="false">
          <div class="fb-leaf" aria-hidden="true"><div class="fb-face fb-front"><img alt="" draggable="false"></div><div class="fb-face fb-back"></div></div>
          <div class="fb-shade"></div>
          <button class="fb-hot prev" type="button" aria-label="Previous page"></button><button class="fb-hot next" type="button" aria-label="Next page"></button>
        </div></div>
        <div class="fb-bar">
          <div class="grp"><button type="button" data-a="first" title="First page (Home)" aria-label="First page">⏮</button><button type="button" data-a="prev" title="Previous page (←)" aria-label="Previous page">◀</button>
            <label class="pg"><span class="sr">Page</span><input type="number" min="1" value="1" aria-label="Page number"> <span class="of"></span></label>
            <button type="button" data-a="next" title="Next page (→)" aria-label="Next page">▶</button><button type="button" data-a="last" title="Last page (End)" aria-label="Last page">⏭</button></div>
          <input class="fb-range" type="range" min="1" value="1" aria-label="Go to page">
          <div class="grp"><button type="button" data-a="zout" title="Zoom out (−)" aria-label="Zoom out">−</button><span class="zv">100%</span><button type="button" data-a="zin" title="Zoom in (+)" aria-label="Zoom in">+</button>
            <button type="button" data-a="thumbs" title="Show all pages" aria-pressed="false">Pages</button><button type="button" data-a="fs" title="Full screen (F)">Full screen</button></div>
        </div>
        <div class="fb-thumbs" hidden></div>
      </div>`;

    const fb = main.querySelector('.fb'), stage = fb.querySelector('.fb-stage'), book = fb.querySelector('.fb-book');
    const under = fb.querySelector('.fb-under'), leaf = fb.querySelector('.fb-leaf'), front = leaf.querySelector('img'), shade = fb.querySelector('.fb-shade');
    const num = fb.querySelector('.pg input'), of = fb.querySelector('.of'), range = fb.querySelector('.fb-range'), zv = fb.querySelector('.zv'), thumbs = fb.querySelector('.fb-thumbs');
    fb.addEventListener('contextmenu', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });

    const cache = {};
    const preload = (u, p) => { if (p < 1 || p > deck().pages) return; const k = u + ':' + p; if (!cache[k]) { const im = new Image(); im.src = src(u, p); cache[k] = im; } };
    function sync() {
      const d = deck();
      under.src = src(st.u, st.p); under.alt = `Unit ${ROMAN[st.u]} slide page ${st.p} of ${d.pages}`;
      leaf.style.display = 'none';
      num.max = range.max = d.pages; num.value = range.value = st.p; of.textContent = '/ ' + d.pages;
      fb.querySelector('[data-a=first]').disabled = fb.querySelector('[data-a=prev]').disabled = st.p <= 1;
      fb.querySelector('[data-a=last]').disabled = fb.querySelector('[data-a=next]').disabled = st.p >= d.pages;
      main.querySelectorAll('.fb-tabs button').forEach(b => b.setAttribute('aria-selected', +b.dataset.u === st.u));
      thumbs.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.p === st.p));
      for (const k of [1, 2, -1]) preload(st.u, st.p + k);
      try { history.replaceState(null, '', `#unit-${st.u}/p${st.p}`); } catch (e) { }
    }
    function buildThumbs() {
      const d = deck();
      thumbs.innerHTML = Array.from({ length: d.pages }, (_, i) => `<button type="button" data-p="${i + 1}" aria-label="Page ${i + 1}"><img src="${src(d.n, i + 1)}" alt="" loading="lazy" draggable="false" width="160" height="90"><span>${i + 1}</span></button>`).join('');
    }
    function go(p, animate = true) {
      const d = deck(); p = Math.max(1, Math.min(d.pages, p | 0));
      if (p === st.p || st.busy) { sync(); return; }
      const fwd = p > st.p, old = st.p;
      if (!animate || reduce() || st.zoom > 1 || Math.abs(p - old) > 1) { st.p = p; sync(); return; }
      st.busy = true;
      // forward: current page lifts off and turns left, revealing the next page underneath
      // backward: previous page swings back in from the left over the current page
      front.src = src(st.u, fwd ? old : p);
      under.src = src(st.u, fwd ? p : old);
      leaf.style.display = 'block'; leaf.style.transition = 'none';
      leaf.style.transform = fwd ? 'rotateY(0deg)' : 'rotateY(-180deg)'; shade.style.opacity = fwd ? 0 : .35;
      void leaf.offsetWidth;
      leaf.style.transition = 'transform .65s cubic-bezier(.45,.05,.35,1)'; shade.style.transition = 'opacity .65s';
      leaf.style.transform = fwd ? 'rotateY(-180deg)' : 'rotateY(0deg)'; shade.style.opacity = fwd ? .35 : 0;
      const done = () => { leaf.removeEventListener('transitionend', done); clearTimeout(t); st.p = p; st.busy = false; shade.style.opacity = 0; sync(); };
      const t = setTimeout(done, 900); leaf.addEventListener('transitionend', done);
    }
    function setUnit(n, p = 1) { st.u = n; st.p = p; st.busy = false; if (st.thumbs) buildThumbs(); setZoom(1); sync(); }
    function setZoom(z) {
      st.zoom = Math.max(1, Math.min(3, Math.round(z * 4) / 4)); zv.textContent = Math.round(st.zoom * 100) + '%';
      book.style.width = st.zoom * 100 + '%'; stage.classList.toggle('zoomed', st.zoom > 1);
    }
    const act = {
      first: () => go(1, false), last: () => go(deck().pages, false), prev: () => go(st.p - 1), next: () => go(st.p + 1),
      zin: () => setZoom(st.zoom + .25), zout: () => setZoom(st.zoom - .25),
      thumbs: b => { st.thumbs = !st.thumbs; thumbs.hidden = !st.thumbs; b.setAttribute('aria-pressed', st.thumbs); if (st.thumbs) { buildThumbs(); sync(); const on = thumbs.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' }); } },
      fs: () => { if (document.fullscreenElement) document.exitFullscreen(); else if (fb.requestFullscreen) fb.requestFullscreen().catch(() => { }); }
    };
    fb.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => act[b.dataset.a](b)));
    fb.querySelector('.fb-hot.prev').addEventListener('click', act.prev);
    fb.querySelector('.fb-hot.next').addEventListener('click', act.next);
    num.addEventListener('change', () => go(+num.value, false));
    range.addEventListener('input', () => go(+range.value, false));
    thumbs.addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (b) go(+b.dataset.p, false); });
    main.querySelectorAll('.fb-tabs button').forEach(b => b.addEventListener('click', () => setUnit(+b.dataset.u)));
    fb.addEventListener('keydown', e => {
      if (e.target === num) return;
      const k = e.key;
      if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); act.next(); }
      else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); act.prev(); }
      else if (k === 'Home') { e.preventDefault(); act.first(); }
      else if (k === 'End') { e.preventDefault(); act.last(); }
      else if (k === '+' || k === '=') act.zin(); else if (k === '-') act.zout();
      else if (k === 'f' || k === 'F') act.fs();
    });
    // swipe (only when not zoomed, so panning still works)
    let sx = null, sy = 0;
    stage.addEventListener('pointerdown', e => { if (st.zoom === 1 && e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    stage.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? act.next : act.prev)(); });
    window.addEventListener('hashchange', () => { const u = st.u, p = st.p; fromHash(); if (u !== st.u) setUnit(st.u, st.p); else if (p !== st.p) go(st.p, false); });
    sync();
    if (location.hash) main.querySelector('.fb-tabs').scrollIntoView({ block: 'start' });
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
})();
