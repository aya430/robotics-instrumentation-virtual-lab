/* Unit I — sensors and transducers: position, displacement, velocity, acceleration, force/torque, proximity,
   temperature, pressure and strain. Equation numbers refer to the course notes. */
(function () {
  const RIL = window.RIL, M = RIL.M, D = RIL.draw, C = RIL.C, D2R = M.D2R, R2D = M.R2D, PI = Math.PI;
  const relabel = (S, id, lbl, min, max, step, val) => { const i = S.inputs[id]; if (!i) return; i.el.min = min; i.el.max = max; i.el.step = step; const n = i.el.nextElementSibling; n.min = min; n.max = max; n.step = step; i.el.parentElement.querySelector('label span').textContent = lbl; S.setParam(id, val, true); };
  const roLabel = (S, id, txt) => { const r = S.ro[id]; if (r && r.el.previousSibling.textContent !== txt) { r.el.previousSibling.textContent = txt; r.spec.label = txt; } };

  /* ================= A. Position: potentiometer and optical encoders ================= */
  RIL.defineSim({
    id: 'position-sensors', title: 'Position sensors: potentiometer and optical encoders', unit: 1, category: 'sensors', kind: '2d', auto: true, autoDefault: true,
    description: 'Rotary potentiometer with loading (1.30), incremental quadrature encoder with ×4 decoding (1.32) and absolute Gray-code encoder, all reading the same joint angle.',
    help: 'Move the joint angle or let it sweep automatically. The potentiometer output is affected by the load resistance; the incremental encoder counts A/B edges (direction from which channel leads); the absolute encoder reads a Gray-code word at power-up.',
    controls: [
      { id: 'mode', type: 'select', label: 'Sensor', string: true, value: 'pot', options: [['pot', 'Rotary potentiometer'], ['inc', 'Incremental encoder (quadrature A/B)'], ['abs', 'Absolute encoder (Gray code)']] },
      { id: 'ang', label: 'Joint angle θ', min: 0, max: 340, step: 0.1, value: 120, unit: '°' },
      { id: 'Vs', label: 'Pot supply V_s', min: 1, max: 12, step: 0.1, value: 10, unit: 'V' },
      { id: 'ratio', label: 'R_p / R_L (pot loading)', min: 0, max: 2, step: 0.01, value: 0.2 },
      { id: 'N', label: 'Encoder lines N | bits n', min: 3, max: 64, step: 1, value: 16 }
    ],
    readouts: [{ id: 'a', label: 'True angle', unit: '°' }, { id: 'o1', label: 'Output' }, { id: 'o2', label: 'Measured angle', unit: '°' }, { id: 'res', label: 'Resolution', unit: '°' }, { id: 'err', label: 'Error', unit: '°' }],
    charts: [{ id: 'c', title: 'Sensor signals', x: 'time (s)', y: 'signal', series: [{ label: 'A / output' }, { label: 'B' }, { label: 'count' }], window: 500 }],
    reset(S) { S.count = 0; S.prevA = null; S.prevB = null; S.a0 = S.p.ang; },
    onControl(S, id) { if (id === 'mode') { S.chart('c').clear(); S.reset(); } },
    step(S, dt) {
      if (S.auto) S.setParam('ang', +(170 + 150 * Math.sin(0.35 * S.t)).toFixed(2), true);
      const N = Math.round(S.p.N);
      if (S.p.mode === 'inc') {
        // quadrature: A = square of N cycles/rev, B shifted by quarter period; count every edge (x4)
        const ph = S.p.ang / 360 * N; const A = ((ph % 1) + 1) % 1 < 0.5 ? 1 : 0, B = (((ph - 0.25) % 1) + 1) % 1 < 0.5 ? 1 : 0;
        if (S.prevA !== null) { const prev = (S.prevA << 1) | S.prevB, cur = (A << 1) | B; const seq = [0, 1, 3, 2]; const d = (seq.indexOf(cur) - seq.indexOf(prev) + 4) % 4; if (d === 1) S.count--; else if (d === 3) S.count++; }
        S.prevA = A; S.prevB = B; S.chart('c').push(S.t, [A + 2.4, B + 1.2, (S.count % 40) / 40]);
      } else if (S.p.mode === 'pot') { const x = S.p.ang / 340; S.chart('c').push(S.t, [M.inst.loadedPot(x, S.p.Vs, S.p.ratio, 1), S.p.Vs * x, NaN]); }
      else { const n = M.clamp(N, 3, 12), code = Math.floor(S.p.ang / 360 * 2 ** n); S.chart('c').push(S.t, [code, M.inst.gray(code), NaN]); }
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, cx = W * 0.3, cy = H * 0.5, R = Math.min(W * 0.22, H * 0.38), th = p.ang * D2R;
      roLabel(S, 'o1', { pot: 'Output voltage V_o (V)', inc: 'Counter (×4 decoding)', abs: 'Gray code word' }[p.mode]);
      if (p.mode === 'pot') {
        const x = p.ang / 340, Vo = M.inst.loadedPot(x, p.Vs, p.ratio, 1), ideal = p.Vs * x;
        const g = S.ctx; g.lineWidth = 14; g.strokeStyle = '#3b4f75'; g.beginPath(); g.arc(cx, cy, R, PI / 2 + 10 * D2R, PI / 2 + 350 * D2R); g.stroke();
        g.strokeStyle = C.amber; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R, PI / 2 + 10 * D2R, PI / 2 + 10 * D2R + th); g.stroke();
        const wx = cx + Math.cos(PI / 2 + 10 * D2R + th) * R, wy = cy + Math.sin(PI / 2 + 10 * D2R + th) * R; D.line(S, cx, cy, wx, wy, C.cyan, 4); D.circle(S, cx, cy, 10, '#1d2b48', C.cyan, 2);
        D.text(S, '0 V', cx - 30, cy + R + 22, { size: 10, color: C.muted }); D.text(S, 'V_s', cx + 18, cy + R + 22, { size: 10, color: C.muted });
        D.meter(S, W * 0.74, H * 0.45, 70, Vo, 0, p.Vs, 'V_o (loaded)', 'V');
        D.text(S, `ideal V_o = x·V_s = ${M.fmt(ideal, 3)} V`, W * 0.74, H * 0.45 + 62, { size: 11, align: 'center', color: C.green });
        D.text(S, 'V_o / V_s = x / [1 + (R_p/R_L) x (1 − x)]   (1.30)', 16, 22, { size: 12 });
        const ind = Vo / p.Vs * 340; S.set('a', p.ang); S.set('o1', Vo); S.set('o2', ind); S.set('res', 'continuous (wiper wire-turn limited)'); S.set('err', ind - p.ang);
      } else {
        const N = p.mode === 'inc' ? Math.round(p.N) : 2 ** M.clamp(Math.round(p.N), 3, 12), n = M.clamp(Math.round(p.N), 3, 12);
        D.circle(S, cx, cy, R, '#13264a', '#3a5384', 2);
        if (p.mode === 'inc') {
          for (let k = 0; k < N; k++) { const a0 = th + k * 2 * PI / N, a1 = a0 + PI / N; const g = S.ctx; g.fillStyle = 'rgba(219,229,245,.85)'; g.beginPath(); g.arc(cx, cy, R * 0.95, a0, a1); g.arc(cx, cy, R * 0.8, a1, a0, true); g.fill(); }
          D.rect(S, cx + R * 0.72, cy - 22, R * 0.36, 12, C.red); D.text(S, 'A', cx + R + 8, cy - 12, { color: C.red, weight: 700 }); D.rect(S, cx + R * 0.72, cy + 10, R * 0.36, 12, C.cyan); D.text(S, 'B', cx + R + 8, cy + 20, { color: C.cyan, weight: 700 });
          const res = M.inst.encoderRes(N, true), meas = S.a0 + S.count * res;
          S.set('a', p.ang); S.set('o1', S.count); S.set('o2', meas); S.set('res', res); S.set('err', meas - p.ang);
          D.text(S, `${N} lines × 4 edges = ${4 * N} counts/rev → resolution 360°/(4N) = ${M.fmt(res, 3)}°  (1.32)`, 16, 22, { size: 12 });
          D.text(S, 'Direction: A leads B → counting up; B leads A → counting down', 16, H - 14, { size: 11, color: C.muted });
        } else {
          for (let b = 0; b < n; b++) { const r0 = R * (0.35 + 0.6 * b / n), r1 = R * (0.35 + 0.6 * (b + 1) / n); const segs = 2 ** (b + 1); for (let k = 0; k < 2 ** n; k++) { const bit = (M.inst.gray(k) >> (n - 1 - b)) & 1; if (!bit) continue; const a0 = -th + k * 2 * PI / 2 ** n - PI / 2, a1 = a0 + 2 * PI / 2 ** n; const g = S.ctx; g.fillStyle = 'rgba(219,229,245,.85)'; g.beginPath(); g.arc(cx, cy, r1, a0, a1); g.arc(cx, cy, r0, a1, a0, true); g.fill(); } }
          D.line(S, cx, cy - R * 0.3, cx, cy - R * 1.05, C.amber, 2);
          const code = Math.floor(((p.ang % 360) + 360) % 360 / 360 * 2 ** n), gw = M.inst.gray(code), res = 360 / 2 ** n;
          S.set('a', p.ang); S.set('o1', M.sig.toBin(gw, n)); S.set('o2', M.inst.grayToBin(gw) * res); S.set('res', res); S.set('err', M.inst.grayToBin(gw) * res - p.ang);
          D.text(S, `${n} tracks → 2ⁿ = ${2 ** n} positions, resolution 360°/2ⁿ = ${M.fmt(res, 3)}°; Gray code changes one bit per step`, 16, 22, { size: 12 });
          D.text(S, `binary ${M.sig.toBin(code, n)}  →  Gray ${M.sig.toBin(gw, n)}`, W * 0.62, H * 0.5, { size: 14, weight: 700, color: C.cyan });
        }
      }
    },
  });

  /* ================= B. Displacement: LVDT and capacitive ================= */
  RIL.defineSim({
    id: 'displacement-sensors', title: 'Displacement sensors: LVDT and capacitive', unit: 1, category: 'sensors', kind: '2d', auto: true, autoDefault: true,
    description: 'LVDT with primary and two secondaries: the differential output amplitude is proportional to core displacement and its phase gives direction. Capacitive gap sensor C = ε₀εᵣA/d (1.36).',
    help: 'Move the core (or the plate gap). For the LVDT watch the two secondary voltages and their difference; at null they cancel. Compare with Example 1.16 (0.25 V/mm, −1.60 V → −6.4 mm) and Example 1.22 (A = 4 cm², d = 1 mm → 3.54 pF).',
    controls: [
      { id: 'mode', type: 'select', label: 'Sensor', string: true, value: 'lvdt', options: [['lvdt', 'LVDT'], ['cap', 'Capacitive (variable gap)']] },
      { id: 'x', label: 'Core displacement x | gap d', min: -10, max: 10, step: 0.01, value: 3, unit: 'mm' },
      { id: 'K', label: 'LVDT sensitivity K | plate area A', min: 0.05, max: 1, step: 0.01, value: 0.25, unit: 'V/mm | cm²' },
      { id: 'f', label: 'Excitation frequency (display)', min: 0.5, max: 4, step: 0.1, value: 1.5, unit: 'Hz (slowed)' }
    ],
    readouts: [{ id: 'o', label: 'Output' }, { id: 'm', label: 'Measured displacement', unit: 'mm' }, { id: 's', label: 'Sensitivity' }, { id: 'ph', label: 'Phase / note' }],
    charts: [{ id: 'c', title: 'Signals', x: 'time (s) | gap (mm)', y: 'voltage (V) | C (pF)', series: [{ label: 'S1' }, { label: 'S2' }, { label: 'output' }], window: 400 }],
    onControl(S, id, v) { S.chart('c').clear(); if (id === 'mode') { if (v === 'cap') { relabel(S, 'x', 'Plate gap d', 0.2, 5, 0.01, 1); relabel(S, 'K', 'Plate area A', 0.5, 20, 0.1, 4); } else { relabel(S, 'x', 'Core displacement x', -10, 10, 0.01, 3); relabel(S, 'K', 'LVDT sensitivity K', 0.05, 1, 0.01, 0.25); } } },
    step(S, dt) {
      const p = S.p;
      if (p.mode === 'lvdt') { if (S.auto) S.setParam('x', +(8 * Math.sin(0.3 * S.t)).toFixed(2), true); const w = 2 * PI * p.f, e = Math.sin(w * S.t), a1 = 0.5 * 10 * p.K * 0 + (2 + p.K * p.x / 2), a2 = (2 - p.K * p.x / 2); S.chart('c').push(S.t, [a1 * e, a2 * e, (a1 - a2) * e]); }
      else if (S.auto) S.setParam('x', +(1.2 + 0.9 * Math.sin(0.4 * S.t)).toFixed(3), true);
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H;
      if (p.mode === 'lvdt') {
        const cx = W * 0.4, cy = H * 0.45, L = Math.min(W * 0.6, 520), sc = L / 50;
        D.rect(S, cx - L / 2, cy - 40, L, 80, '#13264a', '#3a5384', 1.5, 6);
        const coil = (x0, x1, col, lbl) => { for (let x = x0; x < x1; x += 7) { D.line(S, x, cy - 34, x + 3, cy - 18, col, 2); D.line(S, x, cy + 34, x + 3, cy + 18, col, 2); } D.text(S, lbl, (x0 + x1) / 2, cy - 46, { size: 11, align: 'center', color: col, weight: 650 }); };
        coil(cx - L / 2 + 10, cx - L / 6, C.cyan, 'S₁'); coil(cx - L / 6 + 6, cx + L / 6 - 6, C.amber, 'Primary P (AC)'); coil(cx + L / 6, cx + L / 2 - 10, C.violet, 'S₂');
        const corex = cx - p.x * sc; D.rect(S, corex - L * 0.22, cy - 10, L * 0.44, 20, '#9fb3d1', '#fff', 1, 3); D.line(S, corex + L * 0.22, cy, cx + L / 2 + 50, cy, C.muted, 3); D.text(S, 'core (push rod)', corex, cy + 4, { size: 10, align: 'center', color: '#0e1d38', weight: 700 });
        D.line(S, cx, cy - 60, cx, cy + 60, 'rgba(111,227,155,.5)', 1, [4, 4]); D.text(S, 'null', cx, cy + 74, { size: 10, align: 'center', color: C.green });
        const Vo = p.K * p.x; D.text(S, `V_o = V_S1 − V_S2 = K·x = ${M.fmt(p.K, 3)} × ${M.fmt(p.x, 2)} = ${M.fmt(Vo, 3)} V (demodulated)`, 16, 22, { size: 12 });
        D.text(S, p.x > 0 ? 'core towards S₁: output in phase with primary' : p.x < 0 ? 'core towards S₂: output 180° out of phase' : 'at null: S₁ and S₂ cancel', 16, H - 14, { size: 11.5, color: C.muted });
        S.set('o', M.fmt(Vo, 3) + ' V'); S.set('m', Vo / p.K); S.set('s', p.K + ' V/mm'); S.set('ph', p.x >= 0 ? '0° (towards S₁)' : '180° (towards S₂)');
      } else {
        const A = p.K * 1e-4, d = p.x * 1e-3, Cp = M.inst.capacitance(1, A, d) * 1e12, sens = -Cp / p.x;
        const cx = W * 0.35, cy = H * 0.5, side = Math.sqrt(p.K) * 40, gap = p.x * 30;
        D.rect(S, cx - side, cy - gap / 2 - 12, 2 * side, 12, C.amber); D.rect(S, cx - side, cy + gap / 2, 2 * side, 12, C.cyan);
        for (let k = -3; k <= 3; k++) D.line(S, cx + k * side / 3.5, cy - gap / 2, cx + k * side / 3.5, cy + gap / 2, 'rgba(219,229,245,.35)', 1, [3, 3]);
        D.text(S, `d = ${M.fmt(p.x, 3)} mm`, cx + side + 12, cy + 4, { size: 12 }); D.text(S, `A = ${M.fmt(p.K, 2)} cm²`, cx, cy - gap / 2 - 22, { size: 12, align: 'center' });
        D.lcd(S, W * 0.66, H * 0.4, 170, M.fmt(Cp, 3) + ' pF', 'Capacitance-to-digital converter');
        D.text(S, 'C = ε₀ εᵣ A / d   (1.36);  dC/dd = −C/d', 16, 22, { size: 12 });
        S.set('o', M.fmt(Cp, 3) + ' pF'); S.set('m', p.x); S.set('s', M.fmt(sens, 3) + ' pF/mm'); S.set('ph', 'non-linear (∝ 1/d)');
        const pts = []; for (let k = 1; k <= 50; k++) { const dd = 0.2 + 4.8 * k / 50; pts.push([dd, M.inst.capacitance(1, A, dd * 1e-3) * 1e12]); } const ch = S.chart('c'); ch.set(0, []); ch.set(1, []); ch.set(2, pts); ch.label(2, 'C(d)');
      }
    }
  });

  /* ================= C. Velocity: tachogenerator and encoder differentiation ================= */
  RIL.defineSim({
    id: 'velocity-sensors', title: 'Velocity measurement: tachogenerator and encoder', unit: 1, category: 'sensors', kind: '2d', autoDefault: true, auto: true,
    description: 'A joint shaft follows a speed profile. A DC tachogenerator gives V_t = K_t ω (1.37) with commutator ripple; an incremental encoder estimates speed from counts per sampling interval (velocity from position).',
    help: 'Compare the true speed with the tacho voltage (scaled) and the encoder estimate. Shorter sampling intervals or fewer lines make the encoder estimate coarser at low speed: its resolution is 2π/(4N·T_s).',
    controls: [
      { id: 'w', label: 'Peak shaft speed', min: 10, max: 3000, step: 10, value: 1500, unit: 'rpm' },
      { id: 'Kt', label: 'Tacho constant K_t', min: 1, max: 20, step: 0.1, value: 7, unit: 'V/1000 rpm' },
      { id: 'rip', label: 'Commutator ripple', min: 0, max: 10, step: 0.1, value: 3, unit: '%' },
      { id: 'N', label: 'Encoder lines N', min: 16, max: 4096, step: 16, value: 1024 },
      { id: 'Ts', label: 'Encoder sampling interval T_s', min: 0.1, max: 20, step: 0.1, value: 10, unit: 'ms' }
    ],
    readouts: [{ id: 'nt', label: 'True speed', unit: 'rpm' }, { id: 'vt', label: 'Tacho voltage V_t', unit: 'V' }, { id: 'nt2', label: 'Speed from tacho', unit: 'rpm' }, { id: 'ne', label: 'Speed from encoder', unit: 'rpm' }, { id: 'qe', label: 'Encoder speed resolution', unit: 'rpm' }],
    charts: [{ id: 'c', title: 'Speed estimates', x: 'time (s)', y: 'rpm', series: [{ label: 'true' }, { label: 'tachogenerator' }, { label: 'encoder Δcount/T_s', stepped: true }], window: 600 }],
    reset(S) { S.ang = 0; S.cnt = 0; S.lastCnt = 0; S.acc = 0; S.ne = 0; },
    step(S, dt) {
      const p = S.p, prof = 0.5 - 0.5 * Math.cos(0.5 * S.t); const n = p.w * prof * (S.t % 25 < 20 ? 1 : 0.15); S.n = n; const w = n * 2 * PI / 60;
      S.ang += w * dt; const counts = Math.floor(S.ang / (2 * PI) * 4 * p.N); S.acc += dt;
      if (S.acc >= p.Ts / 1000) { S.ne = (counts - S.lastCnt) / (4 * p.N) / S.acc * 60; S.lastCnt = counts; S.acc = 0; }
      S.vt = p.Kt * n / 1000 * (1 + p.rip / 100 * Math.sin(S.ang * 12));
      S.chart('c').push(S.t, [n, S.vt / p.Kt * 1000, S.ne]);
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, n = S.n || 0, cx = W * 0.25, cy = H * 0.5, R = Math.min(70, H * 0.25);
      D.rect(S, cx - R * 2.2, cy - R * 0.7, R * 1.6, R * 1.4, '#1d2b48', C.cyan, 1.5, 8); D.text(S, 'Tachogenerator', cx - R * 1.4, cy - R * 0.85, { size: 11, align: 'center', color: C.cyan });
      D.text(S, 'N S', cx - R * 1.4, cy + 4, { size: 14, weight: 700, align: 'center' });
      D.rect(S, cx - R * 0.6, cy - 6, R * 2.2, 12, '#9fb3d1');
      const g = S.ctx; for (let k = 0; k < 24; k++) { const a = (S.ang || 0) + k * PI / 12; D.line(S, cx + R * 1.2 + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55, cx + R * 1.2 + Math.cos(a) * R * 0.65, cy + Math.sin(a) * R * 0.65, k % 2 ? C.amber : '#fff', 3); }
      D.circle(S, cx + R * 1.2, cy, R * 0.52, null, '#3a5384', 1.5); D.text(S, 'encoder disc', cx + R * 1.2, cy + R * 0.95, { size: 11, align: 'center', color: C.amber });
      D.meter(S, W * 0.68, H * 0.38, 64, S.vt || 0, 0, p.Kt * p.w / 1000 * 1.1, 'tacho V_t', 'V');
      D.lcd(S, W * 0.6, H * 0.68, 150, M.fmt(S.ne || 0, 1) + ' rpm', 'encoder speed');
      const qe = 60 / (4 * p.N * p.Ts / 1000);
      S.set('nt', n); S.set('vt', S.vt || 0); S.set('nt2', (S.vt || 0) / p.Kt * 1000); S.set('ne', S.ne || 0); S.set('qe', qe);
      D.text(S, `V_t = K_t ω (1.37);   encoder: ω ≈ Δθ/T_s, Δθ = Δcount · 2π/(4N)`, 16, 22, { size: 12 });
    }
  });

  /* ================= D. Acceleration: seismic accelerometer ================= */
  RIL.defineSim({
    id: 'accelerometer', title: 'Seismic accelerometer (spring–mass–damper)', unit: 1, category: 'sensors', kind: '2d', autoDefault: true, auto: true,
    description: 'Proof mass m on spring k and damper c inside a housing that is accelerated. The relative displacement z obeys z̈ + 2ζωₙż + ωₙ²z = −a, so below resonance z ≈ −a/ωₙ² (1.39) and the sensor output −ωₙ²z tracks a.',
    help: 'Choose the base motion. With the default (slowed-down) natural frequency the mass motion is visible. Raise the input frequency towards fₙ and the indicated acceleration departs from the true value; ζ ≈ 0.7 gives the widest flat range.',
    controls: [
      { id: 'inp', type: 'select', label: 'Housing acceleration a(t)', string: true, value: 'sine', options: [['sine', 'Sinusoidal vibration'], ['step', 'Step (sudden start)'], ['shock', 'Half-sine shock']] },
      { id: 'A', label: 'Acceleration amplitude', min: 0.5, max: 20, step: 0.1, value: 5, unit: 'm/s²' },
      { id: 'f', label: 'Input frequency', min: 0.05, max: 3, step: 0.01, value: 0.3, unit: 'Hz' },
      { id: 'm', label: 'Proof mass m', min: 0.005, max: 0.2, step: 0.001, value: 0.05, unit: 'kg' },
      { id: 'fn', label: 'Natural frequency fₙ (sets k = mωₙ²)', min: 0.3, max: 5, step: 0.01, value: 1.5, unit: 'Hz' },
      { id: 'zeta', label: 'Damping ratio ζ', min: 0.02, max: 1.5, step: 0.01, value: 0.7 }
    ],
    readouts: [{ id: 'k', label: 'Spring stiffness k = mωₙ²', unit: 'N/m' }, { id: 'a', label: 'True a', unit: 'm/s²' }, { id: 'z', label: 'Relative displacement z', unit: 'mm' }, { id: 'ai', label: 'Indicated a = −ωₙ²z', unit: 'm/s²' }, { id: 'ar', label: 'Amplitude ratio at f' }],
    charts: [{ id: 'c', title: 'True and indicated acceleration', x: 'time (s)', y: 'm/s²', series: [{ label: 'true a' }, { label: 'indicated −ωₙ²z' }], window: 800 }],
    substeps: 10,
    reset(S) { S.z = [0, 0]; S.base = [0, 0]; },
    onControl(S) { S.reset(); S.chart('c').clear(); S.t = 0; },
    a(S, t) { const p = S.p; if (p.inp === 'sine') return p.A * Math.sin(2 * PI * p.f * t); if (p.inp === 'step') return t > 0.5 ? p.A : 0; const tt = (t % 6) - 0.5; return tt > 0 && tt < 0.4 ? p.A * Math.sin(PI * tt / 0.4) : 0; },
    step(S, dt) {
      const p = S.p, wn = 2 * PI * p.fn;
      S.z = M.rk4((t, x) => [x[1], -this.a(S, S.t + t) - 2 * p.zeta * wn * x[1] - wn * wn * x[0]], S.z, 0, dt);
      S.base = M.rk4((t, x) => [x[1], this.a(S, S.t + t) - 0.4 * x[1] - 0.4 * x[0]], S.base, 0, dt); // housing position (weakly centred for display)
      S.chart('c').push(S.t, [this.a(S, S.t), -wn * wn * S.z[0]]);
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, wn = 2 * PI * p.fn, z = S.z[0], k = p.m * wn * wn;
      const hx = W * 0.3 + M.clamp(S.base[0], -2, 2) * 40, cy = H * 0.5, hw = 220, hh = 120;
      D.rect(S, hx - hw / 2, cy - hh / 2, hw, hh, 'rgba(19,38,74,.6)', '#8fa3c4', 2, 8); D.text(S, 'housing (moves with the robot link)', hx, cy - hh / 2 - 8, { size: 10.5, align: 'center', color: C.muted });
      const mx = hx + M.clamp(z * 1000 * 8, -hw / 2 + 30, hw / 2 - 30);
      D.spring(S, hx - hw / 2, cy - 18, mx - 24, cy - 18, 8, 7); D.text(S, 'k', (hx - hw / 2 + mx - 24) / 2, cy - 30, { size: 11, color: C.muted });
      D.line(S, hx - hw / 2, cy + 18, mx - 40, cy + 18, C.muted, 2); D.rect(S, mx - 46, cy + 8, 22, 20, null, C.muted, 2); D.text(S, 'c', mx - 35, cy + 42, { size: 11, color: C.muted, align: 'center' });
      D.rect(S, mx - 24, cy - 32, 48, 64, C.amber, '#fff', 1.5, 4); D.text(S, 'm', mx, cy + 5, { size: 14, weight: 700, align: 'center', color: '#0e1d38' });
      D.line(S, hx, cy + hh / 2 + 8, hx, cy + hh / 2 + 20, C.green, 1.5); D.arrow(S, hx, cy + hh / 2 + 14, mx, cy + hh / 2 + 14, C.cyan, 1.5, 6); D.text(S, 'z (×8000 for visibility)', hx, cy + hh / 2 + 34, { size: 10, align: 'center', color: C.cyan });
      D.arrow(S, hx, cy - hh / 2 - 26, hx + this.a(S, S.t) * 6, cy - hh / 2 - 26, C.red, 2.5);
      const r = (p.f / p.fn), ar = M.inst.secondOrderFreq(r, p.zeta).M;
      D.box(S, W * 0.62, 30, Math.min(300, W * 0.36), 'Seismic accelerometer model', [['ωₙ = √(k/m)', M.fmt(wn, 3) + ' rad/s'], ['Static sensitivity z/a = 1/ωₙ²', M.fmt(1e3 / (wn * wn), 3) + ' mm/(m/s²)'], ['Frequency ratio r = f/fₙ', M.fmt(r, 3)], ['Amplitude ratio (1.28)', M.fmt(ar, 3)], ['Usable range (ζ = 0.7)', '≈ 0.4 fₙ = ' + M.fmt(0.4 * p.fn, 2) + ' Hz']]);
      S.set('k', k); S.set('a', this.a(S, S.t)); S.set('z', z * 1000); S.set('ai', -wn * wn * z); S.set('ar', ar);
    }
  });

  /* ================= E/F. Force and torque sensing ================= */
  RIL.defineSim({
    id: 'force-torque-sensor', title: 'Force and torque sensors: cantilever load cell and torque shaft', unit: 1, category: 'sensors', kind: '2d',
    description: 'Elastic-element force and torque transducers with full strain-gauge bridges: cantilever strain ε = 6FL/(Ebh²) (1.53) and shaft torque strain ε₄₅ = 8T/(πd³G) (1.54).',
    help: 'Apply the load and change the geometry. The deflection drawing is exaggerated; strain, bridge output and sensitivity are computed exactly from the equations. Defaults reproduce Example 1.30 (50 N → 857 µε, 17.1 mV) and Example 1.31 (50 N·m → 199 µε, 3.98 mV).',
    controls: [
      { id: 'mode', type: 'select', label: 'Transducer', string: true, value: 'cant', options: [['cant', 'Cantilever load cell (force)'], ['shaft', 'Strain-gauge torque shaft (torque)']] },
      { id: 'F', label: 'Applied force F | torque T', min: 0, max: 100, step: 0.5, value: 50, unit: 'N | N·m' },
      { id: 'L', label: 'Length L (mm) | shaft diameter d (mm)', min: 5, max: 200, step: 1, value: 100 },
      { id: 'b', label: 'Width b (mm)', min: 5, max: 50, step: 0.5, value: 20 },
      { id: 'h', label: 'Thickness h (mm)', min: 1, max: 15, step: 0.1, value: 5 },
      { id: 'E', label: 'Modulus E | G', min: 20, max: 210, step: 1, value: 70, unit: 'GPa' },
      { id: 'GF', label: 'Gauge factor G_F', min: 1.5, max: 3, step: 0.01, value: 2 },
      { id: 'Vex', label: 'Bridge excitation V_ex', min: 1, max: 12, step: 0.1, value: 10, unit: 'V' }
    ],
    readouts: [{ id: 'eps', label: 'Strain at gauges', unit: 'µε' }, { id: 'sig', label: 'Stress', unit: 'MPa' }, { id: 'vo', label: 'Full-bridge output V_o = V_ex G_F ε', unit: 'mV' }, { id: 'sens', label: 'Sensitivity' }, { id: 'ro', label: 'Rated output', unit: 'mV/V' }],
    charts: [{ id: 'c', title: 'Calibration line', x: 'load', y: 'V_o (mV)', series: [{ label: 'V_o(load)' }, { label: 'operating point', points: true, line: false }] }],
    autostart: false,
    onControl(S, id, v) { if (id === 'mode') { if (v === 'shaft') { relabel(S, 'L', 'Shaft diameter d (mm)', 5, 60, 0.5, 20); relabel(S, 'E', 'Shear modulus G (GPa)', 20, 100, 1, 80); } else { relabel(S, 'L', 'Length L (mm)', 20, 200, 1, 100); relabel(S, 'E', 'Young\'s modulus E (GPa)', 20, 210, 1, 70); } } },
    calc(p, load) { if (p.mode === 'cant') { const e = M.inst.cantileverStrain(load, p.L / 1000, p.E * 1e9, p.b / 1000, p.h / 1000); return { e, s: e * p.E * 1e9 / 1e6 }; } const e = M.inst.shaftStrain45(load, p.L / 1000, p.E * 1e9); return { e, s: 16 * load / (PI * (p.L / 1000) ** 3) / 1e6 }; },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, r = this.calc(p, p.F), vo = p.Vex * p.GF * r.e * 1000;
      if (p.mode === 'cant') {
        const x0 = 70, y0 = H * 0.42, Lp = Math.min(W * 0.5, 380), th = 8 + p.h * 2;
        D.rect(S, x0 - 40, y0 - 60, 40, 120, '#3b4f75', '#8fa3c4', 1.5); for (let k = 0; k < 6; k++) D.line(S, x0 - 40, y0 - 60 + k * 24, x0 - 52, y0 - 48 + k * 24, C.muted, 1);
        const defl = M.clamp(r.e * 4e4, 0, 90); const pts = [], pts2 = [];
        for (let k = 0; k <= 30; k++) { const s = k / 30, x = x0 + s * Lp, y = y0 + defl * s * s * (3 - s) / 2; pts.push([x, y - th / 2]); pts2.push([x, y + th / 2]); }
        D.poly(S, pts.concat(pts2.reverse()), '#8aa0c6', '#c9d6ec', 1.5);
        D.rect(S, x0 + 12, y0 - th / 2 - 5, 34, 5, C.red); D.rect(S, x0 + 12, y0 + th / 2, 34, 5, C.cyan); D.text(S, 'T (tension) gauges', x0 + 12, y0 - th / 2 - 10, { size: 10, color: C.red }); D.text(S, 'C (compression) gauges', x0 + 12, y0 + th / 2 + 18, { size: 10, color: C.cyan });
        const tip = pts[0]; const ex = x0 + Lp, ey = y0 + defl; D.arrow(S, ex - 4, ey - 70, ex - 4, ey - th / 2 - 2, C.amber, 3); D.text(S, `F = ${p.F} N`, ex + 4, ey - 50, { size: 13, weight: 700, color: C.amber });
        D.text(S, 'ε = 6FL/(Ebh²)  (1.53);  full bridge V_o = V_ex G_F ε', 16, 22, { size: 12 });
      } else {
        const cx = W * 0.32, cy = H * 0.45, Lp = Math.min(W * 0.46, 340), rr = 14 + p.L * 0.8; const tw = M.clamp(r.e * 2500, 0, 1.2);
        D.rect(S, cx - Lp / 2, cy - rr, Lp, 2 * rr, '#8aa0c6', '#c9d6ec', 1.5, 6);
        for (let k = 0; k <= 8; k++) { const x = cx - Lp / 2 + k * Lp / 8; D.line(S, x, cy - rr, x + tw * rr * 1.2, cy + rr, 'rgba(14,29,56,.45)', 1.2); }
        D.rect(S, cx - 18, cy - 14, 14, 28, C.red); D.rect(S, cx + 6, cy - 14, 14, 28, C.cyan); D.text(S, '±45° gauges', cx, cy + rr + 18, { size: 11, align: 'center', color: C.muted });
        const arc = (x, dir) => { const g = S.ctx; g.strokeStyle = C.amber; g.lineWidth = 3; g.beginPath(); g.ellipse(x, cy, 12, rr + 12, 0, -1.2 * dir, 1.2 * dir, dir < 0); g.stroke(); };
        arc(cx - Lp / 2 - 10, 1); arc(cx + Lp / 2 + 10, -1); D.text(S, `T = ${p.F} N·m`, cx + Lp / 2 + 30, cy - rr - 10, { size: 13, weight: 700, color: C.amber });
        D.text(S, 'τ = 16T/(πd³);  ε₄₅ = τ/(2G) = 8T/(πd³G)  (1.54)', 16, 22, { size: 12 });
      }
      // bridge
      const bx = W * 0.82, by = H * 0.66, s = 46; D.poly(S, [[bx, by - s], [bx + s, by], [bx, by + s], [bx - s, by]], null, C.text, 2);
      [['+ε', bx - s / 2 - 16, by - s / 2 - 6, C.red], ['−ε', bx + s / 2 + 4, by - s / 2 - 6, C.cyan], ['+ε', bx + s / 2 + 4, by + s / 2 + 14, C.red], ['−ε', bx - s / 2 - 16, by + s / 2 + 14, C.cyan]].forEach(a => D.text(S, a[0], a[1], a[2], { size: 11, color: a[3], weight: 700 }));
      D.text(S, `V_o = ${M.fmt(vo, 3)} mV`, bx, by + s + 26, { size: 13, align: 'center', weight: 700, color: C.amber }); D.text(S, 'full bridge', bx, by - s - 8, { size: 10, align: 'center', color: C.muted });
      const max = 100, unitL = p.mode === 'cant' ? 'N' : 'N·m', pts = [[0, 0], [max, p.Vex * p.GF * this.calc(p, max).e * 1000]];
      S.chart('c').set(0, pts); S.chart('c').set(1, [[p.F, vo]]);
      S.set('eps', r.e * 1e6); S.set('sig', r.s); S.set('vo', vo); S.set('sens', M.fmt(vo / (p.F || 1), 4) + ' mV/' + unitL); S.set('ro', vo / p.Vex);
    }
  });

  /* ================= G. Proximity sensors ================= */
  const MAT = { steel: { n: 'Mild steel', kInd: 1.0, er: 1e6, refl: 0.5, mag: false }, al: { n: 'Aluminium', kInd: 0.4, er: 1e6, refl: 0.8, mag: false }, plastic: { n: 'Plastic (ABS)', kInd: 0, er: 3, refl: 0.6, mag: false }, water: { n: 'Water / liquid', kInd: 0, er: 80, refl: 0.2, mag: false }, wood: { n: 'Wood (dark)', kInd: 0, er: 2.5, refl: 0.15, mag: false }, magnet: { n: 'Steel part with magnet', kInd: 1.0, er: 1e6, refl: 0.4, mag: true } };
  const SENS = { ind: { n: 'Inductive (eddy current)', Sn: 8 }, cap: { n: 'Capacitive', Sn: 15 }, mag: { n: 'Magnetic (reed / Hall)', Sn: 40 }, photo: { n: 'Photoelectric (diffuse)', Sn: 200 }, us: { n: 'Ultrasonic (range)', Sn: 3000 } };
  RIL.defineSim({
    id: 'proximity-sensors', title: 'Proximity and range sensors: object detection', unit: 1, category: 'sensors', kind: '2d', auto: true, autoDefault: true,
    description: 'An object approaches the sensor face. Inductive, capacitive, magnetic, photoelectric and ultrasonic sensors respond according to their physics: metals only, permittivity, magnet present, reflectivity, or echo time d = v_s t/2 with v_s ≈ 331.3 + 0.606T (1.40).',
    help: 'Pick a sensor and a target material and drag the object (or use Automatic). The switching distance is scaled by the material factor; switching uses about 10 % hysteresis. For the ultrasonic ranger change the air temperature to see the error of an uncompensated sensor (Example 1.21).',
    controls: [
      { id: 'sens', type: 'select', label: 'Sensor type', string: true, value: 'ind', options: Object.entries(SENS).map(([k, v]) => [k, v.n]) },
      { id: 'mat', type: 'select', label: 'Target material', string: true, value: 'steel', options: Object.entries(MAT).map(([k, v]) => [k, v.n]) },
      { id: 'd', label: 'Object distance', min: 0, max: 100, step: 0.1, value: 20, unit: '% of range' },
      { id: 'T', label: 'Air temperature (ultrasonic)', min: -10, max: 50, step: 0.5, value: 35, unit: '°C' }
    ],
    readouts: [{ id: 'dist', label: 'Actual distance', unit: 'mm' }, { id: 'sr', label: 'Effective switching distance', unit: 'mm' }, { id: 'out', label: 'Output' }, { id: 'x', label: 'Range reading / echo' }],
    charts: [{ id: 'c', title: 'Sensor output', x: 'time (s)', y: 'output', series: [{ label: 'switch state / range (normalised)', stepped: true }, { label: 'object distance (normalised)' }], window: 600 }],
    reset(S) { S.state = 0; },
    onPointer(S, type, x) { if ((type === 'down' || type === 'drag') && S.face) S.setParam('d', +M.clamp((x - S.face) / S.span * 100, 0, 100).toFixed(1), true); },
    step(S, dt) { if (S.auto && !S.pointer.down) S.setParam('d', +(50 + 48 * Math.sin(0.5 * S.t)).toFixed(1), true); const sn = this.sn(S); const rng = SENS[S.p.sens].Sn * 1.6; const d = S.p.d / 100 * rng; if (S.p.sens !== 'us') { if (d < sn) S.state = 1; else if (d > sn * 1.1) S.state = 0; } S.chart('c').push(S.t, [S.p.sens === 'us' ? Math.min(1, d / rng) : S.state, d / rng]); },
    sn(S) { const s = SENS[S.p.sens], m = MAT[S.p.mat]; if (S.p.sens === 'ind') return s.Sn * m.kInd; if (S.p.sens === 'cap') return s.Sn * Math.min(1, Math.log10(m.er) / 1.9); if (S.p.sens === 'mag') return m.mag ? s.Sn : 0; if (S.p.sens === 'photo') return s.Sn * m.refl; return s.Sn; },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, s = SENS[p.sens], m = MAT[p.mat], rng = s.Sn * 1.6, d = p.d / 100 * rng, sn = this.sn(S);
      const fx = 120, cy = H * 0.48, span = W - fx - 120; S.face = fx; S.span = span; const X = v => fx + v / rng * span;
      D.rect(S, 20, cy - 34, fx - 20, 68, '#1d2b48', C.cyan, 2, 6); D.text(S, s.n.split(' ')[0], 70, cy + 4, { size: 11, align: 'center', weight: 650 });
      D.circle(S, 40, cy - 46, 7, S.state || (p.sens === 'us') ? C.green : '#33415e', '#fff', 1); D.text(S, 'LED', 52, cy - 42, { size: 10, color: C.muted });
      // field
      if (p.sens === 'us') { const tc = (S.t * 1.2) % 1; for (let k = 0; k < 3; k++) { const rr = ((tc + k / 3) % 1) * (X(d) - fx); D.circle(S, fx, cy, rr, null, `rgba(76,194,255,${0.6 - 0.5 * rr / span})`, 1.5); } }
      else if (p.sens === 'photo') { D.line(S, fx, cy - 6, X(d), cy - 6, 'rgba(255,123,123,.7)', 2); D.line(S, X(d), cy + 6, fx, cy + 6, `rgba(255,123,123,${0.8 * m.refl})`, 2, [5, 4]); }
      else { for (let k = 1; k <= 4; k++) { const g = S.ctx; g.strokeStyle = `rgba(76,194,255,${0.45 - k * 0.08})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(fx, cy, k * span * s.Sn / rng / 3.2, 30 + k * 6, 0, -PI / 2, PI / 2); g.stroke(); } }
      if (sn > 0 && p.sens !== 'us') { D.line(S, X(sn), cy - 70, X(sn), cy + 70, C.amber, 1.5, [6, 4]); D.text(S, 'S_r', X(sn) - 6, cy - 76, { size: 11, color: C.amber }); D.line(S, X(sn * 1.1), cy - 60, X(sn * 1.1), cy + 60, 'rgba(242,165,22,.4)', 1, [3, 4]); }
      const col = { steel: '#9fb3d1', al: '#d6dde8', plastic: '#ff9f6b', water: '#4c9bff', wood: '#7a5634', magnet: '#9fb3d1' }[p.mat];
      D.rect(S, X(d), cy - 40, 50, 80, col, '#fff', 1.5, 4); if (m.mag) { D.rect(S, X(d), cy - 12, 12, 24, C.red); D.text(S, 'N', X(d) + 3, cy + 4, { size: 10, weight: 700 }); }
      D.text(S, m.n, X(d) + 25, cy + 56, { size: 11, align: 'center', color: C.muted });
      D.line(S, fx, cy + 90, X(d), cy + 90, C.muted, 1); D.text(S, `${M.fmt(d, 1)} mm`, (fx + X(d)) / 2, cy + 104, { size: 11, align: 'center' });
      let out, rd;
      if (p.sens === 'us') { const vs = M.inst.ultrasonicSpeed(p.T), t = 2 * d / 1000 / vs, dAssumed = 343 * t / 2 * 1000; out = 'echo ' + M.fmt(t * 1000, 3) + ' ms'; rd = `assume 343 m/s: ${M.fmt(dAssumed, 1)} mm; compensated: ${M.fmt(d, 1)} mm`; D.text(S, `v_s = 331.3 + 0.606T = ${M.fmt(vs, 1)} m/s (1.40); uncompensated error ${M.fmt((dAssumed - d) / d * 100, 2)} %`, 16, 22, { size: 12 }); }
      else { out = S.state ? 'ON (object detected)' : 'OFF'; rd = sn > 0 ? 'switch only' : 'this target cannot be detected'; D.text(S, `${s.n}: rated S_n = ${s.Sn} mm × material factor → S_r = ${M.fmt(sn, 1)} mm`, 16, 22, { size: 12 }); }
      S.set('dist', d); S.set('sr', p.sens === 'us' ? s.Sn : sn); S.set('out', out, S.state ? 'ok' : ''); S.set('x', rd);
    }
  });

  /* ================= Temperature measurement (Topic I.11) ================= */
  RIL.defineSim({
    id: 'temperature-sensors', title: 'Temperature measurement: RTD, thermistor and thermocouple', unit: 1, category: 'sensors', kind: '2d', auto: true, autoDefault: false,
    description: 'A heated bath carries a Pt100 RTD (Callendar–Van Dusen, 1.43), an NTC thermistor (β model, 1.44) and a type K thermocouple with cold-junction compensation (1.46). Each converts the same temperature into its own electrical output.',
    help: 'Set the bath temperature (or use Automatic for a slow heating cycle) and the reference-junction temperature. Defaults reproduce Examples 1.23–1.25. Compare the linear RTD approximation with the exact CVD equation.',
    controls: [
      { id: 'T', label: 'Bath temperature T', min: -50, max: 400, step: 0.5, value: 150, unit: '°C' },
      { id: 'Tr', label: 'Reference (cold) junction T_r', min: 0, max: 50, step: 0.5, value: 25, unit: '°C' },
      { id: 'I', label: 'RTD measuring current', min: 0.1, max: 10, step: 0.1, value: 1, unit: 'mA' },
      { id: 'beta', label: 'Thermistor β', min: 3000, max: 4500, step: 10, value: 3950, unit: 'K' },
      { id: 'cjc', type: 'toggle', label: 'Apply cold-junction compensation', value: true }
    ],
    readouts: [{ id: 'rtd', label: 'Pt100 R_T (CVD)', unit: 'Ω' }, { id: 'rlin', label: 'T from linear α = 0.00385', unit: '°C' }, { id: 'sh', label: 'RTD self-heating ΔT (2 mW/°C)', unit: '°C' }, { id: 'ntc', label: 'NTC resistance', unit: 'kΩ' }, { id: 'emf', label: 'Thermocouple EMF E(T,T_r)', unit: 'mV' }, { id: 'tc', label: 'Thermocouple indicated T', unit: '°C' }],
    charts: [{ id: 'c', title: 'Sensor characteristics (normalised to value at 0 °C / 1 mV scale)', x: 'temperature (°C)', y: 'R/R₀ or E (×0.1 mV)', series: [{ label: 'Pt100 R/R₀' }, { label: 'NTC R/R₂₅ (log scale omitted)' }, { label: 'type K E/10 mV' }, { label: 'operating T', points: true, line: false }] }],
    step(S) { if (S.auto) S.setParam('T', +(175 + 175 * Math.sin(0.15 * S.t - 1)).toFixed(1), true); },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H;
      const R = M.inst.rtdCVD(p.T), Tlin = (R / 100 - 1) / 0.00385, sh = (p.I / 1000) ** 2 * R * 1000 / 2;
      const Rn = M.inst.ntc(p.T, 10000, p.beta) / 1000;
      const E = M.inst.typeK_mV(p.T) - M.inst.typeK_mV(p.Tr); const Tind = p.cjc ? M.inst.typeK_inverse(E + M.inst.typeK_mV(p.Tr)) : M.inst.typeK_inverse(E);
      // bath
      const bx = 40, bw = Math.min(W * 0.42, 330), by = H * 0.3, bh = H * 0.55; const heat = M.clamp((p.T + 50) / 450, 0, 1);
      D.rect(S, bx, by, bw, bh, `rgb(${Math.round(40 + 180 * heat)},${Math.round(70 + 20 * heat)},${Math.round(140 - 110 * heat)})`, '#c9d6ec', 2, 6);
      for (let k = 0; k < 8; k++) { const yy = by + bh - ((S.t * 30 * heat + k * 37) % bh); D.circle(S, bx + 20 + k * bw / 8, yy, 2 + heat * 2, 'rgba(255,255,255,.35)'); }
      D.text(S, `${M.fmt(p.T, 1)} °C`, bx + bw / 2, by + bh + 22, { size: 14, weight: 700, align: 'center' });
      const probes = [['Pt100 RTD', bx + bw * 0.2, C.cyan], ['NTC', bx + bw * 0.5, C.violet], ['Type K', bx + bw * 0.8, C.amber]];
      probes.forEach(([n, x, c]) => { D.rect(S, x - 4, by - 60, 8, bh * 0.75 + 60, c); D.text(S, n, x, by - 66, { size: 11, align: 'center', color: c, weight: 650 }); });
      // thermocouple reference junction
      D.rect(S, bx + bw * 0.8 - 30, by - 110, 60, 26, '#1d2b48', C.amber, 1, 4); D.text(S, `T_r ${p.Tr} °C`, bx + bw * 0.8, by - 93, { size: 10.5, align: 'center' });
      const ix = Math.min(W - 250, bx + bw + 40);
      D.box(S, ix, 30, 230, 'Pt100 RTD  R_T = R₀(1 + AT + BT²)', [['R_T', M.fmt(R, 3) + ' Ω'], ['V = I·R_T', M.fmt(p.I * R, 2) + ' mV'], ['Linear-model T', M.fmt(Tlin, 2) + ' °C']], { tc: C.cyan });
      D.box(S, ix, 112, 230, 'NTC  R = R₂₅ exp[β(1/T − 1/T₂₅)]', [['R', M.fmt(Rn, 3) + ' kΩ'], ['Sensitivity α = −β/T²', M.fmt(-p.beta / (p.T + 273.15) ** 2 * 100, 2) + ' %/°C']], { tc: C.violet });
      D.box(S, ix, 178, 230, 'Type K  E(T,0) = E(T,T_r) + E(T_r,0)', [['Measured E(T,T_r)', M.fmt(E, 3) + ' mV'], ['+ E(T_r,0) (CJC)', p.cjc ? M.fmt(M.inst.typeK_mV(p.Tr), 3) + ' mV' : 'not added'], ['Indicated T', M.fmt(Tind, 1) + ' °C', Math.abs(Tind - p.T) > 2 ? C.red : C.green]], { tc: C.amber });
      S.set('rtd', R); S.set('rlin', Tlin); S.set('sh', sh); S.set('ntc', Rn); S.set('emf', E); S.set('tc', Tind);
      if (!S._charted) { const a = [], b = [], c = []; for (let T = -50; T <= 400; T += 10) { a.push([T, M.inst.rtdCVD(T) / 100]); b.push([T, Math.min(5, M.inst.ntc(T, 10000, p.beta) / 10000)]); c.push([T, M.inst.typeK_mV(T) / 10]); } const ch = S.chart('c'); ch.set(0, a); ch.set(1, b); ch.set(2, c); S._charted = p.beta; }
      if (S._charted !== p.beta) S._charted = false;
      S.chart('c').set(3, [[p.T, R / 100], [p.T, Math.min(5, Rn / 10)], [p.T, (E + (p.cjc ? M.inst.typeK_mV(p.Tr) : 0)) / 10]]);
    }
  });

  /* ================= Pressure measurement (Topic I.12) ================= */
  RIL.defineSim({
    id: 'pressure-sensors', title: 'Pressure measurement: manometer, diaphragm and Bourdon tube', unit: 1, category: 'sensors', kind: '2d', auto: true, autoDefault: false,
    description: 'Applied pressure deforms a sensing element and is transduced: U-tube manometer Δp = ρgh (1.47), clamped diaphragm deflection y_c = 3p(1−ν²)a⁴/(16Et³) (1.48) with strain-gauge read-out, and a Bourdon tube driving a pointer.',
    help: 'Choose the sensing element and apply pressure. The diaphragm defaults reproduce Example 1.27 (1 MPa → 68.3 µm, 683 µε) and the small-deflection check y_c/t < 0.25.',
    controls: [
      { id: 'mode', type: 'select', label: 'Sensing element', string: true, value: 'dia', options: [['mano', 'U-tube manometer'], ['dia', 'Diaphragm + strain gauges'], ['bourdon', 'Bourdon tube gauge']] },
      { id: 'p', label: 'Applied gauge pressure p', min: 0, max: 2000, step: 1, value: 1000, unit: 'kPa' },
      { id: 'rho', label: 'Manometer fluid density ρ', min: 800, max: 13600, step: 1, value: 13546, unit: 'kg/m³' },
      { id: 'a', label: 'Diaphragm radius a', min: 3, max: 30, step: 0.1, value: 10, unit: 'mm' },
      { id: 'th', label: 'Diaphragm thickness t', min: 0.1, max: 2, step: 0.01, value: 0.5, unit: 'mm' },
      { id: 'E', label: 'Young\'s modulus E', min: 50, max: 220, step: 1, value: 200, unit: 'GPa' }
    ],
    readouts: [{ id: 'pk', label: 'Pressure', unit: 'kPa' }, { id: 'o1', label: '—' }, { id: 'o2', label: '—' }, { id: 'o3', label: '—' }],
    charts: [{ id: 'c', title: 'Element output versus pressure', x: 'pressure (kPa)', y: 'output', series: [{ label: 'characteristic' }, { label: 'operating point', points: true, line: false }] }],
    onControl(S, id, v) { if (id === 'mode') relabel(S, 'p', 'Applied gauge pressure p', 0, v === 'mano' ? 100 : 2000, v === 'mano' ? 0.1 : 1, v === 'mano' ? 19.9 : 1000); },
    step(S) { if (S.auto) { const mx = S.p.mode === 'mano' ? 100 : 2000; S.setParam('p', +(mx / 2 + mx / 2 * Math.sin(0.3 * S.t)).toFixed(1), true); } },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, P = p.p * 1000, nu = 0.3; const ch = S.chart('c');
      if (p.mode === 'mano') {
        const h = M.clamp(P / (p.rho * M.g0), 0, 10); const cx = W * 0.3, top = 40, bot = H - 40, sc = (bot - top - 40) / Math.max(0.2, 100e3 / (p.rho * M.g0)); const lv = (bot - top) / 2 + top;
        D.rect(S, cx - 70, top, 20, bot - top, '#0e1d38', '#8fa3c4', 1.5); D.rect(S, cx + 50, top, 20, bot - top, '#0e1d38', '#8fa3c4', 1.5); D.rect(S, cx - 70, bot - 20, 140, 20, '#0e1d38', '#8fa3c4', 1.5);
        const dy = h * sc / 2; D.rect(S, cx - 68, lv + dy, 16, bot - lv - dy, '#c8cdd6'); D.rect(S, cx + 52, lv - dy, 16, bot - lv + dy, '#c8cdd6'); D.rect(S, cx - 68, bot - 18, 136, 16, '#c8cdd6');
        D.arrow(S, cx - 60, top - 30, cx - 60, lv + dy - 4, C.amber, 2.5); D.text(S, 'p applied', cx - 60, top - 34, { size: 11, align: 'center', color: C.amber });
        D.line(S, cx + 80, lv - dy, cx + 80, lv + dy, C.cyan, 2); D.text(S, `h = ${M.fmt(h * 1000, 1)} mm`, cx + 88, lv + 4, { size: 12, color: C.cyan });
        D.text(S, 'Δp = ρ g h  (1.47)', 16, 22, { size: 12 });
        roLabel(S, 'o1', 'Column height h (mm)'); roLabel(S, 'o2', 'ρg (Pa/m)'); roLabel(S, 'o3', 'Pressure in mm Hg');
        S.set('pk', p.p); S.set('o1', h * 1000); S.set('o2', p.rho * M.g0); S.set('o3', P / 133.322);
        ch.set(0, [[0, 0], [100, 100e3 / (p.rho * M.g0) * 1000]]); ch.set(1, [[p.p, h * 1000]]);
      } else if (p.mode === 'dia') {
        const a = p.a / 1000, t = p.th / 1000, E = p.E * 1e9; const y = M.inst.diaphragm(P, a, t, E, nu), e = M.inst.diaphragmCentreStrain(P, a, t, E, nu);
        const cx = W * 0.32, cy = H * 0.45, Rp = Math.min(W * 0.24, 170), amp = M.clamp(y / t * 120, 0, 80);
        D.rect(S, cx - Rp - 30, cy - 10, 30, 70, '#3b4f75'); D.rect(S, cx + Rp, cy - 10, 30, 70, '#3b4f75');
        const pts = []; for (let k = 0; k <= 40; k++) { const r = -1 + 2 * k / 40; pts.push([cx + r * Rp, cy - amp * (1 - r * r) ** 2]); } D.poly(S, pts, null, '#c9d6ec', 5, false);
        for (let k = -3; k <= 3; k++) D.arrow(S, cx + k * Rp / 4, cy + 60, cx + k * Rp / 4, cy + 14, C.amber, 2, 7);
        D.text(S, 'p', cx, cy + 78, { size: 13, align: 'center', color: C.amber, weight: 700 });
        D.rect(S, cx - 14, cy - amp - 8, 28, 4, C.red); D.rect(S, cx + Rp * 0.82, cy - 5, 14, 4, C.cyan); D.text(S, 'centre gauge (+ε)', cx, cy - amp - 14, { size: 10, align: 'center', color: C.red }); D.text(S, 'edge gauge (−ε)', cx + Rp * 0.82, cy - 12, { size: 10, align: 'center', color: C.cyan });
        D.text(S, 'y_c = 3p(1−ν²)a⁴/(16Et³)  (1.48)  —  deflection drawn exaggerated', 16, 22, { size: 12 });
        const ok = y / t < 0.25; D.text(S, `y_c/t = ${M.fmt(y / t, 3)} ${ok ? '< 0.25: small-deflection model valid' : '> 0.25: large deflection, linear model invalid'}`, 16, H - 14, { size: 12, color: ok ? C.green : C.red });
        roLabel(S, 'o1', 'Centre deflection y_c (µm)'); roLabel(S, 'o2', 'Centre strain (µε)'); roLabel(S, 'o3', 'Edge strain (µε)');
        S.set('pk', p.p); S.set('o1', y * 1e6); S.set('o2', e * 1e6); S.set('o3', -2 * e * 1e6);
        const c = []; for (let k = 0; k <= 20; k++) { const pp = k * 100; c.push([pp, M.inst.diaphragm(pp * 1000, a, t, E, nu) * 1e6]); } ch.set(0, c); ch.set(1, [[p.p, y * 1e6]]);
      } else {
        const cx = W * 0.35, cy = H * 0.52, R = Math.min(W * 0.2, 120), frac = M.clamp(p.p / 2000, 0, 1);
        D.circle(S, cx, cy, R + 20, '#13264a', '#8fa3c4', 2); const g = S.ctx; g.strokeStyle = '#c9a26b'; g.lineWidth = 9; g.beginPath(); g.arc(cx, cy, R * 0.75, PI * 0.75, PI * (0.75 + 1.5 - 0.25 * frac)); g.stroke();
        for (let k = 0; k <= 10; k++) { const a = PI * (0.75 + 0.15 * k); D.line(S, cx + Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6), cx + Math.cos(a) * (R + 16), cy + Math.sin(a) * (R + 16), C.muted, 1.5); D.text(S, String(k * 200), cx + Math.cos(a) * (R + 30), cy + Math.sin(a) * (R + 30) + 4, { size: 9, align: 'center', color: C.muted }); }
        const a = PI * (0.75 + 1.5 * frac); D.line(S, cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, C.amber, 3); D.circle(S, cx, cy, 6, C.amber);
        D.text(S, 'Bourdon tube straightens under pressure; linkage, sector and pinion drive the pointer', 16, 22, { size: 12 });
        D.text(S, 'Tip travel taken as proportional to p within the elastic range (qualitative model, supplementary)', 16, H - 14, { size: 11, color: C.violet });
        roLabel(S, 'o1', 'Pointer angle (°)'); roLabel(S, 'o2', 'Pressure (bar)'); roLabel(S, 'o3', 'Pressure (psi)');
        S.set('pk', p.p); S.set('o1', 270 * frac); S.set('o2', p.p / 100); S.set('o3', p.p * 0.145038);
        ch.set(0, [[0, 0], [2000, 270]]); ch.set(1, [[p.p, 270 * frac]]);
      }
    }
  });

  /* ================= Strain gauge and Wheatstone bridge (Topic I.13) ================= */
  RIL.defineSim({
    id: 'strain-gauge-bridge', title: 'Strain-gauge measurement with a Wheatstone bridge', unit: 1, category: 'sensors', kind: '2d', auto: true, autoDefault: false,
    description: 'A cantilever is loaded; bonded gauges change resistance ΔR = G_F ε R (1.50) and a quarter, half or full Wheatstone bridge converts this to millivolts (1.51). Exact bridge output, linear approximation and temperature effects are shown.',
    help: 'Load the beam and change the bridge arrangement. With "temperature change" on, all gauges see apparent thermal strain: a quarter bridge reads it as load, while half and full bridges cancel it (adjacent arms subtract). Defaults: Example 1.29 (120 Ω, G_F = 2.1, 500 µε, 5 V).',
    controls: [
      { id: 'cfg', type: 'select', label: 'Bridge arrangement', value: 1, options: [[1, 'Quarter bridge (1 active gauge)'], [2, 'Half bridge (2 active: +ε, −ε)'], [4, 'Full bridge (4 active)']] },
      { id: 'eps', label: 'Mechanical strain ε (from load)', min: -1500, max: 1500, step: 1, value: 500, unit: 'µε' },
      { id: 'R', label: 'Gauge resistance R', min: 120, max: 1000, step: 1, value: 120, unit: 'Ω' },
      { id: 'GF', label: 'Gauge factor G_F', min: 1.8, max: 2.2, step: 0.01, value: 2.1 },
      { id: 'Vex', label: 'Excitation V_ex', min: 1, max: 10, step: 0.1, value: 5, unit: 'V' },
      { id: 'dT', label: 'Temperature change (apparent strain 6 µε/°C)', min: 0, max: 40, step: 0.5, value: 0, unit: '°C' },
      { id: 'G', label: 'In-amp gain', min: 1, max: 2000, step: 1, value: 500 }
    ],
    readouts: [{ id: 'dR', label: 'ΔR = G_F ε R (active gauge)', unit: 'Ω' }, { id: 'vex', label: 'Exact bridge output', unit: 'mV' }, { id: 'vap', label: 'Linear approx. n·V_ex G_F ε/4', unit: 'mV' }, { id: 'nl', label: 'Non-linearity', unit: '%' }, { id: 'vt', label: 'Output due to temperature only', unit: 'mV' }, { id: 'amp', label: 'Amplified output', unit: 'V' }],
    charts: [{ id: 'c', title: 'Bridge output versus strain', x: 'strain (µε)', y: 'V_o (mV)', series: [{ label: 'quarter' }, { label: 'half' }, { label: 'full' }, { label: 'operating point', points: true, line: false }] }],
    step(S) { if (S.auto) S.setParam('eps', Math.round(1200 * Math.sin(0.4 * S.t)), true); },
    arms(p, eps) {
      const n = +p.cfg, R = p.R, k = p.GF, et = 6e-6 * p.dT, e = eps * 1e-6;
      // arms: R1 (top-left, +), R2 (bottom-left), R3 (top-right), R4 (bottom-right): Vo = Vex(R1/(R1+R2) − R4/(R3+R4))
      const a = s => R * (1 + k * (s + et)); const dummy = R * (1 + k * et);
      if (n === 1) return [a(e), R, R, R].map((v, i) => i === 1 ? dummy : v); // dummy gauge adjacent only when compensating? keep fixed resistors
      if (n === 2) return [a(e), a(-e), R, R];
      return [a(e), a(-e), a(e), a(-e)];
    },
    vout(p, eps) { const [R1, R2, R3, R4] = this.arms(p, eps); return p.Vex * (R1 / (R1 + R2) - R4 / (R3 + R4)); },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, n = +p.cfg;
      const quarterArms = () => { const R = p.R, k = p.GF, et = 6e-6 * p.dT, e = p.eps * 1e-6; return [R * (1 + k * (e + et)), R, R, R]; };
      const arms = n === 1 ? quarterArms() : this.arms(p, p.eps); const vo = p.Vex * (arms[0] / (arms[0] + arms[1]) - arms[3] / (arms[2] + arms[3]));
      const armsT = n === 1 ? [p.R * (1 + p.GF * 6e-6 * p.dT), p.R, p.R, p.R] : this.arms(Object.assign({}, p), 0); const vt = p.Vex * (armsT[0] / (armsT[0] + armsT[1]) - armsT[3] / (armsT[2] + armsT[3]));
      const vap = n * p.Vex * p.GF * p.eps * 1e-6 / 4;
      // beam
      const x0 = 50, y0 = H * 0.32, Lp = Math.min(W * 0.42, 300), defl = M.clamp(p.eps / 1500 * 40, -40, 40);
      D.rect(S, x0 - 26, y0 - 40, 26, 80, '#3b4f75'); const top = [], bot = [];
      for (let k = 0; k <= 24; k++) { const s = k / 24, x = x0 + s * Lp, y = y0 + defl * s * s * (3 - s) / 2; top.push([x, y - 9]); bot.push([x, y + 9]); } D.poly(S, top.concat(bot.slice().reverse()), '#8aa0c6', '#c9d6ec', 1.5);
      D.rect(S, x0 + 10, y0 - 14, 34, 5, C.red); if (n > 1) D.rect(S, x0 + 10, y0 + 9, 34, 5, C.cyan); if (n === 4) { D.rect(S, x0 + 50, y0 - 14, 34, 5, C.red); D.rect(S, x0 + 50, y0 + 9, 34, 5, C.cyan); }
      D.arrow(S, x0 + Lp, y0 + defl - 60 * Math.sign(p.eps || 1), x0 + Lp, y0 + defl - 12 * Math.sign(p.eps || 1), C.amber, 3); D.text(S, `ε = ${p.eps} µε at gauge`, x0, y0 - 52, { size: 12, weight: 650 });
      // bridge diagram
      const bx = W * 0.72, by = H * 0.42, s = Math.min(80, H * 0.22);
      const nodes = { T: [bx, by - s], L: [bx - s, by], R: [bx + s, by], B: [bx, by + s] };
      const arm = (a, b, lbl, val, act) => { D.line(S, ...a, ...b, act ? C.amber : C.text, act ? 3 : 2); const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; D.text(S, lbl, mx + (mx < bx ? -48 : 10), my + (my < by ? -2 : 14), { size: 11, color: act ? C.amber : C.muted, weight: 650 }); D.text(S, M.fmt(val, 3) + ' Ω', mx + (mx < bx ? -48 : 10), my + (my < by ? 12 : 28), { size: 10, color: C.text }); };
      arm(nodes.T, nodes.L, 'R₁', arms[0], true); arm(nodes.L, nodes.B, 'R₂', arms[1], n > 1); arm(nodes.T, nodes.R, 'R₄', arms[3], n === 4); arm(nodes.R, nodes.B, 'R₃', arms[2], n === 4);
      D.text(S, `+V_ex = ${p.Vex} V`, bx, by - s - 10, { size: 11, align: 'center' }); D.text(S, '0 V', bx, by + s + 18, { size: 11, align: 'center' });
      D.line(S, ...nodes.L, ...nodes.R, 'rgba(76,194,255,.6)', 1.5, [4, 4]); D.text(S, `V_o = ${M.fmt(vo * 1000, 4)} mV`, bx, by + 4, { size: 13, align: 'center', weight: 700, color: C.cyan });
      D.text(S, 'V_o = V_ex [R₁/(R₁+R₂) − R₄/(R₃+R₄)];   ΔR/R = G_F ε  (1.50);   V_o ≈ n V_ex G_F ε / 4  (1.51)', 16, H - 14, { size: 11.5, color: C.muted });
      S.set('dR', p.GF * p.eps * 1e-6 * p.R); S.set('vex', vo * 1000); S.set('vap', vap * 1000); S.set('nl', vap ? (vo - vap) / vap * 100 : 0); S.set('vt', vt * 1000); S.set('amp', vo * p.G);
      const ch = S.chart('c'); [1, 2, 4].forEach((cfg, i) => { const pts = []; for (let e = -1500; e <= 1500; e += 100) { const q = Object.assign({}, p, { cfg, dT: 0 }); const ar = cfg === 1 ? [p.R * (1 + p.GF * e * 1e-6), p.R, p.R, p.R] : this.arms(q, e); pts.push([e, p.Vex * (ar[0] / (ar[0] + ar[1]) - ar[3] / (ar[2] + ar[3])) * 1000]); } ch.set(i, pts); });
      ch.set(3, [[p.eps, vo * 1000]]);
    }
  });
})();
