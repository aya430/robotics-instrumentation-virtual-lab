/* BAIRWABOT – robot.js
   Builds the single reusable BAIRWABOT model: a hierarchical rigid-body rig with
   named joint nodes, 46 conceptual DOF, five-finger hands, parametric face,
   sensor anchors, mass points and ground-contact probes. */
(function () {
  'use strict';
  const T = THREE;
  const BB = (window.BB = window.BB || {});
  BB.D2R = Math.PI / 180;

  BB.PARTS = {
    head: 'Head & Neck Assembly', torso: 'Torso & Chest Frame', armL: 'Left Arm', armR: 'Right Arm',
    handL: 'Left Hand', handR: 'Right Hand', pelvis: 'Pelvis & Hip Assembly', legL: 'Left Leg',
    legR: 'Right Leg', footL: 'Left Foot', footR: 'Right Foot', electronics: 'Electronics Assembly'
  };

  BB.EXPR = {
    neutral: { smile: 0.12 },
    happy: { smile: 0.85, browRaise: 0.3 },
    smile: { smile: 0.6 },
    sad: { smile: -0.8, browTilt: 0.9, browRaise: -0.2 },
    surprise: { open: 0.65, eyeWide: 1, browRaise: 1 },
    thinking: { smile: 0, browTilt: -0.3, lookX: 0.8, lookY: 0.7, asym: 0.7 },
    confusion: { smile: -0.25, asym: 1, browTilt: 0.3, lookX: -0.3 },
    excitement: { smile: 1, open: 0.4, eyeWide: 0.6, browRaise: 0.8 }
  };

  BB.buildRobot = function () {
    const R = { dofs: {}, dofList: [], nodes: {}, mats: {}, partMeshes: {}, probes: [], sensors: [], masses: [], explode: [], soles: {} };
    const base = {
      shell: { color: 0xf1f4f8, roughness: 0.3, metalness: 0.12 },
      silver: { color: 0xaeb8c4, roughness: 0.28, metalness: 0.85 },
      dark: { color: 0x1a222e, roughness: 0.5, metalness: 0.55 },
      led: { color: 0x06222a, emissive: 0x22d3ee, emissiveIntensity: 1.8, roughness: 0.4 },
      sole: { color: 0x0c1016, roughness: 0.9, metalness: 0 },
      visor: { color: 0x05080d, roughness: 0.08, metalness: 0.6 },
      elec: { color: 0x0f3a4a, roughness: 0.5, metalness: 0.4, emissive: 0x0a5a6e, emissiveIntensity: 0.6 }
    };
    function mat(part, kind) {
      const k = part + '/' + kind;
      if (!R.mats[k]) {
        const m = new T.MeshStandardMaterial(base[kind]);
        m.userData = { part, kind, em: base[kind].emissive || 0, emI: base[kind].emissiveIntensity || 1 };
        R.mats[k] = m;
      }
      return R.mats[k];
    }
    function mesh(geo, part, kind, parent, x, y, z, rx, ry, rz) {
      const m = new T.Mesh(geo, mat(part, kind));
      m.position.set(x || 0, y || 0, z || 0);
      m.rotation.set(rx || 0, ry || 0, rz || 0);
      m.castShadow = true; m.receiveShadow = true;
      m.userData.part = part;
      parent.add(m);
      (R.partMeshes[part] = R.partMeshes[part] || []).push(m);
      return m;
    }
    function joint(name, parent, x, y, z, order) {
      const g = new T.Group(); g.name = name; g.position.set(x, y, z);
      if (order) g.rotation.order = order;
      parent.add(g); R.nodes[name] = g; g.userData.basePos = g.position.clone();
      return g;
    }
    function dof(name, label, group, targets, min, max, fn, axisName) {
      const d = { name, label, group, targets, min, max, fn, axisName, node: targets[0].node, axis: targets[0].axis };
      R.dofs[name] = d; R.dofList.push(d);
    }
    const one = (node, axis, k) => [{ node, axis, k }];
    const cap = (r, l) => new T.CapsuleGeometry(r, l, 6, 18);
    const cyl = (a, b, h) => new T.CylinderGeometry(a, b, h, 22);
    const sph = (r) => new T.SphereGeometry(r, 22, 16);
    const rbox = (w, h, d, r) => new T.RoundedBoxGeometry(w, h, d, 4, r);
    const HP = Math.PI / 2;
    const mass = (node, m, x, y, z, name) => R.masses.push({ node, m, v: new T.Vector3(x, y, z), name });
    const probe = (node, x, y, z) => R.probes.push({ node, v: new T.Vector3(x, y, z) });
    const sensor = (key, name, node, x, y, z, where, fn, principle) => {
      const a = new T.Object3D(); a.position.set(x, y, z); node.add(a);
      R.sensors.push({ key, name, anchor: a, where, fn, principle });
    };

    /* ---------- root & pelvis ---------- */
    const root = new T.Group(); root.name = 'BAIRWABOT'; root.rotation.order = 'YXZ';
    R.root = root; R.nodes.root = root;
    mesh(rbox(0.3, 0.15, 0.19, 0.06), 'pelvis', 'shell', root, 0, 0, 0);
    mesh(rbox(0.2, 0.09, 0.2, 0.03), 'pelvis', 'dark', root, 0, -0.035, 0);
    mesh(cyl(0.085, 0.095, 0.07), 'pelvis', 'dark', root, 0, 0.085, 0);
    mesh(rbox(0.1, 0.05, 0.02, 0.008), 'pelvis', 'led', root, 0, 0.01, 0.095);
    mass(root, 8, 0, 0, 0, 'pelvis');
    probe(root, 0, -0.03, -0.13); probe(root, 0, -0.03, 0.12); probe(root, 0.17, 0, 0); probe(root, -0.17, 0, 0);

    /* ---------- torso ---------- */
    const torso = joint('torso', root, 0, 0.09, 0, 'YXZ');
    dof('torsoPitch', 'Torso pitch', 'Torso', one(torso, 'x', 1), -20, 50, 'Bends the trunk forward (+) and backward (−).', 'X (lateral)');
    dof('torsoRoll', 'Torso roll', 'Torso', one(torso, 'z', 1), -25, 25, 'Leans the trunk sideways for posture correction and weight shift.', 'Z (sagittal)');
    dof('torsoYaw', 'Torso yaw', 'Torso', one(torso, 'y', 1), -45, 45, 'Twists the trunk about the spine; + turns the chest to the left.', 'Y (vertical)');
    mesh(cyl(0.075, 0.085, 0.16), 'torso', 'dark', torso, 0, 0.1, 0);                 // abdominal/spine frame
    for (let i = 0; i < 3; i++) mesh(new T.TorusGeometry(0.083, 0.008, 8, 28), 'torso', 'silver', torso, 0, 0.05 + i * 0.045, 0, HP);
    mesh(rbox(0.37, 0.3, 0.215, 0.08), 'torso', 'shell', torso, 0, 0.33, 0);          // chest frame
    mesh(rbox(0.25, 0.17, 0.03, 0.012), 'torso', 'silver', torso, 0, 0.345, 0.1);     // chest plate
    mesh(rbox(0.3, 0.1, 0.19, 0.04), 'torso', 'shell', torso, 0, 0.2, 0.004);
    mesh(new T.TorusGeometry(0.03, 0.007, 10, 30), 'torso', 'led', torso, 0, 0.36, 0.117);
    mesh(new T.CircleGeometry(0.02, 24), 'torso', 'led', torso, 0, 0.36, 0.117);
    mesh(rbox(0.26, 0.27, 0.08, 0.03), 'torso', 'dark', torso, 0, 0.32, -0.125);       // back support / battery compartment
    mesh(rbox(0.16, 0.04, 0.02, 0.006), 'torso', 'led', torso, 0, 0.42, -0.165);
    for (const s of [1, -1]) {
      mesh(cyl(0.062, 0.062, 0.05), 'torso', 'dark', torso, s * 0.19, 0.4, 0, 0, 0, HP); // shoulder mounting brackets
      mesh(rbox(0.012, 0.11, 0.012, 0.004), 'torso', 'led', torso, s * 0.1, 0.2, 0.1);
    }
    // name plate
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
    const cx = cv.getContext('2d'); cx.fillStyle = '#67e8f9'; cx.font = '700 62px Arial, Helvetica, sans-serif';
    cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('BAIRWABOT', 256, 52);
    const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace;
    const plate = new T.Mesh(new T.PlaneGeometry(0.2, 0.0375), new T.MeshBasicMaterial({ map: tx, transparent: true }));
    plate.position.set(0, 0.292, 0.1165); torso.add(plate); R.plate = plate;
    mass(torso, 16, 0, 0.28, 0, 'torso');
    probe(torso, 0, 0.33, 0.13); probe(torso, 0, 0.33, -0.18); probe(torso, 0.2, 0.4, 0); probe(torso, -0.2, 0.4, 0);

    /* electronics (inside chest) */
    const elec = joint('electronics', torso, 0, 0.3, 0);
    const em = (g, x, y, z) => mesh(g, 'electronics', 'elec', elec, x, y, z);
    R.elecItems = {
      computer: em(new T.BoxGeometry(0.15, 0.1, 0.035), 0, 0.06, 0.04),
      battery: em(new T.BoxGeometry(0.2, 0.16, 0.05), 0, 0, -0.04),
      pdb: em(new T.BoxGeometry(0.12, 0.05, 0.012), 0, -0.07, 0.045),
      fan: em(new T.CylinderGeometry(0.03, 0.03, 0.02, 16), 0.1, 0.06, 0.03)
    };
    R.elecItems.fan.rotation.x = HP;

    /* ---------- head & neck ---------- */
    const neck = joint('neck', torso, 0, 0.47, 0, 'YXZ');
    dof('neckYaw', 'Neck yaw', 'Head & Neck', one(neck, 'y', 1), -70, 70, 'Turns the head left (+) and right (−) to look around and track people.', 'Y (vertical)');
    dof('neckPitch', 'Neck pitch', 'Head & Neck', one(neck, 'x', 1), -30, 40, 'Nods the head down (+) and up (−).', 'X (lateral)');
    dof('neckRoll', 'Neck roll', 'Head & Neck', one(neck, 'z', 1), -25, 25, 'Tilts the head towards a shoulder; used for expressive gestures.', 'Z (sagittal)');
    mesh(cyl(0.038, 0.045, 0.08), 'head', 'dark', torso, 0, 0.485, 0);
    mesh(new T.TorusGeometry(0.043, 0.006, 8, 24), 'head', 'led', torso, 0, 0.49, 0, HP);
    const head = neck;
    mesh(rbox(0.19, 0.22, 0.205, 0.075), 'head', 'shell', head, 0, 0.1, 0);
    mesh(rbox(0.166, 0.128, 0.03, 0.022), 'head', 'visor', head, 0, 0.108, 0.094);
    mesh(rbox(0.11, 0.035, 0.05, 0.014), 'head', 'silver', head, 0, 0.012, 0.075);    // jaw / speaker grille
    for (const s of [1, -1]) {
      mesh(cyl(0.036, 0.036, 0.02), 'head', 'dark', head, s * 0.097, 0.1, 0, 0, 0, HP);
      mesh(new T.TorusGeometry(0.026, 0.005, 8, 24), 'head', 'led', head, s * 0.108, 0.1, 0, 0, HP);
      mesh(cyl(0.0085, 0.0085, 0.012), 'head', 'dark', head, s * 0.032, 0.188, 0.099, HP); // depth camera pair
    }
    mesh(cyl(0.012, 0.012, 0.014), 'head', 'dark', head, 0, 0.188, 0.1, HP);          // RGB camera
    mesh(cyl(0.034, 0.038, 0.022), 'head', 'dark', head, 0, 0.221, 0);                // LiDAR puck
    mesh(new T.TorusGeometry(0.036, 0.004, 8, 24), 'head', 'led', head, 0, 0.222, 0, HP);
    mass(head, 4, 0, 0.1, 0, 'head');
    probe(head, 0, 0.22, 0); probe(head, 0, 0.1, 0.12); probe(head, 0, 0.1, -0.11); probe(head, 0.11, 0.1, 0); probe(head, -0.11, 0.1, 0);

    /* face (parametric, morph-target equivalent) */
    const fz = 0.1105;
    const glow = new T.MeshBasicMaterial({ color: 0x67e8f9 });
    const glow2 = new T.MeshBasicMaterial({ color: 0xe0fbff });
    const F = { eyes: [], brows: [], up: [], lo: [] };
    for (const s of [1, -1]) {
      const e = new T.Group(); e.position.set(s * 0.04, 0.125, fz); head.add(e);
      e.add(new T.Mesh(new T.CircleGeometry(0.0175, 28), glow));
      const core = new T.Mesh(new T.CircleGeometry(0.007, 20), glow2); core.position.z = 0.0006; e.add(core);
      e.userData = { bx: s * 0.04, by: 0.125 }; F.eyes.push(e);
      const b = new T.Mesh(new T.PlaneGeometry(0.032, 0.005), glow); b.position.set(s * 0.04, 0.153, fz); head.add(b);
      b.userData = { s, by: 0.153 }; F.brows.push(b);
    }
    const NSEG = 11;
    for (let i = 0; i < NSEG; i++) {
      for (const arr of [F.up, F.lo]) {
        const sgm = new T.Mesh(new T.PlaneGeometry(0.0072, 0.0042), glow); sgm.position.z = fz; head.add(sgm); arr.push(sgm);
      }
    }
    const face = {
      p: { blink: 0, smile: 0.12, open: 0, browRaise: 0, browTilt: 0, eyeWide: 0, lookX: 0, lookY: 0, asym: 0 },
      t: { smile: 0.12, open: 0, browRaise: 0, browTilt: 0, eyeWide: 0, lookX: 0, lookY: 0, asym: 0 },
      expr: 'neutral', speaking: false, pulse: 0, _bt: 2, _b: 0, time: 0, track: null, holdBlink: false,
      set(name) {
        const e = BB.EXPR[name] || BB.EXPR.neutral; this.expr = BB.EXPR[name] ? name : 'neutral';
        for (const k in this.t) this.t[k] = e[k] || 0;
      },
      blinkNow() { this._b = 0.16; },
      update(dt) {
        this.time += dt; const p = this.p, t = this.t;
        this._bt -= dt; if (this._bt < 0) { this._b = 0.16; this._bt = 2.4 + Math.random() * 3; }
        if (this._b > 0) this._b -= dt;
        const blink = (this._b > 0 || this.holdBlink) ? 1 : 0;
        let open = t.open;
        if (this.speaking) {
          const s = Math.abs(Math.sin(this.time * 13)) * (0.55 + 0.45 * Math.sin(this.time * 4.3 + 1));
          open = Math.max(open, (0.15 + 0.8 * s) * (1 - this.pulse));
          this.pulse = Math.max(0, this.pulse - dt * 9);
        }
        const a = 1 - Math.exp(-12 * dt);
        for (const k in t) if (k !== 'open') p[k] += ((this.track && (k === 'lookX' || k === 'lookY') ? this.track[k] : t[k]) - p[k]) * a;
        p.open += (open - p.open) * (1 - Math.exp(-28 * dt));
        p.blink += (blink - p.blink) * (1 - Math.exp(-45 * dt));
        for (const e of F.eyes) {
          e.scale.set(1 + 0.15 * p.eyeWide, Math.max(0.06, (1 - 0.94 * p.blink) * (1 + 0.25 * p.eyeWide) * (1 - 0.18 * Math.max(0, p.smile))), 1);
          e.position.x = e.userData.bx + p.lookX * 0.009; e.position.y = e.userData.by + p.lookY * 0.006;
        }
        for (const b of F.brows) {
          const s = b.userData.s;
          b.position.y = b.userData.by + 0.008 * p.browRaise + (s > 0 ? 0.009 * p.asym : -0.003 * p.asym);
          b.rotation.z = -s * p.browTilt * 0.45;
        }
        for (let i = 0; i < NSEG; i++) {
          const x = -1 + (2 * i) / (NSEG - 1), c = p.smile * 0.012 * (x * x - 0.4), w = 1 - x * x;
          F.up[i].position.set(x * 0.032, 0.073 + c + p.open * 0.009 * w, fz);
          F.lo[i].position.set(x * 0.032, 0.0718 + c - p.open * 0.017 * w, fz);
        }
      }
    };
    R.face = face; R.faceParts = F;

    /* ---------- arms & hands ---------- */
    function buildHand(S, part, wrist) {
      const h = new T.Group(); wrist.add(h); if (S === 'L') h.scale.x = -1;   // built as a right hand, mirrored for the left
      R.nodes['hand' + S] = h;
      const hm = (g, kind, parent, x, y, z, rx, ry, rz) => mesh(g, part, kind, parent, x, y, z, rx, ry, rz);
      hm(rbox(0.03, 0.085, 0.082, 0.012), 'shell', h, 0, -0.052, 0);
      hm(rbox(0.006, 0.06, 0.06, 0.002), 'dark', h, 0.016, -0.055, 0);       // tactile palm pad
      const fingers = [['Index', 0.03, 1], ['Middle', 0.01, 1.08], ['Ring', -0.01, 1], ['Little', -0.03, 0.82]];
      const fd = {};
      for (const [nm, z, sc] of fingers) {
        const L = [0.036 * sc, 0.026 * sc, 0.021 * sc]; let parent = h, y = -0.096; const tg = [];
        for (let i = 0; i < 3; i++) {
          const g = new T.Group(); g.position.set(i === 0 ? 0.002 : 0, y, i === 0 ? z : 0); parent.add(g);
          hm(sph(0.0095), 'dark', g, 0, 0, 0);
          hm(cap(0.0082, L[i] - 0.012), i === 2 ? 'silver' : 'shell', g, 0, -L[i] / 2, 0);
          tg.push({ node: g, axis: 'z', k: [1, 0.95, 0.7][i] }); parent = g; y = -L[i];
        }
        fd[nm] = tg;
      }
      const g0 = new T.Group(); g0.position.set(0.006, -0.028, 0.04); h.add(g0);
      const g1 = new T.Group(); g1.rotation.x = -0.75; g0.add(g1);
      hm(sph(0.012), 'dark', g1, 0, 0, 0);
      hm(cap(0.0095, 0.026), 'shell', g1, 0, -0.02, 0);
      const g2 = new T.Group(); g2.position.y = -0.04; g1.add(g2);
      hm(sph(0.0098), 'dark', g2, 0, 0, 0);
      hm(cap(0.0088, 0.02), 'silver', g2, 0, -0.016, 0);
      const grip = new T.Object3D(); grip.position.set(0.04, -0.085, 0.005); h.add(grip); R.nodes['grip' + S] = grip;
      const side = S === 'L' ? 'Left' : 'Right', grp = side + ' Hand';
      dof(S + 'ThumbOpp', side + ' thumb opposition', grp, [{ node: g0, axis: 'z', k: 0.95 }, { node: g0, axis: 'y', k: -0.35 }], 0, 80, 'Swings the thumb across the palm so it can oppose the fingers – essential for precision grasps.', 'palm Z');
      dof(S + 'ThumbFlex', side + ' thumb flexion', grp, [{ node: g1, axis: 'z', k: 0.45 }, { node: g2, axis: 'z', k: 0.8 }], 0, 90, 'Curls the thumb joints to close on an object.', 'thumb Z');
      for (const [nm] of fingers) dof(S + nm, side + ' ' + nm.toLowerCase() + ' finger flexion', grp, fd[nm], 0, 90, 'Coupled flexion of the three ' + nm.toLowerCase() + '-finger joints (one conceptual DOF, expandable to per-phalanx DOF).', 'finger Z');
      mass(h, 0.5, 0, -0.07, 0, 'hand' + S);
      probe(h, 0, -0.16, 0); probe(h, 0, -0.05, 0.05);
    }
    function buildArm(S, s) {
      const part = 'arm' + S, side = S === 'L' ? 'Left' : 'Right', grp = side + ' Arm';
      const sh = joint('sh' + S, torso, s * 0.228, 0.4, 0, 'XZY');
      dof(S + 'ShPitch', side + ' shoulder pitch', grp, one(sh, 'x', -1), -60, 180, 'Raises the arm forward (+) or swings it backward (−).', 'X (lateral)');
      dof(S + 'ShRoll', side + ' shoulder roll', grp, one(sh, 'z', s), -25, 150, 'Abducts the arm away from the body (+).', 'Z (sagittal)');
      dof(S + 'ShYaw', side + ' shoulder yaw', grp, one(sh, 'y', s), -90, 90, 'Rotates the upper arm about its own long axis.', 'upper-arm axis');
      mesh(sph(0.06), part, 'dark', sh, 0, 0, 0);
      mesh(new T.SphereGeometry(0.068, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.45), part, 'shell', sh, s * 0.004, 0.004, 0);
      mesh(cap(0.044, 0.15), part, 'shell', sh, 0, -0.145, 0);
      mesh(cyl(0.047, 0.047, 0.02), part, 'silver', sh, 0, -0.075, 0);
      const el = joint('el' + S, sh, 0, -0.29, 0, 'XYZ');
      dof(S + 'Elbow', side + ' elbow pitch', grp, one(el, 'x', -1), 0, 140, 'Flexes the forearm towards the upper arm.', 'X (lateral)');
      dof(S + 'Forearm', side + ' forearm rotation', grp, one(el, 'y', s), -90, 90, 'Pronation / supination – rotates the forearm and hand about the forearm axis.', 'forearm axis');
      mesh(cyl(0.044, 0.044, 0.096), part, 'dark', el, 0, 0, 0, 0, 0, HP);
      mesh(new T.TorusGeometry(0.044, 0.005, 8, 24), part, 'led', el, s * 0.05, 0, 0, 0, HP);
      mesh(cyl(0.041, 0.032, 0.19), part, 'shell', el, 0, -0.125, 0);
      mesh(cyl(0.035, 0.033, 0.02), part, 'silver', el, 0, -0.215, 0);
      const wr = joint('wr' + S, el, 0, -0.25, 0, 'XZY');
      dof(S + 'WrPitch', side + ' wrist pitch', grp, one(wr, 'x', -1), -60, 60, 'Flexes / extends the hand at the wrist.', 'X (lateral)');
      dof(S + 'WrYaw', side + ' wrist yaw', grp, one(wr, 'z', s), -30, 30, 'Radial / ulnar deviation of the hand.', 'Z');
      dof(S + 'WrRoll', side + ' wrist roll', grp, one(wr, 'y', s), -90, 90, 'Rolls the hand about the wrist axis for tool use and key turning.', 'hand axis');
      mesh(sph(0.031), part, 'dark', wr, 0, 0, 0);
      buildHand(S, 'hand' + S, wr);
      mass(sh, 2, 0, -0.14, 0, 'upperArm' + S); mass(el, 1.3, 0, -0.12, 0, 'forearm' + S);
      probe(el, 0, 0, -0.05); probe(el, 0, 0, 0.05);
      R.explode.push({ node: sh, dir: new T.Vector3(s * 0.22, 0.03, 0) }, { node: wr, dir: new T.Vector3(0, -0.12, 0) });
    }

    /* ---------- legs & feet ---------- */
    function buildLeg(S, s) {
      const part = 'leg' + S, fpart = 'foot' + S, side = S === 'L' ? 'Left' : 'Right', grp = side + ' Leg';
      const hip = joint('hip' + S, root, s * 0.1, -0.04, 0, 'YZX');
      dof(S + 'HipPitch', side + ' hip pitch', grp, one(hip, 'x', -1), -30, 125, 'Swings the thigh forward (+, flexion) and backward (−, extension); the main walking DOF.', 'X (lateral)');
      dof(S + 'HipRoll', side + ' hip roll', grp, one(hip, 'z', s), -25, 45, 'Abducts the leg sideways (+); shifts body weight between the feet.', 'Z (sagittal)');
      dof(S + 'HipYaw', side + ' hip yaw', grp, one(hip, 'y', s), -40, 40, 'Rotates the leg about the vertical axis for turning.', 'Y (vertical)');
      mesh(sph(0.072), part, 'dark', hip, 0, 0, 0);
      mesh(cyl(0.05, 0.05, 0.03), part, 'silver', hip, s * 0.065, 0, 0, 0, 0, HP);    // actuator housing
      mesh(cap(0.064, 0.24), part, 'shell', hip, 0, -0.21, 0);
      mesh(rbox(0.09, 0.2, 0.03, 0.012), part, 'silver', hip, 0, -0.2, 0.052);
      const knee = joint('knee' + S, hip, 0, -0.42, 0);
      dof(S + 'Knee', side + ' knee pitch', grp, one(knee, 'x', 1), 0, 140, 'Flexes the shank backward; absorbs impact and provides foot clearance.', 'X (lateral)');
      mesh(cyl(0.056, 0.056, 0.124), part, 'dark', knee, 0, 0, 0, 0, 0, HP);
      mesh(new T.TorusGeometry(0.056, 0.005, 8, 24), part, 'led', knee, s * 0.064, 0, 0, 0, HP);
      mesh(rbox(0.085, 0.075, 0.03, 0.012), part, 'silver', knee, 0, 0, 0.055);
      mesh(cyl(0.057, 0.04, 0.3), part, 'shell', knee, 0, -0.2, 0);
      mesh(rbox(0.07, 0.17, 0.03, 0.012), part, 'silver', knee, 0, -0.17, -0.04);
      const ank = joint('ank' + S, knee, 0, -0.4, 0, 'XZY');
      dof(S + 'AnkPitch', side + ' ankle pitch', grp, one(ank, 'x', -1), -50, 45, 'Dorsiflexion (+, toes up) and plantarflexion (−); controls push-off and balance.', 'X (lateral)');
      dof(S + 'AnkRoll', side + ' ankle roll', grp, one(ank, 'z', s), -25, 25, 'Tilts the foot sideways to keep the sole flat while the body sways.', 'Z (sagittal)');
      mesh(sph(0.041), part, 'dark', ank, 0, 0, 0);
      mesh(rbox(0.07, 0.03, 0.06, 0.01), fpart, 'dark', ank, 0, -0.04, 0);            // ankle mounting bracket
      mesh(rbox(0.1, 0.05, 0.185, 0.02), fpart, 'shell', ank, 0, -0.056, 0.03);
      mesh(rbox(0.1, 0.042, 0.075, 0.016), fpart, 'silver', ank, 0, -0.06, 0.15);     // toe
      mesh(rbox(0.104, 0.016, 0.262, 0.006), fpart, 'sole', ank, 0, -0.082, 0.06);    // sole
      mesh(rbox(0.06, 0.012, 0.01, 0.003), fpart, 'led', ank, 0, -0.045, -0.063);
      mass(hip, 6, 0, -0.2, 0, 'thigh' + S); mass(knee, 3.5, 0, -0.18, 0, 'shank' + S); mass(ank, 1.2, 0, -0.06, 0.05, 'foot' + S);
      const corners = [[0.05, -0.07], [-0.05, -0.07], [0.05, 0.19], [-0.05, 0.19]].map(c => new T.Vector3(c[0], -0.09, c[1]));
      corners.forEach(c => probe(ank, c.x, c.y, c.z));
      probe(knee, 0, 0, 0.075); probe(knee, 0, -0.06, 0);
      R.soles[S] = { node: ank, c: new T.Vector3(0, -0.09, 0.06), heel: new T.Vector3(0, -0.09, -0.07), toe: new T.Vector3(0, -0.09, 0.19), corners };
      R.explode.push({ node: hip, dir: new T.Vector3(s * 0.12, -0.14, 0) }, { node: ank, dir: new T.Vector3(0, -0.12, 0) });
    }
    buildArm('L', 1); buildArm('R', -1); buildLeg('L', 1); buildLeg('R', -1);
    R.explode.push({ node: torso, dir: new T.Vector3(0, 0.14, 0) }, { node: neck, dir: new T.Vector3(0, 0.2, 0) }, { node: elec, dir: new T.Vector3(0, 0.05, -0.5) });

    // order DOF list to match the 46-DOF table
    const order = ['Head & Neck', 'Torso', 'Left Arm', 'Right Arm', 'Left Hand', 'Right Hand', 'Left Leg', 'Right Leg'];
    R.dofList.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
    R.dofGroups = order;

    /* ---------- sensors & actuators (anchors for visualisation) ---------- */
    sensor('rgb', 'RGB camera', head, 0, 0.188, 0.11, 'Centre of the forehead', 'Captures colour images for object, face and scene recognition.', 'A lens focuses light on a CMOS image sensor; each pixel converts photons to charge, read out as red, green and blue intensities.');
    sensor('depth', 'Depth camera (stereo pair)', head, 0.032, 0.188, 0.11, 'Either side of the RGB camera', 'Measures the distance to every pixel so the robot can localise objects in 3D.', 'Two cameras separated by a baseline b see a point with disparity d; depth Z = f·b / d (stereo triangulation).');
    sensor('mic', 'Microphone array', head, 0.11, 0.1, 0, 'Ear housings on both sides of the head', 'Captures speech and estimates the direction of the talker.', 'MEMS diaphragms convert sound pressure to voltage; time-difference-of-arrival between microphones gives the source direction (beam-forming).');
    sensor('speaker', 'Speaker', head, 0, 0.012, 0.105, 'Jaw grille below the mouth display', 'Plays synthesized speech and alert tones.', 'A voice coil in a magnetic field drives a cone; the audio amplifier current is proportional to the speech waveform.');
    sensor('imu', 'IMU (inertial measurement unit)', root, 0, 0.02, 0, 'Pelvis centre (a second IMU sits in the head)', 'Estimates body orientation, angular rate and acceleration for balance and fall detection.', 'MEMS accelerometers and gyroscopes are fused (complementary / Kalman filter) into roll, pitch and yaw estimates.');
    sensor('encoder', 'Joint encoders', R.nodes.elR, -0.05, 0, 0, 'Inside every joint actuator (46 conceptual DOF)', 'Measure each joint angle for closed-loop position control.', 'A magnetic or optical disc generates a digital code per revolution; resolution = 360° / 2ⁿ for an n-bit absolute encoder.');
    sensor('ft', 'Force / torque sensors', R.nodes.ankR, 0, -0.03, 0, 'Ankles and wrists', 'Measure contact forces and moments to compute the centre of pressure and grip force.', 'Strain gauges on a flexure change resistance under load; a calibration matrix maps bridge voltages to Fx, Fy, Fz, Mx, My, Mz.');
    sensor('pressure', 'Foot pressure sensors', R.nodes.ankL, 0, -0.09, 0.06, 'Four cells under each sole (heel and toe)', 'Detect ground contact and the distribution of load over the foot.', 'Force-sensitive resistors or load cells drop in resistance as pressure rises; the weighted mean of cell positions is the CoP.');
    sensor('lidar', 'LiDAR', head, 0, 0.235, 0, 'Top of the head', 'Scans the surroundings for mapping, localisation and obstacle detection.', 'A rotating laser emits pulses; range = c·Δt / 2 from the time of flight of each returned pulse.');
    sensor('motor', 'Motor actuators', R.nodes.kneeR, -0.07, 0, 0, 'Every joint – shown here at the right knee', 'Produce the joint torques that move the links.', 'A BLDC motor drives a harmonic or planetary reducer of ratio N: output torque ≈ N·η·Kt·I, output speed = motor speed / N.');

    /* ---------- material helpers ---------- */
    R.setWire = (on) => { for (const k in R.mats) R.mats[k].wireframe = on; };
    R.isolate = (parts) => {          // parts: null → everything opaque
      for (const k in R.mats) {
        const m = R.mats[k], sel = !parts || parts.includes(m.userData.part);
        m.transparent = !sel; m.opacity = sel ? 1 : 0.08; m.depthWrite = sel;
        if (m.userData.kind === 'shell' || m.userData.kind === 'silver') {
          m.emissive.setHex(parts && sel ? 0x0e7490 : m.userData.em); m.emissiveIntensity = parts && sel ? 0.55 : m.userData.emI;
        }
        m.needsUpdate = true;
      }
      R.plate.visible = !parts || parts.includes('torso');
      for (const k in F) F[k].forEach(o => (o.visible = !parts || parts.includes('head')));
    };
    R.xray = (on) => {                // translucent shells – reveals electronics and joints
      for (const k in R.mats) {
        const m = R.mats[k], sh = m.userData.kind === 'shell' || m.userData.kind === 'silver';
        if (sh) { m.transparent = on; m.opacity = on ? 0.22 : 1; m.depthWrite = !on; m.needsUpdate = true; }
      }
    };
    R.highlightJoints = (on) => {
      for (const k in R.mats) {
        const m = R.mats[k];
        if (m.userData.kind === 'dark') { m.emissive.setHex(on ? 0xf59e0b : 0); m.emissiveIntensity = on ? 0.9 : 1; }
      }
    };
    R.setExplode = (e) => { for (const x of R.explode) x.node.position.copy(x.node.userData.basePos).addScaledVector(x.dir, e); };
    R.TOTAL_MASS = R.masses.reduce((a, b) => a + b.m, 0);
    R.HEIGHT = 1.72;
    return R;
  };
})();
