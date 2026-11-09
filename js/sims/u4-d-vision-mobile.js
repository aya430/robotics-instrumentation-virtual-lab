/* Unit IV — machine vision laboratory (acquisition, cameras, lighting, processing, features, detection, inspection)
   and autonomous mobile robot. Images are generated from geometric part models and processed with the
   algorithms of Section 4.17–4.19 (convolution, Otsu threshold, Sobel, blob moments, Harris corners).
   No trained AI model is used: classification is rule-based on measured features. */
(function () {
  const RIL = window.RIL, M = RIL.M, D = RIL.draw, C = RIL.C, PI = Math.PI, I = M.img;

  /* ---------- geometric part models (mm, FOV centred at 0,0) ---------- */
  const inRect = (x, y, cx, cy, w, h, a = 0) => { const c = Math.cos(-a), s = Math.sin(-a), dx = x - cx, dy = y - cy; const u = c * dx - s * dy, v = s * dx + c * dy; return Math.abs(u) <= w / 2 && Math.abs(v) <= h / 2; };
  const inCirc = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  const PARTS = {
    bracket: o => ({ inside: (x, y) => inRect(x, y, o.x, o.y, o.w || 60, o.h || 36, o.a || 0) && !(o.holes !== 0 && inCirc(x, y, o.x + Math.cos(o.a || 0) * 15, o.y + Math.sin(o.a || 0) * 15, 6)) && !(o.holes === 2 && inCirc(x, y, o.x - Math.cos(o.a || 0) * 15, o.y - Math.sin(o.a || 0) * 15, 6)), kind: 'rectangular bracket' }),
    washer: o => ({ inside: (x, y) => inCirc(x, y, o.x, o.y, o.r || 16) && !(o.holes !== 0 && inCirc(x, y, o.x, o.y, (o.r || 16) * 0.38)), kind: 'washer' }),
    ell: o => ({ inside: (x, y) => { const c = Math.cos(-(o.a || 0)), s = Math.sin(-(o.a || 0)), dx = x - o.x, dy = y - o.y, u = c * dx - s * dy, v = s * dx + c * dy; return (u >= -22 && u <= 22 && v >= -22 && v <= -8) || (u >= -22 && u <= -8 && v >= -22 && v <= 22); }, kind: 'L-bracket' })
  };
  const defaultScene = () => [PARTS.bracket({ x: -48, y: -18, a: 0.35, holes: 2 }), PARTS.washer({ x: 50, y: -28 }), PARTS.ell({ x: 20, y: 40, a: -0.3 }), PARTS.washer({ x: -60, y: 50, r: 12 })];
  const SCRATCH = { x0: -70, y0: -24, x1: -40, y1: -10 };
  const distSeg = (x, y, s) => { const vx = s.x1 - s.x0, vy = s.y1 - s.y0, t = M.clamp(((x - s.x0) * vx + (y - s.y0) * vy) / (vx * vx + vy * vy), 0, 1); return Math.hypot(x - s.x0 - t * vx, y - s.y0 - t * vy); };
  const LIGHT = { front: 'Ring / direct front lighting', back: 'Backlighting (silhouette)', diffuse: 'Diffuse dome lighting', dark: 'Dark-field (low-angle)', coax: 'Coaxial (on-axis)', struct: 'Structured light (laser line)' };
  /** render a grey image of the scene: Wmm = FOV width, N = pixels across */
  function render(scene, o) {
    const N = o.N, Hn = Math.round(N * (o.aspect || 0.8)), Wmm = o.W, px = Wmm / N, img = I.make(N, Hn); const r = M.rng(o.seed || 3); const L = o.light || 'front';
    const occ = (x, y) => scene.some(p => p.inside(x, y)); const edge = (x, y) => { const a = occ(x, y); return occ(x + 1, y) !== a || occ(x - 1, y) !== a || occ(x, y + 1) !== a || occ(x, y - 1) !== a; };
    const ss = N < 200 ? 2 : 1;
    for (let j = 0; j < Hn; j++) for (let i = 0; i < N; i++) {
      let acc = 0;
      for (let sj = 0; sj < ss; sj++) for (let si = 0; si < ss; si++) {
        const x = (i + (si + 0.5) / ss) * px - Wmm / 2, y = Wmm * (o.aspect || 0.8) / 2 - (j + (sj + 0.5) / ss) * px; const inO = occ(x, y), e = edge(x, y), sc = o.scratch && inO && distSeg(x, y, o.seg || SCRATCH) < 0.6; let v;
        if (L === 'back') v = inO ? 18 : 235;
        else if (L === 'diffuse') v = inO ? (sc ? 135 : 165) : 70;
        else if (L === 'dark') v = inO ? (sc ? 230 : e ? 200 : 32) : 14;
        else if (L === 'coax') v = inO ? (sc ? 60 : e ? 120 : 215) : 40;
        else if (L === 'struct') { const yl = 0 + (inO ? 8 : 0); v = (inO ? 120 : 50) + (Math.abs(y - yl) < 1.2 ? 180 : 0); }
        else { const shadow = !inO && occ(x - 3, y + 3); const glare = inO ? 80 * Math.exp(-((x + 20) ** 2 + (y - 10) ** 2) / 400) : 0; v = inO ? (sc ? 150 : 170 + glare) : (shadow ? 28 : 58); }
        acc += v;
      }
      img.d[j * N + i] = M.clamp(acc / (ss * ss) * (o.gain || 1) + (o.noise || 0) * M.gaussRand(r), 0, 255);
    }
    if (o.blur > 0.05) { let b = img; for (let k = 0; k < Math.round(o.blur * 3); k++) b = I.convolve(b, I.gauss3); return b; }
    return img;
  }
  RIL.visionRender = render;
  /** draw a grey image into a canvas region; optional colour map for labels */
  const drawImg = (S, img, x, y, w, h, map) => { const c = document.createElement('canvas'); c.width = img.w; c.height = img.h; const g = c.getContext('2d'), id = g.createImageData(img.w, img.h); for (let k = 0; k < img.d.length; k++) { const v = img.d[k]; const col = map ? map(v, k) : [v, v, v]; id.data[4 * k] = col[0]; id.data[4 * k + 1] = col[1]; id.data[4 * k + 2] = col[2]; id.data[4 * k + 3] = 255; } g.putImageData(id, 0, 0); S.ctx.imageSmoothingEnabled = false; S.ctx.drawImage(c, x, y, w, h); S.ctx.imageSmoothingEnabled = true; };
  RIL.drawImg = drawImg;
  const holeInfo = (B, b) => { const [x0, y0, x1, y1] = b.bbox; const w = x1 - x0 + 1, h = y1 - y0 + 1; const inv = I.make(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) inv.d[j * w + i] = B.d[(y0 + j) * B.w + x0 + i] ? 0 : 1; const hs = I.blobs(inv, 3).blobs.filter(q => q.bbox[0] > 0 && q.bbox[1] > 0 && q.bbox[2] < w - 1 && q.bbox[3] < h - 1); return { n: hs.length, area: hs.reduce((a, q) => a + q.area, 0) }; };
  /** shape features from the labelled region: calipers along the principal axes give the oriented box */
  const shapeOf = (lab, W, b) => { const c = Math.cos(b.theta), s = Math.sin(b.theta); let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity; const [x0, y0, x1, y1] = b.bbox; for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) if (lab[j * W + i] === b.id) { const u = i * c + j * s, v = -i * s + j * c; a0 = Math.min(a0, u); a1 = Math.max(a1, u); b0 = Math.min(b0, v); b1 = Math.max(b1, v); } const L1 = a1 - a0 + 1, L2 = b1 - b0 + 1; return { L1, L2, aspect: Math.max(L1, L2) / Math.min(L1, L2) }; };
  const holesOf = (B, b) => { const [x0, y0, x1, y1] = b.bbox; const w = x1 - x0 + 1, h = y1 - y0 + 1; const inv = I.make(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) inv.d[j * w + i] = B.d[(y0 + j) * B.w + x0 + i] ? 0 : 1; return I.blobs(inv, 3).blobs.filter(q => q.bbox[0] > 0 && q.bbox[1] > 0 && q.bbox[2] < w - 1 && q.bbox[3] < h - 1).length; };
  const classify = b => b.rect >= 0.86 ? 'rectangular (bracket)' : b.rect >= 0.68 && b.aspect < 1.2 ? 'circular (washer)' : 'L-shape / irregular';

  /* ================= A–C. Image acquisition, cameras and lighting ================= */
  RIL.defineSim({
    id: 'vision-acquisition', title: 'Image acquisition: camera, lens, resolution and lighting', unit: 4, category: 'machine-vision', kind: '2d', auto: false,
    description: 'A camera views industrial parts on a conveyor. The thin-lens relations 1/f = 1/u + 1/v, m = w_s/W, u = f(1 + m)/m (4.7) give the working distance; the spatial resolution is W/N_px (4.8). The digital image is rendered pixel by pixel for the chosen sensor resolution, exposure, noise and lighting technique (Section 4.16), with a zoomed pixel-value view and histogram.',
    help: 'Change the number of pixels across the field of view and see the image and its spatial resolution change; the 0.5 mm scratch on the bracket needs ≥ 2–3 pixels to be seen. Compare lighting techniques: backlight gives a silhouette, dark-field makes the scratch bright, coaxial makes flat metal bright. Example 4.5: W = 256 mm, 1280 px → 0.2 mm/px.',
    controls: [
      { id: 'light', type: 'select', label: 'Lighting technique', string: true, value: 'front', options: Object.entries(LIGHT) },
      { id: 'N', label: 'Pixels across the FOV N_px', min: 32, max: 640, step: 8, value: 320 },
      { id: 'W', label: 'Field-of-view width W', min: 100, max: 400, step: 1, value: 256, unit: 'mm' },
      { id: 'f', label: 'Lens focal length f', min: 4, max: 50, step: 0.5, value: 16, unit: 'mm' },
      { id: 'ws', label: 'Sensor width w_s', min: 3, max: 15, step: 0.1, value: 6.4, unit: 'mm' },
      { id: 'gain', label: 'Exposure × gain', min: 0.2, max: 2.5, step: 0.05, value: 1 },
      { id: 'noise', label: 'Sensor noise σ', min: 0, max: 40, step: 1, value: 6, unit: 'grey levels' },
      { id: 'focus', label: 'Focus error (defocus blur)', min: 0, max: 2, step: 0.05, value: 0 }
    ],
    readouts: [{ id: 'm', label: 'Magnification m = w_s/W' }, { id: 'u', label: 'Working distance u = f(1+m)/m', unit: 'mm' }, { id: 'v', label: 'Image distance v', unit: 'mm' }, { id: 'rs', label: 'Spatial resolution W/N_px', unit: 'mm/px' }, { id: 'def', label: '0.5 mm scratch spans', unit: 'px' }, { id: 'mean', label: 'Mean grey level / saturation' }],
    charts: [{ id: 'h', title: 'Grey-level histogram', x: 'grey level', y: 'pixels', series: [{ label: 'count', stepped: true }] }],
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H; const key = JSON.stringify([p.light, p.N, p.W, p.gain, p.noise, p.focus]);
      if (S._k !== key) { S.img = render(defaultScene(), { N: Math.round(p.N), W: p.W, light: p.light, gain: p.gain, noise: p.noise, blur: p.focus, scratch: true }); S._k = key; const h = I.histogram(S.img); const pts = []; for (let k = 0; k < 256; k += 4) pts.push([k, h.slice(k, k + 4).reduce((a, b) => a + b, 0)]); S.chart('h').set(0, pts); S.mean = I.histogram(S.img).reduce((a, c, i) => a + c * i, 0) / S.img.d.length; S.sat = S.img.d.filter(v => v >= 254.5).length / S.img.d.length; }
      // optics schematic
      const lw = Math.min(330, W * 0.36), ox = 16, oy = 30; const m = p.ws / p.W, u = p.f * (1 + m) / m, v = 1 / (1 / p.f - 1 / u);
      D.text(S, 'Optics (not to scale)', ox, oy - 8, { size: 11, color: C.muted }); const ly = oy + 120; D.line(S, ox + 20, ly - 70, ox + 20, ly + 70, C.cyan, 3); D.text(S, 'object plane (FOV W)', ox + 4, ly + 90, { size: 10, color: C.muted });
      const lx = ox + lw * 0.72; const g = S.ctx; g.strokeStyle = C.amber; g.lineWidth = 2; g.beginPath(); g.ellipse(lx, ly, 6, 40, 0, 0, 2 * PI); g.stroke(); D.text(S, `lens f = ${p.f} mm`, lx - 30, ly - 48, { size: 10.5, color: C.amber });
      const sx = ox + lw - 4; D.line(S, sx, ly - 70 * m * 6, sx, ly + 70 * m * 6, C.green, 4); D.text(S, 'sensor', sx - 30, ly + 70 * m * 6 + 14, { size: 10, color: C.green });
      D.line(S, ox + 20, ly - 70, sx, ly + 70 * m * 6, 'rgba(255,255,255,.35)', 1); D.line(S, ox + 20, ly + 70, sx, ly - 70 * m * 6, 'rgba(255,255,255,.35)', 1);
      D.text(S, `u = ${M.fmt(u, 1)} mm`, (ox + 20 + lx) / 2 - 30, ly + 12, { size: 11 }); D.text(S, `v = ${M.fmt(v, 2)} mm`, (lx + sx) / 2 - 20, ly + 12, { size: 11 });
      D.text(S, LIGHT[p.light], ox, H - 14, { size: 12, weight: 650, color: C.amber });
      // image
      const ix = ox + lw + 20, iw = W - ix - 16, ih = iw * 0.8 > H - 140 ? H - 140 : iw * 0.8, iw2 = ih / 0.8; drawImg(S, S.img, ix, 20, iw2, ih); D.rect(S, ix, 20, iw2, ih, null, '#3a5384', 1);
      D.text(S, `${Math.round(p.N)} × ${S.img.h} pixels, 8-bit`, ix, ih + 36, { size: 11, color: C.muted });
      // zoom on scratch area
      const zx = Math.floor((SCRATCH.x0 + 15 + p.W / 2) / (p.W / p.N)), zy = Math.floor((p.W * 0.4 - (SCRATCH.y0 + 7)) / (p.W / p.N)); const n = 8, cs = Math.min(13, (H - ih - 60) / n);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const xx = M.clamp(zx + i, 0, S.img.w - 1), yy = M.clamp(zy + j, 0, S.img.h - 1), v2 = Math.round(S.img.d[yy * S.img.w + xx]); D.rect(S, ix + 240 + i * cs * 2.2, ih + 26 + j * cs, cs * 2.2, cs, `rgb(${v2},${v2},${v2})`, '#22355c', 0.5); D.text(S, String(v2), ix + 240 + i * cs * 2.2 + cs * 1.1, ih + 26 + j * cs + cs * 0.75, { size: Math.max(7, cs * 0.6), align: 'center', color: v2 > 128 ? '#000' : '#fff' }); }
      D.text(S, '8 × 8 pixel values near the scratch', ix + 240, ih + 20, { size: 10, color: C.muted });
      const rs = p.W / p.N; S.set('m', m); S.set('u', u); S.set('v', v); S.set('rs', rs); S.set('def', 0.5 / rs, 0.5 / rs >= 2 ? 'ok' : 'bad'); S.set('mean', `${M.fmt(S.mean, 1)}, ${M.fmt(S.sat * 100, 1)} % saturated`);
    }
  });

  /* ================= D–F. Image processing, feature extraction, object detection ================= */
  const STAGES = ['Acquired image', 'Smoothing filter (convolution, 4.9)', 'Histogram + threshold (4.10)', 'Edge detection (Sobel, 4.11)', 'Blob features: area, centroid, orientation (4.12–4.13)', 'Corner features (Harris)', 'Object detection: bounding boxes + class'];
  RIL.defineSim({
    id: 'image-processing', title: 'Image processing, feature extraction and object detection', unit: 4, category: 'machine-vision', kind: '2d', auto: true, autoDefault: false,
    description: 'The acquired image passes through the processing pipeline of Section 4.17: smoothing by convolution g = Σh(i,j)f(x−i, y−j) (4.9), thresholding b = [f > T] with Otsu\'s method (4.10), Sobel gradient |∇f| = √(g_x² + g_y²) (4.11), connected-component blob analysis with moments m_pq, centroid x̄ = m₁₀/m₀₀ (4.12) and orientation θ = ½atan2(2μ₁₁, μ₂₀ − μ₀₂) (4.13), Harris corners, and rule-based detection with bounding boxes.',
    help: 'Step through the stages with the selector (Automatic cycles them). Add noise and compare box, Gaussian and median filters. Switch the threshold between Otsu and manual. The feature table lists every detected blob; classes come from simple rules on circularity, rectangularity and hole count — no trained AI model is used.',
    controls: [
      { id: 'stage', type: 'select', label: 'Pipeline stage shown', value: 6, options: STAGES.map((s, i) => [i, `${i + 1}. ${s}`]) },
      { id: 'filt', type: 'select', label: 'Smoothing kernel', string: true, value: 'gauss', options: [['none', 'None'], ['box', 'Box 3×3 (mean)'], ['gauss', 'Gaussian 3×3'], ['median', 'Median 3×3 (non-linear)']] },
      { id: 'tm', type: 'select', label: 'Threshold', string: true, value: 'otsu', options: [['otsu', 'Otsu (automatic)'], ['man', 'Manual T']] },
      { id: 'T', label: 'Manual threshold T', min: 0, max: 255, step: 1, value: 110 },
      { id: 'noise', label: 'Image noise σ', min: 0, max: 60, step: 1, value: 12, unit: 'grey levels' },
      { id: 'light', type: 'select', label: 'Lighting', string: true, value: 'front', options: [['front', 'Front'], ['back', 'Backlight'], ['diffuse', 'Diffuse']] },
      { id: 'b', type: 'buttons', buttons: [{ id: 'new', label: 'New random part layout' }] }
    ],
    readouts: [{ id: 'T', label: 'Threshold used', unit: 'grey level' }, { id: 'n', label: 'Objects detected' }, { id: 'c', label: 'Corners found' }, { id: 'st', label: 'Stage' }],
    panels: [{ id: 'f', title: 'Extracted features (pixel units; 1 px = 1.6 mm)', wide: true }],
    charts: [{ id: 'h', title: 'Histogram and threshold', x: 'grey level', y: 'pixels', series: [{ label: 'histogram', stepped: true }, { label: 'T', points: false }] }],
    stepDt: 1,
    reset(S) { S.scene = defaultScene(); S.k = 0; },
    onButton(S) { const r = Math.random; const types = ['bracket', 'washer', 'ell']; S.scene = [0, 1, 2, 3].map(i => { const t = types[Math.floor(r() * 3)]; return PARTS[t]({ x: -60 + (i % 2) * 110 + (r() - .5) * 20, y: -45 + Math.floor(i / 2) * 85 + (r() - .5) * 10, a: (r() - .5) * 1.4, r: 10 + r() * 8, holes: r() < 0.25 ? 0 : 2 }); }); S._k = null; },
    step(S, dt) { if (S.auto) { S.k = (S.k || 0) + dt; if (S.k > 1.6) { S.k = 0; S.setParam('stage', (+S.p.stage + 1) % 7, true); } } },
    process(S) {
      const p = S.p; const img = render(S.scene, { N: 160, W: 256, light: p.light, noise: p.noise, seed: 5 }); const sm = p.filt === 'box' ? I.convolve(img, I.box3) : p.filt === 'gauss' ? I.convolve(img, I.gauss3) : p.filt === 'median' ? I.median3(img) : img;
      const T = p.tm === 'otsu' ? I.otsu(sm) : p.T; const B = I.threshold(sm, T, p.light === 'back'); const { blobs, labels } = I.blobs(B, 25); const { M: G } = I.sobel(sm); const mx = Math.max(...G.d) || 1; const E = I.make(G.w, G.h); for (let k = 0; k < G.d.length; k++) E.d[k] = G.d[k] / mx * 255;
      const corners = I.harris(sm, 0.05, 0.12, 40); blobs.forEach(b => { const h = holeInfo(B, b), sh = shapeOf(labels, B.w, b); b.holes = h.n; b.filled = b.area + h.area; b.aspect = sh.aspect; b.rect = b.filled / (sh.L1 * sh.L2); b.cls = classify(b); });
      return { img, sm, T, B, E, blobs, corners, hist: I.histogram(sm) };
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H; const key = JSON.stringify([p.filt, p.tm, p.T, p.noise, p.light]) + JSON.stringify(S.scene.map(s => s.kind)) + (S._k === null ? Math.random() : '');
      if (S._key !== key || !S.r) { S.r = this.process(S); S._key = key; S._k = 1; const pts = []; for (let k = 0; k < 256; k += 2) pts.push([k, S.r.hist[k] + S.r.hist[k + 1]]); S.chart('h').set(0, pts); S.chart('h').set(1, [[S.r.T, 0], [S.r.T, Math.max(...pts.map(q => q[1]))]]); }
      const r = S.r, st = +p.stage; const th = Math.min((W - 40) / 7 - 6, 90); const big = { x: 16, y: 16, w: Math.min(W - 32, (H - th - 50) / 0.8), h: 0 }; big.h = big.w * 0.8; const sx = big.w / 160;
      const show = k => k === 0 ? r.img : k === 1 ? r.sm : k === 2 ? r.B : k === 3 ? r.E : k >= 4 ? r.B : r.img;
      const mapFor = k => k === 2 || k === 4 ? (v => v ? [242, 242, 242] : [14, 20, 36]) : k === 6 ? null : null;
      if (st === 4) drawImg(S, r.B, big.x, big.y, big.w, big.h, v => v ? [80, 110, 160] : [14, 20, 36]); else if (st >= 5) drawImg(S, r.img, big.x, big.y, big.w, big.h); else drawImg(S, show(st), big.x, big.y, big.w, big.h, mapFor(st));
      if (st === 4 || st === 6) r.blobs.forEach((b, i) => { const [x0, y0, x1, y1] = b.bbox; if (st === 6) { D.rect(S, big.x + x0 * sx, big.y + y0 * sx, (x1 - x0 + 1) * sx, (y1 - y0 + 1) * sx, null, b.cls.startsWith('circ') ? C.cyan : b.cls.startsWith('rect') ? C.amber : C.violet, 2.5); D.text(S, `#${i + 1} ${b.cls}${b.holes ? `, ${b.holes} hole${b.holes > 1 ? 's' : ''}` : ''}`, big.x + x0 * sx, big.y + y0 * sx - 5, { size: 11, weight: 700, color: '#fff' }); }
        const cx = big.x + (b.cx + 0.5) * sx, cy = big.y + (b.cy + 0.5) * sx; D.circle(S, cx, cy, 4, C.red); const L = Math.sqrt(b.area) * sx * 0.7; D.line(S, cx - Math.cos(b.theta) * L, cy - Math.sin(b.theta) * L, cx + Math.cos(b.theta) * L, cy + Math.sin(b.theta) * L, C.red, 2); });
      if (st === 5) r.corners.forEach(c => D.circle(S, big.x + (c.x + 0.5) * sx, big.y + (c.y + 0.5) * sx, 4, null, C.amber, 2));
      D.text(S, `${st + 1}. ${STAGES[st]}`, big.x + 6, big.y + big.h + 18, { size: 12.5, weight: 700, color: C.amber });
      for (let k = 0; k < 7; k++) { const x = 16 + k * (th + 6), y = H - th * 0.8 - 8; if (k === 4) drawImg(S, r.B, x, y, th, th * 0.8, v => v ? [80, 110, 160] : [14, 20, 36]); else drawImg(S, k >= 5 ? r.img : show(k), x, y, th, th * 0.8, mapFor(k)); D.rect(S, x, y, th, th * 0.8, null, k === st ? C.amber : '#3a5384', k === st ? 2.5 : 1); }
      S.set('T', r.T); S.set('n', r.blobs.length); S.set('c', r.corners.length); S.set('st', STAGES[st]);
      RIL.setHTML(S.panel('f'), '<div class="table-scroll">' + RIL.ui.kv(r.blobs.map((b, i) => [i + 1, b.area, `(${M.fmt(b.cx, 1)}, ${M.fmt(b.cy, 1)})`, M.fmt(b.theta * M.R2D, 1) + '°', `${b.bbox[2] - b.bbox[0] + 1} × ${b.bbox[3] - b.bbox[1] + 1}`, b.perimeter, M.fmt(b.circularity, 3), b.holes, M.fmt(b.rect, 3), b.cls]), ['#', 'Area m₀₀ (px)', 'Centroid (x̄, ȳ)', 'Orientation θ', 'Bounding box', 'Perimeter (px)', 'Circularity 4πA/P²', 'Holes', 'Rectangularity A_filled/(L₁L₂)', 'Rule-based class']) + '</div>', S, 'f');
    }
  });

  /* ================= G. Inspection: conveyor, capture, process, decide, sort ================= */
  RIL.defineSim({
    id: 'vision-inspection', title: 'Machine-vision quality inspection and sorting', unit: 4, category: 'machine-vision', kind: '2d', auto: true, autoDefault: true,
    description: 'Brackets arrive on a conveyor. When a part reaches the camera the image is captured, thresholded (Otsu), and features are extracted: area, width (gauged in mm by W/N_px), hole count and a scratch measure (bright pixels under dark-field light). Rules decide accept or reject and a pusher diverts rejects into a bin. A confusion matrix compares the decisions with the true part condition.',
    help: 'Raise the defect probability, tighten or loosen the tolerances and switch lighting. Front lighting cannot see the scratch, dark-field can. Too tight a tolerance rejects good parts (false rejects); too loose passes bad parts (escapes). The classifier is rule-based, not a trained AI model.',
    controls: [
      { id: 'pd', label: 'Defect probability', min: 0, max: 80, step: 1, value: 35, unit: '%' },
      { id: 'tolW', label: 'Width tolerance ±', min: 0.5, max: 8, step: 0.1, value: 2.5, unit: 'mm' },
      { id: 'light', type: 'select', label: 'Inspection lighting', string: true, value: 'dark', options: [['front', 'Front (ring) light'], ['dark', 'Dark-field (reveals scratches)']] },
      { id: 'scr', label: 'Scratch pixel threshold', min: 1, max: 60, step: 1, value: 12, unit: 'px' },
      { id: 'v', label: 'Conveyor speed', min: 0.05, max: 0.3, step: 0.01, value: 0.12, unit: 'm/s (display)' }
    ],
    readouts: [{ id: 'last', label: 'Last part: true condition' }, { id: 'meas', label: 'Measured width / holes / scratch px' }, { id: 'dec', label: 'Decision' }, { id: 'acc', label: 'Accepted / rejected' }, { id: 'esc', label: 'Escapes (bad parts passed)' }, { id: 'fr', label: 'False rejects (good parts rejected)' }],
    panels: [{ id: 'cm', title: 'Confusion matrix (true condition vs decision)' }],
    charts: [{ id: 'w', title: 'Measured width of each part (gauging)', x: 'part number', y: 'width (mm)', series: [{ label: 'measured', points: true, line: false }, { label: 'upper limit', dash: [5, 4] }, { label: 'lower limit', dash: [5, 4] }] }],
    reset(S) { S.parts = []; S.spawn = 0; S.n = 0; S.cm = { gg: 0, gb: 0, bg: 0, bb: 0 }; S.last = null; S.cap = null; S.widths = []; },
    newPart(S) { const p = S.p; const bad = Math.random() * 100 < p.pd; const kinds = ['size', 'hole', 'scratch']; const dk = bad ? kinds[Math.floor(Math.random() * 3)] : null; return { x: -0.05, w: dk === 'size' ? 60 + (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 4) : 60 + (Math.random() - 0.5) * 1.2, holes: dk === 'hole' ? 1 : 2, scratch: dk === 'scratch', bad, dk, done: false, a: (Math.random() - 0.5) * 0.15 }; },
    inspect(S, part) {
      const p = S.p, N = 96, Wmm = 96; const sc = [PARTS.bracket({ x: 0, y: 0, w: part.w, h: 36, a: part.a, holes: part.holes === 2 ? 2 : 1 })]; if (part.holes === 1) sc[0] = { inside: (x, y) => inRect(x, y, 0, 0, part.w, 36, part.a) && !inCirc(x, y, Math.cos(part.a) * 15, Math.sin(part.a) * 15, 6) };
      // dark-field set-up uses two exposures: a backlit image for gauging/holes and a dark-field image for scratches
      const imgG = render(sc, { N, W: Wmm, aspect: 0.8, light: p.light === 'dark' ? 'back' : 'front', noise: 6, scratch: part.scratch, seg: { x0: -5, y0: -14, x1: 8, y1: 12 }, seed: S.n + 1 });
      const img = p.light === 'dark' ? render(sc, { N, W: Wmm, aspect: 0.8, light: 'dark', noise: 6, scratch: part.scratch, seg: { x0: -5, y0: -14, x1: 8, y1: 12 }, seed: S.n + 7 }) : imgG;
      const T = I.otsu(imgG); const B = I.threshold(imgG, T, p.light === 'dark'); const blobs = I.blobs(B, 30).blobs.sort((a, b) => b.area - a.area); const b = blobs[0];
      const pxmm = Wmm / N; let width = 0; if (b) { /* caliper along the principal axis θ (4.13) */ const c = Math.cos(b.theta), sn = Math.sin(b.theta); let lo = Infinity, hi = -Infinity; const [x0, y0, x1, y1] = b.bbox; for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) if (B.d[j * N + i]) { const u = i * c + j * sn; lo = Math.min(lo, u); hi = Math.max(hi, u); } width = (hi - lo + 1) * pxmm; } const holes = b ? holesOf(B, b) : 0;
      const interior = (i, j) => { for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) if (!B.d[(j + dj) * N + i + di]) return false; return true; };
      let scr = 0; if (b) { const [x0, y0, x1, y1] = b.bbox; for (let j = y0 + 3; j <= y1 - 3; j++) for (let i = x0 + 3; i <= x1 - 3; i++) { if (!interior(i, j)) continue; const v = img.d[j * N + i]; if (p.light === 'dark' ? v > 150 : v > 100 && v < 140) scr++; } }
      const okW = Math.abs(width - 60) <= p.tolW, okH = holes === 2, okS = scr < p.scr; const accept = okW && okH && okS;
      return { img, width, holes, scr, accept, why: !okW ? 'width out of tolerance' : !okH ? `hole count ${holes} ≠ 2` : !okS ? 'scratch detected' : 'all features within limits' };
    },
    step(S, dt) {
      const p = S.p; S.spawn -= dt; if (S.spawn <= 0) { S.parts.push(this.newPart(S)); S.spawn = 0.45 / p.v; }
      S.parts.forEach(q => { if (q.push) { q.y = (q.y || 0) + dt * 0.8; return; } q.x += p.v * dt * 0.8;
        if (!q.done && q.x >= 0.45) { q.done = true; S.n++; const r = this.inspect(S, q); q.res = r; S.cap = { r, q }; S.last = q; S.widths.push([S.n, r.width]); S.chart('w').set(0, S.widths.slice(-60)); S.chart('w').set(1, [[Math.max(1, S.n - 60), 60 + p.tolW], [S.n, 60 + p.tolW]]); S.chart('w').set(2, [[Math.max(1, S.n - 60), 60 - p.tolW], [S.n, 60 - p.tolW]]); S.cm[(q.bad ? 'b' : 'g') + (r.accept ? 'g' : 'b')]++; }
        if (q.done && !q.res.accept && q.x >= 0.72 && !q.push) q.push = true; });
      S.parts = S.parts.filter(q => q.x < 1.05 && (q.y || 0) < 0.4);
    },
    draw(S) {
      D.clear(S); const p = S.p, W = S.W, H = S.H, X = f => 30 + f * (W - 60), y = H * 0.6;
      D.rect(S, X(0), y, X(1) - X(0), 16, '#22355c', '#3a5384', 1, 3); D.rect(S, X(0.45) - 18, 18, 36, 26, '#1d2b48', C.cyan, 1.5, 4); D.line(S, X(0.45), 44, X(0.45) - 40, y - 4, 'rgba(76,194,255,.4)', 1); D.line(S, X(0.45), 44, X(0.45) + 40, y - 4, 'rgba(76,194,255,.4)', 1); D.text(S, 'camera + ' + (p.light === 'dark' ? 'dark-field ring' : 'ring light'), X(0.45), 14, { size: 10, align: 'center', color: C.cyan });
      D.rect(S, X(0.72) - 30, y - 70, 18, 40, '#3b4f75'); D.rect(S, X(0.72) - 14, y + 30, 60, 50, 'rgba(255,123,123,.15)', C.red, 1.5, 4); D.text(S, 'reject bin', X(0.72) + 16, y + 96, { size: 10, align: 'center', color: C.red }); D.text(S, 'pusher', X(0.72) - 21, y - 76, { size: 10, align: 'center', color: C.muted });
      S.parts.forEach(q => { const px = X(q.x), py = y - 10 + (q.y || 0) * 200; const w = q.w * 0.6; D.rect(S, px - w / 2, py - 11, w, 22, q.done ? (q.res.accept ? '#6fe39b' : '#ff7b7b') : '#9fb3d1', '#fff', 1, 2); D.circle(S, px + 9, py, 3.5, '#0e1d38'); if (q.holes === 2) D.circle(S, px - 9, py, 3.5, '#0e1d38'); if (q.scratch) D.line(S, px - w / 2 + 4, py - 6, px - 2, py + 3, '#ffe', 1); });
      if (S.cap) { const r = S.cap.r; drawImg(S, r.img, W - 200, 60, 180, 144); D.rect(S, W - 200, 60, 180, 144, null, C.cyan, 1.5); D.text(S, 'captured image', W - 200, 54, { size: 10.5, color: C.muted }); D.text(S, r.accept ? 'ACCEPT' : 'REJECT: ' + r.why, W - 200, 222, { size: 12, weight: 800, color: r.accept ? C.green : C.red }); }
      const steps = ['1 arrive', '2 capture', '3 process', '4 features', '5 classify', '6 accept/reject', '7 sort']; steps.forEach((s, i) => D.text(S, s, 16 + i * Math.min(100, (W - 240) / 7), H - 14, { size: 10.5, color: C.muted }));
      const L = S.last; if (L) { S.set('last', L.bad ? `defective (${L.dk})` : 'good', L.bad ? 'bad' : 'ok'); S.set('meas', `${M.fmt(L.res.width, 2)} mm / ${L.res.holes} / ${L.res.scr}`); S.set('dec', L.res.accept ? 'accept' : 'reject — ' + L.res.why, L.res.accept ? 'ok' : 'bad'); }
      const cm = S.cm; S.set('acc', `${cm.gg + cm.bg} / ${cm.gb + cm.bb}`); S.set('esc', cm.bg, cm.bg ? 'bad' : ''); S.set('fr', cm.gb, cm.gb ? 'bad' : '');
      RIL.setHTML(S.panel('cm'), RIL.ui.kv([['True: good', cm.gg, cm.gb], ['True: defective', cm.bg, cm.bb]], ['', 'Decision: accept', 'Decision: reject']) + `<p style="margin:.3em 0 0;color:#8fa3c4">Accuracy ${M.fmt((cm.gg + cm.bb) / Math.max(1, cm.gg + cm.gb + cm.bg + cm.bb) * 100, 1)} % over ${S.n} parts.</p>`, S, 'cm');
    }
  });

  /* ================= Autonomous mobile robot (Topic IV.17) ================= */
  const GW = 40, GH = 28, CELL = 0.25;
  RIL.defineSim({
    id: 'autonomous-robot', title: 'Autonomous mobile robot: sense, plan, act', unit: 4, category: 'industrial-applications', kind: '2d', auto: false,
    description: 'A differential-drive robot (v = r(ω_R + ω_L)/2, ω = r(ω_R − ω_L)/b, 4.17) explores a 10 m × 7 m floor. A ring of range sensors marks obstacles in its own occupancy grid; A* (f = g + h) plans the shortest path on that map, treating unknown cells as free, and replans when a new obstacle blocks the path. A pure-pursuit controller converts the path into wheel speeds; odometry integrates noisy wheel encoders.',
    help: 'Click to set the goal (or switch the click mode to add/remove obstacles, including in front of the moving robot), then Start. Grey cells are true obstacles; red cells are what the robot has sensed so far. Simplifying assumptions: perfect range sensing within the sensor range, a static map except for your edits, the true pose used for mapping (localisation is not simulated; odometry drift is only displayed).',
    controls: [
      { id: 'click', type: 'select', label: 'Mouse click sets', string: true, value: 'goal', options: [['goal', 'Goal position'], ['obs', 'Add / remove obstacle']] },
      { id: 'range', label: 'Sensor range', min: 0.5, max: 4, step: 0.1, value: 1.5, unit: 'm' },
      { id: 'beams', label: 'Number of range beams', min: 4, max: 36, step: 1, value: 16 },
      { id: 'vmax', label: 'Maximum speed', min: 0.1, max: 1.5, step: 0.05, value: 0.6, unit: 'm/s' },
      { id: 'enc', label: 'Wheel encoder noise', min: 0, max: 10, step: 0.5, value: 2, unit: '%' },
      { id: 'b', type: 'buttons', buttons: [{ id: 'map', label: 'Forget learned map' }, { id: 'clr', label: 'Clear my obstacles' }] }
    ],
    readouts: [{ id: 'st', label: 'State' }, { id: 'pose', label: 'True pose (x, y, θ)', unit: 'm, m, °' }, { id: 'odo', label: 'Odometry estimate error', unit: 'm' }, { id: 'w', label: 'Wheel speeds ω_R, ω_L', unit: 'rad/s' }, { id: 'vw', label: 'v, ω from (4.17)', unit: 'm/s, rad/s' }, { id: 'rp', label: 'Path length / replans' }],
    autostart: false,
    setup(S) { S.truth = new Uint8Array(GW * GH); const wall = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) S.truth[y * GW + x] = 1; }; for (let x = 0; x < GW; x++) { S.truth[x] = 1; S.truth[(GH - 1) * GW + x] = 1; } for (let y = 0; y < GH; y++) { S.truth[y * GW] = 1; S.truth[y * GW + GW - 1] = 1; } wall(10, 0, 11, 17); wall(20, 10, 21, GH - 1); wall(28, 4, 36, 5); wall(28, 5, 29, 14); wall(14, 21, 17, 23); S.base = S.truth.slice(); },
    reset(S) { S.pose = [1.0, 1.0, 0]; S.odo = S.pose.slice(); S.map = new Uint8Array(GW * GH); S.goal = S.goal || [9.0, 6.0]; S.path = null; S.replans = 0; S.state = 'idle'; S.wR = S.wL = 0; S.trail = []; S.rays = []; },
    onButton(S, b) { if (b === 'map') { S.map = new Uint8Array(GW * GH); S.path = null; } if (b === 'clr') { S.truth = S.base.slice(); S.map = new Uint8Array(GW * GH); S.path = null; } },
    onPointer(S, type, x, y) { if (type !== 'down' || !S.V) return; const [wx, wy] = S.V.inv(x, y); const cx = Math.floor(wx / CELL), cy = Math.floor(wy / CELL); if (cx < 1 || cy < 1 || cx >= GW - 1 || cy >= GH - 1) return; if (S.p.click === 'goal') { S.goal = [wx, wy]; S.path = null; S.state = 'planning'; } else { const k = cy * GW + cx; S.truth[k] = S.truth[k] ? 0 : 1; if (!S.truth[k]) S.map[k] = 0; } },
    astar(S, start, goal) {
      const occ = k => S.map[k] || 0; const inflate = k => { const x = k % GW, y = (k / GW) | 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const xx = x + i, yy = y + j; if (xx < 0 || yy < 0 || xx >= GW || yy >= GH || occ(yy * GW + xx)) return true; } return false; };
      const s = start[1] * GW + start[0], g = goal[1] * GW + goal[0]; const G = new Float32Array(GW * GH).fill(Infinity), from = new Int32Array(GW * GH).fill(-1), closed = new Uint8Array(GW * GH); G[s] = 0; const open = [[Math.hypot(start[0] - goal[0], start[1] - goal[1]), s]];
      while (open.length) { open.sort((a, b) => a[0] - b[0]); const [, c] = open.shift(); if (c === g) break; if (closed[c]) continue; closed[c] = 1; const cx = c % GW, cy = (c / GW) | 0;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { if (!i && !j) continue; const nx = cx + i, ny = cy + j; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const n = ny * GW + nx; if (inflate(n) && n !== g) continue; if (i && j && (occ(cy * GW + nx) || occ(ny * GW + cx))) continue; const ng = G[c] + (i && j ? Math.SQRT2 : 1); if (ng < G[n]) { G[n] = ng; from[n] = c; open.push([ng + Math.hypot(nx - goal[0], ny - goal[1]), n]); } } }
      if (G[g] === Infinity) return null; const path = []; for (let c = g; c !== -1; c = from[c]) path.unshift([(c % GW + 0.5) * CELL, (((c / GW) | 0) + 0.5) * CELL]); return path;
    },
    sense(S) { const p = S.p, [x, y, th] = S.pose; S.rays = []; let newObs = false; for (let k = 0; k < p.beams; k++) { const a = th + k * 2 * PI / p.beams; let d = 0; for (; d < p.range; d += CELL / 3) { const cx = Math.floor((x + Math.cos(a) * d) / CELL), cy = Math.floor((y + Math.sin(a) * d) / CELL); if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) break; const kk = cy * GW + cx; if (S.truth[kk]) { if (!S.map[kk]) { S.map[kk] = 1; newObs = true; } break; } } S.rays.push([a, Math.min(d, p.range)]); } return newObs; },
    step(S, dt) {
      const p = S.p; const newObs = this.sense(S); const cell = q => [M.clamp(Math.floor(q[0] / CELL), 0, GW - 1), M.clamp(Math.floor(q[1] / CELL), 0, GH - 1)];
      const blocked = S.path && S.path.some(q => { const c = cell(q); return S.map[c[1] * GW + c[0]]; });
      if (!S.path || (newObs && blocked)) { const path = this.astar(S, cell(S.pose), cell(S.goal)); if (S.path) S.replans++; S.path = path; S.state = path ? 'following path' : 'no path found'; if (!path) { S.wR = S.wL = 0; return; } }
      if (Math.hypot(S.goal[0] - S.pose[0], S.goal[1] - S.pose[1]) < 0.2) { S.state = 'goal reached'; S.wR = S.wL = 0; return; }
      // pure pursuit: first path point at least L ahead
      const Lh = 0.45; let tgt = S.path[S.path.length - 1]; for (const q of S.path) if (Math.hypot(q[0] - S.pose[0], q[1] - S.pose[1]) >= Lh) { tgt = q; break; }
      while (S.path.length > 1 && Math.hypot(S.path[0][0] - S.pose[0], S.path[0][1] - S.pose[1]) < Lh * 0.8) S.path.shift();
      const err = M.wrapPi(Math.atan2(tgt[1] - S.pose[1], tgt[0] - S.pose[0]) - S.pose[2]); const v = p.vmax * Math.max(0, Math.cos(err)) ** 2, w = M.clamp(2.5 * err, -2.5, 2.5);
      const r = 0.05, b = 0.3; S.wR = (2 * v + w * b) / (2 * r); S.wL = (2 * v - w * b) / (2 * r);
      const kin = M.auto.diffDrive(r, b, S.wR, S.wL); S.kin = kin; S.pose[0] += kin.v * Math.cos(S.pose[2]) * dt; S.pose[1] += kin.v * Math.sin(S.pose[2]) * dt; S.pose[2] = M.wrapPi(S.pose[2] + kin.w * dt);
      const n = 1 + p.enc / 100 * M.gaussRand(Math.random), n2 = 1 + p.enc / 100 * M.gaussRand(Math.random); const ko = M.auto.diffDrive(r, b, S.wR * n, S.wL * n2); S.odo[0] += ko.v * Math.cos(S.odo[2]) * dt; S.odo[1] += ko.v * Math.sin(S.odo[2]) * dt; S.odo[2] += ko.w * dt;
      if (S.frameCount % 3 === 0) { S.trail.push(S.pose.slice(0, 2)); if (S.trail.length > 800) S.trail.shift(); }
    },
    draw(S) {
      D.clear(S); const V = S.V = D.fit(S, [0, GW * CELL], [0, GH * CELL], 12); const s = CELL * V.s;
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const k = y * GW + x; if (S.truth[k]) D.rect(S, V.X(x * CELL), V.Y((y + 1) * CELL), s, s, S.map[k] ? 'rgba(255,123,123,.85)' : '#3b4f75'); }
      const g = S.ctx; g.strokeStyle = 'rgba(143,163,196,.07)'; g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= GW; x++) { g.moveTo(V.X(x * CELL), V.Y(0)); g.lineTo(V.X(x * CELL), V.Y(GH * CELL)); } for (let y = 0; y <= GH; y++) { g.moveTo(V.X(0), V.Y(y * CELL)); g.lineTo(V.X(GW * CELL), V.Y(y * CELL)); } g.stroke();
      (S.rays || []).forEach(([a, d]) => D.line(S, V.X(S.pose[0]), V.Y(S.pose[1]), V.X(S.pose[0] + Math.cos(a) * d), V.Y(S.pose[1] + Math.sin(a) * d), 'rgba(76,194,255,.35)', 1));
      if (S.path) D.poly(S, [[V.X(S.pose[0]), V.Y(S.pose[1])], ...S.path.map(q => [V.X(q[0]), V.Y(q[1])])], null, C.green, 2.5, false);
      D.poly(S, S.trail.map(q => [V.X(q[0]), V.Y(q[1])]), null, 'rgba(242,165,22,.6)', 1.5, false);
      D.circle(S, V.X(S.goal[0]), V.Y(S.goal[1]), 9, null, C.green, 3); D.text(S, 'goal', V.X(S.goal[0]) + 12, V.Y(S.goal[1]) - 8, { size: 11, color: C.green });
      const rob = (P, col, a) => { const [x, y, th] = P; D.circle(S, V.X(x), V.Y(y), 0.18 * V.s, a ? null : col, col, 2); D.line(S, V.X(x), V.Y(y), V.X(x + Math.cos(th) * 0.25), V.Y(y + Math.sin(th) * 0.25), a ? col : '#0e1d38', 3); };
      rob(S.odo, 'rgba(196,164,255,.8)', true); rob(S.pose, C.amber);
      const e = Math.hypot(S.odo[0] - S.pose[0], S.odo[1] - S.pose[1]); const L = S.path ? S.path.reduce((a, q, i, arr) => i ? a + Math.hypot(q[0] - arr[i - 1][0], q[1] - arr[i - 1][1]) : 0, 0) : 0;
      S.set('st', S.state, /reached/.test(S.state) ? 'ok' : /no path/.test(S.state) ? 'bad' : ''); S.set('pose', `${M.fmt(S.pose[0], 2)}, ${M.fmt(S.pose[1], 2)}, ${M.fmt(S.pose[2] * M.R2D, 1)}`); S.set('odo', e); S.set('w', `${M.fmt(S.wR, 2)}, ${M.fmt(S.wL, 2)}`); S.set('vw', S.kin ? `${M.fmt(S.kin.v, 3)}, ${M.fmt(S.kin.w, 3)}` : '0, 0'); S.set('rp', `${M.fmt(L, 2)} m / ${S.replans}`);
    }
  });
})();
