/* Unit IV — embedded systems, microcontroller simulator, sensor–actuator interfacing, PWM, communication interfaces */
(function () {
  const RIL = window.RIL, M = RIL.M, D = RIL.draw, C = RIL.C, PI = Math.PI;

  /* ================= Embedded system architecture (Topic IV.7) ================= */
  const EB = { psu: ['Power supply', '24 V → 5 V / 3.3 V regulators; separate motor supply. Brown-out detection resets the MCU safely.'], cpu: ['Processor core', 'Executes the control program; here a 72 MHz 32-bit core running a 10 ms control loop.'], flash: ['Program memory (Flash)', 'Non-volatile; holds the firmware (code and constants).'], ram: ['Data memory (RAM)', 'Variables: latest temperature, set-point, duty cycle, filter state.'], adc: ['ADC (analogue input port)', '12-bit successive-approximation converter, D = round(v(2ᴺ − 1)/V_ref) (4.3).'], gpio: ['Digital I/O ports', 'Read switches and limit sensors, drive LEDs and enable lines.'], tim: ['Timer / PWM peripheral', 'Generates the fan PWM; f = f_clk/((PSC+1)(ARR+1)), D = CCR/(ARR+1) (4.5).'], uart: ['Serial port (UART)', 'Reports data to a supervisory PC / HMI.'], sensor: ['Sensor (LM35, 10 mV/°C)', 'Converts temperature to voltage for the ADC.'], driver: ['Actuator driver (MOSFET)', 'MCU pins supply only mA; the driver switches the motor current, with a flyback diode.'], fan: ['Actuator (DC fan motor)', 'Speed set by PWM duty; cools the robot joint.'], sw: ['Input switch', 'Manual override / enable.'] };
  RIL.defineSim({
    id: 'embedded-system', title: 'Embedded system: acquire, decide, actuate', unit: 4, category: 'embedded-systems', kind: '2d', auto: true, autoDefault: true,
    description: 'A microcontroller-based joint-cooling controller: an LM35 sensor feeds the ADC, the CPU (program in Flash, variables in RAM) computes a fan duty cycle every control period, the timer generates PWM, a MOSFET driver powers the fan, and data are reported over UART. The super-loop timeline shows sampling, computation and output within the deadline.',
    help: 'Change the heat load; the closed loop keeps the joint temperature near the set-point. Click any block to read its role. Increase the computation time until the loop misses its deadline (hard real-time requirement).',
    controls: [
      { id: 'heat', label: 'Heat load on the joint', min: 0, max: 40, step: 0.5, value: 15, unit: 'W' },
      { id: 'sp', label: 'Temperature set-point', min: 25, max: 70, step: 0.5, value: 40, unit: '°C' },
      { id: 'Kp', label: 'Controller gain', min: 1, max: 30, step: 0.5, value: 8, unit: '% duty/°C' },
      { id: 'Ts', label: 'Control period', min: 1, max: 100, step: 1, value: 10, unit: 'ms' },
      { id: 'tc', label: 'Computation time per loop', min: 0.1, max: 20, step: 0.1, value: 2, unit: 'ms' },
      { id: 'en', type: 'toggle', label: 'Enable switch (GPIO input)', value: true }
    ],
    readouts: [{ id: 'T', label: 'Joint temperature', unit: '°C' }, { id: 'v', label: 'Sensor voltage', unit: 'V' }, { id: 'code', label: 'ADC code (12-bit, 3.3 V)' }, { id: 'duty', label: 'PWM duty to fan', unit: '%' }, { id: 'cpu', label: 'CPU utilisation', unit: '%' }, { id: 'dl', label: 'Deadline' }],
    charts: [{ id: 'c', title: 'Closed-loop behaviour', x: 'time (s)', y: '°C | %', series: [{ label: 'temperature (°C)' }, { label: 'set-point' }, { label: 'fan duty (%)' }], window: 800 }],
    reset(S) { S.Tj = 30; S.duty = 0; S.acc = 0; S.sel = 'cpu'; },
    onPointer(S, type, x, y) { if (type === 'down' && S.R) Object.entries(S.R).forEach(([k, r]) => { if (D.hit(r, x, y)) S.sel = k; }); },
    step(S, dt) {
      const p = S.p; const h = dt * 4; S.acc += h * 1000;
      if (S.acc >= p.Ts) { S.acc = 0; const v = S.Tj * 0.01; const code = M.sig.adcCode(v, 3.3, 12); const Tm = code * 3.3 / 4095 / 0.01; S.code = code; S.duty = p.en ? M.clamp(p.Kp * (Tm - p.sp), 0, 100) : 0; }
      const cool = 0.08 + 1.2 * S.duty / 100; S.Tj += h * (p.heat * 0.6 - cool * (S.Tj - 25)) / 30; S.chart('c').push(S.t * 4, [S.Tj, p.sp, S.duty]);
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, R = S.R = {}; const sel = S.sel;
      const mx = W * 0.28, my = 30, mw = Math.min(W * 0.44, 380), mh = 210; D.rect(S, mx, my, mw, mh, 'rgba(255,255,255,.9)', C.amber, 1.5, 10); D.text(S, 'Microcontroller', mx + 10, my + 16, { size: 11.5, color: C.amber, weight: 700 });
      const b = (k, x, y, w, h, lbl) => { R[k] = D.block(S, x, y, w, h, lbl, { active: sel === k, size: 10.5 }); };
      const cw = (mw - 40) / 3; b('cpu', mx + 10, my + 28, cw, 50, 'CPU core'); b('flash', mx + 20 + cw, my + 28, cw, 50, 'Flash\n(program)'); b('ram', mx + 30 + 2 * cw, my + 28, cw, 50, 'RAM\n(data)');
      b('adc', mx + 10, my + 100, cw, 44, 'ADC'); b('gpio', mx + 20 + cw, my + 100, cw, 44, 'GPIO'); b('tim', mx + 30 + 2 * cw, my + 100, cw, 44, 'Timer/PWM'); b('uart', mx + 20 + cw, my + 156, cw, 40, 'UART');
      D.line(S, mx + 10, my + 88, mx + mw - 10, my + 88, C.muted, 2); D.text(S, 'internal bus', mx + mw - 12, my + 84, { size: 9, align: 'right', color: C.muted });
      b('sensor', 16, my + 96, mx - 40, 52, `Sensor LM35\n${M.fmt(S.Tj, 1)} °C`); b('sw', 16, my + 160, mx - 40, 40, `Switch: ${p.en ? 'ON' : 'OFF'}`); b('psu', mx, my + mh + 16, mw, 30, 'Power supply 24 V → 5 V / 3.3 V');
      b('driver', mx + mw + 24, my + 96, W - mx - mw - 40, 52, 'MOSFET driver\n+ flyback diode'); b('fan', mx + mw + 24, my + 166, W - mx - mw - 40, 52, `Fan motor\n${M.fmt(S.duty || 0, 0)} % duty`);
      const flow = (a, bb, col) => { const A = R[a], B = R[bb]; D.arrow(S, A.x + A.w, A.y + A.h / 2, B.x, B.y + B.h / 2, col, 2, 8); };
      flow('sensor', 'adc', C.cyan); flow('sw', 'gpio', C.cyan); flow('tim', 'driver', C.amber); D.arrow(S, R.driver.x + R.driver.w / 2, R.driver.y + R.driver.h, R.fan.x + R.fan.w / 2, R.fan.y, C.amber, 2, 8);
      const g = S.ctx, fx = R.fan.x + R.fan.w - 26, fy = R.fan.y + 26; for (let k = 0; k < 3; k++) { const a = S.t * (S.duty || 0) * 0.3 + k * 2 * PI / 3; D.line(S, fx, fy, fx + Math.cos(a) * 16, fy + Math.sin(a) * 16, C.cyan, 4); }
      // super-loop timeline
      const ty = H - 54, tx0 = 16, tx1 = W - 16, per = p.Ts; const pxms = (tx1 - tx0) / (3 * per); D.text(S, 'Super-loop timeline (3 control periods)', tx0, ty - 10, { size: 11, color: C.muted });
      for (let k = 0; k < 3; k++) { const x = tx0 + k * per * pxms; D.line(S, x, ty - 4, x, ty + 30, C.muted, 1, [3, 3]); const segs = [['read ADC', 0.2, C.cyan], ['compute', p.tc, C.amber], ['write PWM', 0.2, C.green], ['UART', 0.3, C.violet]]; let t0 = 0; segs.forEach(([n, d, c]) => { D.rect(S, x + t0 * pxms, ty, d * pxms, 22, c); t0 += d; }); if (t0 > per) D.text(S, 'deadline missed!', x + per * pxms - 4, ty + 38, { size: 10.5, color: C.red, align: 'right', weight: 700 }); }
      const busy = 0.7 + p.tc; S.set('T', S.Tj); S.set('v', S.Tj * 0.01); S.set('code', S.code ?? 0); S.set('duty', S.duty || 0); S.set('cpu', Math.min(100, busy / p.Ts * 100)); S.set('dl', busy <= p.Ts ? 'met' : 'MISSED', busy <= p.Ts ? 'ok' : 'bad');
      const inf = EB[sel]; D.text(S, `${inf[0]}: ${inf[1]}`, 16, H - 70, { size: 11, color: C.text });
    }
  });

  /* ================= Microcontroller simulator (Topic IV.8) ================= */
  const DEFRULES = ['DO0 = DI0', 'PWM0 = AI0 * 100 / 4095', 'DO1 = AI1 > 2048', 'PWM1 = DI1 ? 75 : 25'];
  RIL.defineSim({
    id: 'microcontroller', title: 'Microcontroller simulator: digital/analogue inputs, outputs and PWM', unit: 4, category: 'embedded-systems', kind: '2d', auto: true, autoDefault: false,
    description: 'An educational microcontroller with two digital inputs (switches with pull-ups), two analogue inputs (12-bit ADC, 0–3.3 V), two digital outputs (LEDs) and two PWM outputs (a motor and a dimmed LED). A four-line program of assignment statements is executed every loop; the register view shows the input register, ADC data registers, output register and timer compare registers.',
    help: 'Toggle the switches and move the potentiometers. Edit the program lines (expressions may use DI0, DI1, AI0, AI1, numbers, + − * / ( ), comparisons, &&, ||, ! and ?:) and press Apply. Outputs update every loop; PWM outputs show their waveform and the motor speed follows the duty cycle.',
    controls: [
      { id: 'di0', type: 'toggle', label: 'DI0 switch', value: true }, { id: 'di1', type: 'toggle', label: 'DI1 switch', value: false },
      { id: 'ai0', label: 'AI0 potentiometer voltage', min: 0, max: 3.3, step: 0.01, value: 1.65, unit: 'V' }, { id: 'ai1', label: 'AI1 sensor voltage', min: 0, max: 3.3, step: 0.01, value: 2.2, unit: 'V' },
      ...DEFRULES.map((r, i) => ({ id: 'r' + i, type: 'text', label: `Program line ${i + 1}`, value: r })),
      { id: 'b', type: 'buttons', buttons: [{ id: 'apply', label: 'Apply program' }] }
    ],
    readouts: [{ id: 'in', label: 'GPIO input register (DI1 DI0)' }, { id: 'adc', label: 'ADC data registers AI0, AI1' }, { id: 'out', label: 'GPIO output register (DO1 DO0)' }, { id: 'pwm', label: 'PWM duty PWM0, PWM1', unit: '%' }, { id: 'ccr', label: 'Timer CCR (ARR = 999)' }, { id: 'err', label: 'Program status' }],
    charts: [{ id: 'c', title: 'Output pins', x: 'time (ms)', y: 'level', series: [{ label: 'PWM0', stepped: true }, { label: 'PWM1', stepped: true }, { label: 'DO0', stepped: true }, { label: 'DO1', stepped: true }], window: 500 }],
    reset(S) { S.out = { DO0: 0, DO1: 0, PWM0: 0, PWM1: 0 }; S.mot = 0; S.ang = 0; this.compile(S); },
    onButton(S) { this.compile(S); },
    compile(S) {
      S.prog = []; S.err = 'OK – 4 lines compiled';
      for (let i = 0; i < 4; i++) { const line = String(S.p['r' + i] || '').trim(); if (!line) continue; const m = line.match(/^(DO0|DO1|PWM0|PWM1)\s*=\s*(.+)$/i); if (!m) { S.err = `line ${i + 1}: expected "OUTPUT = expression"`; continue; } const expr = m[2].toUpperCase(); if (!/^[\s+\-*/().<>=!&|?:\d]*$/.test(expr.replace(/DI0|DI1|AI0|AI1/g, ''))) { S.err = `line ${i + 1}: illegal symbol`; continue; } try { const f = new Function('DI0', 'DI1', 'AI0', 'AI1', 'return +(' + expr + ');'); f(0, 0, 0, 0); S.prog.push([m[1].toUpperCase(), f]); } catch (e) { S.err = `line ${i + 1}: ${e.message}`; } }
    },
    step(S, dt) {
      const p = S.p, A0 = M.sig.adcCode(p.ai0, 3.3, 12), A1 = M.sig.adcCode(p.ai1, 3.3, 12); S.A = [A0, A1];
      if (S.auto) { S.setParam('ai0', +(1.65 + 1.6 * Math.sin(S.t * 0.6)).toFixed(2), true); }
      S.prog.forEach(([o, f]) => { let v = f(+p.di0, +p.di1, A0, A1); if (!isFinite(v)) v = 0; S.out[o] = o.startsWith('PWM') ? M.clamp(v, 0, 100) : (v ? 1 : 0); });
      S.mot += (S.out.PWM0 / 100 * 3000 - S.mot) * Math.min(1, dt * 3); S.ang += S.mot / 60 * 2 * PI * dt * 0.05;
      const tt = S.t * 20; S.chart('c').push(tt * 1000 / 20, [RIL.sq(tt, 1, S.out.PWM0 / 100) * 0.8 + 4.5, RIL.sq(tt, 1, S.out.PWM1 / 100) * 0.8 + 3, S.out.DO0 * 0.8 + 1.5, S.out.DO1 * 0.8]);
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, o = S.out || {}; const cx = W / 2 - 90, cy = 30, cw = 180, ch = H - 60;
      D.rect(S, cx, cy, cw, ch, '#f6f8fa', '#57606a', 2, 6); D.text(S, 'MCU', cx + cw / 2, cy + 22, { size: 14, weight: 800, align: 'center' }); D.text(S, '32-bit · 12-bit ADC · timers', cx + cw / 2, cy + 40, { size: 10, align: 'center', color: C.muted });
      const pinsL = [['DI0', +p.di0, 'switch'], ['DI1', +p.di1, 'switch'], ['AI0', p.ai0 / 3.3, 'pot'], ['AI1', p.ai1 / 3.3, 'sensor']]; const pinsR = [['DO0', o.DO0, 'led'], ['DO1', o.DO1, 'led'], ['PWM0', (o.PWM0 || 0) / 100, 'motor'], ['PWM1', (o.PWM1 || 0) / 100, 'dim']];
      const sp = (ch - 80) / 4;
      pinsL.forEach(([n, v, t], i) => { const y = cy + 70 + i * sp; D.line(S, cx - 50, y, cx, y, v > 0.5 || (t !== 'switch' && v > 0) ? C.amber : C.muted, 2); D.text(S, n, cx + 8, y + 4, { size: 11, weight: 700 }); const x = cx - 130; if (t === 'switch') { D.rect(S, x, y - 12, 70, 24, '#f6f8fa', C.cyan, 1, 4); D.text(S, v ? 'ON (0 V→1)' : 'OFF', x + 35, y + 4, { size: 10, align: 'center', color: v ? C.green : C.muted }); } else { D.circle(S, x + 34, y, 16, '#f6f8fa', C.cyan, 1.5); D.line(S, x + 34, y, x + 34 + Math.cos(-PI * 0.75 + v * PI * 1.5) * 13, y + Math.sin(-PI * 0.75 + v * PI * 1.5) * 13, C.amber, 2); D.text(S, `${M.fmt(v * 3.3, 2)} V → ${S.A ? S.A[i - 2] : 0}`, x - 10, y + 30, { size: 10, color: C.muted }); } });
      pinsR.forEach(([n, v, t], i) => { const y = cy + 70 + i * sp; D.line(S, cx + cw, y, cx + cw + 50, y, v > 0 ? C.amber : C.muted, 2); D.text(S, n, cx + cw - 8, y + 4, { size: 11, weight: 700, align: 'right' }); const x = cx + cw + 60;
        if (t === 'led') { D.circle(S, x + 12, y, 10, v ? '#e5484d' : '#f5d0d3', '#24292f', 1); if (v) D.circle(S, x + 12, y, 18, 'rgba(229,72,77,.18)'); }
        else if (t === 'dim') { D.circle(S, x + 12, y, 10, `rgba(191,135,0,${0.15 + 0.85 * v})`, '#24292f', 1); D.text(S, `${M.fmt(v * 100, 0)} %`, x + 30, y + 4, { size: 10, color: C.muted }); }
        else { D.circle(S, x + 18, y, 16, '#f6f8fa', C.green, 1.5); for (let k = 0; k < 3; k++) { const a = S.ang + k * 2 * PI / 3; D.line(S, x + 18, y, x + 18 + Math.cos(a) * 13, y + Math.sin(a) * 13, C.green, 3); } D.text(S, `${M.fmt(S.mot || 0, 0)} rpm`, x + 40, y + 4, { size: 10, color: C.muted }); } });
      (S.prog || []).forEach(([n], i) => D.text(S, `${i + 1}: ${S.p['r' + i]}`, cx + 10, cy + ch - 70 + i * 15, { size: 9.5, color: C.cyan }));
      S.set('in', `${+p.di1}${+p.di0}b`); S.set('adc', S.A ? `${S.A[0]}, ${S.A[1]}` : '—'); S.set('out', `${o.DO1 || 0}${o.DO0 || 0}b`); S.set('pwm', `${M.fmt(o.PWM0 || 0, 1)}, ${M.fmt(o.PWM1 || 0, 1)}`); S.set('ccr', `${Math.round((o.PWM0 || 0) * 10)}, ${Math.round((o.PWM1 || 0) * 10)}`); S.set('err', S.err, /OK/.test(S.err) ? 'ok' : 'bad');
    }
  });

  /* ================= Sensor–actuator interfacing (Topic IV.9) ================= */
  const SC = { prox: 'Proximity sensor → relay → conveyor motor', temp: 'Temperature sensor (LM35) → fan with hysteresis', dist: 'Ultrasonic distance → servo angle', conv: 'Photo-eye → conveyor start/stop (part spacing)' };
  RIL.defineSim({
    id: 'sensor-actuator-interfacing', title: 'Sensor–actuator interfacing scenarios', unit: 4, category: 'embedded-systems', kind: '2d', auto: true, autoDefault: true,
    description: 'Four complete chains from sensor signal through interface circuit and controller decision to actuator response: a proximity sensor switching a motor through a transistor–relay driver (R_B from Example 4.3), an LM35 driving a fan with on/off hysteresis (ADC code, Example 4.2), an ultrasonic ranger commanding a servo angle, and a photo-eye triggering conveyor operation.',
    help: 'Choose a scenario; the input signal, the controller decision and the actuator state are plotted together. Move the stimulus slider (or use Automatic) and watch the decision logic. The interface-circuit values are calculated from the formulas in Sections 4.9–4.10.',
    controls: [
      { id: 'sc', type: 'select', label: 'Scenario', string: true, value: 'temp', options: Object.entries(SC) },
      { id: 'x', label: 'Stimulus (distance mm | temperature °C | range cm | box position)', min: 0, max: 100, step: 0.5, value: 35 },
      { id: 'th', label: 'Switching threshold', min: 5, max: 90, step: 0.5, value: 40 },
      { id: 'hy', label: 'Hysteresis band', min: 0, max: 10, step: 0.5, value: 2 }
    ],
    readouts: [{ id: 'in', label: 'Sensor signal' }, { id: 'adc', label: 'Interface / ADC value' }, { id: 'dec', label: 'Controller decision' }, { id: 'act', label: 'Actuator response' }, { id: 'ckt', label: 'Interface circuit' }],
    charts: [{ id: 'c', title: 'Input signal, decision and actuator response', x: 'time (s)', y: 'normalised', series: [{ label: 'sensor input' }, { label: 'decision', stepped: true }, { label: 'actuator' }], window: 700 }],
    reset(S) { S.state = 0; S.act = 0; S.ang = 90; S.boxes = [0.1, 0.4]; },
    onControl(S, id, v) { if (id === 'sc') { S.reset(); const pr = { prox: [20, 8, 0.5], temp: [35, 40, 2], dist: [60, 0, 0], conv: [0, 50, 0] }[v]; S.setParam('x', pr[0], true); S.setParam('th', pr[1] || 10, true); S.setParam('hy', pr[2], true); } },
    step(S, dt) {
      const p = S.p, sc = p.sc; if (S.auto && sc !== 'conv') S.setParam('x', +(50 + 45 * Math.sin(S.t * 0.4)).toFixed(1), true);
      let inN = p.x / 100, dec = 0;
      if (sc === 'prox') { const on = p.x < p.th; S.state = on ? 1 : (p.x > p.th + p.hy ? 0 : S.state); dec = S.state; S.act += ((S.state ? 1 : 0) - S.act) * Math.min(1, dt * 2); }
      if (sc === 'temp') { if (p.x > p.th + p.hy / 2) S.state = 1; else if (p.x < p.th - p.hy / 2) S.state = 0; dec = S.state; S.act += (S.state - S.act) * Math.min(1, dt * 1.5); }
      if (sc === 'dist') { const ang = M.clamp(p.x / 100 * 180, 0, 180); S.ang += (ang - S.ang) * Math.min(1, dt * 4); dec = ang / 180; S.act = S.ang / 180; }
      if (sc === 'conv') { const eye = 0.6; const blocked = S.boxes.some(b => Math.abs(b - eye) < 0.03); S.timer = blocked ? (S.timer || 0) + dt : 0; const run = !blocked || S.timer > 1.5; S.state = blocked ? 1 : 0; dec = run ? 1 : 0; if (run) S.boxes = S.boxes.map(b => { b += 0.1 * dt; return b > 1.05 ? -0.05 : b; }); S.act = run ? 1 : 0; inN = blocked ? 1 : 0; S.setParam('x', +(S.boxes[0] * 100).toFixed(1), true); }
      S.dec = dec; S.chart('c').push(S.t, [inN, dec * 0.9 + 0.05, S.act * 0.8 + 0.1]);
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, sc = p.sc; const y = H * 0.42;
      const blocks = { prox: ['Inductive sensor\nPNP, 24 V', 'Opto/level shift\n24 V → 3.3 V', 'MCU decision\nd < S_r ?', 'NPN + relay\nflyback diode', 'Conveyor motor'], temp: ['LM35\n10 mV/°C', 'ADC 12-bit\nV_ref 3.3 V', 'MCU: on/off with\nhysteresis', 'MOSFET low-side\nswitch', 'Cooling fan'], dist: ['Ultrasonic\nd = v_s t/2', 'Timer capture\n(echo width)', 'MCU: map d → θ', 'PWM 50 Hz\n1–2 ms pulse', 'RC servo'], conv: ['Photo-eye\n(NPN, pull-up)', 'GPIO input\n(debounced)', 'MCU: stop, wait\n1.5 s, restart', 'Contactor\ndriver', 'Conveyor'] }[sc];
      const bw = Math.min(150, (W - 60) / 5 - 14); blocks.forEach((b, i) => { D.block(S, 16 + i * (bw + 14), y - 36, bw, 72, b, { size: 10, active: (i === 2 && S.dec > 0.5) || (i === 4 && S.act > 0.5) }); if (i < 4) D.arrow(S, 16 + i * (bw + 14) + bw, y, 16 + (i + 1) * (bw + 14), y, C.amber, 2, 7); });
      let inTxt, adc, decTxt, actTxt, ckt;
      if (sc === 'prox') { inTxt = `target at ${M.fmt(p.x, 1)} mm`; adc = `GPIO = ${S.state ? 1 : 0}`; decTxt = S.state ? 'object present → motor ON' : 'no object → motor OFF'; actTxt = `motor ${S.act > 0.5 ? 'running' : 'stopped'}`; const IB = 5 * 0.06 / 100, RB = (5 - 0.7) / IB; ckt = `R_B = (V_OH − V_BE)/I_B = (5 − 0.7)/${M.fmt(IB * 1000, 1)} mA = ${M.fmt(RB / 1000, 2)} kΩ (Ex. 4.3)`; }
      if (sc === 'temp') { const v = p.x * 0.01, D_ = M.sig.adcCode(v, 3.3, 12); inTxt = `T = ${M.fmt(p.x, 1)} °C → ${M.fmt(v, 3)} V`; adc = `D = round(v·4095/3.3) = ${D_}`; decTxt = S.state ? `T > ${p.th + p.hy / 2} → fan ON` : `T < ${p.th - p.hy / 2} → fan OFF (band ±${p.hy / 2})`; actTxt = `fan ${M.fmt(S.act * 100, 0)} %`; ckt = `resolution 3.3/4095/0.01 = 0.081 °C per LSB (Ex. 4.2)`; }
      if (sc === 'dist') { const tof = 2 * p.x / 100 / M.inst.ultrasonicSpeed(20); inTxt = `range ${M.fmt(p.x, 1)} cm, echo ${M.fmt(tof * 1e6, 0)} µs`; adc = `capture = ${Math.round(tof * 1e6)} ticks @ 1 MHz`; decTxt = `θ = 180° × d/100 cm = ${M.fmt(S.dec * 180, 1)}°`; actTxt = `servo at ${M.fmt(S.ang, 1)}°`; ckt = `pulse t_p = 1 + θ/180 = ${M.fmt(1 + S.dec, 3)} ms (2.12)`; }
      if (sc === 'conv') { inTxt = S.state ? 'beam blocked (part present)' : 'beam clear'; adc = `GPIO = ${S.state}`; decTxt = S.state ? (S.timer > 1.5 ? 'dwell done → run' : `stop, dwell ${M.fmt(S.timer || 0, 1)}/1.5 s`) : 'run'; actTxt = S.act ? 'conveyor running' : 'conveyor stopped'; ckt = 'pull-up 10 kΩ to 3.3 V; NPN output pulls low when blocked'; }
      // actuator picture
      const ax = 16 + 4 * (bw + 14) + bw / 2, ay = y + 90;
      if (sc === 'dist') { D.link(S, ax, ay, ax + Math.cos(PI - S.ang * M.D2R) * 50, ay - Math.sin(PI - S.ang * M.D2R) * 50, 8, '#c9d1d9'); D.joint(S, ax, ay, 8); }
      else if (sc === 'conv') { const x0 = 40, x1 = W - 40, cy = H - 40; D.rect(S, x0, cy, x1 - x0, 8, '#c9d1d9'); (S.boxes || []).forEach(b => D.rect(S, x0 + b * (x1 - x0) - 12, cy - 22, 24, 22, '#8a6a3a', '#24292f', 1, 2)); D.rect(S, x0 + 0.6 * (x1 - x0) - 3, cy - 32, 6, 32, S.state ? C.green : C.cyan); }
      else { for (let k = 0; k < 3; k++) { const a = S.t * 8 * S.act + k * 2 * PI / 3; D.line(S, ax, ay, ax + Math.cos(a) * 26, ay + Math.sin(a) * 26, C.cyan, 5); } D.circle(S, ax, ay, 6, C.text); }
      D.text(S, SC[sc], 16, 26, { size: 13, weight: 700 }); D.text(S, ckt, 16, H - 12, { size: 11, color: C.muted });
      S.set('in', inTxt); S.set('adc', adc); S.set('dec', decTxt); S.set('act', actTxt, S.act > 0.5 ? 'ok' : ''); S.set('ckt', ckt);
    }
  });

  /* ================= PWM (Topic IV.10) ================= */
  RIL.defineSim({
    id: 'pwm', title: 'Pulse-width modulation and motor speed', unit: 4, category: 'embedded-systems', kind: '2d', auto: false,
    description: 'PWM waveform with frequency f, duty cycle D, ON time Dt/f and OFF time; average output V_avg = D·V_dc (4.4). Timer configuration f = f_clk/((PSC + 1)(ARR + 1)), D = CCR/(ARR + 1) (4.5). A simplified DC motor model (stated below) shows speed following the average voltage and current ripple that grows at low PWM frequency.',
    help: 'Set the duty cycle and frequency directly, or switch to timer mode and enter PSC, ARR and CCR as on a microcontroller (Example 4.4: 72 MHz, PSC = 71, ARR = 999, CCR = 300 → 1 kHz, 30 %). The motor model: armature L/R = 2 ms, mechanical time constant 0.3 s, no-load speed 3000 rpm at 12 V.',
    controls: [
      { id: 'mode', type: 'select', label: 'Set PWM by', string: true, value: 'direct', options: [['direct', 'Duty cycle and frequency'], ['timer', 'Timer registers (PSC, ARR, CCR)']] },
      { id: 'D', label: 'Duty cycle D', min: 0, max: 100, step: 0.5, value: 30, unit: '%' }, { id: 'f', label: 'PWM frequency f', min: 50, max: 40000, step: 50, value: 1000, unit: 'Hz' },
      { id: 'Vdc', label: 'Supply V_dc', min: 3, max: 24, step: 0.5, value: 12, unit: 'V' },
      { id: 'fclk', label: 'Timer clock f_clk', min: 1, max: 200, step: 1, value: 72, unit: 'MHz' }, { id: 'PSC', label: 'Prescaler PSC', min: 0, max: 999, step: 1, value: 71 }, { id: 'ARR', label: 'Auto-reload ARR', min: 1, max: 9999, step: 1, value: 999 }, { id: 'CCR', label: 'Compare CCR', min: 0, max: 9999, step: 1, value: 300 }
    ],
    readouts: [{ id: 'f', label: 'Frequency f', unit: 'Hz' }, { id: 'D', label: 'Duty cycle', unit: '%' }, { id: 'ton', label: 'ON time', unit: 'µs' }, { id: 'toff', label: 'OFF time', unit: 'µs' }, { id: 'vavg', label: 'Average V_avg = D·V_dc', unit: 'V' }, { id: 'bits', label: 'Duty resolution log₂(ARR+1)', unit: 'bits' }, { id: 'n', label: 'Motor speed', unit: 'rpm' }, { id: 'rip', label: 'Current ripple (p-p, % of mean)', unit: '%' }],
    charts: [{ id: 'w', title: 'PWM waveform (4 periods) and its average', x: 'time (µs)', y: 'V', series: [{ label: 'v(t)', stepped: true }, { label: 'V_avg' }] }, { id: 'n', title: 'Motor speed response (simplified first-order model)', x: 'time (s)', y: 'rpm', series: [{ label: 'speed' }, { label: 'steady-state 3000·D·V_dc/12' }], window: 800 }],
    reset(S) { S.w = 0; },
    pwm(S) { const p = S.p; if (p.mode === 'timer') { const r = M.auto.pwmTimer(p.fclk * 1e6, p.PSC, p.ARR, Math.min(p.CCR, p.ARR + 1)); return { f: r.f, D: r.D, bits: r.bits }; } return { f: p.f, D: p.D / 100, bits: NaN }; },
    step(S, dt) { const p = S.p, r = this.pwm(S); const nss = 3000 * r.D * p.Vdc / 12; S.w += (nss - S.w) * (1 - Math.exp(-dt / 0.3)); S.chart('n').push(S.t, [S.w, nss]); },
    draw(S) {
      D.clear(S); const p = S.p, r = this.pwm(S), T = 1 / r.f, W = S.W, H = S.H; const pts = []; for (let k = 0; k < 4; k++) { const t0 = k * T * 1e6; pts.push([t0, p.Vdc], [t0 + r.D * T * 1e6, 0]); } pts.push([4 * T * 1e6, p.Vdc]); S.chart('w').setAll([pts, [[0, r.D * p.Vdc], [4 * T * 1e6, r.D * p.Vdc]]]);
      // big waveform drawing on canvas with annotations
      const x0 = 40, x1 = W - 40, yH = 50, yL = 170, per = (x1 - x0) / 3; for (let k = 0; k < 3; k++) { const xs = x0 + k * per, xe = xs + r.D * per; D.poly(S, [[xs, yL], [xs, yH], [xe, yH], [xe, yL], [xs + per, yL]], null, C.amber, 2.5, false); }
      D.line(S, x0, yL - (yL - yH) * r.D, x1, yL - (yL - yH) * r.D, C.green, 2, [6, 4]); D.text(S, `V_avg = D·V_dc = ${M.fmt(r.D * p.Vdc, 2)} V`, x1, yL - (yL - yH) * r.D - 6, { size: 12, color: C.green, align: 'right', weight: 650 });
      D.arrow(S, x0, yH - 12, x0 + r.D * per, yH - 12, C.cyan, 1.5, 6); D.text(S, `t_ON = ${M.fmt(r.D * T * 1e6, 1)} µs`, x0 + 4, yH - 18, { size: 11, color: C.cyan }); D.arrow(S, x0 + r.D * per, yL + 14, x0 + per, yL + 14, C.violet, 1.5, 6); D.text(S, `t_OFF = ${M.fmt((1 - r.D) * T * 1e6, 1)} µs`, x0 + r.D * per + 4, yL + 30, { size: 11, color: C.violet });
      D.text(S, `T = 1/f = ${M.fmt(T * 1e6, 2)} µs`, x0 + per * 1.5, yL + 30, { size: 11, color: C.muted, align: 'center' });
      if (p.mode === 'timer') { D.text(S, `f = f_clk/((PSC+1)(ARR+1)) = ${p.fclk} MHz/(${p.PSC + 1}·${p.ARR + 1}) = ${M.fmt(r.f, 2)} Hz;  D = CCR/(ARR+1) = ${p.CCR}/${p.ARR + 1}`, 16, 24, { size: 12 }); const cy = H - 60, cw = W - 80; const cnt = ((S.t * 2) % 1); D.poly(S, [[40, cy + 30], [40 + cw * cnt, cy + 30 - 30 * cnt]], null, C.cyan, 2, false); D.line(S, 40, cy + 30 - 30 * Math.min(1, p.CCR / (p.ARR + 1)), 40 + cw, cy + 30 - 30 * Math.min(1, p.CCR / (p.ARR + 1)), C.amber, 1, [4, 3]); D.text(S, 'counter 0 → ARR (cyan), compare level CCR (amber): output high while counter < CCR', 40, cy + 50, { size: 10.5, color: C.muted }); }
      // motor current ripple: Δi/I ≈ (1−D)·T/τ_e (small-ripple estimate with τ_e = 2 ms)
      const rip = r.D > 0 ? Math.min(400, (1 - r.D) * T / 2e-3 * 100) : 0;
      D.circle(S, W - 80, H - 90, 30, '#f6f8fa', C.green, 2); for (let k = 0; k < 3; k++) { const a = S.t * S.w / 60 * 0.3 + k * 2 * PI / 3; D.line(S, W - 80, H - 90, W - 80 + Math.cos(a) * 24, H - 90 + Math.sin(a) * 24, C.green, 4); }
      S.set('f', r.f); S.set('D', r.D * 100); S.set('ton', r.D * T * 1e6); S.set('toff', (1 - r.D) * T * 1e6); S.set('vavg', r.D * p.Vdc); S.set('bits', p.mode === 'timer' ? r.bits : '—'); S.set('n', S.w); S.set('rip', rip);
    }
  });

  /* ================= Communication interfaces (Topic IV.11) ================= */
  RIL.defineSim({
    id: 'communication-interfaces', title: 'Communication interfaces: UART, SPI, I²C and CAN', unit: 4, category: 'embedded-systems', kind: '2d', auto: true, autoDefault: true,
    description: 'Transmitter and receiver exchange a data byte; the bits travel along the wires and the line waveforms are drawn bit by bit: UART frame (start, 8 data bits LSB first, parity, stop; throughput = baud/bits per frame, 4.6), SPI (SCLK, MOSI, MISO, SS), I²C (START, 7-bit address + R/W, ACK, data, ACK, STOP), and CAN (identifier arbitration between two nodes: the lower ID wins).',
    help: 'Choose the interface and the byte to send, then watch the frame. The timing readouts are computed from the bit rate. In CAN mode two nodes start together; dominant (0) bits overwrite recessive (1) bits, so the node with the lower identifier continues and the other backs off.',
    controls: [
      { id: 'bus', type: 'select', label: 'Interface', string: true, value: 'uart', options: [['uart', 'UART (8N1 or 8E1)'], ['spi', 'SPI (mode 0)'], ['i2c', 'I²C (write one byte)'], ['can', 'CAN (arbitration + data)']] },
      { id: 'byte', label: 'Data byte', min: 0, max: 255, step: 1, value: 0x4b }, { id: 'rate', label: 'Bit rate', min: 9.6, max: 1000, step: 0.1, value: 115.2, unit: 'kbit/s' },
      { id: 'par', type: 'toggle', label: 'UART even parity', value: false }, { id: 'addr', label: 'I²C address | CAN ID node A', min: 0, max: 127, step: 1, value: 0x68 }, { id: 'id2', label: 'CAN ID node B', min: 0, max: 127, step: 1, value: 0x6a },
      { id: 'bps', label: 'Animation speed', min: 1, max: 20, step: 1, value: 6, unit: 'bits/s' }
    ],
    readouts: [{ id: 'bits', label: 'Bits per frame' }, { id: 'tf', label: 'Frame time', unit: 'µs' }, { id: 'thr', label: 'Throughput', unit: 'bytes/s' }, { id: 'now', label: 'Current bit / field' }, { id: 'rx', label: 'Received' }],
    reset(S) { S.k = 0; S.acc = 0; },
    onControl(S) { S.k = 0; },
    frame(S) {
      const p = S.p, b = Math.round(p.byte), bits = []; const lsb = [...Array(8)].map((_, i) => (b >> i) & 1), msb = lsb.slice().reverse();
      if (p.bus === 'uart') { bits.push({ v: 0, f: 'start' }); lsb.forEach((v, i) => bits.push({ v, f: 'D' + i })); if (p.par) bits.push({ v: lsb.reduce((a, c) => a ^ c, 0), f: 'parity (even)' }); bits.push({ v: 1, f: 'stop' }); return { bits, lines: ['TX'] }; }
      if (p.bus === 'spi') { msb.forEach((v, i) => bits.push({ v, f: 'D' + (7 - i), miso: (0xa5 >> (7 - i)) & 1 })); return { bits, lines: ['SS', 'SCLK', 'MOSI', 'MISO'] }; }
      if (p.bus === 'i2c') { const a = Math.round(p.addr); bits.push({ v: 0, f: 'START' }); for (let i = 6; i >= 0; i--) bits.push({ v: (a >> i) & 1, f: 'A' + i }); bits.push({ v: 0, f: 'R/W = 0 (write)' }); bits.push({ v: 0, f: 'ACK (slave)' }); msb.forEach((v, i) => bits.push({ v, f: 'D' + (7 - i) })); bits.push({ v: 0, f: 'ACK (slave)' }); bits.push({ v: 1, f: 'STOP' }); return { bits, lines: ['SCL', 'SDA'] }; }
      const A = Math.round(p.addr), B = Math.round(p.id2); bits.push({ v: 0, f: 'SOF' }); let lost = null; for (let i = 10; i >= 0; i--) { const ba = (A >> i) & 1, bb = (B >> i) & 1; const bus = ba & bb; if (lost === null && ba !== bb) lost = ba > bb ? 'A' : 'B'; bits.push({ v: bus, f: 'ID' + i, a: ba, b: bb, lost }); } bits.push({ v: 0, f: 'RTR' }); for (let i = 0; i < 6; i++) bits.push({ v: [0, 0, 0, 0, 0, 1][i], f: 'control (DLC = 1)' }); msb.forEach((v, i) => bits.push({ v, f: 'data D' + (7 - i) })); for (let i = 0; i < 15; i++) bits.push({ v: (i * 7 + b) % 2, f: 'CRC' }); bits.push({ v: 1, f: 'CRC delimiter' }, { v: 0, f: 'ACK slot' }, { v: 1, f: 'ACK delimiter' }); for (let i = 0; i < 7; i++) bits.push({ v: 1, f: 'EOF' }); return { bits, lines: ['CAN_H − CAN_L (dominant = 0)'], lost };
    },
    step(S, dt) { const fr = this.frame(S); S.acc += dt * S.p.bps; if (S.acc >= 1) { S.acc = 0; S.k++; if (S.k > fr.bits.length + 3) S.k = 0; } },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, fr = this.frame(S), n = fr.bits.length, k = Math.min(S.k, n);
      D.block(S, 16, 30, 120, 60, 'Transmitter\n' + ({ uart: 'MCU UART', spi: 'SPI master', i2c: 'I²C master', can: 'CAN node A' })[p.bus], { stroke: C.amber }); D.block(S, W - 136, 30, 120, 60, 'Receiver\n' + ({ uart: 'PC / HMI', spi: 'SPI ADC (slave)', i2c: `IMU @0x${Math.round(p.addr).toString(16)}`, can: 'CAN node B' })[p.bus], { stroke: C.cyan });
      const wires = fr.lines.length; for (let i = 0; i < wires; i++) { const y = 46 + i * (40 / Math.max(1, wires)); D.line(S, 136, y, W - 136, y, '#8c959f', 2); D.text(S, fr.lines[i], W / 2, y - 3, { size: 9.5, align: 'center', color: C.muted }); }
      for (let j = 0; j < Math.min(k, n); j++) { const f = (S.k - j - (S.acc)) / 6; if (f < 0 || f > 1) continue; D.circle(S, 136 + f * (W - 272), 46, 7, fr.bits[j].v ? C.amber : C.cyan, '#24292f', 1); D.text(S, String(fr.bits[j].v), 136 + f * (W - 272), 50, { size: 9, align: 'center', color: '#2b3440', weight: 700 }); }
      // waveforms
      const x0 = 40, x1 = W - 20, bw = (x1 - x0) / Math.max(n, 12), y0 = 130; const lvl = (y, v) => y + (v ? 0 : 26);
      const trace = (name, vals, y, col) => { D.text(S, name, 4, y + 18, { size: 10, color: C.muted }); const pts = []; vals.forEach((v, j) => { if (j >= k) return; pts.push([x0 + j * bw, lvl(y, v)], [x0 + (j + 1) * bw, lvl(y, v)]); }); if (pts.length) D.poly(S, pts, null, col, 2, false); };
      if (p.bus === 'uart') { trace('TX', fr.bits.map(b => b.v), y0, C.amber); }
      if (p.bus === 'spi') { trace('SS', fr.bits.map(() => 0), y0, C.violet); const clk = []; fr.bits.forEach(() => clk.push(0)); const pts = []; for (let j = 0; j < k; j++) pts.push([x0 + j * bw, y0 + 70], [x0 + j * bw + bw / 2, y0 + 70], [x0 + j * bw + bw / 2, y0 + 44], [x0 + (j + 1) * bw, y0 + 44], [x0 + (j + 1) * bw, y0 + 70]); D.text(S, 'SCLK', 4, y0 + 62, { size: 10, color: C.muted }); if (pts.length) D.poly(S, pts, null, C.green, 2, false); trace('MOSI', fr.bits.map(b => b.v), y0 + 88, C.amber); trace('MISO', fr.bits.map(b => b.miso), y0 + 132, C.cyan); }
      if (p.bus === 'i2c') { const pts = []; for (let j = 1; j < Math.min(k, n - 1); j++) pts.push([x0 + j * bw, y0 + 26], [x0 + j * bw + bw / 2, y0 + 26], [x0 + j * bw + bw / 2, y0], [x0 + (j + 1) * bw, y0], [x0 + (j + 1) * bw, y0 + 26]); D.text(S, 'SCL', 4, y0 + 18, { size: 10, color: C.muted }); if (pts.length) D.poly(S, pts, null, C.green, 2, false); trace('SDA', fr.bits.map(b => b.v), y0 + 44, C.amber); }
      if (p.bus === 'can') { trace('node A', fr.bits.map(b => b.a ?? b.v), y0, C.amber); trace('node B', fr.bits.map(b => b.b ?? b.v), y0 + 44, C.cyan); trace('bus', fr.bits.map(b => b.v), y0 + 88, C.green); if (fr.lost) D.text(S, `Arbitration: node ${fr.lost} sent recessive (1) while the bus was dominant (0) → node ${fr.lost} backs off; node ${fr.lost === 'A' ? 'B' : 'A'} (lower ID) continues`, 16, H - 14, { size: 11.5, color: C.amber }); }
      for (let j = 0; j < Math.min(k, n); j++) { if (j === 0 || fr.bits[j].f.replace(/\d/g, '') !== fr.bits[j - 1].f.replace(/\d/g, '')) D.text(S, fr.bits[j].f.replace(/^D\d$/, 'data').replace(/^A\d$/, 'addr').replace(/^ID\d+$/, 'identifier').replace(/^data D\d$/, 'data'), x0 + j * bw + 2, y0 - 8, { size: 9, color: C.muted }); }
      const rate = p.rate * 1000; const bitsN = p.bus === 'uart' ? n : p.bus === 'spi' ? 8 : p.bus === 'i2c' ? 20 : n; const tf = bitsN / rate; const thr = p.bus === 'uart' ? M.auto.uartThroughput(rate, n) : p.bus === 'i2c' ? rate / 9 : p.bus === 'spi' ? rate / 8 : rate / n;
      const cur = fr.bits[Math.min(k, n) - 1]; const rx = k >= n ? '0x' + Math.round(p.byte).toString(16).toUpperCase().padStart(2, '0') + ' (' + Math.round(p.byte) + ')' : 'receiving…';
      S.set('bits', p.bus === 'i2c' ? '9 clocks per byte (+START/STOP)' : bitsN); S.set('tf', tf * 1e6); S.set('thr', thr); S.set('now', cur ? `${cur.f} = ${cur.v}` : '—'); S.set('rx', rx, k >= n ? 'ok' : '');
    }
  });
})();
