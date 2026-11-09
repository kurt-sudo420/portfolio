// Browser tests for the interactive parts of the site.
//
//   npm install            (once; then `npx playwright install chromium`)
//   npm run test:e2e
//
// The tests start their own static server, so nothing else needs to be running.
// Network access is not required: jQuery is served from node_modules (same
// version the pages load from the CDN) and every other external request
// (fonts, jQuery Mobile) is blocked.
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const JQUERY = fs.readFileSync(require.resolve('jquery/dist/jquery.min.js'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.vtt': 'text/vtt', '.mp4': 'video/mp4' };
const PAGES = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && f !== 'academics.html')
  .concat(fs.readdirSync(path.join(ROOT, 'projects')).filter((f) => f.endsWith('.html')).map((f) => 'projects/' + f));
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

let server, browser, base;

before(async () => {
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(ROOT, rel.endsWith('/') ? rel + 'index.html' : rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port + '/';
  browser = await chromium.launch();
});

after(async () => {
  if (browser) await browser.close();
  if (server) server.close();
});

/** Open a page in a fresh context and collect uncaught script errors. */
async function open(page, options = {}) {
  const context = await browser.newContext({ viewport: options.viewport || DESKTOP, reducedMotion: 'reduce', javaScriptEnabled: options.js !== false, permissions: ['clipboard-read', 'clipboard-write'] });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => {
    if (route.request().url().endsWith('/jquery-3.7.1.min.js')) return route.fulfill({ contentType: 'text/javascript', body: JQUERY });
    return route.abort();
  });
  const tab = await context.newPage();
  const errors = [];
  tab.on('pageerror', (e) => errors.push(e.message));
  await tab.goto(base + page, { waitUntil: 'load' });
  return { tab, errors, context };
}

test('every page loads cleanly, fits the viewport, and offers search', async () => {
  for (const viewport of [DESKTOP, PHONE]) {
    for (const page of PAGES) {
      const { tab, errors, context } = await open(page, { viewport });
      const label = `${page} at ${viewport.width}px`;
      assert.deepEqual(errors, [], `script errors on ${label}`);
      const overflow = await tab.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, `${label} scrolls sideways by ${overflow}px`);
      assert.ok(await tab.locator('.cmdk-trigger').isVisible(), `search button missing on ${label}`);
      assert.equal(await tab.locator('h1').count(), 1, `${label} should have one h1`);
      await context.close();
    }
  }
});

test('command palette: keyboard open, search, navigate, close', async () => {
  const { tab, context } = await open('index.html');
  const dialog = tab.locator('dialog.cmdk');
  await tab.keyboard.press('Control+k');
  await assert.doesNotReject(dialog.waitFor({ state: 'visible' }));
  assert.equal(await tab.evaluate(() => document.activeElement.className), 'cmdk-input', 'focus moves into the search field');

  await tab.keyboard.type('garak');
  const first = tab.locator('.cmdk-option').first();
  assert.match(await first.textContent(), /BadToken HYDRA/);
  assert.equal(await first.getAttribute('aria-selected'), 'true');
  assert.equal(await tab.locator('.cmdk-input').getAttribute('aria-activedescendant'), await first.getAttribute('id'));

  await tab.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.ok(await tab.evaluate(() => document.activeElement.classList.contains('cmdk-trigger')), 'focus returns to the button');

  await tab.locator('.cmdk-trigger').click();
  await tab.keyboard.type('wireless');
  await tab.keyboard.press('Enter');
  await tab.waitForURL('**/projects/wireless-lab.html');
  await context.close();
});

test('command palette: arrow keys move the selection and links resolve from /projects/', async () => {
  const { tab, context } = await open('projects/hydra.html');
  await tab.keyboard.press('/');
  await tab.locator('dialog.cmdk').waitFor({ state: 'visible' });
  await tab.keyboard.type('cert');
  await tab.keyboard.press('ArrowDown');
  await tab.keyboard.press('ArrowUp');
  assert.match(await tab.locator('.cmdk-option[aria-selected="true"]').textContent(), /Certifications/);
  await tab.keyboard.press('Enter');
  await tab.waitForURL('**/certifications.html');
  assert.ok(!tab.url().includes('/projects/'), 'link is resolved from the site root');
  await context.close();
});

test('command palette: search ranking and the no-results path', async () => {
  const { tab, context } = await open('about.html');
  const titles = (q) => tab.evaluate((query) => window.KSPalette.search(query).map((i) => i.title), q);
  assert.equal((await titles('flipper'))[0], 'Embedded device and wireless lab');
  assert.equal((await titles('chrome extension'))[0], 'Ghostclick');
  assert.equal((await titles('Sub-GHz'))[0], 'Embedded device and wireless lab');
  assert.deepEqual(await titles('zzzz-not-a-thing'), []);
  assert.equal((await titles('')).length, await tab.evaluate(() => window.KSPalette.items.length));

  await tab.keyboard.press('Control+k');
  await tab.keyboard.type('qqqq');
  assert.match(await tab.locator('.cmdk-empty').textContent(), /Nothing matches/);
  await tab.keyboard.press('Enter');
  await tab.waitForURL('**/projects.html?q=qqqq');
  assert.ok(await tab.locator('#finderEmpty').isVisible(), 'falls through to the project search empty state');
  await context.close();
});

test('command palette: copy email action', async () => {
  const { tab, context } = await open('index.html');
  await tab.keyboard.press('Control+k');
  await tab.keyboard.type('copy email');
  await tab.keyboard.press('Enter');
  await tab.locator('dialog.cmdk').waitFor({ state: 'hidden' });
  assert.equal(await tab.evaluate(() => navigator.clipboard.readText()), 'manny.kurt@gmail.com');
  await context.close();
});

test('projects: search and category filters combine, and the view is linkable', async () => {
  const { tab, context } = await open('projects.html');
  const status = tab.locator('#filterStatus');
  const visible = () => tab.locator('[data-cat]:not(.is-hidden)').count();
  assert.equal(await status.textContent(), '7 projects');

  await tab.keyboard.press('/');
  assert.equal(await tab.evaluate(() => document.activeElement.id), 'projectSearch', '"/" focuses the project search');
  await tab.keyboard.type('trivy');
  assert.equal(await status.textContent(), '1 project');
  assert.equal(await visible(), 1);
  assert.match(tab.url(), /\?q=trivy$/);

  await tab.keyboard.press('Escape');
  assert.equal(await status.textContent(), '7 projects');

  await tab.locator('[data-filter="llm"]').click();
  assert.equal(await status.textContent(), '3 projects');
  await tab.locator('#projectSearch').fill('chrome');
  assert.equal(await status.textContent(), '1 project');
  assert.match(tab.url(), /cat=llm&q=chrome/);

  await tab.locator('#projectSearch').fill('no such technology');
  assert.equal(await visible(), 0);
  assert.ok(await tab.locator('#finderEmpty').isVisible());
  await tab.locator('#finderReset').click();
  assert.equal(await status.textContent(), '7 projects');
  assert.ok(await tab.locator('#finderEmpty').isHidden());
  await context.close();

  const deep = await open('projects.html?cat=offensive&q=flipper');
  assert.equal(await deep.tab.locator('#filterStatus').textContent(), '1 project');
  assert.equal(await deep.tab.locator('#projectSearch').inputValue(), 'flipper');
  assert.equal(await deep.tab.locator('[data-filter="offensive"]').getAttribute('aria-pressed'), 'true');
  await deep.context.close();
});

test('projects: every case study linked from the gallery opens', async () => {
  const { tab, context } = await open('projects.html');
  const links = await tab.locator('.exhibit a[href^="projects/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
  assert.ok(links.includes('projects/ghostclick.html'));
  assert.equal(links.length, 6);
  for (const href of links) {
    const response = await tab.request.get(base + href);
    assert.equal(response.status(), 200, href);
  }
  await context.close();
});

test('experience: case walkthroughs step through six stages per case', async () => {
  const { tab, context } = await open('experience.html');
  const panel = tab.locator('#case-p-phish');
  const stage = () => panel.locator('li:not([hidden]) h3').textContent();
  assert.equal(await tab.locator('.case-tab').count(), 3);
  assert.equal(await panel.locator('.stepper-tab').count(), 6);
  assert.match(await stage(), /reports a suspicious message/);
  assert.ok(await panel.getByRole('button', { name: 'Previous' }).isDisabled());

  await panel.getByRole('button', { name: 'Next stage' }).click();
  assert.match(await stage(), /Read the headers/);
  assert.equal(await panel.locator('.stepper-count').textContent(), 'Stage 2 of 6');

  await panel.locator('.stepper-tab[aria-selected="true"]').focus();
  await tab.keyboard.press('ArrowDown');
  assert.match(await stage(), /what the link does/);
  await tab.keyboard.press('End');
  assert.match(await stage(), /Write it up/);
  assert.ok(await panel.getByRole('button', { name: 'Next stage' }).isDisabled());

  await tab.locator('#case-t-identity').click();
  assert.ok(await panel.isHidden());
  assert.match(await tab.locator('#case-p-identity li:not([hidden]) h3').textContent(), /can't both be the same person/);
  assert.match(await tab.locator('#walkthrough').textContent(), /Synthetic data/);
  await context.close();
});

test('research: run anatomy has six stages and the status board separates done from proposed', async () => {
  const { tab, context } = await open('research.html');
  const flow = tab.locator('#pipeline .stepper');
  assert.deepEqual(await flow.locator('.stepper-label').allTextContents(), ['Target', 'Attack', 'Orchestrate', 'Analyze', 'Measure', 'Report']);
  await flow.locator('.stepper-tab').nth(4).click();
  assert.match(await flow.locator('li:not([hidden]) h3').textContent(), /numbers in context/);
  assert.equal(await flow.locator('.stepper-tab.is-done').count(), 4);

  assert.deepEqual(await tab.locator('#status .board-col h3').evaluateAll((hs) => hs.map((h) => h.firstChild.textContent)), ['Completed', 'Ongoing', 'Proposed']);
  const proposed = await tab.locator('.board-col--next').textContent();
  assert.doesNotMatch(proposed, /published|accepted/i);
  await context.close();
});

test('without JavaScript every walkthrough stage is readable and nothing is hidden', async () => {
  const { tab, context } = await open('experience.html', { js: false });
  assert.equal(await tab.locator('.cmdk-trigger').count(), 0, 'no dead search button');
  assert.equal(await tab.locator('#case-p-phish li').count(), 6);
  assert.ok(await tab.locator('#case-p-phish li').last().isVisible());
  assert.equal(await tab.locator('.reveal').first().evaluate((el) => getComputedStyle(el).opacity), '1');
  await context.close();
});

test('phone: menu opens, palette fits, stepper collapses to numbered dots', async () => {
  const { tab, context } = await open('experience.html', { viewport: PHONE });
  await tab.locator('#navToggle').click();
  assert.equal(await tab.locator('#navToggle').getAttribute('aria-expanded'), 'true');
  assert.ok(await tab.locator('#navLinks a').first().isVisible());
  await tab.keyboard.press('Escape');

  await tab.locator('.cmdk-trigger').click();
  const box = await tab.locator('dialog.cmdk').boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= PHONE.width, 'palette stays inside the screen');
  await tab.keyboard.press('Escape');

  const tabs = tab.locator('#case-p-phish .stepper-tab');
  const first = await tabs.nth(0).boundingBox();
  const second = await tabs.nth(1).boundingBox();
  assert.ok(Math.abs(first.y - second.y) < 4, 'stage buttons sit in one row');
  await context.close();
});
