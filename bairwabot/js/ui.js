/* BAIRWABOT – ui.js
   Lab controller (module loading, playback, main loop) and all user-interface panels:
   navigation, Learn / Live Data / Talk / Control / Quiz tabs, body-structure explorer,
   DOF explorer, FK/IK lab, sensor cards, 2D engineering view. */
(function () {
  'use strict';
  const T = THREE, BB = window.BB, D2R = Math.PI / 180;
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f2 = (v, n) => (v == null || isNaN(v) ? '—' : v.toFixed(n == null ? 2 : n));
  const SIM = '<span class="sim" title="Simulated / illustrative value – not a measurement from a physical robot">SIM</span>';
  const MOD = '<span class="mdl" title="Computed live from the animated kinematic model">MODEL</span>';

  /* ================================================================ UI ================================================================ */
  const UI = (BB.UI = {
    extras: {}, phaseText: '',
    subtitle(t) { const s = $('#subtitle'); s.textContent = t || ''; s.classList.toggle('on', !!t); },
    phase(t) { UI.phaseText = t; $('#hudPhase').textContent = t || ''; $('#hudPhase').style.display = t ? '' : 'none'; },
    extra(k, v) { UI.extras[k] = v; },
    chat(role, text) {
      const box = $('#chatLog'); if (!box) return;
      const m = el('div', 'msg ' + role); m.innerHTML = '<b>' + (role === 'bot' ? 'BAIRWABOT' : 'You') + '</b><span>' + esc(text) + '</span>'; box.appendChild(m); box.scrollTop = box.scrollHeight;
      BB.Lab.history.push({ role, text, t: new Date().toLocaleTimeString() });
    },
    cmdStatus(t, cls) { document.querySelectorAll('.cmdStatus').forEach(e => { e.textContent = t; e.className = 'cmdStatus ' + (cls || ''); }); },
    mic(t, cls) { document.querySelectorAll('.micStatus').forEach(e => { e.textContent = t; e.className = 'micStatus ' + (cls || ''); }); },
    voiceState() {
      const V = BB.Voice; $('#chipSpeak').classList.toggle('on', !!V.cur); $('#chipMic').classList.toggle('on', V.listening);
      document.querySelectorAll('[data-act=listen]').forEach(b => b.classList.toggle('active', V.listening));
    },
    tab(name) {
      document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
      document.querySelectorAll('.tabpane').forEach(p => p.classList.toggle('on', p.id === 'tab-' + name));
      BB.Lab.curTab = name; if (name === 'quiz') UI.renderQuiz();
    }
  });

  /* ================================================================ LAB ================================================================ */
  const Lab = (BB.Lab = { cur: 1, page: null, speed: 1, slow: false, paused: false, history: [], param: { safe: 1.3, humanWalk: true, item: 'cube' }, scores: {}, battery: 100, mode: '3d', curTab: 'learn' });

  Lab.init = function () {
    const canvas = $('#c3d');
    BB.Voice.init();
    const W = (BB.world = new BB.World(canvas, $('#labels')));
    const R = (BB.robot = BB.buildRobot()); W.scene.add(R.root);
    const M = (BB.motion = new BB.Motion(R, W));
    BB.initScripts();
    // listening head tilt (persistent overlay)
    M.persist.push((p, t) => { if (BB.Voice.listening) { p.neckRoll = (p.neckRoll || 0) + 7; p.neckPitch = (p.neckPitch || 0) + 4 + 2 * Math.sin(t * 3); } });
    BB.Runner.onIdle = () => { if (!M.moving()) UI.phase(UI.phaseText || ''); $('#btnPlay').classList.remove('active'); };
    buildNav(); buildTabs(); buildControls(); buildBottom(); bindViewport();
    Lab.page = 'intro'; Lab.openPage('intro', { silent: true });
    let last = performance.now(); Lab.prevDq = {}; Lab.ddq = {};
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      Lab.step(dt); requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    setInterval(() => { try { Lab.refresh(); } catch (e) { console.warn(e); } }, 200);
  };

  Lab.step = function (dt) {
    const M = BB.motion, W = BB.world, R = BB.robot;
    BB.Voice.update(dt);
    const sdt = Lab.paused ? 0 : dt * Lab.speed * (Lab.slow ? 0.25 : 1);
    const n = Math.max(1, Math.ceil(sdt / 0.034)), h = sdt / n;
    for (let i = 0; i < n; i++) { BB.Runner.update(h); M.update(h); W.updateProps(h); }
    if (sdt > 0) for (const d of R.dofList) { const a = (M.dq[d.name] - (Lab.prevDq[d.name] || 0)) / sdt; Lab.ddq[d.name] = (Lab.ddq[d.name] || 0) * 0.85 + (isFinite(a) ? a : 0) * 0.15; Lab.prevDq[d.name] = M.dq[d.name]; }
    R.face.update(dt);
    if (Lab.sensorMark) Lab.sensorMark.scale.setScalar(1 + 0.25 * Math.sin(performance.now() / 160));
    if (Lab.mode === '2d') Lab.draw2D(); else W.render(dt, M, R);
    if (Lab.mode === '2d') { W.resize(); }
    let act = 0; for (const d of R.dofList) act += Math.abs(M.dq[d.name]); Lab.battery = Math.max(5, Lab.battery - dt * (0.0025 + act * 0.0000035));
  };

  function stateName() {
    const M = BB.motion, V = BB.Voice;
    if (M.label) return M.label;
    if (M.stepper) return 'Stair climbing';
    if (M.gait) return { walk: 'Walking', jog: 'Running', run: 'Running', turn: 'Turning', side: 'Walking', march: 'Walking' }[M.gait];
    if (M.pose === BB.POSES.sit) return 'Sitting';
    if (V.listening) return 'Listening';
    if (V.cur) return 'Speaking';
    if (BB.robot.face.expr === 'thinking') return 'Thinking';
    return 'Idle';
  }

  /* ---------- open a module / special page ---------- */
  function resetScene(env, start, view) {
    const M = BB.motion, W = BB.world, R = BB.robot;
    BB.Runner.clear(); BB.Voice.cancel(); M.hardReset(); M.freqScale = 1; M.ampScale = 1;
    const held = []; R.root.traverse(o => { if (o.userData && o.userData.kind) held.push(o); }); held.forEach(o => o.parent && o.parent.remove(o));
    W.setEnv(env || 'lab'); W.showBalance(false); W.onRobot = null; W.onGround = null;
    if (start) M.teleport(start[0], start[1], start[2]);
    R.isolate(null); R.xray(false); R.highlightJoints(false); R.setExplode(0); R.face.set('neutral'); R.face.track = null;
    Lab.eyeTrack(false); Lab.showSensor(null); Lab.clearFrames(); W.clearHighlight();
    UI.extras = {}; UI.phase(''); Lab.selDof = null;
    for (let i = 0; i < 3; i++) M.update(0.016);
    W.view(view || 'iso'); W.controls.autoRotate = false;
    W.onRobot = (part) => { Lab.selectPart(part, true); return true; };
  }
  Lab.openModule = function (id, o) {
    o = o || {}; id = Math.max(1, Math.min(30, id | 0));
    const S = BB.SETUP[id], mod = BB.MODULES[id - 1];
    Lab.cur = id; Lab.page = null; markNav();
    resetScene(S.env, S.start, S.view);
    if (S.bal || $('#tgBal').classList.contains('on')) BB.world.showBalance(true);
    if (S.xray) BB.robot.xray(true);
    if (S.joints) BB.robot.highlightJoints(true);
    if (id === 19) BB.world.onGround = (p) => { if (Math.abs(p.x) < 2.75 && Math.abs(p.z) < 2.75) Lab.runSteps(BB.B.navTo(new T.Vector3(p.x, 0, p.z))); };
    if (id === 26) Lab.showFrames();
    $('#hudTitle').textContent = 'Module ' + String(id).padStart(2, '0') + ' · ' + mod.t;
    renderLearn(mod); UI.renderQuiz();
    if (window.innerWidth < 1100) document.body.classList.remove('navOpen');
    if (o.autoplay !== false) Lab.play(true);
  };
  Lab.openPage = function (page, o) {
    o = o || {}; Lab.page = page; markNav();
    resetScene('lab', null, page === 'body' ? 'front' : 'iso');
    const titles = { intro: 'Introduction', arch: 'Robot Architecture', body: 'Explore BAIRWABOT’s Body Structure', dof: 'Joint and DOF Explorer', eng: 'Engineering Concepts', quizall: 'Quiz and Assessment' };
    $('#hudTitle').textContent = titles[page];
    renderPage(page); UI.renderQuiz();
    if (page === 'quizall') UI.tab('quiz'); else UI.tab('learn');
    if (window.innerWidth < 1100) document.body.classList.remove('navOpen');
    if (page === 'intro' && !o.silent) Lab.runSteps([BB.S.look('camera'), BB.S.expr('happy'), BB.S.say(BB.Brain.greeting(), { bg: 1 }), BB.S.fx(BB.B.wave, 4), BB.S.grip('R', 'relaxed'), BB.S.waitSay(), BB.S.look(null), BB.S.expr('neutral')]);
  };
  Lab.runSteps = function (steps) {
    const M = BB.motion; BB.Runner.clear(); M.overlays = []; M.stopGait(); M.yawRate = 0;
    if (Lab.paused) Lab.pause(false);
    BB.Runner.run(steps); $('#btnPlay').classList.add('active');
  };
  Lab.play = function (fresh) {
    if (Lab.paused && !fresh) { Lab.pause(false); return; }
    if (Lab.page) { if (Lab.page === 'intro') Lab.openPage('intro'); return; }
    if (!fresh) { const S = BB.SETUP[Lab.cur]; resetScene(S.env, S.start, null); if (S.bal || $('#tgBal').classList.contains('on')) BB.world.showBalance(true); if (S.xray) BB.robot.xray(true); if (S.joints) BB.robot.highlightJoints(true); if (Lab.cur === 26) Lab.showFrames(); if (Lab.cur === 19) BB.world.onGround = (p) => { if (Math.abs(p.x) < 2.75 && Math.abs(p.z) < 2.75) Lab.runSteps(BB.B.navTo(new T.Vector3(p.x, 0, p.z))); }; }
    Lab.runSteps(BB.SCRIPTS[Lab.cur]());
  };
  Lab.pause = function (on) { Lab.paused = on == null ? !Lab.paused : on; BB.Voice.pause(Lab.paused); $('#btnPause').classList.toggle('active', Lab.paused); UI.cmdStatus(Lab.paused ? 'Paused' : 'Running', ''); };
  Lab.stop = function () { BB.Runner.clear(); BB.Voice.cancel(); if (Lab.paused) Lab.pause(false); BB.Actions.stop(); $('#btnPlay').classList.remove('active'); };
  Lab.reset = function () { if (Lab.paused) Lab.pause(false); if (Lab.page) Lab.openPage(Lab.page, { silent: true }); else Lab.openModule(Lab.cur, { autoplay: false }); UI.phase('Reset – press Play to run the module'); };
  Lab.setSpeed = function (v) { Lab.speed = v; $('#spd').value = v; $('#spdV').textContent = v.toFixed(2) + '×'; };

  /* ---------- helpers called by scripts ---------- */
  Lab.eyeTrack = function (on) { Lab._eye = on; if (!on) { BB.robot.face.track = null; if (BB.motion.look === Lab._eyeFn) BB.motion.look = null; } };
  Lab.showSensor = function (key) {
    const W = BB.world, card = $('#sensorCard');
    if (Lab.sensorMark) { Lab.sensorMark.parent && Lab.sensorMark.parent.remove(Lab.sensorMark); Lab.sensorMark = null; }
    if (Lab.sensorLbl) { Lab.sensorLbl.remove(); Lab.sensorLbl = null; }
    if (!key) { card.classList.remove('on'); return; }
    const s = BB.robot.sensors.find(x => x.key === key); if (!s) return;
    const mk = new T.Mesh(new T.SphereGeometry(0.03, 16, 12), new T.MeshBasicMaterial({ color: 0xfacc15, depthTest: false, transparent: true, opacity: 0.9 })); mk.renderOrder = 12; s.anchor.add(mk); Lab.sensorMark = mk;
    Lab.sensorLbl = W.addLabel(s.anchor, s.name, 'sensor');
    card.innerHTML = '<h4>' + esc(s.name) + '</h4><p><b>Location:</b> ' + esc(s.where) + '</p><p><b>Function:</b> ' + esc(s.fn) + '</p><p><b>Working principle:</b> ' + esc(s.principle) + '</p>';
    card.classList.add('on');
  };
  Lab.clearFrames = function () { (Lab.frames || []).forEach(f => f.parent && f.parent.remove(f)); Lab.frames = []; };
  Lab.showFrames = function () {
    Lab.clearFrames(); const R = BB.robot;
    for (const n of ['torso', 'shR', 'elR', 'wrR', 'gripR']) { const a = new T.AxesHelper(n === 'torso' ? 0.18 : 0.1); a.material.depthTest = false; a.renderOrder = 11; R.nodes[n].add(a); Lab.frames.push(a); }
  };
  Lab.fkik = function (mode) { Lab.fkMode = mode; const p = $('#fkikPanel'); if (p) p.dataset.mode = mode; document.querySelectorAll('.fkikTabs button').forEach(b => b.classList.toggle('on', b.dataset.m === mode)); };
  Lab.selectDof = function (name, fromScript) {
    const R = BB.robot, d = R.dofs[name]; if (!d) return; Lab.selDof = name;
    BB.world.highlight(d.node, d.axis);
    const sel = $('#dofSel'); if (sel) sel.value = name;
    Lab.updateDofInfo();
    if (!fromScript) { const sl = $('#dofSlider'); if (sl) { sl.min = d.min; sl.max = d.max; sl.value = BB.motion.q[name].toFixed(0); } }
  };
  Lab.selectPart = function (part, fromClick) {
    const info = PART_INFO[part]; if (!info) return;
    const R = BB.robot;
    if (fromClick && Lab.page !== 'body') { UI.phase('Selected: ' + info.name + ' – open “Body Structure” to explore it'); return; }
    if (Lab.page !== 'body') Lab.openPage('body', { silent: true });
    const parts = part === 'all' ? null : (info.parts || [part]);
    R.isolate(parts); R.xray(false); if (part === 'electronics') R.isolate(['electronics']);
    Lab.selPart = part;
    const box = $('#partInfo'); if (!box) return;
    const dofs = info.dofs.map(n => R.dofs[n]).filter(Boolean);
    box.innerHTML = '<h3>' + esc(info.name) + '</h3><p><b>Mechanical function:</b> ' + esc(info.fn) + '</p><p><b>Connected joints:</b> ' + esc(info.joints) + '</p><p><b>Sensors:</b> ' + esc(info.sensors) + '</p><p><b>Working principle:</b> ' + esc(info.principle) + '</p>' +
      '<p><b>Relevant DOF (' + dofs.length + '):</b> ' + (dofs.length ? dofs.map(d => '<span class="tag">' + esc(d.label) + '</span>').join(' ') : 'none – structural / electronic assembly') + '</p>' +
      '<div class="row"><button class="btn" id="partPlay"' + (dofs.length ? '' : ' disabled') + '>▶ Play its movement</button><button class="btn" id="partReset">Reset</button></div>';
    $('#partPlay').onclick = () => { const S = BB.S; Lab.runSteps([S.cap('Moving: ' + info.name), ...dofs.map(d => BB.B.sweepDof(d.name, 1.4)), S.cap('')]); };
    $('#partReset').onclick = () => { BB.Runner.clear(); BB.motion.manual = {}; R.isolate(null); R.setExplode(0); const ex = $('#explode'); if (ex) ex.value = 0; box.innerHTML = '<p class="muted">Click any part of BAIRWABOT or choose an assembly above.</p>'; Lab.selPart = null; };
    document.querySelectorAll('.asmBtn').forEach(b => b.classList.toggle('on', b.dataset.p === part));
  };

  /* ================================================================ PART DATA ================================================================ */
  const PART_INFO = {
    all: { name: 'Complete assembly', parts: null, fn: 'The full humanoid: 46 conceptual DOF on a human-proportioned frame of about 1.72 m.', joints: 'All', sensors: 'All', principle: 'A serial-parallel tree of rigid links rooted at the pelvis; every limb is a serial kinematic chain.', dofs: [] },
    head: { name: 'Head & neck assembly', fn: 'Carries the perception sensors and the face display; orients the cameras (gaze).', joints: 'Neck yaw, neck pitch, neck roll (3 DOF) on the upper torso.', sensors: 'RGB camera, stereo depth camera, LiDAR, microphone array, speaker, head IMU.', principle: 'A compact 3-axis gimbal neck points the sensor head; the visor hosts a parametric face display (eyes, brows, mouth).', dofs: ['neckYaw', 'neckPitch', 'neckRoll'] },
    torso: { name: 'Torso & chest frame', fn: 'Central structure: carries the arms and head, houses the computer, battery and power electronics.', joints: 'Torso pitch, roll and yaw (3 DOF) on the pelvis; shoulder brackets; neck mount.', sensors: 'Thermal sensors, battery-management sensing; chest LED status ring.', principle: 'A spine column with an abdominal joint module and a closed chest frame gives stiffness; the back plate is the battery compartment.', dofs: ['torsoPitch', 'torsoRoll', 'torsoYaw'] },
    armL: { name: 'Left arm assembly', parts: ['armL'], fn: 'Positions and orients the left hand in space.', joints: 'Shoulder pitch/roll/yaw, elbow pitch, forearm rotation, wrist pitch/yaw/roll (8 DOF).', sensors: 'Joint encoders, wrist 6-axis force/torque sensor.', principle: 'A redundant serial chain: 3 shoulder DOF and the elbow position the wrist; forearm and wrist DOF orient the hand.', dofs: ['LShPitch', 'LShRoll', 'LShYaw', 'LElbow', 'LForearm', 'LWrPitch', 'LWrYaw', 'LWrRoll'] },
    armR: { name: 'Right arm assembly', parts: ['armR'], fn: 'Positions and orients the right hand in space.', joints: 'Shoulder pitch/roll/yaw, elbow pitch, forearm rotation, wrist pitch/yaw/roll (8 DOF).', sensors: 'Joint encoders, wrist 6-axis force/torque sensor.', principle: 'A redundant serial chain: 3 shoulder DOF and the elbow position the wrist; forearm and wrist DOF orient the hand.', dofs: ['RShPitch', 'RShRoll', 'RShYaw', 'RElbow', 'RForearm', 'RWrPitch', 'RWrYaw', 'RWrRoll'] },
    arms: { name: 'Arm assemblies (both)', parts: ['armL', 'armR'], fn: 'Two 8-DOF manipulators for reaching, carrying and gesturing.', joints: '16 DOF in total.', sensors: 'Encoders, wrist force/torque sensors.', principle: 'Each arm is a redundant serial chain mounted on the shoulder brackets.', dofs: ['LShPitch', 'LShRoll', 'LElbow', 'RShPitch', 'RShRoll', 'RElbow'] },
    handL: { name: 'Left five-finger hand', parts: ['handL'], fn: 'Grasps and manipulates objects.', joints: 'Thumb opposition, thumb flexion, index, middle, ring, little finger flexion (6 conceptual DOF, expandable to 12).', sensors: 'Tactile palm pad, fingertip tactile sensors, tendon position.', principle: 'Under-actuated fingers: one actuator flexes all three phalanges through coupled linkages or tendons.', dofs: ['LThumbOpp', 'LThumbFlex', 'LIndex', 'LMiddle', 'LRing', 'LLittle'] },
    handR: { name: 'Right five-finger hand', parts: ['handR'], fn: 'Grasps and manipulates objects.', joints: 'Thumb opposition, thumb flexion, index, middle, ring, little finger flexion (6 conceptual DOF, expandable to 12).', sensors: 'Tactile palm pad, fingertip tactile sensors, tendon position.', principle: 'Under-actuated fingers: one actuator flexes all three phalanges through coupled linkages or tendons.', dofs: ['RThumbOpp', 'RThumbFlex', 'RIndex', 'RMiddle', 'RRing', 'RLittle'] },
    hands: { name: 'Hand assemblies (both)', parts: ['handL', 'handR'], fn: 'Five-finger hands with thumb opposition.', joints: '12 DOF in total.', sensors: 'Tactile sensors.', principle: 'Coupled under-actuated fingers.', dofs: ['RThumbOpp', 'RIndex', 'RMiddle', 'LThumbOpp', 'LIndex', 'LMiddle'] },
    pelvis: { name: 'Pelvis & hip assembly', parts: ['pelvis'], fn: 'Root link of the kinematic tree; transfers upper-body load to the legs.', joints: 'Waist connection (torso DOF), left and right hip pitch/roll/yaw (6 DOF), actuator housings, bearings.', sensors: 'Main IMU (pelvis centre).', principle: 'A stiff box frame carrying two 3-axis hip actuator groups whose axes intersect at the hip centre (spherical hip).', dofs: ['LHipPitch', 'LHipRoll', 'LHipYaw', 'RHipPitch', 'RHipRoll', 'RHipYaw'] },
    legL: { name: 'Left leg assembly', parts: ['legL'], fn: 'Supports body weight and produces locomotion.', joints: 'Hip pitch/roll/yaw, knee pitch, ankle pitch/roll (6 DOF).', sensors: 'Encoders, ankle force/torque sensor.', principle: 'A 6-DOF serial chain – exactly enough to place the foot at any position and orientation within the workspace.', dofs: ['LHipPitch', 'LHipRoll', 'LHipYaw', 'LKnee', 'LAnkPitch', 'LAnkRoll'] },
    legR: { name: 'Right leg assembly', parts: ['legR'], fn: 'Supports body weight and produces locomotion.', joints: 'Hip pitch/roll/yaw, knee pitch, ankle pitch/roll (6 DOF).', sensors: 'Encoders, ankle force/torque sensor.', principle: 'A 6-DOF serial chain – exactly enough to place the foot at any position and orientation within the workspace.', dofs: ['RHipPitch', 'RHipRoll', 'RHipYaw', 'RKnee', 'RAnkPitch', 'RAnkRoll'] },
    legs: { name: 'Leg assemblies (both)', parts: ['legL', 'legR'], fn: 'Two 6-DOF legs for walking, running, climbing and balance.', joints: '12 DOF in total.', sensors: 'Encoders, ankle F/T sensors.', principle: 'Serial chains from hip to ankle.', dofs: ['LHipPitch', 'LKnee', 'LAnkPitch', 'RHipPitch', 'RKnee', 'RAnkPitch'] },
    footL: { name: 'Left foot', parts: ['footL'], fn: 'Ground contact: heel, sole and toe define the support area.', joints: 'Ankle pitch and roll via the ankle mounting bracket.', sensors: '4 pressure cells (heel and toe), ground-contact detection.', principle: 'A rigid sole with a rubber pad; the CoP is the force-weighted mean of the pressure-cell positions.', dofs: ['LAnkPitch', 'LAnkRoll'] },
    footR: { name: 'Right foot', parts: ['footR'], fn: 'Ground contact: heel, sole and toe define the support area.', joints: 'Ankle pitch and roll via the ankle mounting bracket.', sensors: '4 pressure cells (heel and toe), ground-contact detection.', principle: 'A rigid sole with a rubber pad; the CoP is the force-weighted mean of the pressure-cell positions.', dofs: ['RAnkPitch', 'RAnkRoll'] },
    feet: { name: 'Foot assemblies (both)', parts: ['footL', 'footR'], fn: 'Feet with force and pressure sensing.', joints: 'Ankle pitch/roll.', sensors: '8 pressure cells in total.', principle: 'Support polygon = convex hull of contact points.', dofs: ['LAnkPitch', 'LAnkRoll', 'RAnkPitch', 'RAnkRoll'] },
    electronics: { name: 'Electronics assembly', parts: ['electronics'], fn: 'Main computer, Li-ion battery pack, power distribution board and cooling fan inside the chest.', joints: 'None (mounted in the torso frame).', sensors: 'Battery-management system (cell voltage, current, temperature), thermal sensors.', principle: 'Battery → BMS → power distribution board → motor drivers and computer; the fan and heat spreaders remove heat from the drivers and CPU.', dofs: [] }
  };
  PART_INFO.legL.parts = ['legL']; PART_INFO.footL.parts = ['footL'];

  /* ================================================================ NAV ================================================================ */
  function buildNav() {
    const nav = $('#nav'); nav.innerHTML = '';
    const add = (label, page, icon) => { const b = el('button', 'navItem', '<i>' + icon + '</i>' + label); b.dataset.page = page; b.onclick = () => Lab.openPage(page); nav.appendChild(b); };
    add('Introduction', 'intro', '◎'); add('Robot Architecture', 'arch', '▦'); add('Body Structure', 'body', '⬡'); add('Joint and DOF Explorer', 'dof', '⟲');
    const groups = { A: 'Basic Movements', B: 'Speaking and Interaction', C: 'Intelligent Actions', D: 'Advanced Robotics', E: 'Human Assistance' };
    for (const c in groups) {
      const g = el('div', 'navGroup'), h = el('button', 'navHead', groups[c] + '<span>' + BB.MODULES.filter(x => x.cat === c).length + '</span>');
      h.onclick = () => g.classList.toggle('closed'); g.appendChild(h);
      const list = el('div', 'navList');
      BB.MODULES.filter(x => x.cat === c).forEach(mm => { const b = el('button', 'navMod', '<em>' + String(mm.id).padStart(2, '0') + '</em>' + esc(mm.t) + '<s class="done" title="Quiz score"></s>'); b.dataset.id = mm.id; b.onclick = () => Lab.openModule(mm.id); list.appendChild(b); });
      g.appendChild(list); nav.appendChild(g);
    }
    add('Engineering Concepts', 'eng', '∑'); add('Quiz and Assessment', 'quizall', '✓');
  }
  function markNav() {
    document.querySelectorAll('.navItem').forEach(b => b.classList.toggle('on', b.dataset.page === Lab.page));
    document.querySelectorAll('.navMod').forEach(b => { b.classList.toggle('on', !Lab.page && +b.dataset.id === Lab.cur); const sc = Lab.scores[b.dataset.id]; b.querySelector('.done').textContent = sc && sc.done ? sc.score + '/5' : ''; });
  }

  /* ================================================================ TABS ================================================================ */
  function buildTabs() {
    document.querySelectorAll('.tabs button').forEach(b => (b.onclick = () => UI.tab(b.dataset.tab)));
    // talk tab
    const tk = $('#tab-talk');
    tk.innerHTML = '<div class="voiceBar"><button class="btn pri" data-act="listen">🎤 Start Listening</button><button class="btn" id="vStop">Stop Listening</button><button class="btn" id="vSpeak">🔊 Speak</button><button class="btn" id="vMute">Mute</button><button class="btn" id="vRepeat">Repeat Response</button><button class="btn" id="vClear">Clear Conversation</button></div>' +
      '<div class="micRow"><span class="micDot"></span><span class="micStatus">Microphone idle.</span></div><div class="cmdStatus">Ready</div>' +
      '<div id="chatLog" class="chatLog" aria-live="polite"></div>' +
      '<form id="chatForm" class="chatForm"><input id="chatIn" type="text" placeholder="Type a command or question… (e.g. walk forward, what is an IMU?)" autocomplete="off"><button class="btn pri">Send</button></form>' +
      '<details class="help"><summary>Supported voice commands</summary><p>Hello Bairwabot · Walk forward · Walk backward · Stop walking · Turn left · Turn right · Raise your right / left hand · Wave your hand · Sit down · Stand up · Start dancing · Run · Bend · Squat · Pick object · Place object · Explain your body structure · Open module 7 · Reset</p><p>Hindi: आगे चलो · पीछे चलो · रुको · बाएँ मुड़ो · दाएँ मुड़ो · हाथ उठाओ · हाथ हिलाओ · बैठो · खड़े हो जाओ · नाचो</p><p>Speech recognition uses the browser’s Web Speech API (Chrome, Edge, Safari). It needs microphone permission and HTTPS (or localhost). Basic commands and the built-in knowledge base work without any AI service.</p></details>';
    $('[data-act=listen]', tk).onclick = () => BB.Voice.listen();
    $('#vStop').onclick = () => BB.Voice.stopListen();
    $('#vSpeak').onclick = () => { const v = $('#chatIn').value.trim(); if (v) { BB.Voice.say(v); $('#chatIn').value = ''; } else BB.Voice.say(BB.Brain.greeting()); };
    $('#vMute').onclick = (e) => { BB.Voice.setMuted(!BB.Voice.muted); e.target.textContent = BB.Voice.muted ? 'Unmute' : 'Mute'; e.target.classList.toggle('active', BB.Voice.muted); $('#btnMute').classList.toggle('active', BB.Voice.muted); };
    $('#vRepeat').onclick = () => BB.Voice.repeat();
    $('#vClear').onclick = () => { $('#chatLog').innerHTML = ''; Lab.history = []; };
    $('#chatForm').onsubmit = (e) => { e.preventDefault(); const v = $('#chatIn').value.trim(); if (v) { BB.Brain.handle(v, 'text'); $('#chatIn').value = ''; } };
    if (!BB.Voice.supported.stt) UI.mic('Speech recognition is not supported in this browser – type commands instead.', 'err');
    if (!BB.Voice.supported.tts) UI.chat('bot', 'Speech output is not supported in this browser, so my answers appear as subtitles only.');
    // live data skeleton
    const ld = $('#tab-data');
    ld.innerHTML = '<p class="legend">' + MOD + ' values are computed every frame from the animated kinematic model. ' + SIM + ' values are illustrative and are not measurements from a physical robot.</p>' +
      '<div class="cards" id="ldStatus"></div><h4>Module parameters</h4><div class="kv" id="ldExtra"></div><h4>Kinematics &amp; balance</h4><div class="kv" id="ldKin"></div>' +
      '<h4>Foot pressure distribution ' + MOD + '</h4><div class="press" id="ldPress"></div><h4>Sensors ' + SIM + '</h4><div class="kv" id="ldSens"></div>' +
      '<h4>Joint-angle dashboard (46 DOF)</h4><p class="muted small">θ joint angle (°) · ω angular velocity (°/s) · α angular acceleration (°/s²) · τg static gravity torque (N·m, simulated mass model)</p><div class="jt" id="ldJoints"></div>';
    const jt = $('#ldJoints'), R = BB.robot; let html = '';
    for (const g of R.dofGroups) { html += '<div class="jg">' + g + '</div><div class="jrow jh"><span>Joint</span><span>θ</span><span>ω</span><span>α</span><span>τg</span></div>'; R.dofList.filter(d => d.group === g).forEach(d => { html += '<div class="jrow" data-d="' + d.name + '"><span title="' + esc(d.fn) + ' Range ' + d.min + '° … ' + d.max + '°">' + esc(d.label.replace(/^(Left|Right) /, '')) + '</span><span class="a"></span><span class="w"></span><span class="x"></span><span class="t"></span><i class="bar"><b></b></i></div>'; }); }
    jt.innerHTML = html;
    jt.querySelectorAll('.jrow[data-d]').forEach(r => (r.onclick = () => { if (Lab.page !== 'dof' && Lab.cur !== 27) Lab.openPage('dof', { silent: true }); Lab.selectDof(r.dataset.d); }));
    Lab.jrows = {}; jt.querySelectorAll('.jrow[data-d]').forEach(r => (Lab.jrows[r.dataset.d] = { a: $('.a', r), w: $('.w', r), x: $('.x', r), t: $('.t', r), b: $('.bar b', r), row: r }));
  }

  /* ---------- control tab ---------- */
  function buildControls() {
    const c = $('#tab-ctrl'), A = BB.Actions;
    const B = [['Stand Up', 'stand'], ['Sit Down', 'sit'], ['Walk Forward', 'walkFwd'], ['Walk Backward', 'walkBack'], ['Turn Left', 'turnL'], ['Turn Right', 'turnR'], ['Raise Left Hand', 'raiseL'], ['Raise Right Hand', 'raiseR'], ['Wave', 'wave'], ['Dance', 'dance'], ['Run', 'run'], ['Stop', 'stop'], ['Bend', 'bend'], ['Squat', 'squat'], ['Pick Object', 'pick'], ['Place Object', 'place'], ['Speak', 'speak'], ['Listen', 'listen'], ['Reset', 'reset']];
    c.innerHTML = '<p class="muted">Each button triggers the corresponding animation on BAIRWABOT. You can also say or type the command in the Talk tab.</p><div class="cmdGrid"></div><div class="cmdStatus">Ready</div><div class="micRow"><span class="micDot"></span><span class="micStatus">Microphone idle.</span></div>' +
      '<p class="muted small">Tip: use “Pick Object” then “Place Object”. Commands work in every module; “Reset” restores the current module.</p>';
    const g = $('.cmdGrid', c);
    B.forEach(([l, k]) => { const b = el('button', 'btn cmd' + (k === 'stop' ? ' warn' : ''), l); if (k === 'listen') b.dataset.act = 'listen'; b.onclick = () => { if (Lab.paused) Lab.pause(false); UI.cmdStatus('Executing: ' + l, 'ok'); BB.robot.face.set(k === 'stop' ? 'neutral' : 'smile'); A[k](); }; g.appendChild(b); });
  }

  /* ---------- bottom control bar ---------- */
  function buildBottom() {
    $('#btnPlay').onclick = () => Lab.play(false);
    $('#btnPause').onclick = () => Lab.pause();
    $('#btnStop').onclick = () => Lab.stop();
    $('#btnReset').onclick = () => Lab.reset();
    $('#btnSlow').onclick = (e) => { Lab.slow = !Lab.slow; e.currentTarget.classList.toggle('active', Lab.slow); };
    $('#spd').oninput = (e) => Lab.setSpeed(+e.target.value);
    $('#btn2d').onclick = () => setMode('2d'); $('#btn3d').onclick = () => setMode('3d');
    const tg = (id, fn) => { $(id).onclick = (e) => { const on = !e.currentTarget.classList.contains('on'); e.currentTarget.classList.toggle('on', on); fn(on); }; };
    tg('#tgWire', (on) => BB.robot.setWire(on));
    tg('#tgComp', (on) => { BB.robot.highlightJoints(on); });
    tg('#tgSkel', (on) => BB.world.showSkeleton(on, BB.robot));
    tg('#tgBal', (on) => BB.world.showBalance(on));
    tg('#tgXray', (on) => BB.robot.xray(on));
    $('#btnMute').onclick = () => $('#vMute').click();
    document.querySelectorAll('[data-view]').forEach(b => (b.onclick = () => { if (Lab.mode === '2d') setMode('3d'); BB.world.view(b.dataset.view); }));
    $('#tgFollow').onclick = (e) => { BB.world.follow = !BB.world.follow; e.currentTarget.classList.toggle('on', BB.world.follow); };
    $('#burger').onclick = () => document.body.classList.toggle('navOpen');
    $('#langSel').onchange = (e) => { BB.Voice.lang = e.target.value; if (e.target.value === 'hi' && !BB.Voice.hasHindiVoice()) UI.chat('bot', 'No Hindi voice is installed in this browser, so Hindi text may be read with the default voice. Subtitles are always shown.'); BB.Voice.say(e.target.value === 'hi' ? 'नमस्ते! अब मैं हिंदी में बात करूँगा।' : 'Hello! I will now speak in English.'); };
    window.addEventListener('keydown', (e) => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return; if (e.code === 'Space') { e.preventDefault(); Lab.pause(); } });
  }
  function setMode(m) {
    Lab.mode = m; $('#c3d').style.visibility = m === '2d' ? 'hidden' : 'visible'; $('#labels').style.display = m === '2d' ? 'none' : ''; $('#c2d').style.display = m === '2d' ? 'block' : 'none';
    $('#btn2d').classList.toggle('on', m === '2d'); $('#btn3d').classList.toggle('on', m === '3d');
  }
  function bindViewport() {
    const cv = $('#c3d'), ray = new T.Raycaster(), ptr = new T.Vector2(), pl = new T.Plane(), tmp = new T.Vector3();
    Lab._eyePt = new T.Vector3(); Lab._eyeFn = () => Lab._eyePt;
    cv.addEventListener('pointermove', (e) => {
      if (!Lab._eye) return; const r = cv.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const W = BB.world; ray.setFromCamera(ptr, W.camera); const head = BB.robot.nodes.neck.getWorldPosition(new T.Vector3()); head.y += 0.12;
      pl.setFromNormalAndCoplanarPoint(W.camera.getWorldDirection(tmp).negate(), head.clone().add(BB.motion.fwd().multiplyScalar(1.2)));
      if (ray.ray.intersectPlane(pl, Lab._eyePt)) { BB.motion.look = Lab._eyeFn; const loc = Lab._eyePt.clone(); BB.robot.nodes.neck.worldToLocal(loc); BB.robot.face.track = { lookX: BB.util.clamp(-loc.x * 1.6, -1, 1), lookY: BB.util.clamp((loc.y - 0.12) * 1.6, -1, 1) }; }
    });
  }

  /* ================================================================ LEARN ================================================================ */
  function sec(n, title, body) { return '<section class="ls"><h4><span>' + n + '</span>' + title + '</h4>' + body + '</section>'; }
  const list = (a) => '<ul>' + a.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  function renderLearn(mod) {
    const p = $('#tab-learn');
    p.innerHTML = '<div class="mhead"><small>Module ' + String(mod.id).padStart(2, '0') + ' · ' + BB.CATS[mod.cat] + '</small><h2>' + esc(mod.t) + '</h2></div>' +
      sec(1, 'Activity title', '<p>' + esc(mod.t) + '</p>') +
      sec(2, 'Learning objectives', list(mod.obj)) + sec(3, 'Introduction', '<p>' + esc(mod.intro) + '</p>') + sec(4, 'Components involved', '<p>' + esc(mod.comp) + '</p>') +
      sec(5, 'Mechanical working principle', '<p>' + esc(mod.principle) + '</p>') + sec(6, 'Sensors involved', '<p>' + esc(mod.sensors) + '</p>') + sec(7, 'Actuators involved', '<p>' + esc(mod.actuators) + '</p>') +
      sec(8, 'Control mechanism', '<p>' + esc(mod.control) + '</p>') + sec(9, 'Step-by-step animation explanation', '<ol>' + mod.steps.map(s => '<li>' + esc(s) + '</li>').join('') + '</ol>') +
      sec(10, 'Relevant engineering equations', '<div class="eqs">' + mod.eq.map(e => '<code>' + esc(e) + '</code>').join('') + '</div>') +
      sec(11, 'Live parameter display', '<div class="kv mini" id="learnLive"></div><button class="btn small" onclick="BB.UI.tab(\'data\')">Open full Live Data dashboard</button>') +
      sec(12, 'Real-world applications', '<p>' + esc(mod.apps) + '</p>') +
      sec(13, 'BAIRWABOT voice narration', '<blockquote>' + esc(mod.narr) + '</blockquote><button class="btn small" id="narrBtn">🔊 Play narration</button>') +
      sec(14, 'Interactive experiment', '<p>' + esc(mod.exp) + '</p><div class="exp" id="expBox"></div>') +
      sec(15, 'Five multiple-choice questions', '<p>Test yourself on this module.</p><button class="btn small pri" onclick="BB.UI.tab(\'quiz\')">Start the module quiz</button>');
    $('#narrBtn').onclick = () => BB.Voice.say(mod.narr);
    buildExp($('#expBox'), BB.EXPS[mod.id] ? BB.EXPS[mod.id]() : []);
    p.scrollTop = 0;
  }
  function buildExp(box, items) {
    box.innerHTML = '';
    for (const it of items) {
      if (it.type === 'btn') { const b = el('button', 'btn small', esc(it.label)); b.onclick = () => { if (Lab.paused) Lab.pause(false); it.fn(); }; box.appendChild(b); }
      else if (it.type === 'range') { const w = el('label', 'rng', '<span>' + esc(it.label) + ' <b>' + it.val + it.unit + '</b></span><input type="range" min="' + it.min + '" max="' + it.max + '" step="' + it.step + '" value="' + it.val + '">'); const i = $('input', w); i.oninput = () => { $('b', w).textContent = (+i.value) + it.unit; it.fn(+i.value); }; box.appendChild(w); }
      else if (it.type === 'select') { const w = el('label', 'rng', '<span>' + esc(it.label) + '</span><select>' + it.opts.map(o => '<option>' + o + '</option>').join('') + '</select>'); $('select', w).onchange = (e) => it.fn(e.target.value); box.appendChild(w); }
      else if (it.type === 'check') { const w = el('label', 'chk', '<input type="checkbox"' + (it.val ? ' checked' : '') + '> ' + esc(it.label)); $('input', w).onchange = (e) => it.fn(e.target.checked); box.appendChild(w); }
      else if (it.type === 'text') { const w = el('form', 'txt', '<span>' + esc(it.label) + '</span><div><input type="text" placeholder="' + esc(it.ph) + '"><button class="btn small pri">' + esc(it.btn) + '</button></div>'); w.onsubmit = (e) => { e.preventDefault(); const i = $('input', w); it.fn(i.value.trim()); i.value = ''; }; box.appendChild(w); }
      else if (it.type === 'note') box.appendChild(el('p', 'note', esc(it.text)));
      else if (it.type === 'custom') { const d = el('div', 'custom'); box.appendChild(d); it.build(d); }
    }
  }

  /* ---------- special pages ---------- */
  function dofTable() {
    const rows = [['Head and neck', 3], ['Torso', 3], ['Left arm', 8], ['Right arm', 8], ['Left hand', 6], ['Right hand', 6], ['Left leg', 6], ['Right leg', 6]];
    return '<table class="tbl"><tr><th>Body part</th><th>DOF</th></tr>' + rows.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '<tr class="tot"><td>TOTAL</td><td>46</td></tr></table><p class="muted small">Conceptual articulation values. The rig is modular: each finger is built from three phalanges, so the hands can be expanded to 12 DOF each.</p>';
  }
  function renderPage(page) {
    const p = $('#tab-learn'); let h = '';
    if (page === 'intro') {
      h = '<div class="mhead"><small>Welcome</small><h2>BAIRWABOT – Humanoid Robotics Virtual Lab</h2></div><p class="lead">An Interactive 3D Learning Environment for Humanoid Robotics, Artificial Intelligence, Motion Planning and Human-Robot Interaction.</p>' +
        '<p>BAIRWABOT is a single, fully articulated 3D humanoid (≈ 1.72 m, 46 conceptual DOF, five-finger hands). The same robot performs all 30 modules. It speaks with your browser’s speech synthesiser, listens through the microphone where supported, and every engineering value on screen is either computed from its animated kinematic model or clearly labelled as simulated.</p>' +
        '<h4>How to use the lab</h4><ol><li>Choose a module on the left. The demonstration starts automatically and BAIRWABOT narrates it.</li><li>Use the bottom bar to play, pause, stop, reset, slow down or change speed; switch 2D/3D, wireframe, skeleton, balance markers and X-ray.</li><li>Drag to rotate, scroll or pinch to zoom, right-drag to pan. Click a body part to explore it.</li><li>The right panel has the explanation (Learn), the live engineering dashboard (Live Data), voice conversation (Talk), direct commands (Control) and the module quiz.</li></ol>' +
        '<h4>Conceptual DOF configuration</h4>' + dofTable() + '<div class="row"><button class="btn pri" id="introGreet">🔊 Hear BAIRWABOT’s greeting</button><button class="btn" id="introStart">Start Module 01 →</button></div>';
    } else if (page === 'arch') {
      h = '<div class="mhead"><small>System design</small><h2>Robot Architecture</h2></div><p>BAIRWABOT is a mechatronic system organised in three layers. Click a block to highlight the related hardware.</p>' +
        '<div class="arch"><div class="al"><b>Perception &amp; planning</b><span>RGB-D cameras, LiDAR, microphones → object/person detection, speech recognition, mapping, path planning, dialogue (≈ 10–30 Hz)</span></div><div class="aa">▼</div><div class="al"><b>Whole-body motion control</b><span>Gait generator, balance (CoM/ZMP), inverse kinematics, state machine (≈ 100–500 Hz)</span></div><div class="aa">▼</div><div class="al"><b>Joint servo layer</b><span>46 actuator modules: BLDC motor, reducer, encoder, driver; current/position loops (1–10 kHz) on a real-time bus (EtherCAT / CAN-FD)</span></div><div class="aa">▼</div><div class="al"><b>Mechanical structure</b><span>Head, torso, arms, hands, pelvis, legs, feet</span></div></div>' +
        '<h4>Power and electronics</h4><p>Li-ion battery pack (back of torso) → battery management system → power distribution board → motor drivers and main computer; fan-assisted thermal management. ' + SIM + ' battery level is shown in Live Data.</p>' +
        '<div class="row"><button class="btn" data-hl="electronics">Show electronics</button><button class="btn" data-hl="head">Show sensor head</button><button class="btn" data-hl="joints">Show joint actuators</button><button class="btn" data-hl="none">Show all</button></div>' +
        '<h4>Assemblies</h4><ul><li><b>Head &amp; neck</b> – frame, two eyes, RGB camera, depth stereo pair, microphone array, speaker, animated mouth/face, LiDAR, head IMU; neck yaw/pitch/roll.</li><li><b>Torso</b> – spine, chest and abdominal frames, shoulder brackets, back support, computer enclosure, battery, power board, cooling; pitch/roll/yaw.</li><li><b>Arms</b> – 8 DOF each.</li><li><b>Hands</b> – five fingers, thumb opposition, 6 DOF each.</li><li><b>Pelvis &amp; hips</b> – structural frame, actuator housings, bearings.</li><li><b>Legs</b> – 6 DOF each.</li><li><b>Feet</b> – heel, sole, toe, ankle bracket, force and pressure sensors.</li></ul>' + dofTable();
    } else if (page === 'body') {
      h = '<div class="mhead"><small>Interactive explorer</small><h2>EXPLORE BAIRWABOT’S BODY STRUCTURE</h2></div><p>Click any part of the robot in the 3D view, or choose an assembly:</p><div class="asm">' +
        [['all', 'Complete assembly'], ['head', 'Head'], ['torso', 'Torso'], ['arms', 'Arms'], ['armR', 'Right arm'], ['hands', 'Hands'], ['handR', 'Right hand'], ['pelvis', 'Pelvis'], ['legs', 'Legs'], ['legL', 'Left leg'], ['feet', 'Feet'], ['electronics', 'Electronics']].map(a => '<button class="btn small asmBtn" data-p="' + a[0] + '">' + a[1] + '</button>').join('') + '</div>' +
        '<label class="rng"><span>Exploded view</span><input type="range" id="explode" min="0" max="1" step="0.01" value="0"></label>' +
        '<div class="row">' + ['front', 'side', 'rear', 'iso'].map(v => '<button class="btn small" data-v="' + v + '">' + v[0].toUpperCase() + v.slice(1) + ' view</button>').join('') + '<button class="btn small" data-v="orbit">360° view</button></div>' +
        '<div id="partInfo" class="partInfo"><p class="muted">Click any part of BAIRWABOT or choose an assembly above.</p></div>';
    } else if (page === 'dof') {
      h = '<div class="mhead"><small>Interactive explorer</small><h2>Joint and DOF Explorer</h2></div><p>Select any of the 46 conceptual DOF. The joint is highlighted with its rotation axis (red arrows); move the slider or animate it.</p><div class="exp" id="dofBox"></div>';
    } else if (page === 'eng') {
      h = '<div class="mhead"><small>Reference</small><h2>Engineering Concepts</h2></div>' + PARAM_DOC + '<h4>Key equations by module</h4>' + BB.MODULES.map(m => '<details><summary>' + String(m.id).padStart(2, '0') + ' · ' + esc(m.t) + '</summary><div class="eqs">' + m.eq.map(e => '<code>' + esc(e) + '</code>').join('') + '</div></details>').join('');
    } else if (page === 'quizall') {
      h = '<div class="mhead"><small>Assessment</small><h2>Quiz and Assessment</h2></div><p>Each module has five multiple-choice questions with immediate feedback. Your progress is kept for this browser session.</p><div id="progressTbl"></div>';
    }
    p.innerHTML = h; p.scrollTop = 0;
    if (page === 'intro') { $('#introGreet').onclick = () => Lab.openPage('intro'); $('#introStart').onclick = () => Lab.openModule(1); }
    if (page === 'arch') p.querySelectorAll('[data-hl]').forEach(b => (b.onclick = () => { const R = BB.robot, k = b.dataset.hl; R.isolate(null); R.highlightJoints(false); R.xray(false); if (k === 'electronics') R.isolate(['electronics', 'torso']), R.xray(true); else if (k === 'head') R.isolate(['head']); else if (k === 'joints') R.highlightJoints(true); }));
    if (page === 'body') {
      p.querySelectorAll('.asmBtn').forEach(b => (b.onclick = () => { if (b.dataset.p === 'all') { BB.robot.isolate(null); Lab.selectPart('all'); } else Lab.selectPart(b.dataset.p); }));
      $('#explode').oninput = (e) => BB.robot.setExplode(+e.target.value);
      p.querySelectorAll('[data-v]').forEach(b => (b.onclick = () => BB.world.view(b.dataset.v)));
    }
    if (page === 'dof') { UI.buildDofExplorer($('#dofBox')); Lab.selectDof('RElbow'); }
    if (page === 'quizall') renderProgress();
  }
  const PARAM_DOC = '<h4>Live parameters explained</h4><dl class="pd">' + [
    ['Joint angle θ (°)', 'Rotation of a joint from its zero (standing) position, read from the animated rig – equivalent to an encoder reading.'],
    ['Angular velocity ω (°/s)', 'Rate of change of the joint angle, ω = dθ/dt, computed by numerical differentiation every frame.'],
    ['Angular acceleration α (°/s²)', 'Rate of change of ω, filtered; it is proportional to the inertial torque the motor must supply.'],
    ['Static gravity torque τg (N·m)', 'Torque about the joint axis caused by the weight of all links beyond the joint, from the conceptual 57 kg mass model. Simulated – excludes inertia and friction.'],
    ['Position (m)', 'Pelvis position in the lab (world) frame: x to the side, y up, z forward at start.'],
    ['Linear velocity / acceleration', 'Time derivatives of the pelvis position (horizontal speed in m/s, acceleration in m/s²).'],
    ['Centre of mass (CoM)', 'Mass-weighted mean of 21 segment masses, recomputed every frame from the joint angles.'],
    ['Centre of pressure (CoP / ZMP)', 'Cart-table ZMP estimate x_c − (z_c/g)·ẍ_c, limited to the support polygon as a measured CoP would be.'],
    ['Support polygon', 'Convex hull of the sole corners that are in contact with the ground.'],
    ['Ground contact', 'Heel and toe of each foot are in contact when their clearance is below 14 mm.'],
    ['Foot pressure (% body weight)', 'Body weight shared between feet and between heel and toe according to the CoP position.'],
    ['Body inclination', 'Angle between the pelvis vertical axis and gravity – what the pelvis IMU would report.'],
    ['End-effector coordinates', 'Position of the grip point of each hand in the robot (pelvis) frame.'],
    ['Battery (SIM)', 'Illustrative state of charge that falls faster when joints move more. Not a measurement.']
  ].map(x => '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>').join('') + '</dl>';
  function renderProgress() {
    const box = $('#progressTbl'); if (!box) return; let tot = 0, done = 0;
    box.innerHTML = '<table class="tbl"><tr><th>#</th><th>Module</th><th>Score</th><th></th></tr>' + BB.MODULES.map(m => { const s = Lab.scores[m.id]; if (s && s.done) { tot += s.score; done++; } return '<tr><td>' + m.id + '</td><td>' + esc(m.t) + '</td><td>' + (s && s.done ? s.score + ' / 5' : '—') + '</td><td><button class="btn small" data-q="' + m.id + '">' + (s && s.done ? 'Retry' : 'Take quiz') + '</button></td></tr>'; }).join('') + '</table><p><b>Modules completed:</b> ' + done + ' / 30 · <b>Total score:</b> ' + tot + ' / ' + done * 5 + '</p>';
    box.querySelectorAll('[data-q]').forEach(b => (b.onclick = () => { Lab.openModule(+b.dataset.q, { autoplay: false }); delete Lab.scores[b.dataset.q]; UI.tab('quiz'); }));
  }

  /* ================================================================ QUIZ ================================================================ */
  UI.renderQuiz = function () {
    const box = $('#tab-quiz'); if (!box) return;
    if (Lab.page === 'quizall' || Lab.page) { box.innerHTML = '<div class="mhead"><small>Assessment</small><h2>Quiz progress</h2></div><div id="progressTbl"></div>'; renderProgress(); return; }
    const mod = BB.MODULES[Lab.cur - 1], st = Lab.scores[mod.id] || (Lab.scores[mod.id] = { ans: {}, score: 0, done: false });
    let h = '<div class="mhead"><small>Module ' + String(mod.id).padStart(2, '0') + ' quiz</small><h2>' + esc(mod.t) + '</h2></div>';
    mod.quiz.forEach((q, i) => {
      const a = st.ans[i];
      h += '<div class="q"><p><b>Q' + (i + 1) + '.</b> ' + esc(q[0]) + ' <button class="spk" title="Read the question aloud" data-say="' + i + '">🔊</button></p><div class="opts">' + q[1].map((o, j) => '<button class="opt' + (a != null ? (j === q[2] ? ' right' : j === a ? ' wrong' : '') : '') + '" data-q="' + i + '" data-o="' + j + '"' + (a != null ? ' disabled' : '') + '>' + 'ABCD'[j] + '. ' + esc(o) + '</button>').join('') + '</div>' +
        (a != null ? '<p class="fb ' + (a === q[2] ? 'ok' : 'bad') + '">' + (a === q[2] ? '✔ Correct. ' : '✘ Incorrect – the answer is ' + 'ABCD'[q[2]] + '. ') + esc(q[3]) + '</p>' : '') + '</div>';
    });
    const n = Object.keys(st.ans).length;
    h += '<div class="qfoot"><b>Score: ' + st.score + ' / ' + n + '</b>' + (n === 5 ? ' – quiz complete (' + Math.round(st.score / 5 * 100) + ' %)' : ' – ' + (5 - n) + ' question(s) left') + '<button class="btn small" id="qRetry">Retry</button><button class="btn small" id="qAll">All modules progress</button></div>';
    box.innerHTML = h;
    box.querySelectorAll('.opt').forEach(b => (b.onclick = () => {
      const i = +b.dataset.q, j = +b.dataset.o; if (st.ans[i] != null) return; st.ans[i] = j; const ok = j === mod.quiz[i][2]; if (ok) st.score++;
      if (Object.keys(st.ans).length === 5) st.done = true;
      BB.robot.face.set(ok ? 'happy' : 'sad'); setTimeout(() => BB.robot.face.set('neutral'), 1500);
      BB.Voice.say(ok ? 'Correct!' : 'Not quite. ' + mod.quiz[i][3], { log: false });
      UI.renderQuiz(); markNav();
    }));
    box.querySelectorAll('[data-say]').forEach(b => (b.onclick = () => { const q = mod.quiz[+b.dataset.say]; BB.Voice.say(q[0] + ' ' + q[1].map((o, j) => 'ABCD'[j] + '. ' + o).join('. '), { log: false }); }));
    $('#qRetry').onclick = () => { Lab.scores[mod.id] = { ans: {}, score: 0, done: false }; UI.renderQuiz(); markNav(); };
    $('#qAll').onclick = () => Lab.openPage('quizall');
  };

  /* ================================================================ DOF EXPLORER & FK/IK ================================================================ */
  UI.buildDofExplorer = function (box) {
    const R = BB.robot;
    box.innerHTML = '<label class="rng"><span>Select joint (DOF)</span><select id="dofSel">' + R.dofGroups.map(g => '<optgroup label="' + g + '">' + R.dofList.filter(d => d.group === g).map(d => '<option value="' + d.name + '">' + esc(d.label) + '</option>').join('') + '</optgroup>').join('') + '</select></label>' +
      '<div id="dofInfo" class="kv"></div><label class="rng"><span>Joint angle <b id="dofVal"></b></span><input type="range" id="dofSlider" step="1"></label>' +
      '<div class="row"><button class="btn small" id="dofAnim">▶ Animate joint</button><button class="btn small" id="dofRel">Release slider</button><button class="btn small" id="dofAllRel">Release all joints</button></div><p class="muted small">Moving a slider takes manual control of that joint (joint-space control). Release returns it to the animation.</p>';
    $('#dofSel').onchange = (e) => Lab.selectDof(e.target.value);
    $('#dofSlider').oninput = (e) => { BB.Runner.clear(); BB.motion.manual[Lab.selDof] = +e.target.value; };
    $('#dofAnim').onclick = () => Lab.selDof && Lab.runSteps([BB.B.sweepDof(Lab.selDof, 2.4)]);
    $('#dofRel').onclick = () => { delete BB.motion.manual[Lab.selDof]; };
    $('#dofAllRel').onclick = () => { BB.motion.manual = {}; };
    if (!Lab.selDof) Lab.selectDof('RElbow');
  };
  Lab.updateDofInfo = function () {
    const box = $('#dofInfo'), d = BB.robot.dofs[Lab.selDof]; if (!box || !d) return;
    const M = BB.motion, i = BB.robot.dofList.indexOf(d) + 1;
    box.innerHTML = kv('Joint', d.label + ' (DOF ' + i + ' / 46)') + kv('Rotation axis', d.axisName) + kv('Current angle ' + MOD, f2(M.q[d.name], 1) + '°') + kv('Angular velocity ' + MOD, f2(M.dq[d.name], 1) + ' °/s') + kv('Conceptual range', d.min + '° … ' + d.max + '°  (ROM ' + (d.max - d.min) + '°)') + kv('Joint position (world) ' + MOD, fmtV(d.node.getWorldPosition(new T.Vector3()))) + kv('Static gravity torque ' + SIM, f2(M.gravityTorque(d.name), 2) + ' N·m') + kv('Function', d.fn);
    const v = $('#dofVal'); if (v) v.textContent = f2(M.manual[d.name] != null ? M.manual[d.name] : M.q[d.name], 0) + '°';
    const sl = $('#dofSlider'); if (sl && (sl.min != d.min || sl.max != d.max)) { sl.min = d.min; sl.max = d.max; sl.value = M.q[d.name]; }
  };
  UI.buildFKIK = function (box) {
    const J = ['RShPitch', 'RShRoll', 'RShYaw', 'RElbow', 'RForearm', 'RWrPitch'], R = BB.robot, M = BB.motion;
    box.innerHTML = '<div id="fkikPanel" data-mode="fk"><div class="fkikTabs"><button class="btn small on" data-m="fk">Forward kinematics</button><button class="btn small" data-m="ik">Inverse kinematics</button></div>' +
      '<div class="fkOnly">' + J.map(n => '<label class="rng"><span>' + esc(R.dofs[n].label) + ' <b data-j="' + n + '"></b></span><input type="range" data-fk="' + n + '" min="' + R.dofs[n].min + '" max="' + R.dofs[n].max + '" step="1" value="0"></label>').join('') + '</div>' +
      '<div class="ikOnly">' + [['Forward', 0, 0.15, 0.6, 0.36], ['Left (+) / right (−)', 1, -0.6, 0.25, -0.26], ['Height', 2, 0.7, 1.75, 1.12]].map(a => '<label class="rng"><span>Target ' + a[0] + ' <b data-ik="' + a[1] + '"></b></span><input type="range" data-ikr="' + a[1] + '" min="' + a[2] + '" max="' + a[3] + '" step="0.01" value="' + a[4] + '"></label>').join('') + '<div id="ikSol" class="kv"></div></div>' +
      '<h5>End-effector (right grip point) in the torso frame ' + MOD + '</h5><div id="fkPos" class="kv"></div><h5>Homogeneous transformation ᵗᵒʳˢᵒT<sub>hand</sub></h5><pre id="fkMat" class="mat"></pre>' +
      '<p class="muted small">Coordinate frames (red X, green Y, blue Z) are drawn at the torso, shoulder, elbow, wrist and grip point. FK: ᵗT_h = T_sh(θ₁,θ₂,θ₃)·T_upper·T_el(θ₄,θ₅)·T_fore·T_wr(θ₆,θ₇,θ₈)·T_grip. IK uses damped least squares on the numerical Jacobian of the shoulder, elbow (and torso) joints.</p></div>';
    box.querySelectorAll('.fkikTabs button').forEach(b => (b.onclick = () => {
      BB.Runner.clear(); Lab.fkik(b.dataset.m);
      if (b.dataset.m === 'fk') { M.ik.R = null; if (BB.world.E.ikBall) BB.world.E.ikBall.visible = false; J.forEach(n => { M.manual[n] = +box.querySelector('[data-fk=' + n + ']').value; }); }
      else { J.forEach(n => delete M.manual[n]); setIK(); }
    }));
    box.querySelectorAll('[data-fk]').forEach(i => (i.oninput = () => { BB.Runner.clear(); M.ik.R = null; Lab.fkik('fk'); J.forEach(n => { M.manual[n] = +box.querySelector('[data-fk=' + n + ']').value; }); }));
    const setIK = () => {
      BB.Runner.clear(); const v = [0, 1, 2].map(k => +box.querySelector('[data-ikr="' + k + '"]').value);
      const E = BB.world.E; if (!E.ikBall) { E.ikBall = new T.Mesh(new T.SphereGeometry(0.03, 16, 12), new T.MeshBasicMaterial({ color: 0xf43f5e })); BB.world.props.add(E.ikBall); }
      E.ikBall.visible = true; E.ikBall.position.copy(M.local(v[0], v[1], v[2])); M.ik.R = { target: E.ikBall.position.clone(), fn: () => E.ikBall.position, torso: false };
    };
    box.querySelectorAll('[data-ikr]').forEach(i => (i.oninput = () => { Lab.fkik('ik'); J.forEach(n => delete M.manual[n]); setIK(); }));
    Lab.fkUpdate = () => {
      if (!$('#fkPos')) return;
      const tor = R.nodes.torso, g = R.nodes.gripR, m = new T.Matrix4().copy(tor.matrixWorld).invert().multiply(g.matrixWorld), e = m.elements;
      const p = new T.Vector3().setFromMatrixPosition(m);
      $('#fkPos').innerHTML = kv('x (left)', f2(p.x, 3) + ' m') + kv('y (up)', f2(p.y, 3) + ' m') + kv('z (forward)', f2(p.z, 3) + ' m') + kv('Reach |p − p_shoulder|', f2(p.distanceTo(R.nodes.shR.position), 3) + ' m');
      let s = ''; for (let r = 0; r < 4; r++) { for (let c = 0; c < 4; c++) s += (e[c * 4 + r] >= 0 ? ' ' : '') + e[c * 4 + r].toFixed(3) + '  '; s += '\n'; } $('#fkMat').textContent = s;
      J.forEach(n => { const b = box.querySelector('[data-j=' + n + ']'); if (b) b.textContent = f2(M.q[n], 0) + '°'; });
      [0, 1, 2].forEach(k => { const b = box.querySelector('[data-ik="' + k + '"]'); if (b) b.textContent = (+box.querySelector('[data-ikr="' + k + '"]').value).toFixed(2) + ' m'; });
      const sol = $('#ikSol'); if (sol) sol.innerHTML = M.ik.R ? J.slice(0, 4).map(n => kv(R.dofs[n].label, f2(M.q[n], 1) + '°')).join('') + kv('Residual error', f2((M.ik.R.err || 0) * 1000, 1) + ' mm' + ((M.ik.R.err || 0) > 0.01 ? ' (target outside the reachable workspace)' : '')) : '<p class="muted small">Move a target slider to solve IK.</p>';
    };
  };

  /* ================================================================ LIVE DATA REFRESH ================================================================ */
  const kv = (k, v) => '<div><span>' + k + '</span><b>' + v + '</b></div>';
  const fmtV = (v) => '(' + f2(v.x) + ', ' + f2(v.y) + ', ' + f2(v.z) + ')';
  Lab.refresh = function () {
    const M = BB.motion, O = M.out, R = BB.robot, V = BB.Voice, c = O.contacts;
    $('#hudState').textContent = stateName();
    const status = [['State', stateName()], ['Gait phase', M.gait || M.stepper ? O.phaseName : '—'], ['Support', O.support], ['Speech', V.cur ? 'Speaking' : V.listening ? 'Listening' : 'Idle'], ['Expression', R.face.expr], ['DOF', '46 (conceptual)']];
    const ld = $('#ldStatus'); if (ld && Lab.curTab === 'data') ld.innerHTML = status.map(s => '<div class="card"><small>' + s[0] + '</small><b>' + esc(s[1]) + '</b></div>').join('');
    const ex = Object.keys(UI.extras);
    const exHtml = (UI.phaseText ? kv('Current step', esc(UI.phaseText)) : '') + ex.map(k => kv(esc(k) + (/simulated|sim\)/i.test(k + UI.extras[k]) ? ' ' + SIM : ''), esc(UI.extras[k]))).join('');
    const kin = kv('Pelvis position ' + MOD, fmtV(R.root.position) + ' m') + kv('Heading (yaw)', f2(BB.util.wrap(M.root.yaw) / D2R, 0) + '°') + kv('Linear velocity ' + MOD, f2(O.speed) + ' m/s') + kv('Linear acceleration ' + MOD, f2(Math.hypot(O.acc.x, O.acc.z)) + ' m/s²') +
      kv('Step length / frequency ' + MOD, M.gait ? f2(O.stepLen) + ' m · ' + f2(O.stepFreq) + ' steps/s' : '—') + kv('Robot height (standing)', '1.72 m') + kv('Body mass ' + SIM, R.TOTAL_MASS.toFixed(1) + ' kg (21-segment model)') +
      kv('CoM position ' + MOD, fmtV(O.com) + ' m') + kv('CoP / ZMP ' + MOD, '(' + f2(O.cop.x) + ', ' + f2(O.cop.z) + ') m') + kv('Body inclination (IMU) ' + MOD, f2(O.tilt, 1) + '° · ' + f2(O.tiltRate, 0) + ' °/s') +
      kv('Ground contact ' + MOD, 'L heel ' + (c.LH ? '●' : '○') + ' toe ' + (c.LT ? '●' : '○') + ' | R heel ' + (c.RH ? '●' : '○') + ' toe ' + (c.RT ? '●' : '○') + (O.flight ? ' – FLIGHT' : '')) +
      kv('Left hand (pelvis frame) ' + MOD, fmtV(O.ee.L) + ' m') + kv('Right hand (pelvis frame) ' + MOD, fmtV(O.ee.R) + ' m') + kv('Battery ' + SIM, Lab.battery.toFixed(1) + ' %');
    const ll = $('#learnLive'); if (ll) ll.innerHTML = (UI.phaseText ? kv('Current step', esc(UI.phaseText)) : '') + kv('State', stateName()) + kv('Support', O.support) + kv('Speed', f2(O.speed) + ' m/s') + kv('CoM height', f2(O.com.y) + ' m') + ex.slice(0, 5).map(k => kv(esc(k), esc(UI.extras[k]))).join('') + keyJoints(Lab.cur);
    if (Lab.curTab === 'data') {
      $('#ldExtra').innerHTML = exHtml || '<p class="muted small">No module-specific parameters for this activity.</p>';
      $('#ldKin').innerHTML = kin;
      const P = O.pressure, bar = (v, l) => '<div class="pb"><i style="height:' + Math.min(100, v) + '%"></i><span>' + l + '<br>' + v.toFixed(0) + '%</span></div>';
      $('#ldPress').innerHTML = '<div class="foot"><b>Left foot</b>' + bar(P.L[1], 'Toe') + bar(P.L[0], 'Heel') + '</div><div class="foot"><b>Right foot</b>' + bar(P.R[1], 'Toe') + bar(P.R[0], 'Heel') + '</div>';
      const sens = [['RGB camera', 'Active (30 fps)'], ['Depth camera', 'Active'], ['LiDAR', 'Scanning 10 Hz'], ['Microphone array', V.listening ? 'Listening' : V.supported.stt ? 'Standby' : 'Not supported in browser'], ['Speaker', V.cur ? 'Playing' : 'Idle'], ['IMU', 'OK · tilt ' + f2(O.tilt, 1) + '°'], ['Joint encoders', '46 / 46 OK'], ['Foot force sensors', (c.L ? 'L contact' : 'L free') + ' · ' + (c.R ? 'R contact' : 'R free')], ['Wrist F/T sensors', 'OK'], ['Motor temperature', (36 + Lab.battery * 0 + Math.min(20, (100 - Lab.battery) * 2)).toFixed(0) + ' °C']];
      $('#ldSens').innerHTML = sens.map(s => kv(s[0], s[1])).join('');
      for (const d of R.dofList) { const r = Lab.jrows[d.name], q = M.q[d.name]; r.a.textContent = q.toFixed(1); r.w.textContent = M.dq[d.name].toFixed(0); r.x.textContent = (Lab.ddq[d.name] || 0).toFixed(0); r.t.textContent = /Hand/.test(d.group) ? '—' : M.gravityTorque(d.name).toFixed(1); r.b.style.width = ((q - d.min) / (d.max - d.min) * 100).toFixed(0) + '%'; r.row.classList.toggle('mov', Math.abs(M.dq[d.name]) > 3); r.row.classList.toggle('sel', d.name === Lab.selDof); }
    }
    if (Lab.selDof) Lab.updateDofInfo();
    if (Lab.fkUpdate) Lab.fkUpdate();
  };
  function keyJoints(id) {
    const M = BB.motion, sets = { 2: ['LHipPitch', 'LKnee', 'LAnkPitch'], 3: ['LHipPitch', 'LKnee', 'LAnkPitch'], 4: ['LHipPitch', 'LKnee', 'torsoPitch'], 6: ['LHipPitch', 'LKnee', 'torsoPitch'], 7: ['LHipPitch', 'LKnee', 'RKnee'], 14: ['RShPitch', 'RElbow', 'RMiddle'], 16: ['RShPitch', 'RElbow', 'torsoPitch'], 26: ['RShPitch', 'RShRoll', 'RElbow'] };
    const s = sets[id] || ['neckYaw', 'RShPitch', 'RElbow'];
    return s.map(n => kv(BB.robot.dofs[n].label, f2(M.q[n], 1) + '°')).join('');
  }

  /* ================================================================ 2D ENGINEERING VIEW ================================================================ */
  const hist = []; let hT = 0;
  Lab.draw2D = function () {
    const cv = $('#c2d'), W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.floor(W * dpr) || cv.height !== Math.floor(H * dpr)) { cv.width = W * dpr; cv.height = H * dpr; }
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const M = BB.motion, R = BB.robot, O = M.out, yaw = M.root.yaw, sy = Math.sin(yaw), cy = Math.cos(yaw), rx = M.root.x, rz = M.root.z;
    const loc = (v) => { const dx = v.x - rx, dz = v.z - rz; return { f: dx * sy + dz * cy, l: dx * cy - dz * sy, y: v.y }; };
    const wp = (n) => loc(R.nodes[n].getWorldPosition(new T.Vector3()));
    // history
    const now = performance.now() / 1000; if (now - hT > 0.033) { hT = now; hist.push([M.q.LHipPitch, M.q.LKnee, M.q.RHipPitch, M.q.RKnee, O.contacts.L, O.contacts.R, loc(O.eeW.R), loc(O.com)]); if (hist.length > 200) hist.shift(); }
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
    const top = H * 0.64, s = Math.min(W * 0.26, top * 0.5) / 1.0;
    x.font = '600 12px system-ui, sans-serif';
    const panel = (cx, title, proj) => {
      const base = top - 14;
      x.strokeStyle = '#e5e8ec'; x.lineWidth = 1; x.beginPath(); for (let g = -1.5; g <= 1.5; g += 0.25) { const X = cx + g * s; x.moveTo(X, 20); x.lineTo(X, base); } for (let g = 0; g <= 1.9; g += 0.25) { const Y = base - g * s; x.moveTo(cx - 1.5 * s, Y); x.lineTo(cx + 1.5 * s, Y); } x.stroke();
      x.strokeStyle = '#0e7490'; x.beginPath(); x.moveTo(cx - 1.5 * s, base); x.lineTo(cx + 1.5 * s, base); x.stroke();
      x.fillStyle = '#0e7490'; x.fillText(title, cx - 1.5 * s + 4, 16);
      const P = (p) => [cx + proj(p) * s, base - p.y * s];
      // trajectories
      if (hist.length > 2) { x.strokeStyle = 'rgba(14,116,144,0.7)'; x.beginPath(); hist.forEach((h, i) => { const q = P(h[6]); i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); }); x.stroke(); x.strokeStyle = 'rgba(191,135,0,0.8)'; x.beginPath(); hist.forEach((h, i) => { const q = P(h[7]); i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); }); x.stroke(); }
      // bones
      x.lineWidth = 3; x.lineCap = 'round';
      for (const [a, b] of BB.world.BONES) { const p1 = P(wp(a)), p2 = P(wp(b)); x.strokeStyle = /L$/.test(b) ? '#0969da' : /R$/.test(b) ? '#bf3989' : '#1f2328'; x.beginPath(); x.moveTo(p1[0], p1[1]); x.lineTo(p2[0], p2[1]); x.stroke(); }
      for (const S of ['L', 'R']) { const so = R.soles[S], h = P(loc(so.heel.clone().applyMatrix4(so.node.matrixWorld))), t = P(loc(so.toe.clone().applyMatrix4(so.node.matrixWorld))); x.strokeStyle = O.contacts[S] ? '#1a7f37' : '#8c959f'; x.beginPath(); x.moveTo(h[0], h[1]); x.lineTo(t[0], t[1]); x.stroke(); }
      const hd = P(loc(new T.Vector3(0, 0.1, 0).applyMatrix4(R.nodes.neck.matrixWorld))); x.strokeStyle = '#1f2328'; x.beginPath(); x.arc(hd[0], hd[1], 0.1 * s, 0, 7); x.stroke();
      // joints with DOF counts
      const J = [['neck', 3], ['torso', 3], ['shL', 3], ['shR', 3], ['elL', 2], ['elR', 2], ['wrL', 3], ['wrR', 3], ['hipL', 3], ['hipR', 3], ['kneeL', 1], ['kneeR', 1], ['ankL', 2], ['ankR', 2], ['gripL', 6], ['gripR', 6]];
      x.font = '10px system-ui'; for (const [n, d] of J) { const q = P(wp(n)); x.fillStyle = '#bc4c00'; x.beginPath(); x.arc(q[0], q[1], 4, 0, 7); x.fill(); x.fillStyle = '#9a6700'; x.fillText(d, q[0] + 5, q[1] - 4); }
      // sensors
      for (const sn of R.sensors) { const q = P(loc(sn.anchor.getWorldPosition(new T.Vector3()))); x.fillStyle = '#0e7490'; x.fillRect(q[0] - 3, q[1] - 3, 6, 6); }
      // CoM / CoP
      const cm = P(loc(O.com)), cp = P(loc(O.cop)); x.fillStyle = '#bf8700'; x.beginPath(); x.arc(cm[0], cm[1], 5, 0, 7); x.fill(); x.setLineDash([4, 3]); x.strokeStyle = '#bf8700'; x.lineWidth = 1; x.beginPath(); x.moveTo(cm[0], cm[1]); x.lineTo(cm[0], base); x.stroke(); x.setLineDash([]); x.fillStyle = '#ef4444'; x.fillRect(cp[0] - 4, base - 2, 8, 4);
    };
    panel(W * 0.27, 'FRONT VIEW (x–y)', (p) => p.l);
    panel(W * 0.73, 'SIDE VIEW (z–y)', (p) => p.f);
    // legend
    x.font = '11px system-ui'; const lg = [['#bc4c00', 'joint (n = DOF)'], ['#0e7490', 'sensor'], ['#bf8700', 'CoM + trace'], ['#ef4444', 'CoP'], ['#1a7f37', 'foot in contact'], ['rgba(14,116,144,0.9)', 'right-hand trajectory']];
    lg.forEach((l, i) => { x.fillStyle = l[0]; x.fillRect(12 + i * (W / 6.2), top - 6, 9, 9); x.fillStyle = '#424a53'; x.fillText(l[1], 25 + i * (W / 6.2), top + 3); });
    // gait diagram
    const gy = top + 18, gh = H - gy - 14; if (gh < 40) return;
    x.fillStyle = '#ffffff'; x.fillRect(10, gy, W - 20, gh); x.fillStyle = '#0e7490'; x.font = '600 12px system-ui'; x.fillText('GAIT DIAGRAM – joint angles (last ≈ 6 s) and ground contact', 18, gy + 15);
    const gx0 = 50, gw = W - 70, map = (v) => gy + 22 + (gh - 44) * (1 - (v + 30) / 160);
    x.strokeStyle = '#e5e8ec'; x.lineWidth = 1; x.fillStyle = '#8c959f'; x.font = '10px system-ui';
    [-30, 0, 45, 90, 130].forEach(v => { x.beginPath(); x.moveTo(gx0, map(v)); x.lineTo(gx0 + gw, map(v)); x.stroke(); x.fillText(v + '°', 16, map(v) + 3); });
    const cols = ['#0969da', '#3b82f6', '#bf3989', '#ec4899'], names = ['L hip', 'L knee', 'R hip', 'R knee'];
    for (let k = 0; k < 4; k++) { x.strokeStyle = cols[k]; x.lineWidth = 1.6; x.beginPath(); hist.forEach((h, i) => { const X = gx0 + gw * i / 199, Y = map(h[k]); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.stroke(); x.fillStyle = cols[k]; x.fillText(names[k], gx0 + gw - 230 + k * 58, gy + 15); }
    hist.forEach((h, i) => { const X = gx0 + gw * i / 199; if (h[4]) { x.fillStyle = '#0969da'; x.fillRect(X, gy + gh - 18, gw / 199 + 0.5, 5); } if (h[5]) { x.fillStyle = '#bf3989'; x.fillRect(X, gy + gh - 11, gw / 199 + 0.5, 5); } });
    x.fillStyle = '#57606a'; x.fillText('contact L / R', gx0 + 4, gy + gh - 20);
  };

  /* ================================================================ BOOT ================================================================ */
  window.addEventListener('DOMContentLoaded', () => {
    const msg = $('#loadMsg'), bar = $('#loadBar i');
    const steps = ['Building skeletal rig (46 DOF)…', 'Assembling five-finger hands…', 'Calibrating joint encoders…', 'Initialising sensors…', 'Loading 30 learning modules…', 'Starting speech engine…'];
    let i = 0;
    const tick = setInterval(() => { if (i < steps.length) { msg.textContent = steps[i]; bar.style.width = ((i + 1) / steps.length * 100) + '%'; i++; } }, 160);
    setTimeout(() => {
      try { Lab.init(); }
      catch (e) { clearInterval(tick); console.error(e); msg.textContent = 'BAIRWABOT could not start: ' + e.message + '. WebGL is required – please use an up-to-date browser with hardware acceleration enabled.'; return; }
      setTimeout(() => {
        clearInterval(tick); bar.style.width = '100%';
        $('#loadTitle').textContent = 'Hello! I am BAIRWABOT. Your humanoid robotics laboratory is ready.'; msg.textContent = 'Press Enter the Lab to start (this also enables sound).';
        const b = $('#enterBtn'); b.hidden = false; b.focus();
        b.onclick = () => { $('#loader').classList.add('gone'); setTimeout(() => $('#loader').remove(), 600); if (BB.CONFIG.AUTO_GREETING) Lab.openPage('intro'); };
      }, steps.length * 160 + 100);
    }, 120);
  });
})();
