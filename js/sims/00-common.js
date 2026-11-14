/* Shared helpers for canvas simulations (palette, panels, clickable blocks, planar arms) */
(function () {
  const RIL = window.RIL, M = RIL.M;
  const C = RIL.C = { text: '#1f2328', muted: '#57606a', amber: '#c77700', cyan: '#0b7fc1', green: '#1a9b4b', red: '#d1242f', violet: '#8250df', steel: '#6e7781', dark: '#ffffff', panel: 'rgba(255,255,255,.9)', line: 'rgba(87,96,106,.35)', x: '#e5484d', y: '#30a46c', z: '#3e7bfa' };
  const D = RIL.draw;
  /** rounded info box with title + rows ([label, value]) */
  D.box = (S, x, y, w, title, rows, o = {}) => {
    const hh = 22 + rows.length * 16 + 6;
    D.rect(S, x, y, w, hh, C.panel, o.border || C.line, 1, 6);
    D.text(S, title, x + 8, y + 15, { size: 11, weight: 650, color: o.tc || C.amber });
    rows.forEach((r, i) => { D.text(S, r[0], x + 8, y + 33 + i * 16, { size: 11, color: C.muted }); D.text(S, r[1], x + w - 8, y + 33 + i * 16, { size: 11, color: r[2] || C.text, align: 'right', weight: 600 }); });
    return hh;
  };
  /** block of a block diagram; returns rect for hit-testing */
  D.block = (S, x, y, w, h, label, o = {}) => {
    D.rect(S, x, y, w, h, o.fill || '#eef1f4', o.active ? C.amber : (o.stroke || '#8c959f'), o.active ? 2.5 : 1.5, 8);
    const lines = String(label).split('\n');
    lines.forEach((l, i) => D.text(S, l, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * 14 + 4, { size: o.size || 11.5, align: 'center', weight: i === 0 ? 650 : 500, color: i === 0 ? (o.tc || C.text) : C.muted }));
    return { x, y, w, h };
  };
  D.hit = (r, px, py) => r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  /** planar serial arm in screen coordinates; pts: [[x,y],...] world metres, V: view */
  D.arm = (S, V, pts, o = {}) => {
    for (let i = 0; i < pts.length - 1; i++) D.link(S, V.X(pts[i][0]), V.Y(pts[i][1]), V.X(pts[i + 1][0]), V.Y(pts[i + 1][1]), o.w || 12, o.fill || (i % 2 ? '#9aa4af' : '#6e7781'), o.stroke || '#8c959f');
    D.rect(S, V.X(pts[0][0]) - 22, V.Y(pts[0][1]) + 6, 44, 10, '#6e7781', '#57606a', 1, 3);
    for (let i = 0; i < pts.length - 1; i++) D.joint(S, V.X(pts[i][0]), V.Y(pts[i][1]), o.jr || 8);
    const e = pts[pts.length - 1]; D.circle(S, V.X(e[0]), V.Y(e[1]), 5, o.tip || C.cyan, '#24292f', 1.5);
  };
  /** world axes for a planar view */
  D.axes2 = (S, V, xr, yr, step = 0.2, o = {}) => {
    const g = S.ctx; g.save(); g.strokeStyle = 'rgba(87,96,106,.08)'; g.lineWidth = 1; g.beginPath();
    for (let x = Math.ceil(xr[0] / step) * step; x <= xr[1] + 1e-9; x += step) { g.moveTo(V.X(x) + .5, V.Y(yr[0])); g.lineTo(V.X(x) + .5, V.Y(yr[1])); }
    for (let y = Math.ceil(yr[0] / step) * step; y <= yr[1] + 1e-9; y += step) { g.moveTo(V.X(xr[0]), V.Y(y) + .5); g.lineTo(V.X(xr[1]), V.Y(y) + .5); }
    g.stroke(); g.restore();
    D.arrow(S, V.X(xr[0]), V.Y(0), V.X(xr[1]), V.Y(0), 'rgba(229,72,77,.7)', 1.2, 7); D.arrow(S, V.X(0), V.Y(yr[0]), V.X(0), V.Y(yr[1]), 'rgba(48,164,108,.8)', 1.2, 7);
    D.text(S, o.xl || 'x (m)', V.X(xr[1]) - 4, V.Y(0) - 6, { size: 10, color: C.muted, align: 'right' }); D.text(S, o.yl || 'y (m)', V.X(0) + 6, V.Y(yr[1]) + 10, { size: 10, color: C.muted });
  };
  /** fit a world rectangle into the stage with margin; returns view */
  D.fit = (S, xr, yr, m = 30, offx = 0) => { const s = Math.min((S.W - 2 * m - offx) / (xr[1] - xr[0]), (S.H - 2 * m) / (yr[1] - yr[0])); const cx = m + offx + ((S.W - 2 * m - offx) - s * (xr[1] - xr[0])) / 2 - s * xr[0]; const cy = S.H - m - ((S.H - 2 * m) - s * (yr[1] - yr[0])) / 2 + s * yr[0]; return D.view(S, cx, cy, s); };
  /** analogue meter with needle; v in [lo,hi] */
  D.meter = (S, x, y, r, v, lo, hi, label, unit, color = C.amber) => {
    const g = S.ctx; D.rect(S, x - r - 8, y - r - 10, 2 * r + 16, r + 38, '#ffffff', '#8c959f', 1.5, 8);
    g.strokeStyle = C.muted; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.15 + 0.07 * i); D.line(S, x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * (r - (i % 5 ? 4 : 8)), y + Math.sin(a) * (r - (i % 5 ? 4 : 8)), C.muted, 1); }
    const f = M.clamp((v - lo) / (hi - lo || 1), -0.02, 1.02); const a = Math.PI * (1.15 + 0.7 * f);
    D.line(S, x, y, x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4), color, 2.2); D.circle(S, x, y, 3, color);
    D.text(S, label, x, y + 14, { size: 10, color: C.muted, align: 'center' }); D.text(S, M.fmt(v, 3) + ' ' + unit, x, y + 26, { size: 11, align: 'center', weight: 650 });
  };
  /** seven-segment-like digital display */
  D.lcd = (S, x, y, w, txt, label) => { D.rect(S, x, y, w, 34, '#effaf2', '#7fbf95', 1.5, 5); D.text(S, txt, x + w - 8, y + 24, { size: 17, color: '#116329', align: 'right', weight: 700 }); if (label) D.text(S, label, x + 6, y - 5, { size: 10, color: C.muted }); };
  /** HTML set with change detection */
  RIL.setHTML = (el, html, S, key) => { if (!el) return; if (S && S['_h_' + key] === html) return; el.innerHTML = html; if (S) S['_h_' + key] = html; };
  /** square wave helper, duty in [0,1] */
  RIL.sq = (t, f, duty = 0.5) => ((t * f) % 1 + 1) % 1 < duty ? 1 : 0;
})();
