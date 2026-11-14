/* =====================================================================
   Experimental Workcell — the assembled twin operating in a 3D cell:
   teach pendant, IK target, task programs, kinematic / dynamic models,
   live mathematics, graphs from the logged simulation state.
   ===================================================================== */
(function () {
  'use strict';
  const RIL = window.RIL, LK = RIL.LK, RM = RIL.RM, M = RIL.M; RIL.pages = RIL.pages || {};
  const { esc, f, deg, $ } = LK; const v3 = M.v3;
  const DT = 1 / 300;
  const OBJ_MAT = { plastic: { rho: 1050, color: 0xe5484d, name: 'ABS plastic' }, aluminium: { rho: 2700, color: 0xb9c2cc, name: 'Aluminium' }, steel: { rho: 7850, color: 0x6e7781, name: 'Steel' }, wood: { rho: 650, color: 0xc49a6c, name: 'Wood' } };
  const DEF = { tableH: 0.25, tableW: 0.5, tableD: 0.9, tableX: 0.55, convSpeed: 0.12, convDir: 1, convY: 0.62, nObj: 3, objSize: 0.05, objMat: 'plastic', pickX: 0.5, pickY: -0.2, dropX: 0.3, stackX: 0.68, stackY: 0.22, obst: true, obstX: 0.36, obstY: 0.38, obstH: 0.2, camH: 1.1, camRes: 640, vision: true, sensRange: 0.12, safety: true, safetyR: 1.25, stopOnHit: true };
  const VARS = [['q', 'Joint position', 'rad | m', 'per-joint'], ['qd', 'Joint velocity', 'rad/s | m/s', 'per-joint'], ['qdd', 'Joint acceleration', 'rad/s² | m/s²', 'per-joint'], ['e', 'Joint tracking error', 'rad | m', 'per-joint'], ['tau', 'Joint torque / force', 'N·m | N', 'per-joint'], ['cur', 'Motor current', 'A', 'per-joint'], ['volt', 'Motor voltage', 'V', 'per-joint'], ['xyz', 'Tool-tip position x, y, z', 'm', 'xyz'], ['vxyz', 'Tool-tip velocity', 'm/s', 'xyz'], ['terr', 'Tool-tip tracking error', 'mm', 'one'], ['w', 'Manipulability', '–', 'one'], ['pow', 'Electrical power', 'W', 'one'], ['energy', 'Energy consumed', 'J', 'one']];

  RIL.pages.workcell = function (main) {
    let robot = LK.twin.load(); const n = robot.joints.length; const usable = robot.base && n > 0;
    let cell = Object.assign({}, DEF, LK.store.get('cell', {}));
    main.classList.add('wide-main');
    main.innerHTML = `<div class="crumbs"><a href="${RIL.root}index.html">Home</a> / Experimental Workcell</div>
    <header class="page-head tight"><h1>Experimental Workcell</h1><p>Digital twin: <b>${esc(robot.name || 'robot')}</b> (${n}-DOF, ${RM.classify(robot).name})${LK.twin.exists() ? '' : ' — the default 6-DOF arm, because no robot has been built yet'}. <a href="${RIL.root}assembly.html">Edit it in the Assembly Studio</a>. Every number and graph below is computed from the state of this simulation.</p></header>
    ${usable ? '' : `<div class="callout">The current robot has no base or no joints. Build one in the <a href="${RIL.root}assembly.html">Assembly Studio</a> or load a template there.</div>`}
    <div class="studio-bar" role="toolbar" aria-label="Simulation">
      <label title="Which mathematical model moves the robot">Model <select id="wc-mode"><option value="kin">Mode 1 · Kinematic</option><option value="dyn">Mode 2 · Dynamic (torque, inertia, control)</option></select></label>
      <label>Task <select id="wc-task"><option value="pick">Pick-and-place (stack)</option><option value="sort">Sorting by colour</option><option value="convey">Material handling to conveyor</option><option value="inspect">Inspection, accept / reject</option><option value="teach">Taught program (waypoints)</option></select></label>
      <label>Trajectory <select id="wc-traj"><option value="quintic">Quintic (joint space)</option><option value="cubic">Cubic (joint space)</option><option value="linear">Linear interpolation (joint space)</option><option value="line">Straight line (Cartesian space)</option></select></label>
      <button class="tbtn primary" id="wc-run">▶ Run task</button><button class="tbtn" id="wc-pause">Pause</button><button class="tbtn" id="wc-reset">Reset cell</button>
      <button class="tbtn estop" id="wc-estop" title="Emergency stop: removes motion immediately">EMERGENCY STOP</button>
      <span class="sep"></span><span class="fid" id="wc-fid"></span>
    </div>
    <div class="studio wc">
      <aside class="panel side"><div class="tabs2" role="tablist">${[['pend', 'Teach pendant'], ['prog', 'Program'], ['cell', 'Workcell'], ['ctrl', 'Control'], ['over', 'Overlays']].map(t => `<button role="tab" data-t="${t[0]}">${t[1]}</button>`).join('')}</div><div id="wc-left"></div></aside>
      <section class="lview-wrap"><div class="lview-top">${LK.viewBar()}</div><div class="lstage" id="wc-stage" tabindex="0" aria-label="3D workcell"></div><div class="lview-status" id="wc-status">Ready.</div></section>
      <aside class="panel side"><div class="tabs2" role="tablist">${[['math', 'Live mathematics'], ['res', 'Results'], ['vis', 'Vision']].map(t => `<button role="tab" data-r="${t[0]}">${t[1]}</button>`).join('')}</div><div id="wc-right"></div></aside>
    </div>
    <section class="panel graphs"><div class="graph-head"><h3>Engineering graphs (from the simulation log)</h3><span><button class="tbtn" id="wc-csv">Export log CSV</button> <button class="tbtn primary" id="wc-save">Save this run for analytics and reports</button></span></div><div class="graph-grid" id="wc-graphs"></div></section>`;
    if (!usable) return;
    const tool = robot.tool ? RM.TOOLS[robot.tool] : null; const L = tool ? tool.len : 0; const full = n >= 6;
    const view = LK.view($('#wc-stage'), { position: [2.2, -2.3, 1.8], target: [0.3, 0.1, 0.4], gridSize: 4, gridDiv: 20 }); LK.wireViewBar(main, view, 'workcell'); const T3 = view.T3;
    const R3 = new LK.TwinRobot(view, robot, {});
    const world = new T3.Group(), over = new T3.Group(); view.scene.add(world, over);
    const status = (m, cls = '') => { const el = $('#wc-status'); el.textContent = m; el.className = 'lview-status ' + cls; };

    /* ---------- state ---------- */
    let q = RM.homeQ(robot), qd = q.map(() => 0), qdd = q.map(() => 0), qDes = q.slice(), qdDes = q.map(() => 0), qddDes = q.map(() => 0), eInt = q.map(() => 0), tau = q.map(() => 0), terms = null;
    let mode = 'kin', running = false, paused = false, estop = false, t = 0, acc = 0, program = [], pc = 0, st = 0, seg = null, grip = 1, held = null, objs = [], taught = LK.store.get('taught', []), speed = 0.6, ctrl = { law: 'pdg', Kp: 400, Ki: 0, Kd: 40 }, ov = { frames: false, axes: false, com: false, trace: true, ws: false, col: false, vel: true, force: false };
    let log = null, events = [], stats = null, energy = 0, hits = 0, lastHit = false, delivered = [], t0run = 0, leftTab = 'pend', rightTab = 'math', jog = null, ikInfo = null, target = [0.5, 0, 0.45], ikMethod = 'dls', prevTip = null, tipVel = [0, 0, 0];
    const flags = LK.store.get('flags', {});
    const newLog = () => ({ t: [], q: q.map(() => []), qdes: q.map(() => []), qd: q.map(() => []), qdd: q.map(() => []), e: q.map(() => []), tau: q.map(() => []), cur: q.map(() => []), volt: q.map(() => []), x: [], y: [], z: [], vx: [], vy: [], vz: [], terr: [], w: [], pow: [], energy: [] });
    log = newLog();

    /* ---------- cell geometry ---------- */
    const mat = LK.material; let conv = null, bins = {}, obstBox = null, camObj = null, sensLight = null, traceLine = null, tracePts = [], tgtMesh = null, velArrow = null, wsCloud = null;
    const box = (w, d, h, color, metal = 0.1, rough = 0.6, extra) => { const m = new T3.Mesh(new T3.BoxGeometry(w, d, h), mat(color, metal, rough, extra)); m.castShadow = true; m.receiveShadow = true; return m; };
    function surfaceZ(x, y) { // highest support under a point
      let z = 0; const c = cell;
      if (Math.abs(x - c.tableX) <= c.tableW / 2 && Math.abs(y) <= c.tableD / 2) z = Math.max(z, c.tableH);
      if (Math.abs(x - 0.1) <= 0.65 && Math.abs(y - c.convY) <= 0.14) z = Math.max(z, c.tableH);
      Object.values(bins).forEach(b => { if (Math.abs(x - b.p[0]) <= 0.13 && Math.abs(y - b.p[1]) <= 0.13) z = Math.max(z, 0.012); });
      return z;
    }
    function buildCell() {
      while (world.children.length) world.remove(world.children[0]); view.clearLabels(); const c = cell;
      const top = box(c.tableW, c.tableD, 0.03, 0xe9edf2, 0.05, 0.6); top.position.set(c.tableX, 0, c.tableH - 0.015); world.add(top);
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(s => { const leg = box(0.035, 0.035, c.tableH - 0.03, 0x9aa3ad, 0.8, 0.35); leg.position.set(c.tableX + s[0] * (c.tableW / 2 - 0.04), s[1] * (c.tableD / 2 - 0.04), (c.tableH - 0.03) / 2); world.add(leg); });
      view.label('Worktable', [c.tableX + c.tableW / 2, -c.tableD / 2, c.tableH], 'small');
      /* conveyor along x */
      const cg = new T3.Group(); const frame = box(1.3, 0.3, 0.06, 0x57606a, 0.7, 0.4); frame.position.z = c.tableH - 0.05; const belt = box(1.3, 0.24, 0.02, 0x24292f, 0, 0.9); belt.position.z = c.tableH - 0.01; cg.add(frame, belt);
      [-0.6, 0.6].forEach(x => [-0.12, 0.12].forEach(y => { const leg = box(0.03, 0.03, c.tableH - 0.08, 0x9aa3ad, 0.8, 0.35); leg.position.set(x, y, (c.tableH - 0.08) / 2); cg.add(leg); }));
      const stripes = []; for (let k = 0; k < 9; k++) { const s = box(0.012, 0.24, 0.002, 0x6e7781, 0, 0.9); s.position.z = c.tableH + 0.001; cg.add(s); stripes.push(s); }
      cg.position.set(0.1, c.convY, 0); world.add(cg); conv = { g: cg, stripes, off: 0 }; view.label('Conveyor', [0.1, c.convY + 0.16, c.tableH], 'small');
      const endX = 0.1 + c.convDir * 0.78; bins = {};
      const mkBin = (key, p, color, label) => { const g = new T3.Group(); const w = 0.26, h = 0.14; g.add(box(w, w, 0.012, color, 0.05, 0.7)); [[w / 2, 0, 0.012, w], [-w / 2, 0, 0.012, w], [0, w / 2, w, 0.012], [0, -w / 2, w, 0.012]].forEach(s => { const side = box(s[2], s[3], h, color, 0.05, 0.7, { transparent: true, opacity: 0.55 }); side.position.set(s[0], s[1], h / 2); g.add(side); }); g.position.set(p[0], p[1], 0); world.add(g); bins[key] = { p, count: 0 }; view.label(label, [p[0], p[1], 0.18], 'small'); };
      mkBin('end', [endX, c.convY], 0x0a7ea4, 'Conveyor bin'); mkBin('A', [0.05, -0.62], 0xe5484d, 'Bin A · red / accept'); mkBin('B', [0.42, -0.62], 0x1f6feb, 'Bin B · blue / reject');
      /* proximity sensor at the conveyor end */
      const sx = 0.1 + c.convDir * 0.55; const post = box(0.02, 0.02, 0.12, 0x24292f, 0.5, 0.4); post.position.set(sx, c.convY + 0.17, c.tableH + 0.06); world.add(post);
      sensLight = new T3.Mesh(new T3.SphereGeometry(0.014, 16, 12), new T3.MeshBasicMaterial({ color: 0x57606a })); sensLight.position.set(sx, c.convY + 0.17, c.tableH + 0.13); world.add(sensLight); sensLight.userData.x = sx; view.label('Proximity sensor', sensLight, 'small');
      /* obstacle */
      obstBox = null; if (c.obst) { obstBox = box(0.12, 0.12, c.obstH, 0xf2a516, 0.1, 0.6, { transparent: true, opacity: 0.85 }); obstBox.position.set(c.obstX, c.obstY, c.tableH + c.obstH / 2); world.add(obstBox); view.label('Obstacle', obstBox, 'small'); }
      /* overhead camera with its field of view on the table */
      camObj = new T3.Group(); const body = box(0.08, 0.06, 0.05, 0x24292f, 0.5, 0.4); const lens = new T3.Mesh(new T3.CylinderGeometry(0.02, 0.024, 0.04, 20), mat(0x111418, 0.6, 0.3)); lens.rotation.x = Math.PI / 2; lens.position.z = -0.045; camObj.add(body, lens); camObj.position.set(c.pickX, c.pickY + 0.1, c.camH); world.add(camObj);
      const fp = footprint(); const cz = c.camH - 0.045, tz = c.tableH + 0.002; const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(s => new T3.Vector3(camObj.position.x + s[0] * fp.hx, camObj.position.y + s[1] * fp.hy, tz)); const apex = new T3.Vector3(camObj.position.x, camObj.position.y, cz);
      const pts = []; corners.forEach((p, i) => { pts.push(apex, p, p, corners[(i + 1) % 4]); }); world.add(new T3.LineSegments(new T3.BufferGeometry().setFromPoints(pts), new T3.LineBasicMaterial({ color: 0x0a7ea4, transparent: true, opacity: 0.7 }))); view.label('Camera', camObj, 'small');
      /* safety boundary */
      if (c.safety) { const ring = new T3.Mesh(new T3.RingGeometry(c.safetyR - 0.012, c.safetyR, 96), new T3.MeshBasicMaterial({ color: 0xd1242f, side: T3.DoubleSide, transparent: true, opacity: 0.7 })); ring.position.z = 0.003; world.add(ring); }
      /* controller cabinet */
      const cab = box(0.3, 0.22, 0.5, 0xe9edf2, 0.1, 0.5); cab.position.set(-0.6, -0.5, 0.25); world.add(cab); const pan = box(0.2, 0.004, 0.12, 0x0a7ea4, 0.1, 0.4); pan.position.set(-0.6, -0.612, 0.36); world.add(pan); view.label('Robot controller', cab, 'small');
      /* objects */
      objs = []; const om = OBJ_MAT[c.objMat];
      for (let i = 0; i < c.nObj; i++) { const s = c.objSize + ((i % 3) - 1) * 0.004; const col = i % 2 ? 0x1f6feb : 0xe5484d; const m = box(s, s, s, col, c.objMat === 'plastic' || c.objMat === 'wood' ? 0 : 0.7, 0.5); const p = [c.pickX, c.pickY + i * 0.11, surfaceZ(c.pickX, c.pickY + i * 0.11) + s / 2]; m.position.set(...p); world.add(m); objs.push({ id: i + 1, mesh: m, p, s, mass: om.rho * s * s * s, colour: i % 2 ? 'blue' : 'red', state: 'rest', vz: 0 }); }
      /* draggable IK target */
      tgtMesh = new T3.Mesh(new T3.SphereGeometry(0.028, 24, 16), new T3.MeshBasicMaterial({ color: 0xbf3989, transparent: true, opacity: 0.85 })); tgtMesh.position.set(...target); tgtMesh.userData.pick = { kind: 'target' }; world.add(tgtMesh); view.label('IK target (drag)', tgtMesh, 'small');
      delivered = []; drawOverlays(true);
    }
    function footprint() { const hgt = cell.camH - 0.045 - cell.tableH; const hx = hgt * Math.tan(25 * M.D2R), hy = hgt * Math.tan(19 * M.D2R); return { hx, hy, mmpx: 2 * hx / cell.camRes * 1000 }; }
    /** camera measurement of an object: inside the field of view, quantised to the pixel grid */
    function detect(o) { const fp = footprint(); const cx = camObj.position.x, cy = camObj.position.y; const inside = Math.abs(o.p[0] - cx) <= fp.hx && Math.abs(o.p[1] - cy) <= fp.hy && o.state === 'rest' && Math.abs(o.p[2] - o.s / 2 - cell.tableH) < 0.01; if (!inside) return null; const px = fp.mmpx / 1000; const qx = Math.round((o.p[0] - cx + fp.hx) / px - 0.5) + 0.5, qy = Math.round((o.p[1] - cy + fp.hy) / px - 0.5) + 0.5; const m = [cx - fp.hx + qx * px, cy - fp.hy + qy * px]; return { m, err: Math.hypot(m[0] - o.p[0], m[1] - o.p[1]) * 1000, u: Math.round(qx), v: Math.round(qy) }; }

    /* ---------- overlays ---------- */
    function drawOverlays(rebuild) {
      R3.showFrames(ov.frames); R3.showAxes(ov.axes);
      if (rebuild || !traceLine) { while (over.children.length) over.remove(over.children[0]); traceLine = RIL.three.polyline([[0, 0, 0], [0, 0, 0]], 0xbf3989); over.add(traceLine); velArrow = new T3.ArrowHelper(new T3.Vector3(1, 0, 0), new T3.Vector3(), 0.1, 0x1a7f37, 0.04, 0.025); over.add(velArrow); wsCloud = null; }
      traceLine.visible = ov.trace; velArrow.visible = ov.vel;
      if (ov.ws && !wsCloud) { const r = M.rng(7); const pts = []; for (let k = 0; k < 2500; k++) pts.push(RM.tip(robot, robot.joints.map(j => j.min + r() * (j.max - j.min)), L).p); wsCloud = RIL.three.points(pts, 0x1f6feb, 0.012, 0.35); over.add(wsCloud); }
      if (wsCloud) wsCloud.visible = ov.ws;
    }
    const dyn = [];
    function drawDynamicOverlays() {
      dyn.forEach(o => over.remove(o)); dyn.length = 0;
      if (ov.com || ov.force) RM.bodies(robot, R3.T).forEach(b => { if (ov.com) { const s = new T3.Mesh(new T3.SphereGeometry(0.014 + 0.006 * Math.cbrt(b.m), 12, 10), new T3.MeshBasicMaterial({ color: 0xbf3989, depthTest: false })); s.position.set(...b.p); s.renderOrder = 5; over.add(s); dyn.push(s); } if (ov.force) { const a = new T3.ArrowHelper(new T3.Vector3(0, 0, -1), new T3.Vector3(...b.p), Math.min(0.5, 0.02 * b.m * RM.g0 / 2 + 0.04), 0xd1242f, 0.03, 0.02); over.add(a); dyn.push(a); } });
      if (ov.col) R3.spheres().forEach(s => { const m = new T3.Mesh(new T3.SphereGeometry(s.r, 12, 8), new T3.MeshBasicMaterial({ color: 0x0a7ea4, wireframe: true, transparent: true, opacity: 0.35 })); m.position.set(...s.c); over.add(m); dyn.push(m); });
    }

    /* ---------- kinematics helpers ---------- */
    const DOWN = yaw => { const c = Math.cos(yaw), s = Math.sin(yaw); return [[c, s, 0], [s, -c, 0], [0, 0, -1]]; };
    function solveTo(p, seed, method) {
      const tg = full ? { p, R: DOWN(0) } : { p }; const seeds = [seed, RM.homeQ(robot), robot.joints.map((j, i) => M.clamp([0, 0.6, -0.6, 0, 0.8, 0, 0.3][i] || 0, j.min, j.max)), robot.joints.map((j, i) => M.clamp([0.3, -0.5, 0.9, 0.2, -0.7, 0.1, 0][i] || 0, j.min, j.max))]; let best = null;
      for (const s of seeds) { const o = RM.ikSolve(robot, s, tg, { tool: L, method: method || 'dls', alpha: 1, maxIter: 250, tol: 2e-4 }); if (!best || o.posErr < best.posErr) best = o; if (o.converged) break; if (method && method !== 'dls') break; }
      return best;
    }
    function tipNow(qq = q) { return RM.tip(robot, qq, L); }
    function collisions() {
      const out = []; const c = cell; R3.spheres().forEach(s => {
        if (obstBox) { const dx = Math.max(Math.abs(s.c[0] - c.obstX) - 0.06, 0), dy = Math.max(Math.abs(s.c[1] - c.obstY) - 0.06, 0), dz = Math.max(Math.abs(s.c[2] - (c.tableH + c.obstH / 2)) - c.obstH / 2, 0); if (Math.hypot(dx, dy, dz) < s.r) out.push(`link ${s.link} ↔ obstacle`); }
        if (s.link !== 'tool' && s.link > 1 && s.c[2] - s.r < surfaceZ(s.c[0], s.c[1]) - 0.004 && surfaceZ(s.c[0], s.c[1]) >= c.tableH) out.push(`link ${s.link} ↔ table/conveyor`);
        if (s.link !== 'tool' && s.link > 1 && s.c[2] - s.r < -0.004) out.push(`link ${s.link} ↔ floor`);
        if (c.safety && Math.hypot(s.c[0], s.c[1]) + s.r > c.safetyR) out.push(`link ${s.link} outside the safety boundary`);
      }); return [...new Set(out)];
    }

    /* ---------- program ---------- */
    function buildProgram(task) {
      const P = []; let seed = q.slice(); const notes = []; const c = cell; let stack = 0; const cnt = { A: 0, B: 0, end: 0 };
      const mv = (p, line, what) => { const o = solveTo(p, seed); if (!o.converged) { notes.push(`${what}: ${o.reason}`); return false; } seed = o.q; P.push({ type: 'move', q: o.q, line: line || $('#wc-traj').value === 'line', what, p }); return true; };
      if (task === 'teach') { if (!taught.length) return { P: [], notes: ['No waypoints recorded. Jog the robot and press "Record waypoint" on the teach pendant.'] }; taught.forEach((w, i) => P.push(w.type === 'grip' ? { type: 'grip', close: w.close, what: w.close ? 'close gripper' : 'open gripper' } : { type: 'move', q: w.q, line: $('#wc-traj').value === 'line', what: 'waypoint ' + (i + 1) })); return { P, notes }; }
      const list = objs.filter(o => o.state === 'rest');
      list.forEach(o => {
        let pk = [o.p[0], o.p[1]]; if (c.vision) { const d = detect(o); if (!d) { notes.push(`Object ${o.id} is outside the camera field of view, so vision-guided picking cannot locate it.`); return; } pk = d.m; }
        const zc = o.p[2]; const start = P.length; const keep = seed.slice();
        let place, after = null;
        if (task === 'pick') { place = [c.stackX, c.stackY, surfaceZ(c.stackX, c.stackY) + o.s / 2 + stack]; }
        else if (task === 'sort') { const b = o.colour === 'red' ? 'A' : 'B'; place = [bins[b].p[0], bins[b].p[1] + (cnt[b]++ % 2 ? 0.05 : -0.05), 0.2]; after = b; }
        else if (task === 'convey') { place = [c.dropX, c.convY, c.tableH + o.s / 2 + 0.004]; }
        else { const okSize = Math.abs(o.s - c.objSize) <= 0.002; const b = okSize ? 'A' : 'B'; place = [bins[b].p[0], bins[b].p[1] + (cnt[b]++ % 2 ? 0.05 : -0.05), 0.2]; after = b; }
        const ok = mv([pk[0], pk[1], zc + 0.12], false, `approach object ${o.id}`) && mv([pk[0], pk[1], zc], true, `descend to object ${o.id}`) && (P.push({ type: 'grip', close: true, what: `grip object ${o.id}` }), true) && mv([pk[0], pk[1], zc + 0.14], true, `lift object ${o.id}`)
          && (task !== 'inspect' || (mv([camObj.position.x, camObj.position.y, c.tableH + 0.3], false, `present object ${o.id} to the camera`) && (P.push({ type: 'wait', t: 0.5, what: `inspect object ${o.id}: measured ${(o.s * 1000).toFixed(1)} mm, nominal ${(c.objSize * 1000).toFixed(1)} ± 2 mm → ${Math.abs(o.s - c.objSize) <= 0.002 ? 'ACCEPT' : 'REJECT'}` }), true)))
          && mv([place[0], place[1], place[2] + 0.14], false, `move above the place position`) && mv(place, true, `lower object ${o.id}`) && (P.push({ type: 'grip', close: false, what: `release object ${o.id}`, bin: after }), true) && mv([place[0], place[1], place[2] + 0.14], true, 'retreat');
        if (!ok) { P.length = start; seed = keep; } else if (task === 'pick') stack += o.s;
      });
      if (P.length) P.push({ type: 'move', q: RM.homeQ(robot), what: 'return home' });
      return { P, notes };
    }
    function startSeg(step) {
      const tr = $('#wc-traj').value; const a = qDes.slice(); const dq = step.q.map((v, i) => Math.abs(v - a[i]));
      const tf = Math.max(0.35, ...dq.map((d, i) => d / (robot.joints[i].velMax * speed * 0.55)) ) * (tr === 'linear' ? 0.8 : 1.5);
      seg = { a, b: step.q, tf, kind: tr === 'line' ? 'quintic' : tr, line: step.line && step.p, pa: tipNow(a).p, pb: step.p, qprev: a.slice() }; st = 0;
    }
    function desiredAt(tt, h) {
      if (!seg) return;
      if (seg.line) { // Cartesian straight line: s(t) quintic, IK at every tick from the previous solution
        const s = M.traj.quintic(0, 1, seg.tf, tt).q; const p = v3.add(seg.pa, v3.scale(v3.sub(seg.pb, seg.pa), s));
        const o = RM.ikSolve(robot, seg.qprev, full ? { p, R: DOWN(0) } : { p }, { tool: L, method: 'dls', lambda: 0.03, alpha: 1, maxIter: 12, tol: 1e-5 });
        const qn = tt >= seg.tf ? seg.b : o.q; const qdn = qn.map((v, i) => (v - seg.qprev[i]) / h); qddDes = qdn.map((v, i) => (v - qdDes[i]) / h); qdDes = qdn; qDes = qn; seg.qprev = qn.slice();
      } else { const r = RM.jointTraj(seg.kind, seg.a, seg.b, seg.tf, tt); qDes = r.q; qdDes = r.qd; qddDes = r.qdd; }
    }
    function ev(msg, cls = '') { events.push({ t, msg, cls }); status(`t = ${t.toFixed(2)} s · ${msg}`, cls); if (leftTab === 'prog') drawLeft(); }
    function gripAction(step) {
      grip = step.close ? 0 : 1; R3.setGrip(grip); const tp = R3.gripPoint();
      if (step.close) {
        const o = objs.filter(x => x.state === 'rest' || x.state === 'belt').map(x => ({ x, d: Math.hypot(x.p[0] - tp[0], x.p[1] - tp[1]), dz: Math.abs(x.p[2] - tp[2]) })).sort((a, b) => a.d - b.d)[0];
        if (!o || o.d > 0.022 || o.dz > 0.035) { ev(`Grip failed: no object within the gripper (nearest is ${o ? (o.d * 1000).toFixed(1) : '—'} mm off-centre; tolerance 22 mm).`, 'bad'); stats.missed++; return; }
        const need = o.x.mass * RM.g0 * 2 / (2 * (tool ? tool.mu : 0.5)); if (tool && need > tool.maxForce) { ev(`Grip failed: object ${o.x.id} (${o.x.mass.toFixed(2)} kg) needs ${need.toFixed(0)} N of grip force with safety factor 2, the tool gives ${tool.maxForce} N.`, 'bad'); stats.missed++; return; }
        if (!tool) { ev('Grip failed: the robot has no end effector. Attach one in the Assembly Studio.', 'bad'); stats.missed++; return; }
        held = o.x; held.state = 'held'; held.off = v3.sub(held.p, tp); robot.payload = held.mass; ev(`Object ${held.id} gripped (needs ${need.toFixed(1)} N, available ${tool.maxForce} N).`, 'ok'); stats.picked++;
      } else if (held) { const h = held; held = null; robot.payload = 0; h.state = 'fall'; h.vz = 0; h.bin = step.bin || null; h.placed = true; ev(`Object ${h.id} released.`); }
    }
    function finish(reason, cls) {
      running = false; seg = null; const T = t - t0run; const tt = log.t;
      stats.cycle = T; stats.reason = reason;
      stats.joint = robot.joints.map((j, i) => RM.metrics(log.qdes[i], log.q[i]));
      stats.rmse = Math.sqrt(stats.joint.reduce((s, m) => s + (m.rmse || 0) ** 2, 0) / n); stats.maxJ = Math.max(...stats.joint.map(m => m.max || 0));
      stats.tip = { rmse: Math.sqrt(log.terr.reduce((s, v) => s + v * v, 0) / Math.max(1, log.terr.length)), max: Math.max(0, ...log.terr) };
      stats.peakTau = robot.joints.map((j, i) => Math.max(0, ...log.tau[i].map(Math.abs))); stats.peakCur = robot.joints.map((j, i) => Math.max(0, ...log.cur[i].map(Math.abs)));
      stats.energy = energy; stats.hits = hits; stats.delivered = delivered.length; stats.throughput = delivered.length ? delivered.length / (T / 60) : 0; stats.wmin = Math.min(...log.w); stats.mode = mode;
      status(`${reason} Cycle time ${T.toFixed(2)} s.`, cls); rightTab = 'res'; drawRight(true); flags.ran = true; if (mode === 'dyn') flags.dyn = true; LK.store.set('flags', flags); drawLeft();
    }
    function run() {
      if (estop) return status('Emergency stop is latched. Press "Reset cell" to release it.', 'bad');
      const task = $('#wc-task').value; const b = buildProgram(task); program = b.P; pc = 0; events = []; b.notes.forEach(m => events.push({ t: 0, msg: m, cls: 'bad' }));
      if (!program.length) { status(b.notes[0] || 'Nothing to do: no objects at rest on the table. Reset the cell.', 'bad'); leftTab = 'prog'; drawLeft(); return; }
      log = newLog(); energy = 0; hits = 0; tracePts = []; t0run = t; stats = { picked: 0, missed: 0, task }; running = true; paused = false; seg = null; eInt = q.map(() => 0); qDes = q.slice(); flags.traj = true;
      charts.forEach(c => c.clear()); status('Program started: ' + program.length + ' steps.'); leftTab = 'prog'; drawLeft();
    }

    /* ---------- simulation step (fixed time step, independent of the frame rate) ---------- */
    function controlTorque() {
      const e = qDes.map((v, i) => v - q[i]), ed = qdDes.map((v, i) => v - qd[i]); eInt = eInt.map((v, i) => M.clamp(v + e[i] * DT, -2, 2));
      const u = e.map((v, i) => qddDes[i] + ctrl.Kp * v + ctrl.Ki * eInt[i] + ctrl.Kd * ed[i]); const Mq = RM.massMatrix(robot, q); const G = RM.gravityVec(robot, q);
      let tq; if (ctrl.law === 'ctc') { const C = RM.coriolisVec(robot, q, qd), F = RM.frictionVec(robot, qd); tq = M.mat.mulVec(Mq, u).map((v, i) => v + C[i] + G[i] + F[i]); } else tq = u.map((v, i) => Mq[i][i] * v + (ctrl.law === 'pdg' ? G[i] : 0));
      return { tau: tq.map((v, i) => M.clamp(v, -robot.joints[i].tauMax, robot.joints[i].tauMax)), u, e };
    }
    let lastU = q.map(() => 0);
    function step() {
      if (running && !paused) {
        if (!seg) { const s = program[pc]; if (!s) return finish('Task complete.', 'ok'); if (s.type === 'move') { startSeg(s); ev(s.what); } else if (s.type === 'grip') { gripAction(s); seg = { wait: 0.35 }; st = 0; } else { ev(s.what); seg = { wait: s.t }; st = 0; } }
        st += DT; if (seg.wait !== undefined) { qdDes = q.map(() => 0); qddDes = q.map(() => 0); if (st >= seg.wait) { seg = null; pc++; } } else { desiredAt(st, DT); if (st >= seg.tf) { qDes = seg.b.slice(); qdDes = q.map(() => 0); qddDes = q.map(() => 0); seg = null; pc++; } }
      } else if (jog) applyJog();
      if (mode === 'kin') { qdd = qdDes.map((v, i) => (v - qd[i]) / DT); q = qDes.slice(); qd = qdDes.slice(); if (!running && !jog) qdd = q.map(() => 0); terms = null; tau = q.map(() => 0); }
      else {
        const c = controlTorque(); tau = c.tau; lastU = c.u; const fd = RM.fwdDyn(robot, q, qd, tau); qdd = fd.qdd; qd = qd.map((v, i) => M.clamp(v + qdd[i] * DT, -robot.joints[i].velMax * 1.5, robot.joints[i].velMax * 1.5)); q = q.map((v, i) => v + qd[i] * DT);
        q = q.map((v, i) => { const j = robot.joints[i]; if (v < j.min) { qd[i] = Math.max(0, qd[i]); return j.min; } if (v > j.max) { qd[i] = Math.min(0, qd[i]); return j.max; } return v; });
        terms = { inertial: M.mat.mulVec(fd.M, qdd), C: fd.C, G: fd.G, F: fd.F };
        robot.joints.forEach((j, i) => { const ms = RM.motorState(j, tau[i], qd[i]); energy += Math.abs(ms.p) * DT; });
      }
      t += DT;
    }
    function applyJog() {
      const h = DT; if (jog.joint !== undefined) { const j = robot.joints[jog.joint]; qDes[jog.joint] = M.clamp(qDes[jog.joint] + jog.dir * j.velMax * 0.35 * speed * h, j.min, j.max); }
      else { const J = RM.jacTip(robot, qDes, L); const v = [0, 0, 0, 0, 0, 0]; v[jog.axis] = jog.dir * 0.25 * speed; const Ju = full ? J : J.slice(0, 3); const dq = M.mat.mulVec(M.mat.dls(Ju, 0.04), full ? v : v.slice(0, 3)); qDes = qDes.map((x, i) => M.clamp(x + dq[i] * h, robot.joints[i].min, robot.joints[i].max)); }
      qdDes = q.map(() => 0); qddDes = q.map(() => 0);
    }
    function world_update(dt) {
      const c = cell; conv.off = (conv.off + c.convSpeed * c.convDir * dt) % 0.15; conv.stripes.forEach((s, k) => { s.position.x = ((k * 0.15 + conv.off + 1.5) % 1.3) - 0.65; });
      let sensed = false; const tp = R3.gripPoint();
      objs.forEach(o => {
        if (o.state === 'held') o.p = v3.add(tp, o.off);
        else if (o.state === 'fall') { o.vz -= RM.g0 * dt; o.p[2] += o.vz * dt; const z = surfaceZ(o.p[0], o.p[1]) + o.s / 2; if (o.p[2] <= z) { o.p[2] = z; o.vz = 0; const onBelt = Math.abs(o.p[1] - c.convY) <= 0.14 && Math.abs(o.p[0] - 0.1) <= 0.65; const inBin = Object.entries(bins).find(([k, b]) => Math.abs(o.p[0] - b.p[0]) <= 0.13 && Math.abs(o.p[1] - b.p[1]) <= 0.13); o.state = onBelt ? 'belt' : inBin ? 'bin' : 'rest'; if (inBin) { bins[inBin[0]].count++; delivered.push(t); ev(`Object ${o.id} delivered to ${inBin[0] === 'end' ? 'the conveyor bin' : 'bin ' + inBin[0]}.`, 'ok'); } else if (o.state === 'rest' && o.placed) { o.placed = false; delivered.push(t); ev(`Object ${o.id} placed on the table.`, 'ok'); } } }
        else if (o.state === 'belt') { o.p[0] += c.convSpeed * c.convDir * dt; if (Math.abs(o.p[0] - sensLight.userData.x) < c.sensRange / 2) sensed = true; if (Math.abs(o.p[0] - 0.1) > 0.65) { o.state = 'fall'; o.p[0] = bins.end.p[0]; } }
        o.mesh.position.set(...o.p);
      });
      sensLight.material.color.setHex(sensed ? 0x2da44e : 0x57606a);
      const col = collisions(); const hit = col.length > 0; if (obstBox) obstBox.material.color.setHex(col.some(x => x.includes('obstacle')) ? 0xd1242f : 0xf2a516);
      if (hit && !lastHit) { hits++; flags.collision = true; ev('Collision / boundary: ' + col.join('; '), 'bad'); if (c.stopOnHit && running) { finish('Stopped: ' + col[0] + '.', 'bad'); } } lastHit = hit; stats && (stats.colNow = col);
      RIL._wcCol = col;
    }
    let logAcc = 0;
    function sample(dt) {
      const tp = tipNow(); const tpd = tipNow(qDes); if (prevTip && dt > 0) tipVel = v3.scale(v3.sub(tp.p, prevTip), 1 / dt); prevTip = tp.p.slice();
      logAcc += dt; if (!(running && !paused) || logAcc < 1 / 30) return; logAcc = 0; if (log.t.length > 1500) return;
      const J = RM.jacTip(robot, q, L); const mp = RM.manipulability(full ? J : J.slice(0, Math.min(3, n))); let pw = 0;
      log.t.push(t - t0run); robot.joints.forEach((j, i) => { log.q[i].push(q[i]); log.qdes[i].push(qDes[i]); log.qd[i].push(qd[i]); log.qdd[i].push(qdd[i]); log.e[i].push(qDes[i] - q[i]); log.tau[i].push(tau[i]); const ms = RM.motorState(j, tau[i], qd[i]); log.cur[i].push(ms.i); log.volt[i].push(ms.v); pw += ms.p; });
      log.x.push(tp.p[0]); log.y.push(tp.p[1]); log.z.push(tp.p[2]); log.vx.push(tipVel[0]); log.vy.push(tipVel[1]); log.vz.push(tipVel[2]); log.terr.push(v3.norm(v3.sub(tp.p, tpd.p)) * 1000); log.w.push(mp.w); log.pow.push(pw); log.energy.push(energy);
      charts.forEach(c => c._push()); if (ov.trace) { tracePts.push(tp.p); if (tracePts.length > 1 && tracePts.length % 3 === 0) RIL.three.updateLine(traceLine, tracePts); }
    }

    /* ---------- graphs ---------- */
    const charts = []; const gh = $('#wc-graphs');
    function seriesOf(v) { const names = robot.joints.map((j, i) => 'J' + (i + 1)); if (v === 'xyz') return [['x', log.x], ['y', log.y], ['z', log.z]]; if (v === 'vxyz') return [['vx', log.vx], ['vy', log.vy], ['vz', log.vz]]; if (['terr', 'w', 'pow', 'energy'].includes(v)) return [[VARS.find(x => x[0] === v)[1], log[v]]]; if (v === 'q') return names.flatMap((nm, i) => [[nm, log.q[i]], [nm + ' desired', log.qdes[i], true]]); return names.map((nm, i) => [nm, log[v][i]]); }
    function addChart(v0) {
      const wrap = document.createElement('div'); wrap.className = 'gcell'; wrap.innerHTML = `<label class="gsel">Variable <select>${VARS.map(v => `<option value="${v[0]}"${v[0] === v0 ? ' selected' : ''}>${v[1]}</option>`).join('')}</select></label>`; gh.append(wrap);
      const c = LK.chart(wrap, { title: '', x: 'time (s)', y: '', series: [], height: 230, legend: true }); const sel = wrap.querySelector('select');
      const redraw = () => { const v = sel.value; const meta = VARS.find(x => x[0] === v); const S = seriesOf(v); c.series(S.map((s, i) => ({ label: s[0], dash: s[2] ? [4, 3] : [], color: s[2] ? LK.PAL[((i - 1) / 2) % LK.PAL.length] + '99' : (v === 'q' ? LK.PAL[(i / 2) % LK.PAL.length] : undefined) }))); S.forEach((s, i) => c.set(i, s[1].map((y, k) => [log.t[k], y]))); c.axes('time (s)', `${meta[1]} (${meta[2]})`); c.box.querySelector('.lchart-h b').textContent = meta[1] + ((v === 'tau' || v === 'cur' || v === 'volt' || v === 'pow' || v === 'energy') && mode === 'kin' ? ' — needs Mode 2 (dynamic)' : ''); c.spec.title = meta[1]; c.flush(); };
      c._push = () => { const S = seriesOf(sel.value); const k = log.t.length - 1; c.push(log.t[k], S.map(s => s[1][k])); }; c._redraw = redraw; sel.onchange = redraw; redraw(); charts.push(c); return c;
    }
    ['q', 'xyz', 'terr', 'tau'].forEach(addChart);

    /* ---------- side panels ---------- */
    const Lp = $('#wc-left'), Rp = $('#wc-right');
    function drawLeft() {
      main.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-selected', b.dataset.t === leftTab));
      if (leftTab === 'pend') Lp.innerHTML = `<div class="pendant"><h4>Joint jog <span class="muted">(hold a button)</span></h4>${robot.joints.map((j, i) => `<div class="jog"><span>J${i + 1}</span><button class="tbtn" data-j="${i}" data-d="-1" aria-label="Joint ${i + 1} minus">−</button><output id="wc-jq${i}"></output><button class="tbtn" data-j="${i}" data-d="1" aria-label="Joint ${i + 1} plus">+</button></div>`).join('')}
        <h4>Cartesian jog <span class="muted">(tool tip, base frame)</span></h4><div class="jog3">${['X', 'Y', 'Z'].map((a, k) => `<span>${a}</span><button class="tbtn" data-c="${k}" data-d="-1">−${a}</button><button class="tbtn" data-c="${k}" data-d="1">+${a}</button>`).join('')}</div>
        <label class="fld"><span>Speed override</span><input type="range" id="wc-speed" min="0.1" max="1" step="0.05" value="${speed}"><em id="wc-speedv">${(speed * 100).toFixed(0)} %</em></label>
        <div class="btn-row"><button class="tbtn" id="wc-home">Home position</button><button class="tbtn" id="wc-gopen">Open gripper</button><button class="tbtn" id="wc-gclose">Close gripper</button></div>
        <div class="btn-row"><button class="tbtn primary" id="wc-rec">● Record waypoint</button><button class="tbtn" id="wc-recg">Record gripper state</button></div><p class="hint">${taught.length} step(s) in the taught program. Choose the task "Taught program" and press Run to execute them.</p>
        <h4>Inverse kinematics to the target</h4><p class="hint">Drag the magenta sphere in the 3D view (it moves in the horizontal plane) and set its height here.</p>
        <label class="fld"><span>Target x</span><input type="number" step="0.01" data-tg="0" value="${f(target[0])}"><em>m</em></label><label class="fld"><span>Target y</span><input type="number" step="0.01" data-tg="1" value="${f(target[1])}"><em>m</em></label><label class="fld"><span>Target z</span><input type="number" step="0.01" data-tg="2" value="${f(target[2])}"><em>m</em></label>
        <label class="fld"><span>Solver</span><select id="wc-ikm"><option value="dls">Damped least squares</option><option value="pinv">Jacobian pseudoinverse</option><option value="inverse">Jacobian inverse (square J only)</option><option value="transpose">Jacobian transpose (gradient)</option></select><em></em></label>
        <div class="btn-row"><button class="tbtn primary" id="wc-ik">Solve IK and move</button></div><div id="wc-ikout"></div></div>`;
      else if (leftTab === 'prog') Lp.innerHTML = `<h4>Program ${running ? '(running)' : ''}</h4>${program.length ? `<ol class="prog">${program.map((s, i) => `<li class="${i === pc && running ? 'cur' : i < pc ? 'done' : ''}">${s.type === 'move' ? (s.line ? 'MOVE L' : 'MOVE J') : s.type === 'grip' ? (s.close ? 'GRIP CLOSE' : 'GRIP OPEN') : 'WAIT'} <span class="muted">${esc(s.what)}</span></li>`).join('')}</ol>` : '<p class="muted">Press "Run task" to generate the program for the selected task. Each Cartesian target is converted to joint angles by inverse kinematics before the motion starts.</p>'}
        <h4>Event log</h4><ul class="events">${events.slice(-14).map(e => `<li class="${e.cls}"><span>${e.t.toFixed(2)} s</span> ${esc(e.msg)}</li>`).join('') || '<li class="muted">No events yet.</li>'}</ul>
        <h4>Taught waypoints</h4>${taught.length ? `<ol class="prog">${taught.map(w => `<li>${w.type === 'grip' ? (w.close ? 'GRIP CLOSE' : 'GRIP OPEN') : 'P = [' + w.q.map((v, i) => robot.joints[i] && robot.joints[i].type === 'P' ? f(v, 2) : f(deg(v), 0) + '°').join(', ') + ']'}</li>`).join('')}</ol><button class="tbtn" id="wc-cleart">Clear taught program</button>` : '<p class="muted">None recorded.</p>'}`;
      else if (leftTab === 'cell') { const F = (k, label, unit, step, min, max) => `<label class="fld"><span>${label}</span><input type="number" data-cell="${k}" value="${cell[k]}" step="${step}" min="${min}" max="${max}"><em>${unit}</em></label>`; const B = (k, label) => `<label class="chk"><input type="checkbox" data-cell="${k}" ${cell[k] ? 'checked' : ''}> ${label}</label>`;
        Lp.innerHTML = `<h4>Worktable and objects</h4>${F('tableH', 'Table height', 'm', 0.01, 0.1, 0.6)}${F('nObj', 'Number of objects', '', 1, 1, 6)}${F('objSize', 'Object edge (nominal)', 'm', 0.002, 0.03, 0.08)}<label class="fld"><span>Object material</span><select data-cell="objMat">${Object.entries(OBJ_MAT).map(([k, v]) => `<option value="${k}"${cell.objMat === k ? ' selected' : ''}>${v.name} (${v.rho} kg/m³)</option>`).join('')}</select><em></em></label><p class="hint">Object mass = ρ·s³ = ${(OBJ_MAT[cell.objMat].rho * cell.objSize ** 3).toFixed(3)} kg. It becomes the payload while gripped.</p>
        ${F('pickX', 'Pick-up x', 'm', 0.01, 0.2, 0.9)}${F('pickY', 'Pick-up y (first object)', 'm', 0.01, -0.5, 0.3)}${F('stackX', 'Stack position x', 'm', 0.01, 0.2, 0.9)}${F('stackY', 'Stack position y', 'm', 0.01, -0.5, 0.5)}${F('dropX', 'Conveyor drop x', 'm', 0.01, -0.4, 0.7)}
        <h4>Conveyor and sensor</h4>${F('convSpeed', 'Conveyor speed', 'm/s', 0.01, 0, 0.5)}<label class="fld"><span>Direction</span><select data-cell="convDir"><option value="1"${cell.convDir == 1 ? ' selected' : ''}>+x</option><option value="-1"${cell.convDir == -1 ? ' selected' : ''}>−x</option></select><em></em></label>${F('sensRange', 'Proximity sensor range', 'm', 0.01, 0.02, 0.4)}
        <h4>Camera</h4>${F('camH', 'Camera height', 'm', 0.05, 0.6, 2)}${F('camRes', 'Horizontal resolution', 'px', 10, 20, 1920)}${B('vision', 'Vision-guided picking (use measured positions)')}
        <h4>Obstacle and safety</h4>${B('obst', 'Obstacle present')}${F('obstX', 'Obstacle x', 'm', 0.01, 0, 0.9)}${F('obstY', 'Obstacle y', 'm', 0.01, -0.5, 0.5)}${F('obstH', 'Obstacle height', 'm', 0.01, 0.05, 0.6)}${B('safety', 'Safety boundary')}${F('safetyR', 'Boundary radius', 'm', 0.05, 0.5, 2)}${B('stopOnHit', 'Stop the program on collision')}
        <div class="btn-row"><button class="tbtn" id="wc-defaults">Restore default cell</button></div>`; }
      else if (leftTab === 'ctrl') Lp.innerHTML = `<h4>Joint controller (Mode 2 only)</h4><label class="fld"><span>Control law</span><select id="wc-law"><option value="pdg">PID + gravity compensation</option><option value="pid">PID only (no gravity term)</option><option value="ctc">Computed torque</option></select><em></em></label>
        <label class="fld"><span>K<sub>p</sub></span><input type="number" data-g="Kp" value="${ctrl.Kp}" step="10" min="0"><em>s⁻²</em></label><label class="fld"><span>K<sub>i</sub></span><input type="number" data-g="Ki" value="${ctrl.Ki}" step="10" min="0"><em>s⁻³</em></label><label class="fld"><span>K<sub>d</sub></span><input type="number" data-g="Kd" value="${ctrl.Kd}" step="1" min="0"><em>s⁻¹</em></label>
        <p class="hint">u = q̈<sub>d</sub> + K<sub>p</sub>e + K<sub>i</sub>∫e dt + K<sub>d</sub>ė is an acceleration command. Independent-joint laws apply τ<sub>i</sub> = M<sub>ii</sub>(q)·u<sub>i</sub> (+ G<sub>i</sub>); computed torque applies τ = M(q)u + C(q,q̇)q̇ + G(q) + τ<sub>f</sub>. With K<sub>p</sub> = ω<sub>n</sub>² and K<sub>d</sub> = 2ζω<sub>n</sub>, the defaults give ω<sub>n</sub> = 20 rad/s, ζ = 1.</p>
        <p class="hint">Try "PID only" with K<sub>i</sub> = 0: the arm sags under gravity (steady-state error). Raise K<sub>i</sub> and the error is integrated away.</p><p class="hint">Torques are clipped at each joint's torque limit; the time step is fixed at ${(DT * 1000).toFixed(2)} ms, independent of the screen refresh.</p>`;
      else Lp.innerHTML = `<h4>Technical overlays</h4>${[['frames', 'DH / link coordinate frames'], ['axes', 'Joint axes (z)'], ['com', 'Centres of mass'], ['force', 'Gravity force vectors (m·g)'], ['vel', 'Tool-tip velocity vector'], ['trace', 'End-effector trajectory'], ['ws', 'Reachable workspace (2500 random samples)'], ['col', 'Collision geometry (bounding spheres)']].map(o => `<label class="chk"><input type="checkbox" data-ov="${o[0]}" ${ov[o[0]] ? 'checked' : ''}> ${o[1]}</label>`).join('')}<p class="hint">The world frame {0} is always drawn at the robot base: x red, y green, z blue.</p><h4>Joint limits</h4><table class="kv2">${robot.joints.map((j, i) => `<tr><td>J${i + 1}</td><td>${j.type === 'P' ? f(j.min, 2) + ' … ' + f(j.max, 2) + ' m' : f(deg(j.min), 0) + '° … ' + f(deg(j.max), 0) + '°'}</td></tr>`).join('')}</table>`;
      wireLeft();
    }
    function hold(el, on, off) { const up = () => { off(); window.removeEventListener('pointerup', up); }; el.addEventListener('pointerdown', e => { e.preventDefault(); on(); window.addEventListener('pointerup', up); }); el.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); on(); } }); el.addEventListener('keyup', off); el.addEventListener('blur', off); }
    function wireLeft() {
      Lp.querySelectorAll('[data-j]').forEach(b => hold(b, () => { if (!running && !estop) jog = { joint: +b.dataset.j, dir: +b.dataset.d }; }, () => (jog = null)));
      Lp.querySelectorAll('[data-c]').forEach(b => hold(b, () => { if (!running && !estop) jog = { axis: +b.dataset.c, dir: +b.dataset.d }; }, () => (jog = null)));
      const on = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };
      const sp = $('#wc-speed'); if (sp) sp.oninput = () => { speed = +sp.value; $('#wc-speedv').textContent = (speed * 100).toFixed(0) + ' %'; };
      on('wc-home', () => { if (running || estop) return; program = [{ type: 'move', q: RM.homeQ(robot), what: 'home position' }]; pc = 0; log = newLog(); energy = 0; t0run = t; stats = { picked: 0, missed: 0, task: 'home' }; running = true; seg = null; charts.forEach(c => c.clear()); });
      on('wc-gopen', () => gripAction({ close: false })); on('wc-gclose', () => { stats = stats || { picked: 0, missed: 0 }; gripAction({ close: true }); });
      on('wc-rec', () => { taught.push({ type: 'move', q: qDes.slice() }); LK.store.set('taught', taught); flags.taught = true; LK.store.set('flags', flags); drawLeft(); status('Waypoint recorded: ' + taught.length + ' step(s).', 'ok'); });
      on('wc-recg', () => { taught.push({ type: 'grip', close: grip === 0 }); LK.store.set('taught', taught); drawLeft(); });
      on('wc-cleart', () => { taught = []; LK.store.set('taught', taught); drawLeft(); });
      Lp.querySelectorAll('[data-tg]').forEach(el => el.onchange = () => { target[+el.dataset.tg] = +el.value || 0; tgtMesh.position.set(...target); });
      const im = $('#wc-ikm'); if (im) { im.value = ikMethod; im.onchange = () => (ikMethod = im.value); }
      on('wc-ik', () => {
        if (running || estop) return; const o = solveTo(target.slice(), q, ikMethod); ikInfo = o; flags.ik = true; LK.store.set('flags', flags);
        $('#wc-ikout').innerHTML = `<table class="kv2"><tr><td>Status</td><td class="${o.converged ? 'ok' : 'bad'}"><b>${o.converged ? 'Converged' : 'Not solved (' + o.status + ')'}</b></td></tr><tr><td>Iterations</td><td>${o.iters}</td></tr><tr><td>Position residual</td><td>${(o.posErr * 1000).toFixed(3)} mm</td></tr><tr><td>Orientation residual</td><td>${full ? f(deg(o.oriErr), 3) + '°' : 'not constrained (' + n + ' DOF < 6)'}</td></tr><tr><td>Joint limits</td><td>${o.limited ? 'a joint is at its limit' : 'all joints inside limits'}</td></tr><tr><td>Joint solution</td><td>${o.q.map((v, i) => robot.joints[i].type === 'P' ? f(v, 3) + ' m' : f(deg(v), 1) + '°').join(', ')}</td></tr></table>${o.converged ? '' : `<div class="callout">${esc(o.reason)}</div>`}`;
        if (o.converged) { program = [{ type: 'move', q: o.q, what: 'move to IK target', p: target.slice(), line: $('#wc-traj').value === 'line' }]; pc = 0; log = newLog(); energy = 0; hits = 0; tracePts = []; t0run = t; stats = { picked: 0, missed: 0, task: 'ik' }; running = true; seg = null; eInt = q.map(() => 0); charts.forEach(c => c.clear()); }
      });
      Lp.querySelectorAll('[data-cell]').forEach(el => el.onchange = () => { const k = el.dataset.cell; cell[k] = el.type === 'checkbox' ? el.checked : (el.tagName === 'SELECT' && k === 'objMat') ? el.value : +el.value; LK.store.set('cell', cell); reset(); });
      on('wc-defaults', () => { cell = Object.assign({}, DEF); LK.store.del('cell'); reset(); });
      const law = $('#wc-law'); if (law) { law.value = ctrl.law; law.onchange = () => (ctrl.law = law.value); } Lp.querySelectorAll('[data-g]').forEach(el => el.onchange = () => { ctrl[el.dataset.g] = Math.max(0, +el.value || 0); });
      Lp.querySelectorAll('[data-ov]').forEach(el => el.onchange = () => { ov[el.dataset.ov] = el.checked; drawOverlays(); });
    }
    function drawRight(force) {
      main.querySelectorAll('[data-r]').forEach(b => b.setAttribute('aria-selected', b.dataset.r === rightTab));
      if (rightTab === 'math') {
        const tp = tipNow(); const J = RM.jacTip(robot, q, L); const xd = M.mat.mulVec(J, qd); const mp = RM.manipulability(full ? J : J.slice(0, Math.min(3, n))); const rpy = M.rpyFromR(tp.R); const moving = qd.map((v, i) => Math.abs(v) > 1e-3 ? i + 1 : 0).filter(Boolean);
        const sing = mp.cond > 150; const first = moving[0];
        Rp.innerHTML = `<div class="model ${mode}"><b>${mode === 'kin' ? 'Kinematic model active' : 'Dynamic model active'}</b><br>${mode === 'kin' ? 'Used now: q(t) → A<sub>i</sub>(q<sub>i</sub>) → T₀ⁿ → p = f(q), ẋ = J(q)q̇. Torque, current and control error are <u>not</u> computed in this mode: the joints follow the planned trajectory exactly.' : 'Used now: u = q̈<sub>d</sub>+K<sub>p</sub>e+K<sub>i</sub>∫e+K<sub>d</sub>ė → τ → q̈ = M(q)⁻¹(τ − C q̇ − G − τ<sub>f</sub>) → integrate → q → T₀ⁿ. Links are point masses at their mid-points plus reflected rotor inertia.'}</div>
        <h4>Why the arm moves</h4><ol class="chain"><li class="${moving.length ? 'on' : ''}">Joint variable${moving.length > 1 ? 's' : ''} ${moving.length ? moving.map(i => 'q' + i).join(', ') : 'q<sub>i</sub>'} change${moving.length === 1 ? 's' : ''}${mode === 'dyn' ? ' because the motor torques τ accelerate the links' : ' along the planned trajectory'}.</li><li class="${moving.length ? 'on' : ''}">${first ? `A<sub>${first}</sub>(q<sub>${first}</sub>)` : 'The matrix A<sub>i</sub>(q<sub>i</sub>) of each moving joint'} is recomputed from the DH row.</li><li class="${moving.length ? 'on' : ''}">Every transform downstream of joint ${first || 'i'} changes: T₀ᵏ = A₁…A<sub>k</sub> for k ≥ ${first || 'i'}.</li><li class="${moving.length ? 'on' : ''}">T₀ⁿ gives the new tool position and orientation; the 3D view draws each link at its frame.</li></ol>
        <h4>Joint state</h4><div class="table-scroll"><table class="data sm"><tr><th></th><th>q</th><th>q̇</th><th>q̈</th>${mode === 'dyn' ? '<th>e</th><th>u</th><th>τ</th><th>i (A)</th>' : ''}</tr>${robot.joints.map((j, i) => { const P = j.type === 'P'; const lim = q[i] <= j.min + 1e-6 || q[i] >= j.max - 1e-6; return `<tr class="${lim ? 'lim' : ''}"><td>J${i + 1}</td><td>${P ? f(q[i]) + ' m' : f(deg(q[i]), 1) + '°'}</td><td>${f(qd[i], 3)}</td><td>${f(qdd[i], 2)}</td>${mode === 'dyn' ? `<td>${P ? f((qDes[i] - q[i]) * 1000, 2) + ' mm' : f(deg(qDes[i] - q[i]), 3) + '°'}</td><td>${f(lastU[i], 1)}</td><td>${f(tau[i], 2)}</td><td>${f(RM.motorState(j, tau[i], qd[i]).i, 2)}</td>` : ''}</tr>`; }).join('')}</table></div>
        <h4>T₀ⁿ(q) = A₁A₂…A<sub>${n}</sub></h4>${LK.mat(tp.Tn, 3)}<table class="kv2"><tr><td>Tool tip p</td><td>(${f(tp.p[0])}, ${f(tp.p[1])}, ${f(tp.p[2])}) m</td></tr><tr><td>Roll, pitch, yaw</td><td>${f(deg(rpy.gamma), 1)}°, ${f(deg(rpy.beta), 1)}°, ${f(deg(rpy.alpha), 1)}°</td></tr></table>
        <h4>Jacobian J(q) <span class="muted">(6 × ${n}, tool tip)</span></h4><div class="table-scroll">${LK.mat(J, 3)}</div>
        <table class="kv2"><tr><td>ẋ = J q̇ (linear)</td><td>(${f(xd[0])}, ${f(xd[1])}, ${f(xd[2])}) m/s</td></tr><tr><td>ω (angular)</td><td>(${f(xd[3])}, ${f(xd[4])}, ${f(xd[5])}) rad/s</td></tr><tr><td>Singular values</td><td>${mp.sv.map(s => f(s, 3)).join(', ')}</td></tr><tr><td>Manipulability w</td><td>${f(mp.w, 5)}</td></tr><tr><td>Condition number</td><td class="${sing ? 'bad' : ''}">${Number.isFinite(mp.cond) ? f(mp.cond, 1) : '∞'}${sing ? ' — near a singularity: some tool direction needs very large joint speeds' : ''}</td></tr></table>
        ${mode === 'dyn' && terms ? `<h4>τ = M(q)q̈ + C(q,q̇)q̇ + G(q) + τ<sub>f</sub></h4><div class="table-scroll"><table class="data sm"><tr><th></th><th>M q̈</th><th>C q̇</th><th>G</th><th>τ<sub>f</sub></th><th>Σ = τ</th></tr>${robot.joints.map((j, i) => `<tr><td>J${i + 1}</td><td>${f(terms.inertial[i], 2)}</td><td>${f(terms.C[i], 3)}</td><td>${f(terms.G[i], 2)}</td><td>${f(terms.F[i], 3)}</td><td><b>${f(terms.inertial[i] + terms.C[i] + terms.G[i] + terms.F[i], 2)}</b></td></tr>`).join('')}</table></div>` : ''}
        ${(RIL._wcCol || []).length ? `<div class="callout">Collision check: ${RIL._wcCol.join('; ')}</div>` : '<p class="hint">Collision check: clear (bounding spheres on every link against the obstacle, table, floor and safety boundary).</p>'}`;
      } else if (rightTab === 'res') {
        if (!stats || stats.cycle === undefined) { if (force || !Rp.dataset.empty) { Rp.innerHTML = '<p class="muted">Run a task. When it ends, the performance metrics computed from the simulation log appear here.</p>'; Rp.dataset.empty = 1; } return; } delete Rp.dataset.empty; if (!force) return;
        const s = stats; Rp.innerHTML = `<p class="verdict ${s.reason.startsWith('Task') ? 'ok' : 'bad'}">${esc(s.reason)}</p><table class="kv2"><tr><td>Simulation model</td><td>${s.mode === 'kin' ? 'Kinematic' : 'Dynamic'}</td></tr><tr><td>Cycle time</td><td>${f(s.cycle, 2)} s</td></tr><tr><td>Objects gripped / failed grips</td><td>${s.picked} / ${s.missed}</td></tr><tr><td>Objects delivered (bins or place position)</td><td>${s.delivered}</td></tr><tr><td>Throughput</td><td>${f(s.throughput, 1)} parts/min</td></tr><tr><td>Collision events</td><td>${s.hits}</td></tr><tr><td>Joint tracking RMSE (all joints)</td><td>${s.rmse.toExponential(2)} rad</td></tr><tr><td>Maximum joint error</td><td>${s.maxJ.toExponential(2)} rad</td></tr><tr><td>Tool-tip tracking RMSE / max</td><td>${f(s.tip.rmse, 3)} / ${f(s.tip.max, 3)} mm</td></tr><tr><td>Minimum manipulability on the path</td><td>${f(s.wmin, 5)}</td></tr>${s.mode === 'dyn' ? `<tr><td>Electrical energy</td><td>${f(s.energy, 1)} J</td></tr>` : '<tr><td>Energy, torque, current</td><td class="muted">not modelled in kinematic mode</td></tr>'}</table>
        ${s.mode === 'dyn' ? `<h4>Peak joint loads</h4><table class="data sm"><tr><th></th><th>peak |τ|</th><th>limit</th><th>peak |i|</th><th>rated I</th></tr>${robot.joints.map((j, i) => { const m = RM.motorOf(j); return `<tr><td>J${i + 1}</td><td class="${s.peakTau[i] >= j.tauMax * 0.999 ? 'bad' : ''}">${f(s.peakTau[i], 1)}</td><td>${j.tauMax}</td><td class="${m && s.peakCur[i] > m.I ? 'bad' : ''}">${m ? f(s.peakCur[i], 2) : '—'}</td><td>${m ? m.I : 'no motor'}</td></tr>`; }).join('')}</table><p class="hint">Red cells: the torque limit was reached or the motor ran above its rated current. Choose a larger gear ratio or motor in the Assembly Studio, or slow the motion.</p>` : ''}
        <p class="hint">In kinematic mode the tracking error is zero by definition. Switch to Mode 2 to see a real error between the planned and the simulated motion.</p>`;
      } else {
        const fp = footprint(); Rp.innerHTML = `<h4>Overhead camera</h4><table class="kv2"><tr><td>Field of view on the table</td><td>${f(2 * fp.hx * 1000, 0)} × ${f(2 * fp.hy * 1000, 0)} mm</td></tr><tr><td>Spatial resolution</td><td>${f(fp.mmpx, 2)} mm/pixel</td></tr><tr><td>Worst-case quantisation error</td><td>± ${f(fp.mmpx / 2 * Math.SQRT2, 2)} mm</td></tr></table><h4>Detections</h4><table class="data sm"><tr><th>Object</th><th>pixel (u, v)</th><th>measured x, y (m)</th><th>error (mm)</th></tr>${objs.map(o => { const d = detect(o); return `<tr><td>${o.id} · ${o.colour}</td>${d ? `<td>${d.u}, ${d.v}</td><td>${f(d.m[0])}, ${f(d.m[1])}</td><td class="${d.err > 22 ? 'bad' : ''}">${f(d.err, 2)}</td>` : `<td colspan="3" class="muted">${o.state === 'rest' ? 'outside the field of view' : 'not on the table (' + o.state + ')'}</td>`}</tr>`; }).join('')}</table><p class="hint">Mounting the camera higher widens the field of view but makes each pixel cover more of the table. If the position error exceeds the 22 mm gripper tolerance, vision-guided picks fail. Change camera height and resolution in the Workcell tab.</p>`;
      }
    }

    /* ---------- controls ---------- */
    function reset() { running = false; estop = false; seg = null; program = []; pc = 0; held = null; robot.payload = 0; grip = 1; R3.setGrip(1); q = RM.homeQ(robot); qd = q.map(() => 0); qdd = q.map(() => 0); qDes = q.slice(); qdDes = q.map(() => 0); qddDes = q.map(() => 0); eInt = q.map(() => 0); tracePts = []; stats = null; hits = 0; lastHit = false; prevTip = null; events = []; buildCell(); R3.update(q); drawLeft(); drawRight(true); $('#wc-estop').classList.remove('latched'); status('Cell reset. Robot at home.'); }
    $('#wc-run').onclick = run; $('#wc-pause').onclick = e => { paused = !paused; e.target.textContent = paused ? 'Resume' : 'Pause'; }; $('#wc-reset').onclick = reset;
    $('#wc-estop').onclick = () => { estop = true; if (running) finish('Emergency stop pressed.', 'bad'); running = false; jog = null; qDes = q.slice(); qdDes = q.map(() => 0); qddDes = q.map(() => 0); qd = q.map(() => 0); $('#wc-estop').classList.add('latched'); status('EMERGENCY STOP latched. Motion removed. Press "Reset cell" to release.', 'bad'); };
    const setFid = () => { $('#wc-fid').innerHTML = mode === 'kin' ? '<b>Fidelity: kinematic</b> · geometry only, exact tracking' : '<b>Fidelity: dynamic</b> · rigid-body torque model, fixed step ' + (DT * 1000).toFixed(2) + ' ms'; };
    $('#wc-mode').onchange = e => { mode = e.target.value; qd = q.map(() => 0); eInt = q.map(() => 0); qDes = q.slice(); setFid(); charts.forEach(c => c._redraw()); };
    main.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { leftTab = b.dataset.t; drawLeft(); }); main.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { rightTab = b.dataset.r; drawRight(true); });
    /* drag the IK target in its horizontal plane */
    let drag = false; const dom = view.renderer.domElement;
    dom.addEventListener('pointerdown', e => { const h = view.pickAt(e); if (h && h.pick.kind === 'target') { drag = true; view.controls.enabled = false; dom.setPointerCapture(e.pointerId); } });
    dom.addEventListener('pointermove', e => { if (!drag) return; const p = view.planePoint(e, target[2]); if (p) { target[0] = M.clamp(p[0], -1.5, 1.5); target[1] = M.clamp(p[1], -1.5, 1.5); tgtMesh.position.set(...target); Lp.querySelectorAll('[data-tg]').forEach(el => (el.value = f(target[+el.dataset.tg]))); } });
    dom.addEventListener('pointerup', () => { if (drag) { drag = false; view.controls.enabled = true; } });
    $('#wc-csv').onclick = () => { if (!log.t.length) return LK.toast('Run a task first: the log is empty.'); const cols = ['t (s)'].concat(robot.joints.flatMap((j, i) => [`q${i + 1}`, `q${i + 1}_des`, `qd${i + 1}`, `qdd${i + 1}`, `tau${i + 1}`, `i${i + 1} (A)`]), ['x (m)', 'y (m)', 'z (m)', 'tip error (mm)', 'manipulability', 'power (W)', 'energy (J)']); const rows = log.t.map((tt, k) => [tt].concat(robot.joints.flatMap((j, i) => [log.q[i][k], log.qdes[i][k], log.qd[i][k], log.qdd[i][k], log.tau[i][k], log.cur[i][k]]), [log.x[k], log.y[k], log.z[k], log.terr[k], log.w[k], log.pow[k], log.energy[k]])); LK.download('workcell_log.csv', LK.csv(cols, rows), 'text/csv'); };
    $('#wc-save').onclick = () => {
      if (!stats || stats.cycle === undefined) return LK.toast('Run a task to the end first.'); const k = Math.max(1, Math.ceil(log.t.length / 300)); const thin = a => a.filter((v, i) => i % k === 0).map(v => +(+v).toPrecision(5)); const series = { 't (s)': thin(log.t) };
      robot.joints.forEach((j, i) => { series[`q${i + 1}`] = thin(log.q[i]); series[`q${i + 1} desired`] = thin(log.qdes[i]); series[`qd${i + 1}`] = thin(log.qd[i]); if (mode === 'dyn') { series[`tau${i + 1}`] = thin(log.tau[i]); series[`i${i + 1} (A)`] = thin(log.cur[i]); } }); Object.assign(series, { 'x (m)': thin(log.x), 'y (m)': thin(log.y), 'z (m)': thin(log.z), 'tip error (mm)': thin(log.terr), 'manipulability': thin(log.w) }); if (mode === 'dyn') { series['power (W)'] = thin(log.pow); series['energy (J)'] = thin(log.energy); }
      const tp = tipNow(); const s = stats;
      LK.runs.add({ id: 'run' + Date.now(), name: `${robot.name} · ${$('#wc-task').selectedOptions[0].text} · ${mode === 'kin' ? 'kinematic' : 'dynamic'}`, date: new Date().toISOString(), robot: robot.name, dof: n, mode, task: s.task, series, metrics: { 'Cycle time (s)': s.cycle, 'Objects delivered': s.delivered, 'Throughput (parts/min)': s.throughput, 'Collision events': s.hits, 'Joint RMSE (rad)': s.rmse, 'Max joint error (rad)': s.maxJ, 'Tip RMSE (mm)': s.tip.rmse, 'Tip max error (mm)': s.tip.max, 'Min manipulability': s.wmin, 'Energy (J)': mode === 'dyn' ? s.energy : null }, dh: robot.joints.map((j, i) => [i + 1, j.type, j.a, j.d, deg(j.alpha), deg(j.offset || 0)]), T: tp.Tn, qEnd: q.slice(), shot: (() => { try { const c = document.createElement('canvas'); const src = view.renderer.domElement; view.render(); c.width = 640; c.height = Math.round(640 * src.height / src.width); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.8); } catch (e) { return null; } })() });
      flags.saved = true; LK.store.set('flags', flags); LK.toast('Run saved. Open Simulation Analytics or a report to use it.', 'ok');
    };

    buildCell(); setFid(); drawLeft(); drawRight(true);
    let ui = 0;
    view.start(dt => {
      if (!paused) { acc += dt; let k = 0; while (acc >= DT && k++ < 20) { step(); acc -= DT; } if (acc > DT * 20) acc = 0; }
      R3.update(q); world_update(paused ? 0 : dt); sample(dt); drawDynamicOverlays();
      const tp = R3.gripPoint(); if (velArrow && ov.vel) { const sp = v3.norm(tipVel); velArrow.visible = sp > 1e-3; if (sp > 1e-3) { velArrow.position.set(...tp); velArrow.setDirection(new T3.Vector3(...tipVel).normalize()); velArrow.setLength(Math.min(0.6, 0.05 + sp * 0.5), 0.04, 0.025); } }
      ui += dt; if (ui > 0.2) { ui = 0; if (rightTab !== 'res') drawRight(); robot.joints.forEach((j, i) => { const o = $('#wc-jq' + i); if (o) o.textContent = j.type === 'P' ? f(q[i]) + ' m' : f(deg(q[i]), 1) + '°'; }); if (!running && !jog && rightTab === 'vis') { } }
      charts.forEach(c => c.flush());
    });
    RIL._workcell = { run, reset, get stats() { return stats; }, get running() { return running; }, get log() { return log; }, setMode(m) { $('#wc-mode').value = m; $('#wc-mode').onchange({ target: $('#wc-mode') }); }, get q() { return q; }, view };
  };
})();
