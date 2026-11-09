/* Unit III — 3D laboratories: coordinate transformations, rotation matrices, homogeneous transforms, DH parameters,
   6-DOF forward kinematics. All matrices shown are the ones used to place the 3D objects. */
(function () {
  const RIL = window.RIL, M = RIL.M, D2R = M.D2R, R2D = M.R2D, PI = Math.PI;
  const K = () => RIL.three;
  const mat = (A, d, l) => RIL.ui.matrix(A, d, l);
  const vfmt = (v, d = 3) => '(' + v.map(x => M.fmt(Math.abs(x) < 5e-12 ? 0 : x, d)).join(', ') + ')';
  const arrowObj = (color) => { const a = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, color, 0.08, 0.045); return a; };
  const setArrow = (a, from, to) => { const d = M.v3.sub(to, from), L = M.v3.norm(d); a.position.set(...from); a.visible = L > 1e-6; if (L > 1e-6) { a.setDirection(new THREE.Vector3(...d).normalize()); a.setLength(L, Math.min(0.12, L * 0.25), Math.min(0.06, L * 0.12)); } };

  /* ================= Coordinate transformation lab (Topic III.1) ================= */
  RIL.defineSim({
    id: 'coordinate-transform-lab', title: 'Coordinate transformation laboratory', unit: 3, category: 'coordinate-transformations', kind: '3d', auto: true, autoDefault: false,
    description: 'Frame {B} is translated and rotated relative to the fixed frame {A}; a point known in {B} is mapped to {A} by ᴬp = ᴬ_B R ᴮp + ᴬp_{B,org} (3.2). A third frame {C} attached to {B} shows relative transformations ᴬ_C T = ᴬ_B T ᴮ_C T, and the transformation sequence (translate-then-rotate versus rotate-then-translate) can be compared.',
    help: 'Change the translation and roll–pitch–yaw angles of {B} and the coordinates of the point in {B}. The amber arrow is ᴬp_{B,org}, the cyan arrow is ᴮp drawn in {B}, the green arrow is the result ᴬp. Switch the sequence to see that the order of translation and rotation matters; the ghost frame shows the other order.',
    camera: { position: [2.6, -2.2, 1.9], target: [0.4, 0.3, 0.3] },
    controls: [
      { id: 'x', label: 'Translation x of {B}', min: -1, max: 1, step: 0.01, value: 0.6, unit: 'm' }, { id: 'y', label: 'Translation y', min: -1, max: 1, step: 0.01, value: 0.4, unit: 'm' }, { id: 'z', label: 'Translation z', min: -1, max: 1, step: 0.01, value: 0.2, unit: 'm' },
      { id: 'g', label: 'Roll γ (about x)', min: -180, max: 180, step: 1, value: 0, unit: '°' }, { id: 'b', label: 'Pitch β (about y)', min: -90, max: 90, step: 1, value: 0, unit: '°' }, { id: 'a', label: 'Yaw α (about z)', min: -180, max: 180, step: 1, value: 30, unit: '°' },
      { id: 'px', label: 'ᴮp_x', min: -1, max: 1, step: 0.01, value: 0.5, unit: 'm' }, { id: 'py', label: 'ᴮp_y', min: -1, max: 1, step: 0.01, value: 0.3, unit: 'm' }, { id: 'pz', label: 'ᴮp_z', min: -1, max: 1, step: 0.01, value: 0, unit: 'm' },
      { id: 'seq', type: 'select', label: 'Transformation sequence', string: true, value: 'TR', options: [['TR', 'Translate, then rotate about the moved axes: T = Trans·R'], ['RT', 'Rotate, then translate along fixed axes after rotation: T = R·Trans']] },
      { id: 'showC', type: 'toggle', label: 'Show frame {C} attached to {B}', value: true }
    ],
    readouts: [{ id: 'pA', label: 'ᴬp (in frame A)', unit: 'm' }, { id: 'pB', label: 'ᴮp (in frame B)', unit: 'm' }, { id: 'len', label: '|ᴮp| = |ᴬp − ᴬp_B,org| (rigid)', unit: 'm' }, { id: 'oC', label: 'Origin of {C} in {A}', unit: 'm' }],
    panels: [{ id: 'm', title: 'Transformations', wide: true }],
    equations: ['{}^{A}\\mathbf p={}^{A}_{B}R\\,{}^{B}\\mathbf p+{}^{A}\\mathbf p_{B,org}\\;(3.2)', '{}^{A}_{C}T={}^{A}_{B}T\\,{}^{B}_{C}T'],
    setup(S) {
      const k = K(), sc = S.three.scene; S.fA = k.frame(0.4); sc.add(S.fA); S.fB = k.frame(0.3); sc.add(S.fB); S.ghost = k.frame(0.22, { opacity: 0.3 }); sc.add(S.ghost); S.fC = k.frame(0.2); sc.add(S.fC);
      S.aT = arrowObj(0xf2a516); S.aP = arrowObj(0x4cc2ff); S.aR = arrowObj(0x6fe39b); sc.add(S.aT, S.aP, S.aR);
      S.pt = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); sc.add(S.pt);
      S.three.label('{A}', [0, 0, 0], '', [0, 0, -0.07]); S.lB = S.three.label('{B}', S.fB, '', [0, 0, -0.06]); S.lC = S.three.label('{C}', S.fC, 'dim', [0, 0, -0.05]); S.lg = S.three.label('other order', S.ghost, 'dim', [0, 0, 0.1]); S.three.label('p', S.pt, '', [0.04, 0, 0.04]);
    },
    step(S) { if (S.auto) { S.setParam('a', Math.round(90 * Math.sin(0.4 * S.t)), true); S.setParam('g', Math.round(40 * Math.sin(0.3 * S.t + 1)), true); } },
    draw(S) {
      const p = S.p, k = K(); const R = M.rpy(p.g * D2R, p.b * D2R, p.a * D2R), t = [p.x, p.y, p.z];
      const TT = M.homog(M.mat.eye(3), t), TR = M.homog(R, [0, 0, 0]);
      const TAB = p.seq === 'TR' ? M.mat.mul(TT, TR) : M.mat.mul(TR, TT), other = p.seq === 'TR' ? M.mat.mul(TR, TT) : M.mat.mul(TT, TR);
      k.applyT(S.fB, TAB); k.applyT(S.ghost, other);
      const TBC = M.mat.mul(M.transl(0.25, 0, 0.15), M.TrotX(-PI / 2)), TAC = M.mat.mul(TAB, TBC); k.applyT(S.fC, TAC); S.fC.visible = p.showC; S.lC.visible = p.showC;
      const pB = [p.px, p.py, p.pz], pA = M.applyT(TAB, pB), oB = M.pof(TAB);
      setArrow(S.aT, [0, 0, 0], oB); setArrow(S.aP, oB, pA); setArrow(S.aR, [0, 0, 0], pA); S.pt.position.set(...pA);
      S.set('pA', vfmt(pA)); S.set('pB', vfmt(pB)); S.set('len', M.v3.norm(M.v3.sub(pA, oB))); S.set('oC', vfmt(M.pof(TAC)));
      RIL.setHTML(S.panel('m'), mat(M.Rof(TAB), 4, '<sup>A</sup><sub>B</sub>R =') + RIL.ui.vec(oB, 3, '<sup>A</sup>p<sub>B,org</sub> =') + mat(TAB, 3, '<sup>A</sup><sub>B</sub>T =') + mat(TBC, 3, '<sup>B</sup><sub>C</sub>T =') + mat(TAC, 3, '<sup>A</sup><sub>C</sub>T =') + `<p style="margin:.4em 0 0;color:#8fa3c4">ᴬp = ᴬ_B R ᴮp + ᴬp_B,org = ${vfmt(pA)} m. The ghost frame uses ${p.seq === 'TR' ? 'R·Trans' : 'Trans·R'}: origin ${vfmt(M.pof(other))} — different, so the order matters.</p>`, S, 'm');
    }
  });

  /* ================= Rotation matrices (Topic III.2) ================= */
  RIL.defineSim({
    id: 'rotation-matrix', title: 'Rotation matrices: elementary rotations and roll–pitch–yaw', unit: 3, category: 'coordinate-transformations', kind: '3d', auto: true, autoDefault: false,
    description: 'Rotate a frame about x, y or z (3.4) or by roll–pitch–yaw R = R_z(α)R_y(β)R_x(γ) (3.5). The initial frame, the rotated frame, a vector before and after rotation, the live matrix and its properties (orthonormal columns, det R = +1, Rᵀ = R⁻¹) are displayed. Fixed-axis and current-axis composition are compared.',
    help: 'Choose the rotation and angle; press Start to animate from 0 to the angle. Defaults reproduce Example 3.1 (30° about z, ᴮp = (1, 2, 0) → (−0.134, 2.232, 0)). In RPY mode use γ = 30°, β = 45°, α = 60° for Example 3.2.',
    camera: { position: [2.3, -2.6, 2.0], target: [0.3, 0.6, 0.2] },
    controls: [
      { id: 'mode', type: 'select', label: 'Rotation', string: true, value: 'z', options: [['x', 'About x: R_x(θ)'], ['y', 'About y: R_y(θ)'], ['z', 'About z: R_z(θ)'], ['rpy', 'Roll–pitch–yaw R_z(α)R_y(β)R_x(γ)'], ['cur', 'Same angles about current axes: R_x(γ)R_y(β)R_z(α)']] },
      { id: 'th', label: 'Angle θ | yaw α', min: -180, max: 180, step: 0.5, value: 30, unit: '°' },
      { id: 'be', label: 'Pitch β', min: -90, max: 90, step: 0.5, value: 45, unit: '°' },
      { id: 'ga', label: 'Roll γ', min: -180, max: 180, step: 0.5, value: 30, unit: '°' },
      { id: 'vx', label: 'Vector ᴮp_x', min: -2, max: 2, step: 0.01, value: 1, unit: 'm' }, { id: 'vy', label: 'Vector ᴮp_y', min: -2, max: 2, step: 0.01, value: 2, unit: 'm' }, { id: 'vz', label: 'Vector ᴮp_z', min: -2, max: 2, step: 0.01, value: 0, unit: 'm' }
    ],
    readouts: [{ id: 'p', label: 'ᴬp = R ᴮp', unit: 'm' }, { id: 'n', label: '|ᴮp| and |ᴬp|', unit: 'm' }, { id: 'det', label: 'det R' }, { id: 'orth', label: 'max |RᵀR − I|' }, { id: 'rpy', label: 'Recovered (γ, β, α)', unit: '°' }],
    panels: [{ id: 'm', title: 'Rotation matrix (updates live)', wide: true }],
    equations: ['R_z(\\theta)=\\begin{bmatrix}c&-s&0\\\\s&c&0\\\\0&0&1\\end{bmatrix}\\;(3.4)', 'R_{RPY}=R_z(\\alpha)R_y(\\beta)R_x(\\gamma)\\;(3.5)'],
    autostart: false, stepDt: 0.05,
    reset(S) { S.prog = 1; },
    onControl(S, id) { if (id === 'mode' || id === 'th' || id === 'be' || id === 'ga') S.prog = 1; },
    setup(S) {
      const k = K(), sc = S.three.scene; S.f0 = k.frame(0.9, { opacity: 0.3 }); sc.add(S.f0); S.f1 = k.frame(0.9); sc.add(S.f1);
      S.v0 = arrowObj(0x8fa3c4); S.v1 = arrowObj(0xf2a516); sc.add(S.v0, S.v1);
      S.lab = S.three.label('ᴬp', [0, 0, 0], ''); S.lab0 = S.three.label('ᴮp (before)', [0, 0, 0], 'dim');
      S.arc = k.polyline([[0, 0, 0], [0, 0, 0]], 0x6fe39b); sc.add(S.arc);
      const grid = sc.children.find(o => o.type === 'GridHelper'); if (grid) grid.scale.set(1.5, 1.5, 1.5);
    },
    step(S, dt) { if (S.running) { S.prog = Math.min(1, (S.prog >= 1 ? 0 : S.prog) + dt * 0.5); if (S.prog >= 1) S.pause(); } },
    R(S, f) { const p = S.p, th = p.th * D2R * f, b = p.be * D2R * f, g = p.ga * D2R * f; if (p.mode === 'x') return M.rotX(th); if (p.mode === 'y') return M.rotY(th); if (p.mode === 'z') return M.rotZ(th); if (p.mode === 'rpy') return M.rpy(g, b, th); return M.mat.mul(M.rotX(g), M.mat.mul(M.rotY(b), M.rotZ(th))); },
    draw(S) {
      const p = S.p, k = K(), f = S.prog ?? 1, R = this.R(S, f), Rf = this.R(S, 1); k.applyT(S.f1, M.homog(R, [0, 0, 0]));
      const v = [p.vx, p.vy, p.vz], pr = M.mat.mulVec(R, v); setArrow(S.v0, [0, 0, 0], v); setArrow(S.v1, [0, 0, 0], pr); S.lab.pos = pr; S.lab0.pos = v;
      const arc = []; for (let i = 0; i <= 30; i++) arc.push(M.mat.mulVec(this.R(S, f * i / 30), v)); k.updateLine(S.arc, arc);
      const pf = M.mat.mulVec(Rf, v), det = M.mat.det(Rf), RtR = M.mat.mul(M.mat.T(Rf), Rf); let orth = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) orth = Math.max(orth, Math.abs(RtR[i][j] - (i === j ? 1 : 0)));
      const e = M.rpyFromR(Rf);
      S.set('p', vfmt(pf)); S.set('n', M.fmt(M.v3.norm(v), 4) + ', ' + M.fmt(M.v3.norm(pf), 4)); S.set('det', det, ''); S.set('orth', orth); S.set('rpy', vfmt([e.gamma * R2D, e.beta * R2D, e.alpha * R2D], 2));
      const note = p.mode === 'cur' ? 'Current (moving) axes: post-multiply, R = R_x(γ)R_y(β)R_z(α). Compare with fixed-axis RPY (pre-multiply) — the results differ unless the rotations commute.' : p.mode === 'rpy' ? 'Fixed axes: γ about x, then β about y, then α about z (each about the fixed frame) — pre-multiplication.' : 'Columns of R are the unit vectors of the rotated frame expressed in the original frame.';
      RIL.setHTML(S.panel('m'), mat(Rf, 4, 'R =') + RIL.ui.vec(v, 3, '<sup>B</sup>p =') + RIL.ui.vec(pf, 4, '<sup>A</sup>p = R <sup>B</sup>p =') + `<p style="margin:.4em 0 0;color:#8fa3c4">${note}</p>`, S, 'm');
    }
  });

  /* ================= Homogeneous transformation (Topic III.3) ================= */
  RIL.defineSim({
    id: 'homogeneous-transform', title: 'Homogeneous transformation simulator', unit: 3, category: 'coordinate-transformations', kind: '3d', auto: false,
    description: 'Rotation and translation combined in one 4 × 4 matrix T = [R t; 0 1] (3.6). A point in {B} is transformed with homogeneous coordinates, and the inverse [Rᵀ −Rᵀt; 0 1] (3.8) maps it back. Defaults reproduce Example 3.3.',
    help: 'Set the rotation (axis and angle) and translation of {B} and the point ᴮp. The display shows T, the homogeneous point, ᴬp̃ = T ᴮp̃ and the inverse check T⁻¹ ᴬp̃ = ᴮp̃.',
    camera: { position: [5, -4, 4.5], target: [2, 1, 0] },
    controls: [
      { id: 'ax', type: 'select', label: 'Rotation axis', string: true, value: 'z', options: [['x', 'x'], ['y', 'y'], ['z', 'z']] },
      { id: 'th', label: 'Rotation angle θ', min: -180, max: 180, step: 1, value: 90, unit: '°' },
      { id: 'tx', label: 'Translation t_x', min: -4, max: 4, step: 0.05, value: 3, unit: 'm' }, { id: 'ty', label: 'Translation t_y', min: -4, max: 4, step: 0.05, value: 1, unit: 'm' }, { id: 'tz', label: 'Translation t_z', min: -4, max: 4, step: 0.05, value: 0, unit: 'm' },
      { id: 'px', label: 'ᴮp_x', min: -3, max: 3, step: 0.05, value: 1, unit: 'm' }, { id: 'py', label: 'ᴮp_y', min: -3, max: 3, step: 0.05, value: 1, unit: 'm' }, { id: 'pz', label: 'ᴮp_z', min: -3, max: 3, step: 0.05, value: 0, unit: 'm' }
    ],
    readouts: [{ id: 'pa', label: 'ᴬp', unit: 'm' }, { id: 'back', label: 'T⁻¹ ᴬp (should equal ᴮp)', unit: 'm' }, { id: 'ori', label: 'Orientation of {B} (RPY)', unit: '°' }],
    panels: [{ id: 'm', title: 'Homogeneous matrices', wide: true }],
    equations: ['T=\\begin{bmatrix}R&\\mathbf t\\\\\\mathbf 0^T&1\\end{bmatrix}\\;(3.6)', 'T^{-1}=\\begin{bmatrix}R^T&-R^T\\mathbf t\\\\\\mathbf 0^T&1\\end{bmatrix}\\;(3.8)'],
    setup(S) { const k = K(), sc = S.three.scene; const grid = sc.children.find(o => o.type === 'GridHelper'); if (grid) grid.scale.set(2.5, 2.5, 2.5); S.fA = k.frame(1); sc.add(S.fA); S.fB = k.frame(0.8); sc.add(S.fB); S.a1 = arrowObj(0xf2a516); S.a2 = arrowObj(0x4cc2ff); S.a3 = arrowObj(0x6fe39b); sc.add(S.a1, S.a2, S.a3); S.pt = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); sc.add(S.pt); S.three.label('{A}', [0, 0, 0], '', [0, 0, -0.2]); S.three.label('{B}', S.fB, '', [0, 0, -0.2]); S.three.label('p', S.pt, '', [0.1, 0, 0.1]); },
    draw(S) {
      const p = S.p, k = K(), R = { x: M.rotX, y: M.rotY, z: M.rotZ }[p.ax](p.th * D2R), t = [p.tx, p.ty, p.tz], T = M.homog(R, t); k.applyT(S.fB, T);
      const pb = [p.px, p.py, p.pz], ph = M.mat.mulVec(T, [...pb, 1]), pa = ph.slice(0, 3), Ti = M.invT(T), back = M.mat.mulVec(Ti, ph).slice(0, 3);
      setArrow(S.a1, [0, 0, 0], t); setArrow(S.a2, t, pa); setArrow(S.a3, [0, 0, 0], pa); S.pt.position.set(...pa);
      const e = M.rpyFromR(R); S.set('pa', vfmt(pa)); S.set('back', vfmt(back)); S.set('ori', vfmt([e.gamma * R2D, e.beta * R2D, e.alpha * R2D], 1));
      RIL.setHTML(S.panel('m'), mat(T, 3, '<sup>A</sup><sub>B</sub>T =') + RIL.ui.vec([...pb, 1], 3, '<sup>B</sup>p̃ =') + RIL.ui.vec(ph, 3, '<sup>A</sup>p̃ = T <sup>B</sup>p̃ =') + mat(Ti, 3, 'T<sup>−1</sup> =') + RIL.ui.vec(M.mat.mulVec(Ti, ph), 3, 'T<sup>−1</sup> <sup>A</sup>p̃ ='), S, 'm');
    }
  });

  /* ================= Denavit–Hartenberg laboratory (Topic III.4) ================= */
  const DHP = {
    articulated: { name: 'Articulated RRR (Table 3.3)', t: [{ a: 0, alpha: 90, d: 0.4, theta: 30, type: 'R' }, { a: 0.5, alpha: 0, d: 0, theta: 45, type: 'R' }, { a: 0.4, alpha: 0, d: 0, theta: -60, type: 'R' }] },
    scara: { name: 'SCARA RRP', t: [{ a: 0.4, alpha: 0, d: 0.6, theta: 30, type: 'R' }, { a: 0.3, alpha: 180, d: 0, theta: 45, type: 'R' }, { a: 0, alpha: 0, d: 0.15, theta: 0, type: 'P' }] },
    planar3: { name: 'Planar 3R', t: [{ a: 0.4, alpha: 0, d: 0, theta: 30, type: 'R' }, { a: 0.3, alpha: 0, d: 0, theta: -45, type: 'R' }, { a: 0.1, alpha: 0, d: 0, theta: 60, type: 'R' }] },
    cyl: { name: 'Cylindrical RPP', t: [{ a: 0, alpha: 0, d: 0.5, theta: 30, type: 'R' }, { a: 0, alpha: -90, d: 0.3, theta: 0, type: 'P' }, { a: 0, alpha: 0, d: 0.4, theta: 0, type: 'P' }] },
    stanford: { name: 'Spherical RRP (Stanford-type arm)', t: [{ a: 0, alpha: -90, d: 0.4, theta: 30, type: 'R' }, { a: 0, alpha: 90, d: 0.1, theta: 60, type: 'R' }, { a: 0, alpha: 0, d: 0.5, theta: 0, type: 'P' }] }
  };
  RIL.defineSim({
    id: 'dh-lab', title: 'Denavit–Hartenberg parameter laboratory', unit: 3, category: 'forward-kinematics', kind: '3d', auto: true, autoDefault: false,
    description: 'Edit the DH table (a_i, α_i, d_i, θ_i) of a three-link manipulator. Each row generates A_i = Rot_z(θ_i)Trans_z(d_i)Trans_x(a_i)Rot_x(α_i) (3.9); the frames and links are drawn from the product ⁰T_n, so the 3D robot is exactly what the table says.',
    help: 'Pick a robot, select a link and change its four parameters. The joint variable (θ for revolute, d for prismatic) is highlighted in the table. Turn on Automatic to sweep the joint variables. Articulated defaults reproduce Example 3.5: position (0.6408, 0.3700, 0.6500) m.',
    camera: { position: [1.8, -1.9, 1.5], target: [0.2, 0, 0.45] },
    controls: [
      { id: 'rob', type: 'select', label: 'Manipulator', string: true, value: 'articulated', options: Object.entries(DHP).map(([k, v]) => [k, v.name]) },
      { id: 'link', type: 'select', label: 'Link to edit', value: 1, options: [[1, 'Link 1'], [2, 'Link 2'], [3, 'Link 3']] },
      { id: 'theta', label: 'Joint angle θ_i', min: -180, max: 180, step: 0.5, value: 30, unit: '°' },
      { id: 'd', label: 'Link offset d_i', min: -0.5, max: 1, step: 0.005, value: 0.4, unit: 'm' },
      { id: 'a', label: 'Link length a_i', min: 0, max: 0.8, step: 0.005, value: 0, unit: 'm' },
      { id: 'alpha', label: 'Link twist α_i', min: -180, max: 180, step: 5, value: 90, unit: '°' },
      { id: 'frames', type: 'toggle', label: 'Show all link frames', value: true }
    ],
    readouts: [{ id: 'p', label: 'End-effector position', unit: 'm' }, { id: 'rpy', label: 'Orientation (RPY γ, β, α)', unit: '°' }, { id: 'var', label: 'Joint variables q' }],
    panels: [{ id: 'tbl', title: 'DH parameter table and link transformations', wide: true }],
    equations: ['A_i=\\mathrm{Rot}_z(\\theta_i)\\mathrm{Trans}_z(d_i)\\mathrm{Trans}_x(a_i)\\mathrm{Rot}_x(\\alpha_i)\\;(3.9)', '{}^{0}T_3=A_1A_2A_3'],
    setup(S) { S.build = rob => { if (S.rob) S.rob.dispose(S.three.scene); S.T = JSON.parse(JSON.stringify(DHP[rob].t)); S.rob = new (K().DHRobot)(S.three.scene, S.T.map(r => ({ a: r.a, alpha: r.alpha * D2R, d: r.d, theta: r.theta * D2R, type: r.type })), { radius: 0.035, frames: true, frameSize: 0.14 }); }; S.build('articulated'); S.three.clearLabels(); },
    reset(S) { this.load(S); },
    load(S) { const r = S.T[+S.p.link - 1]; ['theta', 'd', 'a', 'alpha'].forEach(k => S.setParam(k, r[k], true)); },
    onControl(S, id, v) { if (id === 'rob') { S.build(v); this.load(S); return; } if (id === 'link') { this.load(S); return; } if (['theta', 'd', 'a', 'alpha'].includes(id)) S.T[+S.p.link - 1][id] = v; },
    step(S) { if (!S.auto) return; S.T.forEach((r, i) => { if (r.type === 'R') r.theta = +(DHP[S.p.rob].t[i].theta + 40 * Math.sin(0.6 * S.t + i * 1.7)).toFixed(1); else r.d = +(DHP[S.p.rob].t[i].d + 0.1 * Math.sin(0.6 * S.t + i)).toFixed(3); }); const r = S.T[+S.p.link - 1]; S.setParam('theta', r.theta, true); S.setParam('d', r.d, true); },
    draw(S) {
      const tbl = S.T.map(r => ({ a: r.a, alpha: r.alpha * D2R, d: r.d, theta: r.theta * D2R, type: r.type })); S.rob.table.forEach((L, i) => Object.assign(L, tbl[i]));
      const q = tbl.map(r => r.type === 'R' ? r.theta : r.d); const { A, T } = M.fkDH(tbl.map(r => Object.assign({}, r, { offset: 0 })), q);
      S.rob.update(q); S.rob.frames.forEach((f, i) => (f.visible = S.p.frames || i === 0 || i === 3));
      const p = M.pof(T[3]), e = M.rpyFromR(M.Rof(T[3]));
      S.set('p', vfmt(p, 4)); S.set('rpy', vfmt([e.gamma * R2D, e.beta * R2D, e.alpha * R2D], 1)); S.set('var', q.map((v, i) => tbl[i].type === 'R' ? M.fmt(v * R2D, 1) + '°' : M.fmt(v, 3) + ' m').join(', '));
      const rows = S.T.map((r, i) => ({ cells: [i + 1, M.fmt(r.a, 3), M.fmt(r.alpha, 1) + '°', r.type === 'P' ? `<b style="color:#f2a516">${M.fmt(r.d, 3)}*</b>` : M.fmt(r.d, 3), r.type === 'R' ? `<b style="color:#f2a516">${M.fmt(r.theta, 1)}°*</b>` : M.fmt(r.theta, 1) + '°', r.type], hl: i === +S.p.link - 1 }));
      RIL.setHTML(S.panel('tbl'), RIL.ui.kv(rows, ['Link i', 'a_i (m)', 'α_i', 'd_i (m)', 'θ_i', 'Joint']) + '<p style="margin:.3em 0;color:#8fa3c4">* joint variable</p>' + A.map((Ai, i) => mat(Ai, 3, `A<sub>${i + 1}</sub> =`)).join('') + mat(T[3], 4, '<sup>0</sup>T<sub>3</sub> ='), S, 'tbl');
    }
  });

  /* ================= 6-DOF forward kinematics (Topic III.5B) ================= */
  RIL.defineSim({
    id: 'fk-6dof', title: '6-DOF manipulator forward kinematics', unit: 3, category: 'forward-kinematics', kind: '3d', auto: true, autoDefault: false,
    description: 'Six-axis elbow manipulator with spherical wrist (educational DH model). Six joint sliders drive ⁰T₆ = A₁A₂…A₆; the DH table, each individual A_i, the final matrix, end-effector position and orientation are all computed from the same model that places the 3D links.',
    help: 'Move the six joints and choose which link transformation to inspect. The amber trail shows the TCP path in Automatic mode. With all joints at zero the arm is in its DH reference pose.',
    camera: { position: [1.9, -1.9, 1.5], target: [0.25, 0, 0.55] },
    controls: [1, 2, 3, 4, 5, 6].map(i => ({ id: 'q' + i, label: `θ${'₁₂₃₄₅₆'[i - 1]}`, min: -180, max: 180, step: 0.5, value: [0, 30, -20, 0, 40, 0][i - 1], unit: '°' })).concat([
      { id: 'show', type: 'select', label: 'Show link transformation', value: 1, options: [1, 2, 3, 4, 5, 6].map(i => [i, `A${i}`]) },
      { id: 'frames', type: 'toggle', label: 'Show joint frames', value: true }]),
    readouts: [{ id: 'p', label: 'End-effector position ⁰p₆', unit: 'm' }, { id: 'rpy', label: 'Orientation (RPY γ, β, α)', unit: '°' }, { id: 'z', label: 'Approach vector a = z₆' }, { id: 'reach', label: 'Distance from shoulder', unit: 'm' }],
    panels: [{ id: 'm', title: 'DH table, selected A_i and ⁰T₆', wide: true }],
    equations: ['{}^{0}T_6=A_1A_2A_3A_4A_5A_6=\\begin{bmatrix}\\mathbf n&\\mathbf o&\\mathbf a&\\mathbf p\\\\0&0&0&1\\end{bmatrix}'],
    setup(S) { const k = K(); S.rob = new k.DHRobot(S.three.scene, k.ROBOTS.sixR.table, { radius: 0.04, frames: true, frameSize: 0.12 }); S.trail = []; S.line = k.polyline([[0, 0, 0]], 0xf2a516); S.three.scene.add(S.line); },
    reset(S) { S.trail = []; },
    step(S) { if (S.auto) { const t = S.t; [50 * Math.sin(.4 * t), 35 + 25 * Math.sin(.5 * t + 1), -30 + 35 * Math.sin(.45 * t), 60 * Math.sin(.7 * t), 45 + 35 * Math.sin(.6 * t + .5), 90 * Math.sin(.3 * t)].forEach((v, i) => S.setParam('q' + (i + 1), +v.toFixed(1), true)); } },
    draw(S) {
      const k = K(), tb = k.ROBOTS.sixR.table, q = [1, 2, 3, 4, 5, 6].map(i => S.p['q' + i] * D2R); const T = S.rob.update(q); S.rob.setVisibleFrames(S.p.frames);
      const { A } = M.fkDH(tb, q), T6 = T[6], p = M.pof(T6), e = M.rpyFromR(M.Rof(T6));
      if (S.running) { const l = S.trail[S.trail.length - 1]; if (!l || M.v3.norm(M.v3.sub(l, p)) > 0.005) { S.trail.push(p); if (S.trail.length > 400) S.trail.shift(); if (S.trail.length > 1) k.updateLine(S.line, S.trail); } }
      S.set('p', vfmt(p, 4)); S.set('rpy', vfmt([e.gamma * R2D, e.beta * R2D, e.alpha * R2D], 1)); S.set('z', vfmt([T6[0][2], T6[1][2], T6[2][2]], 3)); S.set('reach', M.v3.norm(M.v3.sub(p, [0, 0, 0.4])));
      const i = +S.p.show; const rows = tb.map((L, j) => ({ cells: [j + 1, M.fmt(L.a, 3), M.fmt(L.alpha * R2D, 0) + '°', M.fmt(L.d, 3), `θ${j + 1}${L.offset ? ' + ' + M.fmt(L.offset * R2D, 0) + '°' : ''} = ${M.fmt((q[j] + (L.offset || 0)) * R2D, 1)}°`], hl: j === i - 1 }));
      RIL.setHTML(S.panel('m'), RIL.ui.kv(rows, ['i', 'a_i (m)', 'α_i', 'd_i (m)', 'θ_i']) + mat(A[i - 1], 4, `A<sub>${i}</sub> =`) + mat(T6, 4, '<sup>0</sup>T<sub>6</sub> =') + '<p style="margin:.3em 0 0;color:#8fa3c4">Educational 6R model (elbow arm with spherical wrist, Spong-type DH); not a specific manufacturer\'s robot.</p>', S, 'm');
    }
  });
})();
