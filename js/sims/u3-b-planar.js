/* Unit III — planar manipulator laboratories: 2-DOF forward kinematics, inverse kinematics (analytical + numerical),
   velocity kinematics and Jacobian, singularities (3D), workspace of the planar 3R arm */
(function () {
  const RIL = window.RIL, M = RIL.M, D = RIL.draw, C = RIL.C, D2R = M.D2R, R2D = M.R2D, PI = Math.PI;
  const K = () => RIL.three;
  const ellipse = (S, V, cxw, cyw, J, scale, col) => { // velocity ellipse: image of unit joint-velocity circle
    const pts = []; for (let k = 0; k <= 60; k++) { const a = 2 * PI * k / 60, q = [Math.cos(a), Math.sin(a)]; const v = M.mat.mulVec(J, q); pts.push([V.X(cxw + v[0] * scale), V.Y(cyw + v[1] * scale)]); } D.poly(S, pts, 'rgba(196,164,255,.12)', col || C.violet, 1.5);
  };

  /* ================= Forward kinematics, 2-DOF planar (Topic III.5A) ================= */
  RIL.defineSim({
    id: 'fk-2dof', title: '2-DOF planar manipulator: forward kinematics', unit: 3, category: 'forward-kinematics', kind: '2d', auto: true, autoDefault: false,
    description: 'x = l₁c₁ + l₂c₁₂, y = l₁s₁ + l₂s₁₂, φ = θ₁ + θ₂ (3.11). Link lengths and joint angles are adjustable; the configuration, frames, end-effector coordinates and the substituted equations update together.',
    help: 'Drag the joint sliders (or the tip of the arm — the analytic inverse finds matching angles). Defaults reproduce Example 3.4: l₁ = 0.5 m, l₂ = 0.3 m, θ = (30°, 45°) → (0.5107, 0.5398) m, φ = 75°.',
    controls: [
      { id: 'l1', label: 'Link length l₁', min: 0.1, max: 1, step: 0.01, value: 0.5, unit: 'm' }, { id: 'l2', label: 'Link length l₂', min: 0.1, max: 1, step: 0.01, value: 0.3, unit: 'm' },
      { id: 't1', label: 'Joint angle θ₁', min: -180, max: 180, step: 0.5, value: 30, unit: '°' }, { id: 't2', label: 'Joint angle θ₂', min: -180, max: 180, step: 0.5, value: 45, unit: '°' },
      { id: 'frames', type: 'toggle', label: 'Show link frames', value: true }, { id: 'trace', type: 'toggle', label: 'Trace end-effector path', value: true }
    ],
    readouts: [{ id: 'x', label: 'x', unit: 'm' }, { id: 'y', label: 'y', unit: 'm' }, { id: 'phi', label: 'φ = θ₁ + θ₂', unit: '°' }, { id: 'r', label: 'Reach √(x² + y²)', unit: 'm' }, { id: 'ex', label: 'Elbow (l₁c₁, l₁s₁)', unit: 'm' }],
    panels: [{ id: 'eq', title: 'Forward kinematics with current values', wide: true }],
    equations: ['x=l_1c_1+l_2c_{12},\\;y=l_1s_1+l_2s_{12},\\;\\phi=\\theta_1+\\theta_2\\;(3.11)', '{}^{0}T_2=\\begin{bmatrix}c_{12}&-s_{12}&0&x\\\\s_{12}&c_{12}&0&y\\\\0&0&1&0\\\\0&0&0&1\\end{bmatrix}'],
    reset(S) { S.trail = []; },
    onPointer(S, type, px, py) { if ((type === 'down' || type === 'drag') && S.V) { const [x, y] = S.V.inv(px, py); const r = M.planar2R.ik(S.p.l1, S.p.l2, x, y); if (r.reachable) { const s = r.sols[S.p.t2 >= 0 ? 0 : 1]; S.setParam('t1', +(s.t1 * R2D).toFixed(1), true); S.setParam('t2', +(s.t2 * R2D).toFixed(1), true); } } },
    step(S) { if (S.auto) { S.setParam('t1', +(40 * Math.sin(0.5 * S.t) + 30).toFixed(1), true); S.setParam('t2', +(60 * Math.sin(0.8 * S.t) + 40).toFixed(1), true); } },
    draw(S) {
      D.clear(S); const p = S.p, Lt = p.l1 + p.l2; const V = S.V = D.fit(S, [-Lt * 1.1, Lt * 1.1], [-Lt * 1.1, Lt * 1.1], 24); D.axes2(S, V, [-Lt * 1.1, Lt * 1.1], [-Lt * 1.1, Lt * 1.1], Lt > 1 ? 0.2 : 0.1);
      D.circle(S, V.X(0), V.Y(0), Lt * V.s, null, 'rgba(76,194,255,.25)', 1); D.circle(S, V.X(0), V.Y(0), Math.abs(p.l1 - p.l2) * V.s, null, 'rgba(76,194,255,.25)', 1);
      const t1 = p.t1 * D2R, t2 = p.t2 * D2R, f = M.planar2R.fk(p.l1, p.l2, t1, t2);
      if (p.trace) { const l = S.trail[S.trail.length - 1]; if (!l || Math.hypot(l[0] - f.x, l[1] - f.y) > 0.003) { S.trail.push([f.x, f.y]); if (S.trail.length > 600) S.trail.shift(); } D.poly(S, S.trail.map(q => [V.X(q[0]), V.Y(q[1])]), null, 'rgba(242,165,22,.6)', 1.5, false); }
      D.arm(S, V, [[0, 0], [f.ex, f.ey], [f.x, f.y]], { w: 14 });
      if (p.frames) { D.frame2(S, V.X(0), V.Y(0), 0, 36, '{0}'); D.frame2(S, V.X(f.ex), V.Y(f.ey), t1, 30, '{1}'); D.frame2(S, V.X(f.x), V.Y(f.y), t1 + t2, 30, '{2}'); }
      const g = S.ctx; g.strokeStyle = C.green; g.lineWidth = 1.5; g.beginPath(); g.arc(V.X(0), V.Y(0), 40, 0, -t1, t1 > 0); g.stroke(); D.text(S, 'θ₁', V.X(0) + 46 * Math.cos(t1 / 2), V.Y(0) - 46 * Math.sin(t1 / 2), { size: 11, color: C.green });
      g.beginPath(); g.arc(V.X(f.ex), V.Y(f.ey), 30, -t1, -(t1 + t2), t2 > 0); g.stroke(); D.text(S, 'θ₂', V.X(f.ex) + 36 * Math.cos(t1 + t2 / 2), V.Y(f.ey) - 36 * Math.sin(t1 + t2 / 2), { size: 11, color: C.green });
      D.text(S, `(${M.fmt(f.x, 4)}, ${M.fmt(f.y, 4)})`, V.X(f.x) + 10, V.Y(f.y) - 10, { size: 12, weight: 700, color: C.cyan });
      S.set('x', f.x, ''); S.set('y', f.y); S.set('phi', (t1 + t2) * R2D); S.set('r', Math.hypot(f.x, f.y)); S.set('ex', `(${M.fmt(f.ex, 4)}, ${M.fmt(f.ey, 4)})`);
      const c1 = Math.cos(t1), s1 = Math.sin(t1), c12 = Math.cos(t1 + t2), s12 = Math.sin(t1 + t2);
      RIL.setHTML(S.panel('eq'), `<div class="mono">x = l₁cos θ₁ + l₂cos(θ₁+θ₂) = ${p.l1}·${M.fmt(c1, 4)} + ${p.l2}·${M.fmt(c12, 4)} = <b>${M.fmt(f.x, 4)} m</b><br>y = l₁sin θ₁ + l₂sin(θ₁+θ₂) = ${p.l1}·${M.fmt(s1, 4)} + ${p.l2}·${M.fmt(s12, 4)} = <b>${M.fmt(f.y, 4)} m</b><br>φ = ${p.t1}° + ${p.t2}° = <b>${M.fmt(p.t1 + p.t2, 1)}°</b></div>` + RIL.ui.matrix(M.mat.mul(M.homog(M.rotZ(t1), [0, 0, 0]), M.mat.mul(M.transl(p.l1, 0, 0), M.mat.mul(M.homog(M.rotZ(t2), [0, 0, 0]), M.transl(p.l2, 0, 0)))), 4, '<sup>0</sup>T<sub>2</sub> = A₁A₂ ='), S, 'eq');
    }
  });

  /* ================= Inverse kinematics (Topic III.6) ================= */
  RIL.defineSim({
    id: 'ik-lab', title: 'Inverse kinematics laboratory', unit: 3, category: 'inverse-kinematics', kind: '2d', auto: true, autoDefault: false,
    description: 'Click a target. The geometric solution c₂ = (x² + y² − l₁² − l₂²)/(2l₁l₂) (3.14), θ₁ = atan2(y, x) − atan2(l₂s₂, l₁ + l₂c₂) (3.15) gives both elbow-up and elbow-down branches; a numerical damped-least-squares solver (Section 3.6.5) iterates from the current pose. Unreachable targets (|c₂| > 1) are detected and reported.',
    help: 'Click or drag anywhere to place the target (green). Choose the solution method and branch; the arm animates to the solution and the position error is computed by forward kinematics of the result. Defaults reproduce Example 3.6: target (0.5, 0.4) → θ₂ = ±76.51°, θ₁ = 11.56° / 65.76°.',
    controls: [
      { id: 'l1', label: 'Link length l₁', min: 0.1, max: 1, step: 0.01, value: 0.5, unit: 'm' }, { id: 'l2', label: 'Link length l₂', min: 0.1, max: 1, step: 0.01, value: 0.3, unit: 'm' },
      { id: 'x', label: 'Target x', min: -1.2, max: 1.2, step: 0.005, value: 0.5, unit: 'm' }, { id: 'y', label: 'Target y', min: -1.2, max: 1.2, step: 0.005, value: 0.4, unit: 'm' },
      { id: 'meth', type: 'select', label: 'Method', string: true, value: 'ana', options: [['ana', 'Analytical (geometric, 3.14–3.15)'], ['num', 'Numerical (damped least squares)']] },
      { id: 'br', type: 'select', label: 'Branch (analytical)', value: 0, options: [[0, 'Elbow down (θ₂ > 0)'], [1, 'Elbow up (θ₂ < 0)']] },
      { id: 'lam', label: 'DLS damping λ (numerical)', min: 0.001, max: 0.5, step: 0.001, value: 0.05 }
    ],
    readouts: [{ id: 'D', label: 'c₂ = D' }, { id: 'reach', label: 'Reachable?' }, { id: 's1', label: 'Solution 1 (θ₁, θ₂)', unit: '°' }, { id: 's2', label: 'Solution 2 (θ₁, θ₂)', unit: '°' }, { id: 'q', label: 'Current joint angles', unit: '°' }, { id: 'err', label: 'Position error |x_d − FK(q)|', unit: 'mm' }, { id: 'it', label: 'Numerical iterations' }],
    charts: [{ id: 'c', title: 'Numerical IK convergence (log error)', x: 'iteration', y: 'error (m)', yType: 'logarithmic', series: [{ label: '|e|' }] }],
    reset(S) { S.q = [20 * D2R, 60 * D2R]; S.goal = null; S.iters = 0; },
    onPointer(S, type, px, py) { if ((type === 'down' || type === 'drag') && S.V) { const [x, y] = S.V.inv(px, py); S.setParam('x', +x.toFixed(3), true); S.setParam('y', +y.toFixed(3), true); this.solve(S); } },
    onControl(S) { this.solve(S); },
    step(S, dt) {
      if (S.auto) { const a = 0.6 * S.t; S.setParam('x', +(0.45 * Math.cos(a) + 0.15 * Math.cos(3 * a)).toFixed(3), true); S.setParam('y', +(0.45 * Math.sin(a) + 0.2).toFixed(3), true); this.solve(S); }
      if (!S.goal) this.solve(S); const g = S.goal; if (!g) return; const k = Math.min(1, dt * 4); S.q = S.q.map((v, i) => v + M.wrapPi(g[i] - v) * k);
    },
    solve(S) {
      const p = S.p, r = M.planar2R.ik(p.l1, p.l2, p.x, p.y); S.ik = r;
      if (p.meth === 'ana') { S.goal = r.reachable ? [r.sols[+p.br].t1, r.sols[+p.br].t2] : null; S.hist = null; }
      else { const tbl = [{ a: p.l1, alpha: 0, d: 0, type: 'R' }, { a: p.l2, alpha: 0, d: 0, type: 'R' }]; let q = S.q.slice(); const hist = []; let it = 0; for (; it < 200; it++) { const { T } = M.fkDH(tbl, q); const e = [p.x - T[2][0][3], p.y - T[2][1][3]]; const en = Math.hypot(...e); hist.push([it, Math.max(en, 1e-12)]); if (en < 1e-6) break; const J = M.planar2R.jacobian(p.l1, p.l2, q[0], q[1]); const dq = M.mat.mulVec(M.mat.dls(J, p.lam), e); q = q.map((v, i) => v + dq[i]); } S.goal = q; S.hist = hist; S.iters = it; S.chart('c').set(0, hist); }
    },
    draw(S) {
      D.clear(S); const p = S.p, Lt = p.l1 + p.l2, R = Math.max(1.0, Lt * 1.1); const V = S.V = D.fit(S, [-R, R], [-R, R], 20); D.axes2(S, V, [-R, R], [-R, R], 0.2);
      const g = S.ctx; g.fillStyle = 'rgba(76,194,255,.07)'; g.beginPath(); g.arc(V.X(0), V.Y(0), Lt * V.s, 0, 2 * PI); g.arc(V.X(0), V.Y(0), Math.abs(p.l1 - p.l2) * V.s, 0, 2 * PI, true); g.fill(); D.text(S, 'reachable workspace |l₁ − l₂| ≤ r ≤ l₁ + l₂', V.X(0) - Lt * V.s * 0.6, V.Y(0) + Lt * V.s + 14, { size: 10.5, color: C.cyan });
      const r = S.ik || M.planar2R.ik(p.l1, p.l2, p.x, p.y);
      if (r.reachable) r.sols.forEach((s, i) => { const f = M.planar2R.fk(p.l1, p.l2, s.t1, s.t2); D.poly(S, [[V.X(0), V.Y(0)], [V.X(f.ex), V.Y(f.ey)], [V.X(f.x), V.Y(f.y)]], null, i === +p.br ? 'rgba(242,165,22,.5)' : 'rgba(196,164,255,.5)', 2, false); D.circle(S, V.X(f.ex), V.Y(f.ey), 4, null, i ? C.violet : C.amber, 1.5); });
      const f = M.planar2R.fk(p.l1, p.l2, S.q[0], S.q[1]); D.arm(S, V, [[0, 0], [f.ex, f.ey], [f.x, f.y]], { w: 13 });
      D.circle(S, V.X(p.x), V.Y(p.y), 9, null, r.reachable ? C.green : C.red, 2.5); D.line(S, V.X(p.x) - 13, V.Y(p.y), V.X(p.x) + 13, V.Y(p.y), r.reachable ? C.green : C.red, 1.5); D.line(S, V.X(p.x), V.Y(p.y) - 13, V.X(p.x), V.Y(p.y) + 13, r.reachable ? C.green : C.red, 1.5);
      if (!r.reachable) D.text(S, `Target unreachable: |c₂| = ${M.fmt(Math.abs(r.D), 3)} > 1 — ${Math.hypot(p.x, p.y) > Lt ? 'beyond maximum reach' : 'inside the inner hole'}. ${p.meth === 'num' ? 'DLS returns the closest pose.' : ''}`, 16, 22, { size: 12.5, weight: 700, color: C.red });
      else D.text(S, 'amber ghost: selected branch; violet ghost: other branch', 16, 22, { size: 11, color: C.muted });
      const err = Math.hypot(p.x - f.x, p.y - f.y) * 1000;
      S.set('D', r.D); S.set('reach', r.reachable ? 'yes' : 'no', r.reachable ? 'ok' : 'bad'); S.set('s1', r.reachable ? `${M.fmt(r.sols[0].t1 * R2D, 2)}, ${M.fmt(r.sols[0].t2 * R2D, 2)}` : '—'); S.set('s2', r.reachable ? `${M.fmt(r.sols[1].t1 * R2D, 2)}, ${M.fmt(r.sols[1].t2 * R2D, 2)}` : '—');
      S.set('q', `${M.fmt(M.wrapPi(S.q[0]) * R2D, 2)}, ${M.fmt(M.wrapPi(S.q[1]) * R2D, 2)}`); S.set('err', err); S.set('it', p.meth === 'num' ? S.iters : '—');
    }
  });

  /* ================= Velocity kinematics and Jacobian (Topics III.7, III.8) ================= */
  RIL.defineSim({
    id: 'velocity-jacobian', title: 'Velocity kinematics and the Jacobian', unit: 3, category: 'jacobian', kind: '2d', auto: true, autoDefault: false,
    description: 'Joint rates θ̇ map to end-effector velocity ẋ = J(θ)θ̇ (3.17) with J = [−l₁s₁ − l₂s₁₂, −l₂s₁₂; l₁c₁ + l₂c₁₂, l₂c₁₂] and det J = l₁l₂s₂ (3.18). The angular velocity of the tool is ω = θ̇₁ + θ̇₂. In inverse mode a desired Cartesian velocity is converted to joint rates θ̇ = J⁻¹ẋ.',
    help: 'Forward mode: set the joint velocities and press Start; the arm moves and the Cartesian velocity arrow is J θ̇. The violet ellipse is the image of all unit joint-rate vectors (manipulability ellipse). Inverse mode: set ẋ and see the joint rates needed — they blow up near det J = 0. Defaults: Example 3.7 (30°, 45°; θ̇ = (0.5, −0.2) → ẋ = (−0.2119, 0.2398) m/s).',
    controls: [
      { id: 'mode', type: 'select', label: 'Mode', string: true, value: 'fwd', options: [['fwd', 'Forward: θ̇ → ẋ = Jθ̇'], ['inv', 'Inverse: ẋ → θ̇ = J⁻¹ẋ']] },
      { id: 'l1', label: 'l₁', min: 0.1, max: 1, step: 0.01, value: 0.5, unit: 'm' }, { id: 'l2', label: 'l₂', min: 0.1, max: 1, step: 0.01, value: 0.3, unit: 'm' },
      { id: 't1', label: 'θ₁ (initial)', min: -180, max: 180, step: 0.5, value: 30, unit: '°' }, { id: 't2', label: 'θ₂ (initial)', min: -180, max: 180, step: 0.5, value: 45, unit: '°' },
      { id: 'd1', label: 'θ̇₁ | ẋ', min: -1, max: 1, step: 0.01, value: 0.5, unit: 'rad/s | m/s' }, { id: 'd2', label: 'θ̇₂ | ẏ', min: -1, max: 1, step: 0.01, value: -0.2, unit: 'rad/s | m/s' }
    ],
    readouts: [{ id: 'v', label: 'End-effector velocity ẋ', unit: 'm/s' }, { id: 'sp', label: 'Speed |ẋ|', unit: 'm/s' }, { id: 'w', label: 'Angular velocity ω = θ̇₁ + θ̇₂', unit: 'rad/s' }, { id: 'qd', label: 'Joint rates θ̇', unit: 'rad/s' }, { id: 'det', label: 'det J = l₁l₂ sin θ₂', unit: 'm²' }, { id: 'man', label: 'Manipulability √det(JJᵀ)' }],
    panels: [{ id: 'm', title: 'Matrix relationship', wide: true }],
    charts: [{ id: 'c', title: 'Joint and Cartesian velocities', x: 'time (s)', y: 'velocity', series: [{ label: 'θ̇₁ (rad/s)' }, { label: 'θ̇₂ (rad/s)' }, { label: 'ẋ (m/s)' }, { label: 'ẏ (m/s)' }], window: 600 }],
    reset(S) { S.q = [S.p.t1 * D2R, S.p.t2 * D2R]; },
    onControl(S, id) { if (id === 't1' || id === 't2' || id === 'mode') S.reset(); if (id === 'mode') { const lbl = S.p.mode === 'inv' ? ['ẋ (desired)', 'ẏ (desired)'] : ['θ̇₁', 'θ̇₂']; ['d1', 'd2'].forEach((k, i) => S.inputs[k].el.parentElement.querySelector('label span').textContent = lbl[i]); S.setParam('d1', S.p.mode === 'inv' ? 0.1 : 0.5, true); S.setParam('d2', S.p.mode === 'inv' ? 0 : -0.2, true); } },
    rates(S) { const p = S.p, J = M.planar2R.jacobian(p.l1, p.l2, S.q[0], S.q[1]); if (p.mode === 'fwd') { const qd = [p.d1, p.d2]; return { J, qd, v: M.mat.mulVec(J, qd) }; } const Ji = M.mat.inv(J); const v = [p.d1, p.d2]; const qd = Ji ? M.mat.mulVec(Ji, v) : [NaN, NaN]; return { J, qd: qd.map(x => M.clamp(x, -50, 50)), v, Ji }; },
    step(S, dt) { const r = this.rates(S); S.q = S.q.map((v, i) => v + r.qd[i] * dt * (S.p.mode === 'inv' ? 0.5 : 1)); const f = M.planar2R.fk(S.p.l1, S.p.l2, ...S.q); if (Math.hypot(f.x, f.y) > S.p.l1 + S.p.l2 - 1e-3 || Math.abs(Math.sin(S.q[1])) < 0.02) { S.reset(); } S.chart('c').push(S.t, [r.qd[0], r.qd[1], ...(S.p.mode === 'inv' ? r.v.map(x => x * 0.5) : r.v)]); },
    draw(S) {
      D.clear(S); const p = S.p, Lt = p.l1 + p.l2, R = Lt * 1.1; const V = D.fit(S, [-R, R], [-R, R], 20); D.axes2(S, V, [-R, R], [-R, R], 0.2);
      const r = this.rates(S), f = M.planar2R.fk(p.l1, p.l2, ...S.q); D.arm(S, V, [[0, 0], [f.ex, f.ey], [f.x, f.y]], { w: 13 });
      ellipse(S, V, f.x, f.y, r.J, 0.25); const sc = 0.4;
      D.arrow(S, V.X(f.x), V.Y(f.y), V.X(f.x + r.v[0] * sc), V.Y(f.y + r.v[1] * sc), C.amber, 3, 10); D.text(S, 'ẋ', V.X(f.x + r.v[0] * sc) + 6, V.Y(f.y + r.v[1] * sc), { size: 13, color: C.amber, weight: 700 });
      const arcR = (x, y, w, col) => { if (Math.abs(w) < 1e-3) return; const g = S.ctx; g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(V.X(x), V.Y(y), 24, -0.3, -0.3 - M.clamp(w, -3, 3) * 1.4, w > 0); g.stroke(); };
      arcR(0, 0, r.qd[0], C.green); arcR(f.ex, f.ey, r.qd[1], C.cyan); D.text(S, 'θ̇₁', V.X(0) + 28, V.Y(0) - 22, { size: 11, color: C.green }); D.text(S, 'θ̇₂', V.X(f.ex) + 28, V.Y(f.ey) - 22, { size: 11, color: C.cyan });
      const det = p.l1 * p.l2 * Math.sin(S.q[1]); const man = Math.sqrt(Math.abs(M.mat.det(M.mat.mul(r.J, M.mat.T(r.J)))));
      if (Math.abs(det) < 0.01) D.text(S, 'Near singularity: det J ≈ 0 — the ellipse collapses to a line', 16, 22, { size: 12.5, weight: 700, color: C.red });
      S.set('v', `(${M.fmt(r.v[0], 4)}, ${M.fmt(r.v[1], 4)})`); S.set('sp', Math.hypot(...r.v)); S.set('w', r.qd[0] + r.qd[1]); S.set('qd', `(${M.fmt(r.qd[0], 4)}, ${M.fmt(r.qd[1], 4)})`); S.set('det', det, Math.abs(det) < 0.01 ? 'bad' : ''); S.set('man', man);
      RIL.setHTML(S.panel('m'), (p.mode === 'fwd' ? RIL.ui.vec(r.v, 4, 'ẋ =') + RIL.ui.matrix(r.J, 4, '= J =') + RIL.ui.vec(r.qd, 3, '·') : RIL.ui.vec(r.qd, 4, 'θ̇ =') + (r.Ji ? RIL.ui.matrix(r.Ji, 3, '= J⁻¹ =') : '<span>J singular</span>') + RIL.ui.vec(r.v, 3, '·')) + `<p style="margin:.4em 0 0;color:#8fa3c4">J computed at θ = (${M.fmt(S.q[0] * R2D, 1)}°, ${M.fmt(S.q[1] * R2D, 1)}°); columns are the tip velocities produced by unit rate of each joint.</p>`, S, 'm');
    }
  });

  /* ================= Singularities (Topic III.9) — 3D ================= */
  const SING = { none: ['Regular configuration', [20, 40, -50, 30, 50, 0]], wrist: ['Wrist singularity (θ₅ = 0: axes 4 and 6 aligned)', [20, 40, -50, 30, 0, 0]], elbow: ['Elbow / boundary singularity (arm fully stretched, θ₃ = 0)', [20, 40, 0, 30, 50, 0]], shoulder: ['Shoulder singularity (wrist centre on axis 1)', [0, 70, 42.63, 0, 50, 0]] };
  RIL.defineSim({
    id: 'singularity', title: 'Robot singularities in 3D', unit: 3, category: 'jacobian', kind: '3d', auto: true, autoDefault: false,
    description: 'The 6 × 6 geometric Jacobian (columns [ẑ_{i−1} × (o_n − o_{i−1}); ẑ_{i−1}], 3.19) of the 6-DOF arm is evaluated live. Its determinant, its smallest singular-value estimate and the direction that is lost are shown as the arm is moved into and out of wrist, elbow (boundary) and shoulder singularities.',
    help: 'Pick a configuration or press Automatic to sweep the wrist pitch θ₅ through zero. At a singularity det J → 0: some Cartesian direction cannot be produced, and the joint rates needed for a small Cartesian move become very large (see the joint-rate readout for a 10 mm/s motion).',
    camera: { position: [1.8, -1.9, 1.4], target: [0.3, 0, 0.6] },
    controls: [
      { id: 'pre', type: 'select', label: 'Configuration preset', string: true, value: 'none', options: Object.entries(SING).map(([k, v]) => [k, v[0]]) },
      { id: 'q3', label: 'Elbow θ₃', min: -150, max: 150, step: 0.5, value: -50, unit: '°' },
      { id: 'q5', label: 'Wrist pitch θ₅', min: -120, max: 120, step: 0.5, value: 50, unit: '°' },
      { id: 'q1', label: 'Waist θ₁', min: -170, max: 170, step: 0.5, value: 20, unit: '°' },
      { id: 'q2', label: 'Shoulder θ₂', min: -90, max: 150, step: 0.5, value: 40, unit: '°' }
    ],
    readouts: [{ id: 'det', label: 'det J (6 × 6)' }, { id: 'smin', label: 'Smallest singular value σ_min' }, { id: 'cond', label: 'Condition number σ_max/σ_min' }, { id: 'qd', label: 'Max joint rate for 10 mm/s in x', unit: 'rad/s' }, { id: 'state', label: 'State' }],
    charts: [{ id: 'c', title: 'Distance from singularity while sweeping', x: 'time (s)', y: '|det J| and σ_min', series: [{ label: '|det J| ×100' }, { label: 'σ_min' }], window: 600 }],
    setup(S) { const k = K(); S.rob = new k.DHRobot(S.three.scene, k.ROBOTS.sixR.table, { radius: 0.04, frames: false }); S.ax = [3, 5].map(() => { const l = k.polyline([[0, 0, 0], [0, 0, 1]], 0xff7b7b); S.three.scene.add(l); return l; }); S.lost = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.3, 0xff7b7b, 0.06, 0.03); S.three.scene.add(S.lost); S.lbl = S.three.label('lost direction', [0, 0, 0], ''); },
    onControl(S, id, v) { if (id === 'pre') { const q = SING[v][1]; ['q1', 'q2', 'q3', null, 'q5'].forEach((k, i) => k && S.setParam(k, q[i], true)); } },
    step(S) { if (S.auto) S.setParam('q5', +(60 * Math.sin(0.5 * S.t)).toFixed(1), true); },
    sv(J) { // singular values via eigenvalues of JᵀJ (Jacobi rotations)
      const A = M.mat.mul(M.mat.T(J), J), n = A.length; for (let sweep = 0; sweep < 40; sweep++) { let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { off += A[i][j] ** 2; if (Math.abs(A[i][j]) < 1e-14) continue; const th = 0.5 * Math.atan2(2 * A[i][j], A[j][j] - A[i][i]), c = Math.cos(th), s = Math.sin(th); for (let k = 0; k < n; k++) { const aik = A[i][k], ajk = A[j][k]; A[i][k] = c * aik - s * ajk; A[j][k] = s * aik + c * ajk; } for (let k = 0; k < n; k++) { const aki = A[k][i], akj = A[k][j]; A[k][i] = c * aki - s * akj; A[k][j] = s * aki + c * akj; } } if (off < 1e-20) break; }
      return A.map((r, i) => Math.sqrt(Math.max(0, r[i]))).sort((a, b) => a - b);
    },
    draw(S) {
      const k = K(), tb = k.ROBOTS.sixR.table, q = [S.p.q1, S.p.q2, S.p.q3, 30, S.p.q5, 0].map(v => v * D2R); const T = S.rob.update(q);
      const J = M.jacobianGeo(tb, q), det = M.mat.det(J), sv = this.sv(J), smin = sv[0], smax = sv[sv.length - 1];
      [3, 5].forEach((i, n) => { const o = M.pof(T[i]), z = [T[i][0][2], T[i][1][2], T[i][2][2]]; k.updateLine(S.ax[n], [M.v3.sub(o, M.v3.scale(z, 0.4)), M.v3.add(o, M.v3.scale(z, 0.4))]); });
      // lost direction: null vector of Jᵀ approximated by least-produced Cartesian linear direction among axes
      const p6 = M.pof(T[6]); const Jl = J.slice(0, 3); const JJt = M.mat.mul(Jl, M.mat.T(Jl)); let best = [1, 0, 0], bv = Infinity; for (let a = 0; a < 40; a++) for (let b = 0; b < 20; b++) { const th = a / 40 * PI, ph = b / 20 * PI - PI / 2, u = [Math.cos(ph) * Math.cos(th), Math.cos(ph) * Math.sin(th), Math.sin(ph)]; const val = M.v3.dot(u, M.mat.mulVec(JJt, u)); if (val < bv) { bv = val; best = u; } }
      const sing = smin < 0.02; S.lost.visible = S.lbl.visible = sing; S.lost.position.set(...p6); S.lost.setDirection(new THREE.Vector3(...best)); S.lbl.pos = M.v3.add(p6, M.v3.scale(best, 0.35));
      const Ji = M.mat.inv(J); const qd = Ji ? Math.max(...M.mat.mulVec(Ji, [0.01, 0, 0, 0, 0, 0]).map(Math.abs)) : Infinity;
      S.set('det', det); S.set('smin', smin); S.set('cond', smin > 1e-9 ? smax / smin : Infinity); S.set('qd', qd); S.set('state', sing ? 'singular / near-singular: lost DOF' : 'regular', sing ? 'bad' : 'ok');
      if (S.running) S.chart('c').push(S.t, [Math.abs(det) * 100, smin]);
    }
  });

  /* ================= Workspace of planar 3R (Topic III.10) ================= */
  RIL.defineSim({
    id: 'workspace-3r', title: 'Reachable and dexterous workspace', unit: 3, category: 'jacobian', kind: '2d', auto: false,
    description: 'Monte-Carlo sampling of joint space of a planar 3R arm gives the reachable workspace; the dexterous workspace (any tool orientation) is |L₁ − L₂| + L₃ ≤ r ≤ L₁ + L₂ − L₃ (3.21) when all joints rotate fully. Joint limits and link lengths reshape both regions.',
    help: 'Change link lengths and joint limits; the sampled points (amber) show where the wrist tip can go. Rings mark the theoretical dexterous annulus (green) when no joint limits apply. Press Start to animate the arm through random reachable configurations.',
    controls: [
      { id: 'L1', label: 'L₁', min: 0.1, max: 1, step: 0.01, value: 0.4, unit: 'm' }, { id: 'L2', label: 'L₂', min: 0.1, max: 1, step: 0.01, value: 0.3, unit: 'm' }, { id: 'L3', label: 'L₃ (tool)', min: 0.02, max: 0.5, step: 0.01, value: 0.1, unit: 'm' },
      { id: 'lim1', label: 'θ₁ range ±', min: 10, max: 180, step: 1, value: 180, unit: '°' }, { id: 'lim2', label: 'θ₂ range ±', min: 10, max: 180, step: 1, value: 180, unit: '°' }, { id: 'lim3', label: 'θ₃ range ±', min: 10, max: 180, step: 1, value: 180, unit: '°' },
      { id: 'n', label: 'Samples', min: 500, max: 20000, step: 500, value: 6000 }
    ],
    readouts: [{ id: 'rmax', label: 'Max reach L₁ + L₂ + L₃', unit: 'm' }, { id: 'rmin', label: 'Min reach (sampled)', unit: 'm' }, { id: 'dex', label: 'Dexterous annulus (3.21)', unit: 'm' }, { id: 'area', label: 'Reachable area (estimate)', unit: 'm²' }],
    autostart: false,
    reset(S) { S.pose = [0.3, 0.5, -0.4]; S.target = S.pose.slice(); },
    step(S, dt) { const p = S.p; if (S.pose.every((v, i) => Math.abs(v - S.target[i]) < 0.01)) S.target = [p.lim1, p.lim2, p.lim3].map(l => (Math.random() * 2 - 1) * l * D2R); S.pose = S.pose.map((v, i) => v + (S.target[i] - v) * Math.min(1, dt * 2)); },
    draw(S) {
      D.clear(S); const p = S.p, L = [p.L1, p.L2, p.L3], Lt = L[0] + L[1] + L[2], V = D.fit(S, [-Lt * 1.08, Lt * 1.08], [-Lt * 1.08, Lt * 1.08], 20); D.axes2(S, V, [-Lt * 1.08, Lt * 1.08], [-Lt * 1.08, Lt * 1.08], 0.2);
      const key = JSON.stringify(p); if (S._k !== key) { const r = M.rng(5), pts = []; let rmin = Infinity; for (let i = 0; i < p.n; i++) { const th = [p.lim1, p.lim2, p.lim3].map(l => (r() * 2 - 1) * l * D2R); const f = M.planarFK(L, th); pts.push([f.x, f.y]); rmin = Math.min(rmin, Math.hypot(f.x, f.y)); } S.pts = pts; S.rmin = rmin;
        const G = 60, cell = 2 * Lt / G, occ = new Set(); pts.forEach(q => occ.add(Math.floor((q[0] + Lt) / cell) + ',' + Math.floor((q[1] + Lt) / cell))); S.area = occ.size * cell * cell; S._k = key; }
      const g = S.ctx; g.fillStyle = 'rgba(242,165,22,.45)'; S.pts.forEach(q => g.fillRect(V.X(q[0]) - 1, V.Y(q[1]) - 1, 2, 2));
      const full = p.lim1 >= 180 && p.lim2 >= 180 && p.lim3 >= 180; const din = Math.abs(L[0] - L[1]) + L[2], dout = L[0] + L[1] - L[2];
      if (full && dout > din) { D.circle(S, V.X(0), V.Y(0), din * V.s, null, C.green, 2); D.circle(S, V.X(0), V.Y(0), dout * V.s, null, C.green, 2); D.text(S, 'dexterous annulus', V.X(0) + dout * V.s * 0.7, V.Y(0) - dout * V.s * 0.72, { size: 11, color: C.green }); }
      D.circle(S, V.X(0), V.Y(0), Lt * V.s, null, 'rgba(76,194,255,.6)', 1.5, 1);
      const f = M.planarFK(L, S.pose); D.arm(S, V, f.pts, { w: 10 });
      S.set('rmax', Lt); S.set('rmin', S.rmin); S.set('dex', full && dout > din ? `${M.fmt(din, 3)} ≤ r ≤ ${M.fmt(dout, 3)}` : 'none / limited by joint ranges'); S.set('area', S.area);
    }
  });
})();
