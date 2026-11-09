/* =====================================================================
   three-kit.js — Three.js helpers for robotic visualisation (Z-up world)
   ===================================================================== */
(function () {
  'use strict';
  const RIL = window.RIL = window.RIL || {};
  const M = RIL.M;
  if (!window.THREE) { console.warn('THREE not loaded'); return; }
  const T3 = window.THREE;
  const COL = { x: 0xe5484d, y: 0x30a46c, z: 0x3e7bfa, link: 0x8aa0c6, joint: 0xf2a516, base: 0x3b4f75, dark: 0x22355c, white: 0xe9eef7, amber: 0xf2a516, signal: 0x4cc2ff };
  const matCache = {};
  const mat = (color, opts = {}) => { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new T3.MeshStandardMaterial(Object.assign({ color, metalness: 0.35, roughness: 0.5 }, opts)); return matCache[k]; };

  function create(stage, cam = {}) {
    const renderer = new T3.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    stage.append(renderer.domElement);
    const scene = new T3.Scene();
    const camera = new T3.PerspectiveCamera(cam.fov || 45, 1, 0.01, 200);
    camera.up.set(0, 0, 1);
    const pos = cam.position || [2.2, -2.4, 1.8], tgt = cam.target || [0, 0, 0.5];
    camera.position.set(...pos);
    const controls = new T3.OrbitControls(camera, renderer.domElement);
    controls.target.set(...tgt); controls.enableDamping = true; controls.dampingFactor = 0.12; controls.update(); controls.saveState();
    scene.add(new T3.HemisphereLight(0xdfe8ff, 0x1a2540, 0.9));
    const d1 = new T3.DirectionalLight(0xffffff, 0.85); d1.position.set(3, -2, 5); scene.add(d1);
    const d2 = new T3.DirectionalLight(0x9fbfff, 0.35); d2.position.set(-3, 3, 2); scene.add(d2);
    if (cam.grid !== false) {
      const grid = new T3.GridHelper(cam.gridSize || 4, cam.gridDiv || 20, 0x3a5384, 0x22355c);
      grid.rotation.x = Math.PI / 2; grid.material.transparent = true; grid.material.opacity = 0.55; scene.add(grid);
    }
    const labelLayer = document.createElement('div'); labelLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
    stage.append(labelLayer);
    const labels = [];
    let W = 100, H = 100;
    const api = {
      scene, camera, renderer, controls, T3, COL, mat,
      resize(w, h) { W = w; H = h; renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / h; camera.updateProjectionMatrix(); },
      resetCamera() { controls.reset(); },
      render() {
        controls.update(); renderer.render(scene, camera);
        const v = new T3.Vector3();
        labels.forEach(L => {
          if (!L.visible) { L.el.style.display = 'none'; return; }
          if (L.obj) L.obj.getWorldPosition(v); else v.set(...L.pos);
          if (L.offset) v.add(new T3.Vector3(...L.offset));
          v.project(camera);
          const off = v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2;
          L.el.style.display = off ? 'none' : 'block';
          L.el.style.left = ((v.x + 1) / 2 * W) + 'px'; L.el.style.top = ((1 - v.y) / 2 * H) + 'px';
        });
      },
      /** HTML label tracking an object or a fixed point */
      label(text, target, cls = '', offset) {
        const el = document.createElement('div'); el.className = 'label3d ' + cls; el.textContent = text; labelLayer.append(el);
        const L = { el, obj: target && target.isObject3D ? target : null, pos: Array.isArray(target) ? target : null, visible: true, offset, set text(t) { el.textContent = t; } };
        labels.push(L); return L;
      },
      clearLabels() { labels.forEach(L => L.el.remove()); labels.length = 0; },
      /** click-picking of meshes that carry userData.pick */
      onPick(cb) {
        let downAt = null; const ray = new T3.Raycaster(); const ndc = new T3.Vector2();
        renderer.domElement.addEventListener('pointerdown', e => (downAt = [e.clientX, e.clientY]));
        renderer.domElement.addEventListener('pointerup', e => {
          if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
          const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
          ray.setFromCamera(ndc, camera);
          const hits = ray.intersectObjects(scene.children, true).filter(h => { let o = h.object; while (o) { if (o.userData.pick) return true; o = o.parent; } return false; });
          if (hits.length) { let o = hits[0].object; while (!o.userData.pick) o = o.parent; cb(o.userData.pick, o, hits[0].point); } else cb(null);
        });
      }
    };
    return api;
  }

  /* ---------- builders ---------- */
  function cylinderBetween(p1, p2, r, material) {
    const a = new T3.Vector3(...p1), b = new T3.Vector3(...p2); const len = a.distanceTo(b);
    const g = new T3.CylinderGeometry(r, r, Math.max(len, 1e-4), 20);
    const m = new T3.Mesh(g, material); setBetween(m, a, b); return m;
  }
  function setBetween(mesh, a, b) {
    a = a.isVector3 ? a : new T3.Vector3(...a); b = b.isVector3 ? b : new T3.Vector3(...b);
    const len = a.distanceTo(b); mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.scale.set(1, Math.max(len, 1e-4) / (mesh.geometry.parameters.height || 1), 1);
    const dir = b.clone().sub(a); if (dir.lengthSq() < 1e-12) dir.set(0, 1, 0);
    mesh.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), dir.normalize());
  }
  function arrow(dir, origin, len, color, head = 0.18) {
    const a = new T3.ArrowHelper(new T3.Vector3(...dir).normalize(), new T3.Vector3(...origin), len, color, len * head, len * head * 0.55);
    return a;
  }
  /** XYZ frame (red/green/blue) */
  function frame(size = 0.25, opts = {}) {
    const g = new T3.Group(); const w = opts.width || size * 0.035;
    const mk = (dir, color) => { const shaft = new T3.Mesh(new T3.CylinderGeometry(w, w, size * 0.82, 10), new T3.MeshBasicMaterial({ color, transparent: !!opts.opacity, opacity: opts.opacity || 1 })); const cone = new T3.Mesh(new T3.ConeGeometry(w * 2.6, size * 0.18, 12), shaft.material); const grp = new T3.Group(); shaft.position.y = size * 0.41; cone.position.y = size * 0.91; grp.add(shaft, cone); grp.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), new T3.Vector3(...dir)); return grp; };
    g.add(mk([1, 0, 0], COL.x), mk([0, 1, 0], COL.y), mk([0, 0, 1], COL.z));
    g.add(new T3.Mesh(new T3.SphereGeometry(w * 1.6, 12, 8), new T3.MeshBasicMaterial({ color: 0xffffff })));
    return g;
  }
  /** apply a 4x4 row-major homogeneous matrix to an Object3D */
  function applyT(obj, T) {
    const m = new T3.Matrix4(); m.set(T[0][0], T[0][1], T[0][2], T[0][3], T[1][0], T[1][1], T[1][2], T[1][3], T[2][0], T[2][1], T[2][2], T[2][3], 0, 0, 0, 1);
    obj.matrixAutoUpdate = false; obj.matrix.copy(m); obj.matrixWorldNeedsUpdate = true;
  }
  function box(w, d, h, color, opts) { return new T3.Mesh(new T3.BoxGeometry(w, d, h), mat(color, opts)); }
  function cyl(r, h, color, axis = 'z', opts) { const m = new T3.Mesh(new T3.CylinderGeometry(r, r, h, 28), mat(color, opts)); if (axis === 'z') m.rotation.x = Math.PI / 2; if (axis === 'x') m.rotation.z = Math.PI / 2; return m; }
  /** point cloud from array of [x,y,z] */
  function points(arr, color = COL.signal, size = 0.015, opacity = 0.6) {
    const g = new T3.BufferGeometry(); const f = new Float32Array(arr.length * 3); arr.forEach((p, i) => { f[3 * i] = p[0]; f[3 * i + 1] = p[1]; f[3 * i + 2] = p[2]; });
    g.setAttribute('position', new T3.BufferAttribute(f, 3));
    return new T3.Points(g, new T3.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false }));
  }
  function polyline(arr, color = COL.amber) { const g = new T3.BufferGeometry().setFromPoints(arr.map(p => new T3.Vector3(...p))); return new T3.Line(g, new T3.LineBasicMaterial({ color })); }
  function updateLine(line, arr) { line.geometry.dispose(); line.geometry = new T3.BufferGeometry().setFromPoints(arr.map(p => new T3.Vector3(...p))); }

  /**
   * Generic DH robot renderer: draws joint housings aligned with z_{i-1}
   * and links between successive frame origins. update(q) recomputes FK.
   */
  class DHRobot {
    constructor(scene, table, opts = {}) {
      this.table = table; this.opts = opts; this.group = new T3.Group(); scene.add(this.group);
      const r = opts.radius || 0.045;
      this.base = cyl(r * 2.4, opts.baseH || 0.08, COL.base, 'z'); this.base.position.z = (opts.baseH || 0.08) / 2 - 0.0; this.group.add(this.base);
      this.base.userData.pick = 'base';
      this.joints = table.map((L, i) => {
        const j = L.type === 'P' ? box(r * 1.9, r * 1.9, r * 2.2, COL.joint) : new T3.Mesh(new T3.CylinderGeometry(r * 1.35, r * 1.35, r * 2.6, 24), mat(COL.joint));
        j.userData.pick = 'joint' + (i + 1); this.group.add(j); return j;
      });
      this.links = table.map((L, i) => { const m = new T3.Mesh(new T3.CylinderGeometry(r, r, 1, 18), mat(opts.linkColor || COL.link)); m.userData.pick = 'link' + (i + 1); this.group.add(m); return m; });
      this.extra = table.map(() => { const m = new T3.Mesh(new T3.CylinderGeometry(r * 0.9, r * 0.9, 1, 18), mat(opts.linkColor || COL.link)); this.group.add(m); return m; });
      this.frames = [];
      if (opts.frames) for (let i = 0; i <= table.length; i++) { const f = frame(opts.frameSize || 0.16); this.group.add(f); this.frames.push(f); }
      this.tool = new T3.Group(); this.group.add(this.tool);
      if (opts.gripper !== false) this.makeGripper(r);
      this.q = table.map(() => 0);
    }
    makeGripper(r) {
      const palm = box(r * 2.6, r * 0.9, r * 0.7, COL.dark); palm.position.z = r * 0.35; palm.userData.pick = 'end-effector';
      this.fingerL = box(r * 0.4, r * 0.6, r * 1.8, COL.white); this.fingerR = this.fingerL.clone();
      this.fingerL.userData.pick = this.fingerR.userData.pick = 'end-effector';
      this.tool.add(palm, this.fingerL, this.fingerR); this.setGrip(0.6, r);
    }
    setGrip(open, r = this.opts.radius || 0.045) { if (!this.fingerL) return; const s = r * (0.35 + 0.9 * open); this.fingerL.position.set(-s, 0, r * 1.5); this.fingerR.position.set(s, 0, r * 1.5); }
    update(q) {
      this.q = q.slice(); const { T } = M.fkDH(this.table, q); this.T = T;
      const r = this.opts.radius || 0.045;
      for (let i = 0; i < this.table.length; i++) {
        const Ti = T[i], o = M.pof(Ti), z = [Ti[0][2], Ti[1][2], Ti[2][2]];
        const j = this.joints[i]; j.position.set(...o);
        j.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), new T3.Vector3(...z));
        if (this.table[i].type === 'P') j.quaternion.setFromUnitVectors(new T3.Vector3(0, 0, 1), new T3.Vector3(...z));
        // link: from o_{i} along z_{i} by d (offset part) then along x by a
        const L = this.table[i]; const Tn = T[i + 1]; const on = M.pof(Tn);
        const d = L.type === 'P' ? q[i] + (L.offset || 0) : L.d;
        const mid = M.v3.add(o, M.v3.scale(z, d));
        const segA = [o, mid], segB = [mid, on];
        setBetween(this.extra[i], segA[0], segA[1]); this.extra[i].visible = Math.abs(d) > 1e-4;
        setBetween(this.links[i], segB[0], segB[1]); this.links[i].visible = M.v3.norm(M.v3.sub(on, mid)) > 1e-4;
      }
      this.frames.forEach((f, i) => applyT(f, T[i]));
      applyT(this.tool, T[T.length - 1]);
      return T;
    }
    tcp() { return M.pof(this.T[this.T.length - 1]); }
    setVisibleFrames(v) { this.frames.forEach(f => (f.visible = v)); }
    dispose(scene) { scene.remove(this.group); }
  }

  /** standard robot models (DH tables, metres/radians). Labelled educational models. */
  const D = M.D2R;
  const ROBOTS = {
    planar2R: { name: 'Planar 2R', table: [{ a: 0.5, alpha: 0, d: 0, type: 'R' }, { a: 0.3, alpha: 0, d: 0, type: 'R' }] },
    scara: { name: 'SCARA (RRPR)', table: [{ a: 0.4, alpha: 0, d: 0.6, type: 'R' }, { a: 0.3, alpha: Math.PI, d: 0, type: 'R' }, { a: 0, alpha: 0, d: 0, theta: 0, type: 'P', offset: 0.1, min: 0, max: 0.35 }, { a: 0, alpha: 0, d: 0.08, type: 'R' }] },
    articulated: { name: 'Articulated RRR', table: [{ a: 0, alpha: Math.PI / 2, d: 0.4, type: 'R' }, { a: 0.5, alpha: 0, d: 0, type: 'R' }, { a: 0.4, alpha: 0, d: 0, type: 'R' }] },
    /** 6R elbow manipulator with spherical wrist (Spong-type educational model) */
    sixR: { name: '6-DOF elbow + spherical wrist', table: [
      { a: 0, alpha: Math.PI / 2, d: 0.4, type: 'R', min: -170 * D, max: 170 * D },
      { a: 0.45, alpha: 0, d: 0, type: 'R', min: -90 * D, max: 150 * D },
      { a: 0, alpha: Math.PI / 2, d: 0, type: 'R', offset: Math.PI / 2, min: -120 * D, max: 150 * D },
      { a: 0, alpha: -Math.PI / 2, d: 0.4, type: 'R', min: -180 * D, max: 180 * D },
      { a: 0, alpha: Math.PI / 2, d: 0, type: 'R', min: -120 * D, max: 120 * D },
      { a: 0, alpha: 0, d: 0.12, type: 'R', min: -270 * D, max: 270 * D }] }
  };
  RIL.three = { create, cylinderBetween, setBetween, arrow, frame, applyT, box, cyl, points, polyline, updateLine, DHRobot, ROBOTS, COL, mat };
})();
