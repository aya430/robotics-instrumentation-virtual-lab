/* =====================================================================
   equation-engine.js — mathematical modelling engine
   Every simulation computes its numbers through these functions, so the
   same code is unit-tested in tests/math.test.js against the worked
   examples of the course notes.
   Angles are in radians unless a name ends in Deg.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.RIL = root.RIL || {}; root.RIL.M = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const PI = Math.PI, D2R = PI / 180, R2D = 180 / PI;
  const g0 = 9.81;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wrapPi = a => { a = (a + PI) % (2 * PI); if (a < 0) a += 2 * PI; return a - PI; };

  /* ---------- vectors ---------- */
  const v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: a => Math.hypot(a[0], a[1], a[2]),
    unit: a => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; }
  };

  /* ---------- generic matrices (arrays of rows) ---------- */
  const mat = {
    eye: n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))),
    zeros: (r, c) => Array.from({ length: r }, () => new Array(c).fill(0)),
    mul(A, B) {
      const r = A.length, c = B[0].length, k = B.length, C = mat.zeros(r, c);
      for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) { let s = 0; for (let m = 0; m < k; m++) s += A[i][m] * B[m][j]; C[i][j] = s; }
      return C;
    },
    mulVec(A, x) { return A.map(row => row.reduce((s, a, j) => s + a * x[j], 0)); },
    T: A => A[0].map((_, j) => A.map(r => r[j])),
    det(A) {
      const n = A.length; const M = A.map(r => r.slice()); let d = 1;
      for (let i = 0; i < n; i++) {
        let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
        if (Math.abs(M[p][i]) < 1e-14) return 0;
        if (p !== i) { [M[p], M[i]] = [M[i], M[p]]; d = -d; }
        d *= M[i][i];
        for (let r = i + 1; r < n; r++) { const f = M[r][i] / M[i][i]; for (let c = i; c < n; c++) M[r][c] -= f * M[i][c]; }
      }
      return d;
    },
    inv(A) {
      const n = A.length; const M = A.map((r, i) => r.concat(mat.eye(n)[i]));
      for (let i = 0; i < n; i++) {
        let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
        if (Math.abs(M[p][i]) < 1e-14) return null;
        [M[p], M[i]] = [M[i], M[p]];
        const piv = M[i][i]; for (let c = 0; c < 2 * n; c++) M[i][c] /= piv;
        for (let r = 0; r < n; r++) if (r !== i) { const f = M[r][i]; for (let c = 0; c < 2 * n; c++) M[r][c] -= f * M[i][c]; }
      }
      return M.map(r => r.slice(n));
    },
    solve(A, b) { const Ai = mat.inv(A); return Ai ? mat.mulVec(Ai, b) : null; },
    /** damped least-squares inverse  J^T (J J^T + λ² I)^-1 */
    dls(J, lambda) {
      const JT = mat.T(J), JJT = mat.mul(J, JT);
      for (let i = 0; i < JJT.length; i++) JJT[i][i] += lambda * lambda;
      return mat.mul(JT, mat.inv(JJT));
    }
  };

  /* ---------- rotations & homogeneous transforms (Unit III, eqs 3.4–3.9) ---------- */
  const rotX = a => { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
  const rotY = a => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
  const rotZ = a => { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
  /** Roll-pitch-yaw  R = Rz(alpha) Ry(beta) Rx(gamma)  (eq. 3.5) */
  const rpy = (gamma, beta, alpha) => mat.mul(rotZ(alpha), mat.mul(rotY(beta), rotX(gamma)));
  const rpyFromR = R => {
    const beta = Math.atan2(-R[2][0], Math.hypot(R[0][0], R[1][0]));
    const alpha = Math.atan2(R[1][0], R[0][0]);
    const gamma = Math.atan2(R[2][1], R[2][2]);
    return { gamma, beta, alpha };
  };
  const homog = (R, t) => [[R[0][0], R[0][1], R[0][2], t[0]], [R[1][0], R[1][1], R[1][2], t[1]], [R[2][0], R[2][1], R[2][2], t[2]], [0, 0, 0, 1]];
  const Rof = T => [[T[0][0], T[0][1], T[0][2]], [T[1][0], T[1][1], T[1][2]], [T[2][0], T[2][1], T[2][2]]];
  const pof = T => [T[0][3], T[1][3], T[2][3]];
  /** inverse of a homogeneous transform  [R^T  -R^T t; 0 1]  (eq. 3.8) */
  const invT = T => { const R = Rof(T), RT = mat.T(R), t = pof(T); const m = mat.mulVec(RT, t); return homog(RT, [-m[0], -m[1], -m[2]]); };
  const applyT = (T, p) => { const r = mat.mulVec(T, [p[0], p[1], p[2], 1]); return [r[0], r[1], r[2]]; };
  const transl = (x, y, z) => homog(mat.eye(3), [x, y, z]);
  const TrotX = a => homog(rotX(a), [0, 0, 0]);
  const TrotY = a => homog(rotY(a), [0, 0, 0]);
  const TrotZ = a => homog(rotZ(a), [0, 0, 0]);

  /** Standard DH link transform  Rotz(θ) Transz(d) Transx(a) Rotx(α)  (eq. 3.9) */
  function dh(theta, d, a, alpha) {
    const ct = Math.cos(theta), st = Math.sin(theta), ca = Math.cos(alpha), sa = Math.sin(alpha);
    return [[ct, -st * ca, st * sa, a * ct], [st, ct * ca, -ct * sa, a * st], [0, sa, ca, d], [0, 0, 0, 1]];
  }
  /**
   * Forward kinematics from a DH table.
   * table: [{a, alpha, d, theta, type:'R'|'P', offset}] ; q: joint variables.
   * Revolute: θ = q + offset ; prismatic: d = q + offset.
   * Returns { A:[iAi], T:[0T0..0Tn] }.
   */
  function fkDH(table, q) {
    const A = [], T = [mat.eye(4)];
    table.forEach((L, i) => {
      const off = L.offset || 0;
      const th = L.type === 'P' ? L.theta : q[i] + off;
      const d = L.type === 'P' ? q[i] + off : L.d;
      const Ai = dh(th, d, L.a, L.alpha);
      A.push(Ai); T.push(mat.mul(T[i], Ai));
    });
    return { A, T };
  }
  /** Geometric Jacobian (6×n), columns [z_{i-1} × (o_n − o_{i-1}); z_{i-1}] for R, [z;0] for P (eq. 3.19) */
  function jacobianGeo(table, q) {
    const { T } = fkDH(table, q); const n = table.length; const on = pof(T[n]);
    const J = mat.zeros(6, n);
    for (let i = 0; i < n; i++) {
      const z = [T[i][0][2], T[i][1][2], T[i][2][2]], o = pof(T[i]);
      let lin, ang;
      if (table[i].type === 'P') { lin = z; ang = [0, 0, 0]; } else { lin = v3.cross(z, v3.sub(on, o)); ang = z; }
      for (let r = 0; r < 3; r++) { J[r][i] = lin[r]; J[r + 3][i] = ang[r]; }
    }
    return J;
  }
  /** Rotation error vector (axis·angle form) between current R and desired Rd: 0.5 Σ n×nd */
  function orientError(R, Rd) {
    const e = [0, 0, 0];
    for (let k = 0; k < 3; k++) { const c = [R[0][k], R[1][k], R[2][k]], d = [Rd[0][k], Rd[1][k], Rd[2][k]]; const x = v3.cross(c, d); e[0] += .5 * x[0]; e[1] += .5 * x[1]; e[2] += .5 * x[2]; }
    return e;
  }
  /** Numerical IK by damped least squares. target {p:[x,y,z], R?:3x3}. Returns {q, err, iters, converged} */
  function ikDLS(table, q0, target, opts = {}) {
    const lambda = opts.lambda ?? 0.05, maxIt = opts.maxIter ?? 200, tol = opts.tol ?? 1e-5, useR = !!target.R;
    let q = q0.slice(); let err = Infinity, it = 0;
    for (; it < maxIt; it++) {
      const { T } = fkDH(table, q); const Tn = T[T.length - 1];
      const ep = v3.sub(target.p, pof(Tn));
      let e = ep.slice();
      if (useR) e = e.concat(orientError(Rof(Tn), target.R));
      err = Math.hypot(...e);
      if (err < tol) break;
      let J = jacobianGeo(table, q); if (!useR) J = J.slice(0, 3);
      const Jp = mat.dls(J, lambda); const dq = mat.mulVec(Jp, e);
      const step = opts.step ?? 1;
      q = q.map((qi, i) => {
        let v = qi + step * dq[i];
        const L = table[i]; if (L.min !== undefined) v = clamp(v, L.min, L.max);
        return v;
      });
    }
    return { q, err, iters: it, converged: err < (opts.accept ?? 1e-3) };
  }

  /* ---------- planar 2R manipulator (eqs 3.11, 3.14–3.18) ---------- */
  const planar2R = {
    fk(l1, l2, t1, t2) {
      return { x: l1 * Math.cos(t1) + l2 * Math.cos(t1 + t2), y: l1 * Math.sin(t1) + l2 * Math.sin(t1 + t2), phi: t1 + t2, ex: l1 * Math.cos(t1), ey: l1 * Math.sin(t1) };
    },
    /** both IK branches; reachable=false when |D|>1 */
    ik(l1, l2, x, y) {
      const D = (x * x + y * y - l1 * l1 - l2 * l2) / (2 * l1 * l2);
      if (Math.abs(D) > 1 + 1e-12) return { reachable: false, D };
      const Dc = clamp(D, -1, 1); const sols = [];
      for (const sgn of [1, -1]) {
        const t2 = Math.atan2(sgn * Math.sqrt(1 - Dc * Dc), Dc);
        const t1 = Math.atan2(y, x) - Math.atan2(l2 * Math.sin(t2), l1 + l2 * Math.cos(t2));
        sols.push({ t1, t2 });
      }
      return { reachable: true, D, sols };
    },
    jacobian(l1, l2, t1, t2) {
      const s1 = Math.sin(t1), c1 = Math.cos(t1), s12 = Math.sin(t1 + t2), c12 = Math.cos(t1 + t2);
      return [[-l1 * s1 - l2 * s12, -l2 * s12], [l1 * c1 + l2 * c12, l2 * c12]];
    },
    det: (l1, l2, t2) => l1 * l2 * Math.sin(t2),
    /** dynamics with point masses at link ends (eq. 3.31) */
    dynamics(m1, m2, l1, l2, q, qd, g = g0) {
      const c2 = Math.cos(q[1]), s2 = Math.sin(q[1]), c1 = Math.cos(q[0]), c12 = Math.cos(q[0] + q[1]);
      const M = [[(m1 + m2) * l1 * l1 + m2 * l2 * l2 + 2 * m2 * l1 * l2 * c2, m2 * l2 * l2 + m2 * l1 * l2 * c2], [m2 * l2 * l2 + m2 * l1 * l2 * c2, m2 * l2 * l2]];
      const Cqd = [-m2 * l1 * l2 * s2 * (2 * qd[0] * qd[1] + qd[1] * qd[1]), m2 * l1 * l2 * s2 * qd[0] * qd[0]];
      const G = [(m1 + m2) * g * l1 * c1 + m2 * g * l2 * c12, m2 * g * l2 * c12];
      return { M, Cqd, G };
    },
    energy(m1, m2, l1, l2, q, qd, g = g0) {
      const c2 = Math.cos(q[1]);
      const K = 0.5 * m1 * l1 * l1 * qd[0] ** 2 + 0.5 * m2 * (l1 * l1 * qd[0] ** 2 + l2 * l2 * (qd[0] + qd[1]) ** 2 + 2 * l1 * l2 * c2 * qd[0] * (qd[0] + qd[1]));
      const P = m1 * g * l1 * Math.sin(q[0]) + m2 * g * (l1 * Math.sin(q[0]) + l2 * Math.sin(q[0] + q[1]));
      return { K, P, L: K - P, E: K + P };
    }
  };
  /** planar nR forward kinematics: returns joint points */
  function planarFK(L, th) {
    let x = 0, y = 0, a = 0; const pts = [[0, 0]];
    for (let i = 0; i < L.length; i++) { a += th[i]; x += L[i] * Math.cos(a); y += L[i] * Math.sin(a); pts.push([x, y]); }
    return { pts, x, y, phi: a };
  }
  function planarJ(L, th) {
    const n = L.length, J = mat.zeros(3, n); const { pts } = planarFK(L, th);
    const end = pts[n];
    for (let i = 0; i < n; i++) { J[0][i] = -(end[1] - pts[i][1]); J[1][i] = end[0] - pts[i][0]; J[2][i] = 1; }
    return J;
  }

  /* ---------- trajectories (eqs 3.22–3.26) ---------- */
  const traj = {
    cubic(q0, qf, tf, t) {
      const D = qf - q0, a2 = 3 * D / (tf * tf), a3 = -2 * D / (tf ** 3); t = clamp(t, 0, tf);
      return { q: q0 + a2 * t * t + a3 * t ** 3, qd: 2 * a2 * t + 3 * a3 * t * t, qdd: 2 * a2 + 6 * a3 * t, jerk: 6 * a3, coeffs: [q0, 0, a2, a3] };
    },
    quintic(q0, qf, tf, t) {
      const D = qf - q0; const tau = clamp(t, 0, tf) / tf;
      return {
        q: q0 + D * (10 * tau ** 3 - 15 * tau ** 4 + 6 * tau ** 5),
        qd: D * (30 * tau ** 2 - 60 * tau ** 3 + 30 * tau ** 4) / tf,
        qdd: D * (60 * tau - 180 * tau ** 2 + 120 * tau ** 3) / (tf * tf),
        jerk: D * (60 - 360 * tau + 360 * tau ** 2) / (tf ** 3),
        coeffs: [q0, 0, 0, 10 * D / tf ** 3, -15 * D / tf ** 4, 6 * D / tf ** 5]
      };
    },
    /** LSPB with cruise velocity V (same sign as Δ). valid when |Δ|/tf < |V| ≤ 2|Δ|/tf */
    lspb(q0, qf, tf, V, t) {
      const D = qf - q0; const sg = Math.sign(D) || 1; V = sg * Math.abs(V);
      const valid = Math.abs(D) / tf < Math.abs(V) && Math.abs(V) <= 2 * Math.abs(D) / tf + 1e-12;
      const tb = (q0 - qf + V * tf) / V; const a = V / tb; t = clamp(t, 0, tf);
      let q, qd, qdd;
      if (t < tb) { q = q0 + 0.5 * a * t * t; qd = a * t; qdd = a; }
      else if (t <= tf - tb) { q = q0 + 0.5 * a * tb * tb + V * (t - tb); qd = V; qdd = 0; }
      else { const tr = tf - t; q = qf - 0.5 * a * tr * tr; qd = a * tr; qdd = -a; }
      return { q, qd, qdd, tb, a, valid };
    },
    /** minimum-time trapezoid for Vmax, amax (eq. 3.26); triangular if Δ small */
    minTime(D, Vmax, amax) {
      D = Math.abs(D);
      if (D < Vmax * Vmax / amax) { const tf = 2 * Math.sqrt(D / amax); return { tf, triangular: true, Vpeak: amax * tf / 2 }; }
      return { tf: D / Vmax + Vmax / amax, triangular: false, Vpeak: Vmax };
    }
  };

  /* ---------- ODE integration ---------- */
  function rk4(f, x, t, h) {
    const k1 = f(t, x);
    const k2 = f(t + h / 2, x.map((v, i) => v + h / 2 * k1[i]));
    const k3 = f(t + h / 2, x.map((v, i) => v + h / 2 * k2[i]));
    const k4 = f(t + h, x.map((v, i) => v + h * k3[i]));
    return x.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }

  /* ---------- instrumentation (Unit I) ---------- */
  const inst = {
    mean: a => a.reduce((s, v) => s + v, 0) / a.length,
    std(a) { const m = inst.mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); },
    leastSquares(x, y) {
      const n = x.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; sxy += x[i] * y[i]; }
      const m = (n * sxy - sx * sy) / (n * sxx - sx * sx); const c = (sy - m * sx) / n;
      const res = x.map((xi, i) => y[i] - (m * xi + c));
      return { m, c, res, maxRes: res.reduce((a, r) => Math.abs(r) > Math.abs(a) ? r : a, 0) };
    },
    loadingVoltage: (VTh, RTh, Rm) => VTh * Rm / (RTh + Rm),
    loadedPot: (x, Vs, Rp, RL) => Vs * x / (1 + (Rp / RL) * x * (1 - x)),
    firstOrderStep: (K, u0, tau, t) => K * u0 * (1 - Math.exp(-t / tau)),
    firstOrderFreq: (w, tau) => ({ M: 1 / Math.sqrt(1 + (w * tau) ** 2), phi: -Math.atan(w * tau) }),
    secondOrderStep(zeta, wn, t) {
      if (zeta < 1) { const wd = wn * Math.sqrt(1 - zeta * zeta), ph = Math.acos(zeta); return 1 - Math.exp(-zeta * wn * t) * Math.sin(wd * t + ph) / Math.sqrt(1 - zeta * zeta); }
      if (Math.abs(zeta - 1) < 1e-9) return 1 - Math.exp(-wn * t) * (1 + wn * t);
      const s1 = -wn * (zeta - Math.sqrt(zeta * zeta - 1)), s2 = -wn * (zeta + Math.sqrt(zeta * zeta - 1));
      return 1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s1 - s2);
    },
    secondOrderIdx(zeta, wn) { const wd = wn * Math.sqrt(1 - zeta * zeta); return { Mp: zeta < 1 ? Math.exp(-zeta * PI / Math.sqrt(1 - zeta * zeta)) : 0, tp: zeta < 1 ? PI / wd : Infinity, ts: 4 / (zeta * wn), wd }; },
    secondOrderFreq: (r, zeta) => ({ M: 1 / Math.sqrt((1 - r * r) ** 2 + (2 * zeta * r) ** 2), phi: -Math.atan2(2 * zeta * r, 1 - r * r) }),
    rss: rel => Math.sqrt(rel.reduce((s, v) => s + v * v, 0)),
    rtdCVD: (T, R0 = 100, A = 3.9083e-3, B = -5.775e-7) => R0 * (1 + A * T + B * T * T),
    ntc: (Tc, R25 = 10000, beta = 3950) => R25 * Math.exp(beta * (1 / (Tc + 273.15) - 1 / 298.15)),
    ntcInverse: (R, R25 = 10000, beta = 3950) => 1 / (1 / 298.15 + Math.log(R / R25) / beta) - 273.15,
    /** type K reference EMF E(T,0) in mV: IEC 60584 tabulated points, linear interpolation between them */
    typeKTable: [[-100, -3.554], [-50, -1.889], [0, 0], [25, 1.000], [50, 2.023], [100, 4.096], [150, 6.138], [200, 8.138], [250, 10.153], [300, 12.209], [350, 14.293], [400, 16.397], [450, 18.516], [500, 20.644], [600, 24.905], [700, 29.129], [800, 33.275], [900, 37.326], [1000, 41.276]],
    typeK_mV(T) { const t = inst.typeKTable; if (T <= t[0][0]) return t[0][1]; for (let i = 1; i < t.length; i++) if (T <= t[i][0]) { const [x0, y0] = t[i - 1], [x1, y1] = t[i]; return y0 + (y1 - y0) * (T - x0) / (x1 - x0); } return t[t.length - 1][1]; },
    typeK_inverse(E) { const t = inst.typeKTable; for (let i = 1; i < t.length; i++) if (E <= t[i][1]) { const [x0, y0] = t[i - 1], [x1, y1] = t[i]; return x0 + (x1 - x0) * (E - y0) / (y1 - y0); } return t[t.length - 1][0]; },
    manometer: (rho, h, g = g0) => rho * g * h,
    diaphragm: (p, a, t, E, nu) => 3 * p * (1 - nu * nu) * a ** 4 / (16 * E * t ** 3),
    diaphragmCentreStrain: (p, a, t, E, nu) => 3 * p * a * a * (1 - nu * nu) / (8 * E * t * t),
    cantileverStrain: (F, L, E, b, h) => 6 * F * L / (E * b * h * h),
    shaftStrain45: (T, d, G) => 8 * T / (PI * d ** 3 * G),
    /** Wheatstone bridge, arms R1..R4, output between mid-points (exact) */
    bridge(Vex, R1, R2, R3, R4) { return Vex * (R1 / (R1 + R2) - R4 / (R3 + R4)); },
    quarterBridgeExact: (Vex, R, dR) => Vex * dR / (2 * (2 * R + dR)),
    ultrasonicSpeed: T => 331.3 + 0.606 * T,
    capacitance: (er, A, d) => 8.854e-12 * er * A / d,
    hall: (I, B, n, t) => I * B / (n * 1.602e-19 * t),
    encoderRes: (N, x4 = true) => 360 / (x4 ? 4 * N : N),
    gray: b => b ^ (b >> 1),
    grayToBin: g => { let b = g; for (let s = g >> 1; s; s >>= 1) b ^= s; return b; },
    grubler: (m, N, J, sumF) => m * (N - 1 - J) + sumF,
    cylVolume: (dth, rmin, rmax, h) => dth / 2 * (rmax * rmax - rmin * rmin) * h,
    sphVolume: (dth, rmin, rmax, p1, p2) => dth / 3 * (rmax ** 3 - rmin ** 3) * (Math.sin(p2) - Math.sin(p1))
  };

  /* ---------- actuators (Unit II) ---------- */
  const act = {
    pneumatic: (eta, p, D, d) => { const A = PI * D * D / 4, a = PI * d * d / 4; return { A, a, Fext: eta * p * A, Fret: eta * p * (A - a) }; },
    freeAir: (A, a, s, p, pa = 101300) => (2 * A - a) * s * (p + pa) / pa,
    hydraulic: (p, D, Q) => { const A = PI * D * D / 4; return { A, F: p * A, v: Q / A, P: p * Q }; },
    dcSteady(Va, Ra, Kt, Kb, T) { const ia = T / Kt, Eb = Va - ia * Ra, w = Eb / Kb; return { ia, Eb, w, Po: T * w, Pi: Va * ia, eta: (T * w) / (Va * ia), Ts: Kt * Va / Ra, w0: Va / Kb, Pmax: Kt * Va / Ra * Va / Kb / 4 }; },
    /** state x=[ia, w, theta]; dynamics eq 2.8 + J dw/dt = Kt ia − B w − TL */
    /** state x=[ia, w, theta]: La dia/dt = Va − Ra ia − Kb w (2.8);  J dw/dt = Kt ia − B w − TL */
    dcDeriv(p) { return (t, x) => [(p.Va - p.Ra * x[0] - p.Kb * x[1]) / p.La, (p.Kt * x[0] - p.B * x[1] - p.TL) / p.J, x[1]]; },
    stepAngle: (m, Nr) => 360 / (m * Nr),
    stepSpeed: (f, S) => 60 * f / S,
    solenoid: (N, I, A, g) => (N * I) ** 2 * 4 * PI * 1e-7 * A / (2 * g * g),
    screw: (T, p, eta, nrps) => ({ F: 2 * PI * eta * T / p, v: p * nrps }),
    gear: (n, eta, Tm, Jm, JL) => ({ TL: n * eta * Tm, Jeq: Jm + JL / (n * n) }),
    harmonic: (Nf, Nc) => Nf / (Nc - Nf),
    grip: (S, m, a, nf, mu, g = g0) => S * m * (g + a) / (nf * mu),
    rcServoAngle: tp_ms => 180 * (tp_ms - 1) / 1
  };

  /* ---------- signal conditioning, conversion (Unit II) ---------- */
  const sig = {
    inamp: (R, RG, R2, R3) => (1 + 2 * R / RG) * R3 / R2,
    cmrrDb: (Ad, Acm) => 20 * Math.log10(Ad / Acm),
    rcCutoff: (R, C) => 1 / (2 * PI * R * C),
    lowpassMag: (f, fc, n = 1) => 1 / Math.sqrt(1 + (f / fc) ** (2 * n)),
    highpassMag: (f, fc, n = 1) => 1 / Math.sqrt(1 + (fc / f) ** (2 * n)),
    adcStep: (FSR, N) => FSR / 2 ** N,
    snrDb: N => 6.02 * N + 1.76,
    /** ideal rounding ADC code eq 4.3 */
    adcCode: (v, Vref, N) => clamp(Math.round(v * (2 ** N - 1) / Vref), 0, 2 ** N - 1),
    /** truncating ADC with step Q = FSR/2^N (used by SAR) */
    adcTrunc: (v, Vref, N) => clamp(Math.floor(v / (Vref / 2 ** N)), 0, 2 ** N - 1),
    sar(vin, Vref, N) {
      let code = 0; const steps = [];
      for (let b = N - 1; b >= 0; b--) {
        const trial = code | (1 << b); const vdac = Vref * trial / 2 ** N; const keep = vin >= vdac;
        steps.push({ bit: b, trial, vdac, keep }); if (keep) code = trial;
      }
      return { code, steps, vout: Vref * code / 2 ** N };
    },
    dac: (D, Vref, N) => Vref * D / 2 ** N,
    daqRate: (n, fs, N) => n * fs * N,
    toBin: (v, N) => v.toString(2).padStart(N, '0')
  };

  /* ---------- Unit IV ---------- */
  const auto = {
    plcScan: (Tin, Tprog, Tout, Tcomm) => Tin + Tprog + Tout + Tcomm,
    plcResponse: (Tfilter, Tscan, Tout) => Tfilter + 2 * Tscan + Tout,
    pwmTimer: (fclk, PSC, ARR, CCR) => ({ f: fclk / ((PSC + 1) * (ARR + 1)), D: CCR / (ARR + 1), bits: Math.log2(ARR + 1) }),
    uartThroughput: (baud, bitsPerFrame = 10) => baud / bitsPerFrame,
    lens(f, W, ws) { const m = ws / W; const u = f * (1 + m) / m; const v = 1 / (1 / f - 1 / u); return { m, u, v }; },
    diffDrive: (r, b, wR, wL) => ({ v: r / 2 * (wR + wL), w: r / b * (wR - wL) }),
    oee: (A, P, Q) => A * P * Q
  };

  /* ---------- image processing (Unit IV, eqs 4.9–4.13) on Float32 gray images ---------- */
  const img = {
    make: (w, h, fill = 0) => ({ w, h, d: new Float32Array(w * h).fill(fill) }),
    clone: I => ({ w: I.w, h: I.h, d: new Float32Array(I.d) }),
    convolve(I, k) {
      const n = Math.sqrt(k.length) | 0, r = n >> 1, O = img.make(I.w, I.h);
      for (let y = 0; y < I.h; y++) for (let x = 0; x < I.w; x++) {
        let s = 0;
        for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
          const xx = clamp(x + i, 0, I.w - 1), yy = clamp(y + j, 0, I.h - 1);
          s += k[(j + r) * n + (i + r)] * I.d[yy * I.w + xx];
        }
        O.d[y * I.w + x] = s;
      }
      return O;
    },
    gauss3: [1, 2, 1, 2, 4, 2, 1, 2, 1].map(v => v / 16),
    box3: new Array(9).fill(1 / 9),
    median3(I) {
      const O = img.make(I.w, I.h), b = [];
      for (let y = 0; y < I.h; y++) for (let x = 0; x < I.w; x++) {
        b.length = 0;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) b.push(I.d[clamp(y + j, 0, I.h - 1) * I.w + clamp(x + i, 0, I.w - 1)]);
        b.sort((a, c) => a - c); O.d[y * I.w + x] = b[4];
      }
      return O;
    },
    sobel(I) {
      const gx = img.convolve(I, [-1, 0, 1, -2, 0, 2, -1, 0, 1]), gy = img.convolve(I, [-1, -2, -1, 0, 0, 0, 1, 2, 1]);
      const M = img.make(I.w, I.h);
      for (let i = 0; i < M.d.length; i++) M.d[i] = Math.hypot(gx.d[i], gy.d[i]);
      return { M, gx, gy };
    },
    histogram(I, bins = 256) { const h = new Array(bins).fill(0); for (const v of I.d) h[clamp(Math.round(v), 0, bins - 1)]++; return h; },
    otsu(I) {
      const h = img.histogram(I), N = I.d.length; let sum = 0; for (let i = 0; i < 256; i++) sum += i * h[i];
      let sB = 0, wB = 0, best = 0, T = 128;
      for (let t = 0; t < 256; t++) {
        wB += h[t]; if (!wB) continue; const wF = N - wB; if (!wF) break;
        sB += t * h[t]; const mB = sB / wB, mF = (sum - sB) / wF; const between = wB * wF * (mB - mF) ** 2;
        if (between > best) { best = between; T = t; }
      }
      return T;
    },
    threshold(I, T, invert = false) { const O = img.make(I.w, I.h); for (let i = 0; i < I.d.length; i++) O.d[i] = ((I.d[i] > T) !== invert) ? 1 : 0; return O; },
    /** 4-connected component labelling with moments: area, centroid, bbox, orientation, perimeter */
    blobs(B, minArea = 1) {
      const { w, h } = B, lab = new Int32Array(w * h), out = []; let id = 0; const stack = [];
      for (let s = 0; s < w * h; s++) {
        if (!B.d[s] || lab[s]) continue; id++;
        let m00 = 0, m10 = 0, m01 = 0, m20 = 0, m02 = 0, m11 = 0, x0 = w, y0 = h, x1 = 0, y1 = 0, per = 0;
        stack.push(s); lab[s] = id;
        while (stack.length) {
          const p = stack.pop(), x = p % w, y = (p / w) | 0;
          m00++; m10 += x; m01 += y; m20 += x * x; m02 += y * y; m11 += x * y;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          let edge = false;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) { edge = true; continue; }
            const q = yy * w + xx;
            if (!B.d[q]) { edge = true; continue; }
            if (!lab[q]) { lab[q] = id; stack.push(q); }
          }
          if (edge) per++;
        }
        if (m00 < minArea) continue;
        const cx = m10 / m00, cy = m01 / m00;
        const mu20 = m20 - cx * m10, mu02 = m02 - cy * m01, mu11 = m11 - cx * m01;
        out.push({ id, area: m00, cx, cy, bbox: [x0, y0, x1, y1], theta: 0.5 * Math.atan2(2 * mu11, mu20 - mu02), mu20, mu02, mu11, perimeter: per, circularity: 4 * PI * m00 / (per * per) });
      }
      return { blobs: out, labels: lab };
    },
    /** Harris corner response on a gray image; returns list of {x,y,r} local maxima */
    harris(I, k = 0.05, thrRel = 0.1, maxN = 60) {
      const { gx, gy } = img.sobel(I); const w = I.w, h = I.h;
      const xx = img.make(w, h), yy = img.make(w, h), xy = img.make(w, h);
      for (let i = 0; i < w * h; i++) { xx.d[i] = gx.d[i] ** 2; yy.d[i] = gy.d[i] ** 2; xy.d[i] = gx.d[i] * gy.d[i]; }
      const A = img.convolve(xx, img.gauss3), B = img.convolve(yy, img.gauss3), C = img.convolve(xy, img.gauss3);
      const R = new Float32Array(w * h); let mx = 0;
      for (let i = 0; i < w * h; i++) { R[i] = A.d[i] * B.d[i] - C.d[i] ** 2 - k * (A.d[i] + B.d[i]) ** 2; if (R[i] > mx) mx = R[i]; }
      const pts = [];
      for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
        const r = R[y * w + x]; if (r < thrRel * mx) continue; let isMax = true;
        for (let j = -2; j <= 2 && isMax; j++) for (let i = -2; i <= 2; i++) if ((i || j) && R[(y + j) * w + x + i] > r) { isMax = false; break; }
        if (isMax) pts.push({ x, y, r });
      }
      pts.sort((a, b) => b.r - a.r); return pts.slice(0, maxN);
    }
  };

  /* ---------- formatting ---------- */
  function fmt(v, digits = 3) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
    const a = Math.abs(v);
    if (a !== 0 && (a < 1e-3 || a >= 1e6)) return v.toExponential(Math.max(1, digits - 1)).replace('-', '−');
    return v.toFixed(digits).replace('-', '−');
  }
  function eng(v, unit = '', digits = 3) {
    if (!Number.isFinite(v)) return fmt(v);
    const a = Math.abs(v); if (a === 0) return '0 ' + unit;
    const pre = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f']];
    for (const [s, p] of pre) if (a >= s * 0.9995) return (v / s).toPrecision(digits).replace('-', '−') + ' ' + p + unit;
    return v.toExponential(2) + ' ' + unit;
  }
  /** deterministic pseudo-random generator for reproducible noise */
  function rng(seed = 1) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function gaussRand(r) { const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * PI * v); }

  return { PI, D2R, R2D, g0, clamp, lerp, wrapPi, v3, mat, rotX, rotY, rotZ, rpy, rpyFromR, homog, Rof, pof, invT, applyT, transl, TrotX, TrotY, TrotZ, dh, fkDH, jacobianGeo, orientError, ikDLS, planar2R, planarFK, planarJ, traj, rk4, inst, act, sig, auto, img, fmt, eng, rng, gaussRand };
});
