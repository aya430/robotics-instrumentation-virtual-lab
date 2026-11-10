/* BAIRWABOT – motion.js
   Animation engine: pose targets, gait generators, state blending, arm inverse
   kinematics (damped least squares), ground-contact and stance-foot constraints,
   footstep planner (stairs) and live kinematic outputs (CoM, CoP, contacts…). */
(function () {
  'use strict';
  const T = THREE, BB = window.BB, D2R = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const bump = (s, c, w) => { const d = ((s - c + 1.5) % 1) - 0.5; return Math.exp(-(d * d) / (2 * w * w)); };
  BB.util = { clamp, smooth, wrap };

  BB.POSES = {
    stand: {},
    attention: { LShRoll: 4, RShRoll: 4, LElbow: 4, RElbow: 4 },
    sitPrep: { rootPitch: 38, LHipPitch: 80, RHipPitch: 80, LKnee: 62, RKnee: 62, torsoPitch: 8, LShPitch: 25, RShPitch: 25, LElbow: 30, RElbow: 30 },
    sit: { LHipPitch: 88, RHipPitch: 88, LKnee: 90, RKnee: 90, torsoPitch: 3, LShPitch: 28, RShPitch: 28, LElbow: 62, RElbow: 62, LShRoll: 4, RShRoll: 4 },
    bendFwd: { rootPitch: 55, LHipPitch: 55, RHipPitch: 55, torsoPitch: 30, LShPitch: 80, RShPitch: 80, LElbow: 10, RElbow: 10, neckPitch: -15 },
    bendBack: { rootPitch: -14, LHipPitch: -14, RHipPitch: -14, torsoPitch: -18, LKnee: 8, RKnee: 8, LShPitch: -15, RShPitch: -15, neckPitch: -10 },
    squat: { rootPitch: 28, LHipPitch: 118, RHipPitch: 118, LKnee: 122, RKnee: 122, torsoPitch: 12, LShPitch: 75, RShPitch: 75, LElbow: 15, RElbow: 15, LHipRoll: 6, RHipRoll: 6 },
    halfSquat: { rootPitch: 18, LHipPitch: 62, RHipPitch: 62, LKnee: 75, RKnee: 75, torsoPitch: 8, LShPitch: 40, RShPitch: 40 },
    crouch: { rootPitch: 40, LHipPitch: 125, RHipPitch: 125, LKnee: 118, RKnee: 118, torsoPitch: 22, LHipRoll: 8, RHipRoll: 8, LElbow: 30, LShPitch: 30 },
    kneel: { LHipPitch: 90, LKnee: 90, RHipPitch: -2, RKnee: 118, RAnkPitch: -15, torsoPitch: 4, LShPitch: 30, LElbow: 55, RShPitch: 10, RElbow: 25, noAnkR: 1 },
    kneelBoth: { rootPitch: 6, LHipPitch: 4, RHipPitch: 4, LKnee: 112, RKnee: 112, LAnkPitch: -15, RAnkPitch: -15, noAnk: 1 },
    carry: { LShPitch: 30, RShPitch: 30, LElbow: 85, RElbow: 85 },
    present: { RShPitch: 35, RShRoll: 25, RElbow: 70, RForearm: 80, torsoYaw: -8 },
    presentL: { LShPitch: 35, LShRoll: 25, LElbow: 70, LForearm: 80, torsoYaw: 8 },
    raiseR: { RShPitch: 170, RShRoll: 8, RElbow: 5 },
    raiseL: { LShPitch: 170, LShRoll: 8, LElbow: 5 },
    oneLeg: { rootRoll: 5, LHipRoll: -5, RHipRoll: 5, LHipPitch: 45, LKnee: 80, LShRoll: 30, RShRoll: 30 },
    // fall / recovery key poses (free = no stance lock)
    prone: { rootPitch: 88, LShPitch: 150, RShPitch: 150, LElbow: 100, RElbow: 100, LShRoll: 25, RShRoll: 25, LKnee: 18, RKnee: 18, LAnkPitch: -40, RAnkPitch: -40, neckPitch: -25, noAnk: 1, free: 1 },
    pushUp: { rootPitch: 70, LShPitch: 80, RShPitch: 80, LElbow: 15, RElbow: 15, LHipPitch: 20, RHipPitch: 20, LKnee: 40, RKnee: 40, LAnkPitch: -30, RAnkPitch: -30, neckPitch: -25, noAnk: 1, free: 1 },
    allFours: { rootPitch: 80, LShPitch: 88, RShPitch: 88, LHipPitch: 85, RHipPitch: 85, LKnee: 95, RKnee: 95, LAnkPitch: -35, RAnkPitch: -35, neckPitch: -25, noAnk: 1, free: 1 },
    supine: { rootPitch: -88, LShPitch: -20, RShPitch: -20, LShRoll: 30, RShRoll: 30, LElbow: 20, RElbow: 20, LKnee: 10, RKnee: 10, LAnkPitch: 0, RAnkPitch: 0, noAnk: 1, free: 1 },
    sitUp: { rootPitch: -18, LHipPitch: 78, RHipPitch: 78, LKnee: 70, RKnee: 70, torsoPitch: 25, LShPitch: -35, RShPitch: -35, LElbow: 25, RElbow: 25, LAnkPitch: 0, RAnkPitch: 0, noAnk: 1, free: 1 },
    sideLie: { rootRoll: 86, rootPitch: 5, LShRoll: 35, RShPitch: 40, LShPitch: 40, LElbow: 60, RElbow: 60, LKnee: 25, RKnee: 25, LHipPitch: 20, RHipPitch: 20, LAnkPitch: 0, RAnkPitch: 0, LAnkRoll: 0, RAnkRoll: 0, noAnk: 1, free: 1 }
  };
  BB.GRIPS = {            // ThumbOpp, ThumbFlex, Index, Middle, Ring, Little (deg)
    relaxed: [12, 10, 16, 19, 22, 25], open: [0, 0, 0, 0, 0, 0], power: [65, 60, 86, 86, 86, 86],
    precision: [72, 42, 52, 50, 46, 44], pinch: [74, 48, 58, 6, 6, 6], cylindrical: [50, 42, 62, 62, 62, 62],
    spherical: [52, 30, 44, 44, 44, 44], point: [62, 62, 0, 88, 88, 88], thumbsUp: [0, 0, 88, 88, 88, 88],
    victory: [66, 62, 0, 0, 88, 88], c1: [62, 62, 0, 88, 88, 88], c2: [66, 62, 0, 0, 88, 88], c3: [66, 62, 0, 0, 0, 88],
    c4: [70, 62, 0, 0, 0, 0], c5: [0, 0, 0, 0, 0, 0], shake: [40, 30, 50, 50, 50, 50]
  };
  const FING = ['ThumbOpp', 'ThumbFlex', 'Index', 'Middle', 'Ring', 'Little'];
  const GAITS = {
    walk: { f: 0.85, K: 16, label: 'Walking' }, jog: { f: 1.25, K: 20, label: 'Running' }, run: { f: 1.45, K: 22, label: 'Running' },
    turn: { f: 1.15, K: 16, label: 'Turning' }, side: { f: 0.7, K: 14, label: 'Walking' }, march: { f: 1.0, K: 16, label: 'Walking' }
  };

  function gaitPose(p, g, ph, A) {
    for (const S of ['L', 'R']) {
      const O = S === 'L' ? 'R' : 'L', s = (ph + (S === 'L' ? 0 : 0.5)) % 1, c = Math.cos(2 * Math.PI * s);
      if (g === 'walk') {
        p[S + 'HipPitch'] = A * (22 * c + 3);
        p[S + 'Knee'] = A * (4 + 14 * bump(s, 0.12, 0.09) + 52 * bump(s, 0.76, 0.11));
        p[S + 'AnkAdd'] = A * (-17 * bump(s, 0.6, 0.06) + 9 * bump(s, 0.98, 0.05));
        p[O + 'ShPitch'] = A * 20 * c; p[O + 'Elbow'] = 12 + A * (10 + 8 * c);
      } else if (g === 'jog' || g === 'run') {
        const r = g === 'run' ? 1 : 0.72;
        p[S + 'HipPitch'] = A * r * (36 * c + 10);
        p[S + 'Knee'] = A * (14 + r * (26 * bump(s, 0.14, 0.09) + 88 * bump(s, 0.72, 0.13)));
        p[S + 'AnkAdd'] = A * (-22 * bump(s, 0.42, 0.07) + 6 * bump(s, 0.97, 0.05));
        p[O + 'ShPitch'] = A * r * 42 * c; p[O + 'Elbow'] = 20 + A * 65; p[O + 'ShRoll'] = 8;
      } else if (g === 'turn' || g === 'march') {
        p[S + 'HipPitch'] = A * (g === 'march' ? 30 : 12) * bump(s, 0.75, 0.12);
        p[S + 'Knee'] = A * (3 + (g === 'march' ? 55 : 30) * bump(s, 0.75, 0.12));
        p[O + 'ShPitch'] = A * 6 * c;
      }
    }
    if (g === 'walk') { p.torsoPitch = 3 * A; p.torsoYaw = -5 * A * Math.cos(2 * Math.PI * ph); p.LHipRoll = 2.5 * A * Math.sin(2 * Math.PI * ph); p.RHipRoll = -2.5 * A * Math.sin(2 * Math.PI * ph); }
    if (g === 'jog' || g === 'run') { p.torsoPitch = (g === 'run' ? 12 : 8) * A; p.torsoYaw = -8 * A * Math.cos(2 * Math.PI * ph); p.lift = 0.055 * A * Math.max(0, Math.sin(4 * Math.PI * (ph - 0.36))); }
    if (g === 'side') {               // side stepping to the robot's left (dir +1); mirrored via phase reversal
      const u = ph < 0.5 ? ph / 0.5 : (ph - 0.5) / 0.5, abd = 11 * A * (ph < 0.5 ? smooth(u) : 1 - smooth(u)), lift = Math.sin(Math.PI * u);
      p.LHipRoll = abd; p.RHipRoll = abd;
      const sw = ph < 0.5 ? 'L' : 'R';
      p[sw + 'HipPitch'] = 16 * A * lift; p[sw + 'Knee'] = 32 * A * lift;
    }
  }

  BB.Motion = function (robot, world) {
    const M = this, R = robot;
    M.r = R; M.w = world;
    M.q = {}; M.dq = {}; M.prevQ = {};
    R.dofList.forEach(d => { M.q[d.name] = 0; M.dq[d.name] = 0; M.prevQ[d.name] = 0; });
    ['rootPitch', 'rootRoll', 'lift', 'LAnkAdd', 'RAnkAdd'].forEach(k => (M.q[k] = 0));
    M.root = { x: 0, y: 0.95, z: 0, yaw: 0 };
    M.pose = {}; M.overlays = []; M.persist = []; M.ik = { L: null, R: null }; M.ikSol = { L: null, R: null };
    M.grip = { L: 'relaxed', R: 'relaxed' }; M.look = null; M.manual = {};
    M.gait = null; M.amp = 0; M.ampT = 0; M.phase = 0; M.dir = 1; M.yawRate = 0; M.freqScale = 1; M.ampScale = 1;
    M.stepper = null; M.t = 0; M.label = ''; M.K = 9;
    M.stance = null; M.prevStance = new T.Vector3();
    M.out = {
      speed: 0, vel: new T.Vector3(), acc: new T.Vector3(), com: new T.Vector3(0, 0.95, 0), cop: new T.Vector3(), comVel: new T.Vector3(), comAcc: new T.Vector3(),
      contacts: { L: true, R: true, LH: true, LT: true, RH: true, RT: true }, support: 'Double support', tilt: 0, tiltRate: 0, hull: [],
      ee: { L: new T.Vector3(), R: new T.Vector3() }, eeW: { L: new T.Vector3(), R: new T.Vector3() }, stepLen: 0, stepFreq: 0, pressure: { L: [25, 25], R: [25, 25] }, phaseName: '—', flight: false
    };
    let lastSwitchT = 0; const lastStancePos = new T.Vector3(); const prevRootPos = new T.Vector3(); const prevCom = new T.Vector3(); const prevComVel = new T.Vector3(); const prevVel = new T.Vector3();
    const v1 = new T.Vector3(), v2 = new T.Vector3(), up = new T.Vector3();
    let prevTilt = 0;

    function setDof(name, deg) { const d = R.dofs[name], r = deg * D2R; for (const t of d.targets) t.node.rotation[t.axis] = t.k * r; }
    M.setDof = setDof;
    M.gripPos = (S, out) => R.nodes['grip' + S].getWorldPosition(out || new T.Vector3());

    /* ----- public controls ----- */
    M.setGait = (g, o) => { o = o || {}; if (M.gait !== g) { if (!M.gait) M.phase = 0; M.gait = g; } M.dir = o.dir || 1; M.ampT = o.amp == null ? 1 : o.amp; M.stepper = null; };
    M.stopGait = () => { M.ampT = 0; M.yawRate = 0; };
    M.moving = () => !!M.gait || !!M.stepper;
    M.teleport = (x, z, yawDeg) => { M.root.x = x; M.root.z = z; M.root.yaw = (yawDeg || 0) * D2R; M.stance = null; };
    M.halt = () => { M.gait = null; M.amp = M.ampT = 0; M.yawRate = 0; M.stepper = null; M.pose = {}; M.overlays = []; M.ik.L = M.ik.R = null; M.grip.L = M.grip.R = 'relaxed'; M.look = null; M.label = ''; M.K = 9; };
    M.hardReset = () => { M.halt(); M.manual = {}; for (const k in M.q) M.q[k] = 0; M.teleport(0, 0, 0); };
    M.addOverlay = (fn) => { M.overlays.push(fn); return fn; };
    M.removeOverlay = (fn) => { M.overlays = M.overlays.filter(f => f !== fn); };
    M.fwd = (out) => (out || new T.Vector3()).set(Math.sin(M.root.yaw), 0, Math.cos(M.root.yaw));
    M.local = (f, l, y) => new T.Vector3(M.root.x + Math.sin(M.root.yaw) * f + Math.cos(M.root.yaw) * l, y || 0, M.root.z + Math.cos(M.root.yaw) * f - Math.sin(M.root.yaw) * l); // f forward, l left

    /* ----- inverse kinematics: damped least squares on the real rig ----- */
    const J = [[], [], []], m3 = new T.Matrix3(), e = new T.Vector3(), g0 = new T.Vector3(), g1 = new T.Vector3();
    function solveIK(S, ik) {
      const names = [S + 'ShPitch', S + 'ShRoll', S + 'ShYaw', S + 'Elbow'];
      if (ik.torso) names.push('torsoPitch', 'torsoYaw');
      let sol = M.ikSol[S];
      if (!sol) { sol = M.ikSol[S] = {}; for (const n of names) sol[n] = M.q[n]; if (sol[S + 'Elbow'] < 25) sol[S + 'Elbow'] = 35; if (sol[S + 'ShPitch'] < 10) sol[S + 'ShPitch'] = 20; }
      for (const n of names) if (sol[n] == null) sol[n] = M.q[n];
      const topNode = ik.torso ? R.nodes.torso : R.nodes['sh' + S], grip = R.nodes['grip' + S];
      const fk = (o) => { for (const n of names) setDof(n, sol[n]); topNode.updateMatrixWorld(true); return grip.getWorldPosition(o); };
      const lim = (n, v) => { const d = R.dofs[n]; let lo = d.min, hi = d.max; if (n === 'torsoPitch') { lo = -5; hi = 38; } if (n === 'torsoYaw') { lo = -30; hi = 30; } if (n.endsWith('Elbow')) lo = 8; return clamp(v, lo, hi); };
      for (let it = 0; it < 5; it++) {
        fk(g0); e.subVectors(ik.target, g0); const err = e.length(); ik.err = err; if (err < 0.002) break;
        if (err > 0.12) e.multiplyScalar(0.12 / err);
        for (let j = 0; j < names.length; j++) {
          const n = names[j], keep = sol[n]; sol[n] = keep + 1; fk(g1); sol[n] = keep;
          J[0][j] = (g1.x - g0.x) / D2R; J[1][j] = (g1.y - g0.y) / D2R; J[2][j] = (g1.z - g0.z) / D2R;
        }
        const A = [0, 0, 0, 0, 0, 0, 0, 0, 0], lam = 0.0016;
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { let s = 0; for (let j = 0; j < names.length; j++) { const w = names[j].startsWith('torso') ? 0.25 : 1; s += J[a][j] * J[b][j] * w; } A[a * 3 + b] = s + (a === b ? lam : 0); }
        m3.set(A[0], A[1], A[2], A[3], A[4], A[5], A[6], A[7], A[8]).invert();
        g1.copy(e).applyMatrix3(m3);
        for (let j = 0; j < names.length; j++) {
          const n = names[j], w = n.startsWith('torso') ? 0.25 : 1;
          const d = w * (J[0][j] * g1.x + J[1][j] * g1.y + J[2][j] * g1.z) / D2R;
          sol[n] = lim(n, sol[n] + clamp(d, -12, 12));
        }
      }
      return sol;
    }
    M.solveIK = solveIK;

    /* ----- leg IK in the sagittal plane (footstep planner) ----- */
    const L1 = 0.42, L2 = 0.4;
    function legIK(dz, dy) {       // ankle relative to hip joint (forward, up)
      let L = Math.hypot(dz, dy); L = clamp(L, 0.3, L1 + L2 - 0.004);
      const knee = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - L * L) / (2 * L1 * L2), -1, 1));
      const gam = Math.atan2(dz, -dy), a = Math.acos(clamp((L1 * L1 + L * L - L2 * L2) / (2 * L1 * L), -1, 1));
      return { hip: (gam + a) / D2R, knee: knee / D2R };
    }
    M.startSteps = (footholds, T_) => {
      const z0 = M.root.z;
      M.gait = null; M.amp = M.ampT = 0;
      M.stepper = { f: footholds, T: T_ || 0.85, t: 0, cur: { L: { z: z0, y: world.groundH(0.1, z0) }, R: { z: z0, y: world.groundH(-0.1, z0) } }, n: -1, H0: 0, H1: 0, from: null, done: false, feet: { L: { z: z0, y: 0 }, R: { z: z0, y: 0 } } };
      M.stepper.H0 = M.stepper.H1 = Math.min(M.stepper.cur.L.y, M.stepper.cur.R.y) + 0.9;
    };
    function stepperPose(p, dt) {
      const st = M.stepper; st.t += dt * M.freqScale;
      const n = Math.floor(st.t / st.T), u = st.t / st.T - n;
      if (n !== st.n) {
        if (st.n >= 0 && st.n < st.f.length) { const f = st.f[st.n]; st.cur[f.s] = { z: f.z, y: f.y }; }
        st.n = n;
        if (n >= st.f.length) { st.done = true; }
        else { const f = st.f[n], o = f.s === 'L' ? 'R' : 'L'; st.from = st.cur[f.s]; st.H0 = st.H1; st.H1 = Math.min(f.y, st.cur[o].y) + 0.9; }
      }
      const feet = { L: { z: st.cur.L.z, y: st.cur.L.y }, R: { z: st.cur.R.z, y: st.cur.R.y } };
      let H = st.H1;
      if (!st.done) {
        const f = st.f[n], e2 = smooth((u - 0.08) / 0.8), a = st.from, upw = f.y >= a.y;
        const yb = upw ? a.y + (f.y - a.y) * smooth(e2 * 1.7) : a.y + (f.y - a.y) * smooth((e2 - 0.45) / 0.55);
        feet[f.s] = { z: a.z + (f.z - a.z) * (f.y > a.y + 0.01 ? smooth((e2 - 0.25) / 0.75) : f.y < a.y - 0.01 ? smooth(e2 / 0.75) : e2), y: yb + 0.075 * Math.sin(Math.PI * e2) * (Math.abs(f.z - a.z) > 0.02 ? 1 : 0.3) };
        H = st.H0 + (st.H1 - st.H0) * smooth(u * 1.15);
        M.out.phaseName = (f.y > a.y + 0.01 ? 'Step up – ' : f.y < a.y - 0.01 ? 'Step down – ' : 'Level step – ') + (f.s === 'L' ? 'left' : 'right') + ' foot swing';
      }
      const zp = (feet.L.z + feet.R.z) / 2 + 0.035;
      st.feet = feet;
      for (const S of ['L', 'R']) {
        const k = legIK(feet[S].z - zp, feet[S].y + 0.09 - (H - 0.04));
        p[S + 'HipPitch'] = k.hip; p[S + 'Knee'] = k.knee;
        const O = S === 'L' ? 'R' : 'L'; p[O + 'ShPitch'] = k.hip * 0.35; p[O + 'Elbow'] = 25;
      }
      p.torsoPitch = 7;
      M.root.x += (0 - M.root.x) * 0.1; M.root.z = zp; M.root.y = H; M.root.yaw += wrap(0 - M.root.yaw) * 0.1;
    }

    /* ----- per-frame update ----- */
    M.update = function (dt) {
      M.t += dt; const t = M.t, q = M.q, p = {};
      p.torsoPitch = 1.1 * Math.sin(t * 1.4); p.LShRoll = 7; p.RShRoll = 7; p.LElbow = 12; p.RElbow = 12; p.LShPitch = 2; p.RShPitch = 2;
      p.neckYaw = 2 * Math.sin(t * 0.5); p.lift = 0;
      let K = M.K;
      // gait
      M.amp += (M.ampT - M.amp) * (1 - Math.exp(-4.5 * dt));
      if (M.gait) {
        const G = GAITS[M.gait]; K = G.K;
        M.phase = (M.phase + M.dir * G.f * M.freqScale * dt + 1) % 1;
        gaitPose(p, M.gait, M.phase, M.amp * M.ampScale);
        M.root.yaw = wrap(M.root.yaw + M.yawRate * dt);
        if (M.ampT === 0 && M.amp < 0.05) { M.gait = null; M.amp = 0; }
        const s = M.phase;
        M.out.phaseName = M.gait === 'walk' ? (s < 0.08 ? 'Heel strike' : s < 0.2 ? 'Foot flat (loading)' : s < 0.4 ? 'Mid-stance' : s < 0.5 ? 'Heel-off' : s < 0.62 ? 'Toe-off' : 'Swing phase') + ' (left leg)' : M.gait === 'run' || M.gait === 'jog' ? (q.lift > 0.012 ? 'Flight phase' : 'Stance / landing') : M.gait === 'turn' ? 'Turning in place' : M.gait === 'side' ? 'Side step' : 'Stepping';
      }
      if (M.stepper) { stepperPose(p, dt); K = 40; if (M.stepper.done) { M.stepper = null; M.stance = null; } }
      Object.assign(p, M.pose);
      for (const fn of M.overlays) fn(p, t, dt);
      for (const fn of M.persist) fn(p, t, dt);
      for (const S of ['L', 'R']) { const g = BB.GRIPS[M.grip[S]] || BB.GRIPS.relaxed; FING.forEach((f, i) => { if (p[S + f] == null) p[S + f] = g[i]; }); }
      if (M.look) {
        const tg = M.look === 'camera' ? world.camera.position : (typeof M.look === 'function' ? M.look() : M.look);
        if (tg) {
          v1.copy(tg); R.nodes.torso.worldToLocal(v1); v1.y -= 0.57;
          p.neckYaw = clamp(Math.atan2(v1.x, v1.z) / D2R, -70, 70); p.neckPitch = (p.neckPitch || 0) + clamp(-Math.atan2(v1.y, Math.hypot(v1.x, v1.z)) / D2R, -30, 40);
        }
      }
      for (const S of ['L', 'R']) {
        const ik = M.ik[S];
        if (ik) { if (ik.fn) ik.target.copy(ik.fn()); Object.assign(p, solveIK(S, ik)); } else M.ikSol[S] = null;
      }
      Object.assign(p, M.manual);
      // smooth towards target (state blending; any state can be interrupted safely)
      const a = 1 - Math.exp(-K * dt), aF = 1 - Math.exp(-Math.max(K, 14) * dt);
      for (const k in q) {
        const d = R.dofs[k]; let tv = p[k] || 0;
        if (d) tv = clamp(tv, d.min, d.max);
        q[k] += (tv - q[k]) * (d && d.group.endsWith('Hand') ? aF : a);
      }
      // flat-foot ankle constraint
      if (!p.noAnk) {
        for (const S of ['L', 'R']) {
          if (p.noAnkR && S === 'R') continue;
          if (M.manual[S + 'AnkPitch'] == null) q[S + 'AnkPitch'] = clamp(q.rootPitch + q[S + 'Knee'] - q[S + 'HipPitch'] + q[S + 'AnkAdd'], -50, 45);
          if (M.manual[S + 'AnkRoll'] == null) q[S + 'AnkRoll'] = clamp(S === 'L' ? -q.rootRoll - q.LHipRoll : q.rootRoll - q.RHipRoll, -25, 25);
        }
      }
      for (const d of R.dofList) { setDof(d.name, q[d.name]); M.dq[d.name] = dt > 0 ? (q[d.name] - M.prevQ[d.name]) / dt : 0; M.prevQ[d.name] = q[d.name]; }
      const root = R.root, rt = M.root;
      root.rotation.set(q.rootPitch * D2R, rt.yaw, q.rootRoll * D2R);
      const explicitY = !!M.stepper;
      root.position.set(rt.x, explicitY ? rt.y : 0, rt.z); root.updateMatrixWorld(true);
      const O = M.out;
      // ground contact: lowest probe touches the ground
      if (!explicitY) {
        let mn = 1e9;
        for (const pr of R.probes) { v1.copy(pr.v).applyMatrix4(pr.node.matrixWorld); const c = v1.y - world.groundH(v1.x, v1.z); if (c < mn) mn = c; }
        rt.y = -mn + q.lift; root.position.y = rt.y;
      }
      // foot clearances
      const cl = {};
      for (const S of ['L', 'R']) {
        const so = R.soles[S], w = so.node.matrixWorld, dy = explicitY ? 0 : rt.y;
        v1.copy(so.heel).applyMatrix4(w); const h = v1.y + dy - world.groundH(v1.x, v1.z);
        v1.copy(so.toe).applyMatrix4(w); const tt = v1.y + dy - world.groundH(v1.x, v1.z);
        cl[S] = Math.min(h, tt); O.contacts[S + 'H'] = h < 0.014; O.contacts[S + 'T'] = tt < 0.014; O.contacts[S] = cl[S] < 0.014;
      }
      O.flight = !O.contacts.L && !O.contacts.R;
      // stance-foot (no-slip) constraint
      if (!explicitY) {
        let st = M.stance;
        if (!st || cl[st] > cl[st === 'L' ? 'R' : 'L'] + 0.004) st = cl.L <= cl.R ? 'L' : 'R';
        v1.copy(R.soles[st].c).applyMatrix4(R.soles[st].node.matrixWorld);
        if (st === M.stance && !p.free) { rt.x -= v1.x - M.prevStance.x; rt.z -= v1.z - M.prevStance.z; }
        else {
          if (M.stance && st !== M.stance) { const d = Math.hypot(v1.x - lastStancePos.x, v1.z - lastStancePos.z); if (M.gait) { O.stepLen = d; O.stepFreq = 1 / Math.max(0.05, t - lastSwitchT); } lastSwitchT = t; lastStancePos.copy(v1); }
          M.prevStance.copy(v1); M.stance = st;
        }
        root.position.set(rt.x, rt.y, rt.z);
      }
      root.updateMatrixWorld(true);
      /* ----- derived quantities ----- */
      if (dt > 0) {
        v1.set((rt.x - prevRootPos.x) / dt, (rt.y - prevRootPos.y) / dt, (rt.z - prevRootPos.z) / dt);
        O.vel.lerp(v1, 0.12); O.speed = Math.hypot(O.vel.x, O.vel.z);
        v2.subVectors(O.vel, prevVel).divideScalar(dt); O.acc.lerp(v2, 0.08); prevVel.copy(O.vel);
        prevRootPos.set(rt.x, rt.y, rt.z);
      }
      // centre of mass from the segment mass model
      O.com.set(0, 0, 0);
      for (const ms of R.masses) { v1.copy(ms.v).applyMatrix4(ms.node.matrixWorld); O.com.addScaledVector(v1, ms.m); }
      O.com.divideScalar(R.TOTAL_MASS);
      if (dt > 0) {
        v1.subVectors(O.com, prevCom).divideScalar(dt); if (v1.length() > 20) v1.set(0, 0, 0);
        O.comVel.lerp(v1, 0.15); v2.subVectors(O.comVel, prevComVel).divideScalar(dt); if (v2.length() > 60) v2.set(0, 0, 0);
        O.comAcc.lerp(v2, 0.06); prevComVel.copy(O.comVel); prevCom.copy(O.com);
      }
      // support polygon
      const pts = [];
      for (const S of ['L', 'R']) if (O.contacts[S]) for (const c of R.soles[S].corners) { v1.copy(c).applyMatrix4(R.soles[S].node.matrixWorld); pts.push([v1.x, v1.z, v1.y]); }
      O.hull = hull(pts);
      O.support = O.contacts.L && O.contacts.R ? 'Double support' : O.contacts.L ? 'Single support (left)' : O.contacts.R ? 'Single support (right)' : 'Flight (no contact)';
      // CoP / ZMP estimate (cart-table model), kept inside the support polygon
      let cxp = O.com.x - (O.com.y / 9.81) * O.comAcc.x, czp = O.com.z - (O.com.y / 9.81) * O.comAcc.z;
      if (O.hull.length >= 3) {
        let cx = 0, cz = 0; O.hull.forEach(h => { cx += h[0]; cz += h[1]; }); cx /= O.hull.length; cz /= O.hull.length;
        if (!inside(O.hull, cxp, czp)) { let lo = 0, hi = 1; for (let i = 0; i < 10; i++) { const m = (lo + hi) / 2; if (inside(O.hull, cx + (cxp - cx) * m, cz + (czp - cz) * m)) lo = m; else hi = m; } cxp = cx + (cxp - cx) * lo; czp = cz + (czp - cz) * lo; }
      }
      O.cop.set(cxp, O.hull.length ? O.hull[0][2] : 0, czp);
      // foot pressure distribution (% of body weight) from the CoP position
      const pc = {};
      for (const S of ['L', 'R']) { const so = R.soles[S]; pc[S] = { c: v1.copy(so.c).applyMatrix4(so.node.matrixWorld).clone(), h: v1.copy(so.heel).applyMatrix4(so.node.matrixWorld).clone(), t: v1.copy(so.toe).applyMatrix4(so.node.matrixWorld).clone() }; }
      let wL = 0.5;
      if (O.contacts.L && O.contacts.R) { const dx = pc.L.c.x - pc.R.c.x, dz = pc.L.c.z - pc.R.c.z, dd = dx * dx + dz * dz; wL = dd > 1e-6 ? clamp(((cxp - pc.R.c.x) * dx + (czp - pc.R.c.z) * dz) / dd, 0, 1) : 0.5; }
      else wL = O.contacts.L ? 1 : O.contacts.R ? 0 : 0.5;
      for (const S of ['L', 'R']) {
        const w = O.flight ? 0 : (S === 'L' ? wL : 1 - wL) * 100, c = pc[S], dx = c.t.x - c.h.x, dz = c.t.z - c.h.z;
        let f = clamp(((cxp - c.h.x) * dx + (czp - c.h.z) * dz) / (dx * dx + dz * dz), 0, 1);
        if (!O.contacts[S + 'T']) f = 0; if (!O.contacts[S + 'H']) f = 1;
        O.pressure[S][0] += (w * (1 - f) - O.pressure[S][0]) * 0.3; O.pressure[S][1] += (w * f - O.pressure[S][1]) * 0.3;
      }
      // tilt (IMU model)
      up.set(0, 1, 0).applyQuaternion(root.quaternion); O.tilt = Math.acos(clamp(up.y, -1, 1)) / D2R;
      if (dt > 0) { O.tiltRate += ((O.tilt - prevTilt) / dt - O.tiltRate) * 0.2; prevTilt = O.tilt; }
      for (const S of ['L', 'R']) { M.gripPos(S, O.eeW[S]); O.ee[S].copy(O.eeW[S]); root.worldToLocal(O.ee[S]); }
    };

    function hull(P) {
      if (P.length < 3) return P;
      P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lo = []; for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      const hi = []; for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
      lo.pop(); hi.pop(); return lo.concat(hi);
    }
    function inside(H, x, z) { let s = 0; for (let i = 0; i < H.length; i++) { const a = H[i], b = H[(i + 1) % H.length], c = (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]); if (c !== 0) { if (s === 0) s = Math.sign(c); else if (Math.sign(c) !== s) return false; } } return true; }

    /* static gravity torque of the distal link chain about a DOF axis (N·m) – simulated mass model */
    M.gravityTorque = (name) => {
      const d = R.dofs[name], node = d.node, pos = node.getWorldPosition(new T.Vector3());
      const ax = new T.Vector3(d.axis === 'x' ? 1 : 0, d.axis === 'y' ? 1 : 0, d.axis === 'z' ? 1 : 0).transformDirection(node.parent.matrixWorld);
      let tq = 0; const r = new T.Vector3(), F = new T.Vector3();
      for (const ms of R.masses) {
        let n = ms.node, isDesc = false; while (n) { if (n === node) { isDesc = true; break; } n = n.parent; }
        if (!isDesc) continue;
        r.copy(ms.v).applyMatrix4(ms.node.matrixWorld).sub(pos); F.set(0, -ms.m * 9.81, 0); tq += r.cross(F).dot(ax);
      }
      return tq;
    };
  };
})();
