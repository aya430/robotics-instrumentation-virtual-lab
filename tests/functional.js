#!/usr/bin/env node
/* Functional check: run a simulation page at 4x speed for N seconds and print its read-outs.
   Usage: node tests/functional.js <page> <seconds> [png] */
const path = require('path'), fs = require('fs'), http = require('http'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'); const [, , pg, secs = 20, png] = process.argv;
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
srv.listen(0, async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }); const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.goto(`http://localhost:${srv.address().port}/${pg}`); await page.waitForTimeout(500);
  await page.$eval('select[data-act=speed]', el => { el.value = '4'; el.dispatchEvent(new Event('change')); });
  const st = await page.$eval('[data-act=run]', el => el.textContent); if (st !== 'Pause') await page.click('[data-act=run]');
  for (let i = 0; i < +secs / 5; i++) { await page.waitForTimeout(5000); const ro = await page.$$eval('.readouts .ro', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim())); console.log(`t+${(i + 1) * 5}s:`, ro.join(' | ')); }
  if (png) { await page.$eval('.sim-body', e => e.scrollIntoView()); await page.screenshot({ path: png }); }
  await b.close(); srv.close(); });
