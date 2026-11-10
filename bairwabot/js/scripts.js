/* BAIRWABOT – scripts.js
   Step runner (state-based sequencing), reusable behaviour primitives, the direct
   command actions and the 30 module simulations + their interactive experiments.
   Every module drives the SAME robot rig through BB.motion. */
(function () {
  'use strict';
  const T = THREE, BB = window.BB, D2R = Math.PI / 180;
  const V3 = (x, y, z) => new T.Vector3(x, y, z);

  BB.initScripts = function () {
    const M = BB.motion, W = BB.world, R = BB.robot, V = BB.Voice, UI = BB.UI, P = BB.POSES, U = BB.util;

    /* ================= runner ================= */
    const Runner = (BB.Runner = {
      q: [], cur: null, active: false, onIdle: null,
      run(steps) { this.clear(); this.q = steps.slice(); this.active = true; },
      clear() { this.q = []; this.cur = null; this.active = false; },
      update(dt) {
        for (let g = 0; g < 30; g++) {
          if (!this.cur) { if (!this.q.length) { if (this.active) { this.active = false; if (this.onIdle) this.onIdle(); } return; } this.cur = this.q.shift(); if (this.cur.start) this.cur.start(); }
          if (this.cur.update(dt)) { this.cur = null; dt = 0; } else return;
        }
      }
    });

    /* ================= step primitives ================= */
    const S = (BB.S = {
      say: (text, o) => ({ start() { V.say(text, { keep: true }); }, update() { return (o && o.bg) || !V.busy(); } }),
      waitSay: () => ({ update() { return !V.busy(); } }),
      wait: (d) => { let t = 0; return { update(dt) { t += dt; return t >= d; } }; },
      cap: (text) => ({ update() { UI.phase(text); return true; } }),
      do: (fn) => ({ update() { fn(); return true; } }),
      label: (t) => S.do(() => (M.label = t)),
      pose: (p, d, label) => { let t = 0; return { start() { M.pose = typeof p === 'string' ? P[p] : p; if (label != null) M.label = label; }, update(dt) { t += dt; return t >= (d == null ? 1 : d); } }; },
      gait: (g, d, o) => { let t = 0; return { start() { M.setGait(g, o); M.yawRate = 0; }, update(dt) { t += dt; if (t >= d) { M.stopGait(); return true; } return false; } }; },
      settle: () => { let t = 0; return { update(dt) { t += dt; return !M.gait || t > 2.5; } }; },
      walkTo: (x, z, o) => {
        o = o || {}; let t = 0;
        return {
          update(dt) {
            t += dt; const tg = typeof x === 'function' ? x() : { x, z }, dx = tg.x - M.root.x, dz = tg.z - M.root.z, d = Math.hypot(dx, dz);
            if (d < (o.tol || 0.12) || t > 45) { M.stopGait(); return true; }
            const err = U.wrap(Math.atan2(dx, dz) - M.root.yaw);
            if (Math.abs(err) > 0.8) { M.setGait('turn'); M.yawRate = Math.sign(err) * 1.15; }
            else { M.setGait(o.gait || 'walk', { amp: (d < 0.45 ? 0.55 : 1) * (o.amp || 1) }); M.yawRate = U.clamp(3 * err, -1.3, 1.3); }
            return false;
          }
        };
      },
      turnTo: (yaw) => {            // yaw in radians or function
        let t = 0;
        return { update(dt) { t += dt; const tg = typeof yaw === 'function' ? yaw() : yaw, err = U.wrap(tg - M.root.yaw); if (Math.abs(err) < 0.035 || t > 12) { M.root.yaw = t > 12 ? M.root.yaw : tg; M.stopGait(); return true; } M.setGait('turn'); M.yawRate = Math.sign(err) * U.clamp(Math.abs(err) * 4, 0.3, 1.2); return false; } };
      },
      face: (x, z) => S.turnTo(() => Math.atan2((typeof x === 'function' ? x().x : x) - M.root.x, (typeof x === 'function' ? x().z : z) - M.root.z)),
      reach: (sd, fn, d, o) => {
        o = o || {}; let t = 0; const from = V3(), cur = V3();
        return { start() { M.gripPos(sd, from); cur.copy(from); M.ik[sd] = { target: cur, torso: o.torso !== false }; }, update(dt) { t += dt; const e = U.smooth(t / (d || 1.2)); cur.lerpVectors(from, fn(), e); cur.y += (o.arc || 0) * Math.sin(Math.PI * e); return t >= (d || 1.2); } };
      },
      track: (sd, fn, torso) => S.do(() => (M.ik[sd] = { target: fn().clone(), fn, torso: torso !== false })),
      release: (sd) => S.do(() => { if (sd) M.ik[sd] = null; else M.ik.L = M.ik.R = null; }),
      grip: (sd, name) => S.do(() => (M.grip[sd] = name)),
      attach: (obj, sd) => S.do(() => R.nodes['grip' + sd].attach(obj)),
      detach: (obj, posFn) => S.do(() => { W.props.attach(obj); if (posFn) obj.position.copy(posFn()); obj.rotation.set(0, 0, 0); }),
      expr: (n) => S.do(() => R.face.set(n)),
      look: (t) => S.do(() => (M.look = t)),
      fx: (fn, d) => { let t = 0; return { start() { M.addOverlay(fn); }, update(dt) { t += dt; if (t >= d) { M.removeOverlay(fn); return true; } return false; } }; },
      until: (fn, max) => { let t = 0; return { update(dt) { t += dt; return fn(dt, t) || t > (max || 60); } }; },
      extra: (k, v) => S.do(() => UI.extra(k, typeof v === 'function' ? v() : v))
    });
    const wpos = (o) => o.getWorldPosition(V3());
    const fmt = (v) => '(' + v.x.toFixed(2) + ', ' + v.y.toFixed(2) + ', ' + v.z.toFixed(2) + ') m';

    /* ================= composite behaviours ================= */
    const B = (BB.B = {});
    B.pick = (sd, obj, grip, o) => {
      o = o || {}; const lift = V3();
      return [S.grip(sd, 'open'), S.look(() => wpos(obj)), S.reach(sd, () => wpos(obj).add(V3(0, 0.1, 0)), o.d || 1.3, { arc: 0.03 }), S.reach(sd, () => wpos(obj), 0.6),
      S.grip(sd, grip || 'cylindrical'), S.wait(0.45), S.attach(obj, sd), S.do(() => lift.copy(M.gripPos(sd)).add(V3(0, o.lift || 0.14, 0))), S.reach(sd, () => lift, 0.7)];
    };
    B.place = (sd, obj, posFn) => [S.reach(sd, () => posFn().clone().add(V3(0, 0.1, 0)), 1.3, { arc: 0.05 }), S.reach(sd, posFn, 0.6), S.grip(sd, 'open'), S.wait(0.3), S.detach(obj, posFn),
    S.reach(sd, () => posFn().clone().add(V3(0, 0.12, -0.02)), 0.5), S.release(sd), S.grip(sd, 'relaxed'), S.look(null)];
    B.holdOne = (sd) => [S.release(sd), S.do(() => { M.pose = sd === 'R' ? { RShPitch: 28, RElbow: 82, RShRoll: 6 } : { LShPitch: 28, LElbow: 82, LShRoll: 6 }; })];
    B.handover = (sd, obj, H) => {
      const hp = V3();
      return [S.do(() => { const h = H.pos(); const dx = M.root.x - h.x, dz = M.root.z - h.z, d = Math.hypot(dx, dz) || 1; hp.set(h.x + dx / d * 0.4, 1.05, h.z + dz / d * 0.4); H.setHand(hp); }),
      S.look(() => V3(H.pos().x, 1.55, H.pos().z)), S.do(() => (M.pose = {})), S.reach(sd, () => hp, 1.3), S.wait(0.4), S.grip(sd, 'open'),
      S.do(() => { W.props.attach(obj); W.updaters.push(() => obj.position.copy(H.handP).add(V3(0, obj.userData.h * 0.3, 0))); const h = H.pos(); H.setHand(V3(h.x + (hp.x - h.x) * 0.55, 1.08, h.z + (hp.z - h.z) * 0.55)); }),
      S.wait(0.5), S.release(sd), S.grip(sd, 'relaxed'), S.look(null)];
    };
    B.floorPick = (sd, obj) => [S.pose('crouch', 1.7, 'Reaching'), ...B.pick(sd, obj, 'pinch', { lift: 0.08, d: 1.1 }), ...B.holdOne(sd), S.wait(1.3)];
    B.carryPick = (obj) => {      // two-handed pick from a table in front of the robot
      const side = (s) => () => obj.localToWorld(V3(s * 0.15, 0, 0));
      return [S.grip('L', 'open'), S.grip('R', 'open'), S.look(() => wpos(obj)), S.reach('L', side(1), 1.4), S.reach('R', side(-1), 1.2), S.grip('L', 'spherical'), S.grip('R', 'spherical'), S.wait(0.4),
      S.do(() => { R.nodes.torso.attach(obj); M.ik.L = { target: side(1)(), fn: side(1), torso: false }; M.ik.R = { target: side(-1)(), fn: side(-1), torso: false }; M.label = 'Carrying'; }),
      S.until((dt) => { obj.position.lerp(V3(0, 0.2, 0.3), Math.min(1, dt * 2.5)); obj.quaternion.slerp(new T.Quaternion(), Math.min(1, dt * 3)); return obj.position.distanceTo(V3(0, 0.2, 0.3)) < 0.01; }, 3), S.look(null)];
    };
    B.carryRelease = (obj, posFn, after) => [S.until((dt) => { obj.position.lerp(V3(0, 0.12, 0.44), Math.min(1, dt * 2.5)); return obj.position.z > 0.43; }, 3), S.wait(0.3),
    S.do(() => { W.props.attach(obj); obj.rotation.set(0, 0, 0); if (posFn) obj.position.copy(posFn()); if (after) after(); }), S.grip('L', 'open'), S.grip('R', 'open'), S.wait(0.3), S.release(), S.grip('L', 'relaxed'), S.grip('R', 'relaxed'), S.label('')];
    B.follow = (H, getSafe, dur, cb) => S.until((dt, t) => {       // robot follows a human at a safe distance
      const h = H.pos(), dx = h.x - M.root.x, dz = h.z - M.root.z, d = Math.hypot(dx, dz), safe = getSafe(), err = U.wrap(Math.atan2(dx, dz) - M.root.yaw);
      UI.extra('Distance to person', d.toFixed(2) + ' m'); UI.extra('Safe distance set-point', safe.toFixed(2) + ' m');
      if (d > safe + 0.2) { if (Math.abs(err) > 0.9) { M.setGait('turn'); M.yawRate = Math.sign(err) * 1.15; UI.phase('Turning towards the person'); } else { M.setGait('walk', { amp: U.clamp((d - safe) * 1.6, 0.45, 1) }); M.yawRate = U.clamp(3 * err, -1.3, 1.3); UI.phase('Following – target tracked'); } }
      else if (Math.abs(err) > 0.45) { M.setGait('turn'); M.yawRate = Math.sign(err) * 0.9; UI.phase('Turning to keep the person in view'); }
      else { M.stopGait(); UI.phase(d < safe - 0.15 ? 'Too close – waiting' : 'Stopped – safe distance maintained'); }
      if (cb) cb(dt, t); return t > dur;
    }, dur + 1);
    const wave = (p, t) => { p.RShRoll = 100; p.RShYaw = 90; p.RElbow = 82 + 26 * Math.sin(t * 9); p.RShPitch = 12; p.RWrYaw = 12 * Math.sin(t * 9); p.torsoRoll = 3; M.grip.R = 'open'; };
    const dance = (p, t) => {
      const b = t * Math.PI * 2 * 1.05, sec = Math.floor(t / 4) % 3, k = 20 + 15 * Math.sin(2 * b), sw = 5 * Math.sin(b);
      p.LKnee = p.RKnee = k; p.LHipPitch = p.RHipPitch = k * 0.5; p.rootRoll = sw; p.LHipRoll = -sw; p.RHipRoll = sw; p.torsoRoll = -sw * 0.8;
      p.neckYaw = 22 * Math.sin(b); p.neckRoll = 9 * Math.sin(2 * b); p.torsoYaw = 16 * Math.sin(b); p.LAnkAdd = 4 * Math.sin(2 * b); p.RAnkAdd = 4 * Math.sin(2 * b);
      if (sec === 0) { p.LShPitch = 125 + 35 * Math.sin(b); p.RShPitch = 125 - 35 * Math.sin(b); p.LShRoll = p.RShRoll = 28; p.LElbow = 45 + 30 * Math.sin(2 * b); p.RElbow = 45 - 30 * Math.sin(2 * b); p.LWrRoll = 45 * Math.sin(4 * b); p.RWrRoll = -45 * Math.sin(4 * b); }
      else if (sec === 1) { p.LShRoll = p.RShRoll = 88; p.LShYaw = 60 * Math.sin(b); p.RShYaw = -60 * Math.sin(b); p.LElbow = p.RElbow = 88; p.LWrPitch = 30 * Math.sin(2 * b); p.RWrPitch = -30 * Math.sin(2 * b); p.torsoYaw = 28 * Math.sin(b); }
      else { const u = Math.sin(b) > 0; p.RShPitch = u ? 155 : 20; p.RShRoll = u ? 30 : 12; p.LShPitch = u ? 20 : 155; p.LShRoll = u ? 12 : 30; p.LElbow = p.RElbow = 20; p.LHipYaw = 10 * Math.sin(b); p.RHipYaw = -10 * Math.sin(b); M.grip.R = u ? 'point' : 'relaxed'; M.grip.L = u ? 'relaxed' : 'point'; }
    };
    B.wave = wave; B.dance = dance;
    const sweepDof = (name, d) => { const df = R.dofs[name]; let t = 0; return { start() { t = 0; }, update(dt) { t += dt; const mid = U.clamp(0, df.min, df.max), amp = Math.min(df.max - mid, mid - df.min > 5 ? mid - df.min : 1e9, 45) * 0.9, a = Math.min(amp, df.max - mid); M.manual[name] = mid + (mid - df.min < 5 ? a * (0.5 - 0.5 * Math.cos(t / d * 2 * Math.PI)) : a * Math.sin(t / d * 2 * Math.PI)); if (t >= d) { delete M.manual[name]; return true; } return false; } }; };
    B.sweepDof = sweepDof;

    /* ================= direct command actions (control panel + voice) ================= */
    const A = (BB.Actions = {});
    const fresh = () => { Runner.clear(); M.overlays = []; M.ik.L = M.ik.R = null; M.yawRate = 0; M.K = 9; };
    const isSitting = () => M.pose === P.sit;
    A.stop = () => { fresh(); M.stopGait(); if (!isSitting()) M.pose = {}; M.label = ''; M.look = null; UI.phase('Stopped'); };
    A.stand = () => { const sit = isSitting(); fresh(); M.stopGait(); Runner.run([...(sit ? [S.pose('sitPrep', 0.9, 'Standing up')] : []), S.pose({}, 1.1, ''), S.cap('Standing')]); };
    A.sit = () => {
      fresh(); M.stopGait();
      Runner.run([S.settle(), S.do(() => { if (W.env !== 'chair') { if (W.E.stool) W.props.remove(W.E.stool); const p = M.local(-0.44, 0); W.E.stool = W.cyl(0.2, 0.425, 0x1e3a5f, p.x, 0.2125, p.z); } }), S.cap('Sitting down'), S.pose('sitPrep', 1.0, 'Sitting'), S.pose('sit', 1.3, 'Sitting')]);
    };
    const freeLegs = () => { if (isSitting()) M.pose = {}; };
    A.walkFwd = () => { fresh(); freeLegs(); M.pose = {}; M.setGait('walk'); UI.phase('Walking forward'); };
    A.walkBack = () => { fresh(); freeLegs(); M.pose = {}; M.setGait('walk', { dir: -1, amp: 0.8 }); UI.phase('Walking backward'); };
    A.run = () => { fresh(); freeLegs(); M.pose = {}; M.setGait('run'); UI.phase('Running'); };
    A.turnL = () => { fresh(); freeLegs(); M.pose = {}; const y = M.root.yaw + Math.PI / 2; Runner.run([S.cap('Turning left 90°'), S.turnTo(y), S.cap('Turn complete')]); };
    A.turnR = () => { fresh(); freeLegs(); M.pose = {}; const y = M.root.yaw - Math.PI / 2; Runner.run([S.cap('Turning right 90°'), S.turnTo(y), S.cap('Turn complete')]); };
    A.raiseR = () => { fresh(); M.pose = Object.assign({}, isSitting() ? P.sit : {}, P.raiseR); UI.phase('Right hand raised'); };
    A.raiseL = () => { fresh(); M.pose = Object.assign({}, isSitting() ? P.sit : {}, P.raiseL); UI.phase('Left hand raised'); };
    A.wave = () => { fresh(); Runner.run([S.cap('Waving'), S.label('Waving'), S.look('camera'), S.fx(wave, 4), S.label(''), S.grip('R', 'relaxed'), S.look(null)]); };
    A.greet = () => { R.face.set('happy'); A.wave(); };
    A.dance = () => { fresh(); M.stopGait(); M.pose = {}; Runner.run([S.cap('Dancing'), S.label('Dancing'), S.expr('excitement'), S.fx(dance, 14), S.label(''), S.expr('neutral'), S.grip('L', 'relaxed'), S.grip('R', 'relaxed')]); };
    A.bend = () => { fresh(); M.stopGait(); Runner.run([S.cap('Bending forward'), S.pose('bendFwd', 2.2, 'Bending'), S.pose({}, 1.3, '')]); };
    A.squat = () => { fresh(); M.stopGait(); Runner.run([S.cap('Squatting'), S.pose('squat', 2.4, 'Squatting'), S.pose({}, 1.4, '')]); };
    A.pick = () => {
      fresh(); M.stopGait(); M.pose = {};
      Runner.run([S.settle(), S.do(() => { if (W.E.cmdCube && W.E.cmdCube.parent !== W.props) return; if (W.E.ped) { W.props.remove(W.E.ped); W.props.remove(W.E.cmdCube); } const p = M.local(0.42, -0.21); W.E.ped = W.cyl(0.09, 0.9, 0x243b5e, p.x, 0.45, p.z); W.E.cmdCube = W.item('cube', p.x, 0.9, p.z); W.E.pedTop = V3(p.x, 0.935, p.z); }),
      S.cap('Pick: reach → grasp → lift'), S.label('Grasping'), S.until(() => true), ...[0].flatMap(() => []),
      { update() { if (W.E.cmdCube.parent === W.props) Runner.q.unshift(...B.pick('R', W.E.cmdCube, 'precision'), ...B.holdOne('R'), S.label('')); return true; } }]);
    };
    A.place = () => { fresh(); if (!W.E.cmdCube || W.E.cmdCube.parent === W.props) { UI.phase('Nothing in hand – use Pick Object first'); return; } Runner.run([S.cap('Place: move → lower → release'), S.label('Reaching'), ...B.place('R', W.E.cmdCube, () => W.E.pedTop), S.pose({}, 0.5, '')]); };
    A.speak = () => { V.say(BB.Brain.greeting()); };
    A.listen = () => { V.listen(); };
    A.reset = () => { BB.Lab.reset(); };
    A.body = () => { fresh(); M.pose = P.present; setTimeout(() => { if (M.pose === P.present) M.pose = {}; }, 9000); };

    /* ================= module setups ================= */
    const SETUP = (BB.SETUP = {
      1: { env: 'lab', view: 'iso' }, 2: { env: 'lab', start: [0, -2.4, 0], view: 'wide' }, 3: { env: 'lab', start: [0, -3, 0], view: 'wide' }, 4: { env: 'chair', start: [0, -1.4, 0], view: 'side' },
      5: { env: 'lab', view: 'hands' }, 6: { env: 'ground', view: 'iso', bal: 1 }, 7: { env: 'stairs', start: [0, -2.1, 0], view: 'wide' }, 8: { env: 'lab', view: 'iso' },
      9: { env: 'lab', view: 'head' }, 10: { env: 'lab', view: 'iso' }, 11: { env: 'lab', view: 'head' }, 12: { env: 'lab', view: 'iso' }, 13: { env: 'lab', view: 'iso' },
      14: { env: 'handshake', view: 'side' }, 15: { env: 'follow', view: 'wide' }, 16: { env: 'table', view: 'iso' }, 17: { env: 'table', view: 'iso' }, 18: { env: 'obstacles', start: [0, -3.6, 0], view: 'wide' },
      19: { env: 'nav', start: [-2.4, -2.2, 0], view: 'wide' }, 20: { env: 'parcel', view: 'wide' }, 21: { env: 'door', start: [-0.1, -0.9, 0], view: 'wide' }, 22: { env: 'desk', view: 'iso' },
      23: { env: 'lab', view: 'iso', bal: 1 }, 24: { env: 'lab', view: 'wide', bal: 1 }, 25: { env: 'lab', view: 'iso', xray: 1 }, 26: { env: 'lab', view: 'hands' }, 27: { env: 'lab', view: 'iso', joints: 1 },
      28: { env: 'care', view: 'wide' }, 29: { env: 'teach', view: 'iso' }, 30: { env: 'hospital', start: [0, -4.4, 0], view: 'wide' }
    });
    const narr = (id) => BB.MODULES[id - 1].narr;

    /* ---------- helpers used by several modules ---------- */
    function astar(a, b, walls) {
      const N = 26, c0 = -3.25, cs = 0.25, idx = (v) => U.clamp(Math.round((v - c0) / cs), 0, N - 1), pos = (i) => c0 + i * cs;
      const blocked = (i, j) => { const x = pos(i), z = pos(j); if (Math.abs(x) > 2.75 || Math.abs(z) > 2.75) return true; for (const w of walls) { const dx = w[2] - w[0], dz = w[3] - w[1], t = U.clamp(((x - w[0]) * dx + (z - w[1]) * dz) / (dx * dx + dz * dz), 0, 1); if (Math.hypot(x - w[0] - t * dx, z - w[1] - t * dz) < 0.46) return true; } return false; };
      const grid = []; for (let i = 0; i < N; i++) { grid.push([]); for (let j = 0; j < N; j++) grid[i].push(blocked(i, j)); }
      const s = [idx(a.x), idx(a.z)], g = [idx(b.x), idx(b.z)]; grid[s[0]][s[1]] = false;
      if (grid[g[0]][g[1]]) return null;
      const key = (p) => p[0] * N + p[1], open = [s], came = {}, gs = { [key(s)]: 0 }, h = (p) => Math.hypot(p[0] - g[0], p[1] - g[1]); let explored = 0;
      while (open.length) {
        let bi = 0; for (let i = 1; i < open.length; i++) if (gs[key(open[i])] + h(open[i]) < gs[key(open[bi])] + h(open[bi])) bi = i;
        const c = open.splice(bi, 1)[0]; explored++;
        if (c[0] === g[0] && c[1] === g[1]) { const path = [c]; let k = key(c); while (came[k]) { path.unshift(came[k]); k = key(came[k]); } const pts = path.map(p => V3(pos(p[0]), 0, pos(p[1]))); const out = [pts[0]]; for (let i = 1; i < pts.length - 1; i++) { const d1 = pts[i].clone().sub(pts[i - 1]).normalize(), d2 = pts[i + 1].clone().sub(pts[i]).normalize(); if (d1.dot(d2) < 0.999) out.push(pts[i]); } out.push(V3(b.x, 0, b.z)); out.explored = explored; return out; }
        for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
          if (!di && !dj) continue; const n = [c[0] + di, c[1] + dj]; if (n[0] < 0 || n[1] < 0 || n[0] >= N || n[1] >= N || grid[n[0]][n[1]]) continue; if (di && dj && (grid[c[0] + di][c[1]] || grid[c[0]][c[1] + dj])) continue;
          const ng = gs[key(c)] + Math.hypot(di, dj); if (gs[key(n)] == null || ng < gs[key(n)]) { gs[key(n)] = ng; came[key(n)] = c; if (!open.some(o => o[0] === n[0] && o[1] === n[1])) open.push(n); }
        }
      }
      return null;
    }
    B.navTo = (goal) => {
      const E = W.E, path = astar(V3(M.root.x, 0, M.root.z), goal, E.walls);
      if (E.pathLine) W.props.remove(E.pathLine);
      if (!path) return [S.cap('Goal is inside an obstacle – no path'), S.expr('confusion'), S.say('That goal is blocked. Please choose a free cell.')];
      E.pathLine = W.line(path.map(p => V3(p.x, 0.03, p.z)), 0xfacc15); E.goalRing.position.set(goal.x, 0.012, goal.z);
      let len = 0; for (let i = 1; i < path.length; i++) len += path[i].distanceTo(path[i - 1]);
      UI.extra('Planner', 'A* on 0.25 m occupancy grid'); UI.extra('Path length', len.toFixed(2) + ' m'); UI.extra('Waypoints', String(path.length)); UI.extra('Cells expanded', String(path.explored));
      const st = [S.cap('Path planned – ' + path.length + ' waypoints'), S.label('Walking')];
      path.slice(1).forEach((p, i) => st.push(S.cap('Navigating to waypoint ' + (i + 1) + ' / ' + (path.length - 1)), S.walkTo(p.x, p.z, { tol: i === path.length - 2 ? 0.12 : 0.2 }), S.until(() => { UI.extra('Distance to goal', Math.hypot(goal.x - M.root.x, goal.z - M.root.z).toFixed(2) + ' m'); return true; })));
      st.push(S.settle(), S.label(''), S.cap('Goal reached'), S.expr('happy')); return st;
    };
    const avoid = () => S.until((dt, t) => {       // artificial potential field steering
      const E = W.E, gx = E.goal.x - M.root.x, gz = E.goal.z - M.root.z, gd = Math.hypot(gx, gz);
      if (gd < 0.2) { M.stopGait(); UI.phase('Goal reached safely'); return true; }
      let fx_ = gx / gd, fz_ = gz / gd, near = 1e9, no = null;
      for (const o of E.obs) { const dx = M.root.x - o[0], dz = M.root.z - o[1], d = Math.hypot(dx, dz), ds = Math.max(0.05, d - o[2] - 0.28); if (ds < near) { near = ds; no = o; } if (ds < 1.0) { const m = Math.min(3, 0.55 * (1 / ds - 1)); fx_ += (dx / d) * m; fz_ += (dz / d) * m; let tx = dz / d, tz = -dx / d; if (tx * gx + tz * gz < 0) { tx = -tx; tz = -tz; } fx_ += tx * m * 0.9; fz_ += tz * m * 0.9; } }
      const err = U.wrap(Math.atan2(fx_, fz_) - M.root.yaw);
      if (Math.abs(err) > 1.0) { M.setGait('turn'); M.yawRate = Math.sign(err) * 1.15; } else { M.setGait('walk', { amp: near < 0.5 ? 0.6 : 1 }); M.yawRate = U.clamp(3 * err, -1.3, 1.3); }
      UI.extra('Nearest obstacle distance', near.toFixed(2) + ' m'); UI.extra('Distance to goal', gd.toFixed(2) + ' m'); UI.extra('Steering command', (err / D2R).toFixed(0) + '°');
      UI.phase(near < 0.45 ? '⚠ Collision warning – adjusting path' : near < 1.0 ? 'Obstacle detected – steering away' : 'Path clear – heading to goal');
      if (no && E.ray) { W.setPts(E.ray, [V3(M.root.x, 0.9, M.root.z), V3(no[0], 0.9, no[1])]); E.ray.visible = near < 1.0; }
      return false;
    }, 60);
    const fallSeq = (dir) => {
      const d = { f: [{ rootPitch: 16, free: 1, LShPitch: 50, RShPitch: 50 }, 'prone'], b: [{ rootPitch: -13, free: 1, LShPitch: -30, RShPitch: -30 }, 'supine'], s: [{ rootRoll: 15, free: 1, LShRoll: 50 }, 'sideLie'] }[dir];
      const st = [S.do(() => (M.K = 9)), S.expr('surprise'), S.cap('Loss of balance – CoM leaves the support polygon'), S.pose(d[0], 0.45, 'Balancing'), S.do(() => (M.K = 6)), S.cap(({ f: 'Forward', b: 'Backward', s: 'Sideways' })[dir] + ' fall – arms brace for impact'), S.pose(d[1], 1.5, 'Recovering'),
      S.cap('FALL DETECTED – IMU tilt > 45°'), S.expr('sad'), S.wait(1.3), S.do(() => (M.K = 4.5)), S.expr('thinking'), S.cap('Recovery – re-orient the body')];
      if (dir === 's') st.push(S.pose('prone', 1.7));
      if (dir === 'b') st.push(S.pose('sitUp', 1.8), S.cap('Recovery – feet under the CoM'), S.pose('squat', 1.9));
      else st.push(S.pose('pushUp', 1.5), S.cap('Recovery – hands and knees'), S.pose('allFours', 1.6), S.pose('kneelBoth', 1.7), S.cap('Recovery – one foot forward'), S.pose('kneel', 1.6));
      st.push(S.cap('Return to standing'), S.pose({}, 1.9, ''), S.do(() => (M.K = 9)), S.expr('happy'), S.wait(0.6), S.expr('neutral'));
      return st;
    };
    B.fallSeq = fallSeq;
    const stairSteps = () => { const zs = [-1.75, -1.42, -1.11, -0.81, -0.51, -0.21, 0.09, 0.45, 0.8, 0.98, 1.29, 1.59, 1.89, 2.19, 2.49, 2.85, 2.85]; return zs.map((z, i) => ({ s: i % 2 ? 'R' : 'L', z, y: W.E.hAt(z) })); };
    const sensSeq = (keys) => { const st = []; for (const s of R.sensors) { if (keys && !keys.includes(s.key)) continue; st.push(S.do(() => { BB.Lab.showSensor(s.key); }), S.say(s.name + '. ' + s.fn)); } return st; };

    /* ================= the 30 module scripts ================= */
    const SC = (BB.SCRIPTS = {});
    SC[1] = () => [S.look('camera'), S.expr('happy'), S.cap('Standing upright – waving'), S.label('Waving'), S.say(narr(1), { bg: 1 }), S.fx(wave, 6), S.grip('R', 'relaxed'), S.label('Presenting'), S.pose('present', 3), S.pose('presentL', 3), S.pose({}, 0.5, ''), S.waitSay(), S.expr('neutral'), S.look(null)];
    SC[2] = () => [S.say(narr(2), { bg: 1 }), S.cap('Forward walking'), S.gait('walk', 5.5), S.settle(), S.cap('Stopped – double support'), S.wait(0.8), S.cap('Backward walking'), S.gait('walk', 4.5, { dir: -1, amp: 0.8 }), S.settle(), S.wait(0.6), S.cap('Sideways walking (to the left)'), S.gait('side', 4), S.settle(), S.cap('Sideways walking (to the right)'), S.gait('side', 4, { dir: -1 }), S.settle(), S.cap('Walking demonstration complete'), S.waitSay()];
    SC[3] = () => [S.say(narr(3), { bg: 1 }), S.cap('Walking start'), S.gait('walk', 2), S.cap('Acceleration – jogging'), S.gait('jog', 3.5), S.cap('Running – flight phase between steps'), S.gait('run', 5), S.cap('Deceleration'), S.gait('jog', 2.5, { amp: 0.8 }), S.gait('walk', 1.5, { amp: 0.7 }), S.settle(), S.cap('Stopped'), S.waitSay()];
    SC[4] = () => [S.say(narr(4), { bg: 1 }), S.cap('Approaching the chair'), S.walkTo(0, 0.42), S.cap('Turning – back towards the seat'), S.turnTo(Math.PI), S.settle(), S.cap('Bending torso, flexing hips and knees'), S.pose('sitPrep', 1.2, 'Sitting'), S.cap('Sitting – weight transferred to the seat'), S.pose('sit', 1.6), S.cap('Waiting (seated)'), S.wait(3), S.cap('Standing up – CoM moved over the feet'), S.pose('sitPrep', 1.1, 'Standing'), S.pose({}, 1.3, ''), S.cap('Standing'), S.waitSay()];
    const G5 = { wave: [null, 'open', 'Waving'], thumbsUp: [{ RShPitch: 45, RElbow: 78, RShRoll: 10 }, 'thumbsUp', 'Thumbs-up'], point: [{ RShPitch: 86, RElbow: 6, RShRoll: 4 }, 'point', 'Pointing'], openPalm: [{ RShPitch: 55, RElbow: 80, RForearm: -80, RShRoll: 8 }, 'open', 'Open palm'], victory: [{ RShPitch: 52, RElbow: 100, RShRoll: 22, RForearm: -80 }, 'victory', 'Victory sign'], handshake: [{ RShPitch: 42, RElbow: 48 }, 'shake', 'Handshake gesture'] };
    B.gesture = (k) => k === 'wave' ? [S.cap('Waving'), S.fx(wave, 3.2), S.grip('R', 'relaxed')] : [S.cap(G5[k][2]), S.grip('R', G5[k][1]), S.pose(G5[k][0], 2.3)];
    B.count = () => [S.cap('Counting with fingers'), ...[1, 2, 3, 4, 5].flatMap(n => [S.grip('R', 'c' + n), S.cap('Counting: ' + n), S.pose({ RShPitch: 52, RElbow: 100, RShRoll: 18, RForearm: -80 }, 1.0)])];
    SC[5] = () => [S.look('camera'), S.say(narr(5), { bg: 1 }), ...Object.keys(G5).flatMap(k => B.gesture(k)), ...B.count(), S.grip('R', 'relaxed'), S.pose({}, 0.8), S.cap('Gestures complete'), S.waitSay(), S.look(null)];
    SC[6] = () => [S.say(narr(6), { bg: 1 }), S.cap('Forward bending – hips flex, CoM moves forward'), S.pose('bendFwd', 2.4, 'Bending'), S.pose({}, 1.5), S.cap('Backward bending – small range, CoM moves back'), S.pose('bendBack', 2.1), S.pose({}, 1.3), S.cap('Squatting – hip, knee and ankle flex together'), S.pose('squat', 2.6, 'Squatting'), S.pose({}, 1.6), S.cap('Kneeling – one knee to the ground'), S.pose('kneel', 2.6, 'Kneeling'), S.wait(1), S.pose({}, 1.9),
    S.cap('Picking an object from the ground'), ...B.floorPick('R', W.E.ball), S.pose({ RShPitch: 28, RElbow: 82 }, 1.6, ''), S.cap('Object retrieved'), S.waitSay()];
    SC[7] = () => [S.say(narr(7), { bg: 1 }), S.cap('Approaching the staircase'), S.label('Stair climbing'), S.do(() => M.startSteps(stairSteps(), 0.9)), S.until(() => !M.stepper, 40), S.label(''), S.cap('Stairs completed – level ground'), S.pose({}, 0.8), S.waitSay()];
    SC[8] = () => [S.say(narr(8)), S.expr('excitement'), S.cap('Dance: synchronized full-body motion'), S.label('Dancing'), S.fx(dance, 16), S.label(''), S.grip('L', 'relaxed'), S.grip('R', 'relaxed'), S.expr('happy'), S.cap('Dance complete'), S.wait(1), S.expr('neutral')];
    const talkGest = (p, t) => { p.neckYaw = 8 * Math.sin(t * 0.9); p.neckPitch = 4 * Math.sin(t * 1.7); p.neckRoll = 3 * Math.sin(t * 0.6); p.RShPitch = 25 + 8 * Math.sin(t * 1.3); p.RElbow = 60 + 15 * Math.sin(t * 2.1); p.RForearm = -60; p.LShPitch = 15; p.LElbow = 40 + 10 * Math.sin(t * 1.6 + 1); };
    SC[9] = () => { const f = M.addOverlay; return [S.look('camera'), S.do(() => M.addOverlay(talkGest)), S.label('Speaking'), S.cap('Text analysis → phonemes → prosody → waveform'), S.expr('smile'), S.say(narr(9)), S.expr('happy'), S.say('Notice my mouth opening and closing with every word, and the natural pauses between sentences.'), S.expr('thinking'), S.say('When I think, my eyes look away and one eyebrow rises.'), S.expr('excitement'), S.say('And when I am excited, my voice and my face show it!'), S.expr('neutral'), S.do(() => M.removeOverlay(talkGest)), S.label(''), S.cap('Type your own sentence in the experiment box'), S.look(null)]; };
    SC[10] = () => [S.look('camera'), S.do(() => UI.tab('talk')), S.cap('Voice command pipeline: listen → recognise → parse → act → respond'), S.say(narr(10)), S.cap('Press Start Listening or type a command'), S.look(null)];
    SC[11] = () => [S.look('camera'), S.say(narr(11), { bg: 1 }), ...['neutral', 'happy', 'sad', 'surprise', 'thinking', 'confusion', 'excitement', 'smile'].flatMap(e => [S.cap('Expression: ' + e), S.expr(e), S.wait(2)]), S.cap('Blinking'), S.do(() => R.face.blinkNow()), S.wait(0.5), S.do(() => R.face.blinkNow()), S.wait(0.6), S.expr('neutral'), S.cap('Eye tracking – move your pointer over the 3D view'), S.do(() => BB.Lab.eyeTrack(true)), S.waitSay()];
    SC[12] = () => [S.look('camera'), S.do(() => UI.tab('talk')), S.say(narr(12)), ...[['What is a humanoid robot?', 0], ['How many degrees of freedom do you have?', 1], ['What is an IMU?', 3]].flatMap(q => [S.do(() => { UI.chat('user', q[0]); R.face.set('thinking'); }), S.cap('Student asks: ' + q[0]), S.wait(0.9), S.expr('smile'), S.pose('present', 0.1), S.say(BB.Brain.KB[q[1]][1]), S.pose({}, 0.3)]), S.cap('Now ask your own question in the Talk panel'), S.say('Now it is your turn. Ask me a question by voice or by typing.'), S.look(null)];
    const pres = [['Mechanical architecture', null, 'My mechanical architecture follows the human body: a head, a torso, two arms, two hands, a pelvis and two legs, connected by rotary joints.'], ['Body frame', ['torso', 'pelvis'], 'My body frame is a lightweight aluminium and carbon composite structure. The chest frame, spine and pelvis carry all loads and protect the electronics.'], ['Joints', 'joints', 'Every joint is a compact rotary actuator module with bearings, a reducer, an encoder and a brake. Dark housings mark my joints.'], ['Degrees of freedom', null, 'I have forty six conceptual degrees of freedom: three in the neck, three in the torso, sixteen in the arms, twelve in the hands and twelve in the legs.'],
    ['Sensors', ['head'], 'My sensors include an RGB camera, a stereo depth camera, a microphone array, a LiDAR, inertial measurement units, joint encoders and force sensors in my wrists, ankles and soles.'], ['Actuators', ['legL', 'legR'], 'My actuators are brushless DC motors with harmonic reducers. The hips and knees use the largest units because they carry my body weight.'], ['Battery', ['electronics'], 'A lithium ion battery pack in my torso supplies a power distribution board, which feeds the motor drivers and the main computer. A battery management system protects the cells.'],
    ['Control architecture', ['electronics'], 'My control architecture has three layers: perception and planning, whole body motion control, and fast joint level servo loops.'], ['Applications', null, 'Humanoid robots like me are used in education, research, healthcare support, logistics, inspection and customer service.']];
    SC[13] = () => [S.look('camera'), S.label('Presenting'), S.say(narr(13)), ...pres.flatMap((p, i) => [S.cap('Presenting: ' + p[0]), S.do(() => { R.isolate(null); R.highlightJoints(p[1] === 'joints'); if (Array.isArray(p[1])) { R.isolate(p[1]); } M.pose = i % 2 ? P.presentL : P.present; }), S.say(p[2]), S.wait(0.3)]), S.do(() => { R.isolate(null); R.highlightJoints(false); }), S.pose({}, 0.5, ''), S.cap('Presentation complete'), S.look(null)];
    SC[14] = () => {
      const H = W.E.human, hp = V3(-0.02, 1.04, 0.5), ph = { t: 0 }; let bb;
      return [S.cap('Human detection'), S.do(() => { bb = W.addBBox(H.g, 'Person – detected (simulated)'); UI.extra('Person distance', Math.hypot(H.pos().x - M.root.x, H.pos().z - M.root.z).toFixed(2) + ' m'); }), S.wait(1), S.cap('Head orientation – looking at the person'), S.look(() => V3(H.pos().x, 1.6, H.pos().z)), S.expr('happy'), S.wait(1),
      S.cap('Arm extension'), S.do(() => H.setHand(hp)), S.grip('R', 'open'), S.label('Reaching'), S.reach('R', () => V3(hp.x - 0.035, hp.y, hp.z - 0.03), 1.4), S.cap('Palm positioning'), S.wait(0.4), S.cap('Hand gripping – force limited'), S.grip('R', 'shake'), S.extra('Grip force (simulated)', '12 N'), S.wait(0.5),
      S.cap('Handshake'), S.label('Grasping'), S.say('Hello! Nice to meet you. I am BAIRWABOT.', { bg: 1 }), S.do(() => { M.ik.R.fn = () => V3(hp.x - 0.035, hp.y + 0.035 * Math.sin(ph.t * 14), hp.z - 0.03); }), S.until((dt, t) => { ph.t = t; H.setHand(V3(hp.x, hp.y + 0.035 * Math.sin(t * 14), hp.z)); return t > 2.4; }), S.do(() => { M.ik.R.fn = null; }),
      S.cap('Releasing the hand'), S.grip('R', 'open'), S.extra('Grip force (simulated)', '0 N'), S.wait(0.5), S.release('R'), S.do(() => { H.setHand(null); if (bb) bb.remove(); }), S.grip('R', 'relaxed'), S.label(''), S.waitSay(), S.cap('Greeting complete'), S.look(null), S.expr('neutral')];
    };
    SC[15] = () => {
      const H = W.E.human, wp = [[0, 3.2], [2.6, 4.6], [4.2, 2], [2, -1.2], [-2, -0.4], [-2.6, 3]]; let i = 0, pause = 0, bb;
      return [S.say(narr(15), { bg: 1 }), S.cap('Person detection'), S.do(() => { bb = W.addBBox(H.g, 'Target person (simulated tracker)'); H.speed = 0.72; }), S.look(() => V3(H.pos().x, 1.5, H.pos().z)), S.wait(1.2),
      B.follow(H, () => BB.Lab.param.safe, 30, (dt) => { if (!BB.Lab.param.humanWalk) { H.target = null; return; } if (pause > 0) { pause -= dt; return; } if (!H.target) { const w = wp[i % wp.length]; H.target = V3(w[0], 0, w[1]); i++; if (i % 3 === 0) pause = 2.5; } }),
      S.do(() => { H.target = null; if (bb) bb.remove(); }), S.settle(), S.cap('Following demonstration complete'), S.look(null)];
    };
    B.pickPlace = (key) => {
      const E = W.E, obj = E.items[key], sd = obj.userData.home.x < 0.1 ? 'R' : 'L', s = sd === 'R' ? -1 : 1, dest = () => V3(s * 0.5, 0.89 + obj.userData.h, 0.16), onTable = obj.position.z > 0.3;
      const target = onTable ? dest : () => obj.userData.home.clone(); let bb;
      if (!E.trail) { E.trail = W.trail(0x22d3ee, 500); W.updaters.push(() => { if (M.ik.L || M.ik.R) E.trail.push(M.gripPos(M.ik.R ? 'R' : 'L')); }); }
      const grips = { bottle: 'cylindrical', cube: 'precision', ball: 'spherical', cup: 'cylindrical', book: 'pinch' };
      return [S.do(() => E.trail.clear()), S.cap('1 · Object identification'), S.do(() => { bb = W.addBBox(obj, obj.userData.label + ' (simulated detection)'); }), S.look(() => wpos(obj)), S.wait(0.9), S.cap('2 · Coordinate estimation'), S.extra('Object position (world)', () => fmt(wpos(obj))), S.extra('Selected arm', sd === 'R' ? 'Right' : 'Left'), S.extra('Grasp type', grips[key]), S.wait(0.8),
      S.cap('3–4 · Arm movement by inverse kinematics'), S.label('Reaching'), ...B.pick(sd, obj, grips[key]).map((st, i) => i === 4 ? [S.cap('5–6 · Finger closure and grasp'), st] : i === 7 ? [S.cap('7 · Lifting'), S.label('Grasping'), st] : [st]).flat(), S.do(() => bb && bb.remove()),
      S.cap('8 · Transportation'), S.label('Carrying'), ...B.place(sd, obj, target).map((st, i) => i === 1 ? [S.cap('9 · Placement'), st] : i === 2 ? [S.cap('10 · Releasing'), st] : [st]).flat(), S.label(''), S.extra('IK residual error', () => '< 2 mm (solver tolerance)'), S.cap('Pick-and-place complete'), S.expr('happy'), S.wait(0.6), S.expr('neutral')];
    };
    SC[16] = () => [S.say(narr(16), { bg: 1 }), ...B.pickPlace(BB.Lab.param.item || 'cube'), S.waitSay()];
    const CONF = { bottle: 0.97, cube: 0.95, ball: 0.93, cup: 0.96, book: 0.91 };
    B.detectAll = () => { const E = W.E, st = [], head = () => wpos(R.nodes.neck).add(V3(0, 0.18, 0)); for (const k in E.items) { const o = E.items[k]; st.push(S.cap('Detecting: ' + o.userData.label), S.look(() => wpos(o)), S.wait(0.7), S.do(() => { const d = head().distanceTo(wpos(o)); (E.boxes = E.boxes || []).push(W.addBBox(o, o.userData.label + ' ' + CONF[k].toFixed(2) + ' · ' + d.toFixed(2) + ' m')); UI.extra(o.userData.label, 'detected · conf ' + CONF[k].toFixed(2) + ' (sim) · ' + d.toFixed(2) + ' m'); }), S.wait(0.6)); } return st; };
    SC[17] = () => [S.do(() => { (W.E.boxes || []).forEach(b => b.remove()); W.E.boxes = []; }), S.say(narr(17), { bg: 1 }), S.cap('Camera frame acquired'), S.extra('Detection status', 'Running (simulated detector)'), ...B.detectAll(), S.look(null), S.extra('Detection status', '5 objects classified'), S.cap('All objects detected and classified'), S.waitSay(), S.say('I detected five objects: a bottle, a cube, a ball, a cup and a book. The confidence scores shown are simulated values.')];
    SC[18] = () => [S.say(narr(18), { bg: 1 }), S.cap('Scanning for obstacles'), S.label('Walking'), S.wait(0.8), avoid(), S.settle(), S.label(''), S.expr('happy'), S.waitSay(), S.expr('neutral')];
    SC[19] = () => [S.say(narr(19), { bg: 1 }), S.cap('Mapping → localization → path planning'), S.wait(0.8), ...B.navTo(W.E.goal.clone()), S.waitSay(), S.expr('neutral')];
    SC[20] = () => {
      const E = W.E, H = E.human;
      return [S.say(narr(20), { bg: 1 }), S.cap('Locating the parcel'), S.do(() => { E.bb = W.addBBox(E.parcel, 'Parcel (simulated detection)'); }), S.wait(0.8), S.cap('Two-handed grasp'), S.label('Reaching'), ...B.carryPick(E.parcel), S.do(() => E.bb.remove()), S.cap('Carrying – walking to the recipient'), S.walkTo(1.52, -1.8), S.face(() => H.pos()), S.settle(), S.label('Carrying'),
      S.cap('Delivering the parcel'), S.look(() => V3(H.pos().x, 1.55, H.pos().z)), S.do(() => H.setHand(V3(2.02, 1.12, -1.8))), ...B.carryRelease(E.parcel, null, () => { W.updaters.push(() => E.parcel.position.lerp(V3(2.12, 1.15, -1.8), 0.08)); }), S.expr('happy'), S.say('Here is your parcel. Have a nice day!'), S.look(null), S.cap('Delivery complete'), S.expr('neutral')];
    };
    SC[21] = () => {
      const E = W.E, ang = (a) => (E.hinge.rotation.y = a * D2R);
      return [S.say(narr(21), { bg: 1 }), S.cap('Approaching the door'), S.walkTo(-0.08, 0.92), S.turnTo(0), S.settle(), S.cap('Locating the handle'), S.do(() => { E.bb = W.addBBox(E.handle, 'Door handle (simulated detection)'); }), S.look(() => wpos(E.hA)), S.wait(1), S.cap('Reaching'), S.label('Reaching'), S.grip('R', 'open'), S.reach('R', () => wpos(E.hA), 1.4), S.cap('Grasping the handle'), S.grip('R', 'cylindrical'), S.wait(0.5), S.do(() => E.bb.remove()),
      S.cap('Rotating the handle'), S.until((dt, t) => { E.handle.rotation.z = -Math.min(1, t / 0.6) * 0.6; M.manual.RWrRoll = -Math.min(1, t / 0.6) * 35; return t > 0.7; }), S.cap('Pushing the door open'), S.track('R', () => wpos(E.hA)), S.until((dt, t) => { ang(Math.min(88, t * 40)); if (t > 0.75 && M.ik.R) { M.ik.R = null; M.grip.R = 'relaxed'; delete M.manual.RWrRoll; E.handle.rotation.z = 0; } return t > 2.3; }), S.label(''), S.look(null),
      S.cap('Passing through the doorway'), S.walkTo(-0.12, 2.8), S.cap('Turning to close the door'), S.turnTo(Math.PI), S.settle(), S.cap('Reaching for the door'), S.grip('R', 'open'), S.reach('R', () => wpos(E.hA), 1.4), S.grip('R', 'cylindrical'), S.wait(0.4), S.cap('Closing the door'), S.track('R', () => wpos(E.hA)), S.until((dt, t) => { ang(Math.max(0, 88 - t * 40)); if (t > 0.8 && M.ik.R) { M.ik.R = null; M.grip.R = 'relaxed'; } return t > 2.4; }), S.cap('Door closed'), S.expr('happy'), S.waitSay(), S.expr('neutral')];
    };
    B.desk = {
      switch: () => { const E = W.E; return [S.cap('Pressing a switch'), S.grip('R', 'point'), S.look(() => wpos(E.sw)), S.reach('R', () => V3(-0.44, 1.02, 0.36), 1.3), S.reach('R', () => V3(-0.44, 1.02, 0.4), 0.35), S.do(() => { E.on = !E.on; E.lamp.intensity = E.on ? 6 : 0; E.bulb.material.emissiveIntensity = E.on ? 2.5 : 0; E.swBtn.material.color.setHex(E.on ? 0x22c55e : 0x334155); UI.extra('Lamp', E.on ? 'ON' : 'OFF'); }), S.reach('R', () => V3(-0.42, 1.02, 0.33), 0.35), S.release('R'), S.grip('R', 'relaxed'), S.look(null), S.wait(0.6)]; },
      keyboard: () => { const E = W.E, word = 'HELLO'; let typed = ''; const key = (sd, x, i) => () => V3(x, 0.925, 0.44); const st = [S.cap('Operating a keyboard'), S.look(() => wpos(E.kb)), S.grip('L', 'point'), S.grip('R', 'point'), S.reach('R', () => V3(-0.07, 0.96, 0.44), 1.2), S.reach('L', () => V3(0.07, 0.96, 0.44), 1.0)]; word.split('').forEach((ch, i) => { const sd = i % 2 ? 'L' : 'R', x = (sd === 'R' ? -0.1 : 0.04) + (i * 0.017); st.push(S.reach(sd, () => V3(x, 0.915, 0.44), 0.22), S.do(() => { typed += ch; E.screen.set('Typed: ' + typed); }), S.reach(sd, () => V3(x, 0.96, 0.44), 0.22)); }); st.push(S.release(), S.grip('L', 'relaxed'), S.grip('R', 'relaxed'), S.look(null), S.wait(0.6)); return st; },
      phone: () => { const E = W.E; return [S.cap('Picking up a mobile phone'), ...B.pick('R', E.phone, 'pinch'), S.reach('R', () => V3(-0.16, 1.22, 0.34), 1.0), S.look(() => wpos(E.phone)), S.cap('Reading the phone screen'), S.wait(1.4), ...B.place('R', E.phone, () => E.phone.userData.home.clone())]; },
      cup: () => { const E = W.E; return [S.cap('Handling a cup'), ...B.pick('L', E.cup, 'cylindrical'), S.reach('L', () => V3(0.17, 1.2, 0.32), 1.0), S.wait(0.8), ...B.place('L', E.cup, () => E.cup.userData.home.clone())]; },
      tool: () => { const E = W.E; return [S.cap('Operating a simple tool (screwdriver)'), ...B.pick('L', E.tool, 'power', { lift: 0.03 }), S.cap('Wrist roll turns the screwdriver'), S.until((dt, t) => { M.manual.LWrRoll = 55 * Math.sin(t * 4); UI.extra('Wrist roll', M.manual.LWrRoll.toFixed(0) + '°'); return t > 3.1; }), S.do(() => delete M.manual.LWrRoll), ...B.place('L', E.tool, () => E.tool.userData.home.clone())]; }
    };
    SC[22] = () => [S.say(narr(22), { bg: 1 }), ...B.desk.switch(), ...B.desk.keyboard(), ...B.desk.phone(), ...B.desk.cup(), ...B.desk.tool(), S.cap('Everyday object operation complete'), S.waitSay()];
    B.push = (dir) => { let x = 0, v = (dir || 1) * 75, done = false; const fn = (p, t, dt) => { const a = -55 * x - 9 * v; v += a * dt; x += v * dt; p.rootPitch = (p.rootPitch || 0) + x; p.torsoPitch = (p.torsoPitch || 0) - 1.6 * x; p.LShPitch = p.RShPitch = -4 * x; p.LHipPitch = (p.LHipPitch || 0) + 0.6 * x; p.RHipPitch = (p.RHipPitch || 0) + 0.6 * x; }; return [S.cap('External push – ankle + hip strategy recovers balance'), S.expr('surprise'), S.label('Balancing'), S.fx(fn, 3), S.label(''), S.expr('neutral'), S.cap('Balance recovered')]; };
    SC[23] = () => [S.say(narr(23), { bg: 1 }), S.cap('Quiet standing – CoM above the support polygon'), S.label('Balancing'), S.wait(2.5), S.cap('Ankle strategy – leaning forward'), S.pose({ rootPitch: 6 }, 2.2), S.cap('Leaning backward'), S.pose({ rootPitch: -4.5 }, 2.2), S.cap('Lateral weight shift'), S.pose({ rootRoll: 5 }, 2), S.pose({ rootRoll: -5 }, 2.2), S.pose({}, 1.2), S.cap('Single support – polygon shrinks to one foot'), S.pose('oneLeg', 3.5), S.pose({}, 1.6), ...B.push(1), S.label(''), S.waitSay()];
    SC[24] = () => [S.say(narr(24)), ...fallSeq('f'), S.say('Forward fall recovered. Next, a backward fall.'), ...fallSeq('b'), S.say('Now a sideways fall.'), ...fallSeq('s'), S.cap('All fall recoveries complete'), S.say('I am back on my feet. Fall detection uses the tilt angle and angular rate from my inertial measurement unit.')];
    SC[25] = () => [S.say(narr(25)), ...sensSeq(), S.do(() => BB.Lab.showSensor(null)), S.cap('Select any sensor in the experiment list'), S.say('Select any sensor in the list to see its location, function and working principle.')];
    SC[26] = () => {
      const c = V3(), ball = () => { const E = W.E; if (!E.ikBall) { E.ikBall = new T.Mesh(new T.SphereGeometry(0.03, 16, 12), new T.MeshBasicMaterial({ color: 0xf43f5e })); W.props.add(E.ikBall); E.ikTrail = W.trail(0x22d3ee, 400); W.updaters.push(() => E.ikTrail.push(M.gripPos('R'))); } return E.ikBall; };
      return [S.say(narr(26), { bg: 1 }), S.do(() => { ball().visible = false; BB.Lab.fkik('fk'); }), S.cap('Forward kinematics – joint angles → end-effector position'), sweepDof('RShPitch', 3), sweepDof('RElbow', 2.6), sweepDof('RShRoll', 2.6),
      S.cap('Inverse kinematics – target position → joint angles'), S.do(() => { BB.Lab.fkik('ik'); ball().visible = true; W.E.ikTrail.clear(); }), S.track('R', () => ball().position, false),
      S.until((dt, t) => { c.copy(M.local(0.36, -0.26, 1.12)); ball().position.set(c.x + 0.13 * Math.cos(t * 1.6), c.y + 0.13 * Math.sin(t * 1.6), c.z); BB.Lab.param.ik = [0.36, -0.26, 1.12]; return t > 8; }), S.cap('Use the sliders to move joints (FK) or the target (IK)'), S.waitSay()];
    };
    SC[27] = () => [S.say(narr(27), { bg: 1 }), ...R.dofList.flatMap(d => [S.do(() => BB.Lab.selectDof(d.name, true)), S.cap('DOF ' + (R.dofList.indexOf(d) + 1) + ' / 46 · ' + d.label), sweepDof(d.name, 0.85)]), S.cap('All 46 conceptual DOF demonstrated'), S.waitSay(), S.say('That was all forty six of my conceptual degrees of freedom. Select any joint and move its slider.')];
    B.care = {
      water: () => { const E = W.E, H = E.human; return [S.cap('Request received: “Please bring my water bottle.”'), S.do(() => { E.rq = W.addLabel(() => V3(H.pos().x, 1.85, H.pos().z), '“Please bring my water bottle.”', 'speech'); }), S.expr('smile'), S.say('Certainly. I will bring your water bottle.'), S.do(() => E.rq.remove()), S.cap('Walking to the table'), S.walkTo(-1.29, 0.64), S.turnTo(0), S.settle(), S.cap('Grasping the bottle'), ...B.pick('R', E.bottle, 'cylindrical'), ...B.holdOne('R'), S.cap('Bringing the bottle'), S.walkTo(1.02, 1.0), S.face(() => H.pos()), S.settle(), S.cap('Handing over – waiting for the person to grasp'), ...B.handover('R', E.bottle, H), S.say('Here is your water.'), S.expr('happy')]; },
      fallen: () => { const E = W.E, H = E.human; return [S.cap('A dropped object is detected on the floor'), S.do(() => { E.kb = W.addBBox(E.keys, 'Keys on floor (simulated detection)'); }), S.say('I see that your keys have fallen. I will pick them up.'), S.walkTo(0.9, 0.2), S.turnTo(Math.PI / 2), S.settle(), S.do(() => E.kb.remove()), S.cap('Crouching and picking up the object'), ...B.floorPick('R', E.keys), S.do(() => { M.pose = { RShPitch: 28, RElbow: 82 }; }), S.wait(1.2), S.walkTo(1.02, 1.0), S.face(() => H.pos()), S.settle(), S.do(() => { W.updaters.length = 0; W.props.remove(E.bottle); }), ...B.handover('R', E.keys, H), S.say('Here are your keys.')]; },
      remind: () => [S.cap('Reminder service (simulated)'), S.expr('smile'), S.look('camera'), S.pose('present', 0.2), S.say('This is a reminder. It is time for your scheduled medicine. This is a simulated reminder service. Please follow the instructions of your doctor or caregiver.'), S.pose({}, 0.3), S.look(null)],
      guide: () => { const E = W.E, H = E.human; return [S.cap('Guiding the person'), S.say('Please follow me. I will walk slowly.'), S.do(() => { H.setHand(null); H.speed = 0.55; H.follow = () => { const b = M.local(-1.0, 0.25); return Math.hypot(b.x - H.pos().x, b.z - H.pos().z) > 0.15 ? b : null; }; }), S.walkTo(-0.4, -1.8, { amp: 0.7 }), S.settle(), S.wait(1.5), S.do(() => (H.follow = null)), S.face(() => H.pos()), S.settle(), S.say('We have arrived. Please tell me if you need any further assistance.'), S.cap('Guidance complete')]; }
    };
    SC[28] = () => [S.say(narr(28)), ...B.care.water(), ...B.care.fallen(), ...B.care.remind(), ...B.care.guide(), S.expr('neutral')];
    SC[29] = () => {
      const bd = W.E.board, Q = BB.MODULES[28].quiz, L = (t, l, s, pose) => [S.do(() => { bd.set(t, l); M.pose = pose ? P[pose] : P.present; }), S.cap('Teaching: ' + t), S.say(s)];
      return [S.look('camera'), S.label('Presenting'), S.say(narr(29)), ...L('What is robotics?', ['Sense  →  Think  →  Act', 'Mechanics + Electronics + Software'], 'Robotics combines mechanics, electronics and software. Every robot senses its world, decides what to do, and acts.'),
      ...L('Sensors', ['Camera, depth, LiDAR  →  perception', 'IMU, encoders  →  body state', 'Force sensors  →  contact'], 'Sensors convert physical quantities into electrical signals. Cameras and LiDAR perceive the world, while encoders and the inertial unit measure my own body.', 'presentL'),
      ...L('Actuators', ['Motor  →  reducer  →  joint', 'τ_out = N · η · K_t · I'], 'Actuators convert electrical energy into motion. A motor and a reducer produce the torque for each joint.'),
      ...L('Degrees of freedom', ['DOF = independent joint motions', 'BAIRWABOT: 46 conceptual DOF'], 'A degree of freedom is one independent motion. I have forty six.', 'presentL'),
      ...L('Forward kinematics', ['Joint angles  →  hand position', 'T = A₁ · A₂ · … · Aₙ'], 'Forward kinematics multiplies link transformation matrices to find where my hand is.'),
      ...L('Inverse kinematics', ['Target position  →  joint angles', 'Δθ = Jᵀ (J Jᵀ + λ²I)⁻¹ e'], 'Inverse kinematics works backwards: from a target position to joint angles, using the Jacobian.', 'presentL'),
      S.do(() => { bd.set('Demonstration: walking', ['Stance ≈ 60 %   Swing ≈ 40 %', 'Arms swing opposite to legs']); M.pose = {}; }), S.cap('Demonstrating walking'), S.say('Now watch me walk.', { bg: 1 }), S.label(''), S.gait('walk', 2.6), S.settle(), S.gait('walk', 2.6, { dir: -1, amp: 0.8 }), S.settle(), S.waitSay(),
      S.do(() => { bd.set('Short quiz', ['Listen to each question,', 'then answer in the Quiz tab.']); UI.tab('quiz'); M.pose = P.present; }), S.cap('Asking the students questions'), S.label('Presenting'), S.say('Now a short quiz.'), ...Q.slice(0, 3).flatMap((q, i) => [S.say('Question ' + (i + 1) + '. ' + q[0]), S.wait(0.6)]), S.say('Select your answers in the quiz panel. Good luck!'), S.pose({}, 0.4, ''), S.look(null)];
    };
    SC[30] = () => {
      const E = W.E, Vi = E.visitor, St = E.staff; let bb;
      return [S.look(() => V3(Vi.pos().x, 1.55, Vi.pos().z)), S.say(narr(30)), S.cap('Guiding a visitor'), S.walkTo(0.1, -3.7), S.face(() => Vi.pos()), S.settle(), S.expr('smile'), S.pose('present', 0.2), S.say('Welcome. Please follow me to Ward 3.'), S.pose({}, 0.2), S.look(null),
      S.do(() => { Vi.speed = 0.7; Vi.follow = () => { const b = M.local(-1.05, -0.3); return Math.hypot(b.x - Vi.pos().x, b.z - Vi.pos().z) > 0.15 ? b : null; }; E.wl = W.addLabel(E.wardSign, 'WARD 3', 'screen'); }), S.cap('Navigating the hospital corridor'), S.walkTo(0.55, 1.75), S.turnTo(Math.PI / 2), S.settle(), S.do(() => { Vi.follow = null; Vi.target = V3(1.15, 0, 2.05); }), S.pose('present', 0.2), S.say('This is Ward 3. This is a simulated location.'), S.pose({}, 0.2),
      S.cap('Delivering supplies'), S.walkTo(0.95, -1.0), S.turnTo(0), S.settle(), S.label('Reaching'), ...B.carryPick(E.box), S.cap('Carrying supplies to the staff station'), S.walkTo(-0.95, 2.98), S.turnTo(0), S.settle(), S.label('Carrying'), ...B.carryRelease(E.box, () => V3(-0.95, 0.95, 3.6)), S.say('Supplies delivered to the staff station.'),
      S.cap('Identifying a simulated emergency'), S.do(() => { E.patient.visible = true; bb = W.addBBox(E.patient, 'SIMULATED EMERGENCY – person on floor', 'alert'); W.updaters.push(() => { E.beacon.material.emissiveIntensity = 1.5 + 1.5 * Math.sin(M.t * 10); }); }), S.face(() => E.patient.position), S.settle(), S.look(() => E.patient.position), S.expr('surprise'), S.wait(0.8),
      S.cap('Alerting hospital staff'), S.extra('Alert status', 'Staff notified (simulated message)'), S.say('Attention. A simulated emergency is detected in the corridor. I am alerting hospital staff now.'), S.do(() => { St.speed = 1.1; St.target = V3(0.3, 0, 5.0); }), S.wait(3), S.expr('neutral'), S.say('Staff have been alerted and are responding. I do not diagnose or treat patients. I will keep the corridor clear.'), S.do(() => bb && bb.remove()),
      S.cap('Providing information'), S.look('camera'), S.pose('present', 0.2), S.say('For information: the reception desk is at the corridor entrance. This information is simulated for the demonstration.'), S.pose({}, 0.3), S.look(null), S.cap('Hospital assistance demonstration complete')];
    };

    /* ================= interactive experiments (controls shown in the Learn tab) ================= */
    const run = (st) => () => BB.Lab.runSteps(st());
    const btn = (label, fn) => ({ type: 'btn', label, fn });
    const X = (BB.EXPS = {});
    X[1] = () => [btn('Wave again', () => A.wave()), btn('Blink', () => R.face.blinkNow()), btn('Speak introduction', run(SC[1]))];
    X[2] = () => [btn('Forward', () => A.walkFwd()), btn('Backward', () => A.walkBack()), btn('Sideways ←', () => { A.stop(); M.setGait('side'); }), btn('Sideways →', () => { A.stop(); M.setGait('side', { dir: -1 }); }), btn('Stop', () => A.stop()),
    { type: 'range', label: 'Step length (gait amplitude)', min: 0.5, max: 1.2, step: 0.05, val: 1, unit: '×', fn: (v) => (M.ampScale = v) }, { type: 'range', label: 'Step frequency', min: 0.6, max: 1.4, step: 0.05, val: 1, unit: '×', fn: (v) => (M.freqScale = v) }];
    X[3] = () => [btn('Walk', () => A.walkFwd()), btn('Jog', () => { A.stop(); M.setGait('jog'); }), btn('Run', () => A.run()), btn('Stop', () => A.stop()), { type: 'range', label: 'Cadence', min: 0.7, max: 1.3, step: 0.05, val: 1, unit: '×', fn: (v) => (M.freqScale = v) }];
    X[4] = () => [btn('Sit down', () => BB.Lab.runSteps([S.pose('sitPrep', 1.1, 'Sitting'), S.pose('sit', 1.5)])), btn('Stand up', () => A.stand()), btn('Full sequence', run(SC[4]))];
    X[5] = () => [...Object.keys(G5).map(k => btn(G5[k][2], () => BB.Lab.runSteps([...B.gesture(k), S.wait(0.5)]))), btn('Count 1–5', () => BB.Lab.runSteps(B.count())), { type: 'select', label: 'Grasp mode (right hand)', opts: ['relaxed', 'open', 'power', 'precision', 'pinch', 'cylindrical', 'spherical', 'point'], fn: (v) => { A.stop(); M.pose = { RShPitch: 50, RElbow: 85, RForearm: -80 }; M.grip.R = v; UI.phase('Grasp mode: ' + v); } }];
    X[6] = () => [btn('Bend forward', () => A.bend()), btn('Bend backward', () => BB.Lab.runSteps([S.pose('bendBack', 2), S.pose({}, 1.2)])), btn('Squat', () => A.squat()), btn('Kneel', () => BB.Lab.runSteps([S.pose('kneel', 2.6, 'Kneeling'), S.wait(1), S.pose({}, 1.8, '')])), { type: 'range', label: 'Squat depth (knee angle)', min: 0, max: 120, step: 1, val: 0, unit: '°', fn: (v) => { Runner.clear(); M.pose = v < 2 ? {} : { rootPitch: v * 0.23, LHipPitch: v * 0.97, RHipPitch: v * 0.97, LKnee: v, RKnee: v, torsoPitch: v * 0.1, LShPitch: v * 0.6, RShPitch: v * 0.6 }; } }];
    X[7] = () => [btn('Climb and descend', run(SC[7])), { type: 'range', label: 'Step cadence', min: 0.6, max: 1.4, step: 0.05, val: 1, unit: '×', fn: (v) => (M.freqScale = v) }];
    X[8] = () => [btn('Dance', () => A.dance()), btn('Stop', () => A.stop()), { type: 'range', label: 'Tempo (animation speed)', min: 0.5, max: 1.5, step: 0.1, val: 1, unit: '×', fn: (v) => BB.Lab.setSpeed(v) }];
    X[9] = () => [{ type: 'text', label: 'Make BAIRWABOT say', ph: 'Type a sentence…', btn: 'Speak', fn: (v) => { if (v) { M.look = 'camera'; V.say(v); } } }, { type: 'range', label: 'Speech rate', min: 0.6, max: 1.4, step: 0.05, val: 1, unit: '×', fn: (v) => (V.rate = v) }, { type: 'range', label: 'Pitch', min: 0.5, max: 1.6, step: 0.05, val: 1, unit: '', fn: (v) => (V.pitch = v) }];
    X[10] = () => [btn('🎤 Start listening', () => V.listen()), btn('Stop listening', () => V.stopListen()), ...['Hello Bairwabot', 'Walk forward', 'Walk backward', 'Stop walking', 'Turn left', 'Turn right', 'Raise your right hand', 'Wave your hand', 'Sit down', 'Stand up', 'Start dancing', 'Explain your body structure'].map(c => btn('“' + c + '”', () => BB.Brain.handle(c, 'text')))];
    X[11] = () => [...Object.keys(BB.EXPR).map(e => btn(e, () => { R.face.set(e); UI.phase('Expression: ' + e); })), btn('Blink', () => R.face.blinkNow()), { type: 'check', label: 'Eye tracking (eyes and head follow the pointer)', val: false, fn: (v) => BB.Lab.eyeTrack(v) }];
    X[12] = () => [{ type: 'text', label: 'Ask BAIRWABOT', ph: 'e.g. What is an actuator?', btn: 'Ask', fn: (v) => v && BB.Brain.handle(v, 'text') }, ...['What is a humanoid robot?', 'How many degrees of freedom do you have?', 'What is an IMU?', 'What is inverse kinematics?', 'How do you balance?'].map(q => btn(q, () => BB.Brain.handle(q, 'text')))];
    X[13] = () => pres.map((p, i) => btn(p[0], () => BB.Lab.runSteps([S.do(() => { R.isolate(Array.isArray(p[1]) ? p[1] : null); R.highlightJoints(p[1] === 'joints'); M.pose = i % 2 ? P.presentL : P.present; }), S.say(p[2]), S.do(() => { R.isolate(null); R.highlightJoints(false); M.pose = {}; })])));
    X[14] = () => [btn('Shake hands', run(SC[14])), { type: 'select', label: 'Grip style', opts: ['shake', 'cylindrical', 'power'], fn: (v) => (M.grip.R = v) }];
    X[15] = () => [{ type: 'range', label: 'Safe following distance', min: 0.8, max: 2.2, step: 0.1, val: 1.3, unit: ' m', fn: (v) => (BB.Lab.param.safe = v) }, { type: 'check', label: 'Person is walking', val: true, fn: (v) => (BB.Lab.param.humanWalk = v) }, btn('Start following', run(SC[15]))];
    X[16] = () => [{ type: 'select', label: 'Object', opts: ['cube', 'bottle', 'ball', 'cup', 'book'], fn: (v) => (BB.Lab.param.item = v) }, btn('Pick and place selected object', () => BB.Lab.runSteps(B.pickPlace(BB.Lab.param.item || 'cube'))), btn('Clear trajectory', () => W.E.trail && W.E.trail.clear())];
    X[17] = () => [btn('Run detection', run(SC[17])), btn('Shuffle objects', () => { const E = W.E; (E.boxes || []).forEach(b => b.remove()); E.boxes = []; const xs = [-0.36, -0.2, 0.02, 0.2, 0.38].sort(() => Math.random() - 0.5); Object.values(E.items).forEach((o, i) => { o.position.x = xs[i]; o.userData.home.x = xs[i]; }); UI.phase('Objects shuffled – run detection again'); }), btn('Hide boxes', () => { (W.E.boxes || []).forEach(b => b.remove()); W.E.boxes = []; })];
    X[18] = () => [btn('Navigate to goal', run(SC[18])), btn('Move obstacles randomly', () => { BB.Lab.reset(); const E = W.E; W.props.children.filter(c => c.geometry && c.geometry.type === 'CylinderGeometry').forEach((c, i) => { if (E.obs[i]) { E.obs[i][0] = (Math.random() - 0.5) * 2.2; c.position.x = E.obs[i][0]; } }); UI.phase('Obstacles moved – press Navigate'); })];
    X[19] = () => [btn('Navigate to default goal', run(SC[19])), { type: 'note', text: 'Click anywhere on the floor inside the room to set a new goal – BAIRWABOT replans with A* and walks there.' }];
    X[20] = () => [btn('Deliver the parcel', run(SC[20]))];
    X[21] = () => [btn('Open, pass and close', run(SC[21]))];
    X[22] = () => Object.keys(B.desk).map(k => btn({ switch: 'Press switch', keyboard: 'Type on keyboard', phone: 'Pick up phone', cup: 'Handle cup', tool: 'Use screwdriver' }[k], () => BB.Lab.runSteps(B.desk[k]())));
    X[23] = () => [btn('Push from behind', () => BB.Lab.runSteps(B.push(1))), btn('Push from the front', () => BB.Lab.runSteps(B.push(-1))), btn('Stand on one leg', () => BB.Lab.runSteps([S.pose('oneLeg', 3.5, 'Balancing'), S.pose({}, 1.5, '')])), { type: 'range', label: 'Body inclination (forward lean)', min: -6, max: 9, step: 0.5, val: 0, unit: '°', fn: (v) => { Runner.clear(); M.pose = { rootPitch: v }; } }, btn('Clear CoM trace', () => W.comTrail && W.comTrail.clear())];
    X[24] = () => [btn('Forward fall', () => BB.Lab.runSteps(fallSeq('f'))), btn('Backward fall', () => BB.Lab.runSteps(fallSeq('b'))), btn('Sideways fall', () => BB.Lab.runSteps(fallSeq('s')))];
    X[25] = () => R.sensors.map(s => btn(s.name, () => { BB.Lab.showSensor(s.key); V.say(s.name + '. ' + s.fn + ' ' + s.principle); }));
    X[26] = () => [{ type: 'custom', build: (el) => UI.buildFKIK(el) }];
    X[27] = () => [{ type: 'custom', build: (el) => UI.buildDofExplorer(el) }];
    X[28] = () => [btn('Bring water bottle', () => BB.Lab.runSteps(B.care.water())), btn('Pick up fallen keys', () => BB.Lab.runSteps(B.care.fallen())), btn('Medicine reminder (simulated)', () => BB.Lab.runSteps(B.care.remind())), btn('Guide the person', () => BB.Lab.runSteps(B.care.guide())), { type: 'note', text: 'Run “Bring water bottle” before “Pick up fallen keys” (or press Reset between tasks).' }];
    X[29] = () => [btn('Start the lesson', run(SC[29])), btn('Open the quiz', () => UI.tab('quiz'))];
    X[30] = () => [btn('Run hospital scenario', run(SC[30]))];
  };
})();
