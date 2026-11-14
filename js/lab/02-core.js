/* =====================================================================
   lab core (RIL.LK): storage, light 3D viewport, twin robot renderer,
   light-theme charts, export helpers. Browser only.
   ===================================================================== */
(function () {
  'use strict';
  const RIL = window.RIL = window.RIL || {}; const M = RIL.M, RM = RIL.RM; const T3 = window.THREE;
  const LK = RIL.LK = {};
  const esc = LK.esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = LK.$ = (sel, el = document) => el.querySelector(sel);
  LK.$$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  LK.deg = v => v * 180 / Math.PI; LK.rad = v => v * Math.PI / 180;
  LK.f = (v, d = 3) => (v === null || v === undefined || !Number.isFinite(+v)) ? '—' : (Math.abs(+v) < 5e-10 ? 0 : +v).toFixed(d);
  LK.typeset = el => { if (window.MathJax && MathJax.typesetPromise) return MathJax.typesetPromise(el ? [el] : undefined).catch(() => { }); return Promise.resolve(); };
  LK.today = () => new Date().toISOString().slice(0, 10);

  /* ---------- storage (localStorage, JSON) ---------- */
  const store = LK.store = {
    get(k, d) { try { const v = localStorage.getItem('ril:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ril:' + k, JSON.stringify(v)); return true; } catch (e) { console.warn('storage full or blocked', e); return false; } },
    del(k) { try { localStorage.removeItem('ril:' + k); } catch (e) { } },
    keys(prefix = '') { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('ril:' + prefix)) out.push(k.slice(4)); } } catch (e) { } return out; }
  };
  LK.student = () => store.get('student', { name: '', id: '', semester: '', dept: '' });
  LK.labState = id => Object.assign({ mcq: null, attempts: [], obs: {}, nb: {}, done: false, shots: {} }, store.get('lab:' + id, {}));
  LK.saveLab = (id, st) => store.set('lab:' + id, st);
  /* shared digital twin */
  LK.twin = {
    load() { const r = store.get('robot', null); return r && r.joints ? r : RM.template('sixR'); },
    exists() { return !!store.get('robot', null); },
    save(r) { store.set('robot', r); },
    library() { return store.get('robots', []); },
    saveAs(r) { const lib = store.get('robots', []).filter(x => x.name !== r.name); lib.unshift(JSON.parse(JSON.stringify(r))); store.set('robots', lib.slice(0, 12)); }
  };
  /* recorded simulation runs (for analytics and reports) */
  LK.runs = {
    all() { return store.get('runs', []); },
    add(run) { const a = store.get('runs', []); a.unshift(run); while (a.length > 8) a.pop(); if (!store.set('runs', a)) { a.splice(3); store.set('runs', a); } },
    remove(id) { store.set('runs', store.get('runs', []).filter(r => r.id !== id)); }
  };

  /* ---------- downloads ---------- */
  LK.download = (name, data, type = 'text/plain') => { const blob = data instanceof Blob ? data : new Blob([data], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  LK.csv = (cols, rows) => [cols.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')].concat(rows.map(r => r.map(v => typeof v === 'number' ? (Number.isFinite(v) ? +v.toPrecision(7) : '') : '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','))).join('\n');
  LK.downloadDataUrl = (name, url) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); };
  LK.toast = (msg, kind = '') => { let t = $('#lk-toast'); if (!t) { t = document.createElement('div'); t.id = 'lk-toast'; t.setAttribute('role', 'status'); document.body.append(t); } t.textContent = msg; t.className = 'show ' + kind; clearTimeout(t._h); t._h = setTimeout(() => (t.className = ''), 2600); };

  /* matrix -> HTML / TeX */
  LK.mat = (A, d = 3, label) => `<span class="lmat">${label ? `<span class="ml">${label}</span>` : ''}<table>${A.map(r => '<tr>' + r.map(v => `<td>${LK.f(v, d)}</td>`).join('') + '</tr>').join('')}</table></span>`;
  LK.vec = (v, d = 3, label) => LK.mat(v.map(x => [x]), d, label);

  /* TeX -> PNG data URL (for PDF reports). Inlines the glyph paths MathJax keeps in its global cache. */
  LK.texImage = async (tex, scale = 3) => {
    if (!(window.MathJax && MathJax.tex2svgPromise)) return null;
    try {
      const node = await MathJax.tex2svgPromise(tex, { display: true }); const svg = node.querySelector('svg').cloneNode(true);
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs'); const seen = new Set();
      svg.querySelectorAll('use').forEach(u => { const id = (u.getAttribute('xlink:href') || u.getAttribute('href') || '').slice(1); if (!id || seen.has(id)) return; seen.add(id); const src = document.getElementById(id); if (src) defs.append(src.cloneNode(true)); });
      svg.prepend(defs); svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      const ex = 8; const w = parseFloat(svg.getAttribute('width')) * ex, hh = parseFloat(svg.getAttribute('height')) * ex;
      svg.setAttribute('width', w + 'px'); svg.setAttribute('height', hh + 'px'); svg.style.color = '#111';
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
      const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const c = document.createElement('canvas'); c.width = Math.ceil(w * scale); c.height = Math.ceil(hh * scale); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      return { url: c.toDataURL('image/png'), w, h: hh };
    } catch (e) { return null; }
  };

  /* ---------- light-theme chart (Chart.js) ---------- */
  const PAL = LK.PAL = ['#1f6feb', '#e5484d', '#1a7f37', '#b35900', '#8250df', '#0a7ea4', '#57606a', '#bf3989'];
  LK.chart = (host, spec) => {
    const box = document.createElement('div'); box.className = 'lchart'; box.innerHTML = `<div class="lchart-h"><b>${esc(spec.title || '')}</b><span><button type="button" class="tbtn" data-a="png" title="Download this graph as PNG">PNG</button></span></div><div class="lchart-c"><canvas></canvas></div>`; host.append(box);
    if (spec.height) $('.lchart-c', box).style.height = spec.height + 'px';
    const mk = (s, i) => ({ label: s.label || s, data: [], borderColor: s.color || PAL[i % PAL.length], backgroundColor: s.color || PAL[i % PAL.length], borderWidth: 1.6, pointRadius: s.points ? 2.5 : 0, showLine: s.line !== false, borderDash: s.dash || [], tension: 0, fill: false });
    const ch = new Chart($('canvas', box), {
      type: 'scatter', data: { datasets: (spec.series || []).map(mk) },
      options: {
        animation: false, responsive: true, maintainAspectRatio: false, parsing: false, normalized: true,
        interaction: { mode: 'nearest', intersect: false },
        plugins: { legend: { display: (spec.series || []).length > 1 || spec.legend, labels: { boxWidth: 12, boxHeight: 2, color: '#24292f', font: { size: 11 } } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: (${(+c.parsed.x).toPrecision(4)}, ${(+c.parsed.y).toPrecision(4)})` } } },
        scales: { x: { type: spec.xType || 'linear', title: { display: !!spec.x, text: spec.x, color: '#57606a', font: { size: 11 } }, grid: { color: '#e6e9ee' }, ticks: { color: '#57606a', font: { size: 10 }, maxTicksLimit: 9 } }, y: { title: { display: !!spec.y, text: spec.y, color: '#57606a', font: { size: 11 } }, grid: { color: '#e6e9ee' }, ticks: { color: '#57606a', font: { size: 10 } }, min: spec.yMin, max: spec.yMax } }
      }
    });
    let dirty = false; const win = spec.window;
    const api = {
      chart: ch, box, spec,
      push(x, ys) { ys.forEach((y, i) => { const d = ch.data.datasets[i]; if (!d || y === null || y === undefined || !Number.isFinite(y)) return; d.data.push({ x, y }); if (win && d.data.length > win) d.data.shift(); }); dirty = true; },
      set(i, pts) { if (!ch.data.datasets[i]) return; ch.data.datasets[i].data = pts.map(p => Array.isArray(p) ? { x: p[0], y: p[1] } : p); dirty = true; },
      series(list) { ch.data.datasets = list.map(mk); ch.options.plugins.legend.display = list.length > 1; dirty = true; },
      axes(x, y) { ch.options.scales.x.title.text = x; ch.options.scales.x.title.display = !!x; ch.options.scales.y.title.text = y; ch.options.scales.y.title.display = !!y; dirty = true; },
      clear() { ch.data.datasets.forEach(d => (d.data = [])); dirty = true; },
      flush() { if (dirty) { ch.update('none'); dirty = false; } },
      png() { const c = ch.canvas; const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const g = o.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, o.width, o.height); g.drawImage(c, 0, 0); return o.toDataURL('image/png'); },
      empty() { return ch.data.datasets.every(d => !d.data.length); }
    };
    $('[data-a=png]', box).onclick = () => { api.flush(); LK.downloadDataUrl((spec.title || 'graph').replace(/[^\w]+/g, '_') + '.png', api.png()); };
    return api;
  };

  if (!T3) return;
  /* ---------- light engineering viewport (Z up) ---------- */
  const mkMat = LK.material = (color, metal = 0.2, rough = 0.5, extra) => new T3.MeshStandardMaterial(Object.assign({ color, metalness: metal, roughness: rough }, extra || {}));
  LK.view = (stage, o = {}) => {
    stage.classList.add('lview');
    const renderer = new T3.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T3.PCFSoftShadowMap; 
    stage.append(renderer.domElement);
    const scene = new T3.Scene(); scene.background = new T3.Color(o.background || 0xeef1f5);
    /* procedural studio environment so metals reflect something */
    try {
      const es = new T3.Scene(); es.background = new T3.Color(0x9aa4b0);
      const pan = (x, y, z, w, h, c) => { const m = new T3.Mesh(new T3.PlaneGeometry(w, h), new T3.MeshBasicMaterial({ color: c, side: T3.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
      pan(0, 6, 0, 8, 8, 0xffffff); pan(6, 2, 3, 5, 4, 0xffffff); pan(-6, 1, -2, 5, 3, 0xbcc7d6); pan(0, -6, 0, 10, 10, 0x8d97a5); pan(2, 1, -7, 6, 3, 0xf2f6fb);
      const pm = new T3.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.04).texture; pm.dispose();
    } catch (e) { }
    const pos = o.position || [2.3, -2.5, 1.9], tgt = o.target || [0, 0, 0.5];
    const persp = new T3.PerspectiveCamera(o.fov || 40, 1, 0.02, 200); persp.up.set(0, 0, 1); persp.position.set(...pos);
    const ortho = new T3.OrthographicCamera(-1, 1, 1, -1, -50, 200); ortho.up.set(0, 0, 1);
    let camera = persp, W = 100, H = 100;
    const controls = new T3.OrbitControls(camera, renderer.domElement); controls.target.set(...tgt); controls.enableDamping = true; controls.dampingFactor = 0.14; controls.update();
    scene.add(new T3.HemisphereLight(0xffffff, 0xb8c0cc, 0.45));
    const sun = new T3.DirectionalLight(0xffffff, 0.75); sun.position.set(2.5, -3, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -3.2, right: 3.2, top: 3.2, bottom: -3.2, near: 0.5, far: 20 }); sun.shadow.bias = -0.0004; scene.add(sun);
    const fill = new T3.DirectionalLight(0xdbe7ff, 0.3); fill.position.set(-3, 3, 2); scene.add(fill);
    const floor = new T3.Mesh(new T3.PlaneGeometry(40, 40), new T3.ShadowMaterial({ opacity: 0.16 })); floor.receiveShadow = true; floor.position.z = o.floorZ || 0; scene.add(floor);
    const grid = new T3.GridHelper(o.gridSize || 4, o.gridDiv || 20, 0xb6c0cc, 0xdde2e8); grid.rotation.x = Math.PI / 2; grid.position.z = (o.floorZ || 0) + 0.0008; scene.add(grid);
    const worldFrame = RIL.three.frame(0.3); worldFrame.position.z = (o.floorZ || 0) + 0.001; scene.add(worldFrame);
    const labelLayer = document.createElement('div'); labelLayer.className = 'lview-labels'; stage.append(labelLayer); const labels = [];
    const api = {
      scene, renderer, controls, stage, grid, worldFrame, sun, T3,
      get camera() { return camera; },
      resize() { const r = stage.getBoundingClientRect(); W = Math.max(50, r.width | 0); H = Math.max(50, r.height | 0); renderer.setSize(W, H, false); persp.aspect = W / H; persp.updateProjectionMatrix(); api._ortho(); },
      _ortho() { const d = camera.position.distanceTo(controls.target) * 0.42; ortho.left = -d * W / H; ortho.right = d * W / H; ortho.top = d; ortho.bottom = -d; ortho.updateProjectionMatrix(); },
      setOrtho(on) { const from = camera; camera = on ? ortho : persp; camera.position.copy(from.position); camera.up.set(0, 0, 1); camera.lookAt(controls.target); controls.object = camera; api._ortho(); controls.update(); },
      isOrtho() { return camera === ortho; },
      setView(name) {
        const t = controls.target, d = Math.max(1.2, camera.position.distanceTo(t));
        const dir = { front: [0, -1, 0], rear: [0, 1, 0], left: [-1, 0, 0], right: [1, 0, 0], top: [0.0001, -0.0001, 1], bottom: [0.0001, -0.0001, -1], iso: [0.6, -0.65, 0.48] }[name] || [0.6, -0.65, 0.48];
        const n = Math.hypot(...dir); camera.position.set(t.x + dir[0] / n * d, t.y + dir[1] / n * d, t.z + dir[2] / n * d); camera.up.set(0, 0, 1); controls.update(); api._ortho();
      },
      home() { camera.position.set(...pos); controls.target.set(...tgt); controls.update(); api._ortho(); },
      fullscreen() { const el = stage.closest('.lview-wrap') || stage; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); },
      render() {
        controls.update(); renderer.render(scene, camera); const v = new T3.Vector3();
        labels.forEach(L => { if (!L.visible || (L.obj && !L.obj.visible)) { L.el.style.display = 'none'; return; } if (L.obj) L.obj.getWorldPosition(v); else v.set(...L.pos); v.project(camera); const off = v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1; L.el.style.display = off ? 'none' : 'block'; L.el.style.left = ((v.x + 1) / 2 * W) + 'px'; L.el.style.top = ((1 - v.y) / 2 * H) + 'px'; });
      },
      label(text, target, cls = '') { const el = document.createElement('div'); el.className = 'l3d ' + cls; el.textContent = text; labelLayer.append(el); const L = { el, obj: target && target.isObject3D ? target : null, pos: Array.isArray(target) ? target : null, visible: true }; labels.push(L); return L; },
      clearLabels() { labels.forEach(L => L.el.remove()); labels.length = 0; },
      screenshot() { api.render(); return renderer.domElement.toDataURL('image/png'); },
      ndc(e) { const r = renderer.domElement.getBoundingClientRect(); return new T3.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); },
      /** ray hit against meshes carrying userData.pick */
      pickAt(e) { const ray = new T3.Raycaster(); ray.setFromCamera(api.ndc(e), camera); const hits = ray.intersectObjects(scene.children, true); for (const h of hits) { let ob = h.object; while (ob) { if (ob.userData && ob.userData.pick && ob.visible) return { pick: ob.userData.pick, object: ob, point: h.point }; ob = ob.parent; } } return null; },
      /** intersection of the pointer ray with the horizontal plane z = z0 */
      planePoint(e, z0 = 0) { const ray = new T3.Raycaster(); ray.setFromCamera(api.ndc(e), camera); const p = new T3.Vector3(); return ray.ray.intersectPlane(new T3.Plane(new T3.Vector3(0, 0, 1), -z0), p) ? [p.x, p.y, p.z] : null; },
      onClick(cb) { let d = null; renderer.domElement.addEventListener('pointerdown', e => (d = [e.clientX, e.clientY])); renderer.domElement.addEventListener('pointerup', e => { if (d && Math.hypot(e.clientX - d[0], e.clientY - d[1]) < 5) cb(api.pickAt(e), e); }); },
      /** frame loop: cb(dt) then render; paused while the stage is off-screen or the tab is hidden */
      start(cb) { let last = performance.now(), vis = true; if (window.IntersectionObserver) new IntersectionObserver(es => (vis = es[0].isIntersecting)).observe(stage); const loop = now => { const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; if (vis && !document.hidden) { try { cb && cb(dt); } catch (err) { console.error(err); } api.render(); } requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
    };
    if (window.ResizeObserver) new ResizeObserver(() => api.resize()).observe(stage); window.addEventListener('resize', () => api.resize());
    document.addEventListener('fullscreenchange', () => setTimeout(() => api.resize(), 60));
    api.resize(); return api;
  };
  /** standard view toolbar (HTML string) + wiring */
  LK.viewBar = () => `<div class="lview-bar" role="toolbar" aria-label="3D view">${['iso', 'front', 'rear', 'left', 'right', 'top', 'bottom'].map(v => `<button type="button" class="tbtn" data-view="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}<button type="button" class="tbtn" data-view="ortho" aria-pressed="false" title="Toggle perspective / orthographic projection">Ortho</button><button type="button" class="tbtn" data-view="home">Reset</button><button type="button" class="tbtn" data-view="full" title="Full-screen">⛶ Full screen</button><button type="button" class="tbtn" data-view="shot" title="Save the 3D view as PNG">PNG</button></div>`;
  LK.wireViewBar = (root, view, name = 'view') => root.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { const v = b.dataset.view; if (v === 'ortho') { const on = !view.isOrtho(); view.setOrtho(on); b.setAttribute('aria-pressed', on); } else if (v === 'home') view.home(); else if (v === 'full') view.fullscreen(); else if (v === 'shot') LK.downloadDataUrl(name + '.png', view.screenshot()); else view.setView(v); });

  /* ---------- twin robot renderer ---------- */
  const shadow = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const setBetween = RIL.three.setBetween;
  const MOTOR_COL = { servo: 0x2b3440, dc: 0x5b6470, stepper: 0x1f2328, bldc: 0x1d4ed8, linear: 0x6b7280 };
  class TwinRobot {
    constructor(view, robot, opts = {}) { this.view = view; this.opts = opts; this.group = new T3.Group(); view.scene.add(this.group); this.sel = null; this.rebuild(robot); }
    rebuild(robot) {
      this.robot = robot; const g = this.group; while (g.children.length) { const c = g.children.pop(); c.traverse && c.traverse(x => { if (x.geometry) x.geometry.dispose(); }); }
      this.parts = []; const reg = (mesh, pick) => { mesh.userData.pick = pick; mesh.traverse(x => { if (x.isMesh) shadow(x); }); this.parts.push({ mesh, pick }); g.add(mesh); return mesh; };
      const n = robot.joints.length; this.table = RM.tableOf(robot);
      if (robot.base) {
        const b = new T3.Group(); const plate = new T3.Mesh(new T3.CylinderGeometry(0.17, 0.19, 0.03, 48), mkMat(0x3a4250, 0.6, 0.4)); plate.rotation.x = Math.PI / 2; plate.position.z = 0.015;
        const col = new T3.Mesh(new T3.CylinderGeometry(0.105, 0.13, 0.07, 40), mkMat(0xe9edf2, 0.1, 0.45)); col.rotation.x = Math.PI / 2; col.position.z = 0.065; b.add(plate, col);
        for (let k = 0; k < 6; k++) { const bolt = new T3.Mesh(new T3.CylinderGeometry(0.008, 0.008, 0.012, 10), mkMat(0x9aa3ad, 0.9, 0.3)); bolt.rotation.x = Math.PI / 2; bolt.position.set(0.155 * Math.cos(k * Math.PI / 3), 0.155 * Math.sin(k * Math.PI / 3), 0.034); b.add(bolt); }
        reg(b, { kind: 'base' });
      }
      this.jm = []; this.lm = []; this.xm = []; this.mm = []; this.sm = []; this.frames = []; this.axes = [];
      robot.joints.forEach((j, i) => {
        const r = Math.max(0.03, (j.w || 0.06) * 0.72);
        let jm; if (j.type === 'P') { jm = new T3.Mesh(new T3.BoxGeometry(r * 2.1, r * 2.1, r * 2.6), mkMat(0x2f3742, 0.5, 0.4)); }
        else { jm = new T3.Group(); const c = new T3.Mesh(new T3.CylinderGeometry(r * 1.12, r * 1.12, r * 2.3, 36), mkMat(0x2f3742, 0.55, 0.38)); const ring = new T3.Mesh(new T3.CylinderGeometry(r * 1.16, r * 1.16, r * 0.35, 36), mkMat(0x1f6feb, 0.3, 0.4)); const cap = new T3.Mesh(new T3.CylinderGeometry(r * 0.8, r * 0.8, r * 2.42, 28), mkMat(0xc8d0da, 0.9, 0.3)); jm.add(c, ring, cap); }
        this.jm.push(reg(jm, { kind: 'joint', i }));
        const mat = RM.MATERIALS[j.material] || RM.MATERIALS.aluminium; const w = j.w || 0.06;
        const mk = () => new T3.Mesh(new T3.BoxGeometry(w, 1, w), mkMat(mat.color, mat.metal, mat.rough));
        this.lm.push(reg(mk(), { kind: 'link', i })); this.xm.push(reg(mk(), { kind: 'link', i }));
        if (j.motor) { const m = new T3.Group(); const can = new T3.Mesh(new T3.CylinderGeometry(r * 0.82, r * 0.82, r * 2.2, 28), mkMat(MOTOR_COL[j.motor] || 0x2b3440, 0.65, 0.35)); const end = new T3.Mesh(new T3.CylinderGeometry(r * 0.6, r * 0.6, r * 0.3, 20), mkMat(0xb87333, 0.9, 0.35)); end.position.y = r * 1.2; const fl = new T3.Mesh(new T3.BoxGeometry(r * 1.9, r * 0.18, r * 1.9), mkMat(0xc8d0da, 0.9, 0.3)); fl.position.y = -r * 1.1; m.add(can, end, fl); this.mm.push(reg(m, { kind: 'motor', i })); } else this.mm.push(null);
        if (j.sensor) { const s = new T3.Group(); const disc = new T3.Mesh(new T3.CylinderGeometry(r * 0.72, r * 0.72, r * 0.22, 28), mkMat(0x1a7f37, 0.1, 0.6)); const chip = new T3.Mesh(new T3.BoxGeometry(r * 0.5, r * 0.12, r * 0.5), mkMat(0x111418, 0.2, 0.5)); chip.position.y = r * 0.16; s.add(disc, chip); this.sm.push(reg(s, { kind: 'sensor', i })); } else this.sm.push(null);
        const ax = new T3.ArrowHelper(new T3.Vector3(0, 0, 1), new T3.Vector3(), 0.32, 0x3e7bfa, 0.05, 0.028); ax.visible = false; g.add(ax); this.axes.push(ax);
      });
      for (let i = 0; i <= n; i++) { const f = RIL.three.frame(0.15); f.visible = !!this.opts.frames; g.add(f); this.frames.push(f); }
      this.tool = new T3.Group(); g.add(this.tool); this.fingers = [];
      if (robot.tool && n) {
        const tg = new T3.Group(); const t = robot.tool; const dark = mkMat(0x2f3742, 0.5, 0.4), steel = mkMat(0xc8d0da, 0.9, 0.28), rub = mkMat(0x1b1f24, 0, 0.9);
        if (t === 'gripper2' || t === 'gripper3') {
          const palm = new T3.Mesh(new T3.CylinderGeometry(0.045, 0.05, 0.04, 28), dark); palm.rotation.x = Math.PI / 2; palm.position.z = 0.02; tg.add(palm);
          const k = t === 'gripper2' ? 2 : 3;
          for (let f = 0; f < k; f++) { const fg = new T3.Group(); const fin = new T3.Mesh(new T3.BoxGeometry(0.014, 0.024, 0.075), steel); fin.position.z = 0.0775; const pad = new T3.Mesh(new T3.BoxGeometry(0.004, 0.022, 0.04), rub); pad.position.set(-0.009, 0, 0.092); fg.add(fin, pad); const hold = new T3.Group(); hold.rotation.z = f * 2 * Math.PI / k; hold.add(fg); tg.add(hold); this.fingers.push(fg); }
        } else {
          const body = new T3.Mesh(new T3.CylinderGeometry(0.022, 0.03, 0.05, 24), dark); body.rotation.x = Math.PI / 2; body.position.z = 0.025; tg.add(body);
          const cups = t === 'vacuum' ? [[0, 0]] : [[0.035, 0.035], [-0.035, 0.035], [0.035, -0.035], [-0.035, -0.035]];
          if (t === 'suction') { const bar = new T3.Mesh(new T3.BoxGeometry(0.11, 0.11, 0.008), steel); bar.position.z = 0.052; tg.add(bar); }
          cups.forEach(c => { const cup = new T3.Mesh(new T3.CylinderGeometry(0.012, 0.024, 0.028, 24), rub); cup.rotation.x = Math.PI / 2; cup.position.set(c[0], c[1], 0.066); tg.add(cup); });
        }
        tg.userData.pick = { kind: 'tool' }; tg.traverse(x => { if (x.isMesh) shadow(x); }); this.tool.add(tg); this.parts.push({ mesh: tg, pick: { kind: 'tool' } }); this.setGrip(1);
      }
      this.update(this.q && this.q.length === n ? this.q : RM.homeQ(robot)); this.select(this.sel);
    }
    toolLen() { return this.robot.tool ? RM.TOOLS[this.robot.tool].len : 0; }
    setGrip(open) { this.grip = open; this.fingers.forEach(f => (f.position.x = 0.016 + 0.03 * open)); }
    update(q) {
      this.q = q.slice(); const robot = this.robot, n = robot.joints.length; const { T, A } = M.fkDH(this.table, q); this.T = T; this.A = A; const V = T3.Vector3;
      for (let i = 0; i < n; i++) {
        const j = robot.joints[i]; const Ti = T[i], o = M.pof(Ti), z = [Ti[0][2], Ti[1][2], Ti[2][2]]; const zv = new V(...z); const r = Math.max(0.03, (j.w || 0.06) * 0.72);
        const jm = this.jm[i]; jm.position.set(...o); jm.quaternion.setFromUnitVectors(j.type === 'P' ? new V(0, 0, 1) : new V(0, 1, 0), zv);
        const d = j.type === 'P' ? q[i] + j.d : j.d; const mid = M.v3.add(o, M.v3.scale(z, d)); const on = M.pof(T[i + 1]);
        const segLen = M.v3.norm(M.v3.sub(on, mid));
        this.xm[i].visible = j.hasLink && Math.abs(d) > 1e-4; if (this.xm[i].visible) setBetween(this.xm[i], o, mid);
        this.lm[i].visible = j.hasLink && segLen > 1e-4; if (this.lm[i].visible) setBetween(this.lm[i], mid, on);
        if (this.mm[i]) { const m = this.mm[i]; m.position.set(...M.v3.add(o, M.v3.scale(z, -r * 2.25))); m.quaternion.setFromUnitVectors(new V(0, 1, 0), zv.clone().negate()); }
        if (this.sm[i]) { const s = this.sm[i]; s.position.set(...M.v3.add(o, M.v3.scale(z, r * 1.3))); s.quaternion.setFromUnitVectors(new V(0, 1, 0), zv); }
        const ax = this.axes[i]; ax.position.set(...M.v3.add(o, M.v3.scale(z, -0.16))); ax.setDirection(zv);
      }
      this.frames.forEach((f, i) => RIL.three.applyT(f, T[i])); RIL.three.applyT(this.tool, T[n]);
      return T;
    }
    tcpT() { return this.T[this.T.length - 1]; }
    /** gripping point: TCP frame origin advanced along its z by the tool length */
    gripPoint() { const Tn = this.tcpT(); const z = [Tn[0][2], Tn[1][2], Tn[2][2]]; return M.v3.add(M.pof(Tn), M.v3.scale(z, this.toolLen())); }
    showFrames(v) { this.frames.forEach(f => (f.visible = v)); } showAxes(v) { this.axes.forEach(a => (a.visible = v)); }
    select(pick) {
      this.sel = pick; const same = p => pick && p.kind === pick.kind && (p.i === undefined || p.i === pick.i);
      this.parts.forEach(p => p.mesh.traverse(x => { if (x.isMesh && x.material && x.material.emissive) { x.material.emissive.setHex(same(p.pick) ? 0x0b63ff : 0x000000); x.material.emissiveIntensity = same(p.pick) ? 0.55 : 0; } }));
    }
    /** bounding spheres along the links, for collision checks: [{c:[x,y,z], r}] */
    spheres() { const out = []; const robot = this.robot; for (let i = 0; i < robot.joints.length; i++) { const a = M.pof(this.T[i]), b = M.pof(this.T[i + 1]); const len = M.v3.norm(M.v3.sub(b, a)); const r = Math.max(0.04, (robot.joints[i].w || 0.06) * 0.75); const k = Math.max(1, Math.ceil(len / (r * 1.4))); for (let s = (i === 0 ? 1 : 0); s <= k; s++) out.push({ c: M.v3.add(a, M.v3.scale(M.v3.sub(b, a), s / k)), r, link: i + 1 }); } if (robot.tool) out.push({ c: this.gripPoint(), r: 0.03, link: 'tool' }); return out; }
  }
  LK.TwinRobot = TwinRobot;
})();
