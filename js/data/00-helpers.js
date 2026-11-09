/* Helpers for topic content: SVG engineering diagrams that adapt to light/dark theory pages */
(function () {
  const RIL = window.RIL = window.RIL || {};
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  /** horizontal (wrapping) block diagram: blocks = [[title, subtitle], ...] */
  RIL.svgChain = (blocks, o = {}) => {
    const bw = o.bw || 150, bh = o.bh || 62, gap = o.gap || 34, perRow = o.perRow || Math.min(blocks.length, 5), rows = Math.ceil(blocks.length / perRow);
    const W = perRow * bw + (perRow - 1) * gap + 20, H = rows * bh + (rows - 1) * 40 + 20; let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="${esc(o.label || 'block diagram')}" style="font-family:var(--font-ui);font-size:12px">`;
    s += `<defs><marker id="ah${o.id || ''}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--amber)"/></marker></defs>`;
    blocks.forEach((b, i) => { const r = Math.floor(i / perRow), c = r % 2 ? perRow - 1 - (i % perRow) : i % perRow; const x = 10 + c * (bw + gap), y = 10 + r * (bh + 40); b._x = x; b._y = y;
      s += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="8" fill="var(--card)" stroke="${b[2] || 'var(--z-axis)'}" stroke-width="1.6"/><text x="${x + bw / 2}" y="${y + 24}" text-anchor="middle" font-weight="700" fill="var(--ink)">${esc(b[0])}</text>${b[1] ? `<text x="${x + bw / 2}" y="${y + 42}" text-anchor="middle" fill="var(--ink-3)" font-size="11">${esc(b[1])}</text>` : ''}`; });
    for (let i = 0; i < blocks.length - 1; i++) { const a = blocks[i], b = blocks[i + 1]; const same = a._y === b._y; const x1 = same ? (b._x > a._x ? a._x + bw : a._x) : a._x + bw / 2, y1 = same ? a._y + bh / 2 : a._y + bh, x2 = same ? (b._x > a._x ? b._x : b._x + bw) : b._x + bw / 2, y2 = same ? b._y + bh / 2 : b._y; s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--amber)" stroke-width="2" marker-end="url(#ah${o.id || ''})"/>`; }
    return s + '</svg>';
  };
  /** simple two-column comparison as an SVG-free HTML table (used inside theory) */
  RIL.table = (head, rows) => `<div class="table-scroll"><table class="data"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></div>`;
})();
