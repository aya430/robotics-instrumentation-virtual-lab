/* =====================================================================
   simulation-engine.js — reusable simulation panel framework
   A simulation is declared with RIL.defineSim({...}) and mounted into any
   element with RIL.mountSim(el, id). The engine supplies the standard
   toolbar (start/pause/resume, reset, step, speed, manual/auto, fullscreen,
   camera reset, record observation), parameter sliders with numeric
   inputs, live numerical readouts, Chart.js graphs, and the render loop.
   ===================================================================== */
(function () {
  'use strict';
  const RIL = window.RIL = window.RIL || {};
  const M = RIL.M;
  RIL.sims = RIL.sims || {};
  RIL.simOrder = RIL.simOrder || [];
  RIL.defineSim = function (def) {
    if (RIL.sims[def.id]) console.warn('duplicate sim', def.id);
    RIL.sims[def.id] = def; RIL.simOrder.push(def.id);
  };

  /* ---------- small DOM helpers ---------- */
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined) e.append(kid.nodeType ? kid : document.createTextNode(kid));
    return e;
  };
  RIL.h = h;
  RIL.ui = {
    matrix(A, digits = 3, label) {
      const rows = A.map(r => '<tr>' + r.map(v => `<td>${M.fmt(Math.abs(v) < 5e-12 ? 0 : v, digits)}</td>`).join('') + '</tr>').join('');
      return `<span class="mat-wrap">${label ? `<span class="ml">${label}</span>` : ''}<table class="mat">${rows}</table></span>`;
    },
    vec(v, digits = 3, label) { return RIL.ui.matrix(v.map(x => [x]), digits, label); },
    kv(rows, head) {
      return '<table class="kv">' + (head ? '<tr>' + head.map(x => `<th>${x}</th>`).join('') + '</tr>' : '') + rows.map(r => '<tr' + (r.hl ? ' class="hl"' : '') + '>' + (r.cells || r).map(c => `<td>${c}</td>`).join('') + '</tr>').join('') + '</table>';
    }
  };

  /* ---------- global animation loop ---------- */
  const active = new Set();
  let last = performance.now();
  function loop(now) {
    const dtReal = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    active.forEach(S => { if (S.visible) S._frame(dtReal); });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---------- chart wrapper ---------- */
  const PALETTE = ['#f2a516', '#4cc2ff', '#6fe39b', '#ff7b7b', '#c4a4ff', '#ffd07a', '#9fb3d1'];
  function makeChart(box, spec) {
    const canvas = h('canvas'); box.append(canvas);
    const datasets = spec.series.map((s, i) => ({
      label: s.label || s, data: [], borderColor: s.color || PALETTE[i % PALETTE.length], backgroundColor: s.color || PALETTE[i % PALETTE.length],
      borderWidth: s.width || 1.6, pointRadius: s.points ? 2.5 : 0, showLine: s.line !== false, stepped: s.stepped || false, borderDash: s.dash || [], tension: 0, fill: false
    }));
    const opt = {
      animation: false, responsive: true, maintainAspectRatio: false, parsing: false, normalized: true,
      plugins: { legend: { display: spec.series.length > 1 || !!spec.legend, labels: { color: '#c9d6ec', boxWidth: 10, font: { size: 10 } } }, tooltip: { enabled: true } },
      scales: {
        x: { type: spec.xType || 'linear', title: { display: !!spec.x, text: spec.x, color: '#8fa3c4', font: { size: 10 } }, ticks: { color: '#8fa3c4', font: { size: 10 }, maxTicksLimit: 7 }, grid: { color: 'rgba(143,163,196,.12)' } },
        y: { type: spec.yType || 'linear', title: { display: !!spec.y, text: spec.y, color: '#8fa3c4', font: { size: 10 } }, ticks: { color: '#8fa3c4', font: { size: 10 }, maxTicksLimit: 6 }, grid: { color: 'rgba(143,163,196,.12)' } }
      }
    };
    if (spec.xmin !== undefined) opt.scales.x.min = spec.xmin; if (spec.xmax !== undefined) opt.scales.x.max = spec.xmax;
    if (spec.ymin !== undefined) opt.scales.y.min = spec.ymin; if (spec.ymax !== undefined) opt.scales.y.max = spec.ymax;
    let chart = null;
    if (window.Chart) chart = new window.Chart(canvas, { type: 'scatter', data: { datasets }, options: opt });
    const win = spec.window || 600;
    let dirty = false, lastUpd = 0;
    const api = {
      chart,
      push(x, ys) { if (!chart) return; ys.forEach((y, i) => { const d = chart.data.datasets[i].data; d.push({ x, y }); if (d.length > win) d.shift(); }); dirty = true; },
      set(i, pts) { if (!chart) return; chart.data.datasets[i].data = pts.map(p => Array.isArray(p) ? { x: p[0], y: p[1] } : p); dirty = true; },
      setAll(arr) { arr.forEach((pts, i) => api.set(i, pts)); },
      clear() { if (!chart) return; chart.data.datasets.forEach(d => (d.data = [])); dirty = true; api.flush(true); },
      range(axis, min, max) { if (!chart) return; const s = chart.options.scales[axis]; s.min = min; s.max = max; dirty = true; },
      label(i, text) { if (chart) { chart.data.datasets[i].label = text; dirty = true; } },
      flush(force) { const now = performance.now(); if (chart && dirty && (force || now - lastUpd > 90)) { chart.update('none'); dirty = false; lastUpd = now; } },
      data(i) { return chart ? chart.data.datasets[i].data : []; }
    };
    return api;
  }

  /* ---------- mount ---------- */
  RIL.mountSim = function (host, id, opts = {}) {
    const def = RIL.sims[id];
    if (!def) { host.append(h('div', { class: 'callout' }, 'Simulation "' + id + '" is not available.')); return null; }
    const root = RIL.root || '';
    const S = { def, id, t: 0, running: def.autostart !== false, speed: 1, auto: def.autoDefault ?? !!def.auto, p: {}, visible: true, frameCount: 0, obs: [] };
    const el = h('div', { class: 'sim', id: 'sim-' + id + (opts.suffix || ''), 'data-sim': id });
    S.el = el;
    const kindLbl = def.kind === '3d' ? '3D · Three.js' : def.kind === 'html' ? 'Interactive' : '2D · Canvas';
    const head = h('div', { class: 'sim-head' }, h('h3', {}, def.title), h('span', { class: 'kind' }, kindLbl));
    if (!opts.standalone && def.category) head.append(h('a', { class: 'open', href: root + 'simulations/' + def.category + '/' + id + '.html' }, 'Open full page'));
    el.append(head);

    /* toolbar */
    const tb = h('div', { class: 'sim-toolbar', role: 'toolbar', 'aria-label': 'Simulation controls' });
    const bRun = h('button', { class: 'primary', type: 'button', 'data-act': 'run' });
    const setRunLbl = () => { bRun.textContent = S.running ? 'Pause' : (S.t > 0 ? 'Resume' : 'Start'); bRun.setAttribute('aria-pressed', S.running); };
    bRun.onclick = () => { S.running = !S.running; setRunLbl(); };
    const bReset = h('button', { type: 'button', 'data-act': 'reset', onclick: () => S.reset() }, 'Reset');
    const bStep = h('button', { type: 'button', 'data-act': 'step', title: 'Advance one time step', onclick: () => { S.running = false; setRunLbl(); for (let i = 0; i < (def.stepFrames || 1); i++) S._advance(def.stepDt || 1 / 60); S._render(); } }, 'Step');
    const sSpeed = h('select', { 'aria-label': 'Simulation speed', 'data-act': 'speed' }, ...[0.1, 0.25, 0.5, 1, 2, 4].map(v => h('option', { value: v, selected: v === 1 }, v + '×')));
    sSpeed.onchange = () => (S.speed = +sSpeed.value);
    tb.append(bRun, bReset, bStep, h('label', {}, 'Speed', sSpeed));
    if (def.auto) {
      const seg = h('span', { class: 'seg', role: 'group', 'aria-label': 'Operating mode' });
      const bm = h('button', { type: 'button', 'data-act': 'manual' }, 'Manual'), ba = h('button', { type: 'button', 'data-act': 'auto' }, 'Automatic');
      const upd = () => { bm.setAttribute('aria-pressed', !S.auto); ba.setAttribute('aria-pressed', S.auto); };
      bm.onclick = () => { S.auto = false; upd(); def.onMode && def.onMode(S, false); };
      ba.onclick = () => { S.auto = true; upd(); def.onMode && def.onMode(S, true); };
      seg.append(bm, ba); upd(); tb.append(h('span', { class: 'sep' }), seg);
    }
    tb.append(h('span', { class: 'sep' }));
    if (def.kind === '3d') tb.append(h('button', { type: 'button', 'data-act': 'camera', onclick: () => S.three && S.three.resetCamera() }, 'Reset camera'));
    tb.append(h('button', { type: 'button', 'data-act': 'record', title: 'Add current values to the observation table', onclick: () => S.record() }, 'Record'));
    tb.append(h('button', {
      type: 'button', 'data-act': 'fullscreen', onclick: () => {
        if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen();
      }
    }, 'Full screen'));
    el.append(tb);

    /* body */
    const body = h('div', { class: 'sim-body' });
    const stage = h('div', { class: 'sim-stage' });
    if (def.stageHeight) stage.style.minHeight = def.stageHeight + 'px';
    const side = h('div', { class: 'sim-side' });
    body.append(stage, side); el.append(body);
    S.stage = stage;

    /* controls */
    S.inputs = {};
    const ctlBox = h('div', {});
    if (def.controls && def.controls.length) side.append(h('h5', {}, 'Parameters'), ctlBox);
    const fire = (cid, v) => { def.onControl && def.onControl(S, cid, v); if (!S.running || def.redrawOnControl) S._render(); };
    (def.controls || []).forEach(c => {
      if (c.type === 'select') {
        const sel = h('select', { id: `${id}-${c.id}${opts.suffix || ''}`, 'data-ctl': c.id }, ...c.options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: String(v) === String(c.value) }, l); }));
        S.p[c.id] = c.value;
        sel.onchange = () => { S.p[c.id] = isNaN(+sel.value) || c.string ? sel.value : +sel.value; fire(c.id, S.p[c.id]); };
        ctlBox.append(h('div', { class: 'ctl sel' }, h('label', { for: sel.id }, c.label), sel));
        S.inputs[c.id] = { set: v => { sel.value = v; S.p[c.id] = isNaN(+v) || c.string ? v : +v; }, el: sel };
      } else if (c.type === 'toggle') {
        const cb = h('input', { type: 'checkbox', id: `${id}-${c.id}${opts.suffix || ''}`, 'data-ctl': c.id, checked: !!c.value });
        S.p[c.id] = !!c.value;
        cb.onchange = () => { S.p[c.id] = cb.checked; fire(c.id, cb.checked); };
        ctlBox.append(h('div', { class: 'ctl tog' }, cb, h('label', { for: cb.id }, c.label)));
        S.inputs[c.id] = { set: v => { cb.checked = !!v; S.p[c.id] = !!v; }, el: cb };
      } else if (c.type === 'buttons') {
        const box = h('div', { class: 'ctl-btns' });
        c.buttons.forEach(b => box.append(h('button', { type: 'button', 'data-btn': b.id, onclick: () => { def.onButton && def.onButton(S, b.id); S._render(); } }, b.label)));
        ctlBox.append(c.label ? h('div', { class: 'ctl sel' }, h('label', {}, c.label), box) : box);
      } else if (c.type === 'text') {
        const inp = h('input', { class: 'ctl-text', type: 'text', id: `${id}-${c.id}${opts.suffix || ''}`, value: c.value, 'data-ctl': c.id });
        S.p[c.id] = c.value; inp.onchange = () => { S.p[c.id] = inp.value; fire(c.id, inp.value); };
        ctlBox.append(h('div', { class: 'ctl sel' }, h('label', { for: inp.id }, c.label), inp));
        S.inputs[c.id] = { set: v => { inp.value = v; S.p[c.id] = v; }, el: inp };
      } else {
        const rid = `${id}-${c.id}${opts.suffix || ''}`;
        const r = h('input', { type: 'range', id: rid, min: c.min, max: c.max, step: c.step ?? 'any', value: c.value, 'data-ctl': c.id, 'aria-label': c.label });
        const n = h('input', { type: 'number', min: c.min, max: c.max, step: c.step ?? 'any', value: c.value, 'aria-label': c.label + ' value' });
        S.p[c.id] = +c.value;
        r.oninput = () => { S.p[c.id] = +r.value; n.value = r.value; fire(c.id, +r.value); };
        n.onchange = () => { let v = +n.value; if (isNaN(v)) v = +c.value; v = M.clamp(v, +c.min, +c.max); n.value = v; r.value = v; S.p[c.id] = v; fire(c.id, v); };
        ctlBox.append(h('div', { class: 'ctl' }, h('label', { for: rid }, h('span', {}, c.label), h('span', { class: 'u' }, c.unit || '')), r, n));
        S.inputs[c.id] = { set: v => { r.value = v; n.value = +(+v).toFixed(6); S.p[c.id] = +v; }, el: r };
      }
    });
    S.setParam = (cid, v, silent) => { if (S.inputs[cid]) S.inputs[cid].set(v); else S.p[cid] = v; if (!silent) fire(cid, v); };

    /* readouts */
    S.ro = {};
    if (def.readouts && def.readouts.length) {
      const rb = h('div', { class: 'readouts', 'aria-live': 'off' });
      def.readouts.forEach(r => { const b = h('b', { 'data-ro': r.id }, '—'); S.ro[r.id] = { el: b, spec: r }; rb.append(h('div', { class: 'ro' }, h('span', { html: r.label + (r.unit ? ` (${r.unit})` : '') }), b)); });
      side.append(h('h5', {}, 'Real-time results'), rb);
    }
    S.val = {};
    S.set = (rid, v, cls) => {
      const r = S.ro[rid]; S.val[rid] = v; if (!r) return;
      const txt = typeof v === 'number' ? (Number.isInteger(v) && Math.abs(v) < 1e7 && r.spec.digits === undefined ? String(v).replace('-', '−') : M.fmt(v, r.spec.digits ?? 3)) : String(v);
      if (r.el.textContent !== txt) r.el.textContent = txt;
      r.el.className = cls || '';
    };

    /* lower area: charts + custom panels */
    S.charts = {}; S.panels = {};
    const lower = h('div', { class: 'sim-lower' });
    (def.panels || []).forEach(pn => { const box = h('div', { class: 'sim-panel-box' }, h('h5', {}, pn.title)); const content = h('div', {}); box.append(content); if (pn.wide) box.style.gridColumn = '1 / -1'; lower.append(box); S.panels[pn.id] = content; });
    (def.charts || []).forEach(cs => { const box = h('div', { class: 'sim-chart' }, h('h5', {}, cs.title)); const cb = h('div', { class: 'cbox' }); if (cs.height) cb.style.height = cs.height + 'px'; box.append(cb); if (cs.wide) box.style.gridColumn = '1 / -1'; lower.append(box); S.charts[cs.id] = makeChart(cb, cs); });
    if (lower.children.length) el.append(lower);
    S.panel = pid => S.panels[pid];
    S.chart = cid => S.charts[cid];

    /* model equations (static, typeset with MathJax) */
    if (def.equations && def.equations.length) {
      const mbox = h('div', { class: 'sim-model' }, h('h5', {}, 'Mathematical model used by this simulation'));
      const eqs = h('div', { class: 'eqs' }); def.equations.forEach(e => eqs.append(h('div', {}, '\\(' + e + '\\)'))); mbox.append(eqs); el.append(mbox);
    }
    /* observation table */
    const obsWrap = h('div', { class: 'obs-wrap', hidden: true });
    const obsTbl = h('div', {});
    const obsBtns = h('div', { class: 'ctl-btns' },
      h('button', { type: 'button', onclick: () => S.downloadObs() }, 'Download CSV'),
      h('button', { type: 'button', onclick: () => { S.obs = []; S._drawObs(); } }, 'Clear table'));
    obsWrap.append(h('h5', {}, 'Observation table'), obsTbl, obsBtns); el.append(obsWrap);
    const status = h('div', { class: 'sim-status' }, h('span', { 'data-status': '' }, def.note || ''), h('span', { 'data-time': '' }, ''));
    el.append(status);
    S.note = txt => { status.firstChild.textContent = txt; };
    S.obsColumns = () => {
      const pc = (def.controls || []).filter(c => !c.type || c.type === 'range' || c.type === 'select').map(c => ({ key: 'p:' + c.id, label: c.label + (c.unit ? ` (${c.unit})` : '') }));
      const rc = (def.readouts || []).map(r => ({ key: 'r:' + r.id, label: r.label.replace(/<[^>]+>/g, '') + (r.unit ? ` (${r.unit})` : '') }));
      return (def.obsColumns ? def.obsColumns(S) : pc.concat(rc));
    };
    S.record = () => {
      const cols = S.obsColumns(); const row = {};
      cols.forEach(c => {
        const [k, n] = c.key.split(':'); let v = k === 'p' ? S.p[n] : S.val[n];
        if (typeof v === 'number') v = +M.fmt(v, 4).replace('−', '-'); row[c.key] = v;
      });
      S.obs.push(row); S._drawObs();
      el.dispatchEvent(new CustomEvent('ril-record', { detail: { row, cols } }));
    };
    S._drawObs = () => {
      obsWrap.hidden = S.obs.length === 0; const cols = S.obsColumns();
      obsTbl.innerHTML = '<div class="table-scroll">' + RIL.ui.kv(S.obs.map((r, i) => [i + 1].concat(cols.map(c => r[c.key] ?? '—'))), ['#'].concat(cols.map(c => c.label))) + '</div>';
    };
    S.downloadObs = () => {
      const cols = S.obsColumns(); const lines = [['#'].concat(cols.map(c => '"' + c.label + '"')).join(',')];
      S.obs.forEach((r, i) => lines.push([i + 1].concat(cols.map(c => r[c.key])).join(',')));
      const a = h('a', { href: URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })), download: id + '-observations.csv' }); document.body.append(a); a.click(); a.remove();
    };

    host.append(el);

    /* stage: canvas 2D or three.js */
    if (def.kind === '3d') {
      S.three = RIL.three ? RIL.three.create(stage, def.camera || {}) : null;
    } else if (def.kind !== 'html') {
      const cv = h('canvas', { role: 'img', 'aria-label': def.title + ' animation' });
      stage.append(cv); S.canvas = cv; S.ctx = cv.getContext('2d');
    }
    S.resize = () => {
      const r = stage.getBoundingClientRect(); const w = Math.max(50, r.width), hh = Math.max(50, r.height);
      S.W = w; S.H = hh;
      if (S.canvas) { const dpr = Math.min(2, window.devicePixelRatio || 1); S.canvas.width = Math.round(w * dpr); S.canvas.height = Math.round(hh * dpr); S.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
      if (S.three) S.three.resize(w, hh);
      def.onResize && def.onResize(S);
      S._render();
    };
    S.overlay = (txt) => { if (!S._ov) { S._ov = h('div', { class: 'overlay-note' }); stage.append(S._ov); } S._ov.textContent = txt; S._ov.hidden = !txt; };

    /* pointer helper for 2D stages: S.onPointer(fn(type,x,y,e)) */
    S.pointer = { down: false, x: 0, y: 0 };
    stage.addEventListener('pointerdown', e => { const r = stage.getBoundingClientRect(); S.pointer = { down: true, x: e.clientX - r.left, y: e.clientY - r.top }; def.onPointer && def.onPointer(S, 'down', S.pointer.x, S.pointer.y, e); if (!S.running) S._render(); });
    stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); S.pointer.x = e.clientX - r.left; S.pointer.y = e.clientY - r.top; def.onPointer && def.onPointer(S, S.pointer.down ? 'drag' : 'move', S.pointer.x, S.pointer.y, e); if (!S.running && S.pointer.down) S._render(); });
    window.addEventListener('pointerup', () => { if (S.pointer.down) { S.pointer.down = false; def.onPointer && def.onPointer(S, 'up', S.pointer.x, S.pointer.y); } });

    /* lifecycle */
    const timeEl = status.lastChild;
    S._advance = dt => { const h0 = dt * S.speed; const sub = def.substeps || 1; for (let i = 0; i < sub; i++) { def.step && def.step(S, h0 / sub); S.t += h0 / sub; } };
    S._render = () => { if (def.draw) def.draw(S); if (S.three) S.three.render(); Object.values(S.charts).forEach(c => c.flush()); timeEl.textContent = def.showTime === false ? '' : 't = ' + S.t.toFixed(2) + ' s'; };
    S._frame = dt => { if (S.running) S._advance(dt); S._render(); S.frameCount++; };
    S.reset = () => { S.t = 0; Object.values(S.charts).forEach(c => c.clear()); def.reset && def.reset(S); setRunLbl(); S._render(); };
    S.pause = () => { S.running = false; setRunLbl(); };
    S.play = () => { S.running = true; setRunLbl(); };

    def.setup && def.setup(S);
    def.reset && def.reset(S);
    setRunLbl();
    S.resize();
    if (window.ResizeObserver) new ResizeObserver(() => S.resize()).observe(stage);
    if (window.IntersectionObserver) new IntersectionObserver(es => es.forEach(en => (S.visible = en.isIntersecting))).observe(el);
    document.addEventListener('fullscreenchange', () => setTimeout(S.resize, 50));
    active.add(S);
    RIL.mounted = RIL.mounted || []; RIL.mounted.push(S);
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([el]).catch(() => { });
    return S;
  };

  /* ---------- 2D drawing helpers shared by canvas simulations ---------- */
  RIL.draw = {
    clear(S, bg) { const g = S.ctx; g.clearRect(0, 0, S.W, S.H); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, S.W, S.H); } },
    grid(S, step = 40, color = 'rgba(143,163,196,.08)') { const g = S.ctx; g.strokeStyle = color; g.lineWidth = 1; g.beginPath(); for (let x = 0; x < S.W; x += step) { g.moveTo(x + .5, 0); g.lineTo(x + .5, S.H); } for (let y = 0; y < S.H; y += step) { g.moveTo(0, y + .5); g.lineTo(S.W, y + .5); } g.stroke(); },
    text(S, txt, x, y, o = {}) { const g = S.ctx; g.font = `${o.weight || 500} ${o.size || 12}px Archivo, system-ui, sans-serif`; g.fillStyle = o.color || '#dbe5f5'; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic'; g.fillText(txt, x, y); },
    line(S, x1, y1, x2, y2, color = '#dbe5f5', w = 2, dash) { const g = S.ctx; g.strokeStyle = color; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]); },
    arrow(S, x1, y1, x2, y2, color = '#f2a516', w = 2, head = 9) {
      const g = S.ctx, a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1); if (L < 1) return;
      g.strokeStyle = color; g.fillStyle = color; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2 - Math.cos(a) * head * .6, y2 - Math.sin(a) * head * .6); g.stroke();
      g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - head * Math.cos(a - .4), y2 - head * Math.sin(a - .4)); g.lineTo(x2 - head * Math.cos(a + .4), y2 - head * Math.sin(a + .4)); g.closePath(); g.fill();
    },
    circle(S, x, y, r, fill, stroke, w = 2) { const g = S.ctx; g.beginPath(); g.arc(x, y, Math.max(0, r), 0, 2 * Math.PI); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = w; g.stroke(); } },
    rect(S, x, y, w, hh, fill, stroke, lw = 1.5, r = 0) { const g = S.ctx; g.beginPath(); if (r && g.roundRect) g.roundRect(x, y, w, hh, r); else g.rect(x, y, w, hh); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } },
    poly(S, pts, fill, stroke, w = 2, close = true) { const g = S.ctx; if (!pts.length) return; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); if (close) g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = w; g.stroke(); } },
    /** link drawn as rounded bar between two points */
    link(S, x1, y1, x2, y2, w = 14, fill = '#6f86ad', stroke = '#c9d6ec') { const g = S.ctx; g.lineCap = 'round'; g.strokeStyle = stroke; g.lineWidth = w + 3; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.strokeStyle = fill; g.lineWidth = w; g.stroke(); g.lineCap = 'butt'; },
    joint(S, x, y, r = 9) { RIL.draw.circle(S, x, y, r, '#0e1d38', '#f2a516', 2.5); RIL.draw.circle(S, x, y, 2.5, '#f2a516'); },
    frame2(S, x, y, ang, len = 34, label) { const c = Math.cos(ang), s = Math.sin(ang); RIL.draw.arrow(S, x, y, x + c * len, y - s * len, '#e5484d', 2, 7); RIL.draw.arrow(S, x, y, x - s * len, y - c * len, '#30a46c', 2, 7); if (label) RIL.draw.text(S, label, x + 6, y + 14, { size: 11, color: '#8fa3c4' }); },
    /** axes mapping world (metres) to screen; returns {X,Y,s,ox,oy} */
    view(S, cx, cy, scale) { return { s: scale, X: x => cx + x * scale, Y: y => cy - y * scale, inv: (px, py) => [(px - cx) / scale, (cy - py) / scale] }; },
    /** miniature waveform/trace inside the canvas */
    trace(S, data, x, y, w, hh, color = '#4cc2ff', ymin, ymax, label) {
      const g = S.ctx; RIL.draw.rect(S, x, y, w, hh, 'rgba(6,14,32,.75)', 'rgba(143,163,196,.3)', 1, 4);
      if (label) RIL.draw.text(S, label, x + 6, y + 13, { size: 10, color: '#8fa3c4' });
      if (data.length < 2) return; const lo = ymin ?? Math.min(...data), hi = ymax ?? Math.max(...data); const rg = hi - lo || 1;
      g.strokeStyle = color; g.lineWidth = 1.6; g.beginPath();
      data.forEach((v, i) => { const px = x + 4 + (w - 8) * i / (data.length - 1), py = y + hh - 4 - (hh - 20) * (v - lo) / rg; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke();
    },
    spring(S, x1, y1, x2, y2, coils = 8, amp = 8, color = '#c9d6ec') {
      const g = S.ctx, L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1); g.save(); g.translate(x1, y1); g.rotate(a); g.strokeStyle = color; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); const n = coils * 2; for (let i = 1; i < n; i++) g.lineTo(L * (0.1 + 0.8 * i / n), (i % 2 ? amp : -amp)); g.lineTo(L, 0); g.stroke(); g.restore();
    }
  };
})();
