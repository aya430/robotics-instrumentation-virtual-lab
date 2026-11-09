#!/usr/bin/env node
/* Validates the equation engine (js/equation-engine.js) against the worked examples of the course notes.
   Run: node tests/math.test.js                                                                      */
'use strict';
const M = require('../js/equation-engine.js');
const D = M.D2R; let pass = 0, fail = 0; const rows = [];
const near = (name, got, exp, tol = 0.005) => { const ok = Math.abs(got - exp) <= Math.max(Math.abs(exp) * tol, 1e-9); (ok ? pass++ : fail++); rows.push(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${+got.toPrecision(6)}, expected ${exp}`); };

/* Unit I */
near('Ex 1.1 DOF six-axis arm', M.inst.grubler(6, 7, 6, 6), 6, 0);
near('Ex 1.2 four-bar DOF', M.inst.grubler(3, 4, 4, 4), 1, 0);
near('Ex 1.3 Stewart platform DOF', M.inst.grubler(6, 14, 18, 36), 6, 0);
near('Ex 1.4 cylindrical volume (m³)', M.inst.cylVolume(300 * D, 0.25, 0.75, 0.6), 0.785);
near('Ex 1.5 spherical volume (m³)', M.inst.sphVolume(2 * Math.PI, 0.4, 1.2, -30 * D, 60 * D), 4.76);
const r8 = [101.2, 100.8, 101.5, 101.1, 100.9, 101.3, 101.0, 101.2];
near('Ex 1.8 mean', M.inst.mean(r8), 101.125); near('Ex 1.8 std dev', M.inst.std(r8), 0.225, 0.01);
near('Ex 1.9 RSS relative uncertainty (%)', M.inst.rss([0.1 / 12 * 100, 0.03 / 2.5 * 100]), 1.46, 0.01);
near('Ex 1.10 voltmeter 1 MΩ', M.inst.loadingVoltage(6, 50, 1000), 5.714);
const ls = M.inst.leastSquares([0, 2, 4, 6, 8, 10], [0.05, 1.02, 2.06, 2.95, 4.03, 5.01]);
near('Ex 1.11 LS slope', ls.m, 0.4960, 0.001); near('Ex 1.11 LS intercept', ls.c, 0.040, 0.01); near('Ex 1.11 max residual', ls.maxRes, -0.066, 0.02);
near('Ex 1.12 thermometer at 10 s', 25 + M.inst.firstOrderStep(1, 75, 8, 10), 78.5, 0.002);
const f13 = M.inst.firstOrderFreq(2 * Math.PI * 50, 0.002); near('Ex 1.13 amplitude ratio', f13.M, 0.847); near('Ex 1.13 phase (°)', f13.phi * M.R2D, -32.1, 0.01);
const s14 = M.inst.secondOrderIdx(0.4, 2 * Math.PI * 500); near('Ex 1.14 overshoot', s14.Mp, 0.254, 0.01); near('Ex 1.14 peak time (ms)', s14.tp * 1000, 1.09, 0.01); near('Ex 1.14 settling (ms)', s14.ts * 1000, 3.18, 0.01);
near('Ex 1.15 loaded pot', M.inst.loadedPot(0.6, 10, 10, 50), 5.725);
near('Ex 1.17 encoder resolution (°)', M.inst.encoderRes(1024), 0.0879, 0.002);
near('Ex 1.18 Gray(1011)', M.inst.gray(0b1011), 0b1110, 0); near('Ex 1.18 bin(Gray 1110)', M.inst.grayToBin(0b1110), 0b1011, 0);
near('Ex 1.21 true distance (m)', M.inst.ultrasonicSpeed(35) * 5.83e-3 / 2, 1.028, 0.002);
near('Ex 1.22 capacitance (pF)', M.inst.capacitance(1, 4e-4, 1e-3) * 1e12, 3.54, 0.005);
near('Ex 1.23 Pt100 at 150 °C (Ω)', M.inst.rtdCVD(150), 157.33, 0.0005);
near('Ex 1.24 NTC at 60 °C (kΩ)', M.inst.ntc(60) / 1000, 2.49, 0.01); near('Ex 1.24 T at 4.5 kΩ (°C)', M.inst.ntcInverse(4500), 44.1, 0.005);
near('Ex 1.25 type K 8.138 mV → T', M.inst.typeK_inverse(7.138 + M.inst.typeK_mV(25)), 200, 0.002);
near('Ex 1.26 manometer (Pa)', M.inst.manometer(13546, 0.15), 19933, 0.002);
near('Ex 1.27 diaphragm deflection (µm)', M.inst.diaphragm(1e6, 0.01, 0.0005, 200e9, 0.3) * 1e6, 68.3, 0.005);
near('Ex 1.27 centre strain (µε)', M.inst.diaphragmCentreStrain(1e6, 0.01, 0.0005, 200e9, 0.3) * 1e6, 683, 0.005);
near('Ex 1.29 quarter bridge exact (mV)', M.inst.quarterBridgeExact(5, 120, 0.126) * 1000, 1.312, 0.002);
near('Ex 1.30 cantilever strain (µε)', M.inst.cantileverStrain(50, 0.1, 70e9, 0.02, 0.005) * 1e6, 857, 0.002);
near('Ex 1.31 shaft strain (µε)', M.inst.shaftStrain45(50, 0.02, 80e9) * 1e6, 199, 0.005);
/* Unit II */
const pn = M.act.pneumatic(0.9, 6e5, 0.05, 0.02); near('Ex 2.1 extend force (N)', pn.Fext, 1060, 0.002); near('Ex 2.1 retract force (N)', pn.Fret, 891, 0.002);
near('Ex 2.1 free air (L)', M.act.freeAir(pn.A, pn.a, 0.2, 6e5) * 1000, 5.0, 0.01);
const hy = M.act.hydraulic(10e6, 0.08, 20e-3 / 60); near('Ex 2.2 force (kN)', hy.F / 1000, 50.3, 0.002); near('Ex 2.2 speed (m/s)', hy.v, 0.066, 0.01); near('Ex 2.2 power (kW)', hy.P / 1000, 3.33, 0.003);
const dc = M.act.dcSteady(24, 1.2, 0.05, 0.05, 0.2); near('Ex 2.3 speed (rad/s)', dc.w, 384); near('Ex 2.3 efficiency', dc.eta, 0.8); near('Ex 2.3 stall torque', dc.Ts, 1.0); near('Ex 2.3 max power', dc.Pmax, 120);
near('Ex 2.4 τm (ms)', 2e-5 * 1.2 / 0.0025 * 1000, 9.6);
// DC motor transient (RK4) must converge to the steady state of Ex 2.3
let x = [0, 0, 0]; const f = M.act.dcDeriv({ Va: 24, Ra: 1.2, La: 0.5e-3, Kt: 0.05, Kb: 0.05, J: 2e-5, B: 0, TL: 0.2 }); for (let i = 0; i < 20000; i++) x = M.rk4(f, x, 0, 1e-5); near('RK4 DC motor settles to 384 rad/s', x[1], 384, 0.002);
near('Ex 2.5 stepper speed (rpm)', M.act.stepSpeed(1000, 200), 300);
near('Ex 2.7 solenoid force (N)', M.act.solenoid(1000, 0.5, 1e-4, 0.002), 3.93, 0.005);
const bs = M.act.screw(0.5, 0.01, 0.9, 25); near('Ex 2.8 ball screw force (N)', bs.F, 283, 0.002); near('Ex 2.8 speed (m/s)', bs.v, 0.25);
near('Ex 2.9 harmonic ratio', M.act.harmonic(200, 202), 100); near('Ex 2.9 J_eq', M.act.gear(100, 1, 1, 1e-4, 2).Jeq, 3e-4);
near('Ex 2.10 grip force (N)', M.act.grip(2, 2, 5, 2, 0.3), 98.7, 0.002);
near('Ex 2.12 in-amp gain', M.sig.inamp(25000, 50.05, 1, 1), 1000, 0.001);
near('Ex 2.13 RC cut-off (Hz)', M.sig.rcCutoff(1e4, 1e-7), 159.2, 0.002); near('Ex 2.13 |H| at 1 kHz', M.sig.lowpassMag(1000, 159.15), 0.157, 0.01); near('Ex 2.13 4th-order at 5fc', M.sig.lowpassMag(500, 100, 4), 0.0016, 0.01);
near('Ex 2.14 Q (mV)', M.sig.adcStep(5, 12) * 1000, 1.221, 0.002); near('Ex 2.14 SNR (dB)', M.sig.snrDb(12), 74.0, 0.002);
const sar = M.sig.sar(3.3, 5, 4); near('Ex 2.15 SAR code', sar.code, 0b1010, 0); near('Ex 2.15 SAR output (V)', sar.vout, 3.125, 0);
near('Ex 2.16 DAC output (V)', M.sig.dac(0b10110100, 5, 8), 3.516, 0.001);
near('Ex 2.17 DAQ rate (Mbit/s)', M.sig.daqRate(8, 1e4, 16) / 1e6, 1.28, 0);
/* Unit III */
const p31 = M.mat.mulVec(M.rotZ(30 * D), [1, 2, 0]); near('Ex 3.1 x', p31[0], -0.134, 0.01); near('Ex 3.1 y', p31[1], 2.232, 0.001);
const R32 = M.rpy(30 * D, 45 * D, 60 * D); near('Ex 3.2 R11', R32[0][0], 0.3536, 0.001); near('Ex 3.2 R12', R32[0][1], -0.5732, 0.001); near('Ex 3.2 R31', R32[2][0], -0.7071, 0.001);
const e32 = M.rpyFromR(R32); near('Ex 3.2 recovered γ', e32.gamma * M.R2D, 30); near('Ex 3.2 recovered β', e32.beta * M.R2D, 45); near('Ex 3.2 recovered α', e32.alpha * M.R2D, 60);
const T33 = M.homog(M.rotZ(90 * D), [3, 1, 0]), p33 = M.applyT(T33, [1, 1, 0]); near('Ex 3.3 x', p33[0], 2); near('Ex 3.3 y', p33[1], 2); const b33 = M.applyT(M.invT(T33), p33); near('Ex 3.3 inverse x', b33[0], 1); near('Ex 3.3 inverse y', b33[1], 1);
const f34 = M.planar2R.fk(0.5, 0.3, 30 * D, 45 * D); near('Ex 3.4 x', f34.x, 0.5107, 0.001); near('Ex 3.4 y', f34.y, 0.5398, 0.001);
const p3R = M.planarFK([0.4, 0.3, 0.1], [30 * D, -45 * D, 60 * D]); near('3R x (Sec 3.5.3)', p3R.x, 0.7069, 0.001); near('3R y', p3R.y, 0.1931, 0.002);
const art = [{ a: 0, alpha: Math.PI / 2, d: 0.4, type: 'R' }, { a: 0.5, alpha: 0, d: 0, type: 'R' }, { a: 0.4, alpha: 0, d: 0, type: 'R' }];
const T35 = M.fkDH(art, [30 * D, 45 * D, -60 * D]).T[3]; near('Ex 3.5 x (DH)', T35[0][3], 0.6408, 0.001); near('Ex 3.5 y (DH)', T35[1][3], 0.3700, 0.001); near('Ex 3.5 z (DH)', T35[2][3], 0.6500, 0.001);
const ik = M.planar2R.ik(0.5, 0.3, 0.5, 0.4); near('Ex 3.6 θ2 (°)', ik.sols[0].t2 * M.R2D, 76.51, 0.001); near('Ex 3.6 θ1 branch 1 (°)', ik.sols[0].t1 * M.R2D, 11.56, 0.002); near('Ex 3.6 θ1 branch 2 (°)', ik.sols[1].t1 * M.R2D, 65.76, 0.002);
const J37 = M.planar2R.jacobian(0.5, 0.3, 30 * D, 45 * D); near('Ex 3.7 det J', M.mat.det(J37), 0.1061, 0.002); const v37 = M.mat.mulVec(J37, [0.5, -0.2]); near('Ex 3.7 ẋ', v37[0], -0.2119, 0.002); near('Ex 3.7 ẏ', v37[1], 0.2398, 0.002);
const q37 = M.mat.solve(J37, [0.1, 0]); near('Ex 3.7 θ̇1', q37[0], 0.0732, 0.005); near('Ex 3.7 θ̇2', q37[1], -0.4815, 0.002);
const Jg = M.jacobianGeo([{ a: 0.5, alpha: 0, d: 0, type: 'R' }, { a: 0.3, alpha: 0, d: 0, type: 'R' }], [30 * D, 45 * D]); near('Geometric Jacobian = analytic (J11)', Jg[0][0], J37[0][0], 1e-9); near('Geometric Jacobian = analytic (J22)', Jg[1][1], J37[1][1], 1e-9);
const c38 = M.traj.cubic(10, 70, 3, 0); near('Ex 3.8 cubic a2', c38.coeffs[2], 20); near('Ex 3.8 cubic a3', c38.coeffs[3], -4.4444, 0.001); near('Cubic end position', M.traj.cubic(10, 70, 3, 3).q, 70); near('Quintic end velocity', M.traj.quintic(10, 70, 3, 3).qd, 0, 0);
const l39 = M.traj.lspb(0, 60, 3, 25, 0); near('Ex 3.9 tb', l39.tb, 0.6); near('Ex 3.9 blend accel', l39.a, 41.67, 0.001); near('Ex 3.9 end position', M.traj.lspb(0, 60, 3, 25, 3).q, 60);
near('Eq 3.26 minimum time', M.traj.minTime(90, 60, 120).tf, 2.0);
const t310 = M.mat.mulVec(M.mat.T(J37), [0, -20]); near('Ex 3.10 τ1', t310[0], -10.21, 0.002); near('Ex 3.10 τ2', t310[1], -1.55, 0.01);
const dy = M.planar2R.dynamics(1, 1, 0.5, 0.3, [0, 90 * D], [0, 0]); const t312 = M.mat.mulVec(dy.M, [1, 1]).map((v, i) => v + dy.G[i]); near('Ex 3.12 M11', dy.M[0][0], 0.59, 0.001); near('Ex 3.12 τ1', t312[0], 10.49, 0.002); near('Ex 3.12 τ2', t312[1], 0.18, 0.001);
near('Ex 3.11 holding torque', 2 * 9.81 * 0.25, 4.905); near('Ex 3.13 Kp', 3e-4 * 2500, 0.75);
// numerical IK of the 6-DOF model reproduces a pose produced by forward kinematics
const six = [{ a: 0, alpha: Math.PI / 2, d: 0.4, type: 'R' }, { a: 0.45, alpha: 0, d: 0, type: 'R' }, { a: 0, alpha: Math.PI / 2, d: 0, type: 'R', offset: Math.PI / 2 }, { a: 0, alpha: -Math.PI / 2, d: 0.4, type: 'R' }, { a: 0, alpha: Math.PI / 2, d: 0, type: 'R' }, { a: 0, alpha: 0, d: 0.12, type: 'R' }];
const qt = [0.3, 0.5, -0.7, 0.4, 0.6, -0.2], Tt = M.fkDH(six, qt).T[6]; const r6 = M.ikDLS(six, [0.2, 0.4, -0.5, 0.2, 0.5, 0], { p: M.pof(Tt), R: M.Rof(Tt) }, { maxIter: 300 }); near('6-DOF DLS IK position error < 1e-5 m', r6.err < 1e-5 ? 1 : 0, 1, 0);
// energy conservation of the 2-link dynamics (RK4, no torque, no friction)
let s = [0, Math.PI / 2, 0, 0]; const E0 = M.planar2R.energy(1, 1, 0.5, 0.3, [s[0], s[1]], [0, 0]).E; const fd = (t, x) => { const d = M.planar2R.dynamics(1, 1, 0.5, 0.3, [x[0], x[1]], [x[2], x[3]]); const a = M.mat.solve(d.M, [-d.Cqd[0] - d.G[0], -d.Cqd[1] - d.G[1]]); return [x[2], x[3], a[0], a[1]]; };
for (let i = 0; i < 2000; i++) s = M.rk4(fd, s, 0, 1e-3); const E1 = M.planar2R.energy(1, 1, 0.5, 0.3, [s[0], s[1]], [s[2], s[3]]).E; near('2-link energy drift after 2 s (J)', Math.abs(E1 - E0) < 1e-4 ? 0 : Math.abs(E1 - E0), 0, 0);
/* Unit IV */
near('Ex 4.1 scan time (ms)', M.auto.plcScan(0.25, 0.2, 0.25, 0.3), 1.0); near('Ex 4.1 response (ms)', M.auto.plcResponse(3, 1, 10), 15);
near('Ex 4.2 ADC code', M.sig.adcCode(0.375, 3.3, 12), 465, 0);
const pw = M.auto.pwmTimer(72e6, 71, 999, 300); near('Ex 4.4 PWM frequency (Hz)', pw.f, 1000); near('Ex 4.4 duty', pw.D, 0.3); near('Ex 4.4 resolution (bits)', pw.bits, 9.97, 0.002);
near('UART throughput 115200 8N1', M.auto.uartThroughput(115200), 11520);
const lens = M.auto.lens(16, 256, 6.4); near('Lens magnification', lens.m, 0.025); near('Lens working distance (mm)', lens.u, 656);
near('Ex 4.5 spatial resolution (mm/px)', 256 / 1280, 0.2);
// Ex 4.6 blob moments on the ten-pixel blob (y upwards in the notes; flip sign of θ for image rows)
const B = M.img.make(7, 6); [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4], [5, 4], [1, 2], [5, 3]].forEach(([x, y]) => (B.d[(5 - y) * 7 + x] = 1)); const bl = M.img.blobs(B).blobs[0];
near('Ex 4.6 area', bl.area, 10, 0); near('Ex 4.6 centroid x', bl.cx, 3.0); near('Ex 4.6 μ20', bl.mu20, 20); near('Ex 4.6 μ02', bl.mu02, 10.5); near('Ex 4.6 orientation (°)', -bl.theta * M.R2D, 34.2, 0.005);
near('Ex 4.7 conveyor shift (mm)', 300 * 0.2, 60); near('OEE', M.auto.oee(0.9, 0.85, 0.98), 0.7497, 0.001);
const dd = M.auto.diffDrive(0.05, 0.3, 12, 8); near('Eq 4.17 v', dd.v, 0.5); near('Eq 4.17 ω', dd.w, 0.6667, 0.001);
// Otsu on a bimodal image picks a threshold between the modes
const O = M.img.make(20, 20); for (let i = 0; i < 400; i++) O.d[i] = i < 200 ? 50 : 200; const To = M.img.otsu(O); near('Otsu threshold between modes', To >= 50 && To < 200 ? 1 : 0, 1, 0);

console.log(rows.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
