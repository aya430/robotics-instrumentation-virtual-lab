#!/usr/bin/env node
/* Screenshot helper: node tests/shot.js <page> <out.png> [width] [scrollTo selector] */
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const [, , pg, out, w = 1280, sel] = process.argv;
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
srv.listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await b.newPage({ viewport: { width: +w, height: 900 } });
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.goto(`http://localhost:${srv.address().port}/${pg}`); await page.waitForTimeout(1500);
  if (sel) await page.$eval(sel, e => e.scrollIntoView());
  await page.screenshot({ path: out, fullPage: !sel }); await b.close(); srv.close();
});
