/* =====================================================================
   Robot Assembly Studio — build a serial manipulator from components.
   The result is the shared digital twin (LK.twin) used by the Workcell,
   the Mathematical Workspace and the reports.
   ===================================================================== */
(function () {
  'use strict';
  const RIL = window.RIL, LK = RIL.LK, RM = RIL.RM, M = RIL.M; RIL.pages = RIL.pages || {};
  const { esc, f, deg, rad, $ } = LK;
  const LIB = [
    ['Mechanical', [['base', 'Robot base', 'Fixed pedestal bolted to the worktable (link 0).'], ['revolute', 'Revolute joint', 'One rotational DOF about its z axis.'], ['prismatic', 'Prismatic joint', 'One translational DOF along its z axis.'], ['link', 'Arm link', 'Rigid link along the common normal (DH a).'], ['offset', 'Offset link / shaft', 'Rigid link along the joint axis (DH d).'], ['bearing', 'Bearing', 'Accessory on the selected joint (BOM, mass).'], ['gear', 'Gear stage', 'Sets a reduction ratio on the selected joint.'], ['coupling', 'Coupling', 'Accessory on the selected joint (BOM, mass).'], ['bracket', 'Bracket', 'Accessory on the selected joint (BOM, mass).'], ['plate', 'Mounting plate', 'Accessory on the selected joint (BOM, mass).']]],
    ['Actuators', [['servo', 'Servo motor'], ['dc', 'DC motor'], ['stepper', 'Stepper motor'], ['bldc', 'BLDC motor'], ['linear', 'Linear actuator']]],
    ['Sensors', [['encoder', 'Encoder'], ['potentiometer', 'Potentiometer'], ['imu', 'IMU'], ['force', 'Force sensor'], ['torque', 'Torque sensor'], ['proximity', 'Proximity sensor']]],
    ['Electronics', [['arduino', 'Arduino Uno'], ['esp32', 'ESP32'], ['stm32', 'STM32'], ['driver', 'Motor driver'], ['hbridge', 'H-bridge'], ['pwmdrv', 'PWM driver'], ['adc', 'ADC'], ['dac', 'DAC'], ['psu', 'Power supply']]],
    ['End effectors', [['gripper2', 'Two-finger gripper'], ['gripper3', 'Three-finger gripper'], ['vacuum', 'Vacuum gripper'], ['suction', 'Suction tool']]]
  ];
  const ACC = ['bearing', 'coupling', 'bracket', 'plate'];
  const NAME = {}; LIB.forEach(c => c[1].forEach(i => (NAME[i[0]] = i[1])));

  RIL.pages.assembly = function (main) {
    let robot = LK.twin.exists() ? LK.twin.load() : RM.emptyRobot(); robot.loose = robot.loose || []; robot.sensors = robot.sensors || []; robot.electronics = robot.electronics || [];
    let sel = null, undo = [], redo = [], q = RM.homeQ(robot), tab = 'props';
    main.classList.add('wide-main');
    main.innerHTML = `<div class="crumbs"><a href="${RIL.root}index.html">Home</a> / Robot Assembly Studio</div>
    <header class="page-head tight"><h1>Robot Assembly Studio</h1><p>Drag components from the library into the 3D workspace (or click them). Compatible parts snap onto the kinematic chain: base → joint → link → joint … → end effector. The robot you build here is the one the <a href="${RIL.root}workcell.html">Experimental Workcell</a> and the <a href="${RIL.root}math.html">Mathematical Workspace</a> use.</p></header>
    <div class="studio-bar" role="toolbar" aria-label="Assembly">
      <button class="tbtn" data-a="undo" title="Undo (Ctrl+Z)">↶ Undo</button><button class="tbtn" data-a="redo" title="Redo (Ctrl+Y)">↷ Redo</button>
      <button class="tbtn" data-a="dup" title="Duplicate the selected joint with its link, motor and sensor">Duplicate</button><button class="tbtn" data-a="del" title="Delete the selected component (Del)">Delete</button>
      <span class="sep"></span><label>Template <select data-a="tpl"><option value="">Load a template…</option><option value="planar2R">Planar 2R (2-DOF)</option><option value="planar3R">Planar 3R (3-DOF)</option><option value="articulated">Articulated RRR (3-DOF)</option><option value="scara">SCARA RRPR (4-DOF)</option><option value="sixR">6-DOF industrial arm</option><option value="sevenR">7-DOF redundant arm</option></select></label>
      <button class="tbtn" data-a="new">New (empty)</button>
      <span class="sep"></span><input type="text" data-a="name" aria-label="Robot name" style="width:170px"><button class="tbtn primary" data-a="save">Save robot</button>
      <label>Saved <select data-a="load"><option value="">Load saved…</option></select></label>
      <button class="tbtn" data-a="export">Export JSON</button><button class="tbtn" data-a="import">Import JSON</button><input type="file" accept=".json,application/json" hidden data-a="file">
      <span class="sep"></span><a class="tbtn primary" href="${RIL.root}workcell.html">Open in Workcell →</a>
    </div>
    <div class="studio">
      <aside class="panel palette" aria-label="Component library"><h3>Component library</h3>${LIB.map(([cat, items]) => `<h4>${cat}</h4><div class="pal-grid">${items.map(i => `<button type="button" class="pal" draggable="true" data-c="${i[0]}" title="${esc(i[2] || (RM.MOTORS[i[0]] || RM.SENSORS[i[0]] || RM.ELECTRONICS[i[0]] || RM.TOOLS[i[0]] || {}).name || i[1])}">${i[1]}</button>`).join('')}</div>`).join('')}</aside>
      <section class="lview-wrap"><div class="lview-top">${LK.viewBar()}<div class="lview-bar"><label><input type="checkbox" data-o="frames"> DH frames</label><label><input type="checkbox" data-o="axes"> Joint axes</label><label><input type="checkbox" data-o="com"> Centres of mass</label></div></div><div class="lstage" id="as-stage" tabindex="0" aria-label="3D assembly workspace. Drop components here."></div><div class="lview-status" id="as-status"></div></section>
      <aside class="panel side" aria-label="Inspector"><div class="tabs2" role="tablist">${[['props', 'Properties'], ['tree', 'Assembly tree'], ['check', 'Validation'], ['kin', 'DH & kinematics']].map(t => `<button role="tab" data-t="${t[0]}">${t[1]}</button>`).join('')}</div><div id="as-side"></div></aside>
    </div>`;
    const view = LK.view($('#as-stage'), { position: [1.9, -2.1, 1.5], target: [0.1, 0, 0.45], gridSize: 3, gridDiv: 15 });
    LK.wireViewBar(main, view, 'assembly');
    const R3 = new LK.TwinRobot(view, robot, {}); const T3 = view.T3;
    const extra = new T3.Group(); view.scene.add(extra); const comG = new T3.Group(); view.scene.add(comG);
    const side = $('#as-side'), status = $('#as-status');

    const snapshot = () => JSON.stringify(robot);
    const commit = () => { undo.push(last); if (undo.length > 60) undo.shift(); redo = []; last = snapshot(); LK.twin.save(robot); refresh(); };
    let last = snapshot();
    const restore = s => { robot = JSON.parse(s); last = s; LK.twin.save(robot); sel = null; refresh(); };

    function drawExtras() {
      while (extra.children.length) extra.remove(extra.children[0]); view.clearLabels();
      const bench = (robot.electronics || []); const col = { controller: 0x0a7ea4, driver: 0xb3261e, pwm: 0x8250df, adc: 0x1a7f37, dac: 0x1a7f37, power: 0x57606a };
      bench.forEach((e, k) => { const d = RM.ELECTRONICS[e]; const big = d.role === 'power'; const m = new T3.Mesh(new T3.BoxGeometry(big ? 0.16 : 0.1, big ? 0.1 : 0.07, big ? 0.07 : 0.014), LK.material(col[d.role] || 0x1a7f37, 0.1, 0.6)); m.position.set(-0.62, -0.45 + k * 0.125, big ? 0.035 : 0.007); m.castShadow = true; m.userData.pick = { kind: 'elec', i: k }; extra.add(m); view.label(d.name.split(' (')[0], m, 'small'); });
      if (bench.length) { const plate = new T3.Mesh(new T3.BoxGeometry(0.26, bench.length * 0.125 + 0.08, 0.004), LK.material(0xd0d7de, 0.1, 0.7)); plate.position.set(-0.62, -0.45 + (bench.length - 1) * 0.0625, 0.0005); plate.receiveShadow = true; extra.add(plate); }
      (robot.loose || []).forEach((c, k) => { const m = new T3.Mesh(new T3.BoxGeometry(0.09, 0.09, 0.09), LK.material(0xd1242f, 0.1, 0.6, { transparent: true, opacity: 0.8 })); m.position.set(0.55 + (k % 3) * 0.14, -0.55 - ((k / 3) | 0) * 0.14, 0.045); m.userData.pick = { kind: 'loose', i: k }; extra.add(m); view.label('⚠ ' + NAME[c] + ' (not connected)', m, 'warn'); });
      (robot.sensors || []).forEach((s, k) => { const m = new T3.Mesh(new T3.BoxGeometry(0.035, 0.035, 0.02), LK.material(0x1a7f37, 0.1, 0.6)); const Tn = R3.tcpT(); m.position.set(...M.v3.add(M.pof(Tn), [0.05 * Math.cos(k * 1.6), 0.05 * Math.sin(k * 1.6), 0.02])); m.userData.pick = { kind: 'wsensor', i: k }; extra.add(m); });
      while (comG.children.length) comG.remove(comG.children[0]);
      if ($('[data-o=com]', main).checked && robot.joints.length) RM.bodies(robot, R3.T).forEach(b => { const s = new T3.Mesh(new T3.SphereGeometry(0.018 + 0.006 * Math.cbrt(b.m), 16, 12), new T3.MeshBasicMaterial({ color: 0xbf3989, depthTest: false })); s.renderOrder = 5; s.position.set(...b.p); comG.add(s); });
    }
    function need(cond, msg) { if (!cond) { LK.toast(msg, 'bad'); status.textContent = msg; } return cond; }
    function targetJoint(pick, test) {
      if (pick && pick.i !== undefined && ['joint', 'link', 'motor', 'sensor'].includes(pick.kind) && test(robot.joints[pick.i])) return pick.i;
      if (sel && sel.i !== undefined && ['joint', 'link', 'motor', 'sensor'].includes(sel.kind) && robot.joints[sel.i] && test(robot.joints[sel.i])) return sel.i;
      return robot.joints.findIndex(test);
    }
    function add(c, pick) {
      const n = robot.joints.length;
      if (c === 'base') { if (!need(!robot.base, 'The robot already has a base. A serial manipulator has exactly one fixed link.')) return; robot.base = true; sel = { kind: 'base' }; }
      else if (c === 'revolute' || c === 'prismatic') {
        if (!need(robot.base, 'Place the robot base first: a joint must connect two links, and the base is link 0.')) return;
        if (!need(!n || robot.joints[n - 1].hasLink, `Joint ${n} has no output link yet. Add a link to it before connecting another joint.`)) return;
        if (!need(n < 8, 'This studio supports up to 8 joints.')) return;
        if (!need(!robot.tool, 'Remove the end effector before extending the chain; the tool must stay on the last link.')) return;
        robot.joints.push(RM.newJoint(c === 'prismatic' ? 'P' : 'R')); sel = { kind: 'joint', i: n };
      } else if (c === 'link' || c === 'offset') {
        const i = targetJoint(pick, j => !j.hasLink);
        if (i < 0) { robot.loose.push(c); LK.toast('No free joint output to attach this link to. It is placed on the floor as a disconnected part.', 'bad'); }
        else { const j = robot.joints[i]; j.hasLink = true; if (c === 'link') { j.a = 0.3; } else { j.d = j.type === 'P' ? 0.1 : 0.3; } sel = { kind: 'link', i }; }
      } else if (RM.MOTORS[c]) {
        const i = targetJoint(pick, j => !j.motor); if (i < 0) { robot.loose.push(c); LK.toast('Every joint already has an actuator (or there is no joint). The motor is left disconnected.', 'bad'); } else { robot.joints[i].motor = c; robot.joints[i].gear = RM.MOTORS[c].gear; sel = { kind: 'motor', i }; }
      } else if (c === 'encoder' || c === 'potentiometer') {
        const i = targetJoint(pick, j => !j.sensor); if (i < 0) { robot.loose.push(c); LK.toast('No joint without a position sensor. The sensor is left disconnected.', 'bad'); } else { robot.joints[i].sensor = c; sel = { kind: 'sensor', i }; }
      } else if (RM.SENSORS[c]) { if (!n) { robot.loose.push(c); LK.toast('Add a joint first; this sensor mounts on the wrist flange.', 'bad'); } else { robot.sensors.push(c); } }
      else if (RM.ELECTRONICS[c]) { robot.electronics.push(c); }
      else if (RM.TOOLS[c]) { if (!need(n && robot.joints[n - 1].hasLink, 'An end effector mounts on the last link. Add a joint and its link first.')) return; robot.tool = c; sel = { kind: 'tool' }; }
      else if (c === 'gear') { const i = targetJoint(pick, j => !!j.motor); if (!need(i >= 0, 'A gear stage needs a joint that already has a motor.')) return; robot.joints[i].gear = (robot.joints[i].gear || 1) * 2; sel = { kind: 'motor', i }; LK.toast(`Gear ratio of joint ${i + 1} doubled to ${robot.joints[i].gear}:1`); }
      else if (ACC.includes(c)) { const i = targetJoint(pick, () => true); if (!need(i >= 0, 'Add a joint first; accessories mount on a joint.')) return; (robot.joints[i].acc = robot.joints[i].acc || []).push(c); sel = { kind: 'joint', i }; }
      status.textContent = NAME[c] + ' added.'; commit();
    }
    function del() {
      if (!sel) return LK.toast('Select a component first.');
      const n = robot.joints.length, i = sel.i;
      if (sel.kind === 'base') { if (!need(!n, 'Delete the joints first: they are connected to the base.')) return; robot.base = false; }
      else if (sel.kind === 'joint') { if (i === n - 1) robot.tool = null; robot.joints.splice(i, 1); }
      else if (sel.kind === 'link') { if (!need(i === n - 1, `Link ${i + 1} carries joint ${i + 2}. Delete the joints after it first, or delete the joint itself.`)) return; Object.assign(robot.joints[i], { hasLink: false, a: 0, d: 0 }); robot.tool = null; }
      else if (sel.kind === 'motor') robot.joints[i].motor = null; else if (sel.kind === 'sensor') robot.joints[i].sensor = null;
      else if (sel.kind === 'tool') robot.tool = null; else if (sel.kind === 'elec') robot.electronics.splice(i, 1); else if (sel.kind === 'loose') robot.loose.splice(i, 1); else if (sel.kind === 'wsensor') robot.sensors.splice(i, 1);
      sel = null; commit();
    }
    function dup() {
      if (!sel || sel.i === undefined || !['joint', 'link', 'motor', 'sensor'].includes(sel.kind)) return LK.toast('Select a joint or link to duplicate.');
      if (!need(robot.joints.length < 8, 'This studio supports up to 8 joints.')) return;
      if (!need(robot.joints[sel.i].hasLink, 'Give the joint an output link before duplicating it.')) return;
      const c = JSON.parse(JSON.stringify(robot.joints[sel.i])); robot.joints.splice(sel.i + 1, 0, c); sel = { kind: 'joint', i: sel.i + 1 }; commit();
    }

    /* ---------- inspector ---------- */
    const num = (k, label, v, unit, step = 'any', extra = '') => `<label class="fld"><span>${label}</span><input type="number" step="${step}" data-k="${k}" value="${v}" ${extra}><em>${unit || ''}</em></label>`;
    const selOpt = (k, label, opts, v) => `<label class="fld"><span>${label}</span><select data-k="${k}">${opts.map(o => `<option value="${o[0]}"${String(o[0]) === String(v) ? ' selected' : ''}>${o[1]}</option>`).join('')}</select><em></em></label>`;
    function propsHtml() {
      if (!sel) return `<p class="muted">Select a component in the 3D view or in the assembly tree to edit its engineering parameters.</p><p class="muted">Tip: drop a motor or sensor directly onto a joint to mount it there.</p>`;
      const j = sel.i !== undefined ? robot.joints[sel.i] : null; const i = sel.i;
      if (sel.kind === 'base') return `<h4>Robot base (link 0)</h4><p>Fixed to the worktable. Carries frame {0}; its z axis is the axis of joint 1.</p><p class="muted">Mass 4.0 kg (pedestal). The base is not a moving link, so it adds no degree of freedom.</p>`;
      if (sel.kind === 'joint' && j) return `<h4>Joint ${i + 1}</h4>${selOpt('type', 'Joint type', [['R', 'Revolute (rotation θ)'], ['P', 'Prismatic (translation d)']], j.type)}
        ${num('alphaDeg', 'Link twist α<sub>' + (i + 1) + '</sub>', +deg(j.alpha).toFixed(3), '°', 1)}<p class="hint">α is the angle from this joint's axis to the next joint's axis, about the link's x axis. 0° keeps the axes parallel (planar), ±90° makes them perpendicular.</p>
        ${j.type === 'R' ? num('offsetDeg', 'Joint zero offset', +deg(j.offset || 0).toFixed(3), '°', 1) : ''}
        ${num('minV', 'Minimum', j.type === 'P' ? j.min : +deg(j.min).toFixed(2), j.type === 'P' ? 'm' : '°')}${num('maxV', 'Maximum', j.type === 'P' ? j.max : +deg(j.max).toFixed(2), j.type === 'P' ? 'm' : '°')}
        ${num('friction', 'Coulomb friction', j.friction, j.type === 'P' ? 'N' : 'N·m')}${num('damping', 'Viscous damping', j.damping, j.type === 'P' ? 'N·s/m' : 'N·m·s/rad')}${num('stiffness', 'Stiffness', j.stiffness || 0, j.type === 'P' ? 'N/m' : 'N·m/rad')}
        ${num('tauMax', j.type === 'P' ? 'Force limit' : 'Torque limit', j.tauMax, j.type === 'P' ? 'N' : 'N·m')}${num('velMax', 'Velocity limit', j.velMax, j.type === 'P' ? 'm/s' : 'rad/s')}
        <p class="muted">Accessories: ${(j.acc || []).map(a => NAME[a]).join(', ') || 'none'}</p>
        <h4>Move this joint</h4><input type="range" data-q="${i}" min="${j.min}" max="${j.max}" step="${(j.max - j.min) / 400}" value="${q[i]}" aria-label="Joint ${i + 1} value"><p class="mono" id="as-qv"></p>`;
      if (sel.kind === 'link' && j) return `<h4>Link ${i + 1}</h4>${num('a', 'Length a<sub>' + (i + 1) + '</sub> (along x)', j.a, 'm', 0.01)}${num('d', (j.type === 'P' ? 'Fixed offset' : 'Offset d<sub>' + (i + 1) + '</sub>') + ' (along z)', j.d, 'm', 0.01)}
        ${num('wmm', 'Section width', +(j.w * 1000).toFixed(1), 'mm', 1)}${num('wmm', 'Section height', +(j.w * 1000).toFixed(1), 'mm', 1, 'disabled')}${selOpt('material', 'Material', Object.entries(RM.MATERIALS).map(([k, v]) => [k, v.name]), j.material)}
        ${num('mass', 'Mass (blank = automatic)', j.mass ?? '', 'kg', 0.01, 'placeholder="' + RM.linkMass(Object.assign({}, j, { mass: null })).toFixed(3) + '"')}
        <table class="kv2"><tr><td>Mass used</td><td>${f(RM.linkMass(j))} kg</td></tr><tr><td>Centre of mass</td><td>mid-point of the link (${f(RM.linkLen(j) / 2)} m from either end)</td></tr><tr><td>Moment of inertia (about COM)</td><td>${RM.linkInertia(j).toExponential(3)} kg·m² <span class="muted">= mL²/12</span></td></tr><tr><td>Density</td><td>${RM.MATERIALS[j.material].rho} kg/m³, hollow square tube (wall 15 %)</td></tr></table>`;
      if (sel.kind === 'motor' && j && j.motor) { const m = RM.motorOf(j); return `<h4>Actuator of joint ${i + 1}</h4>${selOpt('motor', 'Type', Object.entries(RM.MOTORS).map(([k, v]) => [k, v.name]), j.motor)}${num('gear', 'Gear ratio N', m.gear, ': 1', 1)}
        <table class="kv2">${[['Rated voltage', m.V + ' V'], ['Rated current', m.I + ' A'], ['Rated torque', m.T + ' N·m'], ['Stall torque', m.stall + ' N·m'], ['No-load speed', m.w0 + ' rpm'], ['Armature resistance', m.R + ' Ω'], ['Inductance', (m.L * 1e3).toFixed(2) + ' mH'], ['Torque constant K<sub>t</sub>', m.Kt + ' N·m/A'], ['Back-EMF constant K<sub>b</sub>', m.Kb + ' V·s/rad'], ['Rotor inertia J<sub>m</sub>', m.J.toExponential(2) + ' kg·m²'], ['Efficiency η', (m.eta * 100).toFixed(0) + ' %'], ['Output torque (rated × N × η)', f(m.T * m.gear * m.eta, 1) + ' N·m'], ['Reflected inertia N²J<sub>m</sub>', f(m.J * m.gear * m.gear, 4) + ' kg·m²']].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table><p class="muted">Illustrative teaching values, not a manufacturer's data sheet.</p>`; }
      if (sel.kind === 'sensor' && j && j.sensor) { const s = RM.SENSORS[j.sensor]; return `<h4>Position sensor of joint ${i + 1}</h4>${selOpt('sensor', 'Type', [['encoder', 'Incremental encoder'], ['potentiometer', 'Potentiometer']], j.sensor)}<table class="kv2"><tr><td>Measures</td><td>${s.measures}</td></tr><tr><td>Resolution</td><td>${s.res}</td></tr></table>`; }
      if (sel.kind === 'tool' && robot.tool) { const t = RM.TOOLS[robot.tool]; return `<h4>End effector</h4>${selOpt('tool', 'Type', Object.entries(RM.TOOLS).map(([k, v]) => [k, v.name]), robot.tool)}${num('payload', 'Payload carried', robot.payload || 0, 'kg', 0.05)}<table class="kv2"><tr><td>Tool mass</td><td>${t.mass} kg</td></tr><tr><td>Maximum grip force</td><td>${t.maxForce} N</td></tr><tr><td>Friction coefficient μ</td><td>${t.mu}</td></tr><tr><td>Largest payload it can hold (2μF ≥ m·g·SF, SF = 2)</td><td>${f(2 * t.mu * t.maxForce / (9.81 * 2), 2)} kg</td></tr></table>`; }
      if (sel.kind === 'elec') { const e = RM.ELECTRONICS[robot.electronics[i]]; return e ? `<h4>${e.name}</h4><table class="kv2"><tr><td>Role</td><td>${e.role}</td></tr>${e.pwm ? `<tr><td>PWM outputs</td><td>${e.pwm}</td></tr>` : ''}${e.adc ? `<tr><td>ADC</td><td>${e.adc}</td></tr>` : ''}${e.channels ? `<tr><td>Channels</td><td>${e.channels}</td></tr>` : ''}</table>` : ''; }
      if (sel.kind === 'loose') return `<h4>${NAME[robot.loose[i]]} (disconnected)</h4><p>This part is not attached to the kinematic chain, so it is not part of the robot. Delete it, or free a mounting position and add the part again.</p>`;
      if (sel.kind === 'wsensor') return `<h4>${RM.SENSORS[robot.sensors[i]].name}</h4><p>Mounted on the wrist flange. Measures ${RM.SENSORS[robot.sensors[i]].measures}.</p>`;
      return '';
    }
    function treeHtml() {
      const it = (pick, text, depth, cls = '') => `<li style="padding-left:${depth * 14}px"><button type="button" class="tree ${cls}${sel && sel.kind === pick.kind && sel.i === pick.i ? ' on' : ''}" data-pick='${JSON.stringify(pick)}'>${text}</button></li>`;
      let h = '<p class="hint">Indentation shows the parent → child chain: each joint is carried by the link before it.</p><ul class="tree-ul">';
      if (!robot.base) h += '<li class="muted">Empty workspace. Start with the robot base.</li>';
      else {
        h += it({ kind: 'base' }, '▣ Base (link 0)', 0);
        robot.joints.forEach((j, i) => {
          h += it({ kind: 'joint', i }, `◉ Joint ${i + 1} · ${j.type === 'R' ? 'revolute' : 'prismatic'}`, i + 1);
          if (j.motor) h += it({ kind: 'motor', i }, '⚙ ' + RM.MOTORS[j.motor].name, i + 2);
          if (j.sensor) h += it({ kind: 'sensor', i }, '◌ ' + RM.SENSORS[j.sensor].name, i + 2);
          h += j.hasLink ? it({ kind: 'link', i }, `▬ Link ${i + 1} · a=${f(j.a, 2)} d=${f(j.d, 2)} m`, i + 2) : `<li class="warn" style="padding-left:${(i + 2) * 14}px">⚠ no output link</li>`;
        });
        if (robot.tool) h += it({ kind: 'tool' }, '✋ ' + RM.TOOLS[robot.tool].name, robot.joints.length + 2);
      }
      h += '</ul>';
      if (robot.sensors.length) h += '<h4>Wrist sensors</h4><ul class="tree-ul">' + robot.sensors.map((s, i) => it({ kind: 'wsensor', i }, RM.SENSORS[s].name, 0)).join('') + '</ul>';
      if (robot.electronics.length) h += '<h4>Control cabinet</h4><ul class="tree-ul">' + robot.electronics.map((e, i) => it({ kind: 'elec', i }, RM.ELECTRONICS[e].name, 0)).join('') + '</ul>';
      if (robot.loose.length) h += '<h4 class="warn">Disconnected</h4><ul class="tree-ul">' + robot.loose.map((e, i) => it({ kind: 'loose', i }, '⚠ ' + NAME[e], 0, 'warn')).join('') + '</ul>';
      return h;
    }
    function checkHtml() {
      const v = RM.validate(robot); const mb = RM.mobility(robot), c = RM.classify(robot);
      const errs = v.filter(x => !x.ok && x.level === 'error').length, warns = v.filter(x => !x.ok && x.level !== 'error').length;
      return `<p class="verdict ${errs ? 'bad' : warns ? 'warn' : 'ok'}">${errs ? errs + ' error(s): the mechanism is not valid yet' : warns ? 'Mechanically connected, ' + warns + ' item(s) still open' : 'Assembly complete and connected'}</p>
      <ul class="checks">${v.map(x => `<li class="${x.ok ? 'ok' : x.level}">${x.ok ? '✓' : x.level === 'error' ? '✗' : '○'} ${x.msg}</li>`).join('')}</ul>
      <h4>Automatic calculations</h4><table class="kv2"><tr><td>Links (incl. base)</td><td>${robot.base ? mb.links : 0}</td></tr><tr><td>Joints</td><td>${mb.joints} (${c.string || '–'})</td></tr><tr><td>Degrees of freedom</td><td><b>${mb.n}</b></td></tr><tr><td>Configuration</td><td>${c.name}</td></tr><tr><td>Total mass</td><td>${f(RM.totalMass(robot), 2)} kg</td></tr><tr><td>Maximum reach (Σ|a|+|d|)</td><td>${f(robot.joints.reduce((s, j) => s + RM.linkLen(j) + (j.type === 'P' ? j.max : 0), 0), 3)} m</td></tr></table>`;
    }
    function kinHtml() {
      const n = robot.joints.length; if (!n) return '<p class="muted">Add joints to see the DH table and the forward kinematics.</p>';
      const mb = RM.mobility(robot); const T = R3.T[n]; const rpy = M.rpyFromR(M.Rof(T));
      return `<h4>Degrees of freedom</h4><p>A serial chain of <b>n = ${n}</b> single-DOF joints has <b>${n}</b> joint-space DOF.</p>
        ${mb.planar ? `<p class="eq">Planar Grübler–Kutzbach: M = 3(L − 1) − 2J₁ − J₂ = 3(${mb.links} − 1) − 2·${mb.joints} − 0 = <b>${mb.gruebler}</b></p><p class="hint">Valid here because every joint axis is parallel (all α = 0), so all links move in one plane.</p>` : `<p class="eq">Spatial Kutzbach: M = 6(L − 1) − 5J₁ = 6(${mb.links} − 1) − 5·${mb.joints} = <b>${mb.kutzbachSpatial}</b></p><p class="hint">The planar formula 3(L−1)−2J₁ does not apply: the joint axes are not all parallel, so the links move in 3D.</p>`}
        <p class="hint">Task space needs ${mb.planar ? '3 (x, y, φ)' : '6 (position + orientation)'} DOF. ${mb.redundant ? 'This arm has more joints than that: it is kinematically redundant.' : n < (mb.planar ? 3 : 6) ? 'This arm has fewer, so it cannot reach an arbitrary pose.' : 'This arm matches it exactly.'}</p>
        <h4>DH table (generated)</h4><div class="table-scroll"><table class="data sm"><tr><th>i</th><th>θ<sub>i</sub></th><th>d<sub>i</sub> (m)</th><th>a<sub>i</sub> (m)</th><th>α<sub>i</sub> (°)</th><th>type</th></tr>${robot.joints.map((j, i) => `<tr><td>${i + 1}</td><td>${j.type === 'R' ? `q${i + 1}${j.offset ? ' + ' + f(deg(j.offset), 0) + '°' : ''} = ${f(deg(q[i] + (j.offset || 0)), 1)}°` : f(deg(j.offset || 0), 0) + '°'}</td><td>${j.type === 'P' ? `q${i + 1} + ${f(j.d, 2)} = ${f(q[i] + j.d)}` : f(j.d)}</td><td>${f(j.a)}</td><td>${f(deg(j.alpha), 1)}</td><td>${j.type}</td></tr>`).join('')}</table></div>
        <h4>Pose</h4>${robot.joints.map((j, i) => `<label class="fld"><span>q${i + 1}</span><input type="range" data-q="${i}" min="${j.min}" max="${j.max}" step="${(j.max - j.min) / 400}" value="${q[i]}"><em>${j.type === 'P' ? f(q[i]) + ' m' : f(deg(q[i]), 1) + '°'}</em></label>`).join('')}
        <h4>Forward kinematics T₀ⁿ = A₁A₂…A<sub>n</sub></h4>${LK.mat(T, 3)}<table class="kv2"><tr><td>End-effector position</td><td>(${f(T[0][3])}, ${f(T[1][3])}, ${f(T[2][3])}) m</td></tr><tr><td>Roll, pitch, yaw</td><td>${f(deg(rpy.gamma), 1)}°, ${f(deg(rpy.beta), 1)}°, ${f(deg(rpy.alpha), 1)}°</td></tr></table>
        <p><a class="tbtn" href="${RIL.root}math.html#fk">Step-by-step matrices in the Mathematical Workspace →</a></p>`;
    }
    function drawSide() {
      main.querySelectorAll('.tabs2 button').forEach(b => b.setAttribute('aria-selected', b.dataset.t === tab));
      side.innerHTML = tab === 'props' ? propsHtml() : tab === 'tree' ? treeHtml() : tab === 'check' ? checkHtml() : kinHtml();
      side.querySelectorAll('[data-k]').forEach(el => el.onchange = () => setProp(el.dataset.k, el.value));
      side.querySelectorAll('[data-q]').forEach(el => {
        const i = +el.dataset.q;
        el.oninput = () => { q[i] = +el.value; R3.update(q); drawExtras(); const em = el.parentElement.querySelector('em'); const j = robot.joints[i]; if (em && tab === 'kin') em.textContent = j.type === 'P' ? f(q[i]) + ' m' : f(deg(q[i]), 1) + '°'; qReadout(); };
        el.onchange = () => { if (tab === 'kin') { const sc = side.scrollTop; drawSide(); side.scrollTop = sc; } };
      });
      side.querySelectorAll('[data-pick]').forEach(el => el.onclick = () => { sel = JSON.parse(el.dataset.pick); R3.select(sel); tab = 'props'; drawSide(); });
      qReadout();
    }
    function qReadout() { const el = $('#as-qv'); if (!el || !sel) return; const j = robot.joints[sel.i]; if (!j) return; const p = M.pof(R3.tcpT()); el.textContent = `q${sel.i + 1} = ${j.type === 'P' ? f(q[sel.i]) + ' m' : f(deg(q[sel.i]), 1) + '°'}   end effector = (${f(p[0])}, ${f(p[1])}, ${f(p[2])}) m`; }
    function setProp(k, val) {
      const j = sel && sel.i !== undefined ? robot.joints[sel.i] : null; const v = parseFloat(val);
      if (k === 'tool') robot.tool = val; else if (k === 'payload') robot.payload = Math.max(0, v || 0);
      else if (!j) return;
      else if (k === 'type') { j.type = val; if (val === 'P') { j.min = 0; j.max = 0.35; j.tauMax = 400; j.velMax = 0.5; } else { j.min = -170 * M.D2R; j.max = 170 * M.D2R; j.tauMax = 150; j.velMax = 3; } }
      else if (k === 'alphaDeg') j.alpha = rad(v || 0); else if (k === 'offsetDeg') j.offset = rad(v || 0);
      else if (k === 'minV') j.min = j.type === 'P' ? v : rad(v); else if (k === 'maxV') j.max = j.type === 'P' ? v : rad(v);
      else if (k === 'wmm') j.w = M.clamp((v || 60) / 1000, 0.015, 0.2); else if (k === 'mass') j.mass = val === '' ? null : Math.max(0, v);
      else if (k === 'material' || k === 'motor' || k === 'sensor') { j[k] = val; if (k === 'motor') j.gear = RM.MOTORS[val].gear; }
      else if (k === 'gear') j.gear = Math.max(1, v || 1); else if (Number.isFinite(v)) j[k] = v;
      if (j && j.max <= j.min) LK.toast('Joint limits must satisfy min < max.', 'bad');
      commit();
    }
    function refresh() {
      if (q.length !== robot.joints.length) q = RM.homeQ(robot); q = q.map((v, i) => M.clamp(v, robot.joints[i].min, robot.joints[i].max));
      R3.q = q; R3.rebuild(robot); R3.showFrames($('[data-o=frames]', main).checked); R3.showAxes($('[data-o=axes]', main).checked); R3.select(sel); drawExtras(); drawSide();
      $('[data-a=name]', main).value = robot.name || ''; const ls = $('[data-a=load]', main); ls.innerHTML = '<option value="">Load saved…</option>' + LK.twin.library().map((r, i) => `<option value="${i}">${esc(r.name)} (${r.joints.length}-DOF)</option>`).join('');
      const mb = RM.mobility(robot); status.textContent = `${robot.name || 'Robot'} · ${mb.n} DOF · ${RM.classify(robot).name} · ${f(RM.totalMass(robot), 2)} kg · saved automatically`;
    }

    /* ---------- events ---------- */
    main.querySelectorAll('.pal').forEach(b => { b.onclick = () => add(b.dataset.c, null); b.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', b.dataset.c); e.dataTransfer.effectAllowed = 'copy'; }); });
    const stage = $('#as-stage'); stage.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; stage.classList.add('drop'); }); stage.addEventListener('dragleave', () => stage.classList.remove('drop'));
    stage.addEventListener('drop', e => { e.preventDefault(); stage.classList.remove('drop'); const c = e.dataTransfer.getData('text/plain'); if (NAME[c]) { const hit = view.pickAt(e); add(c, hit && hit.pick); } });
    view.onClick(hit => { sel = hit ? hit.pick : null; R3.select(sel); tab = sel ? 'props' : tab; drawSide(); });
    main.querySelectorAll('.tabs2 button').forEach(b => b.onclick = () => { tab = b.dataset.t; drawSide(); });
    main.querySelectorAll('[data-o]').forEach(c => c.onchange = () => refresh());
    const act = { undo() { if (undo.length) { redo.push(last); restore(undo.pop()); } }, redo() { if (redo.length) { undo.push(last); restore(redo.pop()); } }, del, dup, new() { if (confirm('Clear the workspace? The current robot stays in "Saved" only if you saved it.')) { robot = RM.emptyRobot(); robot.sensors = []; sel = null; commit(); } }, save() { robot.name = $('[data-a=name]', main).value.trim() || 'My robot'; LK.twin.save(robot); LK.twin.saveAs(robot); refresh(); LK.toast('Robot saved in this browser.', 'ok'); }, export() { LK.download((robot.name || 'robot').replace(/[^\w]+/g, '_') + '.json', JSON.stringify(robot, null, 1), 'application/json'); }, import() { $('[data-a=file]', main).click(); } };
    main.querySelectorAll('button[data-a]').forEach(b => b.onclick = () => act[b.dataset.a] && act[b.dataset.a]());
    $('[data-a=name]', main).onchange = e => { robot.name = e.target.value; commit(); };
    $('[data-a=tpl]', main).onchange = e => { if (!e.target.value) return; robot = RM.template(e.target.value); robot.sensors = []; robot.loose = []; sel = null; q = RM.homeQ(robot); e.target.value = ''; commit(); };
    $('[data-a=load]', main).onchange = e => { const r = LK.twin.library()[+e.target.value]; if (e.target.value === '' || !r) return; robot = JSON.parse(JSON.stringify(r)); robot.sensors = robot.sensors || []; robot.loose = robot.loose || []; sel = null; q = RM.homeQ(robot); commit(); };
    $('[data-a=file]', main).onchange = e => { const file = e.target.files[0]; if (!file) return; file.text().then(t => { const r = JSON.parse(t); if (!r || !Array.isArray(r.joints)) throw new Error('not a robot file'); robot = Object.assign(RM.emptyRobot(), r); robot.sensors = robot.sensors || []; sel = null; q = RM.homeQ(robot); commit(); }).catch(() => LK.toast('That file is not a robot exported from this studio.', 'bad')); e.target.value = ''; };
    document.addEventListener('keydown', e => { if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); act.undo(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); act.redo(); } else if (e.key === 'Delete') act.del(); });
    refresh(); view.start(); RIL._assembly = { get robot() { return robot; }, add, view };
  };
})();
