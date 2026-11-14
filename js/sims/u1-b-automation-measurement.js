/* Unit I — automation levels, robot classification, measurement system, static and dynamic characteristics */
(function () {
  const RIL = window.RIL, M = RIL.M, D = RIL.draw, C = RIL.C, D2R = M.D2R;

  /* ================= Automation levels (Topic I.1) ================= */
  /* Station cycle times are illustrative teaching values (Supplementary), chosen so that the
     relative throughput, flexibility and changeover of Table 1.2 can be compared. */
  const LEVELS = {
    manual: { name: 'Manual manufacturing', who: ['H', 'H', 'H'], t: [24, 40, 20], change: 5, flex: 'Very high (people adapt)', type: 'No automation' },
    semi: { name: 'Semi-automated', who: ['H', 'M', 'H'], t: [18, 12, 15], change: 20, flex: 'High', type: 'Programmable machine, manual loading' },
    fixed: { name: 'Fully automated (fixed / hard)', who: ['M', 'M', 'M'], t: [4, 4, 4], change: 480, flex: 'Very low (dedicated)', type: 'Fixed (hard) automation' },
    robot: { name: 'Robot-integrated (flexible)', who: ['R', 'M', 'R'], t: [6, 6, 6], change: 2, flex: 'High (reprogram robot)', type: 'Programmable / flexible automation' },
    hmi: { name: 'Human–robot collaboration', who: ['H', 'M', 'C'], t: [12, 6, 8], change: 2, flex: 'Very high', type: 'Collaborative cell (cobot)' }
  };
  const WHO = { H: ['Human operator', C.amber], M: ['Machine', C.cyan], R: ['Industrial robot', C.green], C: ['Cobot', C.violet] };
  RIL.defineSim({
    id: 'automation-levels', title: 'Levels of automation: manual to robotic', unit: 1, category: 'robotics-fundamentals', kind: '2d', auto: true, autoDefault: true,
    description: 'Animated production line that switches between manual, semi-automated, fixed automation, robot-integrated and human–robot collaborative operation; throughput, changeover and human involvement are compared live.',
    help: 'Choose an automation level. Parts flow from left to right through Load, Process and Unload/Inspect stations. In Automatic mode the product type changes periodically so you can see the changeover penalty of fixed automation. In the collaborative cell, drag the operator slider towards the cobot: speed-and-separation monitoring slows the cobot.',
    controls: [
      { id: 'level', type: 'select', label: 'Automation level', string: true, value: 'manual', options: Object.entries(LEVELS).map(([k, v]) => [k, v.name]) },
      { id: 'batch', label: 'Batch size before product change', min: 5, max: 200, step: 5, value: 40, unit: 'parts' },
      { id: 'human', label: 'Operator distance from cobot (collaborative)', min: 0.2, max: 2.0, step: 0.05, value: 1.5, unit: 'm' }
    ],
    readouts: [{ id: 'type', label: 'Type (Table 1.2)' }, { id: 'tc', label: 'Cycle time (bottleneck)', unit: 's' }, { id: 'tp', label: 'Ideal throughput', unit: 'parts/h' }, { id: 'eff', label: 'Throughput incl. changeover', unit: 'parts/h' }, { id: 'hum', label: 'Stations needing a person' }, { id: 'flex', label: 'Flexibility' }, { id: 'n', label: 'Parts produced' }],
    charts: [{ id: 'c', title: 'Cumulative parts produced', x: 'simulated time (s)', y: 'parts', series: [{ label: 'this level' }], window: 2000 }],
    note: 'Cycle and changeover times are illustrative teaching values (supplementary), not plant data.',
    stepDt: 0.25,
    reset(S) { S.parts = []; S.done = 0; S.clock = 0; S.stn = [0, 0, 0]; S.busy = [null, null, null]; S.change = 0; S.sinceChange = 0; S.prod = 0; },
    onControl(S, id) { if (id === 'level') S.reset(); },
    speedOf(S) { const L = LEVELS[S.p.level]; let k = 1; if (S.p.level === 'hmi') k = M.clamp((S.p.human - 0.3) / 1.0, 0.15, 1); return { L, k }; },
    step(S, dt) {
      const sim = dt * 20; S.clock += sim; const { L, k } = this.speedOf(S);
      if (S.change > 0) { S.change -= sim; return; }
      // stations process in pipeline: part enters station i when free
      for (let i = 2; i >= 0; i--) {
        const b = S.busy[i];
        if (b) { b.t += sim * (L.who[i] === 'C' || L.who[i] === 'R' ? k : 1) / (L.who[i] === 'R' && S.p.level === 'hmi' ? 1 : 1); if (b.t >= L.t[i]) { if (i === 2) { S.busy[2] = null; S.done++; S.sinceChange++; S.chart('c').push(S.clock, [S.done]); } else if (!S.busy[i + 1]) { S.busy[i + 1] = { t: 0, col: b.col }; S.busy[i] = null; } } }
      }
      if (!S.busy[0]) S.busy[0] = { t: 0, col: S.prod % 2 ? C.violet : C.amber };
      if (S.auto && S.sinceChange >= S.p.batch) { S.sinceChange = 0; S.prod++; S.change = L.change; S.busy = [null, null, null]; }
    },
    draw(S) {
      D.clear(S); const W = S.W, H = S.H, { L, k } = this.speedOf(S);
      const y0 = H * 0.55, x0 = 40, x1 = W - 40;
      D.rect(S, x0, y0, x1 - x0, 14, '#c9d1d9', '#8c959f', 1, 4);
      for (let x = x0 + ((S.clock * 4) % 24); x < x1; x += 24) D.line(S, x, y0 + 2, x, y0 + 12, 'rgba(87,96,106,.35)', 1);
      const sx = [0.2, 0.5, 0.8].map(f => x0 + (x1 - x0) * f), names = ['Load', 'Process', 'Unload / inspect'];
      sx.forEach((x, i) => {
        const w = L.who[i]; const [wn, col] = WHO[w];
        D.block(S, x - 58, y0 - 118, 116, 48, names[i] + '\n' + wn, { stroke: col });
        const b = S.busy[i]; const prog = b ? M.clamp(b.t / L.t[i], 0, 1) : 0;
        D.rect(S, x - 50, y0 - 62, 100, 6, '#c9d1d9'); D.rect(S, x - 50, y0 - 62, 100 * prog, 6, col);
        D.text(S, `${L.t[i]} s`, x + 54, y0 - 56, { size: 10, color: C.muted });
        // worker / machine / robot icon
        const ax = x, ay = y0 - 22;
        if (w === 'H') { D.circle(S, ax + 40, ay - 26, 7, col); D.line(S, ax + 40, ay - 19, ax + 40, ay + 4, col, 3); const sw = Math.sin(S.t * 6 + i) * 8; D.line(S, ax + 40, ay - 12, ax + 26 + sw, ay - 2, col, 3); }
        else if (w === 'M') { D.rect(S, ax - 18, ay - 40, 36, 26, '#f6f8fa', col, 1.5, 3); const ph = b ? Math.abs(Math.sin(S.t * 8)) : 0; D.rect(S, ax - 4, ay - 14, 8, 6 + 10 * ph, col); }
        else { const a1 = -1.2 + 0.6 * Math.sin(S.t * 2 * (w === 'C' ? k : 1) + i), a2 = 1.2 + 0.5 * Math.sin(S.t * 2.6 * (w === 'C' ? k : 1)); const bx = ax + 44, by = ay + 2; const ex = bx + 30 * Math.cos(a1), ey = by + 30 * Math.sin(a1); D.link(S, bx, by, ex, ey, 6, col, '#24292f'); D.link(S, ex, ey, ex + 24 * Math.cos(a1 + a2), ey + 24 * Math.sin(a1 + a2), 5, col, '#24292f'); D.joint(S, bx, by, 5); }
        if (b) D.rect(S, x - 12, y0 - 14, 24, 14, b.col, '#24292f', 1, 2);
      });
      if (S.p.level === 'hmi') {
        const cx = sx[2] + 44, d = S.p.human, px = cx + 40 + d * 60;
        D.circle(S, cx, y0 - 20, 1.5 * 60 * 0.6, null, 'rgba(209,36,47,.35)', 1); D.circle(S, cx, y0 - 20, 0.6 * 60 * 0.6, null, 'rgba(209,36,47,.6)', 1);
        D.circle(S, Math.min(px, W - 20), y0 - 46, 7, C.amber); D.line(S, Math.min(px, W - 20), y0 - 39, Math.min(px, W - 20), y0 - 16, C.amber, 3);
        D.text(S, `Cobot speed ${Math.round(k * 100)} % (speed & separation monitoring)`, W / 2, H - 16, { align: 'center', size: 11, color: k < 0.5 ? C.red : C.green });
      }
      if (S.change > 0) D.text(S, `Changeover for new product: ${Math.ceil(S.change)} s remaining`, W / 2, 26, { align: 'center', size: 13, color: C.red, weight: 650 });
      else D.text(S, L.name, W / 2, 26, { align: 'center', size: 14, weight: 700 });
      D.text(S, 'Parts produced: ' + S.done, x1, y0 + 36, { align: 'right', size: 12, color: C.green });
      Object.entries(WHO).forEach(([k2, [n, c]], i) => { D.circle(S, 50 + i * 130, H - 40, 5, c); D.text(S, n, 60 + i * 130, H - 36, { size: 10.5, color: C.muted }); });
      const tc = Math.max(...L.t.map((t, i) => (L.who[i] === 'C' ? t / k : t))); const tp = 3600 / tc;
      const eff = 3600 / (tc + L.change / S.p.batch);
      S.set('type', L.type); S.set('tc', tc, ''); S.set('tp', tp); S.set('eff', eff); S.set('hum', L.who.filter(w => w === 'H').length + ' of 3'); S.set('flex', L.flex); S.set('n', S.done);
    }
  });

  /* ================= Robot classification (Topic I.3) ================= */
  const CLASS = [
    ['Physical configuration', 'Cartesian, cylindrical, spherical (polar), SCARA, articulated, parallel', 'Determined by the type and order of the first three joints (Section 1.4).'],
    ['Kinematic structure', 'Serial (open chain), parallel (closed chain), hybrid', 'Delta and Stewart platforms are parallel robots.'],
    ['Drive / power source', 'Electric, hydraulic, pneumatic', 'Electric servo drives dominate; hydraulic for very high payload; pneumatic for simple pick-and-place.'],
    ['Control of motion', 'Non-servo (limited sequence, bang-bang), servo point-to-point (PTP), servo continuous path (CP)', 'PTP: spot welding, machine loading. CP: arc welding, painting, gluing.'],
    ['Programming method', 'Lead-through (walk-through), teach pendant, offline programming, learning by demonstration', 'See Unit IV.'],
    ['Intelligence / generation', 'Playback, sensory-controlled, adaptive / intelligent', 'Increasing use of sensors and on-board reasoning.'],
    ['Mobility', 'Fixed-base manipulators, wheeled and legged mobile robots, aerial and underwater robots, mobile manipulators', 'Mobile robots require localisation and mapping.'],
    ['Application', 'Industrial, service, medical, field, space, collaborative', 'Cobots are designed for safe physical human–robot interaction.']
  ];
  const ROBOT_CARDS = {
    weld: ['Arc-welding robot', ['Articulated', 'Serial', 'Electric', 'Continuous path (CP)', 'Teach pendant / offline', 'Sensory-controlled (seam tracking)', 'Fixed base', 'Industrial']],
    spot: ['Spot-welding robot', ['Articulated', 'Serial', 'Electric', 'Point-to-point (PTP)', 'Teach pendant', 'Playback', 'Fixed base', 'Industrial']],
    delta: ['Delta picker', ['Parallel', 'Parallel (closed chain)', 'Electric', 'PTP (high speed)', 'Offline + vision', 'Sensory-controlled', 'Fixed base', 'Industrial (packaging)']],
    press: ['Pneumatic pick-and-place unit', ['Cartesian', 'Serial', 'Pneumatic', 'Non-servo (bang-bang, end stops)', 'Mechanical stops / PLC', 'Playback', 'Fixed base', 'Industrial']],
    agv: ['Autonomous mobile robot (AMR)', ['— (mobile base)', 'Serial (if arm fitted)', 'Electric', 'Servo CP (path following)', 'Map + mission programming', 'Adaptive / intelligent', 'Wheeled mobile', 'Logistics / service']],
    cobot: ['Collaborative arm', ['Articulated', 'Serial', 'Electric', 'Servo CP', 'Lead-through + pendant', 'Sensory-controlled (force)', 'Fixed or mobile', 'Collaborative']]
  };
  RIL.defineSim({
    id: 'robot-classification', title: 'Robot classification and motion-control types', unit: 1, category: 'robotics-fundamentals', kind: '2d', auto: true, autoDefault: true,
    description: 'Classify example robots on every basis of Table 1.4 and compare non-servo, point-to-point and continuous-path motion control on the same two-link arm.',
    help: 'Pick an example robot to see its entry on each classification basis. Then compare the three motion-control classes: non-servo moves one axis at a time between end stops, PTP interpolates all joints together (curved tool path), CP controls the tool path itself (straight line here).',
    controls: [
      { id: 'robot', type: 'select', label: 'Example robot', string: true, value: 'weld', options: Object.entries(ROBOT_CARDS).map(([k, v]) => [k, v[0]]) },
      { id: 'ctrl', type: 'select', label: 'Motion control class', string: true, value: 'ptp', options: [['ns', 'Non-servo (limited sequence)'], ['ptp', 'Servo point-to-point (PTP)'], ['cp', 'Servo continuous path (CP)']] },
      { id: 'T', label: 'Move duration', min: 1, max: 6, step: 0.1, value: 3, unit: 's' }
    ],
    readouts: [{ id: 'len', label: 'Tool path length', unit: 'm' }, { id: 'dev', label: 'Max deviation from straight line', unit: 'mm' }, { id: 'axes', label: 'Axes moving together' }],
    panels: [{ id: 'tbl', title: 'Classification of robots (Table 1.4 of the notes) — highlighted: selected example', wide: true }],
    stepDt: 0.05,
    reset(S) { S.trace = []; S.ph = 0; S.seg = 0; S.maxDev = 0; S.len = 0; },
    onControl(S, id) { if (id === 'ctrl' || id === 'T') S.reset(); },
    path(S, s) {
      const l1 = 0.5, l2 = 0.4, A = [0.75, 0.15], B = [0.1, 0.7];
      const ikA = M.planar2R.ik(l1, l2, ...A).sols[1], ikB = M.planar2R.ik(l1, l2, ...B).sols[1];
      let t1, t2;
      if (S.p.ctrl === 'cp') { const p = [A[0] + (B[0] - A[0]) * s, A[1] + (B[1] - A[1]) * s]; const r = M.planar2R.ik(l1, l2, ...p).sols[1]; t1 = r.t1; t2 = r.t2; }
      else if (S.p.ctrl === 'ptp') { const u = s * s * (3 - 2 * s); t1 = ikA.t1 + (ikB.t1 - ikA.t1) * u; t2 = ikA.t2 + (ikB.t2 - ikA.t2) * u; }
      else { const u1 = M.clamp(s * 2, 0, 1), u2 = M.clamp(s * 2 - 1, 0, 1); t1 = ikA.t1 + (ikB.t1 - ikA.t1) * (u1 < 1 ? Math.min(1, u1 * 1.6) : 1); t2 = ikA.t2 + (ikB.t2 - ikA.t2) * Math.min(1, u2 * 1.6); }
      return { t1, t2, l1, l2, A, B };
    },
    step(S, dt) { S.ph += dt / S.p.T; if (S.ph > 1.25) { S.ph = 0; S.trace = []; S.maxDev = 0; S.len = 0; } },
    draw(S) {
      D.clear(S); const V = D.fit(S, [-0.3, 1.0], [-0.1, 0.95], 34);
      D.axes2(S, V, [-0.3, 1.0], [-0.1, 0.95], 0.1);
      const s = M.clamp(S.ph, 0, 1); const P = this.path(S, s); const fk = M.planar2R.fk(P.l1, P.l2, P.t1, P.t2);
      const last = S.trace[S.trace.length - 1]; if (!last || Math.hypot(last[0] - fk.x, last[1] - fk.y) > 0.002) { if (last) S.len += Math.hypot(last[0] - fk.x, last[1] - fk.y); S.trace.push([fk.x, fk.y]); }
      // deviation from line AB
      const [A, B] = [P.A, P.B]; const ab = [B[0] - A[0], B[1] - A[1]]; const L = Math.hypot(...ab); const dev = Math.abs((fk.x - A[0]) * ab[1] - (fk.y - A[1]) * ab[0]) / L; S.maxDev = Math.max(S.maxDev, dev);
      D.line(S, V.X(A[0]), V.Y(A[1]), V.X(B[0]), V.Y(B[1]), 'rgba(26,155,75,.5)', 1.5, [6, 5]);
      D.poly(S, S.trace.map(p => [V.X(p[0]), V.Y(p[1])]), null, C.amber, 2.5, false);
      D.arm(S, V, [[0, 0], [fk.ex, fk.ey], [fk.x, fk.y]]);
      [['A', A], ['B', B]].forEach(([n, p]) => { D.circle(S, V.X(p[0]), V.Y(p[1]), 6, null, C.green, 2); D.text(S, n, V.X(p[0]) + 9, V.Y(p[1]) - 8, { size: 13, weight: 700, color: C.green }); });
      const nm = { ns: 'Non-servo: axes move one at a time to end stops', ptp: 'PTP: joints interpolated together, path not controlled', cp: 'CP: tool follows the commanded straight path' }[S.p.ctrl];
      D.text(S, nm, 14, 22, { size: 12.5, weight: 650 });
      S.set('len', S.len); S.set('dev', S.maxDev * 1000); S.set('axes', S.p.ctrl === 'ns' ? 'one at a time' : 'all, synchronised');
      const card = ROBOT_CARDS[S.p.robot];
      RIL.setHTML(S.panel('tbl'), '<div class="table-scroll">' + RIL.ui.kv(CLASS.map((r, i) => ({ cells: [r[0], r[1], `<b style="color:#9a5b00">${card[1][i]}</b>`, r[2]], hl: false })), ['Basis', 'Classes', card[0], 'Remarks / examples']) + '</div>', S, 'tbl');
    }
  });

  /* ================= Generalised measurement system (Topic I.9) ================= */
  const CHAINS = {
    temp: { name: 'Temperature with Pt100 RTD', unit: '°C', min: 0, max: 200, val: 80, blocks: [
      ['Measurand', 'Process temperature T', v => M.fmt(v, 1) + ' °C'],
      ['Primary sensing element', 'Pt100 resistance R_T = R₀(1+AT+BT²)  (1.43)', v => M.fmt(M.inst.rtdCVD(v), 2) + ' Ω'],
      ['Variable conversion (transducer)', 'Quarter Wheatstone bridge, 5 V, 100 Ω arms', v => M.fmt(1000 * M.inst.bridge(5, M.inst.rtdCVD(v), 100, 100, 100), 2) + ' mV'],
      ['Signal conditioning', 'In-amp gain 40 and low-pass filter', v => M.fmt(40 * M.inst.bridge(5, M.inst.rtdCVD(v), 100, 100, 100), 3) + ' V'],
      ['Data processing', '12-bit ADC (0–5 V), inverse CVD in software', v => { const c = M.sig.adcCode(40 * M.inst.bridge(5, M.inst.rtdCVD(v), 100, 100, 100), 5, 12); return 'code ' + c; }],
      ['Data presentation', 'Display / HMI / controller', v => { const c = M.sig.adcCode(40 * M.inst.bridge(5, M.inst.rtdCVD(v), 100, 100, 100), 5, 12); const vb = c * 5 / 4095 / 40; const r = 100 * (2.5 + vb) / (2.5 - vb); const A = 3.9083e-3, B = -5.775e-7; const T = (-A + Math.sqrt(A * A - 4 * B * (1 - r / 100))) / (2 * B); return M.fmt(T, 2) + ' °C'; }]] },
    force: { name: 'Gripper force with cantilever load cell', unit: 'N', min: 0, max: 80, val: 50, blocks: [
      ['Measurand', 'Gripping force F', v => M.fmt(v, 1) + ' N'],
      ['Primary sensing element', 'Aluminium cantilever: ε = 6FL/(Ebh²)  (1.53)', v => M.fmt(1e6 * M.inst.cantileverStrain(v, 0.1, 70e9, 0.02, 0.005), 0) + ' µε'],
      ['Variable conversion (transducer)', 'Full strain-gauge bridge, GF = 2, Vex = 10 V', v => M.fmt(1000 * 10 * 2 * M.inst.cantileverStrain(v, 0.1, 70e9, 0.02, 0.005), 2) + ' mV'],
      ['Signal conditioning', 'In-amp gain 200, anti-alias filter', v => M.fmt(200 * 10 * 2 * M.inst.cantileverStrain(v, 0.1, 70e9, 0.02, 0.005), 3) + ' V'],
      ['Data processing', '12-bit ADC (0–5 V) and scaling', v => 'code ' + M.sig.adcCode(200 * 10 * 2 * M.inst.cantileverStrain(v, 0.1, 70e9, 0.02, 0.005), 5, 12)],
      ['Data presentation', 'Robot controller / force display', v => { const c = M.sig.adcCode(200 * 20 * M.inst.cantileverStrain(v, 0.1, 70e9, 0.02, 0.005), 5, 12); return M.fmt(c * 5 / 4095 / (200 * 20) / M.inst.cantileverStrain(1, 0.1, 70e9, 0.02, 0.005), 2) + ' N'; }]] },
    dist: { name: 'Distance with ultrasonic ranger', unit: 'm', min: 0.05, max: 3, val: 1, blocks: [
      ['Measurand', 'Distance to object d', v => M.fmt(v, 3) + ' m'],
      ['Primary sensing element', 'Sound echo; time of flight t = 2d/v_s  (1.40)', v => M.fmt(2 * v / M.inst.ultrasonicSpeed(20) * 1000, 3) + ' ms'],
      ['Variable conversion (transducer)', 'Piezo transducer → echo pulse width', v => 'pulse ' + M.fmt(2 * v / M.inst.ultrasonicSpeed(20) * 1e6, 0) + ' µs'],
      ['Signal conditioning', 'Amplifier, comparator, timer (1 µs ticks)', v => Math.round(2 * v / M.inst.ultrasonicSpeed(20) * 1e6) + ' ticks'],
      ['Data processing', 'd = v_s t/2 with temperature compensation', v => M.fmt(Math.round(2 * v / M.inst.ultrasonicSpeed(20) * 1e6) * 1e-6 * M.inst.ultrasonicSpeed(20) / 2, 4) + ' m'],
      ['Data presentation', 'Display / PLC analogue output 4–20 mA (0–3 m)', v => M.fmt(4 + 16 * v / 3, 2) + ' mA']] }
  };
  const BLOCK_INFO = [
    'The physical quantity being measured. It is not changed by measurement in an ideal system; in practice the sensor loads it (Section 1.8.10).',
    'First element in contact with the measurand. It responds with a related physical change (resistance, strain, time delay).',
    'Converts the output of the sensing element into a more convenient form, usually an electrical signal (variable-conversion element).',
    'Amplifies, filters, isolates and linearises the signal so that it suits the next stage (Unit II, Section 2.14).',
    'Converts and computes: digitisation, scaling, linearisation, compensation, averaging.',
    'Presents or uses the result: indicator, display, recorder, controller input, network message.'
  ];
  RIL.defineSim({
    id: 'measurement-system', title: 'Generalised measurement system', unit: 1, category: 'measurement-systems', kind: '2d', auto: true, autoDefault: false,
    description: 'Interactive block diagram Measurand → Primary sensing element → Transducer → Signal conditioning → Data processing → Display, with the signal value computed at each stage for three example chains.',
    help: 'Select an example chain and move the measurand slider. Each block shows the signal it outputs, computed from the equations of the notes. Click a block to read its function. In Automatic mode the measurand ramps slowly and a pulse travels along the chain.',
    controls: [
      { id: 'chain', type: 'select', label: 'Example measurement chain', string: true, value: 'temp', options: Object.entries(CHAINS).map(([k, v]) => [k, v.name]) },
      { id: 'x', label: 'Measurand value (units of the chain)', min: 0, max: 200, step: 0.1, value: 80 },
      { id: 'blk', type: 'select', label: 'Selected block', value: 0, options: ['Measurand', 'Primary sensing element', 'Transducer', 'Signal conditioning', 'Data processing', 'Data presentation'].map((n, i) => [i, n]) }
    ],
    readouts: [{ id: 'in', label: 'True value' }, { id: 'out', label: 'Displayed value' }, { id: 'err', label: 'Overall error (quantisation)' }],
    panels: [{ id: 'info', title: 'Function of the selected block' }],
    reset(S) { S.pulse = 0; },
    onControl(S, id, v) { if (id === 'chain') { const c = CHAINS[v]; const r = S.inputs.x.el; r.min = c.min; r.max = c.max; r.step = (c.max - c.min) / 1000; r.nextElementSibling.min = c.min; r.nextElementSibling.max = c.max; S.setParam('x', c.val, true); } },
    onPointer(S, type, x, y) { if (type === 'down' && S.rects) S.rects.forEach((r, i) => { if (D.hit(r, x, y)) S.setParam('blk', i, true); }); },
    step(S, dt) { S.pulse = (S.pulse + dt * 0.5) % 1; if (S.auto) { const c = CHAINS[S.p.chain]; S.setParam('x', +(c.min + (c.max - c.min) * (0.5 - 0.5 * Math.cos(S.t * 0.25))).toFixed(3), true); } },
    draw(S) {
      D.clear(S); const c = CHAINS[S.p.chain]; const v = M.clamp(S.p.x, c.min, c.max);
      const n = 6, narrow = S.W < 700; const cols = narrow ? 2 : 3; const bw = Math.min(210, (S.W - 40 - (cols - 1) * 30) / cols), bh = 92;
      S.rects = [];
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / cols), k = r % 2 ? cols - 1 - (i % cols) : i % cols;
        const x = 20 + k * (bw + 30) + (S.W - 40 - cols * bw - (cols - 1) * 30) / 2, y = 30 + r * (bh + 46);
        S.rects.push(D.block(S, x, y, bw, bh, '', { active: +S.p.blk === i }));
        const b = c.blocks[i]; D.text(S, (i + 1) + '. ' + b[0], x + 10, y + 20, { size: 11.5, weight: 700, color: +S.p.blk === i ? C.amber : C.text });
        const words = b[1].split(' '); let line = '', ly = y + 38; words.forEach(w => { if ((line + w).length > bw / 6.2) { D.text(S, line, x + 10, ly, { size: 10, color: C.muted }); line = ''; ly += 13; } line += w + ' '; }); D.text(S, line, x + 10, ly, { size: 10, color: C.muted });
        D.text(S, b[2](v), x + bw - 10, y + bh - 10, { size: 13, weight: 700, color: C.cyan, align: 'right' });
      }
      for (let i = 0; i < n - 1; i++) { const a = S.rects[i], b = S.rects[i + 1]; const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2; const sameRow = Math.abs(ay - by) < 1; const p1 = sameRow ? [ax + Math.sign(bx - ax) * a.w / 2, ay] : [ax, a.y + a.h], p2 = sameRow ? [bx - Math.sign(bx - ax) * b.w / 2, by] : [bx, b.y]; D.arrow(S, ...p1, ...p2, C.amber, 2); }
      // travelling pulse
      const seg = Math.min(n - 2, Math.floor(S.pulse * (n - 1))), f = S.pulse * (n - 1) - seg; const a = S.rects[seg], b = S.rects[seg + 1];
      D.circle(S, a.x + a.w / 2 + (b.x - a.x) * f, a.y + a.h / 2 + (b.y - a.y) * f, 5, C.cyan);
      const disp = c.blocks[5][2](v); S.set('in', M.fmt(v, 3) + ' ' + c.unit); S.set('out', disp);
      const dv = parseFloat(disp.replace('−', '-')); S.set('err', S.p.chain === 'dist' ? '4–20 mA output' : M.fmt(dv - v, 3) + ' ' + c.unit);
      RIL.setHTML(S.panel('info'), `<b style="color:#1f2328">${c.blocks[+S.p.blk][0]}</b><p style="margin:.3em 0">${BLOCK_INFO[+S.p.blk]}</p><p style="margin:0;color:#57606a">In this chain: ${c.blocks[+S.p.blk][1]}. Output now: <b style="color:#0b7fc1">${c.blocks[+S.p.blk][2](v)}</b></p>`, S, 'i');
    }
  });

  /* ================= Static characteristics (Topic I.10) ================= */
  RIL.defineSim({
    id: 'static-characteristics', title: 'Static characteristics: accuracy, precision, sensitivity, resolution, uncertainty', unit: 1, category: 'measurement-systems', kind: '2d', auto: true, autoDefault: false,
    description: 'Four linked experiments: a target for accuracy versus precision (mean, bias, standard deviation, Type A uncertainty), static calibration by least squares (sensitivity, offset, non-linearity), resolution of analogue and N-bit instruments, and propagation of uncertainty for P = VI.',
    help: 'Choose the characteristic to study. Accuracy/precision: set the systematic error (bias) and random error (spread) and fire repeated readings. Sensitivity: the least-squares line is fitted to the calibration points you generate. Resolution: compare instruments of different resolution reading the same slowly rising input. Uncertainty: change the uncertainties of V and I.',
    controls: [
      { id: 'mode', type: 'select', label: 'Characteristic', string: true, value: 'acc', options: [['acc', 'Accuracy and precision (target)'], ['sens', 'Sensitivity, linearity, hysteresis (calibration)'], ['res', 'Resolution'], ['unc', 'Uncertainty propagation (P = VI)']] },
      { id: 'bias', label: 'Systematic error (bias) | gain K | V', min: 0, max: 3, step: 0.01, value: 1.1 },
      { id: 'sd', label: 'Random error (std dev) | noise | u(V)', min: 0.01, max: 2, step: 0.01, value: 0.25 },
      { id: 'nl', label: 'Non-linearity | bits N | I', min: 0, max: 12, step: 0.01, value: 0.5 },
      { id: 'hy', label: 'Hysteresis | analogue div | u(I)', min: 0, max: 1, step: 0.01, value: 0.1 },
      { id: 'n', label: 'Readings per burst', min: 2, max: 50, step: 1, value: 8 },
      { id: 'b', type: 'buttons', buttons: [{ id: 'shoot', label: 'Take readings' }, { id: 'clear', label: 'Clear' }] }
    ],
    readouts: [{ id: 'r1', label: '—' }, { id: 'r2', label: '—' }, { id: 'r3', label: '—' }, { id: 'r4', label: '—' }, { id: 'r5', label: '—' }],
    charts: [{ id: 'c', title: 'Graphical analysis', x: 'x', y: 'y', series: [{ label: 'data', points: true, line: false }, { label: 'fit / ideal' }, { label: 'second' }], window: 4000 }],
    reset(S) { S.shots = []; S.cal = []; S.rng = M.rng(7); this.preset(S); },
    preset(S) {
      const ch = S.chart('c'), set = (id, lbl, min, max, step, val) => { const i = S.inputs[id]; i.el.min = min; i.el.max = max; i.el.step = step; const n = i.el.nextElementSibling; n.min = min; n.max = max; n.step = step; i.el.parentElement.querySelector('label span').textContent = lbl; S.setParam(id, val, true); };
      const m = S.p.mode;
      if (m === 'acc') { set('bias', 'Systematic error (bias)', 0, 3, 0.01, 1.1); set('sd', 'Random error (std dev)', 0.02, 2, 0.01, 0.25); set('nl', '(not used)', 0, 1, 1, 0); set('hy', '(not used)', 0, 1, 1, 0); }
      if (m === 'sens') { set('bias', 'Sensitivity K (V/mm)', 0.1, 1, 0.001, 0.496); set('sd', 'Random noise (V)', 0, 0.2, 0.001, 0.03); set('nl', 'Non-linearity (% FSO)', 0, 10, 0.1, 1.5); set('hy', 'Hysteresis (% FSO)', 0, 10, 0.1, 1); }
      if (m === 'res') { set('bias', 'Full scale (V)', 1, 10, 0.1, 5); set('sd', 'Input ramp rate (V/s)', 0.01, 2, 0.01, 0.2); set('nl', 'ADC bits N', 2, 12, 1, 4); set('hy', 'Analogue scale division (V)', 0.01, 1, 0.01, 0.1); }
      if (m === 'unc') { set('bias', 'Voltage V (V)', 1, 24, 0.1, 12); set('sd', 'u(V) (V)', 0, 1, 0.01, 0.1); set('nl', 'Current I (A)', 0.1, 10, 0.01, 2.5); set('hy', 'u(I) (A)', 0, 0.5, 0.005, 0.03); }
      const labs = { acc: [['Readings', ''], ['Mean x̄', ''], ['Bias x̄ − true', ''], ['Std dev s', ''], ['Type A u = s/√n', '']], sens: [['Least-squares sensitivity m', 'V/mm'], ['Offset c', 'V'], ['Max non-linearity', '% FSO'], ['Max hysteresis', '% FSO'], ['Points', '']], res: [['Input now', 'V'], ['ADC step Q = FSR/2ᴺ', 'V'], ['ADC reading', 'V'], ['Analogue reading', 'V'], ['Max quantisation error', 'V']], unc: [['P = VI', 'W'], ['u(V)/V', '%'], ['u(I)/I', '%'], ['RSS u_P', 'W'], ['Worst case', 'W']] }[m];
      Object.values(S.ro).forEach((r, i) => { r.el.previousSibling.innerHTML = labs[i][0] + (labs[i][1] ? ` (${labs[i][1]})` : ''); r.spec.label = labs[i][0]; r.spec.unit = labs[i][1]; });
      const ax = { acc: ['reading number', 'reading (°C)'], sens: ['input x (mm)', 'output y (V)'], res: ['time (s)', 'reading (V)'], unc: ['relative uncertainty of I (%)', 'u_P (W)'] }[m];
      ch.chart.options.scales.x.title.text = ax[0]; ch.chart.options.scales.y.title.text = ax[1];
      ['data', 'fit / ideal', 'second'].forEach((l, i) => ch.label(i, { acc: ['readings', 'true value 100 °C', 'mean'], sens: ['calibration points', 'least-squares line', 'ideal K·x'], res: [`N-bit ADC`, 'true input', 'analogue (nearest division)'], unc: ['RSS', 'worst case', 'current setting'] }[m][i]));
      ch.clear(); S.shots = []; S.cal = [];
      if (m === 'acc') this.fire(S);
    },
    onControl(S, id) { if (id === 'mode') this.preset(S); if (S.p.mode === 'sens' && id !== 'mode') this.calibrate(S); },
    onButton(S, b) { if (b === 'clear') { S.shots = []; S.cal = []; S.chart('c').clear(); } if (b === 'shoot') { if (S.p.mode === 'acc') this.fire(S); else if (S.p.mode === 'sens') this.calibrate(S); else S.t = 0; } },
    fire(S) { for (let i = 0; i < S.p.n; i++) S.shots.push(100 + S.p.bias + S.p.sd * M.gaussRand(S.rng)); },
    calibrate(S) {
      const K = S.p.bias, fs = 10, x = [], y = [];
      for (let k = 0; k <= 10; k++) { const xi = k; x.push(xi); const u = xi / fs; y.push(0.04 + K * xi + (S.p.nl / 100) * K * fs * 4 * u * (1 - u) + S.p.sd * M.gaussRand(S.rng)); }
      // down-scale (hysteresis): readings lag on decreasing input
      const yd = x.map((xi, k) => y[k] + (S.p.hy / 100) * K * fs * Math.sin(Math.PI * xi / fs));
      S.cal = { x, y, yd };
    },
    step(S, dt) { if (S.auto && S.p.mode === 'acc' && Math.floor(S.t * 2) !== Math.floor((S.t - dt) * 2)) { this.fire(S); if (S.shots.length > 200) S.shots = S.shots.slice(-200); } },
    draw(S) {
      D.clear(S); const m = S.p.mode, ch = S.chart('c'), W = S.W, H = S.H;
      if (m === 'acc') {
        const cx = W * 0.32, cy = H / 2, R = Math.min(W * 0.28, H * 0.42), sc = R / 4;
        for (let i = 4; i >= 1; i--) D.circle(S, cx, cy, i * sc, i % 2 ? '#eef1f4' : '#e1e6eb', '#8c959f', 1);
        D.circle(S, cx, cy, 4, C.green); D.text(S, 'true value', cx + 8, cy - 8, { size: 10, color: C.green });
        const r2 = M.rng(99); S.shots.forEach((v, i) => { const ang = 2 * Math.PI * r2(); const dy = (S.p.sd * M.gaussRand(r2)); D.circle(S, cx + (v - 100) * sc, cy + dy * sc, 3.5, i === S.shots.length - 1 ? C.amber : C.cyan); });
        const n = S.shots.length, mean = n ? M.inst.mean(S.shots) : NaN, s = n > 1 ? M.inst.std(S.shots) : NaN;
        if (n) D.circle(S, cx + (mean - 100) * sc, cy, 7, null, C.amber, 2.5);
        const verdict = (S.p.bias < 0.3 ? 'accurate' : 'not accurate') + ' and ' + (S.p.sd < 0.35 ? 'precise' : 'not precise');
        D.box(S, W * 0.64, 30, Math.min(260, W * 0.33), 'Verdict', [['Bias (systematic)', M.fmt(S.p.bias, 2) + ' °C'], ['Spread (random)', M.fmt(S.p.sd, 2) + ' °C'], ['Classification', verdict]]);
        D.text(S, 'Horizontal offset = reading − true value; vertical scatter only spreads the dots for visibility.', 14, H - 12, { size: 10, color: C.muted });
        S.set('r1', n); S.set('r2', mean); S.set('r3', mean - 100); S.set('r4', s); S.set('r5', s / Math.sqrt(n));
        ch.set(0, S.shots.map((v, i) => [i + 1, v])); ch.set(1, [[1, 100], [Math.max(2, n), 100]]); ch.set(2, n ? [[1, mean], [Math.max(2, n), mean]] : []);
      } else if (m === 'sens') {
        if (!S.cal.x) this.calibrate(S);
        const { x, y, yd } = S.cal, fit = M.inst.leastSquares(x, y); const fso = fit.m * 10;
        const nl = Math.max(...fit.res.map(Math.abs)) / fso * 100, hy = Math.max(...yd.map((v, i) => Math.abs(v - y[i]))) / fso * 100;
        const V = D.fit(S, [-0.5, 11], [-0.5, Math.max(6, S.p.bias * 11.5)], 40);
        D.axes2(S, V, [-0.5, 11], [-0.5, Math.max(6, S.p.bias * 11.5)], 1, { xl: 'x (mm)', yl: 'y (V)' });
        D.line(S, V.X(0), V.Y(fit.c), V.X(10), V.Y(fit.c + fit.m * 10), C.amber, 2);
        D.poly(S, x.map((xi, i) => [V.X(xi), V.Y(yd[i])]), null, 'rgba(130,80,223,.8)', 1.5, false);
        x.forEach((xi, i) => { D.circle(S, V.X(xi), V.Y(y[i]), 4, C.cyan); });
        D.text(S, `y = ${M.fmt(fit.m, 4)} x + ${M.fmt(fit.c, 3)}   (least squares, eq. 1.20)`, 50, 24, { size: 12, weight: 650 });
        D.text(S, 'violet: decreasing-input readings (hysteresis loop)', 50, 42, { size: 10.5, color: C.violet });
        S.set('r1', fit.m); S.set('r2', fit.c); S.set('r3', nl); S.set('r4', hy); S.set('r5', x.length);
        ch.set(0, x.map((xi, i) => [xi, y[i]])); ch.set(1, [[0, fit.c], [10, fit.c + fit.m * 10]]); ch.set(2, [[0, 0], [10, S.p.bias * 10]]);
      } else if (m === 'res') {
        const FS = S.p.bias, rate = S.p.sd, N = Math.round(S.p.nl), div = S.p.hy, Q = M.sig.adcStep(FS, N);
        const vin = (rate * S.t) % FS; const adc = M.clamp(Math.floor(vin / Q), 0, 2 ** N - 1) * Q; const ana = Math.round(vin / div) * div;
        const V = D.fit(S, [0, 1.15], [0, 1.05], 40);
        // bar instruments
        const bar = (x, val, lbl, col) => { D.rect(S, V.X(x), V.Y(1), 50, V.Y(0) - V.Y(1), '#eef1f4', '#8c959f', 1, 4); D.rect(S, V.X(x), V.Y(val / FS), 50, V.Y(0) - V.Y(val / FS), col); D.text(S, lbl, V.X(x) + 25, V.Y(0) + 16, { size: 10.5, align: 'center', color: C.muted }); D.text(S, M.fmt(val, 3) + ' V', V.X(x) + 25, V.Y(1) - 8, { size: 11, align: 'center', weight: 650 }); };
        bar(0.05, vin, 'true input', C.green); bar(0.3, adc, `${N}-bit ADC`, C.cyan); bar(0.55, ana, 'analogue meter', C.amber);
        for (let k = 0; k <= 2 ** N && 2 ** N <= 64; k++) D.line(S, V.X(0.3) + 50, V.Y(k * Q / FS), V.X(0.3) + 58, V.Y(k * Q / FS), C.cyan, 1);
        D.box(S, V.X(0.75), V.Y(0.95), 210, 'Resolution', [['ADC step Q = FSR/2ᴺ', M.fmt(Q, 4) + ' V'], ['Analogue division', M.fmt(div, 3) + ' V'], ['ADC levels 2ᴺ', String(2 ** N)], ['Max error (truncating)', M.fmt(Q, 4) + ' V']]);
        S.set('r1', vin); S.set('r2', Q); S.set('r3', adc); S.set('r4', ana); S.set('r5', Q);
        if (S.running) { ch.push(S.t, [adc, vin, ana]); }
      } else {
        const V0 = S.p.bias, uV = S.p.sd, I = S.p.nl, uI = S.p.hy; const P = V0 * I; const rv = uV / V0 * 100, ri = uI / I * 100; const rss = Math.hypot(rv, ri) / 100 * P, wc = (rv + ri) / 100 * P;
        const cx = S.W / 2, y = S.H * 0.45, sc = Math.min(18, (S.W - 80) / (2 * Math.max(wc, 0.5) * 1.3));
        D.line(S, 40, y, S.W - 40, y, C.muted, 1);
        D.rect(S, cx - wc * sc, y - 30, 2 * wc * sc, 60, 'rgba(209,36,47,.18)', C.red, 1); D.rect(S, cx - rss * sc, y - 20, 2 * rss * sc, 40, 'rgba(11,127,193,.25)', C.cyan, 1.5);
        D.line(S, cx, y - 44, cx, y + 44, C.amber, 2.5);
        D.text(S, `P = ${M.fmt(P, 2)} W`, cx, y - 52, { align: 'center', size: 14, weight: 700, color: C.amber });
        D.text(S, `RSS interval ±${M.fmt(rss, 3)} W (eq. 1.16)`, cx, y + 64, { align: 'center', color: C.cyan, size: 12 }); D.text(S, `worst-case ±${M.fmt(wc, 3)} W`, cx, y + 82, { align: 'center', color: C.red, size: 12 });
        D.text(S, `u_P/P = √[(u_V/V)² + (u_I/I)²] = √(${M.fmt(rv, 3)}² + ${M.fmt(ri, 3)}²) % = ${M.fmt(rss / P * 100, 3)} %`, 20, 26, { size: 12 });
        S.set('r1', P); S.set('r2', rv); S.set('r3', ri); S.set('r4', rss); S.set('r5', wc);
        const pts = [], pw = []; for (let k = 0; k <= 40; k++) { const r = k * 0.1; pts.push([r, Math.hypot(rv, r) / 100 * P]); pw.push([r, (rv + r) / 100 * P]); } ch.set(0, pts); ch.set(1, pw); ch.set(2, [[ri, rss]]);
      }
    }
  });

  /* ================= Loading effect (Topic I.10) ================= */
  RIL.defineSim({
    id: 'loading-effect', title: 'Loading effect of a measuring instrument', unit: 1, category: 'measurement-systems', kind: '2d',
    description: 'Connecting a voltmeter to a divider, or a recorder to a potentiometer, draws current and changes the quantity being measured. Error follows −R_Th/(R_Th + R_m) (1.19) and the loaded-potentiometer equation (1.30).',
    help: 'Electrical mode: change the source (Thevenin) resistance and the meter input resistance. Potentiometer mode: move the wiper and change the load resistance; the graph shows the loaded characteristic against the ideal straight line.',
    controls: [
      { id: 'mode', type: 'select', label: 'Situation', string: true, value: 'volt', options: [['volt', 'Voltmeter on a resistive divider (Ex. 1.10)'], ['pot', 'Potentiometer feeding a recorder (Ex. 1.15)']] },
      { id: 'Vs', label: 'Supply voltage V_s', min: 1, max: 24, step: 0.1, value: 12, unit: 'V' },
      { id: 'R', label: 'Divider resistors R (each) | pot R_p', min: 1, max: 500, step: 1, value: 100, unit: 'kΩ' },
      { id: 'Rm', label: 'Meter input R_m | load R_L', min: 10, max: 20000, step: 10, value: 1000, unit: 'kΩ' },
      { id: 'x', label: 'Wiper position x (pot mode)', min: 0, max: 1, step: 0.01, value: 0.6 },
      { id: 'conn', type: 'toggle', label: 'Instrument connected', value: true }
    ],
    readouts: [{ id: 'vt', label: 'True (unloaded) value', unit: 'V' }, { id: 'vm', label: 'Indicated value', unit: 'V' }, { id: 'e', label: 'Loading error', unit: '%' }, { id: 'im', label: 'Current drawn by instrument', unit: 'µA' }],
    charts: [{ id: 'c', title: 'Loading characteristic', x: 'R_m / R_Th  |  wiper position x', y: 'error (%) | output (V)', series: [{ label: 'loaded' }, { label: 'ideal' }, { label: 'operating point', points: true, line: false }] }],
    autostart: false,
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H; let vt, vm, Rth, im;
      if (p.mode === 'volt') { vt = p.Vs / 2; Rth = p.R / 2; vm = p.conn ? M.inst.loadingVoltage(vt, Rth, p.Rm) : vt; im = p.conn ? vm / (p.Rm * 1e3) * 1e6 : 0; }
      else { vt = p.Vs * p.x; vm = p.conn ? M.inst.loadedPot(p.x, p.Vs, p.R, p.Rm) : vt; Rth = p.R * p.x * (1 - p.x); im = p.conn ? vm / (p.Rm * 1e3) * 1e6 : 0; }
      // circuit drawing
      const x0 = 70, yT = 50, yB = H - 50, xr = Math.min(W * 0.42, 330);
      D.line(S, x0, yT, xr, yT, C.text, 2); D.line(S, x0, yB, xr, yB, C.text, 2); D.line(S, x0, yT, x0, yB, C.text, 2);
      D.circle(S, x0, (yT + yB) / 2, 18, '#2b3440', C.amber, 2); D.text(S, 'V_s', x0 - 46, (yT + yB) / 2 + 4, { size: 12 }); D.text(S, M.fmt(p.Vs, 1) + ' V', x0, (yT + yB) / 2 + 4, { size: 10, align: 'center' });
      const resistor = (x, y1, y2, lbl) => { const m1 = y1 + (y2 - y1) * 0.25, m2 = y1 + (y2 - y1) * 0.75; D.line(S, x, y1, x, m1, C.text, 2); D.line(S, x, m2, x, y2, C.text, 2); const pts = []; for (let k = 0; k <= 8; k++) pts.push([x + (k % 2 ? 8 : -8) * (k > 0 && k < 8), m1 + (m2 - m1) * k / 8]); D.poly(S, pts, null, C.cyan, 2, false); D.text(S, lbl, x + 14, (m1 + m2) / 2 + 4, { size: 11, color: C.muted }); };
      const mid = (yT + yB) / 2;
      if (p.mode === 'volt') { resistor(xr - 60, yT, mid, `R = ${p.R} kΩ`); resistor(xr - 60, mid, yB, `R = ${p.R} kΩ`); D.circle(S, xr - 60, mid, 4, C.amber); }
      else { resistor(xr - 60, yT, yB, `R_p = ${p.R} kΩ`); const wy = yB - (yB - yT) * (0.25 + 0.5 * p.x); D.arrow(S, xr - 20, wy, xr - 52, wy, C.amber, 2.5, 8); D.line(S, xr - 20, wy, xr - 20, mid, C.amber, 2); }
      if (p.conn) { const mx = xr + 70; D.line(S, p.mode === 'volt' ? xr - 60 : xr - 20, mid, mx, mid, C.amber, 2); D.line(S, mx, yB, xr, yB, C.text, 2); D.line(S, mx, mid, mx, yB, C.amber, 2); D.rect(S, mx - 16, mid + 30, 32, 50, '#f6f8fa', C.amber, 1.5, 4); D.text(S, 'R_m', mx, mid + 60, { size: 11, align: 'center' });
        for (let k = 0; k < 4; k++) { const f = ((S.t * 0.6 + k / 4) % 1); D.circle(S, mx, mid + f * (yB - mid), 2.5, C.cyan); } }
      D.meter(S, Math.min(W - 110, xr + 230), H * 0.42, 70, vm, 0, p.mode === 'volt' ? p.Vs / 2 * 1.1 : p.Vs, 'indicated voltage', 'V');
      D.text(S, `Thevenin resistance seen by the instrument: ${M.fmt(Rth, 2)} kΩ`, Math.min(W - 110, xr + 230), H * 0.42 + 70, { size: 11, align: 'center', color: C.muted });
      const err = (vm - vt) / (p.mode === 'volt' ? vt : p.Vs) * 100;
      S.set('vt', vt); S.set('vm', vm); S.set('e', err); S.set('im', im);
      const ch = S.chart('c');
      if (p.mode === 'volt') { const pts = []; for (let k = 0; k <= 60; k++) { const r = 10 ** (k / 20 - 0.5); pts.push([r, -100 / (1 + r)]); } ch.set(0, pts); ch.set(1, [[0.3, 0], [3000, 0]]); ch.set(2, [[p.Rm / Rth, err]]); ch.chart.options.scales.x.type = 'logarithmic'; }
      else { const a = [], b = []; for (let k = 0; k <= 50; k++) { const x = k / 50; a.push([x, M.inst.loadedPot(x, p.Vs, p.R, p.Rm)]); b.push([x, p.Vs * x]); } ch.set(0, a); ch.set(1, b); ch.set(2, [[p.x, vm]]); ch.chart.options.scales.x.type = 'linear'; }
    },
    onControl(S, id) { if (id === 'mode') S.chart('c').clear(); }
  });

  /* ================= Dynamic characteristics (Topic I.10, Section 1.9) ================= */
  RIL.defineSim({
    id: 'dynamic-response', title: 'Dynamic characteristics: zero-, first- and second-order instruments', unit: 1, category: 'measurement-systems', kind: '2d', autoDefault: false,
    description: 'Response of zero-, first- and second-order instruments to step, ramp and sinusoidal inputs, solved numerically from a₂ÿ + a₁ẏ + a₀y = b₀u, with overshoot, settling time, dynamic error, amplitude ratio and phase from (1.23)–(1.28).',
    help: 'Select the instrument order and input. The animated thermometer column (first order) or spring-mass pointer (second order) follows the computed output. Compare the readouts with Example 1.12 (τ = 8 s, 25 → 100 °C) and Example 1.14 (fₙ = 500 Hz, ζ = 0.4 — use the time scale).',
    controls: [
      { id: 'ord', type: 'select', label: 'Instrument order', value: 1, options: [[0, 'Zero order (potentiometer)'], [1, 'First order (thermometer)'], [2, 'Second order (spring–mass sensor)']] },
      { id: 'inp', type: 'select', label: 'Input', string: true, value: 'step', options: [['step', 'Step'], ['ramp', 'Ramp'], ['sine', 'Sinusoid']] },
      { id: 'tau', label: 'Time constant τ (1st order)', min: 0.1, max: 20, step: 0.1, value: 8, unit: 's' },
      { id: 'fn', label: 'Natural frequency fₙ (2nd order)', min: 0.05, max: 2, step: 0.01, value: 0.3, unit: 'Hz' },
      { id: 'zeta', label: 'Damping ratio ζ', min: 0.05, max: 2, step: 0.01, value: 0.4 },
      { id: 'f', label: 'Input frequency (sine) | ramp rate', min: 0.005, max: 1, step: 0.005, value: 0.05, unit: 'Hz | °C/s×10' },
      { id: 'u0', label: 'Initial value', min: 0, max: 50, value: 25 },
      { id: 'u1', label: 'Final / peak value', min: 50, max: 200, value: 100 }
    ],
    readouts: [{ id: 'y', label: 'Indicated output y' }, { id: 'u', label: 'True input u' }, { id: 'ed', label: 'Dynamic error u − y' }, { id: 'k1', label: '—' }, { id: 'k2', label: '—' }, { id: 'k3', label: '—' }],
    charts: [{ id: 'c', title: 'Input and indicated output', x: 'time (s)', y: 'value', series: [{ label: 'input u(t)' }, { label: 'output y(t)' }], window: 1500 }],
    equations: ['\\tau\\dot y+y=Ku\\;\\Rightarrow\\;y=Ku_0(1-e^{-t/\\tau})\\;(1.23)', '\\frac{1}{\\omega_n^2}\\ddot y+\\frac{2\\zeta}{\\omega_n}\\dot y+y=Ku\\;(1.25)', 'M_p=e^{-\\zeta\\pi/\\sqrt{1-\\zeta^2}},\\;t_s=4/(\\zeta\\omega_n)\\;(1.27)'],
    substeps: 8,
    reset(S) { S.x = [S.p.u0, 0]; },
    onControl(S) { S.reset(); S.t = 0; S.chart('c').clear(); },
    u(S, t) { const p = S.p; if (p.inp === 'step') return t > 0.5 ? p.u1 : p.u0; if (p.inp === 'ramp') return p.u0 + Math.max(0, t - 0.5) * p.f * 10; return (p.u0 + p.u1) / 2 + (p.u1 - p.u0) / 2 * Math.sin(2 * Math.PI * p.f * t); },
    step(S, dt) {
      const p = S.p, u = this.u(S, S.t + dt);
      if (+p.ord === 0) S.x = [u, 0];
      else if (+p.ord === 1) S.x = M.rk4((t, x) => [(this.u(S, S.t + t) - x[0]) / p.tau, 0], S.x, 0, dt);
      else { const wn = 2 * Math.PI * p.fn; S.x = M.rk4((t, x) => [x[1], wn * wn * (this.u(S, S.t + t) - x[0]) - 2 * p.zeta * wn * x[1]], S.x, 0, dt); }
      S.chart('c').push(S.t, [u, S.x[0]]);
    },
    draw(S) {
      D.clear(S); const p = S.p, y = S.x[0], u = this.u(S, S.t), W = S.W, H = S.H; const lo = Math.min(p.u0, 0), hi = p.u1 * 1.35 + 5;
      const bx = W * 0.18, top = 40, bot = H - 50, Y = v => bot - (bot - top) * (v - lo) / (hi - lo);
      if (+p.ord === 2) { // spring-mass with pointer
        D.rect(S, bx - 40, top - 10, 80, 10, '#6e7781'); const my = Y(y); D.spring(S, bx, top, bx, my - 18, 9, 10); D.rect(S, bx - 22, my - 18, 44, 36, '#6e7781', '#8c959f', 1.5, 4); D.arrow(S, bx + 22, my, bx + 60, my, C.amber, 2.5);
      } else { D.rect(S, bx - 10, top, 20, bot - top, '#2b3440', '#57606a', 1.5, 10); D.circle(S, bx, bot + 10, 16, C.red); D.rect(S, bx - 6, Y(y), 12, bot - Y(y) + 6, C.red); }
      for (let v = Math.ceil(lo / 25) * 25; v <= hi; v += 25) { D.line(S, bx + 14, Y(v), bx + 24, Y(v), C.muted, 1); D.text(S, String(v), bx + 28, Y(v) + 4, { size: 10, color: C.muted }); }
      D.line(S, bx - 30, Y(u), bx + 70, Y(u), C.green, 1.5, [5, 4]); D.text(S, 'true input', bx + 72, Y(u) + 4, { size: 10, color: C.green });
      const ord = +p.ord; const wn = 2 * Math.PI * p.fn; let k = [['', ''], ['', ''], ['', '']];
      if (ord === 0) k = [['Response', 'instantaneous'], ['Dynamic error', '0'], ['—', '—']];
      if (ord === 1) { const fr = M.inst.firstOrderFreq(2 * Math.PI * p.f, p.tau); k = [['Time to 63.2 % (τ)', M.fmt(p.tau, 2) + ' s'], ['Time to 99 % of step', M.fmt(p.tau * Math.log(100), 2) + ' s'], ['Sine: amplitude ratio, phase', M.fmt(fr.M, 3) + ', ' + M.fmt(fr.phi * M.R2D, 1) + '°']]; }
      if (ord === 2) { const ix = M.inst.secondOrderIdx(p.zeta, wn); const fr = M.inst.secondOrderFreq(p.f / p.fn, p.zeta); k = [['Overshoot M_p', p.zeta < 1 ? M.fmt(ix.Mp * 100, 1) + ' %' : 'none']]; k.push(['Peak time t_p, settling t_s', (p.zeta < 1 ? M.fmt(ix.tp, 2) : '—') + ', ' + M.fmt(ix.ts, 2) + ' s']); k.push(['Sine: amplitude ratio, phase', M.fmt(fr.M, 3) + ', ' + M.fmt(fr.phi * M.R2D, 1) + '°']); }
      const bxw = Math.min(330, W * 0.5); D.box(S, W - bxw - 20, 20, bxw, ['Zero-order', 'First-order', 'Second-order'][ord] + ' instrument', [['Input', p.inp], ['Output y', M.fmt(y, 2)], ['Dynamic error', M.fmt(u - y, 2)]].concat(k));
      S.set('y', y); S.set('u', u); S.set('ed', u - y);
      ['k1', 'k2', 'k3'].forEach((id, i) => { S.ro[id].el.previousSibling.textContent = k[i][0]; S.set(id, k[i][1]); });
    }
  });
})();
