#!/usr/bin/env node
/* Headless smoke test (Playwright + Chromium).
   Loads every generated page over a local static server, records console errors and
   page errors, and on simulation/experiment/topic pages exercises every control:
   Start/Pause, Step, Reset, Record, each slider (min and max), each select option,
   each toggle and each button. Writes tests/smoke-report.json.
   Usage:  node tests/smoke.js [filter-substring]                                   */
'use strict';
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const filter = process.argv[2] || '';
const pages = JSON.parse(fs.readFileSync(path.join(__dirname, 'pages.json'), 'utf8')).filter(p => p.includes(filter));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/markdown', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end('nf'); return; } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
});
(async () => {
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const report = []; let bad = 0;
  for (const p of pages) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage(); const errs = [];
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_NAME|net::|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('requestfailed', r => { const u = r.url(); if (!/fonts\.(googleapis|gstatic)/.test(u)) errs.push('requestfailed: ' + u); });
    const info = { page: p, controls: 0 };
    try {
      await page.goto(`http://localhost:${port}/${p}`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(350);
      const sims = await page.$$('.sim');
      info.sims = sims.length;
      if (/^(simulations|experiments)\//.test(p) || (p.includes('topic-') && process.env.DEEP)) {
        for (const s of sims) {
          const act = async a => { const b = await s.$(`[data-act="${a}"]`); if (b) { await b.click(); await page.waitForTimeout(40); } };
          await act('run'); await page.waitForTimeout(150); await act('run'); await act('step'); await act('step'); await act('auto'); await page.waitForTimeout(250); await act('manual');
          for (const r of await s.$$('input[type=range]')) {
            info.controls++;
            for (const which of ['min', 'max', 'value']) {
              await r.evaluate((el, w) => { const v = w === 'value' ? el.defaultValue : el[w]; el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, which);
              await page.waitForTimeout(25);
            }
          }
          for (const sel of await s.$$('select[data-ctl]')) {
            info.controls++;
            const n = await sel.evaluate(el => el.options.length);
            for (let i = 0; i < n; i++) { await sel.evaluate((el, i) => { el.selectedIndex = i; el.dispatchEvent(new Event('change', { bubbles: true })); }, i); await page.waitForTimeout(60); }
            await sel.evaluate(el => { el.selectedIndex = [...el.options].findIndex(o => o.defaultSelected); el.dispatchEvent(new Event('change', { bubbles: true })); });
          }
          for (const cb of await s.$$('input[type=checkbox][data-ctl]')) { info.controls++; await cb.click(); await page.waitForTimeout(30); await cb.click(); }
          for (const t of await s.$$('input.ctl-text')) { info.controls++; await t.evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true }))); }
          for (const b of await s.$$('[data-btn]')) { info.controls++; await b.click(); await page.waitForTimeout(60); }
          await act('run'); await page.waitForTimeout(400); await act('record'); await act('reset'); await act('run'); await page.waitForTimeout(200);
          // read-outs must not show NaN
          const nan = await s.$$eval('[data-ro]', els => els.filter(e => /NaN|undefined/.test(e.textContent)).map(e => e.getAttribute('data-ro')));
          if (nan.length) errs.push('NaN readouts: ' + nan.join(','));
        }
      }
      if (p === 'practice.html') {
        await page.click('.quiz button[type=submit]'); await page.waitForTimeout(100);
        const sc = await page.textContent('.quiz .score'); info.score = sc;
      }
      const failed = await page.$('.callout'); if (failed) { const t = await failed.textContent(); if (/failed to render|not available/.test(t)) errs.push(t.trim()); }
    } catch (e) { errs.push('exception: ' + e.message.split('\n')[0]); }
    info.errors = errs; if (errs.length) { bad++; console.log('✗', p, '\n   ' + errs.slice(0, 6).join('\n   ')); }
    report.push(info); await ctx.close();
  }
  await browser.close(); srv.close();
  fs.writeFileSync(path.join(__dirname, 'smoke-report.json'), JSON.stringify(report, null, 1));
  console.log(`${pages.length} pages tested, ${bad} with errors, ${report.reduce((a, r) => a + (r.controls || 0), 0)} controls exercised.`);
  process.exitCode = bad ? 1 : 0;
})();
