/* Unit II — actuators: electric / pneumatic / hydraulic comparison, DC, servo, stepper, BLDC, solenoid and linear actuators */
(function () {
  const RIL = window.RIL, M = RIL.M, D = RIL.draw, C = RIL.C, D2R = M.D2R, R2D = M.R2D, PI = Math.PI;
  const relabel = (S, id, lbl, min, max, step, val) => { const i = S.inputs[id]; if (!i) return; i.el.min = min; i.el.max = max; i.el.step = step; const n = i.el.nextElementSibling; n.min = min; n.max = max; n.step = step; i.el.parentElement.querySelector('label span').textContent = lbl; S.setParam(id, val, true); };

  /* ================= Actuator families (Topic II.1) ================= */
  RIL.defineSim({
    id: 'actuator-comparison', title: 'Electric, pneumatic and hydraulic actuators', unit: 2, category: 'actuators', kind: '2d', auto: true, autoDefault: true,
    description: 'Complete energy-conversion chains: compressor–FRL–5/2 valve–cylinder (F = ηpA, 2.1), pump–relief valve–4/3 valve–cylinder (F = pA, v = Q/A, P = pQ, 2.3–2.5) and supply–drive–motor–ball screw (F = 2πηT/p, v = pn, 2.19), all pushing the same load.',
    help: 'Switch technology and command the valve (or drive) to extend, hold or retract. If the load exceeds the available force the actuator stalls. Defaults: Example 2.1 (50 mm bore, 20 mm rod, 6 bar, η = 0.9) and Example 2.2 (80 mm bore, 10 MPa, 20 L/min).',
    controls: [
      { id: 'tech', type: 'select', label: 'Actuator technology', string: true, value: 'pneu', options: [['elec', 'Electrical (servo motor + ball screw)'], ['pneu', 'Pneumatic cylinder'], ['hyd', 'Hydraulic cylinder']] },
      { id: 'cmd', type: 'select', label: 'Valve / drive command', string: true, value: 'ext', options: [['ext', 'Extend'], ['hold', 'Hold (centre / off)'], ['ret', 'Retract']] },
      { id: 'p', label: 'Supply: pressure (bar) | motor torque (N·m)', min: 1, max: 10, step: 0.1, value: 6 },
      { id: 'D', label: 'Bore D (mm) | screw lead p (mm)', min: 10, max: 120, step: 1, value: 50 },
      { id: 'Q', label: 'Flow (L/min) | motor speed (rpm)', min: 1, max: 100, step: 1, value: 20 },
      { id: 'load', label: 'External load force', min: 0, max: 60000, step: 10, value: 400, unit: 'N' }
    ],
    readouts: [{ id: 'F', label: 'Available force (extend)', unit: 'N' }, { id: 'Fr', label: 'Retract force', unit: 'N' }, { id: 'v', label: 'Speed', unit: 'm/s' }, { id: 'P', label: 'Power', unit: 'W' }, { id: 'air', label: 'Air / energy per cycle' }, { id: 'st', label: 'State' }],
    charts: [{ id: 'c', title: 'Piston / carriage position', x: 'time (s)', y: 'stroke (mm)', series: [{ label: 'position' }], window: 600 }],
    reset(S) { S.x = 0; S.dir = 1; },
    onControl(S, id, v) {
      if (id !== 'tech') return; S.reset();
      if (v === 'hyd') { relabel(S, 'p', 'Supply pressure (MPa)', 1, 25, 0.1, 10); relabel(S, 'D', 'Bore D (mm)', 20, 160, 1, 80); relabel(S, 'Q', 'Pump flow Q (L/min)', 1, 100, 1, 20); relabel(S, 'load', 'External load force (N)', 0, 200000, 100, 20000); }
      else if (v === 'pneu') { relabel(S, 'p', 'Supply pressure (bar gauge)', 1, 10, 0.1, 6); relabel(S, 'D', 'Bore D (mm)', 10, 120, 1, 50); relabel(S, 'Q', 'Valve flow (L/min free air)', 10, 600, 5, 200); relabel(S, 'load', 'External load force (N)', 0, 5000, 10, 400); }
      else { relabel(S, 'p', 'Motor torque T (N·m)', 0.05, 5, 0.01, 0.5); relabel(S, 'D', 'Ball-screw lead p (mm)', 2, 40, 1, 10); relabel(S, 'Q', 'Motor speed n (rpm)', 10, 3000, 10, 1500); relabel(S, 'load', 'External load force (N)', 0, 2000, 5, 200); }
    },
    calc(S) {
      const p = S.p, stroke = 0.2;
      if (p.tech === 'pneu') { const r = M.act.pneumatic(0.9, p.p * 1e5, p.D / 1000, 0.4 * p.D / 1000); const qs = p.Q / 60000 * 101300 / (p.p * 1e5 + 101300); return { F: r.Fext, Fr: r.Fret, v: qs / r.A, P: r.Fext * qs / r.A, extra: M.fmt(M.act.freeAir(r.A, r.a, stroke, p.p * 1e5) * 1000, 2) + ' L free air', stroke }; }
      if (p.tech === 'hyd') { const r = M.act.hydraulic(p.p * 1e6, p.D / 1000, p.Q / 60000); const a = PI * (0.5 * p.D / 1000) ** 2 / 4; return { F: r.F, Fr: p.p * 1e6 * (r.A - a), v: r.v, P: r.P, extra: M.fmt(r.P * stroke / r.v / 1000, 2) + ' kJ per stroke', stroke }; }
      const r = M.act.screw(p.p, p.D / 1000, 0.9, p.Q / 60); return { F: r.F, Fr: r.F, v: r.v, P: p.p * p.Q * 2 * PI / 60, extra: M.fmt(p.p * p.Q * 2 * PI / 60 * stroke / r.v, 1) + ' J per stroke', stroke };
    },
    step(S, dt) {
      const c = this.calc(S), p = S.p; let dir = p.cmd === 'ext' ? 1 : p.cmd === 'ret' ? -1 : 0;
      if (S.auto) { dir = S.dir; if (S.x >= c.stroke - 1e-4) S.dir = -1; if (S.x <= 1e-4) S.dir = 1; dir = S.dir; }
      const Favail = dir > 0 ? c.F : c.Fr; S.stall = dir > 0 && p.load >= Favail; const vEff = S.stall ? 0 : c.v * (dir > 0 ? Math.sqrt(Math.max(0, 1 - p.load / Favail)) : 1);
      S.x = M.clamp(S.x + dir * vEff * dt, 0, c.stroke); S.dirNow = dir; S.chart('c').push(S.t, [S.x * 1000]);
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, c = this.calc(S), cy = H * 0.55, x = S.x || 0, flow = S.dirNow || 0;
      const blocks = p.tech === 'pneu' ? ['Compressor\n+ receiver', 'FRL unit\nfilter·regulator·lubricator', '5/2 DCV\nsolenoid valve'] : p.tech === 'hyd' ? ['Pump +\nreservoir', 'Relief valve\npressure limit', '4/3 DCV\nclosed centre'] : ['Mains / DC\nsupply', 'Servo drive\n(PWM H-bridge)', 'Servo motor\n+ encoder'];
      const bw = Math.min(118, (W - 380) / 3), col = { pneu: C.cyan, hyd: C.amber, elec: C.green }[p.tech];
      blocks.forEach((b, i) => { D.block(S, 16 + i * (bw + 20), cy - 36, bw, 72, b, { stroke: col, size: 10.5 }); if (i < 2) D.arrow(S, 16 + i * (bw + 20) + bw, cy, 16 + (i + 1) * (bw + 20), cy, col, 2); });
      const x0 = 16 + 3 * (bw + 20), Lc = Math.max(160, W - x0 - 160), sc = Lc * 0.75 / c.stroke;
      // energy pulses
      for (let k = 0; k < 6; k++) { const f = ((S.t * 0.8 + k / 6) % 1); if (flow) D.circle(S, 16 + f * (x0 - 16), cy + 44, 3, col); }
      if (p.tech === 'elec') {
        D.rect(S, x0, cy - 8, Lc, 16, '#3b4f75', '#8fa3c4', 1, 3); for (let k = 0; k < Lc; k += 8) D.line(S, x0 + k + ((S.x || 0) * 3000 % 8), cy - 8, x0 + k + 4 + ((S.x || 0) * 3000 % 8), cy + 8, '#8fa3c4', 1);
        D.rect(S, x0 + 10 + x * sc, cy - 26, 60, 52, '#6f86ad', '#c9d6ec', 1.5, 4); D.text(S, 'nut / carriage', x0 + 40 + x * sc, cy + 42, { size: 10, align: 'center', color: C.muted });
      } else {
        D.rect(S, x0, cy - 34, Lc * 0.85, 68, '#13264a', '#c9d6ec', 2, 4);
        const px = x0 + 8 + x * sc; D.rect(S, x0 + 2, cy - 32, px - x0 - 2, 64, p.tech === 'hyd' ? 'rgba(242,165,22,.35)' : 'rgba(76,194,255,.25)'); D.rect(S, px, cy - 32, 12, 64, '#8aa0c6', '#fff', 1); D.rect(S, px + 12, cy - 7, Lc * 0.85 - (px - x0) + 20, 14, '#c9d6ec');
        D.text(S, 'A (cap end)', x0 + 6, cy - 40, { size: 10, color: C.muted }); D.text(S, 'A − a (rod end)', x0 + Lc * 0.85 - 4, cy - 40, { size: 10, color: C.muted, align: 'right' });
      }
      const rodEnd = p.tech === 'elec' ? x0 + 70 + x * sc : x0 + Lc * 0.85 + 32 + x * sc;
      D.rect(S, Math.min(W - 60, rodEnd), cy - 30, 44, 60, '#5a3f2a', C.amber, 1.5, 4); D.text(S, 'load', Math.min(W - 60, rodEnd) + 22, cy + 4, { size: 10, align: 'center' });
      D.arrow(S, Math.min(W - 20, rodEnd + 90), cy - 46, Math.min(W - 16, rodEnd + 50), cy - 46, C.red, 2.5); D.text(S, `${p.load} N`, Math.min(W - 20, rodEnd + 70), cy - 54, { size: 11, color: C.red, align: 'center' });
      const eq = { pneu: 'F_ext = ηpA, F_ret = ηp(A − a)  (2.1);  free air (2A − a)s(p + p_a)/p_a  (2.2)', hyd: 'F = pA, v = Q/A, P = pQ  (2.3)–(2.5)', elec: 'F = 2πηT/p, v = p·n  (2.19)' }[p.tech];
      D.text(S, eq, 16, 24, { size: 12 }); D.text(S, S.stall ? 'STALLED: load exceeds available force' : '', 16, 44, { size: 12, color: C.red, weight: 700 });
      S.set('F', c.F); S.set('Fr', c.Fr); S.set('v', c.v); S.set('P', c.P); S.set('air', c.extra); S.set('st', S.stall ? 'stalled' : S.dirNow > 0 ? 'extending' : S.dirNow < 0 ? 'retracting' : 'holding', S.stall ? 'bad' : '');
    }
  });

  /* ================= DC motor (Topic II.2) ================= */
  const SLOW = 0.05; // simulated seconds per real second at 1× (slow motion)
  RIL.defineSim({
    id: 'dc-motor', title: 'Permanent-magnet DC motor', unit: 2, category: 'actuators', kind: '2d', auto: true, autoDefault: false,
    description: 'Stator magnets, rotor armature, commutator and brushes with current direction and electromagnetic torque. The state equations v_a = R_a i_a + L_a di_a/dt + K_b ω (2.8) and J dω/dt = K_t i_a − Bω − T_L are integrated with RK4; the speed–torque line (2.11) and time constants (2.10) are shown.',
    help: 'Change the applied voltage and the load torque and watch current, speed and torque settle. Time runs in slow motion (1/20). Automatic mode applies a load step every few milliseconds of motor time. Defaults: Examples 2.3 and 2.4 (24 V, 1.2 Ω, K = 0.05, T_L = 0.2 N·m → 4 A, 384 rad/s, η = 80 %).',
    controls: [
      { id: 'Va', label: 'Applied voltage V_a', min: -30, max: 30, step: 0.1, value: 24, unit: 'V' },
      { id: 'TL', label: 'Load torque T_L', min: 0, max: 1.2, step: 0.005, value: 0.2, unit: 'N·m' },
      { id: 'Ra', label: 'Armature resistance R_a', min: 0.2, max: 5, step: 0.01, value: 1.2, unit: 'Ω' },
      { id: 'La', label: 'Armature inductance L_a', min: 0.1, max: 5, step: 0.05, value: 0.5, unit: 'mH' },
      { id: 'K', label: 'Torque / back-EMF constant K_t = K_b', min: 0.01, max: 0.2, step: 0.001, value: 0.05, unit: 'N·m/A' },
      { id: 'J', label: 'Rotor inertia J', min: 0.5, max: 50, step: 0.5, value: 2, unit: '×10⁻⁵ kg·m²' },
      { id: 'B', label: 'Viscous friction B', min: 0, max: 50, step: 0.5, value: 0, unit: '×10⁻⁶ N·m·s' }
    ],
    readouts: [{ id: 'ia', label: 'Armature current i_a', unit: 'A' }, { id: 'w', label: 'Speed ω', unit: 'rad/s' }, { id: 'rpm', label: 'Speed', unit: 'rpm' }, { id: 'Eb', label: 'Back-EMF E_b = K_b ω', unit: 'V' }, { id: 'T', label: 'Torque T = K_t i_a', unit: 'N·m' }, { id: 'eta', label: 'Efficiency (steady state)', unit: '%' }, { id: 'tau', label: 'τ_e, τ_m', unit: 'ms' }],
    charts: [{ id: 'tr', title: 'Transient response', x: 'motor time (ms)', y: 'ω (rad/s) | i_a ×20 (A)', series: [{ label: 'ω (rad/s)' }, { label: '20 × i_a (A)' }], window: 900 },
      { id: 'st', title: 'Steady-state speed–torque line (2.11)', x: 'torque (N·m)', y: 'speed (rad/s)', series: [{ label: 'ω(T)' }, { label: 'operating point', points: true, line: false }, { label: 'output power ×1 (W)' }] }],
    equations: ['v_a=R_ai_a+L_a\\frac{di_a}{dt}+K_b\\omega\\;(2.8)', 'J\\dot\\omega=K_ti_a-B\\omega-T_L', '\\omega=\\frac{V_a}{K_b}-\\frac{R_a}{K_tK_b}T\\;(2.11)', '\\tau_e=L_a/R_a,\\;\\tau_m=JR_a/(K_tK_b)\\;(2.10)'],
    substeps: 20,
    reset(S) { S.x = [0, 0, 0]; S.tm = 0; },
    par(S) { const p = S.p; return { Va: p.Va, Ra: p.Ra, La: p.La / 1000, Kt: p.K, Kb: p.K, J: p.J * 1e-5, B: p.B * 1e-6, TL: Math.sign(S.x ? S.x[1] : 1) * p.TL * (Math.abs(S.x ? S.x[1] : 0) > 1e-6 || Math.abs(p.K * (S.x ? S.x[0] : 0)) > p.TL ? 1 : 0) }; },
    step(S, dt) {
      const h = dt * SLOW; const P = this.par(S);
      if (S.auto) { const ph = Math.floor(S.tm * 1000 / 40) % 2; S.setParam('TL', ph ? 0.4 : 0.1, true); }
      // load torque opposes motion; at standstill it holds unless motor torque exceeds it (static model)
      const f = (t, x) => { const TL = Math.abs(x[1]) > 1e-3 ? Math.sign(x[1]) * P.TL : M.clamp(P.Kt * x[0], -Math.abs(S.p.TL), Math.abs(S.p.TL)); return [(P.Va - P.Ra * x[0] - P.Kb * x[1]) / P.La, (P.Kt * x[0] - P.B * x[1] - (Math.abs(x[1]) > 1e-3 ? Math.sign(x[1]) * S.p.TL : TL)) / P.J, x[1]]; };
      S.x = M.rk4(f, S.x, 0, h); S.tm += h;
      S.chart('tr').push(S.tm * 1000, [S.x[1], 20 * S.x[0]]);
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, [ia, w, th] = S.x; const cx = W * 0.3, cy = H * 0.5, R = Math.min(W * 0.22, H * 0.4);
      // stator
      const g = S.ctx; D.circle(S, cx, cy, R, '#22355c', '#8fa3c4', 2);
      g.fillStyle = '#c0392b'; g.beginPath(); g.arc(cx, cy, R * 0.92, PI * 0.72, PI * 1.28); g.arc(cx, cy, R * 0.72, PI * 1.28, PI * 0.72, true); g.fill(); D.text(S, 'N', cx - R * 0.83, cy + 5, { size: 15, weight: 800, align: 'center' });
      g.fillStyle = '#2f6fd6'; g.beginPath(); g.arc(cx, cy, R * 0.92, -PI * 0.28, PI * 0.28); g.arc(cx, cy, R * 0.72, PI * 0.28, -PI * 0.28, true); g.fill(); D.text(S, 'S', cx + R * 0.83, cy + 5, { size: 15, weight: 800, align: 'center' });
      for (let k = -2; k <= 2; k++) D.arrow(S, cx - R * 0.68, cy + k * R * 0.15, cx + R * 0.66, cy + k * R * 0.15, 'rgba(255,255,255,.12)', 1, 6);
      // rotor with conductors; current direction fixed in space by commutator
      D.circle(S, cx, cy, R * 0.62, '#3b4f75', '#c9d6ec', 1.5);
      const nc = 12; for (let k = 0; k < nc; k++) { const a = th + k * 2 * PI / nc; const px = cx + Math.cos(a) * R * 0.52, py = cy + Math.sin(a) * R * 0.52; const side = Math.cos(a) > 0 ? 1 : -1; const s = Math.abs(ia) < 0.05 ? 0 : side * Math.sign(ia); D.circle(S, px, py, 7, s > 0 ? C.amber : s < 0 ? C.cyan : '#6f86ad', '#fff', 1); if (s > 0) D.circle(S, px, py, 2, '#0e1d38'); else if (s < 0) { D.line(S, px - 3, py - 3, px + 3, py + 3, '#0e1d38', 1.5); D.line(S, px - 3, py + 3, px + 3, py - 3, '#0e1d38', 1.5); } }
      D.circle(S, cx, cy, R * 0.18, '#b87333', '#fff', 1); for (let k = 0; k < 8; k++) { const a = th + k * PI / 4; D.line(S, cx, cy, cx + Math.cos(a) * R * 0.18, cy + Math.sin(a) * R * 0.18, '#3b2a1a', 1.5); }
      D.rect(S, cx - 6, cy - R * 0.18 - 14, 12, 12, '#333'); D.rect(S, cx - 6, cy + R * 0.18 + 2, 12, 12, '#333');
      if (Math.abs(ia) > 0.05) { D.arrow(S, cx + R * 0.35, cy - R * 0.7, cx - R * 0.35, cy - R * 0.7, C.green, 2.5); D.text(S, `T = K_t i_a = ${M.fmt(p.K * ia, 3)} N·m`, cx, cy - R - 10, { size: 11, align: 'center', color: C.green }); }
      D.text(S, '● current out of page   ✕ into page;  F = BIl on each conductor', cx, cy + R + 20, { size: 10.5, align: 'center', color: C.muted });
      const Kb = p.K, Ra = p.Ra, ss = M.act.dcSteady(p.Va, Ra, p.K, Kb, p.TL); const J = p.J * 1e-5;
      D.box(S, Math.min(W - 270, cx + R + 40), 24, 250, 'Steady state (2.11)', [['i_a = T_L/K_t', M.fmt(ss.ia, 3) + ' A'], ['ω = (V_a − i_aR_a)/K_b', M.fmt(ss.w, 1) + ' rad/s'], ['Stall torque K_tV_a/R_a', M.fmt(ss.Ts, 3) + ' N·m'], ['No-load speed V_a/K_b', M.fmt(ss.w0, 1) + ' rad/s'], ['P_out, P_in', M.fmt(ss.Po, 1) + ' W, ' + M.fmt(ss.Pi, 1) + ' W'], ['Max power', M.fmt(ss.Pmax, 1) + ' W']]);
      D.text(S, 'slow motion: 1 s on screen = 50 ms of motor time', 14, H - 12, { size: 10.5, color: C.violet });
      S.set('ia', ia); S.set('w', w); S.set('rpm', w * 60 / (2 * PI)); S.set('Eb', Kb * w); S.set('T', p.K * ia); S.set('eta', ss.eta * 100); S.set('tau', M.fmt(p.La / Ra, 3) + ', ' + M.fmt(J * Ra / (p.K * Kb) * 1000, 2));
      const ch = S.chart('st'); const pts = [], pw = []; for (let k = 0; k <= 30; k++) { const T = ss.Ts * k / 30; const ww = p.Va / Kb - Ra * T / (p.K * Kb); pts.push([T, ww]); pw.push([T, T * ww]); } ch.set(0, pts); ch.set(1, [[p.TL, ss.w]]); ch.set(2, pw);
    }
  });

  /* ================= Servo motor (Topic II.3) ================= */
  RIL.defineSim({
    id: 'servo-motor', title: 'Servo motor: position feedback and PID control', unit: 2, category: 'actuators', kind: '2d', auto: true, autoDefault: false,
    description: 'Inside a servo: DC motor, gear train, feedback potentiometer and control circuit driving the output shaft. The controller applies the PID law u = K_p e + K_i∫e + K_d ė (2.14) to the position error; an RC servo command maps pulse width to angle θ = 180°(t_p − 1)/1 (2.12).',
    help: 'Set the commanded angle (or the RC pulse width) and watch the output shaft track it. Increase K_p for speed, add K_d to damp overshoot, add K_i to remove the steady-state error caused by the load torque. Automatic mode issues a new command every 3 s.',
    controls: [
      { id: 'src', type: 'select', label: 'Command source', string: true, value: 'deg', options: [['deg', 'Angle set-point'], ['pwm', 'RC pulse width (1–2 ms)']] },
      { id: 'ref', label: 'Commanded angle θ_ref', min: 0, max: 180, step: 0.5, value: 120, unit: '°' },
      { id: 'tp', label: 'RC pulse width t_p', min: 1, max: 2, step: 0.005, value: 1.5, unit: 'ms' },
      { id: 'Kp', label: 'Proportional gain K_p', min: 0, max: 5, step: 0.01, value: 1.2, unit: 'N·m/rad' },
      { id: 'Ki', label: 'Integral gain K_i', min: 0, max: 5, step: 0.01, value: 0, unit: 'N·m/(rad·s)' },
      { id: 'Kd', label: 'Derivative gain K_d', min: 0, max: 0.5, step: 0.001, value: 0.08, unit: 'N·m·s/rad' },
      { id: 'n', label: 'Gear ratio n', min: 10, max: 300, step: 1, value: 100 },
      { id: 'TL', label: 'Load torque at output', min: 0, max: 0.5, step: 0.005, value: 0.1, unit: 'N·m' }
    ],
    readouts: [{ id: 'ref', label: 'Reference', unit: '°' }, { id: 'th', label: 'Output angle', unit: '°' }, { id: 'e', label: 'Error e', unit: '°' }, { id: 'u', label: 'Control torque u (output side)', unit: 'N·m' }, { id: 'mp', label: 'Overshoot (last step)', unit: '%' }, { id: 'jeq', label: 'J_eq at output = J_L + n²J_m', unit: 'kg·m²' }],
    charts: [{ id: 'c', title: 'Position tracking', x: 'time (s)', y: 'angle (°)', series: [{ label: 'reference' }, { label: 'output θ' }], window: 900 }, { id: 'u', title: 'Control effort', x: 'time (s)', y: 'u (N·m)', series: [{ label: 'u' }], window: 900 }],
    substeps: 10,
    reset(S) { S.th = 30 * D2R; S.w = 0; S.I = 0; S.peak = 0; S.start = S.th; S.mp = 0; S.motorAng = 0; S.prevRef = null; },
    refRad(S) { return (S.p.src === 'pwm' ? M.act.rcServoAngle(S.p.tp) : S.p.ref) * D2R; },
    step(S, dt) {
      const p = S.p; if (S.auto) { const k = Math.floor(S.t / 3) % 4; S.setParam('ref', [30, 150, 90, 170][k], true); S.setParam('tp', 1 + [30, 150, 90, 170][k] / 180, true); }
      const r = this.refRad(S); if (S.prevRef !== r) { S.start = S.th; S.peak = S.th; S.prevRef = r; }
      const Jm = 2e-6, JL = 2e-3, Jeq = JL + p.n * p.n * Jm, B = 0.002; const e = r - S.th;
      S.I = M.clamp(S.I + e * dt, -2, 2); let u = p.Kp * e + p.Ki * S.I - p.Kd * S.w; u = M.clamp(u, -1.5, 1.5); S.u = u;
      const TL = Math.abs(S.w) > 1e-3 ? Math.sign(S.w) * p.TL : M.clamp(u, -p.TL, p.TL);
      const acc = (u - B * S.w - TL) / Jeq; S.w += acc * dt; S.th += S.w * dt; S.motorAng += S.w * p.n * dt;
      if (Math.sign(r - S.start) * (S.th - S.peak) > 0) S.peak = S.th; S.mp = Math.abs(r - S.start) > 1e-3 ? Math.max(0, (S.peak - r) / (r - S.start) * 100) : 0;
      if (S.frameCount % 2 === 0) { S.chart('c').push(S.t, [r * R2D, S.th * R2D]); S.chart('u').push(S.t, [u]); }
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, r = this.refRad(S);
      const bx = 30, by = 40, bw = Math.min(W * 0.55, 440), bh = H - 90;
      D.rect(S, bx, by, bw, bh, 'rgba(19,38,74,.6)', '#8fa3c4', 2, 10); D.text(S, 'servo housing', bx + 10, by + 16, { size: 10.5, color: C.muted });
      // motor
      D.rect(S, bx + 20, by + bh * 0.55, bw * 0.3, bh * 0.32, '#1d2b48', C.cyan, 1.5, 6); D.text(S, 'DC motor', bx + 20 + bw * 0.15, by + bh * 0.55 + bh * 0.16 + 4, { size: 11, align: 'center', color: C.cyan });
      // gear train
      const gear = (x, y, rr, teeth, ang, col) => { const g = S.ctx; g.fillStyle = col; g.beginPath(); for (let k = 0; k < teeth * 2; k++) { const a = ang + k * PI / teeth, rad = k % 2 ? rr : rr * 0.84; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } g.closePath(); g.fill(); D.circle(S, x, y, rr * 0.2, '#0e1d38'); D.line(S, x, y, x + Math.cos(ang) * rr * 0.7, y + Math.sin(ang) * rr * 0.7, '#0e1d38', 2); };
      const gy = by + bh * 0.4, n = p.n; const st = Math.pow(n, 1 / 3);
      gear(bx + 30 + bw * 0.3, gy, 12, 8, S.motorAng, '#c9a26b'); gear(bx + 30 + bw * 0.3 + 34, gy, 26, 16, -S.motorAng / st, '#b98f58'); gear(bx + 30 + bw * 0.3 + 72, gy - 10, 18, 12, S.motorAng / st / st, '#c9a26b'); gear(bx + bw - 70, gy, 40, 24, -S.th, '#d4b07a');
      D.text(S, `gear train n = ${n}:1`, bx + bw * 0.55, gy + 52, { size: 10.5, align: 'center', color: C.amber });
      // pot + control board
      D.rect(S, bx + bw - 100, by + bh * 0.65, 60, 40, '#2a1f3d', C.violet, 1.5, 4); D.text(S, 'feedback pot', bx + bw - 70, by + bh * 0.65 + 56, { size: 10, align: 'center', color: C.violet }); D.line(S, bx + bw - 70, by + bh * 0.65 + 20, bx + bw - 70 + Math.cos(-S.th) * 16, by + bh * 0.65 + 20 + Math.sin(-S.th) * 16, C.violet, 2);
      D.rect(S, bx + 20, by + 26, bw * 0.35, 46, '#10301e', C.green, 1.5, 4); D.text(S, 'control circuit (PID)', bx + 20 + bw * 0.175, by + 46, { size: 10.5, align: 'center', color: C.green }); D.text(S, `e = ${M.fmt((r - S.th) * R2D, 1)}°`, bx + 20 + bw * 0.175, by + 62, { size: 10.5, align: 'center' });
      D.arrow(S, bx + bw - 100, by + bh * 0.65 + 10, bx + 20 + bw * 0.35, by + 60, C.violet, 1.5, 7); D.arrow(S, bx + 40, by + 72, bx + 40, by + bh * 0.55, C.green, 1.5, 7);
      // output shaft horn
      const ox = Math.min(W - 110, bx + bw + 100), oy = H * 0.45, L = 70;
      D.circle(S, ox, oy, L + 12, null, '#3a5384', 1); for (let a = 0; a <= 180; a += 30) { const aa = PI - a * D2R; D.line(S, ox + Math.cos(aa) * (L + 6), oy - Math.sin(aa) * (L + 6), ox + Math.cos(aa) * (L + 14), oy - Math.sin(aa) * (L + 14), C.muted, 1); D.text(S, a + '°', ox + Math.cos(aa) * (L + 28), oy - Math.sin(aa) * (L + 28) + 4, { size: 9, align: 'center', color: C.muted }); }
      const ra = PI - r; D.line(S, ox, oy, ox + Math.cos(ra) * L, oy - Math.sin(ra) * L, 'rgba(111,227,155,.7)', 2, [5, 4]);
      const ta = PI - S.th; D.link(S, ox, oy, ox + Math.cos(ta) * L, oy - Math.sin(ta) * L, 12, '#e9eef7', '#8fa3c4'); D.circle(S, ox, oy, 9, C.amber);
      D.text(S, 'output shaft', ox, oy + 32, { size: 10.5, align: 'center', color: C.muted });
      if (p.src === 'pwm') { const px = ox - 80, py = H - 34; D.text(S, `RC pulse ${p.tp.toFixed(3)} ms every 20 ms → θ = 180°(t_p − 1)/1 = ${M.fmt(M.act.rcServoAngle(p.tp), 1)}°`, 16, H - 10, { size: 11, color: C.amber }); D.poly(S, [[px, py], [px + 10, py], [px + 10, py - 14], [px + 10 + p.tp * 20, py - 14], [px + 10 + p.tp * 20, py], [px + 160, py]], null, C.amber, 2, false); }
      S.set('ref', r * R2D); S.set('th', S.th * R2D); S.set('e', (r - S.th) * R2D); S.set('u', S.u || 0); S.set('mp', S.mp); S.set('jeq', 2e-3 + p.n * p.n * 2e-6);
    }
  });

  /* ================= Stepper motor (Topic II.4) ================= */
  RIL.defineSim({
    id: 'stepper-motor', title: 'Stepper motor: excitation sequence and stepping', unit: 2, category: 'actuators', kind: '2d', auto: true, autoDefault: true,
    description: 'Variable-reluctance stepper with m stator phases and N_r rotor teeth. The rotor aligns with the energised poles; step angle θ_s = 360°/(mN_r) (2.15) and speed n = 60f/S (2.16). Wave, full-step and half-step sequences, direction and step rate are adjustable.',
    help: 'Use Step to advance one pulse, or run continuously at the chosen step rate. The rotor dynamics (reluctance torque ∝ −sin N_r(θ − θ_eq) with damping) show settling and, at high rates, the risk of missing steps. Example 2.5 uses a 1.8° hybrid motor: S = 200 steps/rev, 1 kHz → 300 rpm.',
    controls: [
      { id: 'm', type: 'select', label: 'Stator phases m', value: 3, options: [[3, '3 phases (6 stator poles)'], [4, '4 phases (8 stator poles)']] },
      { id: 'Nr', type: 'select', label: 'Rotor teeth N_r', value: 4, options: [[2, '2'], [4, '4'], [6, '6'], [8, '8'], [10, '10']] },
      { id: 'seq', type: 'select', label: 'Excitation sequence', string: true, value: 'full', options: [['wave', 'Wave drive (one phase on)'], ['full', 'Full step (two phases on)'], ['half', 'Half step (1 and 2 alternating)']] },
      { id: 'dir', type: 'select', label: 'Direction', value: 1, options: [[1, 'Forward'], [-1, 'Reverse']] },
      { id: 'f', label: 'Step rate f', min: 0.2, max: 40, step: 0.1, value: 2, unit: 'steps/s' },
      { id: 'b', type: 'buttons', buttons: [{ id: 'one', label: 'Single step' }] }
    ],
    readouts: [{ id: 'ts', label: 'Step angle θ_s', unit: '°' }, { id: 'S', label: 'Steps per revolution S' }, { id: 'n', label: 'Speed n = 60f/S', unit: 'rpm' }, { id: 'k', label: 'Step count' }, { id: 'ph', label: 'Energised phases' }, { id: 'ang', label: 'Rotor angle', unit: '°' }, { id: 'lost', label: 'Position error', unit: '°' }],
    charts: [{ id: 'c', title: 'Phase excitation and rotor angle', x: 'time (s)', y: 'phase / angle', series: [{ label: 'A', stepped: true }, { label: 'B', stepped: true }, { label: 'C', stepped: true }, { label: 'D', stepped: true }, { label: 'rotor angle / 90°' }], window: 700 }],
    substeps: 20,
    reset(S) { S.k = 0; S.th = 0; S.w = 0; S.acc = 0; },
    onControl(S, id) { if (id !== 'f' && id !== 'dir') { S.reset(); S.chart('c').clear(); } },
    onButton(S) { S.k += +S.p.dir; },
    pattern(S, k) {
      const m = +S.p.m, seq = S.p.seq; const on = new Array(m).fill(0); const kk = ((k % (2 * m)) + 2 * m) % (2 * m);
      if (seq === 'wave') on[((k % m) + m) % m] = 1; else if (seq === 'full') { const j = ((k % m) + m) % m; on[j] = 1; on[(j + 1) % m] = 1; }
      else { const j = Math.floor(kk / 2) % m; on[j] = 1; if (kk % 2) on[(j + 1) % m] = 1; }
      return on;
    },
    stepAngle(S) { const base = 360 / (+S.p.m * +S.p.Nr); return S.p.seq === 'half' ? base / 2 : base; },
    step(S, dt) {
      const p = S.p, m = +p.m, Nr = +p.Nr; S.acc += dt; if (S.running && S.acc >= 1 / p.f) { S.acc = 0; S.k += +p.dir; }
      const on = this.pattern(S, S.k);
      // phase j poles at φ_j = j·180°/m ; reluctance torque −K sin(N_r(θ − φ_j))
      let T = 0; on.forEach((v, j) => { if (v) T += -Math.sin(Nr * (S.th - j * PI / m)); });
      const K = 400, Bd = 12; S.w += (K * T - Bd * S.w) * dt; S.th += S.w * dt;
      if (S.frameCount % 2 === 0 && dt > 0) { const row = [0, 0, 0, 0].map((_, j) => j < m ? on[j] * 0.8 + (3 - j) * 1.1 : NaN); row.push(S.th * R2D / 90); S.chart('c').push(S.t, row); }
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, m = +p.m, Nr = +p.Nr, cx = W * 0.32, cy = H * 0.5, R = Math.min(W * 0.24, H * 0.42); const on = this.pattern(S, S.k), names = 'ABCD';
      D.circle(S, cx, cy, R, '#22355c', '#8fa3c4', 2);
      for (let k = 0; k < 2 * m; k++) { const a = -k * PI / m, j = k % m, act = on[j]; const g = S.ctx; g.save(); g.translate(cx, cy); g.rotate(a); D.rect(S, cx * 0 + R * 0.55, -R * 0.12, R * 0.4, R * 0.24, act ? (k < m ? C.amber : '#c98a10') : '#3b4f75', '#c9d6ec', 1, 3); g.restore();
        const lx = cx + Math.cos(a) * R * 1.12, ly = cy + Math.sin(a) * R * 1.12; D.text(S, names[j] + (k >= m ? '′' : ''), lx, ly + 4, { size: 12, weight: 700, align: 'center', color: act ? C.amber : C.muted }); }
      // rotor with Nr teeth
      const g = S.ctx; g.save(); g.translate(cx, cy); g.rotate(-S.th); g.fillStyle = '#9fb3d1'; g.beginPath();
      for (let k = 0; k < Nr; k++) { const a0 = k * 2 * PI / Nr, hw = Math.min(0.3, PI / Nr * 0.55); g.lineTo(Math.cos(a0 - hw) * R * 0.53, Math.sin(a0 - hw) * R * 0.53); g.lineTo(Math.cos(a0 + hw) * R * 0.53, Math.sin(a0 + hw) * R * 0.53); g.lineTo(Math.cos(a0 + PI / Nr) * R * 0.3, Math.sin(a0 + PI / Nr) * R * 0.3); }
      g.closePath(); g.fill(); g.fillStyle = C.red; g.beginPath(); g.arc(R * 0.42, 0, 5, 0, 2 * PI); g.fill(); g.restore(); D.circle(S, cx, cy, 6, '#0e1d38', '#fff', 1);
      const ts = this.stepAngle(S), Sx = 360 / ts, target = S.k * ts * (p.seq === 'half' ? 1 : 1);
      // table of sequence
      const tx = Math.min(W - 230, cx + R + 50), ty = 30; D.text(S, `${p.seq} sequence`, tx, ty, { size: 12, weight: 700 });
      const steps = p.seq === 'half' ? 2 * m : m; for (let i = 0; i < steps; i++) { const pat = this.pattern(S, i); const cur = ((S.k % steps) + steps) % steps === i; D.text(S, `step ${i + 1}: ` + pat.map((v, j) => v ? names[j] : '·').join(' '), tx, ty + 20 + i * 16, { size: 11.5, color: cur ? C.amber : C.muted, weight: cur ? 700 : 500 }); }
      D.text(S, `θ_s = 360°/(m N_r)${p.seq === 'half' ? ' ÷ 2' : ''} = ${M.fmt(ts, 2)}°  (2.15);  n = 60f/S = ${M.fmt(60 * p.f / Sx, 2)} rpm  (2.16)`, 16, H - 12, { size: 11.5 });
      const err = Math.abs(((S.th * R2D + (S.k * ts) % 360) + 540) % 360 - 180);
      S.set('ts', ts); S.set('S', Math.round(Sx)); S.set('n', 60 * p.f / Sx); S.set('k', S.k); S.set('ph', on.map((v, j) => v ? names[j] : '').join('') || '—'); S.set('ang', ((-S.th * R2D % 360) + 360) % 360); S.set('lost', err);
    }
  });

  /* ================= BLDC motor (Topic II.5) ================= */
  const SIX = [ // Hall code (H1 H2 H3) -> energised phases (+, −) for 120° six-step commutation
    { h: [1, 0, 1], hi: 'A', lo: 'B' }, { h: [1, 0, 0], hi: 'A', lo: 'C' }, { h: [1, 1, 0], hi: 'B', lo: 'C' },
    { h: [0, 1, 0], hi: 'B', lo: 'A' }, { h: [0, 1, 1], hi: 'C', lo: 'A' }, { h: [0, 0, 1], hi: 'C', lo: 'B' }];
  RIL.defineSim({
    id: 'bldc-motor', title: 'Brushless DC motor: Hall sensors and electronic commutation', unit: 2, category: 'actuators', kind: '2d', auto: true, autoDefault: false,
    description: 'Permanent-magnet rotor, three-phase stator windings and three Hall sensors at 120°. The Hall code selects which pair of phases the inverter energises (six-step commutation). Torque T = K_t I, back-EMF K_e ω, electrical frequency f_e = p n/60 (Example 2.6).',
    help: 'Raise the PWM duty to accelerate. Watch the Hall code change every 60° electrical and the commutation table select the next phase pair. Turn off Hall feedback to drive the phases with a fixed open-loop sequence frequency: the rotor may lose synchronism if the load is high.',
    controls: [
      { id: 'D', label: 'PWM duty (applied voltage fraction)', min: 0, max: 1, step: 0.01, value: 0.5 },
      { id: 'Vdc', label: 'DC bus voltage', min: 12, max: 60, step: 1, value: 48, unit: 'V' },
      { id: 'p', label: 'Pole pairs p', min: 1, max: 8, step: 1, value: 4 },
      { id: 'TL', label: 'Load torque', min: 0, max: 2, step: 0.01, value: 0.3, unit: 'N·m' },
      { id: 'hall', type: 'toggle', label: 'Hall-sensor feedback commutation', value: true },
      { id: 'fol', label: 'Open-loop commutation rate (if no Hall)', min: 1, max: 400, step: 1, value: 40, unit: 'Hz electrical' }
    ],
    readouts: [{ id: 'hc', label: 'Hall code H1 H2 H3' }, { id: 'pair', label: 'Energised phases (+ / −)' }, { id: 'rpm', label: 'Speed', unit: 'rpm' }, { id: 'fe', label: 'Electrical frequency f_e = pn/60', unit: 'Hz' }, { id: 'I', label: 'Phase current', unit: 'A' }, { id: 'T', label: 'Torque K_t I', unit: 'N·m' }, { id: 'E', label: 'Back-EMF K_e ω (line)', unit: 'V' }],
    charts: [{ id: 'h', title: 'Hall signals (electrical angle)', x: 'time (s)', y: 'H1, H2, H3', series: [{ label: 'H1', stepped: true }, { label: 'H2', stepped: true }, { label: 'H3', stepped: true }], window: 500 },
      { id: 'v', title: 'Phase terminal voltages (six-step) and back-EMF of A', x: 'time (s)', y: 'V', series: [{ label: 'A', stepped: true }, { label: 'B', stepped: true }, { label: 'C', stepped: true }, { label: 'e_A (trapezoidal)' }], window: 500 }],
    substeps: 20,
    reset(S) { S.th = 0; S.w = 0; S.ol = 0; S.I = 0; },
    sector(eAng) { const s = Math.floor((((eAng % (2 * PI)) + 2 * PI) % (2 * PI)) / (PI / 3)); return s; },
    step(S, dt) {
      const p = S.p, Kt = 0.1, R = 0.5, J = 4e-4, B = 2e-4, h = dt * 0.25; // slow motion ×1/4
      const eAng = S.th * p.p; const sec = p.hall ? (this.sector(eAng + PI / 6) + 0) % 6 : (S.ol = (S.ol + p.fol * 6 * h) % 6, Math.floor(S.ol));
      S.sec = sec; const st = SIX[sec];
      // torque from energised pair with trapezoidal back-EMF shape; current from (D·Vdc − e_line)/(2R)
      const ke = Kt; const shape = ph => { const off = { A: 0, B: -2 * PI / 3, C: 2 * PI / 3 }[ph]; const x = (((eAng + off) % (2 * PI)) + 2 * PI) % (2 * PI); return x < PI / 6 ? x / (PI / 6) : x < 5 * PI / 6 ? 1 : x < 7 * PI / 6 ? 1 - (x - 5 * PI / 6) / (PI / 6) * 2 : x < 11 * PI / 6 ? -1 : -1 + (x - 11 * PI / 6) / (PI / 6); };
      const eLine = ke * S.w * (shape(st.hi) - shape(st.lo)) / 2 * 2; const I = M.clamp((p.D * p.Vdc - eLine) / (2 * R), -40, 40); S.I = I;
      const T = Kt * I * (shape(st.hi) - shape(st.lo)) / 2; S.T = T;
      const TL = Math.abs(S.w) > 0.5 ? Math.sign(S.w) * p.TL : M.clamp(T, -p.TL, p.TL);
      S.w += (T - B * S.w - TL) / J * h; S.th += S.w * h;
      if (S.frameCount % 2 === 0) { const H1 = SIX[this.sector(eAng + PI / 6)].h; S.chart('h').push(S.t, [H1[0] * 0.8 + 2.2, H1[1] * 0.8 + 1.1, H1[2] * 0.8]); const v = ph => ph === st.hi ? p.D * p.Vdc : ph === st.lo ? 0 : NaN; S.chart('v').push(S.t, [v('A'), v('B'), v('C'), p.D * p.Vdc / 2 + ke * S.w * shape('A') / 2]); }
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, cx = W * 0.3, cy = H * 0.52, R = Math.min(W * 0.22, H * 0.4), st = SIX[S.sec || 0], eAng = S.th * p.p;
      D.circle(S, cx, cy, R, '#22355c', '#8fa3c4', 2);
      const phCol = { A: C.red, B: C.green, C: C.cyan };
      ['A', 'B', 'C'].forEach((ph, i) => { [0, 1].forEach(o => { const a = -(i * 2 * PI / 3 + o * PI); const x = cx + Math.cos(a) * R * 0.78, y = cy + Math.sin(a) * R * 0.78; const act = ph === st.hi || ph === st.lo; const g = S.ctx; g.save(); g.translate(x, y); g.rotate(a); D.rect(S, -R * 0.12, -R * 0.13, R * 0.26, R * 0.26, act ? phCol[ph] : '#3b4f75', '#c9d6ec', 1, 3); g.restore(); D.text(S, ph + (o ? '′' : ''), cx + Math.cos(a) * R * 1.08, cy + Math.sin(a) * R * 1.08 + 4, { size: 12, weight: 700, align: 'center', color: act ? phCol[ph] : C.muted }); }); });
      // rotor magnet (drawn as one pole pair; electrical angle = p × mechanical)
      const g = S.ctx; g.save(); g.translate(cx, cy); g.rotate(-S.th); g.fillStyle = '#c0392b'; g.beginPath(); g.arc(0, 0, R * 0.5, -PI / 2, PI / 2); g.fill(); g.fillStyle = '#2f6fd6'; g.beginPath(); g.arc(0, 0, R * 0.5, PI / 2, 3 * PI / 2); g.fill(); g.restore();
      D.text(S, 'N', cx + Math.cos(-S.th) * R * 0.3, cy + Math.sin(-S.th) * R * 0.3 + 5, { size: 13, weight: 800, align: 'center' });
      [0, 1, 2].forEach(i => { const a = -(i * 2 * PI / 3 + PI / 6); const H1 = SIX[this.sector(eAng + PI / 6)].h; D.circle(S, cx + Math.cos(a) * R * 0.6, cy + Math.sin(a) * R * 0.6, 6, H1[i] ? C.amber : '#33415e', '#fff', 1); D.text(S, 'H' + (i + 1), cx + Math.cos(a) * R * 0.6 + 8, cy + Math.sin(a) * R * 0.6 - 6, { size: 10, color: C.amber }); });
      const tx = Math.min(W - 250, cx + R + 50); D.text(S, 'Commutation table (120° Hall)', tx, 28, { size: 12, weight: 700 });
      SIX.forEach((r, i) => D.text(S, `${r.h.join('')}  →  ${r.hi}+  ${r.lo}−   (${['A', 'B', 'C'].find(x => x !== r.hi && x !== r.lo)} floating)`, tx, 48 + i * 17, { size: 11.5, color: i === S.sec ? C.amber : C.muted, weight: i === S.sec ? 700 : 500 }));
      D.text(S, '3-phase inverter drives the pair selected by the Hall code; slow motion ×1/4', 16, H - 12, { size: 11, color: C.muted });
      const rpm = S.w * 60 / (2 * PI); S.set('hc', SIX[this.sector(eAng + PI / 6)].h.join(' ')); S.set('pair', st.hi + '+ / ' + st.lo + '−'); S.set('rpm', rpm); S.set('fe', p.p * Math.abs(rpm) / 60); S.set('I', S.I || 0); S.set('T', S.T || 0); S.set('E', 0.1 * S.w * 2);
    }
  });

  /* ================= Solenoid and electric linear actuator (Topic II.6) ================= */
  RIL.defineSim({
    id: 'solenoid-actuator', title: 'Solenoids and electric linear actuators', unit: 2, category: 'actuators', kind: '2d', auto: true, autoDefault: true,
    description: 'Solenoid: coil current builds with τ = L/R, the magnetic force F = (NI)²μ₀A/(2g²) (2.18) pulls the plunger against the return spring. Linear actuator: a motor-driven ball screw extends and retracts a rod with F = 2πηT/p and v = pn (2.19).',
    help: 'Solenoid mode: switch the coil on and off; note that force grows rapidly as the gap closes (ideal model, iron saturation ignored). Linear actuator mode: extend and retract between end limits. Defaults: Example 2.7 (N = 1000, 0.5 A, 1 cm², 2 mm → 3.9 N) and Example 2.8 (0.5 N·m, 10 mm lead, 1500 rpm → 283 N, 0.25 m/s).',
    controls: [
      { id: 'mode', type: 'select', label: 'Device', string: true, value: 'sol', options: [['sol', 'Solenoid with return spring'], ['lin', 'Electric linear actuator (ball screw)']] },
      { id: 'on', type: 'toggle', label: 'Coil energised / extend command', value: false },
      { id: 'N', label: 'Turns N | motor torque T (N·m ×100)', min: 100, max: 3000, step: 10, value: 1000 },
      { id: 'I', label: 'Coil current I (A) | lead p (mm)', min: 0.05, max: 2, step: 0.01, value: 0.5 },
      { id: 'g', label: 'Initial air gap g₀ (mm) | speed (rpm/100)', min: 0.5, max: 8, step: 0.1, value: 2 },
      { id: 'k', label: 'Return spring k (N/mm)', min: 0.1, max: 5, step: 0.05, value: 0.8 }
    ],
    readouts: [{ id: 'F', label: 'Magnetic / axial force', unit: 'N' }, { id: 'x', label: 'Plunger / rod position', unit: 'mm' }, { id: 'i', label: 'Coil current (now)', unit: 'A' }, { id: 'v', label: 'Speed', unit: 'm/s' }, { id: 'st', label: 'State' }],
    charts: [{ id: 'c', title: 'Response', x: 'time (s)', y: 'position (mm) | force (N)', series: [{ label: 'position (mm)' }, { label: 'force (N)' }, { label: 'current ×10 (A)' }], window: 700 }],
    substeps: 20,
    reset(S) { S.x = 0; S.v = 0; S.i = 0; S.ph = 0; },
    onControl(S, id, v) { if (id !== 'mode') return; S.reset(); if (v === 'lin') { relabel(S, 'N', 'Motor torque T (N·m ×100)', 5, 200, 1, 50); relabel(S, 'I', 'Screw lead p (mm)', 2, 40, 1, 10); relabel(S, 'g', 'Motor speed (rpm/100)', 1, 30, 0.5, 15); } else { relabel(S, 'N', 'Turns N', 100, 3000, 10, 1000); relabel(S, 'I', 'Coil current I (A)', 0.05, 2, 0.01, 0.5); relabel(S, 'g', 'Initial air gap g₀ (mm)', 0.5, 8, 0.1, 2); } },
    step(S, dt) {
      const p = S.p; if (S.auto) { S.ph += dt; if (S.ph > (p.mode === 'sol' ? 1.5 : 2.4)) { S.ph = 0; S.setParam('on', !p.on, true); } }
      if (p.mode === 'sol') {
        const h = dt * 0.1, tauL = 0.004 + 0.006 * S.x / p.g; /* L/R grows as the gap closes */ const target = p.on ? p.I : 0; S.i += (target - S.i) * (1 - Math.exp(-h / tauL));
        S.i = M.clamp(S.i, 0, p.I); const gap = Math.max(0.15, p.g - S.x) / 1000; const F = M.act.solenoid(p.N, S.i, 1e-4, gap); S.F = F;
        const Fs = p.k * 1000 * S.x / 1000 + 0.5; const m = 0.02; let acc = (F - Fs - 2 * S.v) / m; S.v += acc * h; S.x += S.v * 1000 * h;
        if (S.x >= p.g - 0.15) { S.x = p.g - 0.15; S.v = Math.min(0, S.v); } if (S.x <= 0) { S.x = 0; S.v = Math.max(0, S.v); }
        if (S.frameCount % 2 === 0) S.chart('c').push(S.t, [S.x, F, S.i * 10]);
      } else {
        const r = M.act.screw(p.N / 100, p.I / 1000, 0.9, p.g * 100 / 60); S.F = r.F; const dir = p.on ? 1 : -1; S.v = dir * r.v; S.x = M.clamp(S.x + S.v * 1000 * dt * 0.4, 0, 150);
        if ((S.x >= 150 && dir > 0) || (S.x <= 0 && dir < 0)) S.v = 0; S.i = 0; if (S.frameCount % 2 === 0) S.chart('c').push(S.t, [S.x, r.F, 0]);
      }
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, cy = H * 0.5;
      if (p.mode === 'sol') {
        const x0 = Math.max(250, W * 0.3), cw = Math.min(W * 0.4, 300); D.rect(S, x0, cy - 70, cw, 140, '#13264a', '#8fa3c4', 2, 6);
        for (let k = 0; k < 14; k++) { const xx = x0 + 14 + k * (cw - 28) / 13; D.circle(S, xx, cy - 46, 6, S.i > 0.01 ? C.amber : '#6f86ad'); D.circle(S, xx, cy + 46, 6, S.i > 0.01 ? C.amber : '#6f86ad'); }
        if (S.i > 0.01) for (let k = -1; k <= 1; k++) D.arrow(S, x0 + 20, cy + k * 14, x0 + cw - 20, cy + k * 14, `rgba(76,194,255,${0.2 + 0.6 * S.i / p.I})`, 1.5, 7);
        D.rect(S, x0 + cw - 30, cy - 24, 30, 48, '#8aa0c6', '#fff', 1); D.text(S, 'stop', x0 + cw - 15, cy + 40, { size: 10, align: 'center', color: C.muted });
        const plE = x0 + cw - 30 - (p.g - S.x) * 18; D.rect(S, x0 - 120, cy - 22, plE - x0 + 120, 44, '#c9d6ec', '#fff', 1.5, 4); D.text(S, 'plunger', x0 - 60, cy + 4, { size: 11, align: 'center', color: '#0e1d38', weight: 700 });
        D.spring(S, x0 - 200, cy, x0 - 120, cy, 7, 10); D.rect(S, x0 - 214, cy - 30, 14, 60, '#3b4f75');
        D.text(S, `gap g = ${M.fmt(Math.max(0.15, p.g - S.x), 2)} mm`, plE + 4, cy - 30, { size: 11, color: C.cyan });
        D.text(S, 'F = (NI)² μ₀ A / (2g²)   (2.18);  A = 1 cm²', 16, 24, { size: 12 });
        S.set('F', S.F || 0); S.set('x', S.x); S.set('i', S.i); S.set('v', S.v); S.set('st', S.x >= p.g - 0.2 ? 'pulled in' : p.on ? 'pulling' : 'released');
      } else {
        const x0 = 60, Lb = Math.min(W - 260, 420); D.rect(S, x0, cy - 30, 80, 60, '#1d2b48', C.green, 1.5, 6); D.text(S, 'motor', x0 + 40, cy + 4, { size: 11, align: 'center', color: C.green });
        D.rect(S, x0 + 80, cy - 22, Lb, 44, '#13264a', '#8fa3c4', 1.5, 4); for (let k = 0; k < Lb; k += 9) D.line(S, x0 + 84 + k, cy - 6, x0 + 88 + k, cy + 6, '#8fa3c4', 1);
        const rx = x0 + 100 + S.x / 150 * (Lb - 60); D.rect(S, rx, cy - 16, 30, 32, '#6f86ad', '#fff', 1); D.rect(S, rx + 30, cy - 8, x0 + 80 + Lb - rx + 40, 16, '#c9d6ec'); D.rect(S, x0 + 80 + Lb + 40 + (S.x / 150) * 0, cy - 22, 0, 0);
        D.text(S, `stroke ${M.fmt(S.x, 1)} / 150 mm`, x0 + 80 + Lb / 2, cy + 46, { size: 11, align: 'center' });
        D.text(S, 'F = 2πηT/p, v = p·n   (2.19), η = 0.9 (ball screw)', 16, 24, { size: 12 });
        S.set('F', S.F || 0); S.set('x', S.x); S.set('i', '—'); S.set('v', S.v || 0); S.set('st', S.v > 0 ? 'extending' : S.v < 0 ? 'retracting' : S.x >= 150 ? 'extended (limit)' : 'retracted (limit)');
      }
    }
  });
})();
