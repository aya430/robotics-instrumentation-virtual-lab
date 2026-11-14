/* Unit II — measurement of electrical/physical quantities, signal conditioning, in-amp, filters, shielding & grounding,
   A/D and D/A conversion, data acquisition */
(function () {
  const RIL = window.RIL, M = RIL.M, D = RIL.draw, C = RIL.C, PI = Math.PI;
  const relabel = (S, id, lbl, min, max, step, val) => { const i = S.inputs[id]; if (!i) return; i.el.min = min; i.el.max = max; i.el.step = step; const n = i.el.nextElementSibling; n.min = min; n.max = max; n.step = step; i.el.parentElement.querySelector('label span').textContent = lbl; S.setParam(id, val, true); };
  const roLabel = (S, id, txt) => { const r = S.ro[id]; if (r && r.el.previousSibling.textContent !== txt) { r.el.previousSibling.textContent = txt; r.spec.label = txt; } };
  /* complex helpers for frequency responses */
  const cx = { mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], div: (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }, abs: a => Math.hypot(a[0], a[1]), arg: a => Math.atan2(a[1], a[0]) };
  /** Butterworth low-pass H(s/ωc) evaluated at normalised s (complex) */
  const bwLP = (s, n) => { let den = [1, 0]; for (let k = 1; k <= n; k++) { const th = PI * (2 * k + n - 1) / (2 * n); den = cx.mul(den, [s[0] - Math.cos(th), s[1] - Math.sin(th)]); } return cx.div([1, 0], den); };
  RIL.filterH = (type, f, fc, n, f2, Q) => {
    const sN = [0, f / fc];
    if (type === 'lp') return bwLP(sN, n);
    if (type === 'hp') return bwLP(cx.div([1, 0], sN), n);
    if (type === 'bp') return cx.mul(bwLP([0, f / f2], n), bwLP(cx.div([1, 0], sN), n));
    const w = f / fc; return cx.div([1 - w * w, 0], [1 - w * w, w / Q]); // band-stop (notch) at fc
  };

  /* ================= Measurement of electrical and physical quantities (Topic II.10) ================= */
  RIL.defineSim({
    id: 'electrical-measurement', title: 'Virtual instruments: electrical and physical quantities', unit: 2, category: 'measurement-systems', kind: '2d', auto: true, autoDefault: true,
    description: 'A virtual instrument bench: shunt current measurement (Ex. 2.11), sampled AC power P = (1/N)Σvᵢiᵢ compared with P = V I cos φ (2.24), Wheatstone-bridge resistance R_x = R₂R₃/R₁, toothed-wheel speed n = 60f/z and orifice flow from differential pressure (Table 2.6).',
    help: 'Choose the instrument. Each display is computed from the sampled or measured signals, not typed in: the power meter multiplies sampled v and i, the bridge galvanometer deflects until balance, the speed pick-up counts tooth pulses.',
    controls: [
      { id: 'mode', type: 'select', label: 'Instrument', string: true, value: 'ac', options: [['shunt', 'DC current by shunt + amplifier'], ['ac', 'AC power meter (sampled v·i)'], ['bridge', 'Wheatstone bridge (resistance)'], ['speed', 'Speed by toothed wheel pick-up'], ['flow', 'Flow by orifice Δp']] },
      { id: 'a', label: 'Parameter 1', min: 0, max: 1, step: 0.01, value: 0.5 },
      { id: 'b', label: 'Parameter 2', min: 0, max: 1, step: 0.01, value: 0.5 },
      { id: 'c', label: 'Parameter 3', min: 0, max: 1, step: 0.01, value: 0.5 }
    ],
    readouts: [{ id: 'r1', label: '—' }, { id: 'r2', label: '—' }, { id: 'r3', label: '—' }, { id: 'r4', label: '—' }],
    charts: [{ id: 'c', title: 'Signals', x: 'time (ms)', y: 'value', series: [{ label: 's1' }, { label: 's2' }, { label: 's3' }], window: 800 }],
    preset(S) {
      const m = S.p.mode, ch = S.chart('c'); ch.clear();
      if (m === 'shunt') { relabel(S, 'a', 'Load current I (A)', 0, 120, 0.5, 100); relabel(S, 'b', 'Shunt full-scale voltage (mV)', 10, 100, 1, 50); relabel(S, 'c', 'Amplifier gain', 1, 100, 1, 50); }
      if (m === 'ac') { relabel(S, 'a', 'V_rms (V)', 10, 400, 1, 230); relabel(S, 'b', 'I_rms (A)', 0.1, 20, 0.1, 5); relabel(S, 'c', 'Phase angle φ (°, current lag)', -90, 90, 1, 36.87); }
      if (m === 'bridge') { relabel(S, 'a', 'Unknown R_x (Ω)', 10, 2000, 1, 470); relabel(S, 'b', 'Ratio arm R₂/R₁', 0.1, 10, 0.1, 1); relabel(S, 'c', 'Variable arm R₃ (Ω)', 10, 2000, 1, 300); }
      if (m === 'speed') { relabel(S, 'a', 'Shaft speed n (rpm)', 10, 3000, 10, 1200); relabel(S, 'b', 'Teeth z', 4, 120, 1, 60); relabel(S, 'c', 'Gate time (ms)', 10, 1000, 10, 100); }
      if (m === 'flow') { relabel(S, 'a', 'Differential pressure Δp (kPa)', 0, 50, 0.1, 10); relabel(S, 'b', 'Diameter ratio β = d/D', 0.2, 0.75, 0.01, 0.5); relabel(S, 'c', 'Pipe diameter D (mm)', 10, 200, 1, 50); }
      const L = { shunt: ['Shunt R_sh', 'Shunt voltage', 'Dissipation I²R_sh', 'ADC input (after gain)'], ac: ['Real power P (sampled)', 'P = V I cos φ', 'Reactive Q, apparent S', 'Power factor'], bridge: ['Galvanometer voltage', 'Balance R₃ for R_x', 'R_x = R₂R₃/R₁ (indicated)', 'Status'], speed: ['Pulse frequency f = zn/60', 'Counted pulses in gate', 'Indicated n = 60f/z', 'Resolution (one count)'], flow: ['Throat area A₂', 'Flow Q', 'Flow (L/min)', 'Velocity in pipe'] }[m];
      ['r1', 'r2', 'r3', 'r4'].forEach((id, i) => roLabel(S, id, L[i]));
      const sl = { shunt: ['I (A)', 'v_sh (mV)', 'ADC in (V)'], ac: ['v(t)/100', 'i(t)', 'p(t)/1000'], bridge: ['', '', ''], speed: ['pulses', '', ''], flow: ['Q vs Δp', '', ''] }[m]; sl.forEach((l, i) => ch.label(i, l));
    },
    reset(S) { this.preset(S); },
    onControl(S, id) { if (id === 'mode') this.preset(S); },
    step(S, dt) {
      const p = S.p, m = p.mode, ch = S.chart('c');
      if (m === 'ac') { const w = 2 * PI * 50, tt = S.t * 0.04; const v = p.a * Math.SQRT2 * Math.sin(w * tt), i = p.b * Math.SQRT2 * Math.sin(w * tt - p.c * M.D2R); ch.push(tt * 1000, [v / 100, i, v * i / 1000]); }
      if (m === 'shunt') { const I = p.a * (1 + 0.02 * Math.sin(S.t * 3)); const R = p.b / 1000 / Math.max(1, p.a); ch.push(S.t * 1000, [I, I * R * 1000, I * R * p.c]); }
      if (m === 'speed') { const f = p.b * p.a / 60, tt = S.t * 0.02; ch.push(tt * 1000, [RIL.sq(tt, f, 0.5), NaN, NaN]); }
      if (m === 'bridge' && S.auto) { const tgt = p.a / p.b; const nv = p.c + (tgt - p.c) * 0.04; S.setParam('c', +nv.toFixed(1), true); }
    },
    draw(S) {
      D.clear(S); const p = S.p, m = p.mode, W = S.W, H = S.H, ch = S.chart('c');
      if (m === 'ac') {
        const N = 200, w = 2 * PI * 50; let P = 0; for (let k = 0; k < N; k++) { const t = k / (N * 50); P += p.a * Math.SQRT2 * Math.sin(w * t) * p.b * Math.SQRT2 * Math.sin(w * t - p.c * M.D2R); } P /= N;
        const Pt = p.a * p.b * Math.cos(p.c * M.D2R), Q = p.a * p.b * Math.sin(p.c * M.D2R), Sa = p.a * p.b;
        D.lcd(S, 40, 60, 180, M.fmt(P, 1) + ' W', 'P = (1/N) Σ v_k i_k  (200 samples/cycle)'); D.lcd(S, 40, 130, 180, M.fmt(Q, 1) + ' var', 'reactive Q'); D.lcd(S, 40, 200, 180, M.fmt(Sa, 1) + ' VA', 'apparent S');
        const ox = W * 0.62, oy = H * 0.5, sc = Math.min(W * 0.25, H * 0.35) / Math.max(1, Sa);
        D.arrow(S, ox, oy, ox + P * sc, oy, C.amber, 3); D.arrow(S, ox + P * sc, oy, ox + P * sc, oy - Q * sc, C.cyan, 3); D.arrow(S, ox, oy, ox + P * sc, oy - Q * sc, C.green, 2); D.text(S, 'P', ox + P * sc / 2, oy + 16, { color: C.amber, align: 'center' }); D.text(S, 'Q', ox + P * sc + 8, oy - Q * sc / 2, { color: C.cyan }); D.text(S, 'S', ox + P * sc / 2 - 14, oy - Q * sc / 2 - 8, { color: C.green });
        D.text(S, 'power triangle', ox, oy + 40, { size: 11, color: C.muted }); D.text(S, 'P = V I cos φ,  Q = V I sin φ,  S = V I   (2.24)', 16, 24, { size: 12 });
        S.set('r1', M.fmt(P, 2) + ' W'); S.set('r2', M.fmt(Pt, 2) + ' W'); S.set('r3', M.fmt(Q, 1) + ' var, ' + M.fmt(Sa, 1) + ' VA'); S.set('r4', M.fmt(Math.cos(p.c * M.D2R), 3) + (p.c > 0 ? ' lagging' : p.c < 0 ? ' leading' : ''));
      } else if (m === 'shunt') {
        const Rsh = p.b / 1000 / 100 * (100 / Math.max(1, 100)); const R = (p.b / 1000) / 100; const v = p.a * R; const vo = v * p.c;
        D.rect(S, 60, H / 2 - 20, 160, 40, '#5a3f2a', C.amber, 1.5, 4); D.text(S, `R_sh = ${M.fmt(R * 1000, 3)} mΩ`, 140, H / 2 + 4, { size: 11, align: 'center' }); D.line(S, 20, H / 2, 60, H / 2, C.text, 4); D.line(S, 220, H / 2, 280, H / 2, C.text, 4); for (let k = 0; k < 6; k++) D.circle(S, 20 + ((S.t * 80 + k * 45) % 260), H / 2, 3, C.cyan);
        D.text(S, `I = ${M.fmt(p.a, 1)} A`, 140, H / 2 - 32, { size: 13, align: 'center', weight: 700 }); D.poly(S, [[320, H / 2 - 40], [320, H / 2 + 40], [390, H / 2]], '#f6f8fa', C.green, 2); D.text(S, `×${p.c}`, 340, H / 2 + 4, { size: 11 }); D.line(S, 60, H / 2 + 20, 320, H / 2 + 20, C.green, 1); D.line(S, 220, H / 2 - 20, 320, H / 2 - 20, C.green, 1);
        D.lcd(S, 420, H / 2 - 17, 170, M.fmt(vo, 3) + ' V', 'to ADC (0–3.3 V)'); D.text(S, 'Shunt sized for the full-scale current of 100 A: R_sh = V_FS / I_FS', 16, 24, { size: 12 });
        S.set('r1', M.fmt(R * 1000, 3) + ' mΩ'); S.set('r2', M.fmt(v * 1000, 2) + ' mV'); S.set('r3', M.fmt(p.a * p.a * R, 2) + ' W'); S.set('r4', M.fmt(vo, 3) + ' V' + (vo > 3.3 ? ' (over range)' : ''));
      } else if (m === 'bridge') {
        const R1 = 100, R2 = p.b * 100, R3 = p.c, Rx = p.a, Vex = 5; const vg = Vex * (R3 / (R3 + Rx) - R1 / (R1 + R2)); const bal = Math.abs(vg) < 2e-3;
        const bx = W * 0.35, by = H * 0.5, s = Math.min(110, H * 0.32); D.poly(S, [[bx, by - s], [bx + s, by], [bx, by + s], [bx - s, by]], null, C.text, 2);
        D.text(S, `R₁ = ${R1} Ω`, bx - s / 2 - 70, by - s / 2, { size: 11 }); D.text(S, `R₂ = ${M.fmt(R2, 0)} Ω`, bx - s / 2 - 70, by + s / 2 + 12, { size: 11 }); D.text(S, `R₃ = ${M.fmt(R3, 1)} Ω`, bx + s / 2 + 8, by - s / 2, { size: 11, color: C.amber }); D.text(S, `R_x = ?`, bx + s / 2 + 8, by + s / 2 + 12, { size: 11, color: C.cyan });
        D.meter(S, bx, by + 6, 40, vg * 1000, -50, 50, 'galvanometer', 'mV', bal ? C.green : C.red);
        D.text(S, 'Adjust R₃ until the galvanometer reads zero (Automatic mode does this): R_x = R₂R₃/R₁', 16, 24, { size: 12 });
        S.set('r1', M.fmt(vg * 1000, 3) + ' mV'); S.set('r2', M.fmt(Rx / p.b, 1) + ' Ω'); S.set('r3', M.fmt(R2 * R3 / R1, 1) + ' Ω'); S.set('r4', bal ? 'balanced' : 'not balanced', bal ? 'ok' : '');
      } else if (m === 'speed') {
        const f = p.b * p.a / 60, cnt = Math.floor(f * p.c / 1000), nInd = cnt / (p.c / 1000) * 60 / p.b; const cxp = W * 0.3, cyp = H * 0.5, R = Math.min(90, H * 0.3); const ang = S.t * p.a / 60 * 2 * PI * 0.05;
        const g = S.ctx; g.fillStyle = '#a8b1bb'; g.beginPath(); for (let k = 0; k < p.b * 2; k++) { const a = ang + k * PI / p.b, rr = k % 2 ? R : R * 0.88; g.lineTo(cxp + Math.cos(a) * rr, cyp + Math.sin(a) * rr); } g.closePath(); g.fill(); D.circle(S, cxp, cyp, 10, '#2b3440');
        D.rect(S, cxp + R + 6, cyp - 12, 50, 24, '#f6f8fa', C.cyan, 1.5, 4); D.text(S, 'pick-up', cxp + R + 31, cyp + 4, { size: 10, align: 'center', color: C.cyan });
        D.lcd(S, W * 0.6, H * 0.4, 170, M.fmt(nInd, 0) + ' rpm', `counter, gate ${p.c} ms`); D.text(S, 'f = z n / 60;  n = 60 f / z   (Table 2.6); wheel drawn at 1/20 speed', 16, 24, { size: 12 });
        S.set('r1', M.fmt(f, 1) + ' Hz'); S.set('r2', cnt); S.set('r3', M.fmt(nInd, 1) + ' rpm'); S.set('r4', M.fmt(60 / p.b / (p.c / 1000), 2) + ' rpm');
      } else {
        const Dm = p.c / 1000, d = p.b * Dm, A2 = PI * d * d / 4, rho = 1000, Cd = 0.61; const Q = Cd * A2 * Math.sqrt(2 * p.a * 1000 / (rho * (1 - p.b ** 4)));
        const x0 = 40, Lp = W - 100, cyp = H * 0.45, Rp = 40; D.rect(S, x0, cyp - Rp, Lp, 2 * Rp, 'rgba(9,105,218,.25)', '#57606a', 2); D.rect(S, x0 + Lp / 2 - 4, cyp - Rp, 8, Rp * (1 - p.b), '#57606a'); D.rect(S, x0 + Lp / 2 - 4, cyp + Rp * p.b, 8, Rp * (1 - p.b), '#57606a');
        for (let k = 0; k < 18; k++) { const xx = x0 + ((S.t * 60 * Math.sqrt(p.a + 0.1) + k * Lp / 18) % Lp); const narrow = Math.abs(xx - x0 - Lp / 2) < 30; D.circle(S, xx, cyp + ((k * 37) % (2 * Rp * (narrow ? p.b : 1)) - Rp * (narrow ? p.b : 1)), 2.5, C.cyan); }
        D.text(S, 'orifice plate', x0 + Lp / 2, cyp - Rp - 10, { size: 11, align: 'center' }); D.text(S, `Δp = ${p.a} kPa`, x0 + Lp / 2, cyp + Rp + 24, { size: 12, align: 'center', color: C.amber });
        D.text(S, 'Q = C_d A₂ √[2Δp / (ρ(1 − β⁴))],  C_d = 0.61, water', 16, 24, { size: 12 });
        S.set('r1', M.fmt(A2 * 1e6, 1) + ' mm²'); S.set('r2', M.fmt(Q * 1000, 3) + ' L/s'); S.set('r3', M.fmt(Q * 60000, 1)); S.set('r4', M.fmt(Q / (PI * Dm * Dm / 4), 3) + ' m/s');
        const pts = []; for (let k = 0; k <= 25; k++) { const dp = k * 2; pts.push([dp, Cd * A2 * Math.sqrt(2 * dp * 1000 / (rho * (1 - p.b ** 4))) * 60000]); } ch.set(0, pts); ch.set(1, [[p.a, Q * 60000]]); ch.set(2, []);
      }
    }
  });

  /* ================= Signal conditioning (Topic II.11) ================= */
  RIL.defineSim({
    id: 'signal-conditioning', title: 'Signal conditioning chain: amplify, shift, filter, scale', unit: 2, category: 'signal-conditioning', kind: '2d', auto: false,
    description: 'A millivolt bridge signal with 50 Hz interference and wide-band noise passes through an op-amp gain stage (inverting −R_f/R₁, non-inverting 1 + R_f/R₁ or difference R₂/R₁, eqs 2.25–2.27), an offset (level-shift) stage, an RC low-pass filter (f_c = 1/2πRC, 2.30) and a clamp to the ADC range.',
    help: 'Pick the amplifier configuration and resistor values so that the signal fills the 0–5 V ADC range without clipping, then set the filter cut-off between the signal frequency and the interference. Each stage output is drawn as its own trace.',
    controls: [
      { id: 'cfg', type: 'select', label: 'Amplifier configuration', string: true, value: 'non', options: [['inv', 'Inverting (−R_f/R₁)'], ['non', 'Non-inverting (1 + R_f/R₁)'], ['diff', 'Difference (R₂/R₁)']] },
      { id: 'Rf', label: 'Feedback R_f (or R₂)', min: 1, max: 1000, step: 1, value: 200, unit: 'kΩ' },
      { id: 'R1', label: 'Input R₁', min: 0.1, max: 100, step: 0.1, value: 1, unit: 'kΩ' },
      { id: 'off', label: 'Offset (level shift) added', min: -5, max: 5, step: 0.01, value: 2.5, unit: 'V' },
      { id: 'fc', label: 'Low-pass cut-off f_c', min: 1, max: 500, step: 1, value: 20, unit: 'Hz' },
      { id: 'sig', label: 'Sensor signal amplitude', min: 0.1, max: 20, step: 0.1, value: 10, unit: 'mV' },
      { id: 'fs', label: 'Signal frequency', min: 0.5, max: 20, step: 0.1, value: 2, unit: 'Hz' },
      { id: 'hum', label: '50 Hz interference amplitude', min: 0, max: 10, step: 0.1, value: 3, unit: 'mV' },
      { id: 'filt', type: 'toggle', label: 'Filter enabled', value: true }
    ],
    readouts: [{ id: 'G', label: 'Stage gain' }, { id: 'pk', label: 'Amplified peak', unit: 'V' }, { id: 'att', label: 'Filter gain at 50 Hz', unit: 'dB' }, { id: 'pass', label: 'Filter gain at signal f', unit: 'dB' }, { id: 'clip', label: 'ADC range check (0–5 V)' }, { id: 'snr', label: 'Signal-to-interference at output', unit: 'dB' }],
    charts: [{ id: 'c', title: 'Stage outputs', x: 'time (s)', y: 'V', series: [{ label: 'sensor ×100 (V)' }, { label: 'after gain + offset' }, { label: 'after filter (to ADC)' }], window: 900 }],
    substeps: 10,
    reset(S) { S.y = S.p.off; S.rng = M.rng(3); },
    gain(p) { return p.cfg === 'inv' ? -p.Rf / p.R1 : p.cfg === 'non' ? 1 + p.Rf / p.R1 : p.Rf / p.R1; },
    step(S, dt) {
      const p = S.p, h = dt * 0.2, t = S.t; const s = p.sig / 1000 * Math.sin(2 * PI * p.fs * t * 0.2), n = p.hum / 1000 * Math.sin(2 * PI * 50 * t * 0.2) + 0.0006 * M.gaussRand(S.rng);
      const G = this.gain(p), a = G * (s + n) + p.off; const tau = 1 / (2 * PI * p.fc); S.y = p.filt ? S.y + (a - S.y) * (1 - Math.exp(-h / tau)) : a; const o = M.clamp(S.y, 0, 5);
      if (S.frameCount % 1 === 0) S.chart('c').push(t * 0.2, [(s + n) * 100, a, o]);
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, G = this.gain(p); const blocks = ['Sensor\n(bridge, mV)', `Amplifier\nG = ${M.fmt(G, 1)}`, `Offset\n${M.fmt(p.off, 2)} V`, p.filt ? `RC low-pass\nf_c = ${p.fc} Hz` : 'Filter\nbypassed', 'Clamp\n→ ADC 0–5 V'];
      const bw = Math.min(130, (W - 60) / 5 - 16); blocks.forEach((b, i) => { D.block(S, 20 + i * (bw + 18), 40, bw, 58, b, { size: 10.5 }); if (i < 4) D.arrow(S, 20 + i * (bw + 18) + bw, 69, 20 + (i + 1) * (bw + 18), 69, C.amber, 2); });
      const ch = S.chart('c'); const d = ch.data(1), e = ch.data(2), s0 = ch.data(0); const tr = (arr, y, col, lbl) => D.trace(S, arr.slice(-200).map(q => q.y), 20, y, W - 40, (H - 140) / 3 - 8, col, undefined, undefined, lbl);
      tr(s0, 112, C.cyan, 'sensor + noise (×100)'); tr(d, 112 + (H - 140) / 3, C.amber, 'after gain and offset'); tr(e, 112 + 2 * (H - 140) / 3, C.green, 'to ADC');
      const pk = Math.abs(G) * (p.sig + p.hum) / 1000; const att = 20 * Math.log10(M.sig.lowpassMag(50, p.fc)), pass = 20 * Math.log10(M.sig.lowpassMag(p.fs, p.fc));
      const lo = p.off - pk, hi = p.off + pk; const ok = lo >= 0 && hi <= 5;
      S.set('G', M.fmt(G, 2)); S.set('pk', pk); S.set('att', p.filt ? att : 0); S.set('pass', p.filt ? pass : 0); S.set('clip', ok ? `OK (${M.fmt(lo, 2)} to ${M.fmt(hi, 2)} V)` : `CLIPPING (${M.fmt(lo, 2)} to ${M.fmt(hi, 2)} V)`, ok ? 'ok' : 'bad');
      S.set('snr', 20 * Math.log10(p.sig / Math.max(1e-6, p.hum)) + (p.filt ? pass - att : 0));
    }
  });

  /* ================= Instrumentation amplifier (Topic II.12) ================= */
  RIL.defineSim({
    id: 'instrumentation-amplifier', title: 'Three-op-amp instrumentation amplifier', unit: 2, category: 'signal-conditioning', kind: '2d', auto: false,
    description: 'Differential inputs V₁ and V₂ = common-mode V_cm ± V_d/2. The in-amp gain G = (1 + 2R/R_G)R₃/R₂ (2.29) amplifies V_d; the common-mode signal is rejected according to CMRR = 20 log(A_d/A_cm) (2.28). A simple difference amplifier with mismatched resistors is shown for comparison.',
    help: 'Adjust R_G for the required gain and add common-mode voltage and 50 Hz common-mode interference. The in-amp output stays clean; the difference amplifier built from 1 % resistors (CMRR ≈ 34 dB at unity gain) does not. Defaults: Example 2.12 (R = 25 kΩ, R_G = 50.05 Ω → G = 1000; CMRR 100 dB).',
    controls: [
      { id: 'Vd', label: 'Differential signal V_d (peak)', min: 0, max: 20, step: 0.1, value: 5, unit: 'mV' },
      { id: 'Vcm', label: 'Common-mode DC V_cm', min: 0, max: 5, step: 0.05, value: 2.5, unit: 'V' },
      { id: 'hum', label: 'Common-mode 50 Hz interference', min: 0, max: 2, step: 0.01, value: 0.5, unit: 'V' },
      { id: 'R', label: 'Input-stage resistors R', min: 1, max: 100, step: 0.5, value: 25, unit: 'kΩ' },
      { id: 'RG', label: 'Gain resistor R_G', min: 10, max: 100000, step: 0.05, value: 50.05, unit: 'Ω' },
      { id: 'r32', label: 'Output stage R₃/R₂', min: 0.5, max: 10, step: 0.1, value: 1 },
      { id: 'cmrr', label: 'In-amp CMRR', min: 40, max: 140, step: 1, value: 100, unit: 'dB' },
      { id: 'tol', label: 'Difference-amp resistor tolerance', min: 0.01, max: 5, step: 0.01, value: 1, unit: '%' }
    ],
    readouts: [{ id: 'G', label: 'Differential gain A_d', unit: 'V/V' }, { id: 'Acm', label: 'Common-mode gain A_cm = A_d/CMRR' }, { id: 'vo', label: 'Output (signal part, peak)', unit: 'V' }, { id: 'ecm', label: 'Common-mode error at output', unit: 'mV' }, { id: 'ein', label: 'Referred to input', unit: 'µV' }, { id: 'dcm', label: 'Difference amp: CMRR', unit: 'dB' }],
    charts: [{ id: 'c', title: 'Inputs and outputs', x: 'time (ms)', y: 'V', series: [{ label: 'V₁' }, { label: 'V₂' }, { label: 'in-amp V_o' }, { label: 'difference-amp V_o (×A_d)' }], window: 600 }],
    calc(p) { const Ad = (1 + 2 * p.R * 1000 / p.RG) * p.r32, Acm = Ad / 10 ** (p.cmrr / 20); const dCMRR = (1 + 1) / (4 * p.tol / 100), dAcm = 1 / dCMRR; return { Ad, Acm, dCMRR, dAcm }; },
    step(S, dt) { const p = S.p, c = this.calc(p), t = S.t * 0.05; const vd = p.Vd / 1000 * Math.sin(2 * PI * 5 * t), vcm = p.Vcm + p.hum * Math.sin(2 * PI * 50 * t); S.chart('c').push(t * 1000, [vcm + vd / 2, vcm - vd / 2, c.Ad * vd + c.Acm * vcm, c.Ad * (vd + c.dAcm * vcm)]); },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, c = this.calc(p);
      const oa = (x, y, lbl) => { D.poly(S, [[x, y - 26], [x, y + 26], [x + 48, y]], '#f6f8fa', C.cyan, 2); D.text(S, lbl, x + 14, y + 4, { size: 10, color: C.cyan }); };
      const x1 = 90, y1 = H * 0.25, y2 = H * 0.65, x2 = Math.min(W * 0.55, 420);
      oa(x1, y1, 'A1'); oa(x1, y2, 'A2'); oa(x2, (y1 + y2) / 2, 'A3');
      D.line(S, 20, y1 - 12, x1, y1 - 12, C.amber, 2); D.text(S, 'V₁', 22, y1 - 18, { size: 12, color: C.amber }); D.line(S, 20, y2 + 12, x1, y2 + 12, C.green, 2); D.text(S, 'V₂', 22, y2 + 28, { size: 12, color: C.green });
      D.line(S, x1 + 48, y1, x1 + 110, y1, C.text, 1.5); D.line(S, x1 + 48, y2, x1 + 110, y2, C.text, 1.5);
      D.line(S, x1 + 80, y1, x1 + 80, y1 + 30, C.text, 1.5); D.rect(S, x1 + 72, y1 + 30, 16, 30, '#6e7781', C.text, 1); D.text(S, 'R', x1 + 92, y1 + 50, { size: 11 });
      D.rect(S, x1 + 72, (y1 + y2) / 2 - 14, 16, 28, '#5a3f2a', C.amber, 1.5); D.text(S, `R_G = ${M.fmt(p.RG, 2)} Ω`, x1 + 94, (y1 + y2) / 2 + 4, { size: 11, color: C.amber });
      D.rect(S, x1 + 72, y2 - 60, 16, 30, '#6e7781', C.text, 1); D.text(S, 'R', x1 + 92, y2 - 40, { size: 11 }); D.line(S, x1 + 80, y2 - 30, x1 + 80, y2, C.text, 1.5);
      D.line(S, x1 + 80, y1 + 60, x1 + 80, (y1 + y2) / 2 - 14, C.text, 1.5); D.line(S, x1 + 80, (y1 + y2) / 2 + 14, x1 + 80, y2 - 60, C.text, 1.5);
      D.line(S, x1 + 110, y1, x2 - 40, y1, C.text, 1.5); D.rect(S, x2 - 60, y1 - 8, 26, 16, '#6e7781', C.text, 1); D.text(S, 'R₂', x2 - 54, y1 - 14, { size: 10 }); D.line(S, x2 - 34, y1, x2, (y1 + y2) / 2 - 12, C.text, 1.5);
      D.line(S, x1 + 110, y2, x2 - 40, y2, C.text, 1.5); D.rect(S, x2 - 60, y2 - 8, 26, 16, '#6e7781', C.text, 1); D.text(S, 'R₂', x2 - 54, y2 + 22, { size: 10 }); D.line(S, x2 - 34, y2, x2, (y1 + y2) / 2 + 12, C.text, 1.5);
      D.line(S, x2 + 48, (y1 + y2) / 2, x2 + 90, (y1 + y2) / 2, C.amber, 2.5); D.text(S, 'V_o', x2 + 94, (y1 + y2) / 2 + 4, { size: 12, color: C.amber, weight: 700 }); D.text(S, 'R₃ feedback (ratio R₃/R₂ = ' + p.r32 + ')', x2 - 20, (y1 + y2) / 2 - 40, { size: 10, color: C.muted });
      const ecm = c.Acm * p.Vcm; D.box(S, Math.min(W - 280, x2 + 130), 30, 260, 'Gain and rejection', [['A_d = (1 + 2R/R_G)R₃/R₂', M.fmt(c.Ad, 1)], ['CMRR', p.cmrr + ' dB = ' + M.fmt(10 ** (p.cmrr / 20), 0)], ['A_cm', M.fmt(c.Acm, 5)], ['CM error at output', M.fmt(ecm * 1000, 3) + ' mV'], ['Difference amp CMRR', M.fmt(20 * Math.log10(c.dCMRR), 1) + ' dB'], ['Diff-amp CM error (×A_d)', M.fmt(c.Ad * c.dAcm * p.Vcm, 2) + ' V']]);
      S.set('G', c.Ad); S.set('Acm', c.Acm); S.set('vo', c.Ad * p.Vd / 1000); S.set('ecm', ecm * 1000); S.set('ein', ecm / c.Ad * 1e6); S.set('dcm', 20 * Math.log10(c.dCMRR));
    }
  });

  /* ================= Filters (Topic II.13) ================= */
  RIL.defineSim({
    id: 'filters', title: 'Analogue filters: RC and Butterworth responses', unit: 2, category: 'signal-conditioning', kind: '2d', auto: false,
    description: 'Low-pass, high-pass, band-pass and band-stop (notch) filters. The cut-off of the RC section is f_c = 1/(2πRC) (2.30); higher orders follow the Butterworth magnitude |H| = [1 + (ω/ω_c)^{2n}]^{−1/2} (2.31). The time-domain output is the sum of each input harmonic scaled and shifted by H(jω).',
    help: 'Choose the filter and input. Change R and C to move the cut-off, and the order n to sharpen the roll-off. The Bode plot marks f_c; the time plot shows what reaches the ADC. Defaults: Example 2.13 (10 kΩ, 100 nF → 159 Hz).',
    controls: [
      { id: 'type', type: 'select', label: 'Filter type', string: true, value: 'lp', options: [['lp', 'Low-pass'], ['hp', 'High-pass'], ['bp', 'Band-pass'], ['bs', 'Band-stop (notch, Q adjustable)']] },
      { id: 'n', type: 'select', label: 'Order n (Butterworth)', value: 1, options: [[1, '1 (single RC)'], [2, '2'], [3, '3'], [4, '4'], [6, '6']] },
      { id: 'R', label: 'Resistance R', min: 0.1, max: 100, step: 0.1, value: 10, unit: 'kΩ' },
      { id: 'Cn', label: 'Capacitance C', min: 1, max: 1000, step: 1, value: 100, unit: 'nF' },
      { id: 'f2', label: 'Upper cut-off (band-pass) | notch Q', min: 0.5, max: 5000, step: 0.5, value: 1000, unit: 'Hz | –' },
      { id: 'inp', type: 'select', label: 'Input signal', string: true, value: 'mix', options: [['mix', 'Signal 20 Hz + interference 1 kHz'], ['hum', 'Signal 20 Hz + 50 Hz hum'], ['sq', 'Square wave 50 Hz'], ['single', 'Single sine (frequency below)']] },
      { id: 'f0', label: 'Single-sine frequency', min: 1, max: 10000, step: 1, value: 159, unit: 'Hz' }
    ],
    readouts: [{ id: 'fc', label: 'Cut-off f_c = 1/(2πRC)', unit: 'Hz' }, { id: 'g1', label: '|H| at input component 1' }, { id: 'g2', label: '|H| at input component 2' }, { id: 'db', label: 'Attenuation of component 2', unit: 'dB' }, { id: 'ph', label: 'Phase at component 1', unit: '°' }],
    charts: [{ id: 'bode', title: 'Frequency response (magnitude)', x: 'frequency (Hz, log)', y: '|H| (dB)', xType: 'logarithmic', series: [{ label: '|H(f)| dB' }, { label: 'f_c', points: true, line: false }, { label: 'input components', points: true, line: false }] }, { id: 'time', title: 'Input and filtered output', x: 'time (ms)', y: 'V', series: [{ label: 'input' }, { label: 'output' }] }],
    comps(p) { if (p.inp === 'mix') return [[1, 20, 0], [0.5, 1000, 0]]; if (p.inp === 'hum') return [[1, 20, 0], [0.8, 50, 0]]; if (p.inp === 'single') return [[1, p.f0, 0]]; const c = []; for (let k = 1; k <= 39; k += 2) c.push([4 / (PI * k), 50 * k, 0]); return c; },
    draw(S) {
      D.clear(S); const p = S.p, n = +p.n, fc = M.sig.rcCutoff(p.R * 1e3, p.Cn * 1e-9), W = S.W, H = S.H; const H_ = f => RIL.filterH(p.type, f, fc, n, Math.max(p.f2, fc * 1.01), Math.max(0.3, Math.min(20, p.f2 / 100)));
      const comps = this.comps(p); const T = p.inp === 'single' ? 3 / p.f0 : 0.1; const pts = [], out = [];
      for (let k = 0; k <= 400; k++) { const t = T * k / 400; let a = 0, b = 0; comps.forEach(([A, f]) => { const h = H_(f); a += A * Math.sin(2 * PI * f * t); b += A * cx.abs(h) * Math.sin(2 * PI * f * t + cx.arg(h)); }); pts.push([t * 1000, a]); out.push([t * 1000, b]); }
      S.chart('time').setAll([pts, out]);
      const bode = []; for (let k = 0; k <= 160; k++) { const f = 10 ** (0 + 4.3 * k / 160); bode.push([f, 20 * Math.log10(Math.max(1e-6, cx.abs(H_(f))))]); } S.chart('bode').set(0, bode); S.chart('bode').set(1, [[fc, 20 * Math.log10(Math.max(1e-6, cx.abs(H_(fc))))]]); S.chart('bode').set(2, comps.slice(0, 6).map(([A, f]) => [f, 20 * Math.log10(Math.max(1e-6, cx.abs(H_(f))))]));
      // circuit sketch
      const x0 = 30, y0 = H * 0.5; D.line(S, x0, y0, x0 + 60, y0, C.text, 2);
      const isHP = p.type === 'hp'; const res = (x, y) => { const pp = []; for (let k = 0; k <= 8; k++) pp.push([x + k * 7, y + (k % 2 ? 6 : -6) * (k > 0 && k < 8)]); D.poly(S, pp, null, C.amber, 2, false); }; const cap = (x, y, vert) => { if (vert) { D.line(S, x - 12, y, x + 12, y, C.cyan, 3); D.line(S, x - 12, y + 8, x + 12, y + 8, C.cyan, 3); } else { D.line(S, x, y - 12, x, y + 12, C.cyan, 3); D.line(S, x + 8, y - 12, x + 8, y + 12, C.cyan, 3); } };
      if (!isHP) { res(x0 + 60, y0); D.line(S, x0 + 116, y0, x0 + 200, y0, C.text, 2); D.line(S, x0 + 150, y0, x0 + 150, y0 + 26, C.text, 2); cap(x0 + 150, y0 + 26, true); D.line(S, x0 + 150, y0 + 34, x0 + 150, y0 + 60, C.text, 2); }
      else { cap(x0 + 70, y0); D.line(S, x0 + 78, y0, x0 + 200, y0, C.text, 2); D.line(S, x0 + 150, y0, x0 + 150, y0 + 10, C.text, 2); res(x0 + 150 - 28, y0 + 30); D.line(S, x0 + 150, y0 + 40, x0 + 150, y0 + 60, C.text, 2); }
      D.line(S, x0 + 130, y0 + 60, x0 + 170, y0 + 60, C.text, 2);
      D.text(S, `R = ${p.R} kΩ, C = ${p.Cn} nF`, x0, y0 - 30, { size: 12 }); D.text(S, `f_c = 1/(2πRC) = ${M.fmt(fc, 2)} Hz`, x0, y0 - 12, { size: 12, color: C.amber, weight: 650 });
      D.text(S, n > 1 ? `${n}th-order Butterworth (active realisation; RC section sets f_c)` : 'first-order passive RC section', x0, y0 + 90, { size: 11, color: C.muted });
      D.box(S, Math.min(W - 270, 300), 30, 250, 'Response at the input components', comps.slice(0, 4).map(([A, f]) => [`${M.fmt(f, 0)} Hz`, `|H| = ${M.fmt(cx.abs(H_(f)), 4)} (${M.fmt(20 * Math.log10(Math.max(1e-9, cx.abs(H_(f)))), 1)} dB)`]));
      const h1 = H_(comps[0][1]), h2 = comps[1] ? H_(comps[1][1]) : null;
      S.set('fc', fc); S.set('g1', cx.abs(h1)); S.set('g2', h2 ? cx.abs(h2) : '—'); S.set('db', h2 ? 20 * Math.log10(Math.max(1e-9, cx.abs(h2))) : '—'); S.set('ph', cx.arg(h1) * M.R2D);
    }
  });

  /* ================= Shielding and grounding (Topic II.14) ================= */
  RIL.defineSim({
    id: 'shielding-grounding', title: 'Shielding and grounding: noise coupling and its cures', unit: 2, category: 'signal-conditioning', kind: '2d', auto: false,
    description: 'A 10 mV sensor signal travels to a DAQ beside a motor power cable. Capacitive (i = C_s dv/dt), inductive (e = −A dB/dt) and ground-loop (ΔV_g) noise are added; an electrostatic shield, twisted pair, separation, single-point grounding, differential input and isolation each remove one mechanism.',
    help: 'Start with no protection and add the remedies one at a time; watch the noise bars and the received waveform. Grounding the shield at both ends lets ground-loop current flow in the shield. The coupling coefficients are illustrative orders of magnitude (supplementary); the mechanisms and remedies follow Section 2.17.',
    controls: [
      { id: 'shield', type: 'select', label: 'Cable shield', string: true, value: 'none', options: [['none', 'No shield'], ['one', 'Foil shield grounded at receiver only'], ['both', 'Shield grounded at both ends']] },
      { id: 'twist', type: 'toggle', label: 'Twisted pair', value: false },
      { id: 'diff', type: 'toggle', label: 'Differential input (in-amp, CMRR 80 dB)', value: false },
      { id: 'iso', type: 'toggle', label: 'Isolation amplifier', value: false },
      { id: 'star', type: 'toggle', label: 'Single-point (star) grounding', value: false },
      { id: 'sep', label: 'Separation from power cable', min: 0.02, max: 1, step: 0.01, value: 0.05, unit: 'm' },
      { id: 'dVg', label: 'Ground potential difference ΔV_g', min: 0, max: 2, step: 0.01, value: 0.5, unit: 'V' }
    ],
    readouts: [{ id: 'cap', label: 'Capacitive noise', unit: 'mV' }, { id: 'ind', label: 'Inductive noise', unit: 'mV' }, { id: 'gl', label: 'Ground-loop noise', unit: 'mV' }, { id: 'tot', label: 'Total noise (RSS)', unit: 'mV' }, { id: 'snr', label: 'SNR', unit: 'dB' }],
    charts: [{ id: 'c', title: 'Signal received at the DAQ', x: 'time (ms)', y: 'mV', series: [{ label: 'received' }, { label: 'true sensor signal' }], window: 600 }],
    noise(p) {
      const dist = 0.05 / p.sep; let cap = 30 * dist, ind = 20 * dist, gl = 1000 * p.dVg * 0.4;
      if (p.shield !== 'none') cap *= 0.01; if (p.twist) ind *= 0.03; if (p.shield === 'both') gl *= 1.4;
      if (p.star) gl *= 0.1; if (p.diff) { gl *= 1e-4 * 100; cap *= 0.3; } if (p.iso) gl = 0;
      return { cap, ind, gl };
    },
    step(S, dt) { const p = S.p, t = S.t * 0.04, n = this.noise(p); const sig = 10 * Math.sin(2 * PI * 10 * t); const rx = sig + n.cap * Math.sin(2 * PI * 300 * t) * Math.sign(Math.sin(2 * PI * 20 * t)) + n.ind * Math.sin(2 * PI * 150 * t) + n.gl * Math.sin(2 * PI * 50 * t); S.chart('c').push(t * 1000, [rx, sig]); },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, n = this.noise(p); const yS = H * 0.42, yP = yS - 30 - p.sep * 120;
      D.rect(S, 20, yS - 26, 80, 52, '#f6f8fa', C.green, 1.5, 6); D.text(S, 'sensor', 60, yS + 4, { size: 11, align: 'center', color: C.green }); D.rect(S, W - 120, yS - 30, 100, 60, '#f6f8fa', C.cyan, 1.5, 6); D.text(S, p.diff ? 'DAQ (diff)' : 'DAQ (single-ended)', W - 70, yS + 4, { size: 10.5, align: 'center', color: C.cyan });
      D.line(S, 30, yP, W - 30, yP, C.red, 6); D.text(S, 'motor power cable (PWM 300 V, 20 kHz)', 40, yP - 10, { size: 11, color: C.red });
      for (let k = 0; k < 10; k++) { const x = 60 + k * (W - 160) / 10 + (S.t * 40 % 30); if (p.shield === 'none') D.arrow(S, x, yP + 4, x, yS - 10, 'rgba(209,36,47,.35)', 1, 5); }
      if (p.twist) { for (let x = 100; x < W - 120; x += 12) { D.line(S, x, yS - 5, x + 6, yS + 5, C.amber, 2); D.line(S, x, yS + 5, x + 6, yS - 5, C.text, 2); } } else { D.line(S, 100, yS - 8, W - 120, yS - 8, C.amber, 2); D.line(S, 100, yS + 8, W - 120, yS + 8, C.text, 2); }
      if (p.shield !== 'none') { D.rect(S, 106, yS - 16, W - 232, 32, null, C.cyan, 1.5, 12); D.line(S, W - 130, yS + 16, W - 130, H - 60, C.cyan, 1.5); if (p.shield === 'both') D.line(S, 110, yS + 16, 110, H - 60, C.cyan, 1.5); }
      D.line(S, 60, yS + 26, 60, H - 60, C.text, 1.5); D.line(S, W - 70, yS + 30, W - 70, H - 60, C.text, 1.5); const gy = H - 60;
      if (p.star) { D.line(S, 60, gy, W / 2, gy + 20, C.text, 1.5); D.line(S, W - 70, gy, W / 2, gy + 20, C.text, 1.5); D.circle(S, W / 2, gy + 20, 5, C.text); D.text(S, 'star point', W / 2 + 8, gy + 24, { size: 10, color: C.muted }); }
      else { D.text(S, '⏚ ground A', 40, gy + 16, { size: 11, color: C.muted }); D.text(S, `⏚ ground B (ΔV_g = ${p.dVg} V)`, W - 220, gy + 16, { size: 11, color: C.muted }); if (!p.iso) { D.line(S, 60, gy, W - 70, gy, 'rgba(199,119,0,.5)', 1, [4, 4]); D.text(S, 'ground loop', W / 2, gy - 6, { size: 10, color: C.amber, align: 'center' }); } }
      if (p.iso) D.text(S, 'isolation barrier', W - 140, yS - 40, { size: 10.5, color: C.violet });
      const bars = [['capacitive', n.cap, C.red], ['inductive', n.ind, C.amber], ['ground loop', n.gl, C.violet]]; const mx = 400;
      bars.forEach(([l, v], i) => { const bw2 = Math.min(220, (W - 260)); const x = W / 2 - 110, y = 24 + i * 18; D.rect(S, x, y - 9, bw2, 10, '#eef1f4'); D.rect(S, x, y - 9, bw2 * Math.min(1, Math.log10(1 + v) / Math.log10(1 + mx)), 10, bars[i][2]); D.text(S, `${l}: ${M.fmt(v, 3)} mV`, x + bw2 + 8, y, { size: 10.5 }); });
      const tot = Math.hypot(n.cap, n.ind, n.gl); S.set('cap', n.cap); S.set('ind', n.ind); S.set('gl', n.gl); S.set('tot', tot); S.set('snr', 20 * Math.log10(10 / Math.max(1e-6, tot)));
    }
  });

  /* ================= A/D and D/A conversion (Topic II.15) ================= */
  RIL.defineSim({
    id: 'adc-dac', title: 'A/D and D/A conversion: sampling, quantisation, SAR, reconstruction', unit: 2, category: 'adc-dac', kind: '2d', auto: false,
    description: 'An analogue input is sampled at f_s, quantised with step Q = FSR/2ᴺ (2.33) and encoded to N-bit binary by a successive-approximation converter; a DAC reconstructs v_o = V_ref D/2ᴺ (2.35) with a zero-order hold. Nyquist f_s > 2f_max (2.32), quantisation error and ideal SNR = 6.02N + 1.76 dB (2.34) are shown.',
    help: 'Lower the sampling frequency below twice the signal frequency to see aliasing (the reconstructed wave has the wrong frequency). Reduce N to see the quantisation staircase and error grow. The SAR table shows the binary search for the most recent sample. Example 2.15: V_ref = 5 V, v_in = 3.3 V, N = 4 → 1010.',
    controls: [
      { id: 'wave', type: 'select', label: 'Input signal', string: true, value: 'sine', options: [['sine', 'Sine'], ['tri', 'Triangle'], ['ramp', 'Ramp (sawtooth)'], ['dc', 'DC level (use offset)']] },
      { id: 'f', label: 'Signal frequency f', min: 0.1, max: 20, step: 0.1, value: 2, unit: 'Hz' },
      { id: 'A', label: 'Amplitude', min: 0, max: 5, step: 0.01, value: 2, unit: 'V' },
      { id: 'off', label: 'Offset', min: 0, max: 5, step: 0.01, value: 2.5, unit: 'V' },
      { id: 'fs', label: 'Sampling frequency f_s', min: 1, max: 100, step: 0.5, value: 30, unit: 'Hz' },
      { id: 'N', label: 'Resolution N', min: 1, max: 12, step: 1, value: 4, unit: 'bits' },
      { id: 'Vref', label: 'Reference voltage V_ref (FSR)', min: 1, max: 10, step: 0.1, value: 5, unit: 'V' },
      { id: 'smooth', type: 'toggle', label: 'DAC reconstruction filter (RC smoothing)', value: false }
    ],
    readouts: [{ id: 'Q', label: 'Step Q = FSR/2ᴺ', unit: 'V' }, { id: 'vin', label: 'Last sample v_in', unit: 'V' }, { id: 'code', label: 'Binary output' }, { id: 'D', label: 'Decimal code D' }, { id: 'vo', label: 'DAC v_o = V_ref D/2ᴺ', unit: 'V' }, { id: 'eq', label: 'Quantisation error', unit: 'V' }, { id: 'snr', label: 'Ideal SNR 6.02N + 1.76', unit: 'dB' }, { id: 'ny', label: 'Nyquist check' }],
    panels: [{ id: 'sar', title: 'Successive-approximation steps for the last sample (Algorithm 2.3)' }],
    charts: [{ id: 'c', title: 'Analogue input, samples and DAC reconstruction', x: 'time (s)', y: 'V', series: [{ label: 'analogue input' }, { label: 'samples (quantised)', points: true, line: false }, { label: 'DAC output (ZOH)', stepped: true }], window: 1200 }, { id: 'e', title: 'Quantisation error of each sample', x: 'time (s)', y: 'V', series: [{ label: 'v_in − v_q', points: true }], window: 300 }],
    reset(S) { S.acc = 0; S.last = null; S.y = 0; },
    v(S, t) { const p = S.p, ph = (t * p.f) % 1; const u = p.wave === 'sine' ? Math.sin(2 * PI * p.f * t) : p.wave === 'tri' ? (ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph) : p.wave === 'ramp' ? 2 * ph - 1 : 0; return M.clamp(p.off + p.A * u, 0, p.Vref * 1.2); },
    step(S, dt) {
      const p = S.p, N = Math.round(p.N), ch = S.chart('c'); S.acc += dt; const vin = this.v(S, S.t);
      if (S.acc >= 1 / p.fs) { S.acc -= 1 / p.fs; const sar = M.sig.sar(Math.min(vin, p.Vref - 1e-9), p.Vref, N); S.last = { vin, sar, t: S.t }; ch.push(S.t, [vin, sar.vout, sar.vout]); S.chart('e').push(S.t, [vin - sar.vout]); }
      else ch.push(S.t, [vin, NaN, S.last ? S.last.sar.vout : NaN]);
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, N = Math.round(p.N), Q = M.sig.adcStep(p.Vref, N);
      const blocks = ['Analogue\ninput', `Sample & hold\nf_s = ${p.fs} Hz`, `Quantiser\n${2 ** N} levels`, `Encoder (SAR)\n${N} bits`, `DAC (R–2R)\nv_o = V_ref D/2ᴺ`, p.smooth ? 'Reconstruction\nfilter' : 'Zero-order\nhold'];
      const bw = Math.min(140, (W - 40) / 6 - 12); blocks.forEach((b, i) => { D.block(S, 16 + i * (bw + 12), 20, bw, 52, b, { size: 10 }); if (i < 5) D.arrow(S, 16 + i * (bw + 12) + bw, 46, 16 + (i + 1) * (bw + 12), 46, C.amber, 1.8, 7); });
      // staircase transfer characteristic
      const x0 = 50, y0 = H - 30, sz = Math.min(H - 130, W * 0.35); D.rect(S, x0, y0 - sz, sz, sz, 'rgba(255,255,255,.9)', '#8c959f', 1); const pts = [];
      for (let k = 0; k <= 400; k++) { const v = p.Vref * k / 400; const c = M.clamp(Math.floor(v / Q), 0, 2 ** N - 1); pts.push([x0 + sz * k / 400, y0 - sz * c * Q / p.Vref]); } D.poly(S, pts, null, C.cyan, 1.8, false); D.line(S, x0, y0, x0 + sz, y0 - sz, 'rgba(26,155,75,.5)', 1, [4, 4]);
      D.text(S, 'ADC transfer characteristic', x0, y0 - sz - 8, { size: 11, color: C.muted }); D.text(S, 'v_in →', x0 + sz - 40, y0 + 16, { size: 10, color: C.muted });
      if (S.last) { const lx = x0 + sz * S.last.vin / p.Vref, ly = y0 - sz * S.last.sar.vout / p.Vref; D.circle(S, lx, ly, 5, C.amber); }
      // binary display
      const bx = x0 + sz + 40, by = H - 120; if (S.last) { const code = S.last.sar.code; D.text(S, 'Encoded output', bx, by - 10, { size: 11, color: C.muted }); for (let b = N - 1; b >= 0; b--) { const on = (code >> b) & 1; const xx = bx + (N - 1 - b) * Math.min(34, (W - bx - 30) / N); D.rect(S, xx, by, Math.min(30, (W - bx - 30) / N - 4), 30, on ? C.amber : '#eef1f4', '#8c959f', 1, 4); D.text(S, String(on), xx + Math.min(15, ((W - bx - 30) / N - 4) / 2), by + 20, { size: 13, align: 'center', weight: 700, color: on ? '#2b3440' : C.muted }); D.text(S, 'b' + b, xx + 4, by + 44, { size: 9, color: C.muted }); } }
      const ny = p.fs > 2 * p.f; const alias = Math.abs(p.f - Math.round(p.f / p.fs) * p.fs);
      D.text(S, ny ? `f_s = ${p.fs} Hz > 2f = ${2 * p.f} Hz: Nyquist satisfied` : `ALIASING: f_s < 2f; ${p.f} Hz appears as ${M.fmt(alias, 2)} Hz`, bx, by - 40, { size: 12.5, weight: 700, color: ny ? C.green : C.red });
      if (S.last) { const L = S.last; S.set('vin', L.vin); S.set('code', M.sig.toBin(L.sar.code, N)); S.set('D', L.sar.code); S.set('vo', L.sar.vout); S.set('eq', L.vin - L.sar.vout);
        RIL.setHTML(S.panel('sar'), '<div class="table-scroll">' + RIL.ui.kv(L.sar.steps.map((s, i) => [i + 1, 'bit ' + s.bit, M.sig.toBin(s.trial, N), M.fmt(s.vdac, 4) + ' V', s.keep ? 'yes → keep 1' : 'no → clear']), ['Step', 'Bit tried', 'Trial code', 'v_DAC', `v_in = ${M.fmt(L.vin, 4)} V ≥ v_DAC?`]) + '</div>', S, 'sar'); }
      S.set('Q', Q); S.set('snr', M.sig.snrDb(N)); S.set('ny', ny ? 'satisfied' : 'violated (aliasing)', ny ? 'ok' : 'bad');
    }
  });

  /* ================= Data acquisition system (Topic II.16) ================= */
  const CH = [['Joint 1 temperature', 'temp'], ['Gripper force', 'force'], ['Hydraulic pressure', 'press'], ['Wrist acceleration', 'acc'], ['Motor current', 'cur'], ['Supply voltage', 'volt'], ['Ultrasonic distance', 'dist'], ['Vacuum level', 'vac']];
  RIL.defineSim({
    id: 'daq-system', title: 'Data acquisition system: multiplexed sampling', unit: 2, category: 'adc-dac', kind: '2d', auto: false,
    description: 'Sensors → signal conditioning → analogue multiplexer → sample-and-hold → ADC → processor → display and storage. The multiplexer scans the channels at the aggregate rate n·f_s; data rate R_b = n f_s N (2.36) and inter-channel skew 1/(n f_s) are computed.',
    help: 'Set the number of channels, the per-channel sample rate and the ADC resolution. The multiplexer pointer visits each channel in turn; the selected channel is highlighted in the data table and graph. Turn on simultaneous sample-and-hold to remove skew. Example 2.17: 8 channels × 10 kS/s × 16 bit = 1.28 Mbit/s.',
    controls: [
      { id: 'n', label: 'Number of channels n', min: 1, max: 8, step: 1, value: 4 },
      { id: 'fs', label: 'Sample rate per channel f_s', min: 0.5, max: 20, step: 0.5, value: 2, unit: 'S/s (animation)' },
      { id: 'fsr', label: 'Rated rate per channel (for R_b)', min: 1, max: 100, step: 1, value: 10, unit: 'kS/s' },
      { id: 'N', label: 'ADC resolution N', min: 8, max: 24, step: 1, value: 16, unit: 'bits' },
      { id: 'sel', type: 'select', label: 'Highlighted channel', value: 0, options: CH.map((c, i) => [i, `CH${i} ${c[0]}`]) },
      { id: 'simul', type: 'toggle', label: 'Simultaneous sample-and-hold', value: false }
    ],
    readouts: [{ id: 'agg', label: 'Aggregate rate n·f_s', unit: 'kS/s' }, { id: 'rb', label: 'Data rate R_b = n f_s N', unit: 'Mbit/s' }, { id: 'skew', label: 'Inter-channel skew 1/(n f_s)', unit: 'µs' }, { id: 'store', label: 'Storage per hour', unit: 'MB' }, { id: 'cur', label: 'Channel being converted' }, { id: 'val', label: 'Highlighted channel value' }],
    charts: [{ id: 'c', title: 'Acquired samples', x: 'time (s)', y: 'normalised value', series: CH.map((c, i) => ({ label: 'CH' + i, points: true })), window: 400 }],
    reset(S) { S.k = 0; S.acc = 0; S.vals = new Array(8).fill(NaN); },
    sensor(i, t) { return [0.5 + 0.3 * Math.sin(0.2 * t), 0.5 + 0.4 * Math.sin(1.3 * t) * Math.sin(0.3 * t), 0.6 + 0.1 * Math.sin(0.7 * t + 1), 0.5 + 0.35 * Math.sin(3 * t), 0.4 + 0.3 * Math.abs(Math.sin(0.9 * t)), 0.8 + 0.02 * Math.sin(5 * t), 0.5 + 0.4 * Math.sin(0.4 * t + 2), 0.3 + 0.2 * Math.sin(0.25 * t)][i]; },
    step(S, dt) {
      const p = S.p, n = Math.round(p.n); S.acc += dt; const per = 1 / (p.fs * n);
      while (S.acc >= per) { S.acc -= per; const i = S.k % n; const t = p.simul ? S.t - (S.k % n) * per : S.t; S.vals[i] = this.sensor(i, t); const row = new Array(8).fill(NaN); row[i] = S.vals[i]; S.chart('c').push(S.t, row); S.k++; }
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, n = Math.round(p.n), cur = (S.k - 1 + n) % n;
      const rowH = Math.min(38, (H - 40) / 8); for (let i = 0; i < 8; i++) { const y = 20 + i * rowH, act = i < n; D.block(S, 16, y, 150, rowH - 6, `CH${i} ${CH[i][0]}`, { size: 9.5, active: +p.sel === i && act, stroke: act ? '#8c959f' : '#f6f8fa', tc: act ? C.text : C.muted }); if (act) { D.rect(S, 180, y + 6, 40, rowH - 18, '#f6f8fa', C.green, 1, 3); D.text(S, 'SC', 200, y + rowH / 2 + 1, { size: 9, align: 'center', color: C.green }); D.line(S, 220, y + rowH / 2 - 3, 270, y + rowH / 2 - 3, i === cur ? C.amber : '#8c959f', i === cur ? 2.5 : 1); } }
      const mx = 270, my = 20 + 4 * rowH - 3; D.rect(S, mx, 20, 50, 8 * rowH - 6, '#eef1f4', C.amber, 1.5, 6); D.text(S, 'MUX', mx + 25, 14, { size: 10, align: 'center', color: C.amber }); D.line(S, mx + 4, 20 + cur * rowH + rowH / 2 - 3, mx + 46, my, C.amber, 3);
      const chain = [p.simul ? 'S/H ×n\n(simultaneous)' : 'S/H', `ADC\n${p.N} bit`, 'Processor\nscaling', 'Display /\nstorage'];
      const bw = Math.min(110, (W - 360) / 4 - 14); chain.forEach((b, i) => { D.block(S, 340 + i * (bw + 14), my - 28, bw, 56, b, { size: 10 }); D.arrow(S, i ? 340 + i * (bw + 14) - 14 : 320, my, 340 + i * (bw + 14), my, C.amber, 2, 7); });
      const tx = 340, ty = my + 60; D.text(S, 'Latest values', tx, ty, { size: 11, color: C.muted }); for (let i = 0; i < n; i++) D.text(S, `CH${i}: ${isNaN(S.vals[i]) ? '—' : M.fmt(S.vals[i] * 100, 1) + ' % FS'}  code ${isNaN(S.vals[i]) ? '—' : Math.round(S.vals[i] * (2 ** p.N - 1))}`, tx + (i >= 4 ? 230 : 0), ty + 18 + (i % 4) * 16, { size: 11, color: i === +p.sel ? C.amber : C.text });
      const agg = n * p.fsr; S.set('agg', agg); S.set('rb', M.sig.daqRate(n, p.fsr * 1000, p.N) / 1e6); S.set('skew', p.simul ? 0 : 1e6 / (agg * 1000)); S.set('store', M.sig.daqRate(n, p.fsr * 1000, p.N) / 8 * 3600 / 1e6); S.set('cur', `CH${cur} ${CH[cur][0]}`); S.set('val', isNaN(S.vals[+p.sel]) ? '—' : M.fmt(S.vals[+p.sel] * 100, 1) + ' % FS');
    }
  });
})();
