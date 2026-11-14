/* =====================================================================
   robot-math.js — shared digital-twin mathematics (RIL.RM)
   One robot description (the "twin") is used by the Assembly Studio,
   the Experimental Workcell, the Mathematical Workspace and the reports.
   Pure functions: loadable in Node for tests (tests/lab.test.js).
   SI units throughout: m, rad, kg, s, N, N·m, A, V.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../equation-engine.js'));
  else { root.RIL = root.RIL || {}; root.RIL.RM = factory(root.RIL.M); }
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';
  const { mat, v3, D2R } = M;
  const g0 = 9.81;

  /* ---------- catalogues (illustrative teaching values, not data-sheet values) ---------- */
  const MATERIALS = {
    aluminium: { name: 'Aluminium 6061', rho: 2700, color: 0xc8d0da, metal: 0.9, rough: 0.32 },
    steel: { name: 'Stainless steel', rho: 7850, color: 0xa9b1ba, metal: 0.95, rough: 0.22 },
    plastic: { name: 'Engineering plastic (ABS)', rho: 1050, color: 0xf1f3f5, metal: 0.0, rough: 0.55 },
    carbon: { name: 'Carbon-fibre composite', rho: 1600, color: 0x30343b, metal: 0.3, rough: 0.4 }
  };
  const MOTORS = {
    servo: { name: 'AC/DC servo motor', V: 48, I: 6, T: 1.3, stall: 3.9, w0: 3000, R: 0.8, L: 1.1e-3, Kt: 0.21, Kb: 0.21, J: 4.2e-5, gear: 100, eta: 0.8, mass: 1.1 },
    dc: { name: 'Brushed DC motor', V: 24, I: 4, T: 0.35, stall: 1.6, w0: 3600, R: 1.2, L: 2.3e-3, Kt: 0.06, Kb: 0.06, J: 1.8e-5, gear: 120, eta: 0.72, mass: 0.6 },
    stepper: { name: 'Hybrid stepper motor (1.8°)', V: 24, I: 2.8, T: 1.2, stall: 1.9, w0: 600, R: 0.9, L: 2.5e-3, Kt: 0.45, Kb: 0.45, J: 4.8e-5, gear: 20, eta: 0.85, mass: 0.7 },
    bldc: { name: 'BLDC motor', V: 48, I: 8, T: 0.9, stall: 4.5, w0: 4500, R: 0.35, L: 0.5e-3, Kt: 0.1, Kb: 0.1, J: 2.6e-5, gear: 100, eta: 0.85, mass: 0.8 },
    linear: { name: 'Electric linear actuator', V: 24, I: 3, T: 0.5, stall: 1.5, w0: 3000, R: 1.5, L: 2e-3, Kt: 0.07, Kb: 0.07, J: 2e-5, gear: 60, eta: 0.6, mass: 0.9 }
  };
  const SENSORS = {
    encoder: { name: 'Incremental optical encoder', measures: 'joint angle', res: '2500 PPR (×4 = 10 000 counts/rev)' },
    potentiometer: { name: 'Rotary potentiometer', measures: 'joint angle', res: 'analogue, limited by ADC' },
    imu: { name: 'IMU (3-axis accel + gyro)', measures: 'link acceleration / rate', res: '16-bit' },
    force: { name: 'Force sensor (load cell)', measures: 'axial force', res: '0.1 N' },
    torque: { name: 'Joint torque sensor', measures: 'joint torque', res: '0.01 N·m' },
    proximity: { name: 'Proximity sensor', measures: 'object presence', res: 'binary, 5–30 mm' }
  };
  const TOOLS = {
    gripper2: { name: 'Two-finger parallel gripper', mass: 0.45, maxForce: 80, mu: 0.6, len: 0.12 },
    gripper3: { name: 'Three-finger centring gripper', mass: 0.6, maxForce: 110, mu: 0.6, len: 0.12 },
    vacuum: { name: 'Vacuum gripper (suction cup)', mass: 0.25, maxForce: 60, mu: 0.5, len: 0.08 },
    suction: { name: 'Multi-cup suction tool', mass: 0.35, maxForce: 90, mu: 0.5, len: 0.08 }
  };
  const ELECTRONICS = {
    arduino: { name: 'Arduino Uno (ATmega328P)', role: 'controller', pwm: 6, adc: '6 × 10-bit' },
    esp32: { name: 'ESP32', role: 'controller', pwm: 16, adc: '18 × 12-bit' },
    stm32: { name: 'STM32 (Cortex-M4)', role: 'controller', pwm: 16, adc: '16 × 12-bit' },
    driver: { name: 'Motor driver (2-channel)', role: 'driver', channels: 2 },
    hbridge: { name: 'H-bridge module', role: 'driver', channels: 1 },
    pwmdrv: { name: '16-channel PWM driver', role: 'pwm', channels: 16 },
    adc: { name: 'External ADC (16-bit)', role: 'adc' },
    dac: { name: 'External DAC (12-bit)', role: 'dac' },
    psu: { name: 'DC power supply 48 V', role: 'power' }
  };

  /* ---------- twin model ---------- */
  function newJoint(type = 'R', o = {}) {
    return Object.assign({
      type, alpha: 0, a: 0, d: 0, offset: 0, hasLink: false,
      min: type === 'P' ? 0 : -170 * D2R, max: type === 'P' ? 0.35 : 170 * D2R,
      material: 'aluminium', w: 0.06, mass: null, friction: 0.05, damping: 0.4, stiffness: 0,
      tauMax: type === 'P' ? 400 : 150, velMax: type === 'P' ? 0.5 : 3.0, motor: null, gear: null, sensor: null
    }, o);
  }
  function emptyRobot() { return { name: 'My robot', base: false, joints: [], tool: null, electronics: [], loose: [], payload: 0 }; }
  function template(kind) {
    const R = emptyRobot(); R.base = true; const P = Math.PI;
    const J = (o) => R.joints.push(newJoint(o.type || 'R', Object.assign({ hasLink: true, motor: 'servo', sensor: 'encoder' }, o)));
    if (kind === 'planar2R') { R.name = 'Planar 2R arm'; J({ a: 0.5, min: -P, max: P }); J({ a: 0.3, min: -P, max: P, w: 0.05 }); }
    else if (kind === 'planar3R') { R.name = 'Planar 3R arm'; J({ a: 0.4, min: -P, max: P }); J({ a: 0.3, min: -P, max: P, w: 0.05 }); J({ a: 0.2, min: -P, max: P, w: 0.04 }); }
    else if (kind === 'scara') { R.name = 'SCARA (RRPR)'; J({ a: 0.4, d: 0.6 }); J({ a: 0.3, alpha: P, w: 0.05 }); J({ type: 'P', d: 0.1, min: 0, max: 0.35, w: 0.03, motor: 'linear' }); J({ d: 0.08, w: 0.03, min: -P, max: P }); }
    else if (kind === 'articulated') { R.name = 'Articulated RRR'; J({ alpha: P / 2, d: 0.4, w: 0.09 }); J({ a: 0.5, min: -90 * D2R, max: 150 * D2R }); J({ a: 0.4, min: -150 * D2R, max: 150 * D2R, w: 0.05 }); }
    else if (kind === 'sevenR') {
      R.name = '7-DOF redundant arm';
      J({ alpha: -P / 2, d: 0.34, w: 0.09 }); J({ alpha: P / 2, min: -120 * D2R, max: 120 * D2R, w: 0.08 }); J({ alpha: P / 2, d: 0.4, w: 0.07 }); J({ alpha: -P / 2, min: -120 * D2R, max: 120 * D2R, w: 0.07 });
      J({ alpha: -P / 2, d: 0.4, w: 0.06 }); J({ alpha: P / 2, min: -120 * D2R, max: 120 * D2R, w: 0.05 }); J({ d: 0.12, w: 0.04, min: -P, max: P });
    } else {
      R.name = '6-DOF elbow manipulator';
      J({ alpha: P / 2, d: 0.4, w: 0.1 });
      J({ a: 0.45, min: -90 * D2R, max: 150 * D2R, w: 0.08 });
      J({ alpha: P / 2, offset: P / 2, min: -120 * D2R, max: 150 * D2R, w: 0.07 });
      J({ alpha: -P / 2, d: 0.4, min: -P, max: P, w: 0.06 });
      J({ alpha: P / 2, min: -120 * D2R, max: 120 * D2R, w: 0.05 });
      J({ d: 0.12, min: -270 * D2R, max: 270 * D2R, w: 0.04 });
    }
    R.tool = 'gripper2'; R.electronics = ['stm32', 'psu'].concat(Array(Math.ceil(R.joints.length / 2)).fill('driver'));
    return R;
  }
  /** DH table used by the equation engine (classic DH: Rot z θ, Trans z d, Trans x a, Rot x α) */
  function tableOf(robot) {
    return robot.joints.map(j => j.type === 'P'
      ? { type: 'P', a: j.a, alpha: j.alpha, theta: j.offset || 0, d: 0, offset: j.d, min: j.min, max: j.max }
      : { type: 'R', a: j.a, alpha: j.alpha, d: j.d, offset: j.offset || 0, min: j.min, max: j.max });
  }
  const linkLen = j => Math.abs(j.a) + Math.abs(j.d);
  /** link mass: hollow square tube, wall = 15 % of the side (overridable through j.mass) */
  function linkMass(j) {
    if (j.mass !== null && j.mass !== undefined && j.mass !== '') return +j.mass;
    if (!j.hasLink) return 0;
    const m = MATERIALS[j.material] || MATERIALS.aluminium; const w = j.w || 0.06, wi = w * 0.7;
    return m.rho * (w * w - wi * wi) * Math.max(linkLen(j), 0.04);
  }
  const linkInertia = j => linkMass(j) * linkLen(j) ** 2 / 12; // slender rod about its centre, kg·m²
  function motorOf(j) { if (!j.motor) return null; const m = Object.assign({}, MOTORS[j.motor]); if (j.gear) m.gear = +j.gear; return m; }
  function totalMass(robot) {
    let m = robot.base ? 4.0 : 0;
    robot.joints.forEach(j => { m += linkMass(j) + (j.motor ? MOTORS[j.motor].mass : 0) + (j.acc || []).length * 0.08; });
    if (robot.tool) m += TOOLS[robot.tool].mass; return m;
  }
  function classify(robot) {
    const s = robot.joints.map(j => j.type).join('');
    const planar = robot.joints.length > 0 && robot.joints.every(j => Math.abs(Math.sin(j.alpha)) < 1e-9);
    let name = s ? s + ' serial chain' : 'no joints yet';
    if (/^PPP/.test(s)) name = 'Cartesian (PPP)'; else if (/^RPP/.test(s)) name = 'Cylindrical (RPP)'; else if (/^RRP$/.test(s) && !planar) name = 'Spherical (RRP)';
    else if (/^RRP/.test(s) && planar) name = 'SCARA (RRP…)'; else if (s === 'RRRRRR') name = 'Articulated 6R'; else if (s.length === 7) name = '7-DOF redundant (' + s + ')';
    else if (planar && /^R+$/.test(s)) name = 'Planar ' + s.length + 'R';
    return { string: s, planar, name };
  }
  /** mobility: serial chain n single-DOF joints -> n; planar Gruebler shown only for planar chains */
  function mobility(robot) {
    const n = robot.joints.length, c = classify(robot);
    const L = n + 1, J1 = n;
    return { n, links: L, joints: J1, planar: c.planar, gruebler: c.planar ? 3 * (L - 1) - 2 * J1 : null, kutzbachSpatial: 6 * (L - 1) - 5 * J1, taskDof: c.planar ? Math.min(n, 3) : Math.min(n, 6), redundant: n > (c.planar ? 3 : 6) };
  }
  function validate(robot) {
    const out = []; const add = (ok, level, msg) => out.push({ ok, level, msg });
    add(robot.base, 'error', 'Robot base placed on the worktable');
    add(robot.joints.length > 0, 'error', 'At least one joint connected to the base');
    robot.joints.forEach((j, i) => {
      add(j.hasLink, 'warn', `Joint ${i + 1} drives an output link`);
      add(!!j.motor, 'warn', `Joint ${i + 1} has an actuator mounted`);
      add(!!j.sensor, 'info', `Joint ${i + 1} has a position sensor`);
      add(j.max > j.min, 'error', `Joint ${i + 1} limits are ordered (min < max)`);
    });
    const el = robot.electronics || []; const role = r => el.filter(e => ELECTRONICS[e] && ELECTRONICS[e].role === r);
    const nm = robot.joints.filter(j => j.motor).length; const ch = role('driver').reduce((s, e) => s + ELECTRONICS[e].channels, 0) + role('pwm').reduce((s, e) => s + ELECTRONICS[e].channels, 0);
    add(role('controller').length > 0, 'warn', 'Controller board connected');
    add(role('power').length > 0, 'warn', 'Power supply connected');
    add(nm === 0 || ch >= nm, 'warn', `Driver channels (${ch}) cover the ${nm} motor${nm === 1 ? '' : 's'}`);
    add(!!robot.tool, 'info', 'End-effector attached to the last link');
    add(!(robot.loose && robot.loose.length), 'warn', `No disconnected components${robot.loose && robot.loose.length ? ' (' + robot.loose.length + ' loose)' : ''}`);
    return out;
  }

  /* ---------- kinematics helpers ---------- */
  const homeQ = robot => robot.joints.map(j => M.clamp(0, j.type === 'P' ? j.min : Math.min(0, j.max), j.max) * 0 + (j.type === 'P' ? j.min : M.clamp(0, j.min, j.max)));
  function fk(robot, q) { return M.fkDH(tableOf(robot), q); }
  function tcp(robot, q) { const { T } = fk(robot, q); return M.pof(T[T.length - 1]); }
  /** point masses carried by the chain: link i at the mid-point of its two segments, motor i at frame i-1, tool+payload at TCP */
  function bodies(robot, T) {
    const B = []; const n = robot.joints.length;
    for (let i = 0; i < n; i++) {
      const j = robot.joints[i]; const o = M.pof(T[i]), on = M.pof(T[i + 1]);
      const m = linkMass(j); if (m > 0) B.push({ m, p: v3.scale(v3.add(o, on), 0.5), upto: i + 1, what: 'link ' + (i + 1) });
      if (j.motor && i > 0) B.push({ m: MOTORS[j.motor].mass, p: o, upto: i, what: 'motor ' + (i + 1) });
    }
    const mt = (robot.tool ? TOOLS[robot.tool].mass : 0) + (+robot.payload || 0);
    if (mt > 0 && n) B.push({ m: mt, p: M.pof(T[n]), upto: n, what: 'tool + payload' });
    return B;
  }
  function pointJac(robot, T, p, upto) {
    const n = robot.joints.length; const J = mat.zeros(3, n);
    for (let k = 0; k < upto; k++) {
      const z = [T[k][0][2], T[k][1][2], T[k][2][2]];
      const c = robot.joints[k].type === 'P' ? z : v3.cross(z, v3.sub(p, M.pof(T[k])));
      J[0][k] = c[0]; J[1][k] = c[1]; J[2][k] = c[2];
    }
    return J;
  }
  /** M(q): point-mass links (translational kinetic energy) + reflected rotor inertia N²·Jm */
  function massMatrix(robot, q) {
    const n = robot.joints.length; const { T } = fk(robot, q); const Mq = mat.zeros(n, n);
    bodies(robot, T).forEach(b => {
      const J = pointJac(robot, T, b.p, b.upto);
      for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) Mq[i][k] += b.m * (J[0][i] * J[0][k] + J[1][i] * J[1][k] + J[2][i] * J[2][k]);
    });
    robot.joints.forEach((j, i) => { const m = motorOf(j); Mq[i][i] += (m ? m.J * m.gear * m.gear : 0) + (j.type === 'R' ? linkInertia(j) : 0) + 1e-6; });
    return Mq;
  }
  /** G(q) = dU/dq with U = Σ m g z */
  function gravityVec(robot, q) {
    const n = robot.joints.length; const { T } = fk(robot, q); const G = Array(n).fill(0);
    bodies(robot, T).forEach(b => { const J = pointJac(robot, T, b.p, b.upto); for (let i = 0; i < n; i++) G[i] += b.m * g0 * J[2][i]; });
    return G;
  }
  /** C(q,q̇)q̇ = Ṁq̇ − ½ ∂(q̇ᵀMq̇)/∂q, by central differences of M(q) */
  function coriolisVec(robot, q, qd) {
    const n = q.length, h = 1e-5; const c = Array(n).fill(0); if (!qd.some(v => Math.abs(v) > 1e-9)) return c;
    for (let k = 0; k < n; k++) {
      const qp = q.slice(), qm = q.slice(); qp[k] += h; qm[k] -= h;
      const Mp = massMatrix(robot, qp), Mm = massMatrix(robot, qm);
      let quad = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const dM = (Mp[i][j] - Mm[i][j]) / (2 * h); c[i] += dM * qd[k] * qd[j]; quad += qd[i] * dM * qd[j]; }
      c[k] -= 0.5 * quad;
    }
    return c;
  }
  function frictionVec(robot, qd) { return robot.joints.map((j, i) => (+j.damping || 0) * qd[i] + (+j.friction || 0) * Math.tanh(qd[i] / 0.02)); }
  /** inverse dynamics: τ = M q̈ + C q̇ + G + τ_f, each term returned */
  function invDyn(robot, q, qd, qdd) {
    const Mq = massMatrix(robot, q); const inertial = mat.mulVec(Mq, qdd); const C = coriolisVec(robot, q, qd), G = gravityVec(robot, q), F = frictionVec(robot, qd);
    return { tau: inertial.map((v, i) => v + C[i] + G[i] + F[i]), inertial, C, G, F, M: Mq };
  }
  /** forward dynamics: q̈ = M⁻¹(τ − C q̇ − G − τ_f) */
  function fwdDyn(robot, q, qd, tau) {
    const Mq = massMatrix(robot, q), C = coriolisVec(robot, q, qd), G = gravityVec(robot, q), F = frictionVec(robot, qd);
    return { qdd: mat.solve ? solve(Mq, tau.map((t, i) => t - C[i] - G[i] - F[i])) : [], M: Mq, C, G, F };
  }
  function solve(A, b) { return mat.mulVec(mat.inv(A), b); }
  /** motor electrical quantities for a joint torque/speed (steady-state: L di/dt neglected) */
  function motorState(j, tau, qd) {
    const m = motorOf(j); if (!m) return { i: 0, v: 0, p: 0 };
    const tm = tau / (m.gear * m.eta); const i = tm / m.Kt; const wm = qd * m.gear; const v = i * m.R + m.Kb * wm;
    return { i, v, p: v * i, wm, tm };
  }

  /** tool-tip pose: flange frame {n} advanced along its z by the tool length L */
  function tip(robot, q, L) { const { T, A } = fk(robot, q); const Tn = T[T.length - 1]; const z = [Tn[0][2], Tn[1][2], Tn[2][2]]; return { p: v3.add(M.pof(Tn), v3.scale(z, L || 0)), R: M.Rof(Tn), T, A, Tn }; }
  /** 6×n geometric Jacobian of the tool tip (rows 1–3 linear, 4–6 angular) */
  function jacTip(robot, q, L) { const t = tip(robot, q, L); const Jv = pointJac(robot, t.T, t.p, robot.joints.length); return Jv.concat(M.jacobianGeo(tableOf(robot), q).slice(3)); }

  /* ---------- linear algebra extras ---------- */
  /** eigen-decomposition of a symmetric matrix (cyclic Jacobi). returns values (descending) and column vectors */
  function symEig(A) {
    const n = A.length; const a = A.map(r => r.slice()); const V = mat.eye(n);
    for (let sweep = 0; sweep < 60; sweep++) {
      let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
      if (off < 1e-22) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const th = (a[q][q] - a[p][p]) / (2 * a[p][q]); const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)); const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
        for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
      }
    }
    const idx = a.map((r, i) => i).sort((i, j) => a[j][j] - a[i][i]);
    return { values: idx.map(i => a[i][i]), vectors: idx.map(i => V.map(r => r[i])) };
  }
  /** singular values of any matrix (via the smaller Gram matrix) */
  function singularValues(A) {
    const AT = mat.T(A); const G = A.length <= A[0].length ? mat.mul(A, AT) : mat.mul(AT, A);
    return symEig(G).values.map(v => Math.sqrt(Math.max(0, v)));
  }
  /** eigenvalues of a general real square matrix by shifted QR on the Hessenberg form; returns [{re, im}] */
  function eigGeneral(A) {
    const n = A.length; let H = A.map(r => r.slice()); const out = [];
    const qr = Mx => { // Gram–Schmidt QR
      const m = Mx.length; const Q = mat.zeros(m, m), Rr = mat.zeros(m, m);
      for (let j = 0; j < m; j++) {
        let v = Mx.map(r => r[j]);
        for (let i = 0; i < j; i++) { let d = 0; for (let k = 0; k < m; k++) d += Q[k][i] * Mx[k][j]; Rr[i][j] = d; for (let k = 0; k < m; k++) v[k] -= d * Q[k][i]; }
        const nv = Math.hypot(...v) || 1e-300; Rr[j][j] = nv; for (let k = 0; k < m; k++) Q[k][j] = v[k] / nv;
      }
      return { Q, R: Rr };
    };
    let m = n, guard = 0;
    while (m > 0 && guard++ < 4000) {
      if (m === 1) { out.push({ re: H[0][0], im: 0 }); m = 0; break; }
      const sub = Math.abs(H[m - 1][m - 2]);
      if (sub < 1e-11 * (Math.abs(H[m - 1][m - 1]) + Math.abs(H[m - 2][m - 2]) + 1e-300)) { out.push({ re: H[m - 1][m - 1], im: 0 }); m--; H = H.slice(0, m).map(r => r.slice(0, m)); continue; }
      const a = H[m - 2][m - 2], b = H[m - 2][m - 1], c = H[m - 1][m - 2], d = H[m - 1][m - 1];
      const tr = a + d, det = a * d - b * c, disc = tr * tr / 4 - det;
      const lowOk = m === 2 || Math.abs(H[m - 2][m - 3]) < 1e-11 * (Math.abs(a) + Math.abs(H[m - 3][m - 3]) + 1e-300);
      if (lowOk && (disc < 0 || m === 2)) {
        if (disc < 0) { out.push({ re: tr / 2, im: Math.sqrt(-disc) }, { re: tr / 2, im: -Math.sqrt(-disc) }); }
        else { out.push({ re: tr / 2 + Math.sqrt(disc), im: 0 }, { re: tr / 2 - Math.sqrt(disc), im: 0 }); }
        m -= 2; H = H.slice(0, m).map(r => r.slice(0, m)); continue;
      }
      const mu = disc >= 0 ? (Math.abs(tr / 2 + Math.sqrt(disc) - d) < Math.abs(tr / 2 - Math.sqrt(disc) - d) ? tr / 2 + Math.sqrt(disc) : tr / 2 - Math.sqrt(disc)) : d;
      const sh = guard % 11 === 10 ? mu + 0.37 * sub : mu;
      for (let i = 0; i < m; i++) H[i][i] -= sh;
      const { Q, R: Rr } = qr(H); H = mat.mul(Rr, Q);
      for (let i = 0; i < m; i++) H[i][i] += sh;
    }
    return out.sort((x, y) => y.re - x.re || y.im - x.im);
  }
  function manipulability(J) { // Yoshikawa w = sqrt(det(J Jᵀ)) = product of singular values
    const s = singularValues(J); const r = Math.min(J.length, J[0].length);
    const w = s.slice(0, r).reduce((p, v) => p * v, 1); const smin = s[r - 1], smax = s[0];
    return { w, sv: s.slice(0, r), cond: smin > 1e-12 ? smax / smin : Infinity, smin, smax };
  }

  /* ---------- inverse kinematics: several iterative methods with a convergence history ---------- */
  function ikSolve(robot, q0, target, opts = {}) {
    const table = tableOf(robot); const method = opts.method || 'dls'; const lambda = opts.lambda ?? 0.05, maxIt = opts.maxIter ?? 300, tol = opts.tol ?? 1e-4, alpha = opts.alpha ?? 0.5;
    const useR = !!target.R; let q = q0.slice(); const hist = []; let status = 'max-iterations', ep = [0, 0, 0], eo = [0, 0, 0], limited = false, it = 0;
    for (; it < maxIt; it++) {
      const tp = tip(robot, q, opts.tool || 0);
      ep = v3.sub(target.p, tp.p); eo = useR ? M.orientError(tp.R, target.R) : [0, 0, 0];
      const e = useR ? ep.concat(eo) : ep.slice(); const err = Math.hypot(...e); hist.push(err);
      if (err < tol) { status = 'converged'; break; }
      let J = jacTip(robot, q, opts.tool || 0); if (!useR) J = J.slice(0, 3);
      let dq;
      try {
        if (method === 'transpose') { const JT = mat.T(J); const g = mat.mulVec(JT, e); const Jg = mat.mulVec(J, g); const den = Jg.reduce((s, v) => s + v * v, 0) || 1e-12; const a = e.reduce((s, v, i) => s + v * Jg[i], 0) / den; dq = g.map(v => a * v); }
        else if (method === 'inverse') { if (J.length !== J[0].length) { status = 'not-square'; break; } if (Math.abs(mat.det(J)) < 1e-9) { status = 'singular'; break; } dq = mat.mulVec(mat.inv(J), e); }
        else if (method === 'pinv') { const s = singularValues(J); if (s[Math.min(J.length, J[0].length) - 1] < 1e-7) { status = 'singular'; break; } dq = mat.mulVec(mat.dls(J, 0), e); }
        else dq = mat.mulVec(mat.dls(J, lambda), e);
      } catch (x) { status = 'singular'; break; }
      if (dq.some(v => !Number.isFinite(v))) { status = 'singular'; break; }
      const big = Math.max(...dq.map(Math.abs)); const sc = big > 0.5 ? 0.5 / big : 1; // trust region: 0.5 rad per step
      limited = false;
      q = q.map((qi, i) => { let v = qi + alpha * sc * dq[i]; const L = table[i]; if (L.min !== undefined && (v < L.min || v > L.max)) { v = M.clamp(v, L.min, L.max); limited = true; } return v; });
    }
    const reach = robot.joints.reduce((s, j) => s + Math.abs(j.a) + Math.abs(j.d) + (j.type === 'P' ? j.max : 0), 0) + (opts.tool || 0);
    const dist = Math.hypot(...target.p);
    let reason = '';
    if (status !== 'converged') {
      if (status === 'not-square') reason = 'The Jacobian is not square, so J⁻¹ does not exist. Use the pseudoinverse or damped least squares.';
      else if (status === 'singular') reason = 'The Jacobian lost rank (singular configuration): the inverse blows up. Damped least squares stays bounded here.';
      else if (dist > reach + 1e-9) reason = `Target is ${dist.toFixed(3)} m from the base but the arm can reach at most ${reach.toFixed(3)} m (sum of link lengths), so no joint solution exists.`;
      else if (limited) reason = 'The solver stopped against a joint limit: the pose would need a joint angle outside its allowed range.';
      else reason = 'No convergence within the iteration limit: the target may be outside the reachable workspace, or need a different starting configuration.';
    }
    return { q, status, converged: status === 'converged', iters: it, posErr: Math.hypot(...ep), oriErr: Math.hypot(...eo), hist, limited, reason, reach };
  }

  /* ---------- trajectories and metrics ---------- */
  function jointTraj(kind, q0, qf, tf, t) {
    const f = kind === 'cubic' ? M.traj.cubic : M.traj.quintic; const r = q0.map((a, i) => f(a, qf[i], tf, t));
    if (kind === 'linear') { const s = M.clamp(t / tf, 0, 1); return { q: q0.map((a, i) => a + (qf[i] - a) * s), qd: q0.map((a, i) => (t > 0 && t < tf) ? (qf[i] - a) / tf : 0), qdd: q0.map(() => 0) }; }
    return { q: r.map(x => x.q), qd: r.map(x => x.qd), qdd: r.map(x => x.qdd) };
  }
  function metrics(ref, act, t) {
    const n = Math.min(ref.length, act.length); if (!n) return {};
    let se = 0, ae = 0, mx = 0; for (let i = 0; i < n; i++) { const e = ref[i] - act[i]; se += e * e; ae += Math.abs(e); mx = Math.max(mx, Math.abs(e)); }
    return { rmse: Math.sqrt(se / n), mae: ae / n, max: mx, final: ref[n - 1] - act[n - 1], n, T: t ? t[n - 1] - t[0] : null };
  }
  /** step-response indices of y(t) towards a final reference r (from y0) */
  function stepInfo(t, y, r) {
    const y0 = y[0], span = r - y0; if (Math.abs(span) < 1e-12 || y.length < 3) return {};
    const yn = y.map(v => (v - y0) / span); let t10 = null, t90 = null, peak = -Infinity, ts = t[0];
    yn.forEach((v, i) => { if (t10 === null && v >= 0.1) t10 = t[i]; if (t90 === null && v >= 0.9) t90 = t[i]; if (v > peak) peak = v; if (Math.abs(v - 1) > 0.02) ts = t[Math.min(i + 1, t.length - 1)]; });
    return { rise: t90 !== null && t10 !== null ? t90 - t10 : null, overshoot: Math.max(0, (peak - 1) * 100), settling: ts - t[0], ess: r - y[y.length - 1] };
  }

  return { MATERIALS, MOTORS, SENSORS, TOOLS, ELECTRONICS, g0, newJoint, emptyRobot, template, tableOf, linkLen, linkMass, linkInertia, motorOf, totalMass, classify, mobility, validate, homeQ, fk, tcp, tip, jacTip, bodies, pointJac, massMatrix, gravityVec, coriolisVec, frictionVec, invDyn, fwdDyn, motorState, symEig, singularValues, eigGeneral, manipulability, ikSolve, jointTraj, metrics, stepInfo };
});
