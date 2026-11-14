/* Unit IV — industrial automation line, PLC simulator with ladder logic and scan cycle, smart manufacturing (OEE, IIoT) */
(function () {
  const RIL = window.RIL, M = RIL.M, D = RIL.draw, C = RIL.C, PI = Math.PI;

  /* ================= Industrial automation line (Topic IV.1) ================= */
  const PYR = [['Level 4 – Enterprise (ERP)', 'orders, planning, logistics', 'hours–days'], ['Level 3 – Manufacturing operations (MES)', 'scheduling, quality, traceability', 'minutes–hours'], ['Level 2 – Supervisory (SCADA / HMI)', 'monitor and command cells', 'seconds'], ['Level 1 – Control (PLC, robot controller, CNC)', 'real-time control', 'ms–µs'], ['Level 0 – Field (sensors, actuators)', 'interact with the process', 'real-time I/O']];
  RIL.defineSim({
    id: 'factory-automation', title: 'Automated production line with sensor-based control', unit: 4, category: 'industrial-applications', kind: '2d', auto: true, autoDefault: true,
    description: 'Parts travel through feeding, machining, robotic transfer, vision inspection, reject diversion and packing. Photo-eyes (level 0) report part positions to the PLC (level 1), which starts and stops conveyors, machines and the robot; counts flow up to SCADA, MES and ERP (automation pyramid, Section 4.1.2).',
    help: 'Watch the signal flashes: a sensor detects a part, the PLC decides, an actuator acts. Inject a fault (a sensor that stops responding, or a machine breakdown) and see the sensor-based interlocks hold the line. Select a pyramid level to highlight the devices that belong to it.',
    controls: [
      { id: 'v', label: 'Conveyor speed', min: 20, max: 120, step: 5, value: 60, unit: 'px/s (display)' },
      { id: 'tm', label: 'Machining time', min: 0.5, max: 6, step: 0.1, value: 2, unit: 's' },
      { id: 'defect', label: 'Defect rate', min: 0, max: 50, step: 1, value: 10, unit: '%' },
      { id: 'fault', type: 'select', label: 'Inject fault', string: true, value: 'none', options: [['none', 'None'], ['sensor', 'Machine-entry photo-eye failed (stuck OFF)'], ['machine', 'Machine breakdown'], ['jam', 'Packing conveyor jam']] },
      { id: 'lvl', type: 'select', label: 'Highlight pyramid level', value: 0, options: PYR.map((p, i) => [4 - i, p[0]]) }
    ],
    readouts: [{ id: 'state', label: 'Line state' }, { id: 'good', label: 'Good parts packed' }, { id: 'rej', label: 'Rejected parts' }, { id: 'wip', label: 'Work in progress' }, { id: 'th', label: 'Throughput', unit: 'parts/min' }, { id: 'sig', label: 'Last control event' }],
    reset(S) { S.parts = []; S.spawn = 0; S.mach = null; S.robotT = 0; S.good = 0; S.rej = 0; S.evt = '—'; S.flash = []; S.t0 = S.t; },
    step(S, dt) {
      const p = S.p, W = S.W, y = S.H * 0.52; S.spawn -= dt; const X = f => 40 + f * (W - 80);
      const stations = { mIn: 0.2, mach: 0.28, rob: 0.45, cam: 0.6, rej: 0.75, pack: 0.9 };
      const occ = x => S.parts.some(q => q.x > x - 0.04 && q.x < x + 0.04 && !q.gone);
      if (S.spawn <= 0 && !occ(0.04)) { S.parts.push({ x: 0.02, st: 'raw', def: Math.random() * 100 < p.defect }); S.spawn = 2.2; }
      const v = p.v / (W - 80); const flash = (x, txt, col) => { S.flash.push({ x, t: 0.6, col }); S.evt = txt; };
      S.parts.sort((a, b) => b.x - a.x).forEach((q, i, arr) => {
        if (q.gone) return; const ahead = arr.slice(0, i).find(o => !o.gone && o.x > q.x && o.x - q.x < 0.06); if (ahead) return;
        if (q.st === 'raw' && q.x >= stations.mIn - 0.005 && q.x < stations.mIn + 0.01) { if (p.fault === 'sensor') { return; } if (S.mach) return; flash(stations.mIn, 'photo-eye PE1 → PLC: part at machine; PLC → machine: load & start', C.cyan); q.st = 'mach'; q.x = stations.mach; S.mach = { q, t: 0 }; return; }
        if (q.st === 'mach') { if (p.fault === 'machine') return; S.mach.t += dt; if (S.mach.t >= p.tm) { q.st = 'machined'; q.x = stations.mach + 0.04; S.mach = null; flash(stations.mach, 'machine → PLC: cycle complete; PLC → conveyor 2: run', C.green); } return; }
        if (q.st === 'machined' && q.x >= stations.rob - 0.01 && !q.rob) { q.rob = true; S.robotT = 1.2; flash(stations.rob, 'PE2 → PLC → robot: transfer part (re-orient)', C.amber); }
        if (q.rob && S.robotT > 0) { S.robotT -= dt; if (S.robotT <= 0) { q.st = 'oriented'; q.x = stations.rob + 0.05; } return; }
        if (q.st === 'oriented' && q.x >= stations.cam && !q.insp) { q.insp = true; flash(stations.cam, `camera → PLC: ${q.def ? 'REJECT' : 'accept'}`, q.def ? C.red : C.green); }
        if (q.insp && q.def && q.x >= stations.rej) { q.gone = true; S.rej++; flash(stations.rej, 'PLC → diverter: push reject', C.red); return; }
        if (q.x >= stations.pack) { if (p.fault === 'jam') return; q.gone = true; S.good++; flash(stations.pack, 'PE4 → PLC: part packed; count → SCADA/MES', C.violet); return; }
        q.x += v * dt;
      });
      S.parts = S.parts.filter(q => !q.gone || false); S.flash.forEach(f => (f.t -= dt)); S.flash = S.flash.filter(f => f.t > 0);
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, y = H * 0.52, X = f => 40 + f * (W - 80), L = +p.lvl;
      const hl = lv => L === lv; D.rect(S, X(0), y, X(1) - X(0), 14, '#c9d1d9', hl(0) ? C.amber : '#8c959f', hl(0) ? 2 : 1, 4);
      const st = [[0.04, 'Feeder', 1, C.text], [0.28, 'CNC machine', 1, C.cyan], [0.45, 'Robot', 1, C.green], [0.6, 'Vision', 1, C.violet], [0.75, 'Reject\ndiverter', 0, C.red], [0.9, 'Packing', 0, C.amber]];
      st.forEach(([f, n, lvl, col]) => { const x = X(f); const bw2 = Math.min(84, (S.W - 80) * 0.13); D.block(S, x - bw2 / 2, y - 96, bw2, 42, n, { stroke: hl(lvl) || hl(0) ? C.amber : col, size: 10.5 }); });
      if (S.mach) { const pr = S.mach.t / p.tm; D.rect(S, X(0.28) - 36, y - 48, 72, 6, '#c9d1d9'); D.rect(S, X(0.3) - 36, y - 48, 72 * Math.min(1, pr), 6, C.cyan); }
      if (S.robotT > 0) { const a = PI * (1 - S.robotT / 1.2); D.link(S, X(0.45), y - 54, X(0.45) + Math.cos(a) * 34, y - 54 - Math.sin(a) * 20, 6, C.green, '#24292f'); }
      [0.2, 0.43, 0.58, 0.88].forEach((f, i) => { const x = X(f); D.rect(S, x - 4, y + 18, 8, 14, hl(0) ? C.amber : '#0b7fc1'); D.text(S, 'PE' + (i + 1), x, y + 46, { size: 10, align: 'center', color: C.muted }); });
      S.parts.forEach(q => D.rect(S, X(q.x) - 9, y - 16, 18, 16, q.st === 'raw' ? '#8a6a3a' : q.def && q.insp ? C.red : '#a8b1bb', '#24292f', 1, 2));
      S.flash.forEach(f => { D.circle(S, X(f.x), y - 120, 6 + 10 * (0.6 - f.t), null, f.col, 2); D.line(S, X(f.x), y - 112, W / 2, 40, `rgba(199,119,0,${f.t})`, 1, [3, 3]); });
      D.block(S, W / 2 - 60, 16, 120, 34, 'PLC (level 1)', { stroke: hl(1) ? C.amber : C.green, size: 11 }); D.block(S, W - 150, 16, 130, 34, 'SCADA / MES / ERP', { stroke: L >= 2 ? C.amber : C.violet, size: 10.5 }); D.line(S, W / 2 + 60, 33, W - 150, 33, C.violet, 1.5, [4, 3]);
      // pyramid
      const px = 40, py = H - 18; PYR.slice().reverse().forEach((r, i) => { const w = 240 - i * 40, x = px + (240 - w) / 2, yy = py - (i + 1) * 18; D.rect(S, x, yy, w, 16, hl(i) ? C.amber : '#eef1f4', '#8c959f', 1, 2); D.text(S, r[0].split(' – ')[0], x + w / 2, yy + 12, { size: 9.5, align: 'center', color: hl(i) ? '#2b3440' : C.muted, weight: 650 }); });
      D.text(S, `${PYR[4 - L][0]}: ${PYR[4 - L][1]} (${PYR[4 - L][2]})`, 300, H - 30, { size: 11.5, color: C.amber });
      const fault = { none: '', sensor: 'FAULT: PE1 stuck OFF — PLC never sees the part, machine waits (line starves)', machine: 'FAULT: machine down — PLC holds upstream parts (sensor-based interlock)', jam: 'FAULT: packing jam — PE4 blocked, PLC stops feeding downstream' }[p.fault];
      if (fault) D.text(S, fault, 16, H * 0.25, { size: 12, weight: 700, color: C.red });
      const el = Math.max(1, S.t - S.t0); S.set('state', fault ? 'fault' : 'running', fault ? 'bad' : 'ok'); S.set('good', S.good); S.set('rej', S.rej); S.set('wip', S.parts.length); S.set('th', S.good / el * 60); S.set('sig', S.evt);
    }
  });

  /* ================= PLC simulator (Topic IV.3) ================= */
  RIL.defineSim({
    id: 'plc-simulator', title: 'PLC: architecture, scan cycle and ladder logic', unit: 4, category: 'plc', kind: '2d', auto: true, autoDefault: true,
    description: 'A conveyor station controlled by a PLC. Field inputs (Start NO, Stop NC, E-stop NC, part photo-eye) are read into the input image table, the ladder program is solved rung by rung (seal-in latch, timer TON, counter CTU), and outputs (conveyor contactor, process lamp, run lamp) are written. Scan time T_scan = T_in + T_prog + T_out + T_comm (4.1); worst-case response T_filter + 2T_scan + T_out (4.2).',
    help: 'Press Start: the seal-in rung latches the motor. When a box reaches the photo-eye the conveyor stops for the process time (TON), then restarts; the counter counts finished boxes. Press Stop or E-stop to break the latch. Slow the scan to watch the input scan → program → output update sequence. Example 4.1: 4000 instructions × 0.05 µs, I/O 0.5 ms, comm 0.3 ms → 1.0 ms; response 15 ms.',
    controls: [
      { id: 'b', type: 'buttons', buttons: [{ id: 'start', label: 'Start (I0.0, NO)' }, { id: 'stop', label: 'Stop (I0.1, NC)' }, { id: 'estop', label: 'E-stop (I0.2, NC) toggle' }] },
      { id: 'ptime', label: 'Process time preset (TON T1)', min: 0.5, max: 5, step: 0.1, value: 2, unit: 's' },
      { id: 'slow', label: 'Displayed scan slow-motion', min: 0.2, max: 4, step: 0.1, value: 1, unit: 's per scan' },
      { id: 'ninst', label: 'Program size', min: 100, max: 20000, step: 100, value: 4000, unit: 'instructions' },
      { id: 'tins', label: 'Time per instruction', min: 0.01, max: 1, step: 0.01, value: 0.05, unit: 'µs' },
      { id: 'tio', label: 'I/O update time', min: 0.1, max: 5, step: 0.1, value: 0.5, unit: 'ms' }, { id: 'tc', label: 'Communication overhead', min: 0, max: 5, step: 0.1, value: 0.3, unit: 'ms' },
      { id: 'tf', label: 'Input filter delay', min: 0, max: 20, step: 0.5, value: 3, unit: 'ms' }, { id: 'tout', label: 'Output delay (relay 10, transistor 0.1)', min: 0.1, max: 20, step: 0.1, value: 10, unit: 'ms' }
    ],
    readouts: [{ id: 'scan', label: 'Scan time T_scan (4.1)', unit: 'ms' }, { id: 'resp', label: 'Worst-case response (4.2)', unit: 'ms' }, { id: 'phase', label: 'Scan phase (slow motion)' }, { id: 'mot', label: 'Q0.0 conveyor motor' }, { id: 'tmr', label: 'T1 accumulated / preset', unit: 's' }, { id: 'cnt', label: 'C1 count (boxes done)' }],
    reset(S) { S.I = { start: 0, stop: 1, estop: 1, pe: 0 }; S.II = Object.assign({}, S.I); S.Q = { motor: 0, lamp: 0, run: 0 }; S.mem = { latch: 0, t1: 0, t1dn: 0, c1: 0, prevDn: 0 }; S.boxes = [{ x: 0.1 }, { x: 0.45 }]; S.ph = 0; S.phT = 0; S.startPulse = 0; },
    onButton(S, b) { if (b === 'start') S.startPulse = 0.6; if (b === 'stop') S.stopPulse = 0.6; if (b === 'estop') S.I.estop = S.I.estop ? 0 : 1; },
    solve(S, dt) { const I = S.II, m = S.mem; m.latch = (I.start || m.latch) && I.stop && I.estop ? 1 : 0; const atStation = I.pe; if (atStation && m.latch) m.t1 = Math.min(S.p.ptime, m.t1 + dt); else if (!atStation) m.t1 = 0; m.t1dn = m.t1 >= S.p.ptime ? 1 : 0; if (m.t1dn && !m.prevDn) m.c1++; m.prevDn = m.t1dn; S.Qimg = { motor: m.latch && (!atStation || m.t1dn) ? 1 : 0, lamp: atStation && m.latch && !m.t1dn ? 1 : 0, run: m.latch }; },
    step(S, dt) {
      if (S.startPulse > 0) { S.startPulse -= dt; S.I.start = 1; } else S.I.start = 0; if (S.stopPulse > 0) { S.stopPulse -= dt; S.I.stop = 0; } else S.I.stop = 1;
      if (S.auto && !S.mem.latch && S.I.estop && S.t > 0.5 && !S.startPulse && !S.stopPulse) S.startPulse = 0.4;
      S.I.pe = S.boxes.some(b => Math.abs(b.x - 0.6) < 0.02) ? 1 : 0;
      // the real PLC scans every T_scan ms: solve logic each frame; display phases in slow motion
      S.II = Object.assign({}, S.I); this.solve(S, dt); S.Q = S.Qimg;
      S.phT += dt / S.p.slow * 4; if (S.phT >= 1) { S.phT = 0; S.ph = (S.ph + 1) % 4; }
      if (S.Q.motor) S.boxes.forEach(b => { b.x += 0.08 * dt; if (b.x > 1.05) b.x = -0.05; });
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, I = S.I, Q = S.Q, m = S.mem; const on = C.green, off = '#6e7781';
      // architecture
      const ax = 16, ay = 16, bw = Math.min(110, W * 0.11); const PH = ['input scan', 'program execution', 'output update', 'communication / housekeeping'];
      const blocks = [['Power\nsupply', null], ['Input\nmodule', 0], ['CPU\n+ memory', 1], ['Output\nmodule', 2], ['Comms\n(fieldbus)', 3]];
      blocks.forEach(([n, ph], i) => D.block(S, ax + i * (bw + 8), ay, bw, 46, n, { active: ph === S.ph, size: 10.5 }));
      D.text(S, `scan phase: ${PH[S.ph]}`, ax, ay + 66, { size: 11.5, color: C.amber, weight: 650 });
      // I/O image tables
      const tx = ax, ty = ay + 84; const row = (y, lbl, v, addr) => { D.circle(S, tx + 8, y - 4, 5, v ? on : off); D.text(S, `${addr}  ${lbl}`, tx + 20, y, { size: 11 }); };
      D.text(S, 'Input image table', tx, ty, { size: 11, color: C.muted, weight: 650 }); row(ty + 18, 'Start PB (NO)', I.start, 'I0.0'); row(ty + 34, 'Stop PB (NC, 1 = healthy)', I.stop, 'I0.1'); row(ty + 50, 'E-stop (NC)', I.estop, 'I0.2'); row(ty + 66, 'Part photo-eye', I.pe, 'I0.3');
      D.text(S, 'Output image table', tx, ty + 92, { size: 11, color: C.muted, weight: 650 }); row(ty + 110, 'Conveyor contactor', Q.motor, 'Q0.0'); row(ty + 126, 'Process lamp', Q.lamp, 'Q0.1'); row(ty + 142, 'Run lamp', Q.run, 'Q0.2');
      // ladder
      const lx = Math.max(250, W * 0.36), lw = W - lx - 16, ly = ay + 6, rh = Math.min(58, (H - 120) / 4); D.line(S, lx, ly, lx, ly + 4 * rh, C.text, 3); D.line(S, lx + lw, ly, lx + lw, ly + 4 * rh, C.text, 3);
      const contact = (x, y, lbl, closed, nc) => { D.line(S, x, y - 9, x, y + 9, closed ? on : C.text, 2); D.line(S, x + 12, y - 9, x + 12, y + 9, closed ? on : C.text, 2); if (nc) D.line(S, x - 2, y + 9, x + 14, y - 9, closed ? on : C.text, 1.5); D.text(S, lbl, x + 6, y - 14, { size: 9.5, align: 'center', color: C.muted }); };
      const coil = (x, y, lbl, v) => { D.circle(S, x, y, 10, v ? 'rgba(26,155,75,.35)' : null, v ? on : C.text, 2); D.text(S, lbl, x, y - 16, { size: 9.5, align: 'center', color: C.muted }); };
      const wire = (x1, x2, y, v) => D.line(S, x1, y, x2, y, v ? on : C.text, v ? 3 : 1.5);
      // rung 1: (Start || Latch) && Stop && Estop -> Latch(M0.0)
      let y = ly + rh * 0.5; const c1 = lx + 30, c2 = lx + lw * 0.32, c3 = lx + lw * 0.5, cE = lx + lw - 30; const branch = I.start || m.latch;
      wire(lx, c1, y, true); contact(c1, y, 'I0.0 Start', I.start); D.line(S, c1 - 8, y, c1 - 8, y + 22, C.text, 1.5); D.line(S, c1 - 8, y + 22, c1 + 20, y + 22, m.latch ? on : C.text, 1.5); contact(c1 + 22, y + 22, 'M0.0', m.latch); D.line(S, c1 + 34, y + 22, c1 + 44, y + 22, C.text, 1.5); D.line(S, c1 + 44, y + 22, c1 + 44, y, C.text, 1.5);
      wire(c1 + 12, c2, y, branch); contact(c2, y, 'I0.1 Stop', I.stop, true); wire(c2 + 12, c3, y, branch && I.stop); contact(c3, y, 'I0.2 E-stop', I.estop, true); wire(c3 + 12, cE - 10, y, branch && I.stop && I.estop); coil(cE, y, 'M0.0 Run latch', m.latch); wire(cE + 10, lx + lw, y, false);
      // rung 2: M0.0 && I0.3 -> TON T1
      y = ly + rh * 1.6; wire(lx, c1, y, true); contact(c1, y, 'M0.0', m.latch); wire(c1 + 12, c2, y, m.latch); contact(c2, y, 'I0.3 Part', I.pe); wire(c2 + 12, cE - 40, y, m.latch && I.pe); D.rect(S, cE - 40, y - 14, 60, 28, '#eef1f4', m.t1 > 0 ? on : C.text, 1.5, 3); D.text(S, `TON T1 ${M.fmt(m.t1, 1)}/${p.ptime}s`, cE - 10, y + 4, { size: 9.5, align: 'center' });
      // rung 3: M0.0 && (!I0.3 || T1.DN) -> Q0.0
      y = ly + rh * 2.6; wire(lx, c1, y, true); contact(c1, y, 'M0.0', m.latch); wire(c1 + 12, c2, y, m.latch); contact(c2, y, 'I0.3', !I.pe, true); D.line(S, c2 - 8, y, c2 - 8, y + 20, C.text, 1.5); D.line(S, c2 - 8, y + 20, c2 + 20, y + 20, C.text, 1.5); contact(c2 + 22, y + 20, 'T1.DN', m.t1dn); D.line(S, c2 + 34, y + 20, c2 + 44, y + 20, C.text, 1.5); D.line(S, c2 + 44, y + 20, c2 + 44, y, C.text, 1.5);
      wire(c2 + 12, cE - 10, y, Q.motor); coil(cE, y, 'Q0.0 Conveyor', Q.motor);
      // rung 4: T1.DN -> CTU C1
      y = ly + rh * 3.5; wire(lx, c1, y, true); contact(c1, y, 'T1.DN', m.t1dn); wire(c1 + 12, cE - 40, y, m.t1dn); D.rect(S, cE - 40, y - 14, 60, 28, '#eef1f4', C.text, 1.5, 3); D.text(S, `CTU C1 = ${m.c1}`, cE - 10, y + 4, { size: 9.5, align: 'center' });
      // conveyor with boxes
      const cy = H - 34, cx0 = lx, cx1 = W - 16; D.rect(S, cx0, cy, cx1 - cx0, 10, '#c9d1d9', '#8c959f', 1, 3); const pe = cx0 + 0.6 * (cx1 - cx0); D.rect(S, pe - 3, cy - 30, 6, 30, I.pe ? C.green : '#0b7fc1'); D.text(S, 'photo-eye', pe, cy + 24, { size: 10, align: 'center', color: C.muted });
      S.boxes.forEach(b => D.rect(S, cx0 + b.x * (cx1 - cx0) - 12, cy - 22, 24, 22, '#8a6a3a', '#24292f', 1, 2));
      D.circle(S, cx0 - 14, cy + 5, 9, Q.motor ? C.green : off, '#24292f', 1); D.text(S, 'M', cx0 - 14, cy + 9, { size: 10, align: 'center', weight: 700 });
      const Tprog = p.ninst * p.tins / 1000, Tscan = M.auto.plcScan(p.tio / 2, Tprog, p.tio / 2, p.tc), resp = M.auto.plcResponse(p.tf, Tscan, p.tout);
      S.set('scan', Tscan); S.set('resp', resp); S.set('phase', PH[S.ph]); S.set('mot', Q.motor ? 'ON' : 'OFF', Q.motor ? 'ok' : ''); S.set('tmr', `${M.fmt(m.t1, 2)} / ${p.ptime}`); S.set('cnt', m.c1);
    }
  });

  /* ================= Smart manufacturing (Topic IV.13) ================= */
  RIL.defineSim({
    id: 'smart-factory', title: 'Smart manufacturing: IIoT data, digital twin and OEE', unit: 4, category: 'industrial-applications', kind: '2d', auto: true, autoDefault: true,
    description: 'Three connected machines (machining centre, robot cell, vision inspection) publish state and sensor data (spindle temperature, vibration) to an edge/cloud layer. A digital twin tracks availability, performance and quality, and OEE = availability × performance × quality (4.15). With predictive maintenance on, rising vibration triggers a planned stop before a breakdown.',
    help: 'Run the shift and watch the OEE components. Raise the wear rate: without predictive maintenance the spindle eventually fails (long unplanned downtime); with it, a short planned stop is scheduled when vibration crosses the threshold. Increase the defect rate to lower quality, and slow cycles to lower performance.',
    controls: [
      { id: 'wear', label: 'Spindle wear rate', min: 0, max: 5, step: 0.1, value: 2, unit: '×' },
      { id: 'pm', type: 'toggle', label: 'Predictive maintenance (vibration threshold)', value: true },
      { id: 'thr', label: 'Vibration alarm threshold', min: 2, max: 9, step: 0.1, value: 6, unit: 'mm/s' },
      { id: 'ideal', label: 'Ideal cycle time', min: 2, max: 20, step: 0.5, value: 6, unit: 's' },
      { id: 'slow', label: 'Actual slow-down', min: 0, max: 50, step: 1, value: 10, unit: '%' },
      { id: 'def', label: 'Defect rate', min: 0, max: 20, step: 0.5, value: 3, unit: '%' }
    ],
    readouts: [{ id: 'A', label: 'Availability', unit: '%' }, { id: 'P', label: 'Performance', unit: '%' }, { id: 'Q', label: 'Quality', unit: '%' }, { id: 'OEE', label: 'OEE = A × P × Q', unit: '%' }, { id: 'st', label: 'Machine state' }, { id: 'vib', label: 'Spindle vibration', unit: 'mm/s' }],
    charts: [{ id: 'oee', title: 'OEE components (digital twin)', x: 'shift time (min)', y: '%', series: [{ label: 'availability' }, { label: 'performance' }, { label: 'quality' }, { label: 'OEE' }], window: 800, ymin: 0, ymax: 100 }, { id: 'vib', title: 'IIoT sensor stream: spindle vibration', x: 'shift time (min)', y: 'mm/s', series: [{ label: 'vibration' }, { label: 'threshold', dash: [5, 4] }], window: 800 }],
    reset(S) { S.tm = 0; S.run = 0; S.down = 0; S.good = 0; S.bad = 0; S.cyc = 0; S.wear = 0; S.state = 'running'; S.stopT = 0; S.rng = M.rng(11); S.events = []; },
    step(S, dt) {
      const p = S.p, h = dt * 60; S.tm += h; // 1 real second = 1 simulated minute
      if (S.state === 'running') { S.run += h; S.wear += p.wear * h / 600; S.cyc += h * 60 / (p.ideal * (1 + p.slow / 100)); while (S.cyc >= 1) { S.cyc--; if (S.rng() * 100 < p.def + S.wear * 4) S.bad++; else S.good++; } }
      else { S.down += h; S.stopT -= h; if (S.stopT <= 0) { S.state = 'running'; S.events.push(`${M.fmt(S.tm, 0)} min: restarted`); } }
      const vib = 2 + 6 * S.wear + 0.3 * M.gaussRand(S.rng); S.vib = vib;
      if (S.state === 'running' && p.pm && vib > p.thr) { S.state = 'planned maintenance'; S.stopT = 20; S.wear = 0; S.events.push(`${M.fmt(S.tm, 0)} min: vibration ${M.fmt(vib, 1)} > threshold → planned stop (20 min)`); }
      if (S.state === 'running' && vib > 9) { S.state = 'BREAKDOWN'; S.stopT = 120; S.wear = 0; S.events.push(`${M.fmt(S.tm, 0)} min: spindle failure → unplanned stop (120 min)`); }
      if (S.events.length > 5) S.events.shift();
      const A = S.run / Math.max(1e-6, S.run + S.down), P = (S.good + S.bad) * p.ideal / 60 / Math.max(1e-6, S.run), Q = S.good / Math.max(1, S.good + S.bad); S.oee = { A, P: Math.min(1, P), Q };
      if (S.frameCount % 3 === 0) { S.chart('oee').push(S.tm, [A * 100, Math.min(1, P) * 100, Q * 100, A * Math.min(1, P) * Q * 100]); S.chart('vib').push(S.tm, [vib, p.thr]); }
    },
    draw(S) {
      D.clear(S); const W = S.W, H = S.H, o = S.oee || { A: 1, P: 1, Q: 1 }; const st = S.state;
      const mk = [['Machining centre', st === 'running' ? C.green : st === 'BREAKDOWN' ? C.red : C.amber, `vib ${M.fmt(S.vib || 0, 1)} mm/s`], ['Robot cell', st === 'running' ? C.green : C.amber, `${S.good + S.bad} parts`], ['Vision inspection', C.green, `${S.bad} rejected`]];
      const bw = Math.min(170, (W - 80) / 3); mk.forEach(([n, col, info], i) => { const x = 20 + i * (bw + 20); D.block(S, x, H - 110, bw, 60, n + '\n' + info, { stroke: col }); D.circle(S, x + bw - 10, H - 100, 5, col); D.line(S, x + bw / 2, H - 110, W / 2, 110, 'rgba(11,127,193,.4)', 1, [4, 4]); for (let k = 0; k < 2; k++) { const f = ((S.t * 0.8 + k / 2 + i / 3) % 1); D.circle(S, x + bw / 2 + (W / 2 - x - bw / 2) * f, H - 110 + (110 - H + 110) * f, 3, C.cyan); } });
      D.block(S, W / 2 - 110, 50, 220, 60, 'Edge / cloud: digital twin\nMES · analytics · OPC UA / MQTT', { stroke: C.violet });
      const gx = W - 200; [['A', o.A], ['P', o.P], ['Q', o.Q], ['OEE', o.A * o.P * o.Q]].forEach(([n, v], i) => { const y = 40 + i * 26; D.text(S, n, gx, y + 12, { size: 12, weight: 700 }); D.rect(S, gx + 40, y, 140, 16, '#eef1f4'); D.rect(S, gx + 40, y, 140 * v, 16, n === 'OEE' ? C.amber : C.cyan); D.text(S, M.fmt(v * 100, 1) + ' %', gx + 176, y + 12, { size: 11, align: 'right', color: '#2b3440', weight: 700 }); });
      D.text(S, `State: ${st}`, 20, 30, { size: 14, weight: 800, color: st === 'running' ? C.green : st === 'BREAKDOWN' ? C.red : C.amber });
      (S.events || []).forEach((e, i) => D.text(S, e, 20, 52 + i * 15, { size: 10.5, color: C.muted }));
      S.set('A', o.A * 100); S.set('P', o.P * 100); S.set('Q', o.Q * 100); S.set('OEE', o.A * o.P * o.Q * 100); S.set('st', st, st === 'running' ? 'ok' : 'bad'); S.set('vib', S.vib || 0);
    }
  });
})();
