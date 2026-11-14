/* Unit tests of the shared robot mathematics (js/lab/01-robot-math.js). Run: node tests/lab.test.js */
'use strict';
const M = require('../js/equation-engine.js'), RM = require('../js/lab/01-robot-math.js');
let pass = 0, fail = 0; const ok = (name, c) => { if (c) pass++; else { fail++; console.log('FAIL', name); } }; const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const six = RM.template('sixR'), p2 = RM.template('planar2R'), art = RM.template('articulated');
/* DOF and classification */
ok('6R dof', RM.mobility(six).n === 6 && RM.mobility(six).kutzbachSpatial === 6 && !RM.mobility(six).planar);
ok('2R gruebler', RM.mobility(p2).gruebler === 2 && RM.classify(p2).name === 'Planar 2R');
ok('7R redundant', RM.mobility(RM.template('sevenR')).redundant);
ok('scara class', /SCARA/.test(RM.classify(RM.template('scara')).name));
/* validation */
ok('template valid', RM.validate(six).every(v => v.ok)); const bad = RM.emptyRobot(); ok('empty invalid', RM.validate(bad).some(v => !v.ok && v.level === 'error'));
/* FK of the planar 2R against the closed form (worked example of Practical 10) */
{ const q = [30 * M.D2R, 60 * M.D2R]; const p = RM.tcp(p2, q); ok('2R fk x', near(p[0], 0.5 * Math.cos(q[0]) + 0.3 * Math.cos(q[0] + q[1]), 1e-12)); ok('2R fk y', near(p[1], 0.55, 1e-9)); ok('2R x=0.433', near(p[0], 0.4330127, 1e-6)); }
/* tip Jacobian against finite differences */
{ const q = [0.2, 0.6, -0.3, 0.4, 0.5, 0.1], L = 0.12, h = 1e-6; const J = RM.jacTip(six, q, L); let e = 0; for (let k = 0; k < 6; k++) { const a = q.slice(), b = q.slice(); a[k] += h; b[k] -= h; const d = M.v3.scale(M.v3.sub(RM.tip(six, a, L).p, RM.tip(six, b, L).p), 1 / (2 * h)); for (let r = 0; r < 3; r++) e = Math.max(e, Math.abs(d[r] - J[r][k])); } ok('jacobian = dp/dq', e < 1e-6); }
/* IK round trip with every method */
{ const q = [0.2, 0.6, -0.3, 0.4, 0.5, 0.1]; const t = RM.tip(six, q, 0.12); for (const m of ['dls', 'pinv', 'inverse']) { const o = RM.ikSolve(six, RM.homeQ(six).map(v => v + 0.1), { p: t.p, R: t.R }, { method: m, alpha: 1, tool: 0.12 }); ok('ik ' + m, o.converged && M.v3.norm(M.v3.sub(RM.tip(six, o.q, 0.12).p, t.p)) < 1e-3); }
  const far = RM.ikSolve(six, RM.homeQ(six), { p: [3, 0, 0] }, {}); ok('ik unreachable reported', !far.converged && /reach/.test(far.reason));
  ok('ik inverse not square', RM.ikSolve(RM.template('sevenR'), RM.homeQ(RM.template('sevenR')).map(v => v + 0.2), { p: [0.4, 0.1, 0.5], R: t.R }, { method: 'inverse' }).status === 'not-square'); }
/* dynamics: symmetric positive-definite M, gravity = dU/dq, energy conservation */
{ const q = [0.3, 0.5, -0.4]; const Mq = RM.massMatrix(art, q); ok('M symmetric', near(Mq[0][1], Mq[1][0], 1e-12) && near(Mq[1][2], Mq[2][1], 1e-12)); ok('M pos def', RM.symEig(Mq).values.every(v => v > 0));
  const U = x => { const { T } = RM.fk(art, x); return RM.bodies(art, T).reduce((s, b) => s + b.m * RM.g0 * b.p[2], 0); }; const G = RM.gravityVec(art, q), h = 1e-6; let e = 0; for (let k = 0; k < 3; k++) { const a = q.slice(), b = q.slice(); a[k] += h; b[k] -= h; e = Math.max(e, Math.abs((U(a) - U(b)) / (2 * h) - G[k])); } ok('G = dU/dq', e < 1e-5);
  const r = JSON.parse(JSON.stringify(art)); r.joints.forEach(j => { j.damping = 0; j.friction = 0; }); let x = q.slice(), v = [0, 0, 0]; const K = () => { const m = RM.massMatrix(r, x); const mv = M.mat.mulVec(m, v); return 0.5 * v.reduce((s, y, i) => s + y * mv[i], 0); }; const E0 = U(x); const dt = 5e-4;
  for (let i = 0; i < 1500; i++) { const k1 = RM.fwdDyn(r, x, v, [0, 0, 0]).qdd; const xm = x.map((y, j) => y + dt / 2 * v[j]), vm = v.map((y, j) => y + dt / 2 * k1[j]); const k2 = RM.fwdDyn(r, xm, vm, [0, 0, 0]).qdd; x = x.map((y, j) => y + dt * vm[j]); v = v.map((y, j) => y + dt * k2[j]); } ok('energy conserved in free fall', Math.abs(U(x) + K() - E0) < 1e-3 * Math.abs(E0));
  const d = RM.invDyn(art, q, [0.4, -0.2, 0.3], [1, 0.5, -1]); const f = RM.fwdDyn(art, q, [0.4, -0.2, 0.3], d.tau); ok('inverse/forward dynamics consistent', Math.max(...f.qdd.map((y, i) => Math.abs(y - [1, 0.5, -1][i]))) < 1e-8); ok('planar arm in horizontal plane: no gravity torque', RM.gravityVec(p2, [0.3, 0.4]).every(g => Math.abs(g) < 1e-12)); }
/* linear algebra */
ok('symEig', near(RM.symEig([[2, 0], [0, 3]]).values[0], 3)); ok('svd', near(RM.singularValues([[3, 0], [0, 4], [0, 0]])[0], 4) && near(RM.singularValues([[3, 0], [0, 4], [0, 0]])[1], 3));
{ const e = RM.eigGeneral([[0, -1], [1, 0]]); ok('complex eig', near(e[0].re, 0) && near(Math.abs(e[0].im), 1)); const g = RM.eigGeneral([[4, 1, 2, 0], [1, 3, 0, 1], [2, 0, 5, 1], [0, 1, 1, 2]]), s = RM.symEig([[4, 1, 2, 0], [1, 3, 0, 1], [2, 0, 5, 1], [0, 1, 1, 2]]).values; ok('QR eig = Jacobi eig', g.every((y, i) => near(y.re, s[i], 1e-6))); }
{ const J = [[-0.15, -0.15], [0.7598, 0.2598]]; ok('2R manipulability = l1 l2 |sin q2|', near(RM.manipulability(RM.jacTip(p2, [0.3, Math.PI / 2], 0).slice(0, 2)).w, 0.15, 1e-9)); }
/* trajectories and metrics */
{ const r = RM.jointTraj('quintic', [0], [1], 2, 1); ok('quintic midpoint', near(r.q[0], 0.5) && near(r.qd[0], 1.875 / 2)); const c = RM.jointTraj('cubic', [0], [1], 2, 1); ok('cubic peak 1.5D/tf', near(c.qd[0], 0.75));
  const m = RM.metrics([1, 2, 3], [1, 2, 5]); ok('rmse', near(m.rmse, Math.sqrt(4 / 3)) && near(m.max, 2)); const t = [], y = []; for (let i = 0; i <= 2000; i++) { t.push(i * 0.005); y.push(1 - Math.exp(-i * 0.005)); } const s = RM.stepInfo(t, y, 1); ok('first-order rise time 2.2 tau', near(s.rise, 2.197, 0.02) && s.overshoot === 0); }
/* motor and gripper relations used in the practicals */
{ const j = six.joints[1]; const ms = RM.motorState(j, 64, 0); ok('motor current = tau/(N eta Kt)', near(ms.i, 64 / (100 * 0.8 * 0.21), 1e-9)); ok('link mass from density', near(RM.linkMass(RM.newJoint('R', { hasLink: true, a: 0.5, w: 0.06 })), 2700 * (0.06 ** 2 - 0.042 ** 2) * 0.5, 1e-9)); }
/* content checks: 18 practicals, exactly five MCQs each with one valid answer */
{ global.window = global; require('../js/data/z-labs.js'); const L = global.RIL.labs; ok('18 practicals', L.length === 18); ok('5 MCQs each', L.every(l => l.mcqs.length === 5 && l.mcqs.every(q => q.o.length === 4 && q.a >= 0 && q.a < 4 && q.x && /^CO[1-6]$/.test(q.co)))); ok('every CO assessed', ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].every(c => L.some(l => l.cos.includes(c)))); ok('MCQ order', L.every(l => l.mcqs.map(q => q.t).join() === 'Theory,Mathematical,Simulation,Numerical,Analysis')); }
console.log(`${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0;
