/* BAIRWABOT – world.js
   Scene, camera, lights, floor, props for every module environment, HTML label /
   bounding-box overlays, trajectory trails and engineering markers. */
(function () {
  'use strict';
  const T = THREE, BB = window.BB, HP = Math.PI / 2;

  BB.World = function (canvas, labelLayer) {
    const W = this;
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    const scene = new T.Scene(); scene.background = new T.Color(0x070c18); scene.fog = new T.Fog(0x070c18, 14, 42);
    const camera = new T.PerspectiveCamera(38, 1, 0.05, 120); camera.position.set(1.9, 1.45, 3.9);
    const controls = new T.OrbitControls(camera, canvas);
    controls.target.set(0, 0.95, 0); controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.maxPolarAngle = HP - 0.03; controls.minDistance = 0.45; controls.maxDistance = 16;
    try { const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; } catch (e) { /* environment map optional */ }
    scene.add(new T.HemisphereLight(0xbfd9ff, 0x0a1020, 0.55));
    const key = new T.DirectionalLight(0xffffff, 1.9); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera; sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sc.near = 0.5; sc.far = 24; key.shadow.bias = -0.0004;
    scene.add(key, key.target);
    const rim = new T.DirectionalLight(0x22d3ee, 1.1); scene.add(rim, rim.target);
    const floor = new T.Mesh(new T.PlaneGeometry(240, 240), new T.MeshStandardMaterial({ color: 0x0b1324, roughness: 0.82, metalness: 0.15 }));
    floor.rotation.x = -HP; floor.receiveShadow = true; scene.add(floor);
    const grid = new T.GridHelper(120, 240, 0x1d6fd6, 0x15233f); grid.position.y = 0.002; grid.material.transparent = true; grid.material.opacity = 0.55; scene.add(grid);
    const pad = new T.Mesh(new T.RingGeometry(0.62, 0.66, 64), new T.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.5 })); pad.rotation.x = -HP; pad.position.y = 0.004; scene.add(pad);
    const props = new T.Group(); scene.add(props);
    const fx = new T.Group(); scene.add(fx);
    const setPts = (o, pts) => { const g = o.geometry; if (g.attributes.position && g.attributes.position.count === pts.length) { g.setFromPoints(pts); g.attributes.position.needsUpdate = true; } else { g.dispose(); o.geometry = new T.BufferGeometry().setFromPoints(pts); } };
    W.setPts = setPts;
    Object.assign(W, { renderer, scene, camera, controls, props, fx, E: {}, env: 'lab', humans: [], updaters: [], labels: [], follow: true, groundFn: null });
    W.groundH = (x, z) => (W.groundFn ? W.groundFn(x, z) : 0);

    /* ---------- materials & primitive props ---------- */
    const mats = {};
    const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return mats[k] || (mats[k] = new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.2 }, o))); };
    function add(geo, color, x, y, z, o) { const m = new T.Mesh(geo, o && o.basic ? new T.MeshBasicMaterial({ color, transparent: !!o.op, opacity: o.op || 1 }) : (o && o.own ? new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.2 }, o.m)) : mat(color, o && o.m))); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; (o && o.parent || props).add(m); return m; }
    const box = (w, h, d, color, x, y, z, o) => add(new T.BoxGeometry(w, h, d), color, x, y, z, o);
    const cyl = (r, h, color, x, y, z, o) => add(new T.CylinderGeometry(r, r, h, 24), color, x, y, z, o);
    W.box = box; W.cyl = cyl;
    W.table = (x, z, w, d, top) => { const g = []; top = top || 0.86; g.push(box(w, 0.04, d, 0x243b5e, x, top - 0.02, z, { m: { roughness: 0.4 } })); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.push(cyl(0.02, top - 0.04, 0x8a96a8, x + sx * (w / 2 - 0.05), (top - 0.04) / 2, z + sz * (d / 2 - 0.05), { m: { metalness: 0.8, roughness: 0.3 } })); return g; };
    W.item = (kind, x, y, z) => {          // y = supporting surface height
      const g = new T.Group(); let h = 0.05, label = kind;
      const part = (geo, c, py, o) => { const m = new T.Mesh(geo, mat(c, o)); m.position.y = py; m.castShadow = true; g.add(m); return m; };
      if (kind === 'bottle') { h = 0.1; part(new T.CylinderGeometry(0.03, 0.03, 0.15, 20), 0x38bdf8, -0.025, { transparent: true, opacity: 0.85, roughness: 0.2 }); part(new T.CylinderGeometry(0.013, 0.028, 0.035, 20), 0x38bdf8, 0.066, { roughness: 0.2 }); part(new T.CylinderGeometry(0.015, 0.015, 0.016, 16), 0xf8fafc, 0.091); label = 'Bottle'; }
      else if (kind === 'book') { h = 0.016; part(new T.BoxGeometry(0.14, 0.032, 0.19), 0xdc2626, 0); part(new T.BoxGeometry(0.13, 0.024, 0.192), 0xf5f5f4, 0); label = 'Book'; }
      else if (kind === 'cube') { h = 0.035; part(new T.BoxGeometry(0.07, 0.07, 0.07), 0xf59e0b, 0); label = 'Cube'; }
      else if (kind === 'ball') { h = 0.04; part(new T.SphereGeometry(0.04, 22, 16), 0x22c55e, 0); label = 'Ball'; }
      else if (kind === 'cup') { h = 0.045; part(new T.CylinderGeometry(0.036, 0.028, 0.09, 20), 0xe2e8f0, 0); const hd = part(new T.TorusGeometry(0.022, 0.006, 8, 16), 0xe2e8f0, 0); hd.position.x = 0.04; label = 'Cup'; }
      else if (kind === 'phone') { h = 0.006; part(new T.BoxGeometry(0.07, 0.012, 0.14), 0x111827, 0, { metalness: 0.6, roughness: 0.25 }); part(new T.BoxGeometry(0.062, 0.002, 0.13), 0x1d4ed8, 0.0065, { emissive: 0x1d4ed8, emissiveIntensity: 0.5 }); label = 'Mobile phone'; }
      else if (kind === 'parcel') { h = 0.09; part(new T.BoxGeometry(0.26, 0.18, 0.2), 0xb7791f, 0); part(new T.BoxGeometry(0.262, 0.182, 0.04), 0xe7c98a, 0); label = 'Parcel'; }
      else if (kind === 'medicine') { h = 0.025; part(new T.BoxGeometry(0.09, 0.05, 0.06), 0xf8fafc, 0); part(new T.BoxGeometry(0.091, 0.015, 0.061), 0x10b981, 0); label = 'Medicine box (simulated)'; }
      else if (kind === 'keys') { h = 0.012; part(new T.TorusGeometry(0.02, 0.005, 8, 16), 0xd4af37, 0, { metalness: 0.9, roughness: 0.3 }).rotation.x = HP; part(new T.BoxGeometry(0.012, 0.006, 0.05), 0xd4af37, 0, { metalness: 0.9, roughness: 0.3 }).position.z = 0.04; label = 'Keys'; }
      else if (kind === 'tool') { h = 0.08; part(new T.CylinderGeometry(0.014, 0.014, 0.08, 14), 0xef4444, 0.04); part(new T.CylinderGeometry(0.004, 0.004, 0.09, 10), 0xcbd5e1, -0.045, { metalness: 0.9, roughness: 0.2 }); label = 'Screwdriver'; }
      g.position.set(x, y + h, z); g.userData = { label, h, kind, home: new T.Vector3(x, y + h, z) }; props.add(g); return g;
    };
    W.human = (x, z, color, yawDeg, name) => {
      const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = (yawDeg || 0) * Math.PI / 180;
      const m = mat(color, { roughness: 0.7 }), skin = mat(0xd9b99b, { roughness: 0.8 });
      const p = (geo, mm, px, py, pz) => { const o = new T.Mesh(geo, mm); o.position.set(px, py, pz); o.castShadow = true; g.add(o); return o; };
      p(new T.CapsuleGeometry(0.16, 0.36, 6, 16), m, 0, 1.15, 0); p(new T.SphereGeometry(0.105, 20, 16), skin, 0, 1.6, 0);
      for (const s of [1, -1]) p(new T.CapsuleGeometry(0.065, 0.72, 6, 12), mat(0x1f2937), s * 0.09, 0.43, 0);
      p(new T.CapsuleGeometry(0.045, 0.5, 6, 12), m, 0.215, 1.08, 0);
      const arm = new T.Mesh(new T.CylinderGeometry(0.042, 0.038, 1, 12), m); arm.castShadow = true; scene.add(arm); fx.add(arm);
      const hand = new T.Mesh(new T.SphereGeometry(0.045, 14, 10), skin); fx.add(hand);
      const H = { g, name: name || 'Person', target: null, speed: 0.75, handT: null, handP: new T.Vector3(), t: Math.random() * 5, follow: null };
      const sh = new T.Vector3(), rest = new T.Vector3(), mid = new T.Vector3(), up = new T.Vector3(0, 1, 0), dir = new T.Vector3();
      H.setHand = (v) => { H.handT = v ? v.clone() : null; };
      H.pos = () => g.position;
      H.faceTo = (px, pz) => { H.yawT = Math.atan2(px - g.position.x, pz - g.position.z); };
      H.update = (dt) => {
        H.t += dt;
        const tg = H.follow ? H.follow() : H.target;
        if (tg) {
          const dx = tg.x - g.position.x, dz = tg.z - g.position.z, d = Math.hypot(dx, dz);
          if (d > 0.06) { const s = Math.min(d, H.speed * dt); g.position.x += dx / d * s; g.position.z += dz / d * s; H.yawT = Math.atan2(dx, dz); g.position.y = 0.012 * Math.abs(Math.sin(H.t * 7)); H.moving = true; }
          else { H.moving = false; g.position.y = 0; if (!H.follow) H.target = null; }
        } else H.moving = false;
        if (H.yawT != null) g.rotation.y += BB.util.wrap(H.yawT - g.rotation.y) * Math.min(1, dt * 5);
        g.updateMatrixWorld(true);
        sh.set(-0.215, 1.36, 0).applyMatrix4(g.matrixWorld); rest.set(-0.23, 0.84, 0.04).applyMatrix4(g.matrixWorld);
        H.handP.lerp(H.handT || rest, H.handP.lengthSq() === 0 ? 1 : Math.min(1, dt * 5));
        mid.addVectors(sh, H.handP).multiplyScalar(0.5); dir.subVectors(H.handP, sh); const L = dir.length();
        arm.position.copy(mid); arm.scale.set(1, L, 1); arm.quaternion.setFromUnitVectors(up, dir.normalize()); hand.position.copy(H.handP);
      };
      props.add(g); W.humans.push(H); H.update(0); return H;
    };
    W.chair = (x, z, yawDeg) => { const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = (yawDeg || 0) * Math.PI / 180; props.add(g); const o = { parent: g }; box(0.46, 0.04, 0.42, 0x1e3a5f, 0, 0.405, 0, o); box(0.46, 0.5, 0.04, 0x1e3a5f, 0, 0.7, 0.2, o); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.018, 0.39, 0x8a96a8, sx * 0.2, 0.195, sz * 0.18, o); return g; };
    W.ring = (x, z, r, color) => { const m = new T.Mesh(new T.RingGeometry(r * 0.8, r, 40), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: T.DoubleSide })); m.rotation.x = -HP; m.position.set(x, 0.012, z); props.add(m); return m; };
    W.line = (pts, color, parent) => { const g = new T.BufferGeometry().setFromPoints(pts); const l = new T.Line(g, new T.LineBasicMaterial({ color })); (parent || props).add(l); return l; };
    W.board = (x, y, z, yawDeg) => {
      const cv = document.createElement('canvas'); cv.width = 768; cv.height = 432; const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace;
      const m = new T.Mesh(new T.PlaneGeometry(1.6, 0.9), new T.MeshBasicMaterial({ map: tx })); m.position.set(x, y, z); m.rotation.y = (yawDeg || 0) * Math.PI / 180; props.add(m);
      box(1.68, 0.98, 0.04, 0x1a2436, 0, 0, -0.025, { parent: m }); cyl(0.03, y - 0.45, 0x8a96a8, x, (y - 0.45) / 2, z - 0.02);
      const b = { set(title, lines) { const c = cv.getContext('2d'); c.fillStyle = '#0b1730'; c.fillRect(0, 0, 768, 432); c.fillStyle = '#22d3ee'; c.font = '700 44px Arial'; c.fillText(title, 36, 70); c.fillStyle = '#22d3ee'; c.fillRect(36, 88, 696, 3); c.fillStyle = '#e2e8f0'; c.font = '30px Arial'; (lines || []).forEach((l, i) => c.fillText(l, 36, 150 + i * 50)); tx.needsUpdate = true; } };
      b.set('BAIRWABOT', ['Humanoid Robotics Virtual Lab']); return b;
    };

    /* ---------- HTML overlay labels & bounding boxes ---------- */
    const v = new T.Vector3(), b3 = new T.Box3();
    W.addLabel = (target, text, cls) => { const el = document.createElement('div'); el.className = 'lbl ' + (cls || ''); el.textContent = text; labelLayer.appendChild(el); const L = { el, target, box: false, set(t) { el.textContent = t; }, remove() { el.remove(); W.labels = W.labels.filter(x => x !== L); } }; W.labels.push(L); return L; };
    W.addBBox = (obj, text, cls) => { const el = document.createElement('div'); el.className = 'bbox ' + (cls || ''); const tg = document.createElement('span'); tg.textContent = text; el.appendChild(tg); labelLayer.appendChild(el); const L = { el, target: obj, box: true, set(t) { tg.textContent = t; }, remove() { el.remove(); W.labels = W.labels.filter(x => x !== L); } }; W.labels.push(L); return L; };
    W.clearLabels = () => { W.labels.slice().forEach(l => l.remove()); };
    function project(p) { v.copy(p).project(camera); return [(v.x * 0.5 + 0.5) * canvas.clientWidth, (-v.y * 0.5 + 0.5) * canvas.clientHeight, v.z]; }
    W.project = project;
    function updateLabels() {
      for (const L of W.labels) {
        const t = typeof L.target === 'function' ? L.target() : L.target;
        if (!t) { L.el.style.display = 'none'; continue; }
        if (L.box) {
          b3.setFromObject(t); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ok = true;
          for (let i = 0; i < 8; i++) { const s = project(new T.Vector3(i & 1 ? b3.max.x : b3.min.x, i & 2 ? b3.max.y : b3.min.y, i & 4 ? b3.max.z : b3.min.z)); if (s[2] > 1) ok = false; x0 = Math.min(x0, s[0]); y0 = Math.min(y0, s[1]); x1 = Math.max(x1, s[0]); y1 = Math.max(y1, s[1]); }
          L.el.style.display = ok ? 'block' : 'none'; L.el.style.left = x0 - 4 + 'px'; L.el.style.top = y0 - 4 + 'px'; L.el.style.width = x1 - x0 + 8 + 'px'; L.el.style.height = y1 - y0 + 8 + 'px';
        } else {
          const s = project(t.isVector3 ? t : t.getWorldPosition(new T.Vector3()));
          L.el.style.display = s[2] > 1 ? 'none' : 'block'; L.el.style.left = s[0] + 'px'; L.el.style.top = s[1] + 'px';
        }
      }
    }

    /* ---------- trails & engineering markers ---------- */
    W.trail = (color, n) => {
      n = n || 400; const pos = new Float32Array(n * 3), g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setDrawRange(0, 0);
      const l = new T.Line(g, new T.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95 })); l.frustumCulled = false; l.renderOrder = 5; fx.add(l);
      let c = 0; const last = new T.Vector3(1e9, 0, 0);
      return { line: l, push(p) { if (p.distanceToSquared(last) < 1e-5) return; last.copy(p); if (c >= n) { pos.copyWithin(0, 3); c = n - 1; } pos[c * 3] = p.x; pos[c * 3 + 1] = p.y; pos[c * 3 + 2] = p.z; c++; g.setDrawRange(0, c); g.attributes.position.needsUpdate = true; }, clear() { c = 0; g.setDrawRange(0, 0); last.set(1e9, 0, 0); }, remove() { fx.remove(l); } };
    };
    const mk = {};
    mk.com = new T.Mesh(new T.SphereGeometry(0.035, 16, 12), new T.MeshBasicMaterial({ color: 0xfacc15, depthTest: false })); mk.com.renderOrder = 6;
    mk.comG = new T.Mesh(new T.RingGeometry(0.03, 0.045, 24), new T.MeshBasicMaterial({ color: 0xfacc15, depthTest: false, side: T.DoubleSide })); mk.comG.rotation.x = -HP; mk.comG.renderOrder = 6;
    mk.cop = new T.Mesh(new T.CircleGeometry(0.028, 20), new T.MeshBasicMaterial({ color: 0xef4444, depthTest: false, side: T.DoubleSide })); mk.cop.rotation.x = -HP; mk.cop.renderOrder = 7;
    mk.plumb = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), new T.LineDashedMaterial({ color: 0xfacc15, dashSize: 0.04, gapSize: 0.03, depthTest: false }));
    mk.hull = new T.LineLoop(new T.BufferGeometry(), new T.LineBasicMaterial({ color: 0x22d3ee, depthTest: false })); mk.hull.renderOrder = 6; mk.hull.frustumCulled = false; mk.plumb.frustumCulled = false;
    mk.hullFill = new T.Mesh(new T.BufferGeometry(), new T.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.18, depthTest: false, side: T.DoubleSide })); mk.hullFill.frustumCulled = false;
    const balG = new T.Group(); balG.add(mk.com, mk.comG, mk.cop, mk.plumb, mk.hull, mk.hullFill); balG.visible = false; fx.add(balG);
    W.balance = balG; W.comTrail = null;
    W.showBalance = (on) => { balG.visible = on; if (on && !W.comTrail) W.comTrail = W.trail(0xfacc15, 300); if (!on && W.comTrail) { W.comTrail.remove(); W.comTrail = null; } };
    function updateBalance(O) {
      if (!balG.visible) return;
      const gy = (O.hull[0] ? O.hull[0][2] : 0) + 0.006;
      mk.com.position.copy(O.com); mk.comG.position.set(O.com.x, gy, O.com.z); mk.cop.position.set(O.cop.x, gy + 0.002, O.cop.z);
      setPts(mk.plumb, [O.com, new T.Vector3(O.com.x, gy, O.com.z)]); mk.plumb.computeLineDistances();
      const pts = O.hull.map(h => new T.Vector3(h[0], h[2] + 0.006, h[1]));
      setPts(mk.hull, pts);
      if (pts.length >= 3) { const tri = []; for (let i = 1; i < pts.length - 1; i++) tri.push(pts[0], pts[i], pts[i + 1]); setPts(mk.hullFill, tri); mk.hullFill.visible = true; } else mk.hullFill.visible = false;
      if (W.comTrail) W.comTrail.push(new T.Vector3(O.com.x, gy, O.com.z));
    }
    // joint / sensor highlight helpers
    const hl = new T.Group(); fx.add(hl);
    W.highlight = (node, axisName, color) => {
      W.clearHighlight(); if (!node) return;
      const s = new T.Mesh(new T.SphereGeometry(0.075, 18, 14), new T.MeshBasicMaterial({ color: color || 0xf59e0b, transparent: true, opacity: 0.35, depthTest: false })); s.renderOrder = 8;
      node.add(s); hl.userData.items = [s];
      if (axisName) { const d = new T.Vector3(axisName === 'x' ? 1 : 0, axisName === 'y' ? 1 : 0, axisName === 'z' ? 1 : 0); for (const sg of [1, -1]) { const a = new T.ArrowHelper(d.clone().multiplyScalar(sg), new T.Vector3(), 0.2, 0xf43f5e, 0.05, 0.03); a.line.material.depthTest = false; a.cone.material.depthTest = false; a.renderOrder = 9; node.add(a); hl.userData.items.push(a); } }
    };
    W.clearHighlight = () => { (hl.userData.items || []).forEach(o => o.parent && o.parent.remove(o)); hl.userData.items = []; };
    W.pulse = null; // optional pulsing object
    // skeleton overlay
    let skel = null;
    W.showSkeleton = (on, robot) => {
      if (on && !skel) { skel = new T.LineSegments(new T.BufferGeometry(), new T.LineBasicMaterial({ color: 0x67e8f9, depthTest: false })); skel.renderOrder = 10; skel.frustumCulled = false; fx.add(skel); }
      if (skel) skel.visible = on;
    };
    const BONES = [['root', 'torso'], ['torso', 'neck'], ['torso', 'shL'], ['torso', 'shR'], ['shL', 'elL'], ['elL', 'wrL'], ['wrL', 'gripL'], ['shR', 'elR'], ['elR', 'wrR'], ['wrR', 'gripR'], ['root', 'hipL'], ['root', 'hipR'], ['hipL', 'kneeL'], ['kneeL', 'ankL'], ['hipR', 'kneeR'], ['kneeR', 'ankR']];
    W.BONES = BONES;
    function updateSkeleton(robot) {
      if (!skel || !skel.visible) return; const pts = [];
      for (const [a, b] of BONES) pts.push(robot.nodes[a].getWorldPosition(new T.Vector3()), robot.nodes[b].getWorldPosition(new T.Vector3()));
      for (const S of ['L', 'R']) { const so = robot.soles[S]; pts.push(so.node.getWorldPosition(new T.Vector3()), so.toe.clone().applyMatrix4(so.node.matrixWorld)); }
      const nk = robot.nodes.neck; pts.push(nk.getWorldPosition(new T.Vector3()), new T.Vector3(0, 0.2, 0).applyMatrix4(nk.matrixWorld));
      setPts(skel, pts);
    }

    /* ---------- environments ---------- */
    function clearEnv() {
      while (props.children.length) props.remove(props.children[0]);
      for (let i = fx.children.length - 1; i >= 0; i--) { const c = fx.children[i]; if (c !== balG && c !== hl && c !== skel) fx.remove(c); }
      W.comTrail = null; balG.visible = false;
      W.humans = []; W.updaters = []; W.E = {}; W.groundFn = null; W.clearLabels(); W.clearHighlight(); W.onGround = null;
    }
    const ENV = {
      lab() { },
      chair() { W.E.chair = W.chair(0, 0.9, 0); },
      ground() { W.E.ball = W.item('ball', -0.24, 0, 0.5); },
      stairs() {
        const hAt = (z) => { if (z < -1.2 || z >= 2.4) return 0; if (z < 0) return 0.16 * (Math.floor((z + 1.2) / 0.3) + 1); if (z < 1.2) return 0.8; return 0.8 - 0.16 * (Math.floor((z - 1.2) / 0.3) + 1); };
        W.groundFn = (x, z) => (Math.abs(x) < 0.6 ? hAt(z) : 0); W.E.hAt = hAt;
        for (let i = 0; i < 4; i++) { const h = 0.16 * (i + 1); box(1.2, h, 0.3, i % 2 ? 0x1c3152 : 0x223a60, 0, h / 2, -1.05 + 0.3 * i); box(1.2, h, 0.3, i % 2 ? 0x1c3152 : 0x223a60, 0, h / 2, 2.25 - 0.3 * i); box(1.2, 0.012, 0.03, 0x22d3ee, 0, h + 0.006, -1.185 + 0.3 * i, { basic: 1 }); box(1.2, 0.012, 0.03, 0x22d3ee, 0, h + 0.006, 2.385 - 0.3 * i, { basic: 1 }); }
        box(1.2, 0.8, 1.2, 0x223a60, 0, 0.4, 0.6); box(1.2, 0.012, 0.03, 0x22d3ee, 0, 0.806, 0.015, { basic: 1 }); box(1.2, 0.012, 0.03, 0x22d3ee, 0, 0.806, 1.185, { basic: 1 });
      },
      table() {
        W.table(0, 0.62, 1.3, 0.6); const E = W.E; E.items = {};
        E.items.bottle = W.item('bottle', -0.36, 0.86, 0.43); E.items.cube = W.item('cube', -0.2, 0.86, 0.43); E.items.ball = W.item('ball', 0.02, 0.86, 0.47);
        E.items.cup = W.item('cup', 0.2, 0.86, 0.43); E.items.book = W.item('book', 0.38, 0.86, 0.46);
        for (const s of [1, -1]) { cyl(0.13, 0.03, 0x14532d, s * 0.5, 0.875, 0.16, { m: { emissive: 0x14532d, emissiveIntensity: 0.6 } }); cyl(0.025, 0.86, 0x8a96a8, s * 0.5, 0.43, 0.16); }
        E.placeY = 0.89;
      },
      handshake() { W.E.human = W.human(0.02, 1.02, 0x3b5b8c, 180, 'Student'); },
      follow() { W.E.human = W.human(0, 2.4, 0x3b5b8c, 0, 'Person'); },
      obstacles() {
        const E = W.E; E.obs = [[0.15, -1.6, 0.3], [-0.95, 0.2, 0.32], [0.85, 1.0, 0.3], [-0.15, 2.3, 0.28]];
        for (const o of E.obs) cyl(o[2], 0.9, 0xb45309, o[0], 0.45, o[1], { m: { roughness: 0.5 } });
        E.goal = new T.Vector3(0, 0, 4); W.ring(0, 4, 0.3, 0x22c55e); W.ring(0, -3.6, 0.3, 0x38bdf8);
        E.ray = W.line([new T.Vector3(), new T.Vector3()], 0xef4444, fx); E.ray.frustumCulled = false; E.ray.material.depthTest = false;
      },
      nav() {
        const E = W.E; E.walls = [[-3, -1, 0.6, -1], [-0.6, 1, 3, 1], [-3, -3, 3, -3], [-3, 3, 3, 3], [-3, -3, -3, 3], [3, -3, 3, 3], [1.4, -3, 1.4, -1.9]];
        for (const w of E.walls) { const dx = w[2] - w[0], dz = w[3] - w[1], L = Math.hypot(dx, dz); const m = box(L + 0.12, 0.9, 0.12, 0x24406b, (w[0] + w[2]) / 2, 0.45, (w[1] + w[3]) / 2, { m: { transparent: true, opacity: 0.85 } }); m.rotation.y = -Math.atan2(dz, dx); }
        E.start = new T.Vector3(-2.4, 0, -2.2); E.goal = new T.Vector3(2.4, 0, 2.3);
        E.goalRing = W.ring(E.goal.x, E.goal.z, 0.3, 0x22c55e); W.ring(E.start.x, E.start.z, 0.3, 0x38bdf8);
      },
      parcel() { W.table(0, 0.62, 0.9, 0.6); W.E.parcel = W.item('parcel', 0, 0.86, 0.47); W.E.human = W.human(2.4, -1.8, 0x3b5b8c, -90, 'Recipient'); },
      door() {
        const E = W.E; box(2.6, 2.2, 0.1, 0x1c3152, -1.78, 1.1, 1.5); box(2.6, 2.2, 0.1, 0x1c3152, 1.78, 1.1, 1.5); box(0.96, 0.15, 0.1, 0x1c3152, 0, 2.125, 1.5);
        const hinge = new T.Group(); hinge.position.set(0.47, 0, 1.5); props.add(hinge); E.hinge = hinge;
        box(0.92, 2.02, 0.045, 0x8fa3bd, -0.47, 1.02, 0, { parent: hinge, m: { roughness: 0.45, metalness: 0.3 } });
        E.handle = new T.Group(); E.handle.position.set(-0.82, 1.0, 0); hinge.add(E.handle);
        for (const s of [1, -1]) { cyl(0.012, 0.07, 0xd1d5db, 0, 0, s * 0.055, { parent: E.handle, m: { metalness: 0.9, roughness: 0.2 } }).rotation.x = HP; box(0.12, 0.02, 0.02, 0xd1d5db, 0.05, 0, s * 0.085, { parent: E.handle, m: { metalness: 0.9, roughness: 0.2 } }); }
        E.hA = new T.Object3D(); E.hA.position.set(0.04, 0, -0.1); E.handle.add(E.hA); E.hB = new T.Object3D(); E.hB.position.set(0.04, 0, 0.1); E.handle.add(E.hB);
      },
      desk() {
        W.table(0, 0.62, 1.3, 0.6); const E = W.E;
        box(0.03, 0.26, 0.03, 0x8a96a8, -0.46, 0.99, 0.5); E.sw = box(0.09, 0.11, 0.03, 0xe2e8f0, -0.46, 1.1, 0.48); E.swBtn = box(0.035, 0.05, 0.012, 0x334155, -0.46, 1.1, 0.462, { own: 1 });
        cyl(0.012, 0.3, 0x8a96a8, 0.52, 1.01, 0.82); E.bulb = add(new T.SphereGeometry(0.06, 20, 14), 0x475569, 0.52, 1.2, 0.82, { own: 1, m: { emissive: 0xfde68a, emissiveIntensity: 0 } });
        E.lamp = new T.PointLight(0xfde68a, 0, 4); E.lamp.position.set(0.52, 1.2, 0.82); props.add(E.lamp);
        E.kb = box(0.3, 0.018, 0.11, 0x111827, 0, 0.869, 0.45, { m: { roughness: 0.4 } });
        for (let i = 0; i < 10; i++) for (let j = 0; j < 3; j++) box(0.022, 0.006, 0.022, 0x374151, -0.126 + i * 0.028, 0.881, 0.42 + j * 0.03);
        E.phone = W.item('phone', -0.28, 0.86, 0.45); E.cup = W.item('cup', 0.26, 0.86, 0.44); E.tool = W.item('tool', 0.42, 0.89, 0.46);
        box(0.08, 0.03, 0.08, 0x475569, 0.42, 0.875, 0.46);
        E.screen = W.addLabel(new T.Vector3(0, 1.08, 0.62), 'Typed: ', 'screen');
      },
      care() {
        const E = W.E; W.table(-1.5, 1.2, 1.0, 0.5); E.bottle = W.item('bottle', -1.5, 0.86, 1.06); E.med = W.item('medicine', -1.18, 0.86, 1.08);
        W.chair(2.55, 1.0, -90); E.human = W.human(1.85, 1.0, 0x7c6aa8, -90, 'Resident'); E.keys = W.item('keys', 1.32, 0, 0.42);
      },
      hospital() {
        const E = W.E;
        for (const s of [1, -1]) box(0.1, 1.15, 11.5, 0x1c3152, s * 1.75, 0.575, 0.6, { m: { transparent: true, opacity: 0.8 } });
        box(1.0, 1.0, 0.45, 0x24406b, -1.15, 0.5, -3.9); E.visitor = W.human(0.75, -3.1, 0x3b5b8c, 200, 'Visitor');
        box(0.06, 2.0, 0.9, 0x8fa3bd, 1.72, 1.0, 2.0); E.wardSign = new T.Vector3(1.6, 1.75, 2.0);
        W.table(0.95, -0.4, 0.8, 0.5); E.box = W.item('parcel', 0.95, 0.86, -0.53); E.box.userData.label = 'Supply box';
        W.table(-0.95, 3.75, 1.0, 0.55); E.staff = W.human(-0.95, 4.6, 0x1f9d8a, 180, 'Staff');
        E.patient = new T.Group(); E.patient.position.set(0.55, 0, 5.6); E.patient.visible = false; props.add(E.patient);
        const pm = new T.Mesh(new T.CapsuleGeometry(0.16, 1.2, 6, 14), mat(0x64748b)); pm.rotation.z = HP; pm.position.y = 0.17; E.patient.add(pm);
        const ph = new T.Mesh(new T.SphereGeometry(0.11, 16, 12), mat(0xd9b99b)); ph.position.set(0.82, 0.14, 0); E.patient.add(ph);
        E.beacon = add(new T.SphereGeometry(0.07, 16, 12), 0xef4444, 0, 1.25, 5.9, { own: 1, m: { emissive: 0xef4444, emissiveIntensity: 0 } }); cyl(0.015, 1.2, 0x8a96a8, 0, 0.6, 5.9);
      },
      teach() { W.E.board = W.board(-1.45, 1.35, -0.5, 25); }
    };
    W.setEnv = (name) => { clearEnv(); W.env = ENV[name] ? name : 'lab'; ENV[W.env](); pad.visible = W.env === 'lab' || W.env === 'teach'; };

    /* ---------- picking ---------- */
    const ray = new T.Raycaster(), ptr = new T.Vector2(); let down = null;
    canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const r = canvas.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera);
      if (W.onRobot && BB.robot) { const hit = ray.intersectObject(BB.robot.root, true).find(h => h.object.userData.part && h.object.material.opacity > 0.5); if (hit && W.onRobot(hit.object.userData.part, hit) !== false) return; }
      if (W.onGround) { const p = new T.Vector3(); if (ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), p)) W.onGround(p); }
    });

    /* ---------- camera ---------- */
    let camTween = null; const prevF = new T.Vector3(); let hasPrev = false;
    W.view = (name, focus) => {
      const f = focus || (BB.motion ? new T.Vector3(BB.motion.root.x, 0.95, BB.motion.root.z) : new T.Vector3(0, 0.95, 0));
      const yaw = BB.motion ? BB.motion.root.yaw : 0, rot = (x, y, z) => new T.Vector3(x * Math.cos(yaw) + z * Math.sin(yaw), y, -x * Math.sin(yaw) + z * Math.cos(yaw));
      const V = { front: rot(0, 0.3, 4.2), side: rot(4.2, 0.3, 0), rear: rot(0, 0.3, -4.2), iso: rot(1.9, 0.5, 3.9), head: rot(0.25, 0.08, 1.0), top: new T.Vector3(0.01, 9, 0.02), wide: rot(3.2, 2.4, 5.2), hands: rot(-0.9, 0.2, 1.5), feet: rot(1.2, 0.5, 1.8) };
      const off = V[name] || V.iso, tg = f.clone();
      if (name === 'head') tg.y = 1.63; if (name === 'hands') tg.y = 1.1; if (name === 'feet') tg.y = 0.25; if (name === 'top') tg.y = 0;
      hasPrev = false;
      controls.autoRotate = name === 'orbit'; controls.autoRotateSpeed = 2.4;
      if (name === 'orbit') return;
      camTween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: tg.clone().add(off), t1: tg, t: 0 };
    };
    W.resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); } };
    W.updateProps = (dt) => { for (const h of W.humans) h.update(dt); for (const u of W.updaters) u(dt); };
    W.render = (dt, motion, robot) => {
      W.resize();
      if (motion) {
        const f = new T.Vector3(motion.root.x, 0, motion.root.z);
        if (hasPrev && W.follow) { const d = f.clone().sub(prevF); camera.position.add(d); controls.target.add(d); if (camTween) { camTween.p0.add(d); camTween.t0.add(d); camTween.p1.add(d); camTween.t1.add(d); } }
        prevF.copy(f); hasPrev = true;
        key.position.set(f.x + 3, 6.5, f.z + 4); key.target.position.copy(f); rim.position.set(f.x - 3, 3, f.z - 5); rim.target.position.copy(f);
        grid.position.x = Math.round(f.x); grid.position.z = Math.round(f.z);
        updateBalance(motion.out); updateSkeleton(robot);
      }
      if (camTween) { camTween.t += dt / 0.8; const e = BB.util.smooth(camTween.t); camera.position.lerpVectors(camTween.p0, camTween.p1, e); controls.target.lerpVectors(camTween.t0, camTween.t1, e); if (camTween.t >= 1) camTween = null; }
      controls.update(); renderer.render(scene, camera); updateLabels();
    };
  };
})();
