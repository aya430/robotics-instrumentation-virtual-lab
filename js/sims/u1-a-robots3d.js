/* Unit I — 3D robot models: anatomy, configurations, DOF, work envelope, coordinate frames */
(function () {
  const RIL = window.RIL, M = RIL.M, D2R = M.D2R, R2D = M.R2D;
  const K = () => RIL.three;

  /* hierarchical arm helper used by anatomy view */
  function seg(group, color, r) {
    const T3 = THREE; const m = new T3.Mesh(new T3.CylinderGeometry(r, r, 1, 18), K().mat(color)); group.add(m);
    return { mesh: m, set(a, b) { K().setBetween(m, a, b); } };
  }

  /* ================= Robot anatomy ================= */
  const ANAT = {
    base: ['Base (link 0)', 'Fixed link bolted to the floor or a pedestal. Carries the whole manipulator and houses the cable entry.'],
    waist: ['Waist / trunk – joint 1', 'Rotation about the vertical axis. With the shoulder and elbow it positions the wrist centre (arm and body, joints 1–3).'],
    shoulder: ['Shoulder – joint 2', 'Horizontal revolute axis that raises and lowers the upper arm.'],
    upperarm: ['Upper arm – link 2', 'Rigid link between shoulder and elbow. Its length sets much of the reach.'],
    elbow: ['Elbow – joint 3', 'Second horizontal revolute axis; bends the forearm relative to the upper arm.'],
    forearm: ['Forearm – link 3', 'Link from elbow to wrist. Often hollow to route cables to the wrist motors.'],
    wrist: ['Wrist – joints 4, 5, 6', 'Roll, pitch and yaw (roll) axes that orient the tool. When the three axes intersect it is a spherical wrist, which simplifies inverse kinematics.'],
    effector: ['End effector (gripper) and TCP', 'Task-specific tool on the wrist flange. The tool centre point (TCP) between the fingers is the programmed point.'],
    actuator: ['Actuation system', 'Each joint has a servo motor with brake and encoder driving a speed reducer (harmonic drive or RV gear). Drives in the controller cabinet power the motors.']
  };
  RIL.defineSim({
    id: 'robot-anatomy', title: 'Robot anatomy explorer', unit: 1, category: 'robot-configurations', kind: '3d', auto: true, autoDefault: false,
    description: 'Six-axis articulated arm with selectable components (base, waist, shoulder, links, elbow, wrist, end effector, actuators) and live joint motion.',
    help: 'Click any part of the robot to select it; its name and function appear in the panel. Move the joint sliders, or switch to Automatic to cycle through a pick motion.',
    camera: { position: [1.9, -1.9, 1.4], target: [0.25, 0, 0.6] },
    controls: [
      { id: 'q1', label: 'Waist θ₁', min: -170, max: 170, value: 20, unit: '°' },
      { id: 'q2', label: 'Shoulder θ₂', min: -60, max: 90, value: 10, unit: '°' },
      { id: 'q3', label: 'Elbow θ₃', min: -120, max: 80, value: 10, unit: '°' },
      { id: 'q4', label: 'Wrist roll θ₄', min: -180, max: 180, value: 0, unit: '°' },
      { id: 'q5', label: 'Wrist pitch θ₅', min: -110, max: 110, value: 30, unit: '°' },
      { id: 'q6', label: 'Wrist roll θ₆', min: -180, max: 180, value: 0, unit: '°' },
      { id: 'grip', label: 'Gripper opening', min: 0, max: 1, step: 0.01, value: 0.6 },
      { id: 'labels', type: 'toggle', label: 'Show all component labels', value: true },
      { id: 'part', type: 'select', label: 'Select component', string: true, value: 'none', options: [['none', '— click the robot or choose —']].concat(Object.keys(ANAT).map(k => [k, ANAT[k][0]])) }
    ],
    readouts: [{ id: 'sel', label: 'Selected' }, { id: 'x', label: 'TCP x', unit: 'm' }, { id: 'y', label: 'TCP y', unit: 'm' }, { id: 'z', label: 'TCP z', unit: 'm' }, { id: 'dof', label: 'Degrees of freedom' }],
    panels: [{ id: 'info', title: 'Component function' }],
    setup(S) {
      const k = K(), T3 = THREE, sc = S.three.scene, C = k.COL; const G = {};
      const pick = (o, n) => { o.traverse(m => (m.userData.pick = n)); return o; };
      G.base = pick(k.cyl(0.16, 0.12, C.base), 'base'); G.base.position.z = 0.06; sc.add(G.base);
      G.waist = new T3.Group(); G.waist.position.z = 0.12; sc.add(G.waist);
      const turret = pick(k.cyl(0.12, 0.22, 0x5a6f96), 'waist'); turret.position.z = 0.11; G.waist.add(turret);
      G.sh = new T3.Group(); G.sh.position.set(0, 0, 0.3); G.waist.add(G.sh);
      const shJ = pick(k.cyl(0.08, 0.2, C.joint, 'y'), 'shoulder'); shJ.rotation.set(0, 0, 0); G.sh.add(shJ);
      const m1 = pick(k.cyl(0.055, 0.09, 0x1d2b48, 'y'), 'actuator'); m1.position.y = -0.15; G.sh.add(m1);
      const ua = pick(k.box(0.09, 0.1, 0.5, C.link), 'upperarm'); ua.position.z = 0.25; G.sh.add(ua);
      G.el = new T3.Group(); G.el.position.z = 0.5; G.sh.add(G.el);
      const elJ = pick(k.cyl(0.065, 0.17, C.joint, 'y'), 'elbow'); G.el.add(elJ);
      const m2 = pick(k.cyl(0.045, 0.08, 0x1d2b48, 'y'), 'actuator'); m2.position.y = 0.13; G.el.add(m2);
      const fa = pick(k.box(0.42, 0.08, 0.08, C.link), 'forearm'); fa.position.x = 0.21; G.el.add(fa);
      G.w4 = new T3.Group(); G.w4.position.x = 0.42; G.el.add(G.w4);
      const w4m = pick(k.cyl(0.045, 0.07, C.joint, 'x'), 'wrist'); G.w4.add(w4m);
      G.w5 = new T3.Group(); G.w5.position.x = 0.06; G.w4.add(G.w5);
      const w5m = pick(k.cyl(0.04, 0.1, 0xf6c35a, 'y'), 'wrist'); G.w5.add(w5m);
      G.w6 = new T3.Group(); G.w6.position.x = 0.05; G.w5.add(G.w6);
      const fl = pick(k.cyl(0.035, 0.03, 0xf6c35a, 'x'), 'wrist'); fl.position.x = 0.015; G.w6.add(fl);
      G.tool = new T3.Group(); G.tool.position.x = 0.03; G.w6.add(G.tool);
      const palm = pick(k.box(0.03, 0.12, 0.05, C.dark), 'effector'); palm.position.x = 0.015; G.tool.add(palm);
      G.fL = pick(k.box(0.08, 0.015, 0.03, C.white), 'effector'); G.fR = G.fL.clone(); pick(G.fR, 'effector'); G.tool.add(G.fL, G.fR);
      G.tcp = new T3.Group(); G.tcp.position.x = 0.1; G.tool.add(G.tcp);
      G.tcpFrame = k.frame(0.12); G.tcp.add(G.tcpFrame);
      S.G = G; S.meshes = {};
      sc.traverse(o => { if (o.isMesh && o.userData.pick) (S.meshes[o.userData.pick] = S.meshes[o.userData.pick] || []).push(o); });
      const L = S.three.label.bind(S.three);
      S.lbl = { base: L('Base', G.base, 'dim', [0.2, 0, 0]), waist: L('Waist (J1)', turret, 'dim', [0.15, 0, 0]), shoulder: L('Shoulder (J2)', shJ, 'dim', [0, -0.12, 0.05]), upperarm: L('Upper arm', ua, 'dim', [0.08, 0, 0]), elbow: L('Elbow (J3)', elJ, 'dim', [0, 0, 0.1]), forearm: L('Forearm', fa, 'dim', [0, 0, 0.08]), wrist: L('Wrist (J4–J6)', G.w5, 'dim', [0, 0, 0.09]), effector: L('End effector / TCP', G.tcp, 'dim', [0, 0, 0.06]), actuator: L('Joint motor', m1, 'dim', [0, -0.08, 0]) };
      S.three.onPick(name => { S.setParam('part', name || 'none'); });
    },
    reset(S) { S.sel = S.p.part; },
    onControl(S, id, v) { if (id === 'part') S.sel = v; },
    step(S, dt) {
      if (!S.auto) return;
      const t = S.t;
      ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].forEach((k, i) => S.setParam(k, +(([60, 35, 40, 90, 50, 120][i]) * Math.sin(0.5 * t + i)).toFixed(1), true));
      S.setParam('grip', +(0.5 + 0.5 * Math.sin(1.1 * t)).toFixed(2), true);
    },
    draw(S) {
      const G = S.G, p = S.p;
      G.waist.rotation.z = p.q1 * D2R; G.sh.rotation.y = p.q2 * D2R; G.el.rotation.y = p.q3 * D2R;
      G.w4.rotation.x = p.q4 * D2R; G.w5.rotation.y = -p.q5 * D2R; G.w6.rotation.x = p.q6 * D2R;
      const s = 0.012 + 0.04 * p.grip; G.fL.position.set(0.07, -s, 0); G.fR.position.set(0.07, s, 0);
      Object.entries(S.meshes).forEach(([n, arr]) => arr.forEach(m => { if (!m.material._cloned) { m.material = m.material.clone(); m.material._cloned = true; } m.material.emissive = new THREE.Color(n === S.sel ? 0x6a4500 : 0x000000); }));
      Object.entries(S.lbl).forEach(([n, L]) => { L.visible = p.labels || n === S.sel; L.el.className = 'label3d' + (n === S.sel ? '' : ' dim'); });
      S.three.scene.updateMatrixWorld(true);
      const v = new THREE.Vector3(); G.tcp.getWorldPosition(v);
      S.set('x', v.x); S.set('y', v.y); S.set('z', v.z); S.set('dof', '6 (3 arm + 3 wrist)');
      const info = ANAT[S.sel]; S.set('sel', info ? info[0] : '—');
      const html = info ? `<b style="color:#fff">${info[0]}</b><p style="margin:.3em 0 0">${info[1]}</p>` : '<p style="margin:0">Click a part of the robot (or use the selector) to see what it does.</p>';
      if (S._lastInfo !== html) { S.panel('info').innerHTML = html; S._lastInfo = html; }
    }
  });

  /* ================= Robot configurations ================= */
  const CFG = {
    cartesian: { name: 'Cartesian (PPP)', joints: [['P', 'x = d₁', 0, 0.8, 'm'], ['P', 'y = d₂', 0, 0.6, 'm'], ['P', 'z = d₃', 0.1, 0.6, 'm']], env: 'Rectangular box', axes: 3 },
    cylindrical: { name: 'Cylindrical (RPP)', joints: [['R', 'θ', -150, 150, '°'], ['P', 'z', 0.2, 0.9, 'm'], ['P', 'r', 0.3, 0.8, 'm']], env: 'Hollow cylinder', axes: 3 },
    spherical: { name: 'Spherical / polar (RRP)', joints: [['R', 'θ', -150, 150, '°'], ['R', 'φ (elevation)', -30, 60, '°'], ['P', 'r', 0.4, 1.0, 'm']], env: 'Portion of spherical shell', axes: 3 },
    scara: { name: 'SCARA (RRP, vertical axes)', joints: [['R', 'θ₁', -130, 130, '°'], ['R', 'θ₂', -140, 140, '°'], ['P', 'd₃ (quill)', 0, 0.3, 'm']], env: 'Annular cylinder', axes: 4 },
    articulated: { name: 'Articulated (RRR)', joints: [['R', 'θ₁ (waist)', -170, 170, '°'], ['R', 'θ₂ (shoulder)', -20, 110, '°'], ['R', 'θ₃ (elbow)', -150, 20, '°']], env: 'Approx. sphere, irregular boundary', axes: 6 },
    parallel: { name: 'Parallel (Delta, 3 legs)', joints: [['R', 'θ₁ (leg 1)', -20, 80, '°'], ['R', 'θ₂ (leg 2)', -20, 80, '°'], ['R', 'θ₃ (leg 3)', -20, 80, '°']], env: 'Small dome / cylinder below base', axes: 3 }
  };
  /* Delta robot geometry (educational dimensions, m) */
  const DELTA = { R: 0.22, r: 0.06, Lb: 0.3, La: 0.62, h: 1.25 };
  function deltaFK(th) {
    const { R, r, Lb, La, h } = DELTA; const centres = [];
    const elbows = [];
    for (let i = 0; i < 3; i++) {
      const phi = i * 2 * Math.PI / 3; const c = Math.cos(phi), s = Math.sin(phi);
      const ex = (R + Lb * Math.cos(th[i])), ez = h - Lb * Math.sin(th[i]);
      elbows.push([ex * c, ex * s, ez]);
      centres.push([(ex - r) * c, (ex - r) * s, ez]);
    }
    // trilateration of three spheres radius La
    const [P1, P2, P3] = centres, v = M.v3;
    const ex = v.unit(v.sub(P2, P1)); const i = v.dot(ex, v.sub(P3, P1));
    const ey = v.unit(v.sub(v.sub(P3, P1), v.scale(ex, i))); const ez = v.cross(ex, ey);
    const d = v.norm(v.sub(P2, P1)), j = v.dot(ey, v.sub(P3, P1));
    const x = d / 2, y = (i * i + j * j) / (2 * j) - i * x / j; const z2 = La * La - x * x - y * y;
    if (z2 < 0) return null;
    let p = v.add(P1, v.add(v.scale(ex, x), v.scale(ey, y)));
    const zz = Math.sqrt(z2); const pA = v.add(p, v.scale(ez, zz)), pB = v.sub(p, v.scale(ez, zz));
    p = pA[2] < pB[2] ? pA : pB;
    return { p, elbows, centres };
  }
  function cfgFK(type, q) {
    const c = Math.cos, s = Math.sin;
    switch (type) {
      case 'cartesian': return { p: [q[0] - 0.4, q[1] - 0.3, q[2]] };
      case 'cylindrical': return { p: [q[2] * c(q[0]), q[2] * s(q[0]), q[1]] };
      case 'spherical': return { p: [q[2] * c(q[1]) * c(q[0]), q[2] * c(q[1]) * s(q[0]), 0.6 + q[2] * s(q[1])] };
      case 'scara': return { p: [0.4 * c(q[0]) + 0.3 * c(q[0] + q[1]), 0.4 * s(q[0]) + 0.3 * s(q[0] + q[1]), 0.55 - q[2]] };
      case 'articulated': { const r = 0.5 * c(q[1]) + 0.4 * c(q[1] + q[2]); return { p: [r * c(q[0]), r * s(q[0]), 0.4 + 0.5 * s(q[1]) + 0.4 * s(q[1] + q[2])] }; }
      case 'parallel': return deltaFK(q) || { p: [NaN, NaN, NaN] };
    }
  }
  const qFromPct = (type, pct) => CFG[type].joints.map(([t, , lo, hi], i) => { const v = lo + (hi - lo) * pct[i] / 100; return t === 'R' ? v * D2R : v; });
  RIL.defineSim({
    id: 'robot-configurations', title: 'Robot configurations in 3D', unit: 1, category: 'robot-configurations', kind: '3d', auto: true, autoDefault: true,
    description: 'Cartesian, cylindrical, spherical, SCARA, articulated and Delta parallel robots with joint motion, component labels and sampled workspace.',
    help: 'Choose a configuration. Each joint slider moves one joint across its range (0–100 %); the actual joint value and the TCP position from equations (1.2)–(1.4) appear in the panel. Tick "Show workspace" to sample the reachable points.',
    camera: { position: [2.3, -2.3, 1.7], target: [0, 0, 0.45] },
    controls: [
      { id: 'type', type: 'select', label: 'Configuration', string: true, value: 'articulated', options: Object.keys(CFG).map(k => [k, CFG[k].name]) },
      { id: 'j1', label: 'Joint 1 position', min: 0, max: 100, value: 55, unit: '% of range' },
      { id: 'j2', label: 'Joint 2 position', min: 0, max: 100, value: 45, unit: '% of range' },
      { id: 'j3', label: 'Joint 3 position', min: 0, max: 100, value: 60, unit: '% of range' },
      { id: 'ws', type: 'toggle', label: 'Show workspace (sampled points)', value: false },
      { id: 'labels', type: 'toggle', label: 'Show joint labels', value: true }
    ],
    readouts: [{ id: 'name', label: 'Configuration' }, { id: 'q1', label: 'Joint 1' }, { id: 'q2', label: 'Joint 2' }, { id: 'q3', label: 'Joint 3' }, { id: 'x', label: 'TCP x', unit: 'm' }, { id: 'y', label: 'TCP y', unit: 'm' }, { id: 'z', label: 'TCP z', unit: 'm' }, { id: 'env', label: 'Work envelope' }],
    panels: [{ id: 'cmp', title: 'Comparison of basic configurations (Table 1.5 of the notes)', wide: true }],
    setup(S) {
      S.grp = null; S.lbls = [];
      S.panel('cmp').innerHTML = RIL.ui.kv([
        ['Cartesian', 'PPP', 'Rectangular box', 'Simple control, uniform accuracy, rigid', 'Large footprint'],
        ['Cylindrical', 'RPP', 'Hollow cylinder', 'Simple, rigid, machine loading', 'Cannot reach near column'],
        ['Spherical', 'RRP', 'Spherical shell portion', 'Long horizontal reach', 'Accuracy varies with r'],
        ['SCARA', 'RRP', 'Annular cylinder', 'Fast, compliant in plane, rigid vertically', 'Limited vertical stroke'],
        ['Articulated', 'RRR', 'Approx. sphere', 'Largest reach per footprint, dexterous', 'Complex kinematics, singularities'],
        ['Parallel (Delta)', 'closed chain', 'Small dome', 'Very fast, stiff, accurate', 'Small workspace']], ['Type', 'Joints', 'Work envelope', 'Advantages', 'Limitations']);
    },
    reset(S) { build(S); },
    onControl(S, id) { if (id === 'type' || id === 'ws') build(S); },
    step(S, dt) { if (!S.auto) return; const t = S.t; S.setParam('j1', 50 + 45 * Math.sin(0.5 * t), true); S.setParam('j2', 50 + 40 * Math.sin(0.7 * t + 1), true); S.setParam('j3', 50 + 45 * Math.sin(0.6 * t + 2), true); },
    draw(S) {
      const type = S.p.type, q = qFromPct(type, [S.p.j1, S.p.j2, S.p.j3]); const P = S.parts; const k = K();
      const fk = cfgFK(type, q); const p = fk.p;
      const c = Math.cos, s = Math.sin;
      if (type === 'cartesian') {
        P.bridge.position.set(q[0] - 0.4, 0, 0.75); P.carriage.position.set(q[0] - 0.4, q[1] - 0.3, 0.75);
        k.setBetween(P.quill.mesh, [p[0], p[1], 0.78], [p[0], p[1], p[2] + 0.05]); P.tool.position.set(p[0], p[1], p[2]);
      } else if (type === 'cylindrical') {
        P.rot.rotation.z = q[0]; P.carriage.position.set(0, 0, q[1]); k.setBetween(P.arm.mesh, [0, 0, q[1]], [q[2] * c(q[0]), q[2] * s(q[0]), q[1]]); P.tool.position.set(...p);
      } else if (type === 'spherical') {
        P.rot.rotation.z = q[0]; const piv = [0, 0, 0.6]; P.boom.rotation.set(0, -q[1], 0);
        k.setBetween(P.arm.mesh, piv, p); P.tool.position.set(...p);
      } else if (type === 'scara') {
        const e = [0.4 * c(q[0]), 0.4 * s(q[0]), 0.62]; k.setBetween(P.l1.mesh, [0, 0, 0.62], e); k.setBetween(P.l2.mesh, e, [p[0], p[1], 0.62]);
        P.j2.position.set(e[0], e[1], 0.62); k.setBetween(P.quill.mesh, [p[0], p[1], 0.7], [p[0], p[1], p[2]]); P.tool.position.set(...p);
      } else if (type === 'articulated') {
        const sh = [0, 0, 0.4], el = [0.5 * c(q[1]) * c(q[0]), 0.5 * c(q[1]) * s(q[0]), 0.4 + 0.5 * s(q[1])];
        P.waist.rotation.z = q[0]; k.setBetween(P.ua.mesh, sh, el); k.setBetween(P.fa.mesh, el, p); P.el.position.set(...el); P.tool.position.set(...p);
      } else if (type === 'parallel') {
        if (fk.elbows) {
          for (let i = 0; i < 3; i++) {
            const phi = i * 2 * Math.PI / 3; const b = [DELTA.R * c(phi), DELTA.R * s(phi), DELTA.h];
            k.setBetween(P.bic[i].mesh, b, fk.elbows[i]);
            const pe = [p[0] + DELTA.r * c(phi), p[1] + DELTA.r * s(phi), p[2]];
            k.setBetween(P.fore[i].mesh, fk.elbows[i], pe);
          }
          P.plat.position.set(...p); P.tool.position.set(...p);
        }
      }
      CFG[type].joints.forEach(([t, nm, , , u], i) => S.set('q' + (i + 1), `${t}: ${nm} = ${t === 'R' ? (q[i] * R2D).toFixed(1) : q[i].toFixed(3)} ${u}`));
      S.set('name', CFG[type].name); S.set('x', p[0]); S.set('y', p[1]); S.set('z', p[2]); S.set('env', CFG[type].env);
      S.lbls.forEach(L => (L.visible = S.p.labels));
    }
  });
  function build(S) {
    const k = K(), T3 = THREE, sc = S.three.scene, C = k.COL;
    if (S.grp) sc.remove(S.grp); S.three.clearLabels(); S.lbls = [];
    const g = new T3.Group(); sc.add(g); S.grp = g; const P = {}; S.parts = P;
    const lab = (t, o, off) => S.lbls.push(S.three.label(t, o, 'dim', off));
    const type = S.p.type;
    P.tool = new T3.Group(); P.tool.add(k.frame(0.12)); g.add(P.tool); lab('TCP', P.tool, [0, 0, 0.08]);
    if (type === 'cartesian') {
      [[-0.5, -0.35], [0.5, -0.35], [-0.5, 0.35], [0.5, 0.35]].forEach(([x, y]) => { const post = k.box(0.05, 0.05, 0.8, C.base); post.position.set(x, y, 0.4); g.add(post); });
      [-0.35, 0.35].forEach(y => { const rail = k.box(1.05, 0.05, 0.05, C.link); rail.position.set(0, y, 0.8); g.add(rail); });
      P.bridge = k.box(0.08, 0.75, 0.06, C.joint); g.add(P.bridge); lab('P₁ (x axis)', P.bridge, [0, 0.4, 0.05]);
      P.carriage = k.box(0.12, 0.12, 0.08, C.dark); g.add(P.carriage); lab('P₂ (y axis)', P.carriage, [0.1, 0, 0.05]);
      P.quill = seg(g, C.white, 0.025); lab('P₃ (z axis)', P.quill.mesh, [0.08, 0, 0]);
    } else if (type === 'cylindrical') {
      const base = k.cyl(0.18, 0.08, C.base); base.position.z = 0.04; g.add(base);
      P.rot = new T3.Group(); g.add(P.rot); const col = k.cyl(0.05, 1.0, C.link); col.position.z = 0.5; P.rot.add(col); lab('R₁ (base rotation)', base, [0.2, 0, 0]);
      P.carriage = new T3.Group(); P.rot.add(P.carriage); const car = k.box(0.14, 0.14, 0.1, C.joint); P.carriage.add(car); lab('P₂ (vertical)', car, [0, 0, 0.1]);
      P.arm = seg(g, C.white, 0.03); lab('P₃ (radial)', P.arm.mesh, [0, 0, 0.06]);
    } else if (type === 'spherical') {
      const base = k.cyl(0.18, 0.08, C.base); base.position.z = 0.04; g.add(base);
      P.rot = new T3.Group(); g.add(P.rot); const col = k.cyl(0.07, 0.56, C.link); col.position.z = 0.32; P.rot.add(col); lab('R₁ (base rotation)', base, [0.2, 0, 0]);
      P.boom = new T3.Group(); P.boom.position.z = 0.6; P.rot.add(P.boom); const pv = k.cyl(0.08, 0.18, C.joint, 'y'); P.boom.add(pv); lab('R₂ (elevation)', pv, [0, -0.12, 0.05]);
      const sleeve = k.box(0.35, 0.1, 0.1, 0x5a6f96); sleeve.position.x = 0.1; P.boom.add(sleeve);
      P.arm = seg(g, C.white, 0.03); lab('P₃ (telescopic r)', P.arm.mesh, [0, 0, 0.07]);
    } else if (type === 'scara') {
      const col = k.cyl(0.08, 0.62, C.base); col.position.z = 0.31; g.add(col); lab('R₁ (vertical axis)', col, [0.12, 0, 0.25]);
      P.l1 = seg(g, C.link, 0.045); P.l2 = seg(g, C.link, 0.04);
      P.j2 = k.cyl(0.06, 0.1, C.joint); g.add(P.j2); lab('R₂ (vertical axis)', P.j2, [0, 0, 0.08]);
      P.quill = seg(g, C.white, 0.02); lab('P₃ (quill)', P.quill.mesh, [0.06, 0, 0]);
    } else if (type === 'articulated') {
      const base = k.cyl(0.16, 0.1, C.base); base.position.z = 0.05; g.add(base);
      P.waist = new T3.Group(); g.add(P.waist); const tur = k.cyl(0.1, 0.3, 0x5a6f96); tur.position.z = 0.25; P.waist.add(tur); lab('R₁ waist', tur, [0.15, 0, 0]);
      const sh = k.cyl(0.075, 0.18, C.joint, 'y'); sh.position.z = 0.4; P.waist.add(sh); lab('R₂ shoulder', sh, [0, -0.15, 0]);
      P.ua = seg(g, C.link, 0.045); P.fa = seg(g, C.link, 0.038);
      P.el = k.cyl(0.06, 0.15, C.joint, 'y'); g.add(P.el); lab('R₃ elbow', P.el, [0, 0, 0.09]);
    } else if (type === 'parallel') {
      const top = k.cyl(DELTA.R + 0.08, 0.04, C.base); top.position.z = DELTA.h + 0.03; g.add(top); lab('Fixed base (3 motors)', top, [0, 0, 0.08]);
      [[-0.35, -0.35], [0.35, -0.35], [0, 0.4]].forEach(([x, y]) => { const post = k.box(0.04, 0.04, DELTA.h + 0.05, 0x2a3c62); post.position.set(x, y, (DELTA.h + 0.05) / 2); g.add(post); });
      P.bic = [0, 1, 2].map(i => seg(g, C.joint, 0.022)); P.fore = [0, 1, 2].map(() => seg(g, C.white, 0.012));
      P.plat = k.cyl(DELTA.r + 0.015, 0.025, C.dark); g.add(P.plat); lab('Moving platform', P.plat, [0.1, 0, -0.04]);
      lab('Leg 1 (R-S-S)', P.bic[0].mesh, [0, 0, 0.05]);
    }
    if (S.p.ws) {
      const pts = []; const r = M.rng(7);
      for (let i = 0; i < 2600; i++) { const q = qFromPct(type, [r() * 100, r() * 100, r() * 100]); const f = cfgFK(type, q); if (f && f.p && Number.isFinite(f.p[0])) pts.push(f.p); }
      g.add(k.points(pts, C.signal, 0.018, 0.55));
    }
  }

  /* ================= DOF simulator ================= */
  const CHAINS = { R: 'R', P: 'P', RR: 'RR', RP: 'RP', PP: 'PP', RRR: 'RRR', RRP: 'RRP', RPP: 'RPP', PPP: 'PPP', RRPR: 'RRPR (SCARA)', RRRR: 'RRRR', RRRRR: 'RRRRR', RRRRRR: 'RRRRRR (6-axis)', RRRRRRR: 'RRRRRRR (redundant 7-axis)' };
  const MECH = {
    four: { name: 'Planar four-bar (Example 1.2)', m: 3, N: 4, J: 4, f: '4 × 1', sf: 4 },
    five: { name: 'Planar five-bar (Example 1.2)', m: 3, N: 5, J: 5, f: '5 × 1', sf: 5 },
    six: { name: 'Six-axis serial arm (Example 1.1)', m: 6, N: 7, J: 6, f: '6 × 1', sf: 6 },
    stewart: { name: 'Stewart–Gough UPS (Example 1.3)', m: 6, N: 14, J: 18, f: '6 × (2+1+3)', sf: 36 },
    sps: { name: 'Stewart with SPS legs (Example 1.3 note)', m: 6, N: 14, J: 18, f: '6 × (3+1+3)', sf: 42 }
  };
  function chainTable(pat) {
    return pat.split('').map((c, i) => {
      const alpha = (i === 0 || i % 2 === 1) ? Math.PI / 2 : 0;
      if (c === 'P') return { a: 0, alpha: i === 0 ? 0 : alpha, d: 0, theta: i % 2 ? Math.PI / 2 : 0, type: 'P', offset: 0.12, min: 0, max: 0.3 };
      return { a: i === 0 ? 0 : 0.22, alpha, d: i === 0 ? 0.25 : 0, type: 'R' };
    });
  }
  RIL.defineSim({
    id: 'dof-simulator', title: 'Degrees of freedom simulator', unit: 1, category: 'robot-configurations', kind: '3d', auto: true, autoDefault: false,
    description: 'Build serial chains of revolute and prismatic joints, move each joint, and compute DOF with Grübler’s formula for serial and parallel mechanisms.',
    help: 'Pick a joint chain. Each joint adds one independent motion (f = 1). Move the joint sliders and watch which motions the end effector gains. The Grübler calculator below reproduces Examples 1.1–1.3.',
    camera: { position: [1.8, -1.8, 1.3], target: [0, 0, 0.45] },
    controls: [
      { id: 'chain', type: 'select', label: 'Serial joint chain', string: true, value: 'RRP', options: Object.entries(CHAINS) },
      { id: 'q1', label: 'Joint 1', min: -1, max: 1, step: 0.01, value: 0.2 }, { id: 'q2', label: 'Joint 2', min: -1, max: 1, step: 0.01, value: 0.3 },
      { id: 'q3', label: 'Joint 3', min: -1, max: 1, step: 0.01, value: 0.4 }, { id: 'q4', label: 'Joint 4', min: -1, max: 1, step: 0.01, value: 0 },
      { id: 'q5', label: 'Joint 5', min: -1, max: 1, step: 0.01, value: 0 }, { id: 'q6', label: 'Joint 6', min: -1, max: 1, step: 0.01, value: 0 }, { id: 'q7', label: 'Joint 7', min: -1, max: 1, step: 0.01, value: 0 },
      { id: 'mech', type: 'select', label: 'Grübler calculator: mechanism', string: true, value: 'four', options: Object.entries(MECH).map(([k, v]) => [k, v.name]) }
    ],
    readouts: [{ id: 'n', label: 'Number of joints' }, { id: 'nR', label: 'Revolute (rotational) joints' }, { id: 'nP', label: 'Prismatic (translational) joints' }, { id: 'dof', label: 'DOF = Σ fᵢ (serial chain)' }, { id: 'pos', label: 'Can position in 3D?' }, { id: 'ori', label: 'Orientation DOF available' }, { id: 'tcp', label: 'TCP (x, y, z)', unit: 'm' }],
    panels: [{ id: 'grub', title: 'Grübler (Chebychev–Grübler–Kutzbach) calculator, eq. (1.5)' }],
    equations: ['\\text{DOF}=m(N-1-J)+\\sum_{i=1}^{J} f_i', 'm=3\\ (\\text{planar}),\\; m=6\\ (\\text{spatial})'],
    setup(S) { S.rob = null; S.trail = []; },
    reset(S) { buildChain(S); },
    onControl(S, id) { if (id === 'chain') buildChain(S); },
    step(S) { if (!S.auto) return; const n = S.p.chain.length; for (let i = 0; i < n; i++) S.setParam('q' + (i + 1), +(0.8 * Math.sin(0.6 * S.t + i * 1.3)).toFixed(2), true); },
    draw(S) {
      const pat = S.p.chain, n = pat.length;
      const q = pat.split('').map((c, i) => c === 'P' ? (S.p['q' + (i + 1)] + 1) / 2 * 0.3 - 0.12 : S.p['q' + (i + 1)] * Math.PI * 0.75);
      S.rob.update(q); const p = S.rob.tcp();
      S.trail.push(p); if (S.trail.length > 300) S.trail.shift(); if (S.trail.length > 2) K().updateLine(S.line, S.trail);
      const nR = (pat.match(/R/g) || []).length, nP = n - nR;
      S.set('n', n); S.set('nR', nR); S.set('nP', nP); S.set('dof', n + `  (Grübler: 6(${n + 1}−1−${n})+${n} = ${n})`);
      S.set('pos', n >= 3 ? 'Yes – 3 independent motions' : 'No – fewer than 3 joints', n >= 3 ? 'ok' : 'bad');
      S.set('ori', Math.max(0, Math.min(3, n - 3)) + ' of 3' + (n > 6 ? ' (redundant: ' + (n - 6) + ' extra)' : ''));
      S.set('tcp', p.map(v => v.toFixed(3)).join(', '));
      for (let i = 1; i <= 7; i++) { const el = S.inputs['q' + i].el.closest('.ctl'); el.style.opacity = i <= n ? 1 : 0.35; el.querySelector('label span').textContent = `Joint ${i}` + (i <= n ? ` (${pat[i - 1]})` : ' (unused)'); }
      const m = MECH[S.p.mech]; const dof = M.inst.grubler(m.m, m.N, m.J, m.sf);
      const html = RIL.ui.kv([['Mechanism', m.name], ['m (space)', m.m], ['N (links incl. ground)', m.N], ['J (joints)', m.J], ['Σ fᵢ', `${m.f} = ${m.sf}`], [`DOF = ${m.m}(${m.N}−1−${m.J})+${m.sf}`, `<b style="color:#f2a516">${dof}</b>`]]) + (S.p.mech === 'sps' ? '<p style="margin:.4em 0 0">The formula gives 12, but 6 of these are idle spins of the legs about their own axes: the platform still has 6 DOF.</p>' : '');
      if (S._g !== html) { S.panel('grub').innerHTML = html; S._g = html; }
    }
  });
  function buildChain(S) {
    if (S.rob) S.rob.dispose(S.three.scene); if (S.line) S.three.scene.remove(S.line);
    S.rob = new (K().DHRobot)(S.three.scene, chainTable(S.p.chain), { radius: 0.035, frames: true, frameSize: 0.12 });
    S.trail = []; S.line = K().polyline([[0, 0, 0], [0, 0, 0]], 0xf2a516); S.three.scene.add(S.line);
  }

  /* ================= Work envelope ================= */
  RIL.defineSim({
    id: 'work-envelope', title: 'Work envelope visualiser', unit: 1, category: 'robot-configurations', kind: '3d', autostart: false,
    description: 'Reachable workspace of planar 2R/SCARA, cylindrical, spherical and articulated robots sampled in 3D, with analytical volume/area from eqs (1.6)–(1.8).',
    help: 'Change link lengths or strokes and joint limits. The cloud shows reachable TCP points obtained by sampling joint space and applying forward kinematics; the analytical value uses the formula of the notes.',
    camera: { position: [2.6, -2.6, 2.0], target: [0, 0, 0.4] },
    controls: [
      { id: 'type', type: 'select', label: 'Robot', string: true, value: 'cyl', options: [['planar', 'Planar 2R / SCARA arm'], ['cyl', 'Cylindrical (RPP)'], ['sph', 'Spherical (RRP)'], ['art', 'Articulated (RRR)']] },
      { id: 'a', label: 'l₁ (2R, articulated) or r_min (cyl, sph)', min: 0.1, max: 1.0, step: 0.01, value: 0.25, unit: 'm' },
      { id: 'b', label: 'l₂ (2R, articulated) or r_max (cyl, sph)', min: 0.1, max: 1.2, step: 0.01, value: 0.75, unit: 'm' },
      { id: 'h', label: 'Vertical stroke h (cylindrical)', min: 0.1, max: 1.0, step: 0.01, value: 0.6, unit: 'm' },
      { id: 'dth', label: 'Base rotation range Δθ', min: 30, max: 360, value: 300, unit: '°' },
      { id: 'lo', label: 'Lower limit φ₁ (sph, art θ₂) or θ₂ min (2R)', min: -180, max: 90, value: -30, unit: '°' },
      { id: 'hi', label: 'Upper limit φ₂ (sph, art θ₂) or θ₂ max (2R)', min: -90, max: 180, value: 60, unit: '°' },
      { id: 'n', label: 'Samples', min: 500, max: 8000, step: 100, value: 4000 }
    ],
    readouts: [{ id: 'formula', label: 'Analytical formula' }, { id: 'V', label: 'Analytical volume / area' }, { id: 'rmin', label: 'Sampled min reach', unit: 'm' }, { id: 'rmax', label: 'Sampled max reach', unit: 'm' }, { id: 'npts', label: 'Reachable samples' }],
    equations: ['V_{cyl}=\\tfrac{\\Delta\\theta}{2}(r_{max}^2-r_{min}^2)h', 'V_{sph}=\\tfrac{\\Delta\\theta}{3}(r_{max}^3-r_{min}^3)(\\sin\\varphi_2-\\sin\\varphi_1)', '|l_1-l_2|\\le r\\le l_1+l_2'],
    note: 'Example 1.4 preset: r = 0.25–0.75 m, h = 0.6 m, Δθ = 300° gives V = 0.785 m³.',
    redrawOnControl: true,
    setup(S) { S.cloud = null; },
    reset(S) { cloud(S); },
    onControl(S) { cloud(S); }
  });
  function cloud(S) {
    const k = K(), sc = S.three.scene; if (S.cloud) sc.remove(S.cloud);
    const p = S.p, r = M.rng(3), pts = []; const dth = p.dth * D2R, t0 = -dth / 2; let rmin = Infinity, rmax = 0;
    const lo = Math.min(p.lo, p.hi) * D2R, hi = Math.max(p.lo, p.hi) * D2R;
    const rmn = Math.min(p.a, p.b), rmx = Math.max(p.a, p.b);
    for (let i = 0; i < p.n; i++) {
      const th = t0 + dth * r(); let x, y, z;
      if (p.type === 'planar') { const t2 = lo + (hi - lo) * r(); const c = M.planar2R.fk(p.a, p.b, th, t2); x = c.x; y = c.y; z = 0.3; }
      else if (p.type === 'cyl') { const rr = Math.sqrt(rmn * rmn + (rmx * rmx - rmn * rmn) * r()); x = rr * Math.cos(th); y = rr * Math.sin(th); z = 0.1 + p.h * r(); }
      else if (p.type === 'sph') { const rr = Math.cbrt(rmn ** 3 + (rmx ** 3 - rmn ** 3) * r()); const ph = Math.asin(Math.sin(lo) + (Math.sin(hi) - Math.sin(lo)) * r()); x = rr * Math.cos(ph) * Math.cos(th); y = rr * Math.cos(ph) * Math.sin(th); z = 0.6 + rr * Math.sin(ph); }
      else { const t2 = lo + (hi - lo) * r(), t3 = -150 * D2R + 160 * D2R * r(); const rr = p.a * Math.cos(t2) + p.b * Math.cos(t2 + t3); x = rr * Math.cos(th); y = rr * Math.sin(th); z = 0.4 + p.a * Math.sin(t2) + p.b * Math.sin(t2 + t3); }
      const reach = p.type === 'planar' ? Math.hypot(x, y) : p.type === 'cyl' ? Math.hypot(x, y) : p.type === 'sph' ? Math.hypot(x, y, z - 0.6) : Math.hypot(x, y, z - 0.4);
      rmin = Math.min(rmin, reach); rmax = Math.max(rmax, reach); pts.push([x, y, z]);
    }
    S.cloud = k.points(pts, k.COL.signal, 0.02, 0.6); sc.add(S.cloud);
    let V, f;
    if (p.type === 'cyl') { V = M.inst.cylVolume(dth, rmn, rmx, p.h); f = 'eq (1.6)'; S.set('V', M.fmt(V, 3) + ' m³'); }
    else if (p.type === 'sph') { V = M.inst.sphVolume(dth, rmn, rmx, lo, hi); f = 'eq (1.7)'; S.set('V', M.fmt(V, 3) + ' m³'); }
    else if (p.type === 'planar') { const full = Math.PI * ((p.a + p.b) ** 2 - (p.a - p.b) ** 2); f = 'eq (1.8) annulus, full rotation'; S.set('V', `A = ${M.fmt(full, 3)} m² (full joint ranges)`); }
    else { f = 'no closed form – sampled'; S.set('V', 'see point cloud'); }
    S.set('formula', f); S.set('rmin', rmin); S.set('rmax', rmax); S.set('npts', pts.length);
  }

  /* ================= Coordinate frames ================= */
  RIL.defineSim({
    id: 'coordinate-frames', title: 'Coordinate systems: world, base, joint and tool frames', unit: 1, category: 'robot-configurations', kind: '3d', auto: true, autoDefault: false,
    description: 'Articulated arm placed in a world frame: move and rotate the base frame, jog joints, offset the tool frame and read the TCP in base and world coordinates.',
    help: 'X axes are red, Y green, Z blue. The world frame {W} is fixed; the base frame {B} moves with the base sliders; joint frames follow the DH convention; the tool frame {T} sits at the TCP offset along the flange z axis.',
    camera: { position: [2.4, -2.2, 1.8], target: [0.3, 0.1, 0.4] },
    controls: [
      { id: 'bx', label: 'Base x in world', min: -0.6, max: 0.6, step: 0.01, value: 0.3, unit: 'm' },
      { id: 'by', label: 'Base y in world', min: -0.6, max: 0.6, step: 0.01, value: 0.2, unit: 'm' },
      { id: 'bpsi', label: 'Base rotation about z_W', min: -180, max: 180, value: 30, unit: '°' },
      { id: 'q1', label: 'θ₁', min: -170, max: 170, value: 20, unit: '°' }, { id: 'q2', label: 'θ₂', min: -10, max: 120, value: 40, unit: '°' }, { id: 'q3', label: 'θ₃', min: -150, max: 30, value: -60, unit: '°' },
      { id: 'tool', label: 'Tool offset along flange z', min: 0, max: 0.3, step: 0.01, value: 0.12, unit: 'm' },
      { id: 'jf', type: 'toggle', label: 'Show joint frames', value: true }
    ],
    readouts: [{ id: 'pb', label: 'TCP in base {B}', unit: 'm' }, { id: 'pw', label: 'TCP in world {W}', unit: 'm' }],
    panels: [{ id: 'mats', title: 'Frame transformations (homogeneous matrices)', wide: true }],
    equations: ['{}^{W}\\mathbf p={}^{W}_{B}T\\,{}^{B}_{3}T\\,{}^{3}_{T}T\\,{}^{T}\\mathbf p', '{}^{W}_{B}T=\\begin{bmatrix}R_z(\\psi)&\\mathbf t\\\\0&1\\end{bmatrix}'],
    setup(S) {
      const k = K(), sc = S.three.scene;
      S.world = k.frame(0.35); sc.add(S.world); S.three.label('{W} world', [0, 0, 0], 'dim', [0, 0, -0.06]);
      S.baseG = new THREE.Group(); sc.add(S.baseG);
      S.rob = new k.DHRobot(S.baseG, k.ROBOTS.articulated.table, { radius: 0.04, frames: true, frameSize: 0.15 });
      S.toolF = k.frame(0.18); S.baseG.add(S.toolF); S.three.label('{T} tool', S.toolF, '', [0, 0, 0.1]);
      S.three.label('{B} base', S.rob.frames[0], 'dim', [0, 0, -0.08]);
    },
    step(S) { if (S.auto) { S.setParam('q1', +(60 * Math.sin(.5 * S.t)).toFixed(1), true); S.setParam('q2', +(55 + 40 * Math.sin(.4 * S.t)).toFixed(1), true); S.setParam('q3', +(-60 + 50 * Math.sin(.6 * S.t)).toFixed(1), true); } },
    draw(S) {
      const p = S.p; const TWB = M.homog(M.rotZ(p.bpsi * D2R), [p.bx, p.by, 0]);
      K().applyT(S.baseG, TWB);
      const T = S.rob.update([p.q1 * D2R, p.q2 * D2R, p.q3 * D2R]);
      const T3T = M.transl(0, 0, p.tool), TBT = M.mat.mul(T[3], T3T); K().applyT(S.toolF, TBT);
      S.rob.setVisibleFrames(p.jf); S.rob.frames[0].visible = true;
      const pb = M.pof(TBT), TWT = M.mat.mul(TWB, TBT), pw = M.pof(TWT);
      S.set('pb', pb.map(v => v.toFixed(3)).join(', ')); S.set('pw', pw.map(v => v.toFixed(3)).join(', '));
      const html = RIL.ui.matrix(TWB, 3, '<sup>W</sup><sub>B</sub>T =') + RIL.ui.matrix(TBT, 3, '<sup>B</sup><sub>T</sub>T =') + RIL.ui.matrix(TWT, 3, '<sup>W</sup><sub>T</sub>T =');
      if (S._m !== html) { S.panel('mats').innerHTML = html; S._m = html; }
    }
  });
})();
