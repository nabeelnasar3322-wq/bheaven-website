// Smoke test: opens each page in a real browser and checks the things that must never break.
// Usage: node tests/smoke.js [baseUrl]     (default http://localhost:8080, run a static server first)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const ROOT = path.join(__dirname, '..');
const PAGES = ['/menu/', '/business-lunch/', '/shisha/'];
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('  FAIL  ' + msg); } else console.log('  ok    ' + msg); };

(async () => {
  // 1) static checks on the files
  console.log('files');
  try { JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')); ok(true, 'vercel.json is valid JSON'); } catch (e) { ok(false, 'vercel.json invalid: ' + e.message); }
  for (const f of fs.readdirSync(path.join(ROOT, 'api'))) {
    try { new (require('vm').Script)(fs.readFileSync(path.join(ROOT, 'api', f), 'utf8'), { filename: f }); ok(true, 'api/' + f + ' parses'); } catch (e) { ok(false, 'api/' + f + ' syntax error: ' + e.message); }
  }
  for (const p of PAGES) {
    const html = fs.readFileSync(path.join(ROOT, p, 'index.html'), 'utf8');
    const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1] || '';
    const desc = (html.match(/name="description" content="([^"]+)"/) || [])[1] || '';
    ok(title.length > 20 && title.length <= 75, p + ' title length ' + title.length);
    ok(desc.length > 80 && desc.length <= 175, p + ' description length ' + desc.length);
    ok(new RegExp('rel="canonical" href="https://bheavendubai.com' + p + '"').test(html), p + ' canonical is correct');
    ok(html.includes('G-5EP0X5NXPJ'), p + ' has the Google tag');
    if (p !== '/shisha/') ok(html.includes('id="menu-text"'), p + ' has the plain-text menu');
    for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(m[1]); } catch (e) { ok(false, p + ' a JSON-LD block is invalid'); }
    }
  }

  // 2) real browser checks
  const browser = await chromium.launch();
  for (const [name, w, h] of [['phone', 390, 844], ['desktop', 1440, 900]]) {
    for (const p of PAGES) {
      console.log(`${p} ${name}`);
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      const errs = [], bad = [];
      page.on('pageerror', (e) => errs.push(e.message));
      page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(BASE) && !r.url().includes('/api/')) bad.push(r.status() + ' ' + r.url().slice(BASE.length)); });
      await page.route('**/*', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
      await page.goto(BASE + p, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1500);
      const H = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < H; y += 900) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(40); }
      await page.waitForTimeout(600);
      ok(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
      ok(bad.length === 0, 'no missing files' + (bad.length ? ': ' + bad.slice(0, 3).join(', ') : ''));
      ok((await page.locator('h1').count()) === 1, 'exactly one main heading');
      ok((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, 'no sideways scrolling');
      ok((await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:')).length)) === 0, 'no broken images');
      if (p === '/menu/') {
        const dishes = await page.evaluate(() => Object.values(window.M || {}).flat().length || document.querySelectorAll('[data-k][data-i]').length);
        ok(dishes >= 30, 'menu shows dishes (' + dishes + ')');
        await page.evaluate(() => document.getElementById('cpPill').click());
        await page.waitForTimeout(900);
        ok(await page.evaluate(() => document.getElementById('ov').classList.contains('open')), 'dish popup opens');
        await page.keyboard.press('Escape'); await page.waitForTimeout(700);
        ok(await page.evaluate(() => !document.getElementById('ov').classList.contains('open')), 'dish popup closes');
        await page.evaluate(() => setMode('drinks', { instant: true })); await page.waitForTimeout(500);
        ok(await page.evaluate(() => document.body.dataset.mode === 'drinks'), 'drinks mode switches');
        await page.evaluate(() => setMode('food', { instant: true }));
      }
      await page.close();
    }
  }
  await browser.close();
  console.log(fails ? `\n${fails} check(s) FAILED` : '\nAll checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('test crashed: ' + e.message); process.exit(1); });
