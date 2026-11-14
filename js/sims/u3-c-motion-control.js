/* Unit III — trajectory planning (joint and Cartesian), motion profiles, statics, dynamics, Lagrangian formulation,
   joint-space and task-space control. All on the planar 2R arm unless stated. */
(function () {
  const RIL = window.RIL, M = RIL.M, D = RIL.draw, C = RIL.C, D2R = M.D2R, R2D = M.R2D, PI = Math.PI;
  const traj = (meth, q0, qf, tf, t, Vf = 1.5) => { if (meth === 'cubic') return M.traj.cubic(q0, qf, tf, t); if (meth === 'quintic') return M.traj.quintic(q0, qf, tf, t); const V = Vf * (qf - q0) / tf; return M.traj.lspb(q0, qf, tf, V, t); };
  const armView = (S, L) => { const R = L * 1.12; const V = D.fit(S, [-R, R], [-R * 0.55, R], 18); D.axes2(S, V, [-R, R], [-R * 0.55, R], 0.2); return V; };

  /* ================= Joint-space trajectory (Topic III.11) ================= */
  RIL.defineSim({
    id: 'joint-trajectory', title: 'Joint-space trajectory planning: cubic, quintic and LSPB', unit: 3, category: 'trajectory-planning', kind: '2d', auto: false,
    description: 'Each joint of a 2R arm moves from θ₀ to θ_f in t_f with a cubic (a₂ = 3Δ/t_f², a₃ = −2Δ/t_f³, 3.22), quintic (θ₀ + Δ(10τ³ − 15τ⁴ + 6τ⁵), 3.23) or LSPB profile (t_b = (θ₀ − θ_f + Vt_f)/V, 3.24). Position, velocity and acceleration are plotted from the same polynomials that animate the arm.',
    help: 'Choose start and end angles and the duration, then Start. Compare the jump in acceleration at the ends of the cubic with the smooth quintic, and the constant-velocity cruise of the LSPB. Defaults: Example 3.8 (joint 1 from 10° to 70° in 3 s).',
    controls: [
      { id: 'meth', type: 'select', label: 'Interpolation', string: true, value: 'cubic', options: [['cubic', 'Cubic polynomial'], ['quintic', 'Quintic polynomial'], ['lspb', 'LSPB (trapezoidal velocity)']] },
      { id: 'a0', label: 'Joint 1 start θ₁(0)', min: -90, max: 180, step: 1, value: 10, unit: '°' }, { id: 'af', label: 'Joint 1 end θ₁(t_f)', min: -90, max: 180, step: 1, value: 70, unit: '°' },
      { id: 'b0', label: 'Joint 2 start θ₂(0)', min: -150, max: 150, step: 1, value: 20, unit: '°' }, { id: 'bf', label: 'Joint 2 end θ₂(t_f)', min: -150, max: 150, step: 1, value: 90, unit: '°' },
      { id: 'tf', label: 'Duration t_f', min: 0.5, max: 10, step: 0.1, value: 3, unit: 's' },
      { id: 'Vf', label: 'LSPB cruise V as multiple of Δ/t_f (1–2)', min: 1.05, max: 2, step: 0.01, value: 1.25 }
    ],
    readouts: [{ id: 'q', label: 'θ₁, θ₂ now', unit: '°' }, { id: 'qd', label: 'θ̇₁, θ̇₂ now', unit: '°/s' }, { id: 'co', label: 'Joint 1 coefficients' }, { id: 'vmax', label: 'Peak θ̇₁', unit: '°/s' }, { id: 'amax', label: 'Peak |θ̈₁|', unit: '°/s²' }, { id: 'tb', label: 'LSPB blend time t_b', unit: 's' }],
    charts: [{ id: 'p', title: 'Joint position', x: 't (s)', y: '°', series: [{ label: 'θ₁' }, { label: 'θ₂' }, { label: 'now', points: true, line: false }] }, { id: 'v', title: 'Joint velocity', x: 't (s)', y: '°/s', series: [{ label: 'θ̇₁' }, { label: 'θ̇₂' }] }, { id: 'a', title: 'Joint acceleration', x: 't (s)', y: '°/s²', series: [{ label: 'θ̈₁', stepped: false }, { label: 'θ̈₂' }] }],
    autostart: false,
    reset(S) { S.tt = 0; },
    onControl(S) { S._plotted = null; },
    step(S, dt) { S.tt = Math.min(S.p.tf + 0.5, S.tt + dt); if (S.tt >= S.p.tf + 0.5) S.tt = 0; },
    draw(S) {
      D.clear(S); const p = S.p, l1 = 0.5, l2 = 0.35, V = armView(S, l1 + l2), t = Math.min(S.tt || 0, p.tf);
      const j1 = traj(p.meth, p.a0, p.af, p.tf, t, p.Vf), j2 = traj(p.meth, p.b0, p.bf, p.tf, t, p.Vf);
      [[p.a0, p.b0, 'rgba(87,96,106,.4)'], [p.af, p.bf, 'rgba(26,155,75,.5)']].forEach(([a, b, c]) => { const f = M.planar2R.fk(l1, l2, a * D2R, b * D2R); D.poly(S, [[V.X(0), V.Y(0)], [V.X(f.ex), V.Y(f.ey)], [V.X(f.x), V.Y(f.y)]], null, c, 3, false); });
      const path = []; for (let k = 0; k <= 60; k++) { const tt = p.tf * k / 60; const f = M.planar2R.fk(l1, l2, traj(p.meth, p.a0, p.af, p.tf, tt, p.Vf).q * D2R, traj(p.meth, p.b0, p.bf, p.tf, tt, p.Vf).q * D2R); path.push([V.X(f.x), V.Y(f.y)]); } D.poly(S, path, null, 'rgba(199,119,0,.7)', 2, false);
      const f = M.planar2R.fk(l1, l2, j1.q * D2R, j2.q * D2R); D.arm(S, V, [[0, 0], [f.ex, f.ey], [f.x, f.y]], { w: 12 });
      D.text(S, `t = ${M.fmt(t, 2)} s of ${p.tf} s — tool path (amber) is curved: joint-space planning does not control the Cartesian path`, 14, 20, { size: 11.5 });
      const key = JSON.stringify(p); if (S._plotted !== key) { const P = [[], []], Vv = [[], []], A = [[], []]; let vmax = 0, amax = 0; for (let k = 0; k <= 200; k++) { const tt = p.tf * k / 200; [traj(p.meth, p.a0, p.af, p.tf, tt, p.Vf), traj(p.meth, p.b0, p.bf, p.tf, tt, p.Vf)].forEach((r, i) => { P[i].push([tt, r.q]); Vv[i].push([tt, r.qd]); A[i].push([tt, r.qdd]); if (!i) { vmax = Math.max(vmax, Math.abs(r.qd)); amax = Math.max(amax, Math.abs(r.qdd)); } }); }
        S.chart('p').set(0, P[0]); S.chart('p').set(1, P[1]); S.chart('v').setAll(Vv); S.chart('a').setAll(A); S._plotted = key; S.vmax = vmax; S.amax = amax; }
      S.chart('p').set(2, [[t, j1.q], [t, j2.q]]);
      const co = p.meth === 'cubic' ? `a₀=${M.fmt(j1.coeffs[0], 2)}, a₂=${M.fmt(j1.coeffs[2], 3)}, a₃=${M.fmt(j1.coeffs[3], 4)}` : p.meth === 'quintic' ? `a₃=${M.fmt(j1.coeffs[3], 3)}, a₄=${M.fmt(j1.coeffs[4], 3)}, a₅=${M.fmt(j1.coeffs[5], 4)}` : `V=${M.fmt(p.Vf * (p.af - p.a0) / p.tf, 2)}°/s, a=${M.fmt(j1.a, 2)}°/s²`;
      S.set('q', `${M.fmt(j1.q, 2)}, ${M.fmt(j2.q, 2)}`); S.set('qd', `${M.fmt(j1.qd, 2)}, ${M.fmt(j2.qd, 2)}`); S.set('co', co); S.set('vmax', S.vmax); S.set('amax', S.amax); S.set('tb', p.meth === 'lspb' ? j1.tb : '—');
    }
  });

  /* ================= Cartesian-space trajectory (Topic III.12) ================= */
  RIL.defineSim({
    id: 'cartesian-trajectory', title: 'Cartesian-space trajectory: straight-line motion of the tool', unit: 3, category: 'trajectory-planning', kind: '2d', auto: false,
    description: 'The tool moves along the straight line p(s) = p₀ + s(p_f − p₀) with a timing law s(t) (cubic or quintic); inverse kinematics converts every interpolation point to joint set-points. Joint servos (second-order, ωₙ adjustable) produce the actual path, compared with the reference path and with joint-interpolated motion.',
    help: 'Set start and end points and the duration, then Start. The green line is the reference path, the amber trace the actual tool path; the violet dashed curve shows what joint interpolation between the same end points would do. Lower the servo bandwidth to see the tracking error grow.',
    controls: [
      { id: 'x0', label: 'Start x₀', min: -0.8, max: 0.8, step: 0.01, value: 0.6, unit: 'm' }, { id: 'y0', label: 'Start y₀', min: -0.2, max: 0.8, step: 0.01, value: 0.1, unit: 'm' },
      { id: 'xf', label: 'End x_f', min: -0.8, max: 0.8, step: 0.01, value: -0.3, unit: 'm' }, { id: 'yf', label: 'End y_f', min: -0.2, max: 0.8, step: 0.01, value: 0.55, unit: 'm' },
      { id: 'tf', label: 'Duration t_f', min: 0.5, max: 8, step: 0.1, value: 3, unit: 's' },
      { id: 'law', type: 'select', label: 'Timing law s(t)', string: true, value: 'quintic', options: [['cubic', 'Cubic'], ['quintic', 'Quintic']] },
      { id: 'wn', label: 'Joint servo bandwidth ωₙ', min: 2, max: 60, step: 1, value: 20, unit: 'rad/s' }
    ],
    readouts: [{ id: 'ref', label: 'Reference p(t)', unit: 'm' }, { id: 'act', label: 'Actual tool position', unit: 'm' }, { id: 'e', label: 'Tracking error', unit: 'mm' }, { id: 'emax', label: 'Max path deviation (this run)', unit: 'mm' }, { id: 'v', label: 'Commanded speed', unit: 'm/s' }],
    charts: [{ id: 'c', title: 'Reference and actual Cartesian coordinates', x: 't (s)', y: 'm', series: [{ label: 'x ref' }, { label: 'y ref' }, { label: 'x actual', dash: [4, 3] }, { label: 'y actual', dash: [4, 3] }], window: 800 }, { id: 'q', title: 'Joint set-points from inverse kinematics', x: 't (s)', y: '°', series: [{ label: 'θ₁ set-point' }, { label: 'θ₂ set-point' }], window: 800 }],
    autostart: false, substeps: 10,
    L: [0.5, 0.4],
    ikq(S, x, y, prev) { const r = M.planar2R.ik(...this.L, x, y); if (!r.reachable) return prev; const s = r.sols[0]; return [s.t1, s.t2]; },
    reset(S) { const p = S.p; S.tt = 0; S.q = this.ikq(S, p.x0, p.y0, [0.3, 1]); S.qd = [0, 0]; S.trail = []; S.emax = 0; },
    onControl(S) { S.reset(); S.chart('c').clear(); S.chart('q').clear(); },
    ref(S, t) { const p = S.p, s = (p.law === 'cubic' ? M.traj.cubic(0, 1, p.tf, t) : M.traj.quintic(0, 1, p.tf, t)); return { x: p.x0 + s.q * (p.xf - p.x0), y: p.y0 + s.q * (p.yf - p.y0), v: s.qd * Math.hypot(p.xf - p.x0, p.yf - p.y0) }; },
    step(S, dt) {
      const p = S.p; S.tt += dt; if (S.tt > p.tf + 1.2) { S.reset(); S.chart('c').clear(); S.chart('q').clear(); }
      const r = this.ref(S, Math.min(S.tt, p.tf)); const qd = this.ikq(S, r.x, r.y, S.q); const wn = p.wn;
      S.qd = S.qd.map((v, i) => v + (wn * wn * (qd[i] - S.q[i]) - 2 * wn * v) * dt); S.q = S.q.map((v, i) => v + S.qd[i] * dt);
      const f = M.planar2R.fk(...this.L, ...S.q); const e = Math.hypot(f.x - r.x, f.y - r.y); S.emax = Math.max(S.emax, e); S.trail.push([f.x, f.y]);
      if (S.frameCount % 2 === 0) { S.chart('c').push(S.tt, [r.x, r.y, f.x, f.y]); S.chart('q').push(S.tt, [qd[0] * R2D, qd[1] * R2D]); }
      S.cur = { r, f, e };
    },
    draw(S) {
      D.clear(S); const p = S.p, V = armView(S, 0.9); const L = this.L;
      const g = S.ctx; g.fillStyle = 'rgba(87,96,106,.07)'; g.beginPath(); g.arc(V.X(0), V.Y(0), (L[0] + L[1]) * V.s, 0, 2 * PI); g.arc(V.X(0), V.Y(0), (L[0] - L[1]) * V.s, 0, 2 * PI, true); g.fill();
      const qa = this.ikq(S, p.x0, p.y0, [0, 0]), qb = this.ikq(S, p.xf, p.yf, [0, 0]); const jp = []; for (let k = 0; k <= 40; k++) { const u = k / 40; const f = M.planar2R.fk(...L, qa[0] + (qb[0] - qa[0]) * u, qa[1] + (qb[1] - qa[1]) * u); jp.push([V.X(f.x), V.Y(f.y)]); } D.poly(S, jp, null, 'rgba(130,80,223,.7)', 1.5, false);
      D.line(S, V.X(p.x0), V.Y(p.y0), V.X(p.xf), V.Y(p.yf), C.green, 2.5);
      D.poly(S, (S.trail || []).map(q => [V.X(q[0]), V.Y(q[1])]), null, C.amber, 2, false);
      const f = M.planar2R.fk(...L, ...(S.q || [0, 0])); D.arm(S, V, [[0, 0], [f.ex, f.ey], [f.x, f.y]], { w: 12 });
      if (S.cur) D.circle(S, V.X(S.cur.r.x), V.Y(S.cur.r.y), 6, null, C.green, 2);
      D.text(S, 'P₀', V.X(p.x0) + 8, V.Y(p.y0) + 14, { color: C.green, weight: 700 }); D.text(S, 'P_f', V.X(p.xf) + 8, V.Y(p.yf) - 8, { color: C.green, weight: 700 });
      const unreach = [[p.x0, p.y0], [p.xf, p.yf]].some(([x, y]) => !M.planar2R.ik(...L, x, y).reachable); if (unreach) D.text(S, 'An end point is outside the workspace — choose reachable points', 14, 22, { size: 12.5, weight: 700, color: C.red });
      else D.text(S, 'green: reference straight line   amber: actual tool path   violet: joint-interpolated path', 14, 22, { size: 11, color: C.muted });
      if (S.cur) { S.set('ref', `(${M.fmt(S.cur.r.x, 3)}, ${M.fmt(S.cur.r.y, 3)})`); S.set('act', `(${M.fmt(S.cur.f.x, 3)}, ${M.fmt(S.cur.f.y, 3)})`); S.set('e', S.cur.e * 1000); S.set('emax', S.emax * 1000); S.set('v', S.cur.r.v); }
    }
  });

  /* ================= Velocity and acceleration profiles (Topic III.13) ================= */
  RIL.defineSim({
    id: 'motion-profiles', title: 'Velocity and acceleration profiles: trapezoid, triangle, polynomials', unit: 3, category: 'trajectory-planning', kind: '2d', auto: false,
    description: 'For a move Δ with limits V_max and a_max, the minimum-time trapezoid takes t_f = Δ/V_max + V_max/a_max (3.26); if Δ < V_max²/a_max the profile becomes triangular. The trapezoid for a given t_f and cruise V (Example 3.9) and the cubic and quintic profiles of the same duration are plotted together with their jerk.',
    help: 'Change the move and the limits. The minimum-time result is computed first; the comparison curves use the same t_f. A carriage on a rail moves with the selected profile. Example 3.9: Δ = 60°, t_f = 3 s, V = 25°/s → t_b = 0.6 s, a = 41.7°/s².',
    controls: [
      { id: 'mode', type: 'select', label: 'Profile shown on the rail', string: true, value: 'trap', options: [['trap', 'Trapezoid with given t_f and V'], ['min', 'Minimum-time (V_max, a_max)'], ['cubic', 'Cubic'], ['quintic', 'Quintic']] },
      { id: 'Dq', label: 'Move Δ', min: 5, max: 180, step: 1, value: 60, unit: '°' },
      { id: 'tf', label: 'Duration t_f (trapezoid, polynomials)', min: 0.5, max: 8, step: 0.1, value: 3, unit: 's' },
      { id: 'V', label: 'Cruise velocity V (trapezoid)', min: 1, max: 200, step: 0.5, value: 25, unit: '°/s' },
      { id: 'Vmax', label: 'V_max (minimum time)', min: 5, max: 200, step: 1, value: 40, unit: '°/s' },
      { id: 'amax', label: 'a_max (minimum time)', min: 5, max: 400, step: 1, value: 50, unit: '°/s²' }
    ],
    readouts: [{ id: 'tb', label: 'Blend time t_b', unit: 's' }, { id: 'a', label: 'Blend acceleration', unit: '°/s²' }, { id: 'valid', label: 'V within Δ/t_f < V ≤ 2Δ/t_f?' }, { id: 'tmin', label: 'Minimum time t_f (3.26)', unit: 's' }, { id: 'shape', label: 'Minimum-time profile shape' }, { id: 'pk', label: 'Peak velocity cubic / quintic', unit: '°/s' }],
    charts: [{ id: 'v', title: 'Velocity profiles', x: 't (s)', y: '°/s', series: [{ label: 'trapezoid (V given)' }, { label: 'minimum time' }, { label: 'cubic' }, { label: 'quintic' }] }, { id: 'a', title: 'Acceleration profiles', x: 't (s)', y: '°/s²', series: [{ label: 'trapezoid', stepped: true }, { label: 'minimum time', stepped: true }, { label: 'cubic' }, { label: 'quintic' }] }],
    autostart: false,
    reset(S) { S.tt = 0; },
    mt(p) { const m = M.traj.minTime(p.Dq, p.Vmax, p.amax); const tb = m.triangular ? m.tf / 2 : p.Vmax / p.amax; return Object.assign(m, { tb }); },
    profMin(p, t) { const m = this.mt(p); const a = p.amax, tf = m.tf, tb = m.tb, Vp = m.Vpeak; t = M.clamp(t, 0, tf); if (t < tb) return { q: 0.5 * a * t * t, qd: a * t, qdd: a }; if (t <= tf - tb) return { q: 0.5 * a * tb * tb + Vp * (t - tb), qd: Vp, qdd: 0 }; const r = tf - t; return { q: p.Dq - 0.5 * a * r * r, qd: a * r, qdd: -a }; },
    step(S, dt) { const tf = Math.max(S.p.tf, this.mt(S.p).tf); S.tt += dt; if (S.tt > tf + 0.6) S.tt = 0; },
    draw(S) {
      D.clear(S); const p = S.p, m = this.mt(p); const t = Math.min(S.tt || 0, p.mode === 'min' ? m.tf : p.tf);
      const prof = (k, tt) => k === 'trap' ? M.traj.lspb(0, p.Dq, p.tf, p.V, tt) : k === 'min' ? this.profMin(p, tt) : k === 'cubic' ? M.traj.cubic(0, p.Dq, p.tf, tt) : M.traj.quintic(0, p.Dq, p.tf, tt);
      const r = prof(p.mode, t); const x0 = 60, x1 = S.W - 60, y = S.H * 0.45;
      D.rect(S, x0 - 10, y + 16, x1 - x0 + 20, 10, '#6e7781'); for (let k = 0; k <= 6; k++) { const xx = x0 + (x1 - x0) * k / 6; D.line(S, xx, y + 26, xx, y + 34, C.muted, 1); D.text(S, M.fmt(p.Dq * k / 6, 0) + '°', xx, y + 46, { size: 10, align: 'center', color: C.muted }); }
      const cxp = x0 + (x1 - x0) * r.q / p.Dq; D.rect(S, cxp - 26, y - 22, 52, 38, '#6e7781', '#8c959f', 1.5, 5); D.arrow(S, cxp, y - 34, cxp + M.clamp(r.qd, -200, 200) * 1.2, y - 34, C.amber, 2.5); D.arrow(S, cxp, y - 50, cxp + M.clamp(r.qdd, -400, 400) * 0.4, y - 50, C.red, 2);
      D.text(S, 'velocity', cxp + 4, y - 38, { size: 10, color: C.amber }); D.text(S, 'acceleration', cxp + 4, y - 54, { size: 10, color: C.red });
      D.text(S, `t = ${M.fmt(t, 2)} s   q = ${M.fmt(r.q, 2)}°   q̇ = ${M.fmt(r.qd, 2)}°/s   q̈ = ${M.fmt(r.qdd, 2)}°/s²`, 16, 24, { size: 12.5, weight: 650 });
      const key = JSON.stringify([p.Dq, p.tf, p.V, p.Vmax, p.amax]); if (S._k !== key) { const tfm = Math.max(p.tf, m.tf); const V = [[], [], [], []], A = [[], [], [], []]; ['trap', 'min', 'cubic', 'quintic'].forEach((k, i) => { const tt = k === 'min' ? m.tf : p.tf; for (let j = 0; j <= 240; j++) { const ti = tfm * j / 240; const rr = ti <= tt ? prof(k, ti) : { qd: 0, qdd: 0 }; V[i].push([ti, rr.qd]); A[i].push([ti, rr.qdd]); } }); S.chart('v').setAll(V); S.chart('a').setAll(A); S._k = key; }
      const tr = M.traj.lspb(0, p.Dq, p.tf, p.V, 0); S.set('tb', tr.tb); S.set('a', tr.a); S.set('valid', tr.valid ? 'yes' : 'no — choose V in (' + M.fmt(p.Dq / p.tf, 2) + ', ' + M.fmt(2 * p.Dq / p.tf, 2) + ']', tr.valid ? 'ok' : 'bad');
      S.set('tmin', m.tf); S.set('shape', m.triangular ? `triangular (Δ < V_max²/a_max), peak ${M.fmt(m.Vpeak, 1)}°/s` : 'trapezoidal'); S.set('pk', `${M.fmt(1.5 * p.Dq / p.tf, 2)} / ${M.fmt(1.875 * p.Dq / p.tf, 2)}`);
    }
  });

  /* ================= Robot statics (Topic III.14) ================= */
  RIL.defineSim({
    id: 'robot-statics', title: 'Robot statics: joint torques from tip forces, τ = JᵀF', unit: 3, category: 'robot-dynamics', kind: '2d', auto: true, autoDefault: false,
    description: 'By the principle of virtual work the joint torques that balance a tip force are τ = JᵀF (3.27). Link weights add gravity torques. The free-body arrows, the torque at each joint and the static equilibrium check are shown for the 2R arm.',
    help: 'Set the joint angles, the tip force (magnitude and direction) and optionally the link weights. Drag on the canvas to point the force. Defaults reproduce Example 3.10: (30°, 45°), F = (0, −20) N → τ = (−10.21, −1.55) N·m.',
    controls: [
      { id: 't1', label: 'θ₁', min: -180, max: 180, step: 0.5, value: 30, unit: '°' }, { id: 't2', label: 'θ₂', min: -180, max: 180, step: 0.5, value: 45, unit: '°' },
      { id: 'F', label: 'Tip force magnitude |F|', min: 0, max: 50, step: 0.5, value: 20, unit: 'N' }, { id: 'dir', label: 'Force direction', min: -180, max: 180, step: 1, value: -90, unit: '°' },
      { id: 'm1', label: 'Link 1 mass (at mid-link)', min: 0, max: 10, step: 0.1, value: 0, unit: 'kg' }, { id: 'm2', label: 'Link 2 mass (at mid-link)', min: 0, max: 10, step: 0.1, value: 0, unit: 'kg' }
    ],
    readouts: [{ id: 'Fv', label: 'F = (F_x, F_y)', unit: 'N' }, { id: 'tF', label: 'τ from tip force JᵀF', unit: 'N·m' }, { id: 'tg', label: 'τ from gravity', unit: 'N·m' }, { id: 'tt', label: 'Total joint torque', unit: 'N·m' }, { id: 'vw', label: 'Virtual-work check τ·δq − F·δx' }],
    panels: [{ id: 'm', title: 'τ = Jᵀ F', wide: true }],
    onPointer(S, type, x, y) { if ((type === 'down' || type === 'drag') && S.tipPx) S.setParam('dir', Math.round(Math.atan2(-(y - S.tipPx[1]), x - S.tipPx[0]) * R2D), true); },
    step(S) { if (S.auto) S.setParam('dir', Math.round(((S.t * 40) % 360) - 180), true); },
    draw(S) {
      D.clear(S); const p = S.p, l1 = 0.5, l2 = 0.3, V = armView(S, 0.85), t1 = p.t1 * D2R, t2 = p.t2 * D2R, f = M.planar2R.fk(l1, l2, t1, t2), J = M.planar2R.jacobian(l1, l2, t1, t2);
      const F = [p.F * Math.cos(p.dir * D2R), p.F * Math.sin(p.dir * D2R)], tF = M.mat.mulVec(M.mat.T(J), F);
      const g = M.g0, c1 = Math.cos(t1), c12 = Math.cos(t1 + t2); const tg = [p.m1 * g * l1 / 2 * c1 + p.m2 * g * (l1 * c1 + l2 / 2 * c12), p.m2 * g * l2 / 2 * c12]; const tt = [tF[0] + tg[0], tF[1] + tg[1]];
      D.arm(S, V, [[0, 0], [f.ex, f.ey], [f.x, f.y]], { w: 13 }); S.tipPx = [V.X(f.x), V.Y(f.y)];
      D.arrow(S, V.X(f.x), V.Y(f.y), V.X(f.x) + F[0] * 4, V.Y(f.y) - F[1] * 4, C.red, 3, 11); D.text(S, `F = ${p.F} N`, V.X(f.x) + F[0] * 4 + 6, V.Y(f.y) - F[1] * 4, { size: 12, color: C.red, weight: 700 });
      [[0, 0, -tt[0], 'τ₁'], [f.ex, f.ey, -tt[1], 'τ₂']].forEach(([x, y, tq, n]) => { if (Math.abs(tq) < 1e-3) return; const gg = S.ctx; gg.strokeStyle = C.amber; gg.lineWidth = 3; const R = 22 + Math.min(20, Math.abs(tq)); gg.beginPath(); gg.arc(V.X(x), V.Y(y), R, -0.2, -0.2 - Math.sign(tq) * 2.2, tq > 0); gg.stroke(); D.text(S, `${n} = ${M.fmt(-tq, 2)} N·m`, V.X(x) + R + 4, V.Y(y) - R, { size: 11.5, color: C.amber, weight: 650 }); });
      if (p.m1 > 0) D.arrow(S, V.X(f.ex / 2), V.Y(f.ey / 2), V.X(f.ex / 2), V.Y(f.ey / 2) + p.m1 * 5, C.violet, 2); if (p.m2 > 0) D.arrow(S, V.X((f.ex + f.x) / 2), V.Y((f.ey + f.y) / 2), V.X((f.ex + f.x) / 2), V.Y((f.ey + f.y) / 2) + p.m2 * 5, C.violet, 2);
      D.text(S, 'joint torques shown are those the motors must supply to hold the arm in equilibrium against the external force (reaction F on the environment)', 14, S.H - 10, { size: 10.5, color: C.muted });
      const dq = [1e-4, -2e-4], dx = M.mat.mulVec(J, dq); const vw = tF[0] * dq[0] + tF[1] * dq[1] - (F[0] * dx[0] + F[1] * dx[1]);
      S.set('Fv', `(${M.fmt(F[0], 3)}, ${M.fmt(F[1], 3)})`); S.set('tF', `(${M.fmt(tF[0], 3)}, ${M.fmt(tF[1], 3)})`); S.set('tg', `(${M.fmt(tg[0], 3)}, ${M.fmt(tg[1], 3)})`); S.set('tt', `(${M.fmt(tt[0], 3)}, ${M.fmt(tt[1], 3)})`); S.set('vw', vw);
      RIL.setHTML(S.panel('m'), RIL.ui.vec(tF, 4, 'τ =') + RIL.ui.matrix(M.mat.T(J), 4, '= J<sup>T</sup> =') + RIL.ui.vec(F, 3, '·'), S, 'm');
    }
  });

  /* ================= Robot dynamics (Topic III.15) ================= */
  RIL.defineSim({
    id: 'robot-dynamics', title: 'Robot dynamics: two-link arm under applied joint torques', unit: 3, category: 'robot-dynamics', kind: '2d', auto: false,
    description: 'Forward dynamics of the two-link planar arm with point masses at the link ends: M(q)q̈ + C(q, q̇)q̇ + G(q) = τ (3.28) with the inertia, Coriolis/centrifugal and gravity terms of Section 3.15.3, integrated by RK4. With τ = 0 and no friction the total energy must stay constant — a check on the model and integrator.',
    help: 'Apply constant joint torques (or none) and release the arm from the initial pose. Watch how a torque at one joint accelerates both links (coupling through M), and how the arm swings under gravity. The energy readout should stay constant when torques and friction are zero.',
    controls: [
      { id: 'm1', label: 'Mass m₁', min: 0.1, max: 5, step: 0.1, value: 1, unit: 'kg' }, { id: 'm2', label: 'Mass m₂', min: 0.1, max: 5, step: 0.1, value: 1, unit: 'kg' },
      { id: 'l1', label: 'Length l₁', min: 0.2, max: 1, step: 0.01, value: 0.5, unit: 'm' }, { id: 'l2', label: 'Length l₂', min: 0.2, max: 1, step: 0.01, value: 0.3, unit: 'm' },
      { id: 'q10', label: 'Initial θ₁', min: -180, max: 180, step: 1, value: 0, unit: '°' }, { id: 'q20', label: 'Initial θ₂', min: -180, max: 180, step: 1, value: 90, unit: '°' },
      { id: 'tau1', label: 'Applied torque τ₁', min: -20, max: 20, step: 0.1, value: 0, unit: 'N·m' }, { id: 'tau2', label: 'Applied torque τ₂', min: -10, max: 10, step: 0.1, value: 0, unit: 'N·m' },
      { id: 'b', label: 'Joint viscous friction b', min: 0, max: 2, step: 0.01, value: 0, unit: 'N·m·s/rad' },
      { id: 'grav', type: 'toggle', label: 'Gravity (vertical plane)', value: true }
    ],
    readouts: [{ id: 'q', label: 'θ₁, θ₂', unit: '°' }, { id: 'qd', label: 'θ̇₁, θ̇₂', unit: 'rad/s' }, { id: 'qdd', label: 'θ̈₁, θ̈₂', unit: 'rad/s²' }, { id: 'E', label: 'Total energy K + P', unit: 'J' }, { id: 'dE', label: 'Energy drift since release', unit: 'J' }],
    panels: [{ id: 'm', title: 'Terms of M q̈ + C q̇ + G = τ at the current state', wide: true }],
    charts: [{ id: 'c', title: 'Joint motion', x: 't (s)', y: 'rad', series: [{ label: 'θ₁' }, { label: 'θ₂' }], window: 900 }, { id: 'e', title: 'Energy', x: 't (s)', y: 'J', series: [{ label: 'kinetic K' }, { label: 'potential P' }, { label: 'K + P' }], window: 900 }],
    autostart: false, substeps: 10,
    reset(S) { S.x = [S.p.q10 * D2R, S.p.q20 * D2R, 0, 0]; S.E0 = null; },
    onControl(S, id) { if (['q10', 'q20', 'm1', 'm2', 'l1', 'l2', 'grav'].includes(id)) { S.reset(); S.chart('c').clear(); S.chart('e').clear(); } },
    f(S) { const p = S.p, g = p.grav ? M.g0 : 0; return (t, x) => { const d = M.planar2R.dynamics(p.m1, p.m2, p.l1, p.l2, [x[0], x[1]], [x[2], x[3]], g); const rhs = [p.tau1 - p.b * x[2] - d.Cqd[0] - d.G[0], p.tau2 - p.b * x[3] - d.Cqd[1] - d.G[1]]; const qdd = M.mat.solve(d.M, rhs); return [x[2], x[3], qdd[0], qdd[1]]; }; },
    step(S, dt) { S.x = M.rk4(this.f(S), S.x, 0, dt); const p = S.p, en = M.planar2R.energy(p.m1, p.m2, p.l1, p.l2, [S.x[0], S.x[1]], [S.x[2], S.x[3]], p.grav ? M.g0 : 0); if (S.E0 === null) S.E0 = en.E; if (S.frameCount % 2 === 0) { S.chart('c').push(S.t, [S.x[0], S.x[1]]); S.chart('e').push(S.t, [en.K, en.P, en.E]); } },
    draw(S) {
      D.clear(S); const p = S.p, V = (() => { const R = (p.l1 + p.l2) * 1.1; const v = D.fit(S, [-R, R], [-R, R], 18); D.axes2(S, v, [-R, R], [-R, R], 0.2); return v; })();
      const f = M.planar2R.fk(p.l1, p.l2, S.x[0], S.x[1]); D.arm(S, V, [[0, 0], [f.ex, f.ey], [f.x, f.y]], { w: 8 }); D.circle(S, V.X(f.ex), V.Y(f.ey), 6 + 4 * p.m1, C.amber, '#24292f', 1); D.circle(S, V.X(f.x), V.Y(f.y), 6 + 4 * p.m2, C.amber, '#24292f', 1);
      const d = M.planar2R.dynamics(p.m1, p.m2, p.l1, p.l2, [S.x[0], S.x[1]], [S.x[2], S.x[3]], p.grav ? M.g0 : 0); const qdd = this.f(S)(0, S.x).slice(2);
      const en = M.planar2R.energy(p.m1, p.m2, p.l1, p.l2, [S.x[0], S.x[1]], [S.x[2], S.x[3]], p.grav ? M.g0 : 0);
      S.set('q', `${M.fmt(S.x[0] * R2D, 1)}, ${M.fmt(S.x[1] * R2D, 1)}`); S.set('qd', `${M.fmt(S.x[2], 3)}, ${M.fmt(S.x[3], 3)}`); S.set('qdd', `${M.fmt(qdd[0], 3)}, ${M.fmt(qdd[1], 3)}`); S.set('E', en.E); S.set('dE', S.E0 === null ? 0 : en.E - S.E0);
      RIL.setHTML(S.panel('m'), RIL.ui.matrix(d.M, 4, 'M(q) =') + RIL.ui.vec(d.Cqd, 4, 'C q̇ =') + RIL.ui.vec(d.G, 4, 'G(q) =') + RIL.ui.vec([p.tau1, p.tau2], 3, 'τ =') + RIL.ui.vec(qdd, 4, 'q̈ = M⁻¹(τ − Cq̇ − G − bq̇) ='), S, 'm');
    }
  });

  /* ================= Lagrangian formulation (Topic III.16) ================= */
  RIL.defineSim({
    id: 'lagrangian', title: 'Lagrangian formulation: energies and equations of motion', unit: 3, category: 'robot-dynamics', kind: '2d', auto: false,
    description: 'Generalised coordinates q, kinetic energy K, potential energy P, Lagrangian L = K − P and τᵢ = d/dt(∂L/∂q̇ᵢ) − ∂L/∂qᵢ (3.29). For a prescribed motion the required joint torques are computed: single link τ = I_O θ̈ + mgl_c cos θ (3.30), and the two-link arm with point masses (Example 3.12). These are simplified teaching models, not general 6-DOF robot dynamics.',
    help: 'Choose the model and prescribe the motion θ(t) = θ₀ + A sin ωt (A = 0 gives a static pose). The panel evaluates K, P, L and each term of the equation of motion at the current instant. Defaults reproduce Example 3.11 (m = 2 kg, l = 0.5 m, θ = 0 → holding torque 4.905 N·m).',
    controls: [
      { id: 'mod', type: 'select', label: 'Model', string: true, value: 'one', options: [['one', 'Single link (uniform rod about O)'], ['two', 'Two-link arm (point masses)']] },
      { id: 'm', label: 'Mass m (or m₁ = m₂)', min: 0.1, max: 5, step: 0.1, value: 2, unit: 'kg' }, { id: 'l', label: 'Length l (or l₁; l₂ = 0.6 l₁)', min: 0.1, max: 1, step: 0.01, value: 0.5, unit: 'm' },
      { id: 'q0', label: 'Mean angle θ₀ (θ₁)', min: -90, max: 90, step: 1, value: 0, unit: '°' }, { id: 'q20', label: 'Mean θ₂ (two-link)', min: -180, max: 180, step: 1, value: 90, unit: '°' },
      { id: 'A', label: 'Motion amplitude A', min: 0, max: 90, step: 1, value: 30, unit: '°' }, { id: 'w', label: 'Motion frequency ω', min: 0.1, max: 6, step: 0.1, value: 1.5, unit: 'rad/s' }
    ],
    readouts: [{ id: 'K', label: 'Kinetic energy K', unit: 'J' }, { id: 'P', label: 'Potential energy P', unit: 'J' }, { id: 'L', label: 'Lagrangian L = K − P', unit: 'J' }, { id: 'tau', label: 'Required torque τ', unit: 'N·m' }, { id: 'hold', label: 'Gravity (holding) part', unit: 'N·m' }, { id: 'in', label: 'Inertial part', unit: 'N·m' }],
    panels: [{ id: 'd', title: 'Lagrange equation evaluated now', wide: true }],
    charts: [{ id: 'c', title: 'Energies', x: 't (s)', y: 'J', series: [{ label: 'K' }, { label: 'P' }, { label: 'L = K − P' }], window: 700 }, { id: 't', title: 'Required joint torques', x: 't (s)', y: 'N·m', series: [{ label: 'τ₁' }, { label: 'τ₂' }], window: 700 }],
    autostart: true,
    st(S) { const p = S.p, w = p.w, s = Math.sin(w * S.t), c = Math.cos(w * S.t), A = p.A * D2R; return { q: [p.q0 * D2R + A * s, p.q20 * D2R + 0.5 * A * s], qd: [A * w * c, 0.5 * A * w * c], qdd: [-A * w * w * s, -0.5 * A * w * w * s] }; },
    calc(S) {
      const p = S.p, g = M.g0, st = this.st(S);
      if (p.mod === 'one') { const I = p.m * p.l * p.l / 3, lc = p.l / 2, th = st.q[0]; const K = 0.5 * I * st.qd[0] ** 2, P = p.m * g * lc * Math.sin(th); const hold = p.m * g * lc * Math.cos(th), inr = I * st.qdd[0]; return { K, P, tau: [hold + inr, NaN], hold: [hold], inr: [inr], I, st }; }
      const l1 = p.l, l2 = 0.6 * p.l, d = M.planar2R.dynamics(p.m, p.m, l1, l2, st.q, st.qd), e = M.planar2R.energy(p.m, p.m, l1, l2, st.q, st.qd); const Mq = M.mat.mulVec(d.M, st.qdd); return { K: e.K, P: e.P, tau: [Mq[0] + d.Cqd[0] + d.G[0], Mq[1] + d.Cqd[1] + d.G[1]], hold: d.G, inr: Mq, cq: d.Cqd, M: d.M, st, l1, l2 };
    },
    step(S) { const c = this.calc(S); if (S.frameCount % 2 === 0) { S.chart('c').push(S.t, [c.K, c.P, c.K - c.P]); S.chart('t').push(S.t, c.tau); } },
    draw(S) {
      D.clear(S); const p = S.p, c = this.calc(S), st = c.st; const R = p.l * 1.8, V = D.fit(S, [-R, R], [-R, R], 18); D.axes2(S, V, [-R, R], [-R, R], 0.2);
      if (p.mod === 'one') { const e = [p.l * Math.cos(st.q[0]), p.l * Math.sin(st.q[0])]; D.link(S, V.X(0), V.Y(0), V.X(e[0]), V.Y(e[1]), 14, '#9aa4af'); D.joint(S, V.X(0), V.Y(0), 9); D.circle(S, V.X(e[0] / 2), V.Y(e[1] / 2), 5, C.amber); D.arrow(S, V.X(e[0] / 2), V.Y(e[1] / 2), V.X(e[0] / 2), V.Y(e[1] / 2) + 40, C.violet, 2); D.text(S, 'mg at l_c = l/2', V.X(e[0] / 2) + 8, V.Y(e[1] / 2) + 40, { size: 11, color: C.violet }); }
      else { const f = M.planar2R.fk(c.l1, c.l2, ...st.q); D.arm(S, V, [[0, 0], [f.ex, f.ey], [f.x, f.y]], { w: 8 }); D.circle(S, V.X(f.ex), V.Y(f.ey), 9, C.amber); D.circle(S, V.X(f.x), V.Y(f.y), 9, C.amber); }
      S.set('K', c.K); S.set('P', c.P); S.set('L', c.K - c.P); S.set('tau', p.mod === 'one' ? M.fmt(c.tau[0], 4) : `(${M.fmt(c.tau[0], 3)}, ${M.fmt(c.tau[1], 3)})`); S.set('hold', p.mod === 'one' ? M.fmt(c.hold[0], 4) : `(${M.fmt(c.hold[0], 3)}, ${M.fmt(c.hold[1], 3)})`); S.set('in', p.mod === 'one' ? M.fmt(c.inr[0], 4) : `(${M.fmt(c.inr[0], 3)}, ${M.fmt(c.inr[1], 3)})`);
      const html = p.mod === 'one' ? `<div class="mono">q = θ = ${M.fmt(st.q[0] * R2D, 2)}°, θ̇ = ${M.fmt(st.qd[0], 3)} rad/s, θ̈ = ${M.fmt(st.qdd[0], 3)} rad/s²<br>K = ½ I_O θ̇², I_O = ml²/3 = ${M.fmt(c.I, 4)} kg·m² → K = ${M.fmt(c.K, 4)} J<br>P = m g l_c sin θ = ${M.fmt(c.P, 4)} J<br>∂L/∂θ̇ = I_O θ̇ → d/dt = I_O θ̈ = ${M.fmt(c.inr[0], 4)} N·m;  ∂L/∂θ = −m g l_c cos θ<br>τ = I_O θ̈ + m g l_c cos θ = ${M.fmt(c.inr[0], 4)} + ${M.fmt(c.hold[0], 4)} = <b>${M.fmt(c.tau[0], 4)} N·m</b>  (3.30)</div>`
        : RIL.ui.matrix(c.M, 4, 'M(q) =') + RIL.ui.vec(st.qdd, 3, 'q̈ =') + RIL.ui.vec(c.cq, 4, 'C q̇ =') + RIL.ui.vec(c.hold, 4, 'G =') + RIL.ui.vec(c.tau, 4, 'τ = Mq̈ + Cq̇ + G =') + '<p style="margin:.3em 0 0;color:#57606a">Set A = 0, θ₁ = 0°, θ₂ = 90°, m = 1, l = 0.5 to compare with Example 3.12 (which uses l₂ = 0.3 m and θ̈ = (1, 1)).</p>';
      RIL.setHTML(S.panel('d'), html, S, 'd');
    }
  });

  /* ================= Joint-space control (Topic III.17) ================= */
  RIL.defineSim({
    id: 'joint-control', title: 'Joint-space control: PD/PID and computed torque', unit: 3, category: 'robot-control', kind: '2d', auto: true, autoDefault: false,
    description: 'Independent joint control models one joint as J_eff q̈ + Bq̇ = τ − τ_d with τ = K_p e + K_i∫e + K_d ė, giving ωₙ = √(K_p/J), ζ = (B + K_d)/(2√(K_pJ)) (3.32). Computed-torque control τ = M(q̈_d + K_d ė + K_p e) + Cq̇ + G (3.34) is applied to the full two-link dynamics, with optional model error.',
    help: 'Independent mode: change the gains and watch overshoot and settling; the gravity disturbance leaves a steady error unless K_i > 0. Computed-torque mode: the 2R arm tracks a cubic trajectory; with an exact model both joints follow the reference closely; add model error to see degradation. Example 3.13: J = 3 × 10⁻⁴, ωₙ = 50, ζ = 1 → K_p = 0.75, K_d = 0.03.',
    controls: [
      { id: 'mode', type: 'select', label: 'Controller', string: true, value: 'pid', options: [['pid', 'Independent joint PD/PID (single joint)'], ['ct', 'Computed torque (two-link arm)']] },
      { id: 'Kp', label: 'K_p', min: 0, max: 3, step: 0.01, value: 0.75, unit: 'N·m/rad (×100 for CT)' }, { id: 'Kd', label: 'K_d', min: 0, max: 0.1, step: 0.001, value: 0.03, unit: 'N·m·s/rad (×100 for CT)' }, { id: 'Ki', label: 'K_i', min: 0, max: 20, step: 0.1, value: 0, unit: 'N·m/(rad·s)' },
      { id: 'J', label: 'Effective inertia J_eff', min: 0.5, max: 10, step: 0.1, value: 3, unit: '×10⁻⁴ kg·m²' },
      { id: 'dist', label: 'Constant disturbance τ_d (gravity)', min: 0, max: 0.1, step: 0.001, value: 0.02, unit: 'N·m' },
      { id: 'step', label: 'Set-point step / trajectory size', min: 5, max: 90, step: 1, value: 30, unit: '°' },
      { id: 'err', label: 'Model error (computed torque)', min: 0, max: 50, step: 1, value: 0, unit: '%' }
    ],
    readouts: [{ id: 'wn', label: 'ωₙ = √(K_p/J)', unit: 'rad/s' }, { id: 'z', label: 'ζ = (B + K_d)/(2√(K_pJ))' }, { id: 'e', label: 'Tracking error now', unit: '°' }, { id: 'ess', label: 'Steady-state error estimate', unit: '°' }, { id: 'mp', label: 'Overshoot', unit: '%' }, { id: 'u', label: 'Control torque', unit: 'N·m' }],
    charts: [{ id: 'c', title: 'Desired and actual joint position', x: 't (s)', y: '°', series: [{ label: 'desired q_d (joint 1)' }, { label: 'actual q (joint 1)' }, { label: 'desired joint 2' }, { label: 'actual joint 2' }], window: 900 }, { id: 'u', title: 'Control input', x: 't (s)', y: 'N·m', series: [{ label: 'τ₁' }, { label: 'τ₂' }], window: 900 }],
    substeps: 20,
    reset(S) { S.q = [0, 0]; S.qd = [0, 0]; S.I = [0, 0]; S.tt = 0; S.peak = 0; },
    onControl(S, id, v) { if (id === 'mode') { S.reset(); S.chart('c').clear(); S.chart('u').clear(); if (v === 'ct') { S.setParam('Kp', 1, true); S.setParam('Kd', 0.04, true); } else { S.setParam('Kp', 0.75, true); S.setParam('Kd', 0.03, true); } } },
    step(S, dt) {
      const p = S.p; S.tt += dt; const T = 4; const ph = S.tt % (2 * T), dir = ph < T ? 1 : 0;
      if (p.mode === 'pid') {
        const J = p.J * 1e-4, B = 1e-4, qd = dir * p.step * D2R; const e = qd - S.q[0]; S.I[0] = M.clamp(S.I[0] + e * dt, -1, 1); const u = M.clamp(p.Kp * e + p.Ki * S.I[0] - p.Kd * S.qd[0], -2, 2); S.u = [u, 0];
        const acc = (u - B * S.qd[0] - p.dist) / J; S.qd[0] += acc * dt; S.q[0] += S.qd[0] * dt; S.ref = [qd, NaN];
        if (dir && ph < 0.02) S.peak = 0; if (dir) S.peak = Math.max(S.peak, S.q[0]);
      } else {
        const m = 1, l1 = 0.5, l2 = 0.3, tf = 2; const tq = Math.min(ph % T, tf); const a = dir ? M.traj.cubic(0, p.step * D2R, tf, tq) : M.traj.cubic(p.step * D2R, 0, tf, tq); const b = dir ? M.traj.cubic(0, -p.step * D2R, tf, tq) : M.traj.cubic(-p.step * D2R, 0, tf, tq);
        const qdes = [a.q, b.q + PI / 2], qdd = [a.qd, b.qd], qdd2 = [a.qdd, b.qdd]; if (S.q[0] === 0 && S.q[1] === 0 && S.tt < 0.05) S.q = [0, PI / 2];
        const real = M.planar2R.dynamics(m, m, l1, l2, S.q, S.qd); const k = 1 - p.err / 100; const est = M.planar2R.dynamics(m * k, m * k, l1, l2, S.q, S.qd);
        const Kp = p.Kp * 100, Kd = p.Kd * 100; const e = [qdes[0] - S.q[0], qdes[1] - S.q[1]], ed = [qdd[0] - S.qd[0], qdd[1] - S.qd[1]];
        const v = [qdd2[0] + Kd * ed[0] + Kp * e[0], qdd2[1] + Kd * ed[1] + Kp * e[1]]; const Mv = M.mat.mulVec(est.M, v); const tau = [Mv[0] + est.Cqd[0] + est.G[0], Mv[1] + est.Cqd[1] + est.G[1]].map(x => M.clamp(x, -60, 60)); S.u = tau;
        const acc = M.mat.solve(real.M, [tau[0] - real.Cqd[0] - real.G[0], tau[1] - real.Cqd[1] - real.G[1]]); S.qd = S.qd.map((x, i) => x + acc[i] * dt); S.q = S.q.map((x, i) => x + S.qd[i] * dt); S.ref = qdes;
      }
      if (S.frameCount % 2 === 0 && Math.floor(S.tt / dt) % 1 === 0) S.chart('c').push(S.tt, [S.ref[0] * R2D, S.q[0] * R2D, p.mode === 'ct' ? S.ref[1] * R2D : NaN, p.mode === 'ct' ? S.q[1] * R2D : NaN]), S.chart('u').push(S.tt, S.u);
    },
    draw(S) {
      D.clear(S); const p = S.p;
      if (p.mode === 'pid') {
        const cx = S.W * 0.3, cy = S.H * 0.55, R = Math.min(130, S.H * 0.35); D.circle(S, cx, cy, R + 14, null, '#8c959f', 1);
        const ref = (S.ref ? S.ref[0] : 0); D.line(S, cx, cy, cx + Math.cos(-ref) * (R + 10), cy + Math.sin(-ref) * (R + 10), 'rgba(26,155,75,.7)', 2, [6, 4]); D.link(S, cx, cy, cx + Math.cos(-S.q[0]) * R, cy + Math.sin(-S.q[0]) * R, 16, '#9aa4af'); D.joint(S, cx, cy, 12);
        D.text(S, 'dashed: desired; link: actual (single joint, motor side)', 14, 22, { size: 11.5, color: C.muted });
        const J = p.J * 1e-4, B = 1e-4, wn = Math.sqrt(p.Kp / J), z = (B + p.Kd) / (2 * Math.sqrt(p.Kp * J)); S.set('wn', wn); S.set('z', z); S.set('e', ((S.ref ? S.ref[0] : 0) - S.q[0]) * R2D); S.set('ess', p.Ki > 0 ? 0 : -p.dist / Math.max(1e-9, p.Kp) * R2D); S.set('mp', S.peak > 0 ? Math.max(0, (S.peak - p.step * D2R) / (p.step * D2R) * 100) : 0); S.set('u', S.u ? S.u[0] : 0);
        D.box(S, S.W * 0.58, 30, Math.min(300, S.W * 0.38), 'Closed loop J ë + (B + K_d) ė + K_p e = τ_d', [['ωₙ', M.fmt(wn, 2) + ' rad/s'], ['ζ', M.fmt(z, 3)], ['2 % settling ≈ 4/(ζωₙ)', M.fmt(4 / (z * wn), 3) + ' s'], ['Steady error (P/PD)', M.fmt(-p.dist / Math.max(1e-9, p.Kp) * R2D, 3) + '°']]);
      } else {
        const V = armView(S, 0.85), f = M.planar2R.fk(0.5, 0.3, ...S.q); if (S.ref) { const fr = M.planar2R.fk(0.5, 0.3, ...S.ref); D.poly(S, [[V.X(0), V.Y(0)], [V.X(fr.ex), V.Y(fr.ey)], [V.X(fr.x), V.Y(fr.y)]], null, 'rgba(26,155,75,.6)', 3, false); }
        D.arm(S, V, [[0, 0], [f.ex, f.ey], [f.x, f.y]], { w: 12 }); D.text(S, 'green: desired configuration; arm: actual (full nonlinear dynamics)', 14, 22, { size: 11.5, color: C.muted });
        const Kp = p.Kp * 100, Kd = p.Kd * 100; S.set('wn', Math.sqrt(Kp)); S.set('z', Kd / (2 * Math.sqrt(Kp))); S.set('e', S.ref ? `(${M.fmt((S.ref[0] - S.q[0]) * R2D, 3)}, ${M.fmt((S.ref[1] - S.q[1]) * R2D, 3)})` : '—'); S.set('ess', p.err ? 'non-zero (model error)' : '≈ 0 (exact model)'); S.set('mp', '—'); S.set('u', S.u ? `(${M.fmt(S.u[0], 2)}, ${M.fmt(S.u[1], 2)})` : '—');
      }
    }
  });

  /* ================= Task-space control (Topic III.18) ================= */
  RIL.defineSim({
    id: 'task-space-control', title: 'Task-space control: Jacobian-transpose position control', unit: 3, category: 'robot-control', kind: '2d', auto: true, autoDefault: false,
    description: 'The end effector is driven towards a Cartesian target by τ = Jᵀ(K_p e_x − K_d ẋ) + G (3.35): a virtual spring-damper pulls the tool, and gravity is compensated. The two-link dynamics (3.28) are simulated; target and actual Cartesian coordinates are compared.',
    help: 'Click or drag to place the target. Raise K_p to reach faster; raise K_d to remove oscillation. Switch off gravity compensation to see the static error caused by the arm\'s weight. Automatic mode moves the target around a square.',
    controls: [
      { id: 'tx', label: 'Target x', min: -0.8, max: 0.8, step: 0.01, value: 0.4, unit: 'm' }, { id: 'ty', label: 'Target y', min: -0.6, max: 0.8, step: 0.01, value: 0.45, unit: 'm' },
      { id: 'Kp', label: 'Cartesian stiffness K_p', min: 0, max: 800, step: 5, value: 200, unit: 'N/m' }, { id: 'Kd', label: 'Cartesian damping K_d', min: 0, max: 60, step: 0.5, value: 15, unit: 'N·s/m' },
      { id: 'gc', type: 'toggle', label: 'Gravity compensation + G', value: true }
    ],
    readouts: [{ id: 'xd', label: 'Target (x, y)', unit: 'm' }, { id: 'x', label: 'Actual (x, y)', unit: 'm' }, { id: 'e', label: 'Position error |e_x|', unit: 'mm' }, { id: 'tau', label: 'Joint torques', unit: 'N·m' }, { id: 'F', label: 'Virtual force K_p e_x − K_d ẋ', unit: 'N' }],
    charts: [{ id: 'c', title: 'Target and actual Cartesian coordinates', x: 't (s)', y: 'm', series: [{ label: 'x target', stepped: true }, { label: 'y target', stepped: true }, { label: 'x actual' }, { label: 'y actual' }], window: 900 }],
    substeps: 20,
    reset(S) { S.q = [0.2, 1.4]; S.qd = [0, 0]; S.trail = []; },
    onPointer(S, type, x, y) { if ((type === 'down' || type === 'drag') && S.V) { const [a, b] = S.V.inv(x, y); S.setParam('tx', +a.toFixed(2), true); S.setParam('ty', +b.toFixed(2), true); } },
    step(S, dt) {
      const p = S.p, l1 = 0.5, l2 = 0.3, m = 1; if (S.auto) { const k = Math.floor(S.t / 3) % 4; S.setParam('tx', [0.4, -0.3, -0.3, 0.4][k], true); S.setParam('ty', [0.45, 0.45, 0.1, 0.1][k], true); }
      const d = M.planar2R.dynamics(m, m, l1, l2, S.q, S.qd); const J = M.planar2R.jacobian(l1, l2, ...S.q); const f = M.planar2R.fk(l1, l2, ...S.q); const xd = M.mat.mulVec(J, S.qd);
      const F = [p.Kp * (p.tx - f.x) - p.Kd * xd[0], p.Kp * (p.ty - f.y) - p.Kd * xd[1]]; let tau = M.mat.mulVec(M.mat.T(J), F); if (p.gc) tau = tau.map((v, i) => v + d.G[i]); tau = tau.map((v, i) => v - 0.05 * S.qd[i]);
      const acc = M.mat.solve(d.M, [tau[0] - d.Cqd[0] - d.G[0], tau[1] - d.Cqd[1] - d.G[1]]); S.qd = S.qd.map((v, i) => M.clamp(v + acc[i] * dt, -30, 30)); S.q = S.q.map((v, i) => v + S.qd[i] * dt);
      S.F = F; S.tau = tau; S.f = f; if (S.frameCount % 2 === 0) { S.chart('c').push(S.t, [p.tx, p.ty, f.x, f.y]); S.trail.push([f.x, f.y]); if (S.trail.length > 300) S.trail.shift(); }
    },
    draw(S) {
      D.clear(S); const p = S.p, V = S.V = armView(S, 0.85), f = M.planar2R.fk(0.5, 0.3, ...S.q);
      D.poly(S, S.trail.map(q => [V.X(q[0]), V.Y(q[1])]), null, 'rgba(199,119,0,.6)', 1.5, false); D.arm(S, V, [[0, 0], [f.ex, f.ey], [f.x, f.y]], { w: 12 });
      D.spring(S, V.X(f.x), V.Y(f.y), V.X(p.tx), V.Y(p.ty), 7, 5, 'rgba(11,127,193,.7)');
      D.circle(S, V.X(p.tx), V.Y(p.ty), 9, null, C.green, 2.5); D.text(S, 'target', V.X(p.tx) + 12, V.Y(p.ty) - 8, { size: 11, color: C.green });
      const reach = Math.hypot(p.tx, p.ty) <= 0.8 && Math.hypot(p.tx, p.ty) >= 0.2; if (!reach) D.text(S, 'Target outside the workspace — the arm stretches towards it (boundary singularity)', 14, 22, { size: 12, color: C.red, weight: 700 });
      S.set('xd', `(${M.fmt(p.tx, 3)}, ${M.fmt(p.ty, 3)})`); S.set('x', `(${M.fmt(f.x, 3)}, ${M.fmt(f.y, 3)})`); S.set('e', Math.hypot(p.tx - f.x, p.ty - f.y) * 1000); S.set('tau', S.tau ? `(${M.fmt(S.tau[0], 2)}, ${M.fmt(S.tau[1], 2)})` : '—'); S.set('F', S.F ? `(${M.fmt(S.F[0], 2)}, ${M.fmt(S.F[1], 2)})` : '—');
    }
  });
})();
