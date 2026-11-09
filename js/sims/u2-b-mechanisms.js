/* Unit II — robot joints, transmissions and mechanisms; serial vs parallel manipulators; end-effectors and grippers */
(function () {
  const RIL = window.RIL, M = RIL.M, D = RIL.draw, C = RIL.C, D2R = M.D2R, R2D = M.R2D, PI = Math.PI;
  const K = () => RIL.three;

  /* ================= Joints, transmissions, mechanisms (Topic II.7) ================= */
  const JM = { R: 'Revolute joint (R)', P: 'Prismatic joint (P)', harm: 'Harmonic drive reducer', gear: 'Gear reduction & reflected inertia', fourbar: 'Four-bar linkage', slider: 'Slider–crank mechanism', para: 'Parallelogram linkage (palletiser)' };
  RIL.defineSim({
    id: 'robot-joints', title: 'Robot joints, transmissions and mechanisms', unit: 2, category: 'robot-mechanisms', kind: '2d', auto: true, autoDefault: true,
    description: 'Revolute and prismatic joints as physical assemblies, harmonic-drive ratio n = N_f/(N_c − N_f) (2.22), gear reduction T_L = nηT_m and reflected inertia J_eq = J_m + J_L/n² (2.20, 2.21), and the classical mechanisms used in robots: four-bar, slider–crank and parallelogram linkages.',
    help: 'Select a joint or mechanism and drive its input with the slider or in Automatic mode. For the gear and harmonic-drive views change the ratio and inertias; the optimum (inertia-matched) ratio √(J_L/J_m) is shown. Defaults reproduce Example 2.9 (200/202 teeth → n = 100; J_eq = 3 × 10⁻⁴ kg·m²).',
    controls: [
      { id: 'type', type: 'select', label: 'Joint / mechanism', string: true, value: 'R', options: Object.entries(JM) },
      { id: 'q', label: 'Input motion (angle or stroke)', min: -180, max: 180, step: 0.5, value: 40, unit: '° | mm' },
      { id: 'n', label: 'Flexspline teeth N_f | gear ratio n', min: 20, max: 300, step: 1, value: 200 },
      { id: 'Jm', label: 'Motor inertia J_m', min: 0.1, max: 10, step: 0.1, value: 1, unit: '×10⁻⁴ kg·m²' },
      { id: 'JL', label: 'Load inertia J_L', min: 0.1, max: 10, step: 0.1, value: 2, unit: 'kg·m²' },
      { id: 'Tm', label: 'Motor torque T_m', min: 0.1, max: 5, step: 0.05, value: 1, unit: 'N·m' }
    ],
    readouts: [{ id: 'dof', label: 'Joint DOF / mobility' }, { id: 'out', label: 'Output motion' }, { id: 'r', label: 'Ratio n' }, { id: 'TL', label: 'Output torque nηT_m (η = 0.8)', unit: 'N·m' }, { id: 'Jeq', label: 'J_eq at motor', unit: 'kg·m²' }, { id: 'nopt', label: 'Optimum ratio √(J_L/J_m)' }],
    charts: [{ id: 'c', title: 'Input–output relation', x: 'input', y: 'output', series: [{ label: 'output' }, { label: 'current', points: true, line: false }] }],
    step(S) { if (S.auto) S.setParam('q', +(S.p.type === 'P' ? 80 * Math.sin(0.6 * S.t) : (S.p.type === 'fourbar' || S.p.type === 'slider' || S.p.type === 'para' ? ((S.t * 60) % 360) - 180 : 120 * Math.sin(0.5 * S.t))).toFixed(1), true); },
    fourbar(t2) { // ground a, crank b, coupler c, rocker d (mm)
      const a = 100, b = 40, c = 110, d = 80; const A = [b * Math.cos(t2), b * Math.sin(t2)], O4 = [a, 0];
      const dx = O4[0] - A[0], dy = O4[1] - A[1], L = Math.hypot(dx, dy); if (L > c + d || L < Math.abs(c - d)) return null;
      const aa = (c * c - d * d + L * L) / (2 * L), hh = Math.sqrt(Math.max(0, c * c - aa * aa)); const P = [A[0] + aa * dx / L, A[1] + aa * dy / L];
      const B = [P[0] - hh * dy / L, P[1] + hh * dx / L]; return { A, B, O4, t4: Math.atan2(B[1], B[0] - a), dims: [a, b, c, d] };
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, t = p.type, q = p.q * D2R, ch = S.chart('c'); const cx = W * 0.36, cy = H * 0.55;
      let n = p.n, dof = '1', out = '';
      if (t === 'R' || t === 'P') {
        if (t === 'R') { D.rect(S, cx - 90, cy, 180, 40, '#3b4f75', '#8fa3c4', 1.5, 4); D.circle(S, cx, cy, 34, '#22355c', C.amber, 3); D.link(S, cx, cy, cx + Math.cos(-q) * 170, cy + Math.sin(-q) * 170, 22, '#8aa0c6'); D.circle(S, cx, cy, 12, C.amber); const g = S.ctx; g.strokeStyle = C.green; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 60, 0, -q, q > 0); g.stroke(); D.text(S, `θ = ${p.q}°`, cx + 66, cy - 30, { size: 12, color: C.green }); D.text(S, 'link i rotates about joint axis (motor + brake + encoder + reducer + bearing)', 16, 24, { size: 12 }); out = M.fmt(p.q, 1) + '°'; }
        else { const s = p.q; D.rect(S, cx - 200, cy - 14, 400, 28, '#3b4f75', '#8fa3c4', 1.5, 4); for (let k = -190; k < 200; k += 12) D.line(S, cx + k, cy - 10, cx + k + 6, cy + 10, '#8fa3c4', 1); D.rect(S, cx + s * 2 - 40, cy - 40, 80, 80, '#8aa0c6', '#c9d6ec', 1.5, 6); D.arrow(S, cx - 60, cy - 60, cx + 60, cy - 60, C.green, 2); D.text(S, `d = ${p.q} mm`, cx, cy - 70, { size: 12, align: 'center', color: C.green }); D.text(S, 'carriage translates along guide (ball screw / belt / linear motor)', 16, 24, { size: 12 }); out = M.fmt(p.q, 1) + ' mm'; }
        ch.set(0, [[-180, -180], [180, 180]]); ch.set(1, [[p.q, p.q]]);
      } else if (t === 'harm' || t === 'gear') {
        if (t === 'harm') n = M.act.harmonic(p.n, p.n + 2);
        const g = S.ctx, R = Math.min(W * 0.18, H * 0.38), outAng = q / n * 6;
        if (t === 'harm') {
          D.circle(S, cx, cy, R + 14, '#22355c', '#c9a26b', 4); D.text(S, `circular spline N_c = ${p.n + 2}`, cx, cy - R - 26, { size: 11, align: 'center', color: '#c9a26b' });
          g.save(); g.translate(cx, cy); g.rotate(-q); g.strokeStyle = '#9fb3d1'; g.lineWidth = 8; g.beginPath(); g.ellipse(0, 0, R + 4, R - 14, 0, 0, 2 * PI); g.stroke(); g.fillStyle = '#3b4f75'; g.beginPath(); g.ellipse(0, 0, R - 20, R - 36, 0, 0, 2 * PI); g.fill(); g.restore();
          D.text(S, 'wave generator (input)', cx, cy + 4, { size: 11, align: 'center' }); D.text(S, `flexspline N_f = ${p.n} (output)`, cx, cy + R + 32, { size: 11, align: 'center', color: '#9fb3d1' });
          D.line(S, cx, cy, cx + Math.cos(-outAng) * (R + 14), cy + Math.sin(-outAng) * (R + 14), C.amber, 3); D.text(S, 'n = N_f/(N_c − N_f)  (2.22) — output arrow ×6 for visibility', 16, 24, { size: 12 });
        } else {
          const r1 = 28, r2 = 28 * Math.min(n, 6); const gear = (x, y, rr, teeth, ang, col) => { g.fillStyle = col; g.beginPath(); for (let k = 0; k < teeth * 2; k++) { const a = ang + k * PI / teeth, rad = k % 2 ? rr : rr * 0.9; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } g.closePath(); g.fill(); D.line(S, x, y, x + Math.cos(ang) * rr * 0.8, y + Math.sin(ang) * rr * 0.8, '#0e1d38', 3); };
          gear(cx - r2 * 0.5 - r1, cy, r1, 10, -q, '#c9a26b'); gear(cx - r2 * 0.5 + r2 * 0.02 + 2, cy, r2 * 0.95, Math.round(10 * r2 / r1), q / n * Math.min(n, 6) / Math.min(n, 6) * 1, '#b98f58');
          D.text(S, 'motor pinion', cx - r2 * 0.5 - r1, cy + r1 + 18, { size: 11, align: 'center' }); D.text(S, `output gear (drawn ≤ 6:1; actual n = ${n})`, cx, cy + r2 + 22, { size: 11, align: 'center' });
          D.text(S, 'T_L = nηT_m  (2.20);  J_eq = J_m + J_L/n²  (2.21)', 16, 24, { size: 12 });
        }
        out = M.fmt(p.q / n, 3) + '° output'; const Jm = p.Jm * 1e-4, Jeq = Jm + p.JL / (n * n); S.set('Jeq', Jeq); S.set('nopt', Math.sqrt(p.JL / Jm));
        const pts = []; for (let k = 1; k <= 60; k++) { const nn = k * 5; pts.push([nn, (Jm + p.JL / (nn * nn)) * 1e4]); } ch.set(0, pts); ch.set(1, [[n, Jeq * 1e4]]); ch.label(0, 'J_eq ×10⁴ vs n');
        D.box(S, Math.min(W - 270, cx + R + 60), 50, 250, 'Reflected inertia', [['n', M.fmt(n, 2)], ['J_L/n²', M.fmt(p.JL / (n * n), 6) + ' kg·m²'], ['J_eq', M.fmt(Jeq, 6) + ' kg·m²'], ['Load share of J_eq', M.fmt(p.JL / (n * n) / Jeq * 100, 1) + ' %'], ['Inertia-matched n', M.fmt(Math.sqrt(p.JL / Jm), 1)]]);
      } else {
        const sc = Math.min(W, H) / 320, O = [cx - 60 * sc, cy + 30 * sc], X = v => O[0] + v[0] * sc, Y = v => O[1] - v[1] * sc;
        if (t === 'fourbar') {
          const fb = this.fourbar(q); dof = '3(4 − 1 − 4) + 4 = 1 (Grübler, planar)';
          if (fb) { D.link(S, X([0, 0]), Y([0, 0]), X(fb.A), Y(fb.A), 10, C.amber); D.link(S, X(fb.A), Y(fb.A), X(fb.B), Y(fb.B), 10); D.link(S, X(fb.O4), Y(fb.O4), X(fb.B), Y(fb.B), 10, C.cyan); [[0, 0], fb.A, fb.B, fb.O4].forEach(v => D.joint(S, X(v), Y(v), 7)); D.line(S, X([0, 0]), Y([0, 0]) + 12, X(fb.O4), Y(fb.O4) + 12, C.muted, 3); out = 'rocker θ₄ = ' + M.fmt(fb.t4 * R2D, 1) + '°'; }
          else out = 'position not assemblable';
          const pts = []; for (let a = -180; a <= 180; a += 5) { const r = this.fourbar(a * D2R); if (r) pts.push([a, r.t4 * R2D]); } ch.set(0, pts); ch.set(1, fb ? [[p.q, fb.t4 * R2D]] : []);
          D.text(S, 'ground 100, crank 40 (input), coupler 110, rocker 80 mm — Grashof crank-rocker', 16, 24, { size: 12 });
        } else if (t === 'slider') {
          const r = 40, l = 110, x = r * Math.cos(q) + Math.sqrt(l * l - (r * Math.sin(q)) ** 2); const A = [r * Math.cos(q), r * Math.sin(q)]; dof = '1 (planar four-link chain with one P joint)';
          D.rect(S, X([60, 0]), Y([0, 0]) - 18 * sc / 2, 140 * sc, 18 * sc, '#22355c'); D.link(S, X([0, 0]), Y([0, 0]), X(A), Y(A), 10, C.amber); D.link(S, X(A), Y(A), X([x, 0]), Y([0, 0]), 10); D.rect(S, X([x, 0]) - 18, Y([0, 0]) - 14, 36, 28, C.cyan, '#fff', 1, 3); D.joint(S, X([0, 0]), Y([0, 0]), 7); D.joint(S, X(A), Y(A), 7);
          out = 'slider x = ' + M.fmt(x, 1) + ' mm'; const pts = []; for (let a = -180; a <= 180; a += 5) { const aa = a * D2R; pts.push([a, r * Math.cos(aa) + Math.sqrt(l * l - (r * Math.sin(aa)) ** 2)]); } ch.set(0, pts); ch.set(1, [[p.q, x]]);
          D.text(S, 'x = r cos θ + √(l² − r² sin²θ): converts rotation to reciprocation (gripper jaws, presses)', 16, 24, { size: 12 });
        } else {
          const th1 = 50 * D2R + q * 0.25, th2 = -40 * D2R + q * 0.35, l1 = 120, l2 = 100; const E = [l1 * Math.cos(th1), l1 * Math.sin(th1)], Wt = [E[0] + l2 * Math.cos(th2), E[1] + l2 * Math.sin(th2)]; dof = '2 (two motors near the base)';
          const off = [-30, -12]; D.link(S, X([0, 0]), Y([0, 0]), X(E), Y(E), 12); D.link(S, X(E), Y(E), X(Wt), Y(Wt), 10, C.cyan);
          D.link(S, X(off), Y(off), X([E[0] + off[0], E[1] + off[1]]), Y([E[0] + off[0], E[1] + off[1]]), 6, '#6f86ad'); D.link(S, X([E[0] + off[0], E[1] + off[1]]), Y([E[0] + off[0], E[1] + off[1]]), X(E), Y(E), 6, '#6f86ad');
          D.rect(S, X(Wt) - 24, Y(Wt), 48, 10, C.amber); D.line(S, X(Wt), Y(Wt), X(Wt), Y(Wt) + 30, C.amber, 3); [[0, 0], E, Wt, off].forEach(v => D.joint(S, X(v), Y(v), 6));
          out = 'flange stays horizontal; wrist at (' + M.fmt(Wt[0], 0) + ', ' + M.fmt(Wt[1], 0) + ') mm';
          D.text(S, 'Parallelogram keeps the flange orientation fixed and lets the elbow motor sit at the base (less moving mass)', 16, 24, { size: 12 });
          ch.set(0, []); ch.set(1, []);
        }
      }
      S.set('dof', t === 'R' || t === 'P' ? '1 (f = 1, constraints 5)' : dof); S.set('out', out); S.set('r', t === 'harm' || t === 'gear' ? n : '—'); S.set('TL', t === 'harm' || t === 'gear' ? n * 0.8 * p.Tm : 0);
      if (!(t === 'harm' || t === 'gear')) { S.set('Jeq', '—'); S.set('nopt', '—'); }
    }
  });

  /* ================= Serial vs parallel manipulators (Topic II.8) — 3D ================= */
  const DL = { R: 0.2, r: 0.05, Lb: 0.25, La: 0.55, h: 1.0, ox: 0.75 };
  function deltaFK(th) {
    const { R, r, Lb, La, h } = DL; const centres = [], elbows = [], bases = [];
    for (let i = 0; i < 3; i++) { const phi = i * 2 * PI / 3, c = Math.cos(phi), s = Math.sin(phi); const ex = R + Lb * Math.cos(th[i]), ez = h - Lb * Math.sin(th[i]); bases.push([R * c, R * s, h]); elbows.push([ex * c, ex * s, ez]); centres.push([(ex - r) * c, (ex - r) * s, ez]); }
    const v = M.v3, [P1, P2, P3] = centres; const ex = v.unit(v.sub(P2, P1)), i = v.dot(ex, v.sub(P3, P1)); const ey = v.unit(v.sub(v.sub(P3, P1), v.scale(ex, i))), ez = v.cross(ex, ey); const d = v.norm(v.sub(P2, P1)), j = v.dot(ey, v.sub(P3, P1));
    const x = d / 2, y = (i * i + j * j) / (2 * j) - i * x / j, z2 = La * La - x * x - y * y; if (z2 < 0) return null;
    const p0 = v.add(P1, v.add(v.scale(ex, x), v.scale(ey, y))), zz = Math.sqrt(z2); const pA = v.add(p0, v.scale(ez, zz)), pB = v.sub(p0, v.scale(ez, zz));
    return { p: pA[2] < pB[2] ? pA : pB, elbows, bases };
  }
  RIL.defineSim({
    id: 'serial-parallel', title: 'Serial versus parallel manipulators (3D)', unit: 2, category: 'robot-mechanisms', kind: '3d', auto: true, autoDefault: true,
    description: 'An articulated serial arm (open chain) beside a Delta parallel robot (three closed chains to one moving platform). The same payload is applied; joint torques follow τ = Jᵀ F, with the Delta Jacobian computed numerically from its forward kinematics. Workspaces can be sampled and compared.',
    help: 'Move the three actuated joints of each robot, set the payload and compare the motor torques. The serial shoulder carries the whole load at the end of a long lever; in the Delta the load is shared by three legs. Toggle the sampled workspaces to compare their size and shape.',
    camera: { position: [1.0, -2.6, 1.6], target: [0.4, 0, 0.55] },
    controls: [
      { id: 'a', label: 'Joint 1 (serial waist | Delta arm 1)', min: -40, max: 80, step: 0.5, value: 20, unit: '°' },
      { id: 'b', label: 'Joint 2 (serial shoulder | Delta arm 2)', min: -40, max: 80, step: 0.5, value: 35, unit: '°' },
      { id: 'c', label: 'Joint 3 (serial elbow | Delta arm 3)', min: -40, max: 80, step: 0.5, value: 10, unit: '°' },
      { id: 'm', label: 'Payload mass', min: 0, max: 10, step: 0.1, value: 3, unit: 'kg' },
      { id: 'ws', type: 'toggle', label: 'Show sampled workspaces', value: false }
    ],
    readouts: [{ id: 'sp', label: 'Serial TCP (x, y, z)', unit: 'm' }, { id: 'st', label: 'Serial joint torques τ = JᵀF', unit: 'N·m' }, { id: 'dp', label: 'Delta platform (x, y, z)', unit: 'm' }, { id: 'dt', label: 'Delta motor torques τ = JᵀF', unit: 'N·m' }, { id: 'ratio', label: 'Max torque ratio serial / Delta' }],
    panels: [{ id: 'cmp', title: 'Comparison (Section 2.10)', wide: true }],
    setup(S) {
      const k = K(), sc = S.three.scene;
      S.ser = new k.DHRobot(sc, k.ROBOTS.articulated.table, { radius: 0.035, gripper: true }); S.ser.group.position.x = -0.15;
      S.three.label('Serial (open chain)', [-0.15, 0, 1.25], ''); S.three.label('Parallel: Delta (closed chains)', [DL.ox, 0, 1.25], '');
      const G = S.dg = new THREE.Group(); G.position.x = DL.ox; sc.add(G);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(DL.R + 0.06, DL.R + 0.06, 0.03, 6), k.mat(0x3b4f75)); plate.rotation.x = PI / 2; plate.position.z = DL.h + 0.02; G.add(plate);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, DL.h + 0.04), k.mat(0x22355c)); fr.position.set(-DL.R - 0.12, 0, (DL.h) / 2); G.add(fr);
      S.up = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 12), k.mat(0xf2a516)); G.add(m); return m; });
      S.lo = [0, 1, 2].map(() => [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), k.mat(0xc9d6ec)); G.add(m); return m; }));
      S.plat = new THREE.Mesh(new THREE.CylinderGeometry(DL.r + 0.02, DL.r + 0.02, 0.02, 24), k.mat(0x4cc2ff)); S.plat.rotation.x = PI / 2; G.add(S.plat);
      S.loadS = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), k.mat(0x8a5a2a)); sc.add(S.loadS); S.loadD = S.loadS.clone(); G.add(S.loadD);
      const pts = []; for (let i = 0; i < 2500; i++) { const q = [(-170 + 340 * Math.random()) * D2R, (-20 + 130 * Math.random()) * D2R, (-150 + 170 * Math.random()) * D2R]; const { T } = M.fkDH(k.ROBOTS.articulated.table, q); const pp = M.pof(T[3]); pts.push([pp[0] - 0.15, pp[1], pp[2]]); }
      S.wsS = k.points(pts, 0xf2a516, 0.012, 0.35); sc.add(S.wsS);
      const dp = []; for (let i = 0; i < 2500; i++) { const r = deltaFK([0, 1, 2].map(() => (-40 + 120 * Math.random()) * D2R)); if (r) dp.push([r.p[0] + DL.ox, r.p[1], r.p[2]]); } S.wsD = k.points(dp, 0x4cc2ff, 0.012, 0.45); sc.add(S.wsD);
      S.wsInfo = { s: pts.length, d: dp.length };
    },
    step(S) { if (S.auto) { const t = S.t; S.setParam('a', +(20 + 40 * Math.sin(0.6 * t)).toFixed(1), true); S.setParam('b', +(25 + 35 * Math.sin(0.5 * t + 2)).toFixed(1), true); S.setParam('c', +(25 + 35 * Math.sin(0.7 * t + 4)).toFixed(1), true); } },
    draw(S) {
      const p = S.p, k = K(), F = [0, 0, -p.m * M.g0];
      const qs = [p.a * D2R, (40 + p.b) * D2R, (-80 + p.c) * D2R]; const T = S.ser.update(qs); const ps = M.pof(T[3]); S.loadS.position.set(ps[0] - 0.15, ps[1], ps[2] - 0.08);
      const Js = M.jacobianGeo(k.ROBOTS.articulated.table, qs).slice(0, 3); const ts = M.mat.mulVec(M.mat.T(Js), F);
      const th = [p.a, p.b, p.c].map(v => v * D2R); const r = deltaFK(th);
      let td = [NaN, NaN, NaN];
      if (r) {
        r.bases.forEach((b, i) => { k.setBetween(S.up[i], b, r.elbows[i]); const phi = i * 2 * PI / 3, c = Math.cos(phi), s = Math.sin(phi), tx = -s * 0.03, ty = c * 0.03; const plt = [r.p[0] + DL.r * c, r.p[1] + DL.r * s, r.p[2]]; [1, -1].forEach((sg, j) => k.setBetween(S.lo[i][j], [r.elbows[i][0] + sg * tx, r.elbows[i][1] + sg * ty, r.elbows[i][2]], [plt[0] + sg * tx, plt[1] + sg * ty, plt[2]])); });
        S.plat.position.set(...r.p); S.loadD.position.set(r.p[0], r.p[1], r.p[2] - 0.06);
        const J = M.mat.zeros(3, 3), h = 1e-5; for (let j = 0; j < 3; j++) { const t2 = th.slice(); t2[j] += h; const r2 = deltaFK(t2); if (!r2) continue; for (let i = 0; i < 3; i++) J[i][j] = (r2.p[i] - r.p[i]) / h; }
        td = M.mat.mulVec(M.mat.T(J), F);
      }
      S.wsS.visible = S.wsD.visible = p.ws;
      const f3 = v => v.map(x => M.fmt(x, 3)).join(', ');
      S.set('sp', f3([ps[0] - 0.15, ps[1], ps[2]])); S.set('st', f3(ts)); S.set('dp', r ? f3([r.p[0] + DL.ox, r.p[1], r.p[2]]) : 'not assemblable'); S.set('dt', f3(td));
      const mxS = Math.max(...ts.map(Math.abs)), mxD = Math.max(...td.map(Math.abs)); S.set('ratio', mxD > 1e-6 ? M.fmt(mxS / mxD, 2) : '—');
      RIL.setHTML(S.panel('cmp'), '<div class="table-scroll">' + RIL.ui.kv([['Mechanical structure', 'Open chain: base–link–joint–…–tool; each joint carries all outboard links', 'Closed chains: 3 legs joined to one platform; motors on the fixed base'], ['Motion', 'Large, dexterous; errors of joints add up at the tool', 'Fast, light moving mass; errors averaged'], ['Workspace', `Large relative to footprint (${S.wsInfo.s} sampled points shown in amber)`, 'Small dome below the base (blue)'], ['Load distribution', `Shoulder torque ${M.fmt(Math.abs(ts[1]), 2)} N·m for ${p.m} kg`, `Largest motor torque ${M.fmt(mxD, 2)} N·m — shared by three legs`], ['Stiffness / accuracy', 'Lower (cantilever)', 'High (truss-like)'], ['Applications', 'Welding, painting, machine tending, assembly', 'High-speed picking, packaging, flight simulators (Stewart)']], ['Property', 'Serial manipulator', 'Parallel manipulator']) + '</div>', S, 'cmp');
    }
  });

  /* ================= End-effectors and grippers (Topic II.9) ================= */
  const GR = { two: 'Two-finger parallel gripper (pneumatic)', three: 'Three-finger centric gripper', ang: 'Two-finger angular gripper', vac: 'Vacuum cup gripper', mag: 'Electromagnetic gripper' };
  RIL.defineSim({
    id: 'grippers', title: 'End-effectors and grippers: grasp, hold, transport, release', unit: 2, category: 'robot-mechanisms', kind: '2d', auto: true, autoDefault: true,
    description: 'A gripper on a robot flange approaches, grasps, lifts, transports and releases a part. The required friction-grip force F_g ≥ S m(g + a)/(n_f μ) (2.23) is compared with what the gripper supplies (cylinder ηpA, vacuum Δp·A, or magnet); if it is insufficient the part slips during the lift.',
    help: 'Choose the gripper and part, then run the cycle (or Step through it). Increase the vertical acceleration or reduce friction to see slipping. Defaults: Example 2.10 (2 kg, μ = 0.3, a = 5 m/s², S = 2 → 98.7 N per finger) and Example 1.28 (40 mm cup at −60 kPa → 75.4 N).',
    controls: [
      { id: 'type', type: 'select', label: 'Gripper type', string: true, value: 'two', options: Object.entries(GR) },
      { id: 'part', type: 'select', label: 'Part', string: true, value: 'steel', options: [['steel', 'Steel block'], ['box', 'Cardboard box'], ['glass', 'Glass sheet'], ['cyl', 'Aluminium cylinder']] },
      { id: 'm', label: 'Part mass m', min: 0.1, max: 10, step: 0.1, value: 2, unit: 'kg' },
      { id: 'mu', label: 'Friction coefficient μ', min: 0.05, max: 1, step: 0.01, value: 0.3 },
      { id: 'a', label: 'Vertical acceleration a', min: 0, max: 20, step: 0.5, value: 5, unit: 'm/s²' },
      { id: 'Sf', label: 'Safety factor S', min: 1, max: 4, step: 0.1, value: 2 },
      { id: 'sup', label: 'Supply: pressure (bar) | vacuum (kPa) | cup Ø (mm)', min: 1, max: 90, step: 0.5, value: 6 },
      { id: 'bore', label: 'Gripper cylinder bore | cup diameter', min: 10, max: 80, step: 1, value: 20, unit: 'mm' }
    ],
    readouts: [{ id: 'req', label: 'Required force', unit: 'N' }, { id: 'av', label: 'Available force', unit: 'N' }, { id: 'ok', label: 'Grip verdict' }, { id: 'ph', label: 'Cycle phase' }, { id: 'held', label: 'Part held?' }],
    phases: ['approach', 'grasp', 'lift', 'transport', 'lower', 'release', 'return'],
    reset(S) { S.ph = 0; S.pt = 0; S.drop = false; S.partPos = [0.25, 0]; S.dropV = 0; },
    onControl(S, id, v) {
      if (id === 'type') { S.reset(); const set = (lbl, min, max, val) => { const i = S.inputs.sup; i.el.min = min; i.el.max = max; i.el.nextElementSibling.min = min; i.el.nextElementSibling.max = max; i.el.parentElement.querySelector('label span').textContent = lbl; S.setParam('sup', val, true); }; if (v === 'vac') { set('Vacuum level |Δp| (kPa)', 5, 90, 60); S.setParam('bore', 40, true); } else if (v === 'mag') set('Magnet holding force rating (N)', 10, 900, 400); else { set('Supply pressure (bar)', 1, 10, 6); S.setParam('bore', 20, true); } }
    },
    calc(S) {
      const p = S.p, nf = p.type === 'three' ? 3 : 2; const g = M.g0;
      if (p.type === 'vac') { const A = PI * (p.bore / 2000) ** 2; return { req: p.Sf * p.m * (g + p.a), av: p.sup * 1000 * A, per: 'total', nf: 1, note: p.part === 'box' ? 'porous surface: leakage reduces vacuum' : '' }; }
      if (p.type === 'mag') { const ferrous = p.part === 'steel'; return { req: p.Sf * p.m * (g + p.a), av: ferrous ? p.sup : 0, per: 'total', nf: 1, note: ferrous ? '' : 'non-ferrous part: magnet cannot hold it' }; }
      const Fcyl = 0.9 * p.sup * 1e5 * PI * (p.bore / 1000) ** 2 / 4; const mech = p.type === 'ang' ? 0.6 : 0.5; return { req: M.act.grip(p.Sf, p.m, p.a, nf, p.mu), av: Fcyl * mech, per: 'per finger', nf, note: '' };
    },
    step(S, dt) {
      S.pt += dt * 0.9; const c = this.calc(S); const vac = S.p.type === 'vac' && S.p.part === 'box' ? 0.55 : 1; const ok = c.av * vac >= c.req / S.p.Sf * (S.p.type === 'vac' || S.p.type === 'mag' ? 1 : 1);
      if (S.pt > 1) { S.pt = 0; S.ph = (S.ph + 1) % 7; if (S.ph === 0) { S.drop = false; S.partPos = [0.25, 0]; } }
      S.ok = ok; if (S.ph === 2 && !ok && S.pt > 0.3) S.drop = true;
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, c = this.calc(S); const ph = S.ph, f = S.pt;
      const floor = H - 50, X = u => 60 + u * (W - 120), lift = 140, sx = 0.25, tx = 0.75;
      D.rect(S, 0, floor, W, 50, '#13264a'); D.rect(S, X(sx) - 60, floor - 8, 120, 8, '#3b4f75'); D.rect(S, X(tx) - 60, floor - 8, 120, 8, '#3b4f75'); D.text(S, 'pick station', X(sx), floor + 24, { size: 11, align: 'center', color: C.muted }); D.text(S, 'place station', X(tx), floor + 24, { size: 11, align: 'center', color: C.muted });
      let gx = sx, gy = 0; const e = f * f * (3 - 2 * f);
      if (ph === 0) { gy = lift * (1 - e); } else if (ph === 1) gy = 0; else if (ph === 2) gy = lift * e; else if (ph === 3) { gy = lift; gx = sx + (tx - sx) * e; } else if (ph === 4) { gx = tx; gy = lift * (1 - e); } else if (ph === 5) { gx = tx; gy = 0; } else { gx = tx + (sx - tx) * e; gy = lift * e; }
      const closed = ph >= 1 && ph <= 4 && !(ph === 1 && f < 0.5), held = closed && !S.drop && (ph >= 2 && ph <= 4 || (ph === 1 && f >= 0.5));
      const pw = p.part === 'glass' ? 120 : p.part === 'cyl' ? 50 : 70, phh = p.part === 'glass' ? 8 : 60; const partCol = { steel: '#9fb3d1', box: '#b08550', glass: 'rgba(160,220,255,.6)', cyl: '#d6dde8' }[p.part];
      let px = X(held ? gx : (ph >= 5 || (ph === 0 && S.prevPlaced) ? (S.drop ? sx : tx) : sx)), py = floor - 8 - (held ? gy : 0);
      if (S.drop && ph >= 2) { px = X(sx); py = floor - 8; }
      if (ph === 6 || ph === 5) px = X(S.drop ? sx : tx);
      const gyp = floor - 8 - phh - gy, gxp = X(gx);
      D.line(S, gxp, 0, gxp, gyp - 40, '#6f86ad', 10); D.rect(S, gxp - 40, gyp - 44, 80, 14, '#3b4f75', '#8fa3c4', 1, 3); D.text(S, 'robot flange', gxp + 46, gyp - 34, { size: 10, color: C.muted });
      const open = closed ? pw / 2 : pw / 2 + 22;
      if (p.type === 'vac') { D.poly(S, [[gxp - 18, gyp - 30], [gxp + 18, gyp - 30], [gxp + 26, gyp - 2], [gxp - 26, gyp - 2]], closed ? C.cyan : '#3b4f75', '#fff', 1); if (closed) D.text(S, `−${p.sup} kPa`, gxp, gyp - 12, { size: 10, align: 'center', color: '#0e1d38', weight: 700 }); }
      else if (p.type === 'mag') { D.rect(S, gxp - 30, gyp - 30, 60, 28, closed ? C.red : '#3b4f75', '#fff', 1, 3); D.text(S, closed ? 'ON' : 'OFF', gxp, gyp - 12, { size: 11, align: 'center', weight: 700 }); }
      else { const fingers = p.type === 'three' ? [-1, 0, 1] : [-1, 1]; fingers.forEach(sg => { const x = sg === 0 ? gxp : gxp + sg * open; const ang = p.type === 'ang' && !closed ? sg * 0.25 : 0; D.link(S, x, gyp - 30, x + Math.sin(ang) * 50, gyp - 30 + Math.cos(ang) * (phh + 20), sg === 0 ? 6 : 9, C.amber, '#fff'); }); }
      if (p.part === 'cyl') D.rect(S, px - pw / 2, py - phh, pw, phh, partCol, '#fff', 1, 20); else D.rect(S, px - pw / 2, py - phh, pw, phh, partCol, '#fff', 1, 2);
      if (closed && p.type !== 'vac' && p.type !== 'mag' && held) { D.arrow(S, gxp - pw / 2 - 36, gyp + phh / 2, gxp - pw / 2 - 4, gyp + phh / 2, C.green, 2); D.arrow(S, gxp + pw / 2 + 36, gyp + phh / 2, gxp + pw / 2 + 4, gyp + phh / 2, C.green, 2); }
      D.text(S, this.phases[ph].toUpperCase(), 16, 26, { size: 15, weight: 800, color: C.amber });
      const eq = p.type === 'vac' ? 'F = Δp · A (cup area);  required S·m(g + a)' : p.type === 'mag' ? 'Holding force rating vs S·m(g + a); ferrous parts only' : 'F_g ≥ S m (g + a) / (n_f μ)   (2.23)';
      D.text(S, eq, 16, 46, { size: 12 });
      if (S.drop) D.text(S, 'PART SLIPPED — insufficient grip force', W / 2, 80, { size: 14, weight: 800, align: 'center', color: C.red }); if (c.note) D.text(S, c.note, W / 2, 100, { size: 12, align: 'center', color: C.red });
      const effAv = p.type === 'vac' && p.part === 'box' ? c.av * 0.55 : c.av; const okF = p.type === 'vac' || p.type === 'mag' ? effAv >= c.req : c.av >= c.req;
      S.set('req', M.fmt(c.req, 1) + ' (' + c.per + ')'); S.set('av', M.fmt(effAv, 1) + ' (' + c.per + ')'); S.set('ok', okF ? 'secure grip' : 'insufficient — part will slip', okF ? 'ok' : 'bad'); S.set('ph', this.phases[ph]); S.set('held', held ? 'yes' : 'no');
      if (S.drop !== !okF && ph < 2) S.drop = false;
      S.ok = okF; if (ph === 2 && !okF && f > 0.3) S.drop = true; S.prevPlaced = ph >= 5;
    }
  });
})();
