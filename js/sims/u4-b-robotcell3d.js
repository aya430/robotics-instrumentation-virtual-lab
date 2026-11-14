/* Unit IV — 3D robot cell: shared motion executor (MOVJ / MOVL / gripper / wait) on the educational 6-DOF arm,
   used by the workcell, industrial robots, programming, teach pendant, pick-and-place, assembly and material handling.
   Motions are computed by inverse kinematics (damped least squares) of the same DH model; nothing is key-framed. */
(function () {
  const RIL = window.RIL, M = RIL.M, D2R = M.D2R, R2D = M.R2D, PI = Math.PI;
  const K = () => RIL.three;
  const TOOL = 0.075; // flange-to-grasp-point distance of the drawn gripper (m)
  const HOME = [0, 60, -60, 0, -60, 0].map(v => v * D2R);
  const Rdown = yaw => M.mat.mul(M.rotZ(yaw), M.rotX(PI));

  /* ---------- the cell ---------- */
  function makeCell(S, o = {}) {
    const k = K(), T3 = THREE, sc = S.three.scene, tb = k.ROBOTS.sixR.table;
    const cell = { S, q: HOME.slice(), queue: [], cur: null, held: null, parts: [], log: [], err: '', speed: 1, open: 1, line: 0 };
    cell.rob = new k.DHRobot(sc, tb, { radius: 0.04, frames: false }); cell.rob.update(cell.q);
    const ped = k.cyl(0.13, 0.04, 0x57606a); ped.position.z = 0.02; sc.add(ped);
    cell.box = (w, d, h, color, x, y, z, pick) => { const m = k.box(w, d, h, color); m.position.set(x, y, z); if (pick) m.traverse(q => (q.userData.pick = pick)); sc.add(m); return m; };
    cell.part = (x, y, z, color = 0xc98a3a, size = [0.06, 0.06, 0.06], name = 'part') => { const m = k.box(...size, color); m.material = m.material.clone(); m.position.set(x, y, z); m.userData.size = size; m.userData.name = name; sc.add(m); cell.parts.push(m); return m; };
    cell.conveyor = (x0, x1, y, h = 0.1, w = 0.18, pick = 'conveyor') => { const len = x1 - x0; const bed = cell.box(len, w, h, 0x8c959f, (x0 + x1) / 2, y, h / 2, pick); const belt = k.box(len, w * 0.92, 0.008, 0x3d444d); belt.position.set((x0 + x1) / 2, y, h + 0.004); sc.add(belt); const marks = []; for (let i = 0; i < Math.floor(len / 0.1); i++) { const mk = k.box(0.01, w * 0.9, 0.009, 0x8c959f); mk.position.set(x0 + i * 0.1, y, h + 0.005); sc.add(mk); marks.push(mk); } return { x0, x1, y, h, marks, objs: [bed, belt, ...marks], run: true, v: 0.12, step(dt) { if (!this.run) return; marks.forEach(m => { m.position.x += this.v * dt; if (m.position.x > x1) m.position.x -= len; }); } }; };
    cell.ik = (p, yaw = 0, seed) => {
      const tgt = { p: [p[0], p[1], p[2] + TOOL], R: Rdown(yaw) }; const base = Math.atan2(p[1], p[0]);
      const seeds = [seed, [base, 40 * D2R, -90 * D2R, 0, -40 * D2R, base - yaw], [base, 20 * D2R, -70 * D2R, 0, -50 * D2R, base - yaw]].filter(Boolean);
      for (const s0 of seeds) { const s = s0.slice(); if (s !== seed) s[0] = base; const r = M.ikDLS(tb, s, tgt, { maxIter: 120, lambda: 0.04 }); if (r.converged) return r.q; }
      return null;
    };
    cell.tcp = () => { const T = M.fkDH(tb, cell.q).T[6]; const p = M.pof(T); return [p[0], p[1], p[2] - TOOL]; };
    cell.yaw = () => { const T = M.fkDH(tb, cell.q).T[6]; return Math.atan2(T[1][0], T[0][0]); };
    cell.cmd = list => { cell.queue.push(...list); };
    cell.clear = () => { cell.queue = []; cell.cur = null; };
    cell.busy = () => !!cell.cur || cell.queue.length > 0;
    cell.release = () => { if (!cell.held) return; const m = cell.held; cell.held = null; const sz = m.userData.size; const below = cell.parts.filter(q => q !== m && Math.hypot(q.position.x - m.position.x, q.position.y - m.position.y) < 0.05 && q.position.z < m.position.z); const top = Math.max(o.floorZ ?? 0, ...(o.surfaces || []).filter(sf => m.position.x > sf.x0 && m.position.x < sf.x1 && m.position.y > sf.y0 && m.position.y < sf.y1).map(sf => sf.z), ...below.map(q => q.position.z + q.userData.size[2] / 2)); m.position.z = top + sz[2] / 2; m.userData.free = true; };
    cell.update = dt => {
      dt *= cell.speed; if (cell.estop) return;
      if (!cell.cur && cell.queue.length) { const c = cell.queue.shift(); cell.cur = c; c.t = 0; cell.err = '';
        if (c.j || c.q) { c.q0 = cell.q.slice(); c.q1 = c.q ? c.q.slice() : cell.ik(c.j, c.yaw ?? 0, cell.q); if (!c.q1) { cell.err = `target (${c.j.map(v => v.toFixed(2)).join(', ')}) unreachable`; cell.cur = null; return; } const dq = Math.max(...c.q1.map((v, i) => Math.abs(v - c.q0[i]))); c.T = c.time || Math.max(0.4, dq / (c.v || 1.6)); }
        else if (c.l) { c.p0 = cell.tcp(); c.y0 = cell.yaw(); const L = M.v3.norm(M.v3.sub(c.l, c.p0)); c.T = c.time || Math.max(0.3, L / (c.v || 0.35)); }
        else if (c.grip) { c.T = 0.35; } else if (c.wait !== undefined) { c.T = c.wait; } else c.T = 0;
        if (c.line !== undefined) cell.line = c.line; }
      const c = cell.cur; if (!c) return; c.t += dt; const s = M.traj.quintic(0, 1, c.T, Math.min(c.t, c.T)).q;
      if (c.j || c.q) cell.q = c.q0.map((v, i) => v + (c.q1[i] - v) * s);
      else if (c.l) { const p = M.v3.add(c.p0, M.v3.scale(M.v3.sub(c.l, c.p0), s)); const yaw = c.y0 + M.wrapPi((c.yaw ?? c.y0) - c.y0) * s; const r = M.ikDLS(tb, cell.q, { p: [p[0], p[1], p[2] + TOOL], R: Rdown(yaw) }, { maxIter: 25, lambda: 0.03 }); if (r.err < 5e-3) cell.q = r.q; else cell.err = 'linear path leaves the workspace'; }
      else if (c.grip) { cell.open = c.grip === 'open' ? 0.3 + 0.7 * s : 1 - 0.75 * s; if (c.t >= c.T) { if (c.grip === 'close') { const tp = cell.tcp(); const cand = cell.parts.filter(m => M.v3.norm(M.v3.sub([m.position.x, m.position.y, m.position.z], tp)) < 0.06).sort((a, b) => M.v3.norm(M.v3.sub([a.position.x, a.position.y, a.position.z], tp)) - M.v3.norm(M.v3.sub([b.position.x, b.position.y, b.position.z], tp))); if (cand[0]) { cell.held = cand[0]; cell.held.userData.free = false; } } else cell.release(); } }
      if (c.t >= c.T) { if (c.fn) c.fn(cell); cell.cur = null; }
    };
    cell.render = () => { const T = cell.rob.update(cell.q); cell.rob.setGrip(cell.open); if (cell.held) { const tp = cell.tcp(); cell.held.position.set(tp[0], tp[1], tp[2]); cell.held.rotation.set(0, 0, cell.yaw()); } return T; };
    cell.fence = (x0, x1, y0, y1, hgt = 0.9, doorAt) => { const posts = []; const mk = (x, y) => { const p = k.box(0.03, 0.03, hgt, 0xf2a516); p.position.set(x, y, hgt / 2); sc.add(p); posts.push(p); }; const mesh = new T3.MeshBasicMaterial({ color: 0xf2a516, transparent: true, opacity: 0.08, side: T3.DoubleSide }); const panel = (xa, ya, xb, yb, pick) => { const L = Math.hypot(xb - xa, yb - ya); const m = new T3.Mesh(new T3.PlaneGeometry(L, hgt * 0.85), mesh); m.position.set((xa + xb) / 2, (ya + yb) / 2, hgt * 0.5); m.rotation.x = PI / 2; m.rotation.y = Math.atan2(yb - ya, xb - xa); if (pick) m.userData.pick = pick; sc.add(m); const edge = new T3.LineSegments(new T3.EdgesGeometry(m.geometry), new T3.LineBasicMaterial({ color: 0xf2a516, transparent: true, opacity: 0.5 })); m.add(edge); return m; }; [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach(([x, y]) => mk(x, y)); return { posts, panel }; };
    cell.home = () => cell.cmd([{ q: HOME, v: 1.2 }]);
    return cell;
  }
  RIL.makeCell = makeCell;
  const pickCycle = (cell, part, place, yaw = 0, o = {}) => { const a = 0.12; const p = () => [part.position.x + (o.track ? (o.vx || 0) * 0.9 : 0), part.position.y, part.position.z]; return [
    { j: null, dyn: () => M.v3.add(p(), [0, 0, a]), yaw, label: 'approach above part' }, { l: null, dyn: () => p(), yaw, v: 0.25, label: 'descend' }, { grip: 'close', label: 'close gripper' }, { l: null, dyn: () => M.v3.add(cellTcp(cell), [0, 0, a]), yaw, label: 'lift' },
    { j: M.v3.add(place, [0, 0, a]), yaw: o.placeYaw ?? yaw, label: 'transfer' }, { l: place, yaw: o.placeYaw ?? yaw, v: 0.25, label: 'lower to place' }, { grip: 'open', label: 'release' }, { l: M.v3.add(place, [0, 0, a]), yaw: o.placeYaw ?? yaw, label: 'retract' }]; };
  const cellTcp = cell => cell.tcp();
  /* resolve dynamic targets lazily (targets that depend on where a moving part is when the command starts) */
  const dyn = (cell) => { const c = cell.queue[0]; if (c && c.dyn && !cell.cur) { const v = c.dyn(); if (c.j === null) c.j = v; if (c.l === null) c.l = v; delete c.dyn; } };

  /* ================= Robotic workcell (Topic IV.2) ================= */
  const WC = { robot: ['Robot arm (6-axis)', 'Manipulator with servo drives; moves parts between conveyor and outfeed table.'], conveyor: ['Infeed conveyor', 'Brings workpieces into the cell; started and stopped by the cell PLC (DO2).'], sensor: ['Photo-eye sensor (DI1)', 'Detects a part at the pick position and tells the PLC/robot "part present".'], fence: ['Safety enclosure (fence)', 'Fixed guard keeps people out of the robot\'s reach while it runs automatically.'], door: ['Interlocked access door (DI2)', 'Opening the door breaks the safety circuit: the robot performs a protective stop.'], curtain: ['Light curtain (DI3)', 'Optical safeguard at the loading opening; interruption stops hazardous motion.'], panel: ['Control panel / PLC cabinet', 'Cell PLC, robot controller, HMI, start/stop and emergency-stop buttons.'], table: ['Outfeed table', 'Place position for finished parts.'], tower: ['Signal tower', 'Green: automatic running; amber: waiting/stopped; red: fault or safety stop.'] };
  RIL.defineSim({
    id: 'robotic-workcell', title: 'Robotic workcell with interlocks (3D)', unit: 4, category: 'industrial-applications', kind: '3d', auto: true, autoDefault: true,
    description: 'A complete cell: 6-axis robot, infeed conveyor with photo-eye, outfeed table, safety fence with interlocked door, light curtain, control panel/PLC and signal tower. Inputs and outputs are listed live; opening the door or breaking the light curtain stops the robot (safety interlock), and the cell restarts only after reset.',
    help: 'Rotate the scene and click any component to identify it. Use Open door or Break light curtain to test the interlocks, then Reset safety to restart. The I/O table shows the handshake signals between sensors, PLC and robot.',
    camera: { position: [1.9, -2.4, 1.9], target: [0.2, 0, 0.3] },
    controls: [{ id: 'b', type: 'buttons', buttons: [{ id: 'door', label: 'Open / close door' }, { id: 'lc', label: 'Break light curtain' }, { id: 'rst', label: 'Reset safety' }, { id: 'stop', label: 'Cycle stop' }] }, { id: 'labels', type: 'toggle', label: 'Show component labels', value: true }],
    readouts: [{ id: 'state', label: 'Cell state' }, { id: 'step', label: 'Robot step' }, { id: 'n', label: 'Parts transferred' }, { id: 'sel', label: 'Selected component' }],
    panels: [{ id: 'io', title: 'Input / output interface' }, { id: 'info', title: 'Component' }],
    setup(S) {
      const c = S.cell = makeCell(S, { surfaces: [{ x0: 0.2, x1: 0.75, y0: 0.4, y1: 0.75, z: 0.1 }] }); const k = K();
      c.rob.group.traverse(o => (o.userData.pick = 'robot'));
      S.conv = c.conveyor(-0.9, 0.85, -0.55); c.box(0.55, 0.35, 0.1, 0x6e7781, 0.47, 0.57, 0.05, 'table');
      S.eye = c.box(0.04, 0.04, 0.12, 0x1f9bd7, 0.6, -0.68, 0.16, 'sensor'); S.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.26, 6), new THREE.MeshBasicMaterial({ color: 0xff4040 })); S.beam.position.set(0.6, -0.55, 0.15); THREE && (S.beam.rotation.x = 0); S.three.scene.add(S.beam);
      const f = c.fence(-0.85, 1.0, -0.95, 0.95); f.panel(1.0, -0.95, 1.0, 0.95, 'fence'); f.panel(-0.85, 0.95, 1.0, 0.95, 'fence'); f.panel(-0.85, -0.95, -0.85, -0.7, 'fence'); f.panel(-0.85, -0.4, -0.85, 0.95, 'fence'); f.panel(-0.85, -0.95, 0.3, -0.95, 'fence');
      S.door = f.panel(0.3, -0.95, 1.0, -0.95, 'door'); S.door.material = S.door.material.clone(); S.door.material.color.set(0x2da44e); S.door.material.opacity = 0.15;
      S.lc = [-0.7, -0.4].map(y => c.box(0.03, 0.03, 0.4, 0xc4a4ff, -0.85, y, 0.2, 'curtain')); S.lcBeams = []; for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.3, 4), new THREE.MeshBasicMaterial({ color: 0xc4a4ff, transparent: true, opacity: 0.6 })); b.position.set(-0.85, -0.55, 0.06 + i * 0.06); S.three.scene.add(b); S.lcBeams.push(b); }
      c.box(0.3, 0.2, 0.7, 0xd0d7de, -0.5, 1.2, 0.35, 'panel'); const est = c.box(0.05, 0.02, 0.05, 0xe5484d, -0.5, 1.095, 0.6, 'panel');
      S.tower = [0xe5484d, 0xf2a516, 0x30a46c].map((col, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 16), new THREE.MeshStandardMaterial({ color: col, emissive: 0x000000 })); m.rotation.x = PI / 2; m.position.set(1.15, -1.1, 0.95 - i * 0.065); m.userData.pick = 'tower'; S.three.scene.add(m); return m; }); c.box(0.02, 0.02, 0.8, 0x8c959f, 1.15, -1.1, 0.4, 'tower');
      const L = S.three.label.bind(S.three); S.lbls = [L('Robot', [0, 0, 1.05]), L('Infeed conveyor', [-0.6, -0.55, 0.2]), L('Photo-eye DI1', S.eye, '', [0, 0, 0.12]), L('Door (interlock DI2)', [0.65, -0.95, 0.95]), L('Light curtain DI3', [-0.85, -0.55, 0.5]), L('Control panel / PLC', [-0.5, 1.2, 0.8]), L('Outfeed table', [0.47, 0.57, 0.18]), L('Signal tower', [1.15, -1.1, 1.05])];
      S.three.onPick(n => { S.sel = n; });
      S.n = 0; S.safe = true; S.doorOpen = false; S.lcBroken = false; S.stopReq = false;
    },
    reset(S) { const c = S.cell; c.clear(); c.q = HOME.slice(); c.parts.forEach(m => S.three.scene.remove(m)); c.parts = []; c.held = null; c.estop = false; S.n = 0; S.safe = true; S.doorOpen = false; S.lcBroken = false; S.spawn = 0; S.stopReq = false; },
    onButton(S, b) { if (b === 'door') { S.doorOpen = !S.doorOpen; if (S.doorOpen) S.safe = false; } if (b === 'lc') { S.lcBroken = true; S.safe = false; setTimeout(() => (S.lcBroken = false), 1200); } if (b === 'rst' && !S.doorOpen && !S.lcBroken) { S.safe = true; S.cell.estop = false; } if (b === 'stop') S.stopReq = !S.stopReq; },
    step(S, dt) {
      const c = S.cell; c.estop = !S.safe; if (!S.safe) return;
      S.spawn = (S.spawn || 0) - dt; if (S.spawn <= 0 && c.parts.filter(m => m.userData.onConv).length < 2) { const m = c.part(-0.85, -0.55, 0.13); m.userData.onConv = true; S.spawn = 4.5; }
      const atEye = c.parts.find(m => m.userData.onConv && Math.abs(m.position.x - 0.6) < 0.03); S.DI1 = !!atEye; S.conv.run = !atEye && S.auto; S.conv.step(dt);
      c.parts.forEach(m => { if (m.userData.onConv && m !== c.held && S.conv.run) m.position.x += S.conv.v * dt; });
      if (atEye && !c.busy() && S.auto && !S.stopReq) { const slot = S.n % 6; const place = [0.3 + (slot % 3) * 0.1, 0.5 + Math.floor(slot / 3) * 0.12, 0.13]; atEye.userData.onConv = false; c.cmd(pickCycle(c, atEye, place).map(x => Object.assign(x, x.label ? {} : {}))); c.cmd([{ q: HOME, v: 1.4, label: 'return home', fn: () => { S.n++; if (S.n % 6 === 0) c.parts.filter(m => !m.userData.onConv && m !== c.held).forEach(m => { S.three.scene.remove(m); c.parts.splice(c.parts.indexOf(m), 1); }); } }]); }
      dyn(c); c.update(dt);
    },
    draw(S) {
      const c = S.cell; c.render(); S.door.material.color.set(S.doorOpen ? 0xe5484d : 0x2da44e); S.door.position.z = S.doorOpen ? 0.95 : 0.45;
      S.lcBeams.forEach(b => (b.material.color.set(S.lcBroken ? 0xe5484d : 0xc4a4ff))); S.beam.material.color.set(S.DI1 ? 0x2da44e : 0xff4040);
      const state = !S.safe ? 'PROTECTIVE STOP (reset required)' : S.stopReq ? 'cycle stop requested' : c.busy() ? 'automatic – running' : 'automatic – waiting for part';
      S.tower.forEach((m, i) => m.material.emissive.set(i === 0 ? (!S.safe ? 0xaa0000 : 0) : i === 1 ? (S.safe && !c.busy() ? 0x885500 : 0) : (S.safe && c.busy() ? 0x007733 : 0)));
      S.lbls.forEach(l => (l.visible = S.p.labels));
      S.set('state', state, S.safe ? 'ok' : 'bad'); S.set('step', c.cur ? (c.cur.label || '—') : 'idle'); S.set('n', S.n); S.set('sel', S.sel ? WC[S.sel][0] : '— (click a component)');
      const io = [['DI1', 'Part present (photo-eye)', S.DI1], ['DI2', 'Door closed (interlock)', !S.doorOpen], ['DI3', 'Light curtain clear', !S.lcBroken], ['DI4', 'Gripper closed', !!c.held], ['DO1', 'Gripper close command', c.open < 0.5], ['DO2', 'Conveyor run', S.conv.run], ['DO3', 'Tower green (auto running)', S.safe && c.busy()], ['DO4', 'Robot servo power (safety relay)', S.safe]];
      RIL.setHTML(S.panel('io'), RIL.ui.kv(io.map(r => [r[0], r[1], `<b style="color:${r[2] ? '#1a9b4b' : '#57606a'}">${r[2] ? 'ON' : 'OFF'}</b>`]), ['Signal', 'Meaning', 'State']), S, 'io');
      RIL.setHTML(S.panel('info'), S.sel ? `<b style="color:#1f2328">${WC[S.sel][0]}</b><p style="margin:.3em 0 0">${WC[S.sel][1]}</p>` : '<p style="margin:0">Click a component in the 3D view.</p>', S, 'inf');
    }
  });

  /* ================= Industrial robots: applications (Topic IV.4) ================= */
  RIL.defineSim({
    id: 'industrial-robots', title: 'Industrial robot applications (3D)', unit: 4, category: 'industrial-applications', kind: '3d', auto: true, autoDefault: true,
    description: 'The same six-axis arm performs palletising (grid pattern from a conveyor), spot welding (point-to-point along a seam with weld dwell), machine tending (load and unload a machine with a door interlock) and painting (continuous-path raster). Each motion is solved by inverse kinematics.',
    help: 'Select an application. The panel compares industrial robot types and conventional versus collaborative robots (Table 4.3). Change the speed override to see cycle time change.',
    camera: { position: [1.9, -2.0, 1.6], target: [0.3, 0, 0.3] },
    controls: [{ id: 'app', type: 'select', label: 'Application', string: true, value: 'pal', options: [['pal', 'Palletising from a conveyor'], ['weld', 'Spot welding along a seam'], ['tend', 'Machine tending (CNC load/unload)'], ['paint', 'Painting (continuous path)']] }, { id: 'ovr', label: 'Speed override', min: 10, max: 200, step: 5, value: 100, unit: '%' }],
    readouts: [{ id: 'app', label: 'Task' }, { id: 'step', label: 'Current motion' }, { id: 'motion', label: 'Motion type' }, { id: 'ct', label: 'Last cycle time', unit: 's' }, { id: 'n', label: 'Cycles completed' }],
    panels: [{ id: 't', title: 'Industrial robot types and industrial versus collaborative robots (Section 4.4, Table 4.3)', wide: true }],
    setup(S) { S.cell = makeCell(S, { surfaces: [{ x0: 0.25, x1: 0.75, y0: 0.3, y1: 0.8, z: 0.08 }] }); S.extra = []; S.sparks = K().points([[0, 0, -1]], 0xffd07a, 0.03, 0.9); S.three.scene.add(S.sparks); S.spray = K().points([[0, 0, -1]], 0x1f9bd7, 0.02, 0.6); S.three.scene.add(S.spray); },
    reset(S) { const c = S.cell, sc = S.three.scene; c.clear(); c.q = HOME.slice(); c.held = null; c.parts.forEach(m => sc.remove(m)); c.parts = []; S.extra.forEach(m => sc.remove(m)); S.extra = []; S.n = 0; S.tc = 0; S.t0 = S.t; S.welds = [];
      const add = m => { S.extra.push(m); return m; }; const k = K(); const box = (w, d, h, col, x, y, z) => { const m = add(k.box(w, d, h, col)); m.position.set(x, y, z); sc.add(m); return m; };
      S.conv = null; if (S.p.app === 'pal') { S.conv = c.conveyor(-0.8, 0.7, -0.5); S.extra.push(...S.conv.objs); box(0.5, 0.5, 0.08, 0x8a6a3a, 0.5, 0.55, 0.04); }
      if (S.p.app === 'weld') { const pan = box(0.5, 0.02, 0.3, 0xa8b1bb, 0.55, 0.2, 0.25); box(0.06, 0.4, 0.2, 0x6e7781, 0.55, 0.25, 0.1); S.weldPts = [0, 1, 2, 3, 4, 5].map(i => [0.35 + i * 0.08, 0.18, 0.32]); }
      if (S.p.app === 'tend') { box(0.4, 0.4, 0.45, 0x6e7781, 0.1, 0.65, 0.225); S.mDoor = box(0.3, 0.02, 0.2, 0x2da44e, 0.1, 0.44, 0.35); box(0.3, 0.3, 0.08, 0x8c959f, 0.55, -0.35, 0.04); for (let i = 0; i < 3; i++) c.part(0.47 + i * 0.08, -0.35, 0.11, 0xa8b1bb, [0.05, 0.05, 0.06]); }
      if (S.p.app === 'paint') { box(0.02, 0.6, 0.45, 0xd6dde8, 0.7, 0, 0.32); }
    },
    onControl(S, id) { if (id === 'app') S.reset(); },
    plan(S) {
      const c = S.cell, app = S.p.app;
      if (app === 'pal') { if (!c.parts.some(m => m.userData.onConv)) { const m = c.part(-0.75, -0.5, 0.13); m.userData.onConv = true; } const m = c.parts.find(q => q.userData.onConv && Math.abs(q.position.x - 0.45) < 0.03); if (m) { m.userData.onConv = false; const i = S.n % 9, layer = Math.floor(S.n / 9) % 2; c.cmd(pickCycle(c, m, [0.38 + (i % 3) * 0.08, 0.43 + Math.floor(i / 3) * 0.08, 0.11 + layer * 0.06])); c.cmd([{ q: HOME, label: 'return home', fn: () => this.done(S) }]); } }
      if (app === 'weld') { const seq = [{ q: HOME, label: 'home' }]; S.weldPts.forEach((p, i) => { seq.push({ j: [p[0], p[1] - 0.06, p[2] - TOOL + 0.02], yaw: 0, label: `approach weld ${i + 1}` }, { wait: 0.5, label: `weld spot ${i + 1} (PTP, dwell)`, fn: () => S.welds.push(p) }); }); seq.push({ q: HOME, label: 'return home', fn: () => { this.done(S); S.welds = []; } }); c.cmd(seq); }
      if (app === 'tend') { const blank = c.parts.find(m => m.position.y < -0.2 && !m.userData.done); if (!blank) { c.parts.forEach(m => { m.userData.done = false; m.position.set(0.47 + c.parts.indexOf(m) * 0.08, -0.35, 0.11); }); return; } c.cmd(pickCycle(c, blank, [0.1, 0.3, 0.33]).slice(0, 4)); c.cmd([{ fn: () => (S.mDoor.position.z = 0.6), label: 'machine door opens (handshake)' }, { j: [0.1, 0.42, 0.42], label: 'enter machine' }, { l: [0.1, 0.6, 0.48], v: 0.2, label: 'load into chuck' }, { grip: 'open', label: 'release in chuck' }, { l: [0.1, 0.4, 0.48], v: 0.25, label: 'leave machine' }, { fn: () => (S.mDoor.position.z = 0.35), wait: 1.2, label: 'machining (door closed)' }, { fn: () => (S.mDoor.position.z = 0.6), label: 'door opens' }, { l: [0.1, 0.6, 0.48], v: 0.2, label: 'reach finished part' }, { grip: 'close', label: 'grip finished part' }, { l: [0.1, 0.4, 0.48], v: 0.25, label: 'withdraw' }, { j: [blank.userData.home0 ?? 0.55, 0.3, 0.2], label: 'transfer to output' }, { l: [0.55, 0.3, 0.13], label: 'place' }, { grip: 'open', fn: () => { blank.userData.done = true; S.mDoor.position.z = 0.35; } }, { q: HOME, label: 'return home', fn: () => this.done(S) }]); }
      if (app === 'paint') { const seq = [{ q: HOME }]; for (let r = 0; r < 5; r++) { const z = 0.5 - r * 0.08, y0 = r % 2 ? 0.25 : -0.25, y1 = -y0; seq.push({ j: [0.5, y0, z - TOOL], yaw: 0, label: 'move to stroke start' }, { l: [0.5, y1, z - TOOL], v: 0.3, label: `paint stroke ${r + 1} (CP, linear)`, paint: true }); } seq.push({ q: HOME, label: 'return home', fn: () => this.done(S) }); c.cmd(seq); }
    },
    done(S) { S.n++; S.tc = S.t - S.t0; S.t0 = S.t; },
    step(S, dt) {
      const c = S.cell; c.speed = S.p.ovr / 100; if (S.conv) { S.conv.run = !c.parts.some(m => m.userData.onConv && Math.abs(m.position.x - 0.45) < 0.03); S.conv.step(dt); c.parts.forEach(m => { if (m.userData.onConv && S.conv.run) m.position.x += S.conv.v * dt; }); }
      if (!c.busy() && S.auto) this.plan(S); dyn(c); c.update(dt);
    },
    draw(S) {
      const c = S.cell, k = K(); c.render(); const cur = c.cur || {}; const tp = c.tcp();
      const sp = S.p.app === 'weld' && cur.wait !== undefined && /weld/.test(cur.label || ''); const g = S.sparks.geometry; const arr = []; if (sp) for (let i = 0; i < 40; i++) arr.push([tp[0] + (Math.random() - .5) * 0.08, tp[1] + 0.06 + (Math.random() - .5) * 0.08, tp[2] + TOOL - 0.02 + (Math.random() - .5) * 0.08]); (S.welds || []).forEach(p => arr.push(p)); if (!arr.length) arr.push([0, 0, -1]); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr.flat()), 3));
      const pa = []; if (cur.paint) for (let i = 0; i < 30; i++) pa.push([tp[0] + 0.05 + Math.random() * 0.13, tp[1] + (Math.random() - .5) * 0.06, tp[2] + (Math.random() - .5) * 0.06]); if (!pa.length) pa.push([0, 0, -1]); S.spray.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pa.flat()), 3));
      const names = { pal: 'Palletising (4/6-axis, PTP with blended approach)', weld: 'Spot welding (PTP to each spot, dwell for weld)', tend: 'Machine tending (handshake with machine door)', paint: 'Painting (continuous path, linear strokes)' };
      S.set('app', names[S.p.app]); S.set('step', cur.label || (c.busy() ? '…' : 'waiting')); S.set('motion', cur.l ? 'MOVL (linear)' : (cur.j || cur.q) ? 'MOVJ (joint)' : cur.grip ? 'gripper I/O' : cur.wait !== undefined ? 'dwell / wait' : '—'); S.set('ct', S.tc || 0); S.set('n', S.n || 0);
      RIL.setHTML(S.panel('t'), '<div class="table-scroll">' + RIL.ui.kv([['Articulated six-axis', 'Welding, handling, painting, machine tending'], ['SCARA', 'Fast planar assembly, pick-and-place'], ['Delta (parallel)', 'High-speed picking and packaging'], ['Cartesian / gantry', 'Large work areas, palletising, dispensing'], ['Palletising 4-axis', 'Stacking with fixed (horizontal) flange'], ['Collaborative (cobot)', 'Power & force limited; works beside people after risk assessment']], ['Robot type', 'Typical applications']) + RIL.ui.kv([['Safeguarding', 'Fences, interlocks, light curtains', 'Power and force limiting, speed and separation monitoring'], ['Payload / speed', 'High', 'Low to medium'], ['Programming', 'Pendant, offline', 'Hand guiding, graphical apps, pendant'], ['Sensing', 'Encoders; optional external sensors', 'Joint torque sensors or current monitoring, collision detection'], ['Typical use', 'High-volume welding, painting, handling', 'Small-batch assembly, machine tending, inspection']], ['', 'Conventional industrial robot', 'Collaborative robot (cobot)']) + '</div>', S, 't');
    }
  });

  /* ================= Robot programming (Topic IV.5) ================= */
  const DEFPROG = `! Educational robot language (generic syntax, not a vendor controller)
SPEED 80
MOVJ HOME
LOOP:
  WAIT DI[1]=ON          ! part present at pick station
  MOVJ P1 + OFFSET(0,0,100)
  MOVL P1 V=300
  SET DO[1]              ! close gripper
  WAIT 0.3
  MOVL P1 + OFFSET(0,0,100) V=500
  MOVJ P2 + OFFSET(0,0,100)
  MOVL P2 V=300
  RESET DO[1]            ! open gripper
  MOVL P2 + OFFSET(0,0,100) V=500
  PULSE DO[3]            ! report "part placed" to PLC
  GOTO LOOP`;
  const POINTS = { P1: [0.55, -0.25, 0.13], P2: [0.35, 0.45, 0.13], P3: [0.6, 0.15, 0.13], P4: [0.2, -0.5, 0.13] };
  RIL.defineSim({
    id: 'robot-programming', title: 'Robot programming environment (educational language)', unit: 4, category: 'industrial-applications', kind: '3d', auto: false,
    description: 'Write and run a robot program: MOVJ (joint interpolation), MOVL (linear, straight TCP path), position points with OFFSET, SET/RESET/PULSE outputs, WAIT for inputs or time, SPEED override, labels and GOTO — the elements of a robot language in Section 4.5.2. Each line is parsed and executed on the simulated 6-axis arm; the current line is highlighted.',
    help: 'Edit the program and press Load program, then Start (or Step through lines). Points P1–P4 are taught positions in the base frame (mm in the table). Try replacing a MOVL with MOVJ and watch the TCP trace change from a straight line to a curve. This is an educational simulator, not a manufacturer-specific controller.',
    camera: { position: [1.8, -2.0, 1.6], target: [0.35, 0, 0.25] },
    controls: [{ id: 'b', type: 'buttons', buttons: [{ id: 'load', label: 'Load program' }, { id: 'part', label: 'Place a part at P1 (DI1)' }] }],
    readouts: [{ id: 'line', label: 'Executing line' }, { id: 'instr', label: 'Instruction' }, { id: 'tcp', label: 'TCP position', unit: 'mm' }, { id: 'io', label: 'DO[1] gripper, DI[1] part' }, { id: 'err', label: 'Interpreter message' }],
    panels: [{ id: 'ed', title: 'Program editor', wide: true }],
    stepFrames: 30,
    setup(S) {
      S.cell = makeCell(S, { surfaces: [{ x0: 0.15, x1: 0.55, y0: 0.3, y1: 0.6, z: 0.1 }, { x0: 0.4, x1: 0.7, y0: -0.4, y1: -0.1, z: 0.1 }] }); S.cell.box(0.3, 0.3, 0.1, 0x6e7781, 0.55, -0.25, 0.05); S.cell.box(0.4, 0.3, 0.1, 0x6e7781, 0.35, 0.45, 0.05);
      Object.entries(POINTS).forEach(([n, p]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0x2da44e })); m.position.set(...p); S.three.scene.add(m); S.three.label(n, p, 'dim', [0, 0, 0.05]); });
      S.trace = []; S.line = K().polyline([[0, 0, 0]], 0xf2a516); S.three.scene.add(S.line);
      const ed = S.panel('ed'); ed.innerHTML = `<div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:12px"><div><textarea spellcheck="false" style="width:100%;height:290px;background:#ffffff;color:#1f2328;border:1px solid #d0d7de;border-radius:6px;font:12.5px/1.45 ui-monospace,Consolas,monospace;padding:8px"></textarea></div><div><div class="lines" style="font:12px/1.45 ui-monospace,Consolas,monospace;max-height:290px;overflow:auto"></div></div></div><p style="margin:.4em 0 0;color:#57606a">Points (base frame, mm): ${Object.entries(POINTS).map(([n, p]) => `${n} = (${p.map(v => Math.round(v * 1000)).join(', ')})`).join('; ')}; HOME = joint zero pose. Instructions: MOVJ, MOVL, + OFFSET(dx,dy,dz), V=mm/s, SET/RESET/PULSE DO[n], WAIT DI[n]=ON, WAIT seconds, SPEED %, label:, GOTO label, END.</p>`;
      S.ta = ed.querySelector('textarea'); S.ta.value = DEFPROG; S.linesEl = ed.querySelector('.lines'); S.ta.addEventListener('keydown', e => e.stopPropagation());
      this.load(S);
    },
    load(S) {
      const src = S.ta.value.split('\n'); S.prog = []; S.labels = {}; S.msg = 'program loaded: ' + src.length + ' lines';
      src.forEach((raw, i) => { const s = raw.replace(/!.*/, '').trim(); if (!s) return; if (/^\w+:$/.test(s)) { S.labels[s.slice(0, -1).toUpperCase()] = S.prog.length; return; } S.prog.push({ s: s.toUpperCase(), line: i }); });
      S.pc = 0; S.DO = [0, 0, 0, 0]; S.override = 1; S.cell.clear(); S.waiting = null; S.src = src; S.renderLines = true;
    },
    reset(S) { if (S.prog) { S.pc = 0; S.cell.clear(); S.cell.q = HOME.slice(); S.cell.parts.forEach(m => S.three.scene.remove(m)); S.cell.parts = []; S.cell.held = null; S.trace = []; S.DO = [0, 0, 0, 0]; this.placePart(S); } },
    placePart(S) { if (!S.cell.parts.some(m => Math.hypot(m.position.x - POINTS.P1[0], m.position.y - POINTS.P1[1]) < 0.03)) S.cell.part(POINTS.P1[0], POINTS.P1[1], POINTS.P1[2]); },
    onButton(S, b) { if (b === 'load') { this.load(S); this.reset(S); } if (b === 'part') this.placePart(S); },
    target(S, expr) { const m = expr.match(/(HOME|P\d)(?:\s*\+\s*OFFSET\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\))?/); if (!m) return null; if (m[1] === 'HOME') return { home: true }; const p = POINTS[m[1]]; if (!p) return null; const off = m[2] !== undefined ? [m[2], m[3], m[4]].map(v => +v / 1000) : [0, 0, 0]; return { p: M.v3.add(p, off) }; },
    exec(S) {
      const c = S.cell; if (c.busy() || S.pc >= S.prog.length) return; const ins = S.prog[S.pc]; const s = ins.s; S.curIns = ins; S.msg = '';
      const DI1 = c.parts.some(m => Math.hypot(m.position.x - POINTS.P1[0], m.position.y - POINTS.P1[1]) < 0.03 && Math.abs(m.position.z - POINTS.P1[2]) < 0.03);
      let mm;
      if ((mm = s.match(/^MOV([JL])\s+(.+)$/))) { const t = this.target(S, mm[2]); const v = (mm[2].match(/V=(\d+)/) || [])[1]; if (!t) { S.msg = 'unknown point in: ' + s; S.pc++; return; } if (t.home) c.cmd([{ q: HOME, v: 1.4 * S.override }]); else if (mm[1] === 'J') c.cmd([{ j: t.p, yaw: 0, v: 1.6 * S.override }]); else c.cmd([{ l: t.p, yaw: 0, v: (v ? +v / 1000 : 0.3) * S.override }]); S.pc++; }
      else if ((mm = s.match(/^(SET|RESET)\s+DO\[(\d)\]/))) { S.DO[+mm[2]] = mm[1] === 'SET' ? 1 : 0; if (+mm[2] === 1) c.cmd([{ grip: mm[1] === 'SET' ? 'close' : 'open' }]); S.pc++; }
      else if ((mm = s.match(/^PULSE\s+DO\[(\d)\]/))) { S.DO[+mm[1]] = 1; c.cmd([{ wait: 0.2, fn: () => (S.DO[+mm[1]] = 0) }]); S.pc++; }
      else if ((mm = s.match(/^WAIT\s+DI\[(\d)\]=ON/))) { if (+mm[1] !== 1 || DI1) { S.pc++; S.waiting = null; } else { S.waiting = 'waiting for DI[1] (part present) — press "Place a part"'; if (S.auto) this.placePart(S); } }
      else if ((mm = s.match(/^WAIT\s+([\d.]+)/))) { c.cmd([{ wait: +mm[1] }]); S.pc++; }
      else if ((mm = s.match(/^SPEED\s+(\d+)/))) { S.override = +mm[1] / 100; S.pc++; }
      else if ((mm = s.match(/^GOTO\s+(\w+)/))) { const L = S.labels[mm[1]]; if (L === undefined) { S.msg = 'label not found: ' + mm[1]; S.pc = S.prog.length; } else S.pc = L; if (!c.parts.some(m => m.position.x > 0.45 && m.position.y < 0)) this.placePart(S); }
      else if (/^END/.test(s)) S.pc = S.prog.length;
      else { S.msg = 'syntax error: ' + s; S.pc++; }
    },
    step(S, dt) { if (!S.prog) return; this.exec(S); dyn(S.cell); S.cell.update(dt); const p = S.cell.tcp(); const l = S.trace[S.trace.length - 1]; if (!l || M.v3.norm(M.v3.sub(l, p)) > 0.004) { S.trace.push(p); if (S.trace.length > 600) S.trace.shift(); if (S.trace.length > 1) K().updateLine(S.line, S.trace); } },
    draw(S) {
      const c = S.cell; c.render(); if (!S.prog) return; const ins = S.curIns; const p = c.tcp();
      S.set('line', ins ? ins.line + 1 : '—'); S.set('instr', ins ? ins.s : '—'); S.set('tcp', p.map(v => Math.round(v * 1000)).join(', ')); S.set('io', `DO1 ${S.DO[1] ? 'ON' : 'OFF'}, DI1 ${c.parts.some(m => Math.hypot(m.position.x - POINTS.P1[0], m.position.y - POINTS.P1[1]) < 0.03) ? 'ON' : 'OFF'}`); S.set('err', c.err || S.msg || S.waiting || (S.pc >= S.prog.length ? 'program ended' : 'running'), (c.err || /error|not found/.test(S.msg)) ? 'bad' : '');
      const cl = ins ? ins.line : -1; if (S._cl !== cl || S.renderLines) { S._cl = cl; S.renderLines = false; S.linesEl.innerHTML = S.src.map((l, i) => `<div style="padding:0 6px;border-radius:3px;${i === cl ? 'background:#fff1d6;color:#7a4b00;font-weight:700' : 'color:#57606a'}">${String(i + 1).padStart(2, ' ')}  ${l.replace(/&/g, '&amp;').replace(/</g, '&lt;') || '&nbsp;'}</div>`).join(''); }
    }
  });

  /* ================= Teach pendant (Topic IV.6) ================= */
  RIL.defineSim({
    id: 'teach-pendant', title: 'Virtual teach pendant', unit: 4, category: 'industrial-applications', kind: '3d', auto: false,
    description: 'Hand-held operator interface: operating mode (T1 reduced speed ≤ 250 mm/s, T2, AUTO), three-position enabling switch, jogging in joint, world (base) or tool coordinates, speed override, incremental steps, position display, home, teaching points, running the taught program and an emergency stop.',
    help: 'Hold the enabling switch (tick the box) and press-and-hold a jog key. In Joint mode the keys move single axes; in World mode they move the TCP along base axes (inverse kinematics); in Tool mode along the tool axes. Record points and Run them in AUTO. E-STOP latches until Reset.',
    camera: { position: [1.8, -2.0, 1.6], target: [0.35, 0, 0.3] },
    controls: [],
    readouts: [{ id: 'mode', label: 'Mode / state' }, { id: 'q', label: 'Joint angles θ₁…θ₆', unit: '°' }, { id: 'p', label: 'TCP (x, y, z)', unit: 'mm' }, { id: 'v', label: 'TCP speed', unit: 'mm/s' }, { id: 'pts', label: 'Taught points' }],
    panels: [{ id: 'tp', title: 'Teach pendant', wide: true }],
    setup(S) {
      S.cell = makeCell(S); S.cell.box(0.3, 0.3, 0.1, 0x6e7781, 0.55, 0, 0.05); S.cell.part(0.55, 0, 0.13);
      S.pts = []; S.jog = null; S.mode = 'T1'; S.frame = 'joint'; S.ovr = 25; S.en = false; S.estop = false; S.inc = false; S.lastP = S.cell.tcp(); S.vtcp = 0;
      const pnl = S.panel('tp'); const key = (id, l) => `<button type="button" data-jog="${id}" style="min-width:58px">${l}</button>`;
      pnl.innerHTML = `<div class="pendant" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px">
        <div><div class="ctl-btns" role="group" aria-label="Operating mode">${['T1', 'T2', 'AUTO'].map(m => `<button type="button" data-mode="${m}">${m}</button>`).join('')}</div>
        <label style="display:flex;gap:6px;align-items:center;margin:.6em 0"><input type="checkbox" data-en> Enabling switch held (middle position)</label>
        <div class="ctl-btns" role="group" aria-label="Jog frame">${[['joint', 'Joint'], ['world', 'World'], ['tool', 'Tool']].map(([v, l]) => `<button type="button" data-frame="${v}">${l}</button>`).join('')}</div>
        <label style="display:block;margin-top:.6em">Speed override <b data-ovrv>25</b> %<input type="range" min="1" max="100" value="25" data-ovr style="width:100%"></label>
        <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-inc> Incremental step (1° / 1 mm per press)</label></div>
        <div><div data-keys style="display:grid;grid-template-columns:auto auto auto;gap:6px;align-items:center"></div></div>
        <div><div class="ctl-btns" style="flex-wrap:wrap"><button type="button" data-a="rec">Record point</button><button type="button" data-a="grip">Gripper open/close</button><button type="button" data-a="home">Home</button><button type="button" data-a="run">Run program</button><button type="button" data-a="clr">Clear points</button></div>
        <button type="button" data-a="estop" style="margin-top:10px;background:#c62828;color:#fff;border:3px solid #b07d00;border-radius:50%;width:84px;height:84px;font-weight:800">E-STOP</button> <button type="button" data-a="reset">Reset</button>
        <div data-list style="margin-top:8px;font:12px ui-monospace,monospace;color:#57606a"></div></div></div>`;
      const keys = pnl.querySelector('[data-keys]'); S.drawKeys = () => { const labs = S.frame === 'joint' ? ['J1', 'J2', 'J3', 'J4', 'J5', 'J6'] : S.frame === 'world' ? ['X', 'Y', 'Z', 'Rz (yaw)', '—', '—'] : ['Tool x', 'Tool y', 'Tool z', 'Rz (yaw)', '—', '—']; keys.innerHTML = labs.map((l, i) => l === '—' ? '' : `${key(i + '-', '− ' + l)}<span style="text-align:center;color:#57606a;font-size:12px">${l}</span>${key(i + '+', '+ ' + l)}`).join(''); bindJog(); };
      const bindJog = () => keys.querySelectorAll('[data-jog]').forEach(b => { const [ax, sg] = [+b.dataset.jog[0], b.dataset.jog[1] === '+' ? 1 : -1]; b.onpointerdown = e => { e.preventDefault(); if (S.inc) { S.jog = { ax, sg, once: true }; } else S.jog = { ax, sg }; S.play && S.play(); }; b.onpointerup = b.onpointerleave = () => { if (!S.inc) S.jog = null; }; });
      const sync = () => { pnl.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === S.mode)); pnl.querySelectorAll('[data-frame]').forEach(b => b.setAttribute('aria-pressed', b.dataset.frame === S.frame)); pnl.querySelector('[data-list]').innerHTML = S.pts.map((p, i) => `P${i + 1}: (${p.p.map(v => Math.round(v * 1000)).join(', ')}) grip ${p.g < 0.5 ? 'closed' : 'open'}`).join('<br>') || 'No points taught yet.'; };
      S.sync = sync;
      pnl.querySelectorAll('[data-mode]').forEach(b => (b.onclick = () => { S.mode = b.dataset.mode; if (S.mode === 'T1') S.ovr = Math.min(S.ovr, 25); sync(); }));
      pnl.querySelectorAll('[data-frame]').forEach(b => (b.onclick = () => { S.frame = b.dataset.frame; S.drawKeys(); sync(); }));
      pnl.querySelector('[data-en]').onchange = e => (S.en = e.target.checked); pnl.querySelector('[data-inc]').onchange = e => (S.inc = e.target.checked);
      pnl.querySelector('[data-ovr]').oninput = e => { S.ovr = +e.target.value; pnl.querySelector('[data-ovrv]').textContent = S.ovr; };
      pnl.querySelectorAll('[data-a]').forEach(b => (b.onclick = () => { const a = b.dataset.a, c = S.cell; if (a === 'estop') { S.estop = true; c.clear(); } if (a === 'reset') S.estop = false; if (S.estop) return;
        if (a === 'rec') S.pts.push({ p: c.tcp(), q: c.q.slice(), g: c.open }); if (a === 'clr') S.pts = []; if (a === 'grip') { if (!S.en && S.mode !== 'AUTO') { S.msg = 'hold the enabling switch'; return; } c.cmd([{ grip: c.open > 0.5 ? 'close' : 'open' }]); }
        if (a === 'home') { if (!S.en && S.mode !== 'AUTO') { S.msg = 'hold the enabling switch'; return; } c.cmd([{ q: HOME, v: 0.6 * S.ovr / 100 * 2 }]); }
        if (a === 'run') { if (S.mode !== 'AUTO' && !S.en) { S.msg = 'T1/T2 need the enabling switch; or select AUTO'; return; } const seq = []; S.pts.forEach(pt => { seq.push({ q: pt.q, v: 1.2 * S.ovr / 100 * (S.mode === 'T1' ? 0.4 : 1) }); seq.push({ grip: pt.g < 0.5 ? 'close' : 'open' }); }); c.cmd(seq); }
        sync(); S.play && S.play(); }));
      S.drawKeys(); sync();
    },
    reset(S) { if (!S.cell) return; S.cell.clear(); S.cell.q = HOME.slice(); S.cell.held = null; S.cell.parts.forEach(m => m.position.set(0.55, 0, 0.13)); },
    step(S, dt) {
      const c = S.cell; c.estop = S.estop; if (S.estop) return;
      const j = S.jog; if (j && (S.en || S.mode === 'AUTO') && S.mode !== 'AUTO') {
        const k = (S.ovr / 100) * (S.mode === 'T1' ? 0.4 : 1); const step = j.once ? 1 : dt * 60 * k;
        if (S.frame === 'joint') { const q = c.q.slice(); q[j.ax] += j.sg * step * D2R; const L = K().ROBOTS.sixR.table[j.ax]; q[j.ax] = M.clamp(q[j.ax], L.min, L.max); c.q = q; }
        else { const T = M.fkDH(K().ROBOTS.sixR.table, c.q).T[6]; const lin = j.once ? 0.001 : dt * 0.25 * k; let d = [0, 0, 0]; if (j.ax < 3) { if (S.frame === 'world') d[j.ax] = j.sg * lin; else d = [T[0][j.ax], T[1][j.ax], T[2][j.ax]].map(v => v * j.sg * lin); }
          const yaw = c.yaw() + (j.ax === 3 ? j.sg * step * D2R : 0); const p = M.v3.add(c.tcp(), d); const r = M.ikDLS(K().ROBOTS.sixR.table, c.q, { p: [p[0], p[1], p[2] + TOOL], R: Rdown(yaw) }, { maxIter: 25, lambda: 0.03 }); if (r.err < 2e-3) c.q = r.q; else S.msg = 'jog limit: outside workspace'; }
        if (j.once) S.jog = null;
      } else if (j && !S.en) S.msg = 'enabling switch not held — jog inhibited';
      dyn(c); c.update(dt); const p = c.tcp(); S.vtcp = dt > 0 ? M.v3.norm(M.v3.sub(p, S.lastP)) / dt * 1000 : 0; if (S.mode === 'T1' && S.vtcp > 250) S.msg = 'T1 speed limit 250 mm/s'; S.lastP = p;
    },
    draw(S) {
      const c = S.cell; c.render(); const p = c.tcp();
      S.set('mode', S.estop ? 'E-STOP (latched)' : `${S.mode}${S.en ? ', enabled' : ''}${S.msg ? ' — ' + S.msg : ''}`, S.estop ? 'bad' : ''); S.msg = '';
      S.set('q', c.q.map(v => M.fmt(v * R2D, 1)).join(', ')); S.set('p', p.map(v => Math.round(v * 1000)).join(', ')); S.set('v', S.vtcp); S.set('pts', S.pts.length);
    }
  });

  /* ================= Pick-and-place with vision (Topic IV.14) ================= */
  RIL.defineSim({
    id: 'pick-and-place', title: 'Vision-guided pick-and-place (3D)', unit: 4, category: 'industrial-applications', kind: '3d', auto: true, autoDefault: true,
    description: 'Parts arrive on a conveyor at random positions and orientations. An overhead camera detects each part (centroid and angle), converts pixels to robot coordinates ᴮp̃ = ᴮ_C T [s(u − u₀), −s(v − v₀), 0, 1]ᵀ (4.16) and compensates conveyor motion during the latency (Example 4.7). The robot approaches, grips, transfers, places and returns home.',
    help: 'Watch the sequence in the readouts. Change the conveyor speed and the detection latency; with conveyor tracking off the robot arrives where the part was, not where it is. The camera footprint is the blue rectangle.',
    camera: { position: [1.6, -2.2, 1.7], target: [0.3, -0.1, 0.2] },
    controls: [{ id: 'v', label: 'Conveyor speed', min: 0.02, max: 0.15, step: 0.005, value: 0.06, unit: 'm/s' }, { id: 'lat', label: 'Image-to-grasp latency', min: 0, max: 3, step: 0.05, value: 1.6, unit: 's' }, { id: 'track', type: 'toggle', label: 'Conveyor tracking compensation', value: true }],
    readouts: [{ id: 'ph', label: 'Phase' }, { id: 'px', label: 'Detected centroid (u, v)', unit: 'px' }, { id: 'ang', label: 'Detected orientation', unit: '°' }, { id: 'rb', label: 'Robot target (x, y)', unit: 'mm' }, { id: 'shift', label: 'Conveyor shift v_c·Δt', unit: 'mm' }, { id: 'n', label: 'Picked / missed' }],
    setup(S) {
      const c = S.cell = makeCell(S, { surfaces: [{ x0: 0.1, x1: 0.5, y0: 0.35, y1: 0.75, z: 0.1 }] }); S.conv = c.conveyor(-0.9, 0.9, -0.45, 0.1, 0.24); c.box(0.4, 0.4, 0.1, 0x6e7781, 0.3, 0.55, 0.05);
      const cam = c.box(0.08, 0.08, 0.06, 0xd0d7de, -0.3, -0.45, 0.85); const pole = c.box(0.02, 0.02, 0.8, 0x8c959f, -0.3, -0.75, 0.4); S.three.label('camera {C}', [-0.3, -0.45, 0.95], '');
      const fp = new THREE.Mesh(new THREE.PlaneGeometry(0.256, 0.205), new THREE.MeshBasicMaterial({ color: 0x1f9bd7, transparent: true, opacity: 0.18 })); fp.position.set(-0.3, -0.45, 0.106); S.three.scene.add(fp);
      S.fov = K().polyline([[-0.3, -0.45, 0.82], [-0.428, -0.55, 0.106], [-0.3, -0.45, 0.82], [-0.172, -0.35, 0.106], [-0.3, -0.45, 0.82], [-0.428, -0.35, 0.106], [-0.3, -0.45, 0.82], [-0.172, -0.55, 0.106]], 0x1f9bd7); S.three.scene.add(S.fov);
      S.n = 0; S.miss = 0; S.spawn = 0; S.det = null;
    },
    reset(S) { const c = S.cell; c.clear(); c.q = HOME.slice(); c.held = null; c.parts.forEach(m => S.three.scene.remove(m)); c.parts = []; S.n = 0; S.miss = 0; S.det = null; S.spawn = 0; },
    step(S, dt) {
      const c = S.cell, p = S.p; S.conv.v = p.v; S.conv.run = true; S.conv.step(dt); S.spawn -= dt;
      if (S.spawn <= 0) { const m = c.part(-0.85, -0.45 + (Math.random() - 0.5) * 0.12, 0.13, 0xc98a3a, [0.08, 0.04, 0.05]); m.rotation.z = (Math.random() - 0.5) * 1.2; m.userData.onConv = true; S.spawn = 7; }
      c.parts.forEach(m => { if (m.userData.onConv && m !== c.held) { m.position.x += p.v * dt; if (m.position.x > 0.9) { S.three.scene.remove(m); c.parts.splice(c.parts.indexOf(m), 1); S.miss++; } } });
      // camera: centre (-0.3,-0.45), s = 0.2 mm/px, principal point (640,512) — Example 4.7 scaled to this cell
      if (!c.busy()) { const m = c.parts.find(q => q.userData.onConv && !q.userData.seen && Math.abs(q.position.x + 0.3) < 0.05); if (m) { m.userData.seen = true; const s = 0.0002, u = 640 + (m.position.x + 0.3) / s, v = 512 - (m.position.y + 0.45) / s; const Cp = [s * (u - 640), -s * (v - 512)]; const Bp = [-0.3 + Cp[0], -0.45 + Cp[1]]; const shift = p.track ? p.v * p.lat : 0; const target = [Bp[0] + shift, Bp[1], 0.13]; S.det = { u, v, ang: m.rotation.z * R2D, Bp, shift, target };
        c.cmd([{ j: M.v3.add(target, [0, 0, 0.12]), yaw: m.rotation.z, time: p.lat * 0.7, label: 'approach (tracking)' }, { l: target, yaw: m.rotation.z, time: p.lat * 0.3, label: 'descend' }, { grip: 'close', label: 'grip', fn: cc => { if (cc.held) { cc.held.userData.onConv = false; } else S.missFlag = true; } }, { l: M.v3.add(target, [0, 0, 0.12]), yaw: m.rotation.z, label: 'lift' }, { j: [0.3, 0.55, 0.25], yaw: 0, label: 'transfer' }, { l: [0.22 + (S.n % 4) * 0.06, 0.5 + Math.floor((S.n % 8) / 4) * 0.1, 0.13], yaw: 0, label: 'place' }, { grip: 'open', label: 'release', fn: () => { if (!S.missFlag) S.n++; else S.miss++; S.missFlag = false; if (S.n % 8 === 0) c.parts.filter(q => !q.userData.onConv && q.position.y > 0.3).forEach(q => { S.three.scene.remove(q); c.parts.splice(c.parts.indexOf(q), 1); }); } }, { q: HOME, label: 'return home' }]); } }
      dyn(c); c.update(dt);
    },
    draw(S) {
      const c = S.cell; c.render(); const d = S.det; S.set('ph', c.cur ? c.cur.label || '…' : 'waiting for part in camera view');
      if (d) { S.set('px', `(${Math.round(d.u)}, ${Math.round(d.v)})`); S.set('ang', d.ang); S.set('rb', `(${Math.round(d.target[0] * 1000)}, ${Math.round(d.target[1] * 1000)})`); S.set('shift', d.shift * 1000); }
      S.set('n', `${S.n} / ${S.miss}`);
    }
  });

  /* ================= Robotic assembly (Topic IV.15) ================= */
  RIL.defineSim({
    id: 'robotic-assembly', title: 'Robotic assembly station (3D)', unit: 4, category: 'industrial-applications', kind: '3d', auto: true, autoDefault: true,
    description: 'The robot picks components from a feeder tray and assembles them into a fixture in sequence: base plate, two pegs inserted into holes (peg-in-hole with chamfer guidance and insertion force check), and a cover. Lateral misalignment produces a contact force on the chamfer; beyond the tolerance the insertion is aborted and retried — the role of compliance and force sensing in assembly.',
    help: 'Increase the positioning error to see larger insertion forces and failed insertions; enable the compliance (RCC wrist) to absorb misalignment. Each assembly step is listed in the readouts.',
    camera: { position: [1.6, -1.9, 1.4], target: [0.4, 0.05, 0.15] },
    controls: [{ id: 'err', label: 'Robot positioning error (lateral)', min: 0, max: 4, step: 0.1, value: 0.8, unit: 'mm' }, { id: 'chamf', label: 'Chamfer width', min: 0.2, max: 3, step: 0.1, value: 1.5, unit: 'mm' }, { id: 'rcc', type: 'toggle', label: 'Remote-centre-compliance (RCC) wrist', value: true }],
    readouts: [{ id: 'st', label: 'Assembly step' }, { id: 'F', label: 'Lateral contact force (last insertion)', unit: 'N' }, { id: 'res', label: 'Last insertion result' }, { id: 'n', label: 'Assemblies completed / retries' }],
    setup(S) { const c = S.cell = makeCell(S, { surfaces: [{ x0: 0.3, x1: 0.7, y0: -0.15, y1: 0.15, z: 0.1 }, { x0: 0.1, x1: 0.5, y0: -0.6, y1: -0.3, z: 0.1 }] }); c.box(0.4, 0.3, 0.1, 0x6e7781, 0.5, 0, 0.05); c.box(0.4, 0.3, 0.1, 0x8c959f, 0.3, -0.45, 0.05); S.three.label('fixture', [0.5, 0.12, 0.15], 'dim'); S.three.label('feeder tray', [0.3, -0.6, 0.15], 'dim'); S.n = 0; S.retry = 0; S.F = 0; S.res = '—'; },
    reset(S) { const c = S.cell; c.clear(); c.q = HOME.slice(); c.held = null; c.parts.forEach(m => S.three.scene.remove(m)); c.parts = []; S.F = S.F || 0; S.res = S.res || '—'; S.parts = { base: c.part(0.2, -0.45, 0.115, 0x6f86ad, [0.12, 0.08, 0.03], 'base'), p1: c.part(0.33, -0.42, 0.13, 0xd4b07a, [0.02, 0.02, 0.06], 'peg'), p2: c.part(0.38, -0.42, 0.13, 0xd4b07a, [0.02, 0.02, 0.06], 'peg'), cov: c.part(0.3, -0.52, 0.11, 0x1f9bd7, [0.12, 0.08, 0.02], 'cover') }; S.seq = null; },
    insert(S) { const e = S.p.err * (0.5 + Math.random()), ch = S.p.chamf, k = S.p.rcc ? 4 : 25; const ok = e <= ch; S.F = ok ? k * e : k * ch * 3; S.res = ok ? `inserted (misalignment ${M.fmt(e, 2)} mm absorbed by chamfer${S.p.rcc ? ' and RCC' : ''})` : `jammed (misalignment ${M.fmt(e, 2)} mm > chamfer) — retry`; if (!ok) S.retry++; return ok; },
    plan(S) {
      const c = S.cell, P = S.parts; const fx = [0.5, 0, 0.115];
      const pick = (m, place, lab, extra = []) => [{ j: M.v3.add([m.position.x, m.position.y, m.position.z], [0, 0, 0.1]), label: `approach ${lab}` }, { l: [m.position.x, m.position.y, m.position.z], v: 0.2, label: `grasp ${lab}` }, { grip: 'close' }, { l: [m.position.x, m.position.y, m.position.z + 0.1], label: 'lift' }, { j: M.v3.add(place, [0, 0, 0.1]), label: `move ${lab} to fixture` }, ...extra, { l: place, v: 0.1, label: `place / insert ${lab}` }, { grip: 'open' }, { l: M.v3.add(place, [0, 0, 0.1]), label: 'retract' }];
      const pegIns = (m, place, lab) => { const seq = pick(m, place, lab, [{ l: M.v3.add(place, [0, 0, 0.03]), v: 0.1, label: `align ${lab} over hole` }]); const ins = seq.findIndex(s => /insert/.test(s.label || '')); seq[ins].fn = () => { if (!this.insert(S)) { c.queue.unshift({ l: M.v3.add(place, [0, 0, 0.03]), v: 0.1, label: 'back off and retry' }, { l: place, v: 0.05, label: `retry insert ${lab}`, fn: () => this.insert(S) || this.insert(S) }); } }; return seq; };
      c.cmd([...pick(P.base, fx, 'base plate'), ...pegIns(P.p1, [0.47, 0, 0.16], 'peg 1'), ...pegIns(P.p2, [0.53, 0, 0.16], 'peg 2'), ...pick(P.cov, [0.5, 0, 0.145], 'cover'), { q: HOME, label: 'assembly complete', fn: () => { S.n++; } }, { wait: 1.2, label: 'unload assembly', fn: () => this.reset(S) }]);
    },
    step(S, dt) { const c = S.cell; if (!c.busy() && S.auto && S.parts) this.plan(S); dyn(c); c.update(dt); },
    draw(S) { const c = S.cell; c.render(); S.set('st', c.cur ? c.cur.label || '…' : 'idle'); S.set('F', S.F); S.set('res', S.res, /jammed/.test(S.res) ? 'bad' : ''); S.set('n', `${S.n} / ${S.retry}`); }
  });

  /* ================= Material handling (Topic IV.16) ================= */
  RIL.defineSim({
    id: 'material-handling', title: 'Material handling between workstations (3D)', unit: 4, category: 'industrial-applications', kind: '3d', auto: true, autoDefault: true,
    description: 'Cartons arrive on an infeed conveyor, the robot transfers them onto an outfeed conveyor running at right angles, and the outfeed delivers them to a palletising buffer; a full pallet is removed by an AGV. Conveyor speeds, arrival rate and robot cycle time determine throughput and queue length.',
    help: 'Raise the arrival rate until the robot becomes the bottleneck: the infeed queue grows and the photo-eye stops the infeed conveyor. The robot speed override changes the transfer cycle time.',
    camera: { position: [1.4, -2.5, 1.9], target: [0.2, 0.1, 0.2] },
    controls: [{ id: 'rate', label: 'Carton arrival rate', min: 2, max: 20, step: 0.5, value: 8, unit: 'per min' }, { id: 'ovr', label: 'Robot speed override', min: 30, max: 200, step: 5, value: 100, unit: '%' }, { id: 'vout', label: 'Outfeed conveyor speed', min: 0.05, max: 0.3, step: 0.01, value: 0.15, unit: 'm/s' }],
    readouts: [{ id: 'q', label: 'Cartons waiting on infeed' }, { id: 'tr', label: 'Cartons transferred' }, { id: 'pal', label: 'Cartons on pallet' }, { id: 'th', label: 'Throughput (measured)', unit: 'per min' }, { id: 'ct', label: 'Robot transfer cycle time', unit: 's' }, { id: 'agv', label: 'AGV' }],
    setup(S) {
      const c = S.cell = makeCell(S); S.inC = c.conveyor(-1.0, 0.75, -0.5, 0.1, 0.2); const k = K(); S.outBed = c.box(0.2, 1.4, 0.1, 0x8c959f, 0.55, 0.65, 0.05); S.pallet = c.box(0.4, 0.4, 0.06, 0x8a6a3a, 0.55, 1.6, 0.03); S.agv = c.box(0.5, 0.5, 0.12, 0xf2a516, 0.55, 2.6, 0.06);
      S.three.label('infeed', [-0.7, -0.5, 0.2], 'dim'); S.three.label('outfeed', [0.55, 0.6, 0.2], 'dim'); S.three.label('pallet / AGV', [0.55, 1.6, 0.25], 'dim');
      S.tr = 0; S.onPal = 0; S.spawn = 0; S.t0 = 0; S.agvState = 'waiting'; S.lastCycle = 0; S.cycStart = 0;
    },
    reset(S) { const c = S.cell; c.clear(); c.q = HOME.slice(); c.held = null; c.parts.forEach(m => S.three.scene.remove(m)); c.parts = []; S.tr = 0; S.onPal = 0; S.spawn = 0; S.t0 = S.t; S.agvState = 'waiting'; S.agv.position.y = 2.6; S.pallet.position.y = 1.6; },
    step(S, dt) {
      const c = S.cell, p = S.p; c.speed = p.ovr / 100; S.spawn -= dt; if (S.spawn <= 0) { const m = c.part(-0.95, -0.5, 0.135, 0xb08550, [0.1, 0.08, 0.07]); m.userData.zone = 'in'; S.spawn = 60 / p.rate; }
      const ins = c.parts.filter(m => m.userData.zone === 'in' && m !== c.held).sort((a, b) => b.position.x - a.position.x);
      const atPick = ins[0] && ins[0].position.x >= 0.5; S.inC.run = true; S.inC.step(dt);
      ins.forEach((m, i) => { const limit = 0.55 - i * 0.11; m.position.x = Math.min(limit, m.position.x + 0.12 * dt); });
      c.parts.filter(m => m.userData.zone === 'out' && m !== c.held).forEach(m => { m.position.y += p.vout * dt; if (m.position.y >= 1.45) { m.userData.zone = 'pal'; const k2 = S.onPal; m.position.set(0.47 + (k2 % 2) * 0.12, 1.55 + Math.floor((k2 % 4) / 2) * 0.1, 0.095 + Math.floor(k2 / 4) * 0.07); S.onPal++; } });
      if (S.onPal >= 8 && S.agvState === 'waiting') S.agvState = 'arriving';
      if (S.agvState === 'arriving') { S.agv.position.y -= 0.4 * dt; if (S.agv.position.y <= 1.6) S.agvState = 'leaving'; }
      if (S.agvState === 'leaving') { S.agv.position.y += 0.4 * dt; S.pallet.position.y = S.agv.position.y; c.parts.filter(m => m.userData.zone === 'pal').forEach(m => (m.position.y += 0.4 * dt)); if (S.agv.position.y > 2.6) { c.parts.filter(m => m.userData.zone === 'pal').forEach(m => { S.three.scene.remove(m); c.parts.splice(c.parts.indexOf(m), 1); }); S.onPal = 0; S.pallet.position.y = 1.6; S.agvState = 'waiting'; } }
      if (!c.busy() && atPick && ins[0].position.x >= 0.549) { const m = ins[0]; S.cycStart = S.t; c.cmd([...pickCycle(c, m, [0.55, 0.3, 0.135], 0, { placeYaw: PI / 2 }).map(x => x), { fn: () => { m.userData.zone = 'out'; S.tr++; S.lastCycle = S.t - S.cycStart; } }, { q: HOME, label: 'return' }]); m.userData.zone = 'robot'; }
      dyn(c); c.update(dt);
    },
    draw(S) { const c = S.cell; c.render(); const el = Math.max(1e-3, S.t - (S.t0 || 0)); S.set('q', c.parts.filter(m => m.userData.zone === 'in').length); S.set('tr', S.tr); S.set('pal', S.onPal); S.set('th', S.tr / el * 60); S.set('ct', S.lastCycle); S.set('agv', S.agvState); }
  });
})();
